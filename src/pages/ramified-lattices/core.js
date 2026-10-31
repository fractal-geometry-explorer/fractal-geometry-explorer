// Plate data for chapter 14: the Sierpiński gasket and arrowhead (Plate 141), a critical
// percolation cluster (the diagram on page 132), the fractal skewed web (Plate 143), the
// Sierpiński carpet and the Menger sponge (Plate 145), the branched Koch curve of pages 138–139,
// and the split snowflake halls (Plate 146). Cascade machinery lives in src/shared/geometry.js.

// ---- Plate 141: the Sierpiński arrowhead ----
// Generator: half a hexagon, three legs of 1/2 at +60°, 0°, −60°. Codes read off the caption's
// second teragon: the outer legs carry mirrored copies.
const ARROW_PTS = [[0, 0], [0.25, R3 / 4], [0.75, R3 / 4], [1, 0]];
const ARROW_CODES = [1, 0, 1];
const ARROW_GEN = genFromCodes(ARROW_PTS, ARROW_CODES);
// the "tropical fish" tile: the piece of the teragon between its two visits closest to the
// midpoint of [0, 1], which in the limit are two successive returns to a point of self-contact
function arrowFish(P) {
  const m = P.length / 2;
  let i1 = -1, d1 = Infinity;
  for (let i = 0; i < m; i++) { const d = (P[2 * i] - 0.5) ** 2 + P[2 * i + 1] ** 2; if (d < d1) { d1 = d; i1 = i; } }
  let i2 = -1, d2 = Infinity;
  for (let i = 0; i < m; i++) { if (Math.abs(i - i1) < m / 10) continue; const d = (P[2 * i] - 0.5) ** 2 + P[2 * i + 1] ** 2; if (d < d2) { d2 = d; i2 = i; } }
  const [a, b] = i1 < i2 ? [i1, i2] : [i2, i1];
  return P.slice(2 * a, 2 * b + 2);
}
// the gasket by tremas: the 3^n filled triangles of stage n, as [x, y, side]
function gasketTris(n) {
  let tris = [[0, 0, 1]];
  for (let k = 0; k < n; k++) {
    const out = [];
    for (const [x, y, s] of tris) out.push([x, y, s / 2], [x + s / 2, y, s / 2], [x + s / 4, y + (s * R3) / 4, s / 2]);
    tris = out;
  }
  return tris;
}

// ---- Page 132: bond percolation at criticality ----
// Bonds of an L×L square lattice are open with probability p (p_c = 1/2). The cluster of
// interest spans left to right; its dangling ends are then trimmed away, as in the diagram.
function mulberry(seed) { let t = seed >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function percolation(L, p, seed) {
  const rnd = mulberry(seed), N = L * L;
  const right = new Uint8Array(N), up = new Uint8Array(N);          // bond to x+1, bond to y+1
  for (let i = 0; i < N; i++) { right[i] = (i % L < L - 1) && rnd() < p ? 1 : 0; up[i] = (i < N - L) && rnd() < p ? 1 : 0; }
  // clusters by union-find
  const id = new Int32Array(N); for (let i = 0; i < N; i++) id[i] = i;
  const find = (a) => { while (id[a] !== a) { id[a] = id[id[a]]; a = id[a]; } return a; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) id[a] = b; };
  for (let i = 0; i < N; i++) { if (right[i]) uni(i, i + 1); if (up[i]) uni(i, i + L); }
  // the cluster of interest: one that spans left to right (otherwise the largest)
  const size = new Map();
  for (let i = 0; i < N; i++) { const r = find(i); size.set(r, (size.get(r) || 0) + 1); }
  const left = new Set(), roots = [];
  for (let y = 0; y < L; y++) left.add(find(y * L));
  let span = -1;
  for (let y = 0; y < L; y++) { const r = find(y * L + L - 1); if (left.has(r)) { span = r; break; } }
  let big = -1, bigN = 0;
  for (const [r, n] of size) if (n > bigN) { big = r; bigN = n; }
  const root = span >= 0 ? span : big;
  const inC = new Uint8Array(N);
  for (let i = 0; i < N; i++) inC[i] = find(i) === root ? 1 : 0;
  // trim dangling ends: repeatedly delete sites of the cluster with one open bond into it,
  // keeping the sites on the two electrodes (left and right columns)
  const deg = new Int32Array(N), keep = inC.slice();
  const openTo = (i, j, dir) => (dir === 0 ? right[i] : up[i]) && keep[i] && keep[j];
  const calcDeg = (i) => {
    let d = 0;
    if (i % L < L - 1 && right[i] && keep[i + 1]) d++;
    if (i % L > 0 && right[i - 1] && keep[i - 1]) d++;
    if (i < N - L && up[i] && keep[i + L]) d++;
    if (i >= L && up[i - L] && keep[i - L]) d++;
    return d;
  };
  const queue = [];
  for (let i = 0; i < N; i++) if (keep[i]) { deg[i] = calcDeg(i); if (deg[i] <= 1 && i % L !== 0 && i % L !== L - 1) queue.push(i); }
  while (queue.length) {
    const i = queue.pop();
    if (!keep[i] || deg[i] > 1 || i % L === 0 || i % L === L - 1) continue;
    keep[i] = 0;
    for (const [j, ok] of [[i + 1, i % L < L - 1 && right[i]], [i - 1, i % L > 0 && right[i - 1]], [i + L, i < N - L && up[i]], [i - L, i >= L && up[i - L]]]) {
      if (ok && keep[j]) { deg[j]--; if (deg[j] <= 1) queue.push(j); }
    }
  }
  return { L, right, up, inC, keep, spans: span >= 0, clusterSites: size.get(root) || 0 };
}

