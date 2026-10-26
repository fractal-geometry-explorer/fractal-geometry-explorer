// Chapter 13 machinery: Koch sigma-loops (islands and lakes), curdling clusters,
// the knotted Peano generator and seeded Bernoulli bond percolation.
// Conventions: a sigma-loop generator lives on the lattice of side 1/b over [0, 1].
// Its coast links replace the interval itself; its island loops (traversed clockwise,
// land inside on the right of travel) seed new islands on the water side of every
// link, and its lake loops (counterclockwise, water inside on the left) seed lakes
// on the land side. Levels count nesting: sea 0, land 1, lake water 2, and so on.

// ---- the three generators read off pages 117, 118 and 121 ----
const SIGMA_GENS = {
  g117: {
    b: 8, name: 'p. 117',
    coast: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [4, 1], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0]],
    islands: [[[1, 1], [1, 2], [1, 3], [2, 3], [2, 2], [2, 1]]],
    lakes: [],
  },
  g118: {
    b: 8, name: 'p. 118',
    coast: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0]],
    islands: [[[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1]]],
    lakes: [],
  },
  g121: {
    b: 6, name: 'p. 121',
    coast: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]],
    islands: [[[1, 1], [1, 2], [2, 2], [3, 2], [3, 1], [2, 1]]],
    lakes: [[[3, -2], [4, -2], [5, -2], [5, -1], [4, -1], [3, -1]]],
  },
};
for (const g of Object.values(SIGMA_GENS)) {
  const norm = (pts) => pts.map(([x, y]) => [x / g.b, y / g.b]);
  g.coastN = norm(g.coast); g.islandsN = g.islands.map(norm); g.lakesN = g.lakes.map(norm);
  g.N = (g.coast.length - 1) + g.islands.reduce((s, L) => s + L.length, 0) + g.lakes.reduce((s, L) => s + L.length, 0);
  g.Nc = g.coast.length - 1;
  g.D = Math.log(g.N) / Math.log(g.b);
  g.Dc = Math.log(g.Nc) / Math.log(g.b);
}

// Refine every link of every path: the coast replaces the link, each island loop and
// lake loop becomes a new closed path. A path carries W (water level on the left of
// its links) and G (land level on the right); a loop also carries lvl, its region's
// level (odd regions are land, even are water). born = the stage the loop appeared.
function sigmaRefine(paths, gen) {
  const out = [];
  for (const path of paths) {
    const P = path.pts, n = P.length / 2, m = path.closed ? n : n - 1, Q = [];
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * ((i + 1) % n)], by = P[2 * ((i + 1) % n) + 1];
      const sx = bx - ax, sy = by - ay;                       // similarity z -> a + s·z
      const map = ([x, y]) => [ax + sx * x - sy * y, ay + sy * x + sx * y];
      for (let k = 0; k < gen.coastN.length - 1; k++) Q.push(...map(gen.coastN[k]));
      for (const L of gen.islandsN) out.push({ pts: new Float64Array(L.flatMap(map)), closed: true, W: path.W, G: path.W + 1, lvl: path.W + 1, born: path.stage + 1 });
      for (const L of gen.lakesN) out.push({ pts: new Float64Array(L.flatMap(map)), closed: true, W: path.G + 1, G: path.G, lvl: path.G + 1, born: path.stage + 1 });
    }
    if (!path.closed) Q.push(P[2 * n - 2], P[2 * n - 1]);
    out.push({ ...path, pts: new Float64Array(Q) });
  }
  for (const p of out) p.stage = (paths.stage || 0) + 1;
  return out;
}
function sigmaBuild(genKey, initiator, stages) {
  const gen = SIGMA_GENS[genKey];
  let paths = initiator === 'square'
    ? [{ pts: new Float64Array([0, 0, 0, 1, 1, 1, 1, 0]), closed: true, W: 0, G: 1, lvl: 1, born: 0, stage: 0 }]
    : [{ pts: new Float64Array([0, 0, 1, 0]), closed: false, W: 0, G: 1, lvl: 1, born: 0, stage: 0 }];
  for (let s = 0; s < stages; s++) { paths.stage = s; paths = sigmaRefine(paths, gen); }
  return paths;
}

// ---- curdling generators: kept cells of a b x b grid, read off pages 124-125 ----
const CURD_GENS = {
  A: { b: 4, rows: ['####', '#..#', '#..#', '####'], page: '124' },
  B: { b: 4, rows: ['#..#', '#...', '#.#.', '#.#.'], page: '124' },
  C: { b: 4, rows: ['#.#.', '#...', '####', '#...'], page: '124' },
  E: { b: 4, rows: ['###.', '#...', '###.', '#...'], page: '124' },
  F: { b: 4, rows: ['#..#', '....', '....', '#..#'], page: '124' },
  X1: { b: 3, rows: ['#.#', '#..', '#.#'], page: '125' },
  X2: { b: 3, rows: ['#.#', '#..', '###'], page: '125' },
};
for (const g of Object.values(CURD_GENS)) {
  g.cells = [];
  g.rows.forEach((r, i) => { for (let j = 0; j < r.length; j++) if (r[j] === '#') g.cells.push([i, j]); });
  g.N = g.cells.length;
  g.D = Math.log(g.N) / Math.log(g.b);
}
// iterate the curdling to stage k: cells are [row, col] in a b^k grid
function curdle(genKey, k) {
  const g = CURD_GENS[genKey];
  let cur = g.cells;
  for (let s = 1; s < k; s++) {
    const next = new Array(cur.length * g.N);
    let t = 0;
    for (const [I, J] of cur) for (const [i, j] of g.cells) next[t++] = [I * g.b + i, J * g.b + j];
    cur = next;
  }
  return cur;
}
// connected components (4-neighbour) of a cell set; returns a label per cell and sizes
function clusters(cells, side) {
  const idx = new Map();
  cells.forEach(([i, j], k) => idx.set(i * side + j, k));
  const label = new Int32Array(cells.length).fill(-1), sizes = [];
  for (let k = 0; k < cells.length; k++) {
    if (label[k] >= 0) continue;
    const id = sizes.length;
    let count = 0;
    const stack = [k];
    label[k] = id;
    while (stack.length) {
      const a = stack.pop(), [i, j] = cells[a];
      count++;
      for (const key of [(i + 1) * side + j, (i - 1) * side + j, i * side + j + 1, i * side + j - 1]) {
        const b = idx.get(key);
        if (b !== undefined && label[b] < 0) { label[b] = id; stack.push(b); }
      }
    }
    sizes.push(count);
  }
  return { label, sizes };
}

