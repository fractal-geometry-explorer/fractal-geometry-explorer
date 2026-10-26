// Chapter 23 models: constrained random curdling on a base-5 grid.
// Hoyle curdling (E = 3, N = 5): each surviving cube collapses into 5 of its 125 subcubes.
// Novikov–Stewart curdling, drawn as its plane section: each square eddy keeps N of its
// 25 subsquares. Following the book (Plate 223's caption), the 25 subeddies of every eddy
// are stacked in random order once; lowering N "grays away" the top of each stack, so the
// curds for every N are nested and come from one and the same set of random choices.
const seeded = (s) => () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---- Novikov–Stewart rank field ----
// M[cell] = the highest stack rank (0..24) met along the cell's ancestry of eddies.
// The cell belongs to the curd at threshold N exactly when M < N, so one field serves every N.
const NS_STAGES = 4, NS_SIDE = 625;
function rankField(seed) {
  const rng = seeded(seed), M = new Uint8Array(NS_SIDE * NS_SIDE), perm = new Uint8Array(25);
  for (let level = 1; level <= NS_STAGES; level++) {
    const cells = Math.pow(5, NS_STAGES - level), nE = Math.pow(5, level - 1);
    for (let ey = 0; ey < nE; ey++) for (let ex = 0; ex < nE; ex++) {
      for (let k = 0; k < 25; k++) perm[k] = k;
      for (let i = 24; i > 0; i--) { const j = (rng() * (i + 1)) | 0, t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
      for (let k = 0; k < 25; k++) {
        const r = perm[k], x0 = (ex * 5 + k % 5) * cells, y0 = (ey * 5 + ((k / 5) | 0)) * cells;
        for (let y = y0; y < y0 + cells; y++) { const row = y * NS_SIDE; for (let x = x0; x < x0 + cells; x++) if (r > M[row + x]) M[row + x] = r; }
      }
    }
  }
  return M;
}
// cls[cell]: 0 whey, 1 curd in a contact cluster that does not percolate (black in the book),
// 2 curd in a percolating contact cluster, one touching both the top and the bottom (white).
// Nof(x, y) gives the threshold per cell, so Plate 220's spliced corner works the same way.
function classify(M, Nof) {
  const S = NS_SIDE, id = new Int32Array(S * S).fill(-1);
  const find = (i) => { let r = i; while (id[r] !== r) r = id[r]; while (id[i] !== r) { const n = id[i]; id[i] = r; i = n; } return r; };
  for (let y = 0; y < S; y++) { const row = y * S; for (let x = 0; x < S; x++) if (M[row + x] < Nof(x, y)) id[row + x] = row + x; }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    if (id[i] < 0) continue;
    if (x + 1 < S && id[i + 1] >= 0) { const a = find(i), b = find(i + 1); if (a !== b) id[a] = b; }
    if (y + 1 < S && id[i + S] >= 0) { const a = find(i), b = find(i + S); if (a !== b) id[a] = b; }
  }
  const top = new Set(), both = new Set();
  for (let x = 0; x < S; x++) if (id[x] >= 0) top.add(find(x));
  for (let x = 0; x < S; x++) { const i = (S - 1) * S + x; if (id[i] >= 0 && top.has(find(i))) both.add(find(i)); }
  const cls = new Uint8Array(S * S), roots = new Set();
  let curd = 0;
  for (let i = 0; i < S * S; i++) if (id[i] >= 0) { const r = find(i); roots.add(r); cls[i] = both.has(r) ? 2 : 1; curd++; }
  return { cls, clusters: roots.size, percolating: both.size, curd };
}

// ---- Hoyle curdling ----
// Stages of cubes [x, y, z] on the 5^k lattice; each surviving cube picks 5 of its 125 subcubes.
function hoyleStages(stages, seed) {
  const rng = seeded(seed);
  let cubes = [[0, 0, 0]];
  const out = [];
  for (let k = 1; k <= stages; k++) {
    const next = [];
    for (const [cx, cy, cz] of cubes) {
      const picked = new Set();
      while (picked.size < 5) picked.add((rng() * 125) | 0);
      for (const p of picked) next.push([cx * 5 + (p % 5), cy * 5 + (((p / 5) | 0) % 5), cz * 5 + ((p / 25) | 0)]);
    }
    cubes = next;
    out.push(cubes);
  }
  return out;
}
// plane projection: the distinct (x, y) squares the cubes of one stage project onto
function project(cubes) {
  const seen = new Set(), out = [];
  for (const [x, y] of cubes) { const k = x * 100000 + y; if (!seen.has(k)) { seen.add(k); out.push([x, y]); } }
  return out;
}

// ---- canonical curdling on the line (coin tossing) ----
// rows[k] = surviving subintervals [start] at stage k, as integer positions on the base-b lattice
function canonicalRows(b, p, stages, seed) {
  const rng = seeded(seed);
  let row = [0];
  const rows = [row];
  for (let k = 1; k <= stages && row.length; k++) {
    const next = [];
    for (const s of row) for (let j = 0; j < b; j++) if (rng() < p) next.push(s * b + j);
    row = next;
    rows.push(row);
  }
  return rows;
}
// extinction probability: the smallest root of q = (1 - p + p·q)^b
function extinction(b, p) {
  if (p * b <= 1) return 1;
  let q = 0;
  for (let i = 0; i < 200; i++) q = Math.pow(1 - p + p * q, b);
  return q;
}