// ---- Plate 143: the fractal skewed web ----
// N = 4, r = 1/2: a closed tetrahedron is replaced by the four half-size tetrahedra on its
// corners, ad infinitum. Corners of the unit tetrahedron:
const TET_V = [[0, 0, 0], [1, 0, 0], [0.5, R3 / 2, 0], [0.5, R3 / 6, Math.sqrt(6) / 3]];
function webTets(n) {
  // each tetrahedron as [x, y, z, s]: corner at V0-scaled position, side s
  let tets = [[0, 0, 0, 1]];
  for (let k = 0; k < n; k++) {
    const out = [];
    for (const [x, y, z, s] of tets) for (const [vx, vy, vz] of TET_V) out.push([x + (vx * s) / 2, y + (vy * s) / 2, z + (vz * s) / 2, s / 2]);
    tets = out;
  }
  return tets;
}
const TET_EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
// the projection of the web along the line joining the midpoints of two opposite edges is a
// full square: this axis and frame realise it
const WEB_AXIS = (() => {
  const m1 = [0.5, 0, 0], m2 = [0.5, (R3 / 2 + R3 / 6) / 2, Math.sqrt(6) / 6];      // mid(V0V1), mid(V2V3)
  const d = [m2[0] - m1[0], m2[1] - m1[1], m2[2] - m1[2]], L = Math.hypot(...d);
  return { dir: d.map((v) => v / L), m1, m2 };
})();

// ---- Plate 145: carpets, sponge and foams ----
// cells of a carpet stage as [x, y, s]; keep(i, j, b, kind) says which subcells survive
function carpetKeep(kind, b) {
  const t = (b - 1) / 2;
  if (kind === 'triadic') return (i, j) => !(i === 1 && j === 1);
  if (kind === 'large') return (i, j) => i === 0 || j === 0 || i === b - 1 || j === b - 1;   // thin ring of 4(b−1)
  return (i, j) => !(i === t && j === t);                                                    // thick ring of b²−1 (odd b)
}
function carpetCells(kind, b, n) {
  let cells = [[0, 0, 1]];
  const keep = carpetKeep(kind, b);
  for (let k = 0; k < n; k++) {
    const out = [];
    for (const [x, y, s] of cells) {
      const u = s / b;
      for (let i = 0; i < b; i++) for (let j = 0; j < b; j++) if (keep(i, j)) out.push([x + i * u, y + j * u, u]);
    }
    cells = out;
  }
  return cells;
}
const carpetN = (kind, b) => (kind === 'triadic' ? 8 : kind === 'large' ? 4 * (b - 1) : b * b - 1);
// Menger sponge occupancy on the 3^n grid: a cell survives if, at every triadic level, at most
// one of its three digits is 1
function spongeCells(n) {
  const size = 3 ** n, out = [];
  for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) for (let z = 0; z < size; z++) {
    let a = x, b = y, c = z, ok = true;
    for (let k = 0; k < n; k++) { if ((a % 3 === 1) + (b % 3 === 1) + (c % 3 === 1) >= 2) { ok = false; break; } a = (a / 3) | 0; b = (b / 3) | 0; c = (c / 3) | 0; }
    if (ok) out.push([x, y, z]);
  }
  return { size, cells: out };
}
// the visible faces of the sponge: cube faces whose neighbour cell is empty
function spongeFaces(n) {
  const { size, cells } = spongeCells(n);
  const occ = new Uint8Array(size * size * size);
  for (const [x, y, z] of cells) occ[(x * size + y) * size + z] = 1;
  const has = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < size && y < size && z < size && occ[(x * size + y) * size + z];
  const faces = [];   // [x, y, z, axis, dir]: the face of cell (x,y,z) looking along ±axis
  for (const [x, y, z] of cells) {
    if (!has(x + 1, y, z)) faces.push([x, y, z, 0, 1]);
    if (!has(x - 1, y, z)) faces.push([x, y, z, 0, -1]);
    if (!has(x, y + 1, z)) faces.push([x, y, z, 1, 1]);
    if (!has(x, y - 1, z)) faces.push([x, y, z, 1, -1]);
    if (!has(x, y, z + 1)) faces.push([x, y, z, 2, 1]);
    if (!has(x, y, z - 1)) faces.push([x, y, z, 2, -1]);
  }
  return { size, faces, count: cells.length };
}