// ---- the knotted Peano generator of page 126 ----
// 17 links of length 1/sqrt(17) on the lattice tilted by arctan(1/4); the lattice
// coordinates and the per-link codes (0 as drawn, 2 placed from the far end and run
// backward) were fitted to the printed second stage (mean distance 0.01 px at 600 dpi).
const KP_PTS = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [2, 2], [3, 2], [3, 3], [4, 3], [4, 2], [3, 2], [3, 1], [4, 1], [4, 0], [4, -1]];
const KP_CODES = [0, 2, 2, 0, 2, 0, 0, 2, 0, 2, 0, 0, 0, 2, 2, 0, 2];
const KP_OM = [4, -1];                                   // end-to-end in lattice units
const KP_Z = KP_PTS.map(([m, n]) => {                    // normalised: start 0, end 1
  const d = KP_OM[0] * KP_OM[0] + KP_OM[1] * KP_OM[1];
  return [(m * KP_OM[0] + n * KP_OM[1]) / d, (n * KP_OM[0] - m * KP_OM[1]) / d];
});
const KP_CH = KP_CODES.map((c, k) => {
  const rv = (c >> 1) & 1, a = KP_Z[rv ? k + 1 : k], b = KP_Z[rv ? k : k + 1];
  return [b[0] - a[0], b[1] - a[1], a[0], a[1], rv];     // z -> A z + B, as [Ar, Ai, Br, Bi, rev]
});
function knottedCurve(stages) {
  let leaves = [[1, 0, 0, 0, 0]];
  for (let s = 0; s < stages; s++) {
    const out = new Array(leaves.length * 17);
    let t = 0;
    for (const [Ar, Ai, Br, Bi, rev] of leaves) {
      for (let q = 0; q < 17; q++) {
        const [ar, ai, br, bi, r2] = KP_CH[rev ? 16 - q : q];
        out[t++] = [Ar * ar - Ai * ai, Ar * ai + Ai * ar, Ar * br - Ai * bi + Br, Ar * bi + Ai * br + Bi, rev ^ r2];
      }
    }
    leaves = out;
  }
  const P = new Float64Array(2 * leaves.length + 2);
  leaves.forEach(([Ar, Ai, Br, Bi, rev], i) => {
    P[2 * i + 2] = rev ? Br : Ar + Br;
    P[2 * i + 3] = rev ? Bi : Ai + Bi;
  });
  return P;
}
// count the self-contacts: vertices visited twice (the teragon repeats no edge)
function knottedContacts(P) {
  const seen = new Set();
  let twice = 0;
  for (let i = 0; i < P.length; i += 2) {
    const k = Math.round(P[i] * 1e7) + ':' + Math.round(P[i + 1] * 1e7);
    if (seen.has(k)) twice++; else seen.add(k);
  }
  return twice;
}

// ---- seeded Bernoulli bond percolation on an n x n site lattice ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function percolation(n, p, seed) {
  const rnd = mulberry32(seed);
  // bonds: H[i][j] joins (i,j)-(i,j+1), V[i][j] joins (i,j)-(i+1,j); copper with probability p
  const H = new Uint8Array(n * (n - 1)), V = new Uint8Array((n - 1) * n);
  for (let i = 0; i < H.length; i++) H[i] = rnd() < p ? 1 : 0;
  for (let i = 0; i < V.length; i++) V[i] = rnd() < p ? 1 : 0;
  // union-find over sites plus two virtual nodes: top (n*n) and bottom (n*n+1)
  const parent = new Int32Array(n * n + 2);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  for (let i = 0; i < n; i++) for (let j = 0; j < n - 1; j++) if (H[i * (n - 1) + j]) union(i * n + j, i * n + j + 1);
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < n; j++) if (V[i * n + j]) union(i * n + j, (i + 1) * n + j);
  for (let j = 0; j < n; j++) { union(j, n * n); union((n - 1) * n + j, n * n + 1); }
  const percolates = find(n * n) === find(n * n + 1);
  // cluster sizes in copper sticks; a bond belongs to the cluster of its endpoints
  const sticks = new Map();
  const addStick = (site) => { const r = find(site); sticks.set(r, (sticks.get(r) || 0) + 1); };
  for (let i = 0; i < n; i++) for (let j = 0; j < n - 1; j++) if (H[i * (n - 1) + j]) addStick(i * n + j);
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < n; j++) if (V[i * n + j]) addStick(i * n + j);
  let bigRoot = -1, bigSize = 0, total = 0;
  const percRoot = find(n * n);
  for (const [r, s] of sticks) { total += s; if (s > bigSize) { bigSize = s; bigRoot = r; } }
  return { n, H, V, find, percolates, bigRoot, bigSize, total, percRoot };
}
