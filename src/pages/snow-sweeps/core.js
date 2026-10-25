// Plate data for the snowflake sweeps, the Peano–Gosper curve and its trees, the fudgeflake and
// the quartet. The generator and cascade machinery lives in src/shared/geometry.js.
const DEG = Math.PI / 180;
// ---- Plates 68–69: the snowflake sweeps ----
const pol = (L, a) => [L * Math.cos(a * DEG), L * Math.sin(a * DEG)];
const SNOW_PTS = (() => {
  const steps = [pol(1 / 3, 60), pol(1 / 3, 60), pol(1 / 3, 0), pol(1 / 3, -60), pol(1 / R3, 210), pol(1 / 3, 0), pol(1 / 3, 0)];
  const P = [[0, 0]];
  for (const [dx, dy] of steps) { const [x, y] = P[P.length - 1]; P.push([x + dx, y + dy]); }
  P[7] = [1, 0];
  return P;
})();
const SNOW_CODES = [1, 3, 3, 3, 2, 1, 3];       // read off the book's second stage
const GEN_S = genFromCodes(SNOW_PTS, SNOW_CODES), GEN_F = mirrorGen(GEN_S);
// the 13-interval generator: S with its long fifth leg replaced by F reduced by 1/√3. Its legs that run backward
// can hold the same generator run backward (GEN_13S, as in the large figure of Plate 69), or the other one
// (GEN_13, as in Plate 68, the caption's second stage and the small figures of Plate 69)
const GEN_13S = substituteLeg(GEN_S, 4, GEN_F), GEN_13F = mirrorGen(GEN_13S);
const GEN_13 = normaliseGen(GEN_13S), GEN_13M = mirrorGen(GEN_13);
// the snowflake's outline: a hexagon of side 1/√3 around the triangle on [0,1], then j steps of the two-piece
// generator (each edge -> two edges of 1/√3 at 120°), bumps all inward, then all outward, and so on
function snowOutline(j) {
  let P = [[0, 0], [0.5, -R3 / 6], [1, 0], [1, R3 / 3], [0.5, R3 / 2], [0, R3 / 3]];
  for (let k = 0; k < j; k++) {
    const s = k % 2 === 0 ? 1 : -1, Q = [];
    for (let i = 0; i < P.length; i++) {
      const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length], dx = bx - ax, dy = by - ay;
      Q.push([ax, ay], [(ax + bx) / 2 - dy * s / (2 * R3), (ay + by) / 2 + dx * s / (2 * R3)]);
    }
    P = Q;
  }
  return P;
}
// the Koch snowflake on the triangle (0,0) (1,0) (1/2, √3/2), stage n, as a flat polygon
function kochFlake(n) {
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
// ---- Plates 70–71: the Peano–Gosper curve on the triangular lattice ----
const HEX = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
function flowsnakeLattice(n) {
  let s = 'A';
  for (let k = 0; k < n; k++) s = s.replace(/[AB]/g, (c) => (c === 'A' ? 'A-B--B+A++AA+B-' : '+A-BB--B-A++A+B'));
  let x = 0, y = 0, h = 0;
  const P = [[0, 0]];
  // turned the book's way: the generator rises to the left of [0, 1]
  for (const c of s) { if (c === '+') h = (h + 5) % 6; else if (c === '-') h = (h + 1) % 6; else { x += HEX[h][0]; y += HEX[h][1]; P.push([x, y]); } }
  return P;
}
// lattice point -> page: the curve runs from (0,0) to (1,0)
function latticeFrame(P) {
  const [ex, ey] = P[P.length - 1], fx = ex + ey / 2, fy = (ey * R3) / 2, L2 = fx * fx + fy * fy;
  const cr = fx / L2, ci = -fy / L2;           // multiply by 1/end
  return (i, j) => { const x = i + j / 2, y = (j * R3) / 2; return [cr * x - ci * y, cr * y + ci * x]; };
}
// Rivers and watersheds: the lattice triangles with all three corners on the curve, joined across the links the
// curve does not use. Each piece is a tree; a triangle lies left (river) or right (watershed) of the curve.
function gosperTrees(n) {
  const P = flowsnakeLattice(n), key = (i, j) => (i + 50000) * 100003 + (j + 50000), V = new Set(P.map(([i, j]) => key(i, j)));
  const pt = new Map(P.map(([i, j]) => [key(i, j), [i, j]]));
  const ekey = (a, b) => { const ka = key(...a), kb = key(...b); return ka < kb ? ka + ':' + kb : kb + ':' + ka; };
  const curve = new Set();
  for (let k = 0; k + 1 < P.length; k++) curve.add(ekey(P[k], P[k + 1]));
  const side = new Map(), tkey = (t) => t.map((p) => key(...p)).sort((a, b) => a - b).join(',');
  const cross = (a, b, c) => { const ax = a[0] + a[1] / 2, ay = a[1], bx = b[0] + b[1] / 2, by = b[1], cx = c[0] + c[1] / 2, cy = c[1]; return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); };
  for (let k = 0; k + 1 < P.length; k++) {
    const a = P[k], b = P[k + 1], h = HEX.findIndex(([dx, dy]) => dx === b[0] - a[0] && dy === b[1] - a[1]);
    for (const hh of [(h + 1) % 6, (h + 5) % 6]) { const c = [a[0] + HEX[hh][0], a[1] + HEX[hh][1]]; side.set(tkey([a, b, c]), cross(a, b, c) > 0 ? 1 : -1); }
  }
  const tris = [];
  for (const [i, j] of P) for (const t of [[[i, j], [i + 1, j], [i, j + 1]], [[i, j], [i + 1, j], [i + 1, j - 1]]]) if (t.every((p) => V.has(key(...p)))) tris.push(t);
  const tid = new Map(); tris.forEach((t, k) => tid.set(tkey(t), k));
  const byEdge = new Map();
  tris.forEach((t, k) => { for (const [u, v] of [[0, 1], [1, 2], [0, 2]]) { const e = ekey(t[u], t[v]); if (!byEdge.has(e)) byEdge.set(e, []); byEdge.get(e).push(k); } });
  // a triangle's side: from any of its curve edges; triangles without one take their neighbours' side
  const sideOf = tris.map((t) => side.get(tkey(t)) || 0);
  const links = [], adj = tris.map(() => []);
  for (const [e, ks] of byEdge) if (ks.length === 2 && !curve.has(e)) { links.push(ks); adj[ks[0]].push(ks[1]); adj[ks[1]].push(ks[0]); }
  for (let changed = true; changed;) { changed = false; tris.forEach((t, k) => { if (!sideOf[k]) { const s = adj[k].map((o) => sideOf[o]).find((v) => v); if (s) { sideOf[k] = s; changed = true; } } }); }
  // outer boundary edges (one triangle only), with the side of that triangle
  const boundary = [];
  for (const [e, ks] of byEdge) if (ks.length === 1) { const [ka, kb] = e.split(':').map(Number); boundary.push([ka, kb, sideOf[ks[0]]]); }
  return { P, tris, links, adj, sideOf, boundary: boundary.map(([ka, kb, sd]) => [pt.get(ka), pt.get(kb), sd]) };
}

