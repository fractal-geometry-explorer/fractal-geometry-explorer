// CORE START
const R3 = Math.sqrt(3), DEG = Math.PI / 180;
// ---- similarity maps z -> A·z + B or A·conj(z) + B, as [ar, ai, br, bi, m] ----
const C = {
  mul: (ar, ai, br, bi) => [ar * br - ai * bi, ar * bi + ai * br],
  comp(f, g) {                       // f∘g
    const [a1r, a1i, b1r, b1i, m1] = f, [a2r, a2i0, b2r, b2i0, m2] = g;
    const a2i = m1 ? -a2i0 : a2i0, b2i = m1 ? -b2i0 : b2i0;
    const [ar, ai] = C.mul(a1r, a1i, a2r, a2i), [tr, ti] = C.mul(a1r, a1i, b2r, b2i);
    return [ar, ai, tr + b1r, ti + b1i, m1 ^ m2];
  },
  app(f, x, y) { const [ar, ai, br, bi, m] = f, yy = m ? -y : y; return [ar * x - ai * yy + br, ar * yy + ai * x + bi]; },
};
const ID = [1, 0, 0, 0, 0];
// A decorated generator is a list of children [map, rev]: the curve on [0,1] is the concatenation of the curves
// map(curve), each run backwards when rev = 1. Built from the generator's points and per-interval codes
// (bit 0: mirror; bit 1: run the interval backwards, i.e. place the generator on it from its far end).
function genFromCodes(P, codes) {
  return codes.map((c, k) => {
    const rv = c >> 1, m = c & 1;
    const [ax, ay] = rv ? P[k + 1] : P[k], [bx, by] = rv ? P[k] : P[k + 1];
    return [[bx - ax, by - ay, ax, ay, m], rv];
  });
}
const MX = [-1, 0, 1, 0, 1];                    // z -> 1 − conj z: mirror in the line x = 1/2
const mirrorGen = (G) => G.slice().reverse().map(([f, r]) => [C.comp(MX, f), r ^ 1]);
function substituteLeg(G, leg, H) {
  const [f, r] = G[leg], sub = (r ? H.slice().reverse() : H).map(([g, s]) => [C.comp(f, g), r ^ s]);
  return G.slice(0, leg).concat(sub, G.slice(leg + 1));
}
const X3 = [-1, 0, 1, 0, 1];
const normaliseGen = (G) => G.map(([f, r]) => (r ? [C.comp(f, X3), 0] : [f, 0]));
// leaves of the cascade, in the order the curve runs through them: [map, rev]
function leaves(gens) {
  const out = [];
  const rec = (f, rev, d) => {
    if (d === gens.length) { out.push([f, rev]); return; }
    const kids = gens[d];
    if (rev) for (let k = kids.length - 1; k >= 0; k--) rec(C.comp(f, kids[k][0]), rev ^ kids[k][1], d + 1);
    else for (let k = 0; k < kids.length; k++) rec(C.comp(f, kids[k][0]), rev ^ kids[k][1], d + 1);
  };
  rec(ID, 0, 0);
  return out;
}
function curveOf(gens) {
  const L = leaves(gens), P = new Float64Array(2 * L.length + 2);
  P[0] = 0; P[1] = 0;
  L.forEach(([f, rev], i) => { const [x, y] = C.app(f, rev ? 0 : 1, 0); P[2 * i + 2] = x; P[2 * i + 3] = y; });
  return P;
}

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
// a 60° arc from a to b bulging to `side` (+1: left of a→b), sampled at n+1 points (a included, b excluded)
function arcPts(ax, ay, bx, by, side, n, out) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), mx = (ax + bx) / 2, my = (ay + by) / 2;
  const cx = mx + dy * side * (R3 / 2), cy = my - dx * side * (R3 / 2);       // centre on the other side
  const a0 = Math.atan2(ay - cy, ax - cx);
  let da = Math.atan2(by - cy, bx - cx) - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  for (let t = 0; t < n; t++) { const a = a0 + (da * t) / n; out.push(cx + L * Math.cos(a), cy + L * Math.sin(a)); }
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

// ---- tree cascades: every link is replaced by the tree generator placed on it ----
// links: [[px,py,qx,qy],...] in the generator's frame; codes as above (bit 0 mirror, bit 1 placed from the far
// end). `level` counts how many times a link's ancestry left the generator's main channel (`main` marks it).
function treeCascade(links, codes, main, n) {
  const G = links.map(([px, py, qx, qy], k) => {
    const c = codes[k], [ax, ay, bx, by] = c & 2 ? [qx, qy, px, py] : [px, py, qx, qy];
    return [bx - ax, by - ay, ax, ay, c & 1];
  });
  let maps = [[ID, 0]];
  for (let s = 0; s < n; s++) {
    const out = [];
    for (const [f, lv] of maps) for (let k = 0; k < G.length; k++) out.push([C.comp(f, G[k]), lv + (main[k] ? 0 : 1)]);
    maps = out;
  }
  return maps.map(([f, lv]) => [f[2], f[3], f[0] + f[2], f[1] + f[3], lv]);
}
// erase the streams near the sources: links on a chain from a source (an end point other than 0 and 1) up to the
// first junction
function clipSources(segs, rounds = 1) {
  let cur = segs;
  const q = (v) => Math.round(v * 1e7);
  for (let r = 0; r < rounds; r++) {
    const deg = new Map(), K = (x, y) => q(x) + ',' + q(y);
    for (const s of cur) for (const k of [K(s[0], s[1]), K(s[2], s[3])]) deg.set(k, (deg.get(k) || 0) + 1);
    const keep = (x, y) => (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) || (Math.abs(x - 1) < 1e-9 && Math.abs(y) < 1e-9);
    // walk each chain inward from a source
    const adj = new Map();
    cur.forEach((s, i) => { for (const k of [K(s[0], s[1]), K(s[2], s[3])]) { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(i); } });
    const dead = new Set();
    for (const [k, d] of deg) {
      if (d !== 1) continue;
      const [x, y] = k.split(',').map((v) => Number(v) / 1e7);
      if (keep(x, y)) continue;
      let at = k, prev = -1;
      for (let guard = 0; guard < 1e6; guard++) {
        const nxt = adj.get(at).filter((i) => i !== prev && !dead.has(i));
        if (nxt.length !== 1) break;
        const i = nxt[0]; dead.add(i); prev = i;
        const s = cur[i], k1 = K(s[0], s[1]), k2 = K(s[2], s[3]); at = k1 === at ? k2 : k1;
        const [x2, y2] = at.split(',').map((v) => Number(v) / 1e7);
        if (deg.get(at) !== 2 || keep(x2, y2)) break;
      }
    }
    cur = cur.filter((_, i) => !dead.has(i));
  }
  return cur;
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
// CORE END