// ---- Pages 138–139: ramification through branches, without loops ----
// N = 5, r = 1/3, every copy as drawn. The teragons touch themselves; coincident pieces merge,
// and in the limit the touching points become branch points.
const BRANCH_PTS = [[0, 0], [1 / 3, 0], [1 / 3, 1 / 3], [2 / 3, 1 / 3], [2 / 3, 0], [1, 0]];
const BRANCH_GEN = genFromCodes(BRANCH_PTS, [0, 0, 0, 0, 0]);

// ---- Plate 146: the split snowflake halls ----
// The generator and codes of the monkeys tree, Plate 31: eleven legs, six of 1/3 and five of
// 1/(3√3), placements read off that plate's caption box. The initiator [0, 1] is the Wise
// Elders' line; the curve splits the snowflake of Plate 45 into a northern and a southern maze.
const HALLS_PTS = (() => {
  const steps = [[1 / 3, 60], [1 / 3, 60], [1 / 3, 0], [1 / 3, -60], [1 / (3 * R3), 150], [1 / (3 * R3), 150], [1 / (3 * R3), 210], [1 / (3 * R3), 270], [1 / (3 * R3), 270], [1 / 3, 0], [1 / 3, 0]];
  const P = [[0, 0]];
  for (const [r, a] of steps) { const t = (a * Math.PI) / 180; const [x, y] = P[P.length - 1]; P.push([x + r * Math.cos(t), y + r * Math.sin(t)]); }
  P[11] = [1, 0];
  return P;
})();
const HALLS_CODES = [1, 3, 0, 3, 3, 1, 2, 2, 0, 2, 0];
const HALLS_GEN = genFromCodes(HALLS_PTS, HALLS_CODES);
// the dimension: six legs of 1/3 and five of 1/(3√3)
const HALLS_D = dimension([1 / 3, 1 / 3, 1 / 3, 1 / 3, 1 / 3, 1 / 3, 1 / (3 * R3), 1 / (3 * R3), 1 / (3 * R3), 1 / (3 * R3), 1 / (3 * R3)]);

// the Koch snowflake on the triangle (0,0) (1,0) (1/2, √3/2), stage n, as a polygon (Plate 45)
function kochFlakePts(n) {
  let P = [[0, 0], [1, 0], [0.5, R3 / 2]];
  for (let k = 0; k < n; k++) {
    const Q = [];
    for (let i = 0; i < P.length; i++) {
      const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length], dx = (bx - ax) / 3, dy = (by - ay) / 3;
      Q.push([ax, ay], [ax + dx, ay + dy], [ax + dx + dx * 0.5 + dy * R3 / 2, ay + dy + dy * 0.5 - dx * R3 / 2], [ax + 2 * dx, ay + 2 * dy]);
    }
    P = Q;
  }
  return P;
}

// drag to turn a 3D figure: yaw with horizontal motion, tilt with vertical
function attachOrbit(wrap, state, redraw) {
  let last = null;
  wrap.style.cursor = 'grab';
  wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('.view-tools')) return; last = [e.clientX, e.clientY]; try { wrap.setPointerCapture(e.pointerId); } catch (_) {} wrap.style.cursor = 'grabbing'; });
  wrap.addEventListener('pointermove', (e) => {
    if (!last) return;
    state.yaw += (e.clientX - last[0]) * 0.008;
    state.pitch = Math.max(0.02, Math.min(1.5, state.pitch + (e.clientY - last[1]) * 0.006));
    last = [e.clientX, e.clientY];
    redraw();
  });
  const up = () => { last = null; wrap.style.cursor = 'grab'; };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  wrap.style.touchAction = 'none';
}