// ---- Plates 72–73 ----
// fudgeflake tree: three links from the centre of the triangle on [0,1] to its corners
const FUDGE_C = [0.5, R3 / 6], FUDGE_T = [0.5, R3 / 2];
const FUDGE_LINKS = [[0, 0, FUDGE_C[0], FUDGE_C[1]], [FUDGE_C[0], FUDGE_C[1], 1, 0], [FUDGE_C[0], FUDGE_C[1], FUDGE_T[0], FUDGE_T[1]]];
const FUDGE_CODES = [2, 0, 0], FUDGE_MAIN = [1, 1, 0];          // alternating: the first link's copy goes to the right
// terdragon (Z generator, legs 1/√3 at 60°) for the fudgeflake sweep
const TER_PTS = [[0, 0], [0.5, R3 / 6], [0.5, -R3 / 6], [1, 0]], TER_CODES = [0, 0, 0];
// the quartet: five intervals of length 1/√5 on the lattice spanned by u = (1+2i)/5 and v = (2−i)/5
const QU = [0.2, 0.4], QV = [0.4, -0.2];
const QUART_PTS = [[0, 0], [0.2, 0.4], [0.4, 0.8], [0.8, 0.6], [0.6, 0.2], [1, 0]], QUART_CODES = [2, 0, 0, 2, 0];
const QUART_BOUND = [[0, 0], [0.4, -0.2], [0.6, 0.2], [1, 0]];          // boundary generator: v, u, v
const QF_LINKS = [[0, 0, 0.2, 0.4], [0.2, 0.4, 0.4, 0.8], [0.4, 0.8, 0.8, 0.6], [0.2, 0.4, 0.6, 0.2], [0.6, 0.2, 1, 0]];
const QF_CODES = [2, 0, 0, 0, 0], QF_MAIN = [1, 0, 0, 1, 1];      // a placement that never touches itself
const QH_LINKS = [[0, 0, 0.4, 0.2], [0.4, 0.2, 0.8, 0.4], [0.4, 0.2, 0.6, -0.2], [0.6, -0.2, 1, 0], [0.6, -0.2, 0.2, -0.4]];
const QH_CODES = [0, 0, 1, 0, 0], QH_MAIN = [1, 0, 1, 1, 0];      // touches itself however placed
// Peano–Gosper tree generator (Plate 71 bottom), on the lattice of w = e^{iφ}/√7
const GOS_TREE = (() => {
  const phi = Math.atan2(R3, 5), wr = Math.cos(phi) / Math.sqrt(7), wi = Math.sin(phi) / Math.sqrt(7);
  const rot = (a) => C.mul(wr, wi, Math.cos(a * DEG), Math.sin(a * DEG));
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const S = [0, 0], A = rot(0), B = add(A, rot(-60)), E = [1, 0], Cc = add(A, rot(60)), D = add(Cc, rot(120)), F = add(Cc, rot(0)), G = add(F, rot(-60));
  const L = [[S, A], [A, B], [B, E], [A, Cc], [Cc, D], [Cc, F], [F, G]].map(([p, q]) => [p[0], p[1], q[0], q[1]]);
  return { links: L, codes: [3, 1, 3, 1, 3, 3, 1], main: [1, 1, 1, 0, 0, 0, 0] };
})();
