// Plate data for chapter 32: subordination and the spatial Lévy dusts. The random constructions
// (Lévy flights, subordinated Brownian trails) are seeded so every figure can be reproduced.
// Drawing machinery is in src/shared/draw.js, generator machinery in src/shared/geometry.js.

// ---- seeded randomness ----
function rng(seed) {
  let a = seed >>> 0;
  const u = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  u.gauss = () => { let r = 0, s = 0; do { r = 2 * u() - 1; s = 2 * u() - 1; } while (r * r + s * s >= 1 || (r === 0 && s === 0)); return r * Math.sqrt((-2 * Math.log(r * r + s * s)) / (r * r + s * s)); };
  return u;
}
// a hyperbolic (Pareto) jump: Pr(U > u) = u^(−D) for u ≥ 1, the book's law with its inner cutoff at u = 1
const pareto = (u, D) => Math.pow(1 - u(), -1 / D);

// ---- Lévy and Rayleigh flights (Plates 296–297, 299, 300) ----
// Two independent flights from the origin, forward and reverse, as every plate in the portfolio does.
// dims = 2 or 3; returns { pts: Float32Array(dims·n), half } with the origin at index 0 and at index half.
function levyFlight(n, D, dims, seed) {
  const u = rng(seed), pts = new Float32Array(dims * n), half = Math.ceil(n / 2);
  for (const [from, to] of [[0, half], [half, n]]) {
    let x = 0, y = 0, z = 0, w = dims * from;
    if (dims === 2) pts[w] = 0, pts[w + 1] = 0; else pts[w] = 0, pts[w + 1] = 0, pts[w + 2] = 0;
    for (let i = from + 1; i < to; i++) {
      const U = D >= 900 ? Math.abs(u.gauss()) : pareto(u, D);        // D ≥ 900 marks the Rayleigh flight
      if (dims === 2) {
        const a = 2 * Math.PI * u();
        x += U * Math.cos(a); y += U * Math.sin(a);
        pts[2 * i] = x; pts[2 * i + 1] = y;
      } else {
        const c = 2 * u() - 1, s = Math.sqrt(Math.max(0, 1 - c * c)), a = 2 * Math.PI * u();
        x += U * s * Math.cos(a); y += U * s * Math.sin(a); z += U * c;
        pts[3 * i] = x; pts[3 * i + 1] = y; pts[3 * i + 2] = z;
      }
    }
  }
  return { pts, half, n, dims };
}

// the mass–radius exponent: counts M(R) in balls around the origin, then the least-squares slope of
// log M against log R. R runs over `bins` radii log-spaced inside [rLo, rHi].
function massDimension(pts, dims, rLo, rHi, bins = 12) {
  const n = pts.length / dims, counts = new Float64Array(bins), lR = new Float64Array(bins);
  for (let b = 0; b < bins; b++) lR[b] = Math.log(rLo) + ((Math.log(rHi) - Math.log(rLo)) * b) / (bins - 1);
  for (let i = 0; i < n; i++) {
    let r2 = 0;
    for (let d = 0; d < dims; d++) { const v = pts[dims * i + d]; r2 += v * v; }
    const lr = 0.5 * Math.log(Math.max(r2, 1e-12));
    for (let b = 0; b < bins; b++) if (lr <= lR[b]) counts[b]++;
  }
  let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
  for (let b = 0; b < bins; b++) {
    if (counts[b] < 4) continue;
    const X = lR[b], Y = Math.log(counts[b]);
    sx += X; sy += Y; sxx += X * X; sxy += X * Y; m++;
  }
  return m > 2 ? (m * sxy - sx * sy) / (m * sxx - sx * sx) : NaN;
}

// ---- subordination of a Brownian trail (Plate 298) ----
// A linear Lévy dust of dimension alpha on [0, M): visit times t(k+1) = t(k) + W, Pr(W > w) = w^(−alpha).
function levySubordinator(M, alpha, seed) {
  const u = rng(seed), out = [];
  let t = 0;
  while (t < M) { out.push(Math.floor(t)); t += pareto(u, alpha); }
  return Uint32Array.from(out);
}
// A planar Brownian walk of M steps, then successive subordinations riding each on its predecessor:
// stage k holds the walk's positions at the times of a Lévy dust of dimension alpha^k.
function subordinationCascade(M, alpha, stages, seed) {
  const u = rng(seed), walk = new Float32Array(2 * M);
  let x = 0, y = 0;
  for (let i = 1; i < M; i++) { x += u.gauss(); y += u.gauss(); walk[2 * i] = x; walk[2 * i + 1] = y; }
  const idx = [null];                                 // stage 0 is the walk itself
  for (let k = 1; k <= stages; k++) {
    const prevN = k === 1 ? M : idx[k - 1].length;
    const sub = levySubordinator(prevN, alpha, seed + 977 * k);
    idx.push(k === 1 ? sub : Uint32Array.from(sub, (j) => idx[k - 1][Math.min(j, prevN - 1)]));
  }
  // kept times of stage k measured in stage k−1's steps, for the Lévy staircase insets
  const stairs = [null];
  for (let k = 1; k <= stages; k++) stairs.push(levySubordinator(k === 1 ? M : idx[k - 1].length, alpha, seed + 977 * k));
  return { walk, idx, stairs, M };
}

// ---- Plate 295: the nonrandom subordinate dust ----
// Plate 49's generator (b = 4, N = 8, D = 3/2), as decoded for the quadric-islands page.
const P295_GEN = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 0], [2, -1], [3, -1], [3, 0], [4, 0]].map(([x, y]) => [x / 4, y / 4]);
// One stage: lay the generator on the segment, cut each of its 8 legs in the middle, and keep the two
// snapped-back end pieces of each leg: 16 children of ratio 1/16, every one forward, none mirrored.
function p295Children(ax, ay, bx, by, out) {
  const dx = bx - ax, dy = by - ay;
  for (let k = 0; k < 8; k++) {
    const px = ax + dx * P295_GEN[k][0] - dy * P295_GEN[k][1], py = ay + dx * P295_GEN[k][1] + dy * P295_GEN[k][0];
    const qx = ax + dx * P295_GEN[k + 1][0] - dy * P295_GEN[k + 1][1], qy = ay + dx * P295_GEN[k + 1][1] + dy * P295_GEN[k + 1][0];
    const ex = (qx - px) / 4, ey = (qy - py) / 4;
    out.push(px, py, px + ex, py + ey, qx - ex, qy - ey, qx, qy);
  }
}
const p295Cache = {};
function p295Segs(n) {                                 // Float64Array of segments [ax,ay,bx,by] at stage n
  if (p295Cache[n]) return p295Cache[n];
  let segs = [0, 0, 1, 0];
  for (let s = 0; s < n; s++) {
    const out = [];
    for (let i = 0; i < segs.length; i += 4) p295Children(segs[i], segs[i + 1], segs[i + 2], segs[i + 3], out);
    segs = out;
  }
  return (p295Cache[n] = Float64Array.from(segs));
}
// the quadric Koch curve the dust rides on (open, on [0,1]), for the underlay
function p295Curve(n) {
  let P = [0, 0, 1, 0];
  for (let s = 0; s < n; s++) {
    const m = P.length / 2 - 1, Q = new Float64Array(2 * (8 * m + 1));
    let w = 0;
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], dx = P[2 * i + 2] - ax, dy = P[2 * i + 3] - ay;
      for (let k = 0; k < 8; k++) { Q[w++] = ax + dx * P295_GEN[k][0] - dy * P295_GEN[k][1]; Q[w++] = ay + dx * P295_GEN[k][1] + dy * P295_GEN[k][0]; }
    }
    Q[w++] = 1; Q[w++] = 0;
    P = Q;
  }
  return P;
}
// the snap-back gap law: at stage n, count the gaps between successive pinned points that exceed u.
// Nr(G > u) should step along F·u^(−1) (the caption's frequency distribution, with D = 1).
function p295Gaps(n) {
  const segs = p295Segs(n), m = segs.length / 4, gaps = [];
  for (let i = 0; i + 1 < m; i++) {
    const g = Math.hypot(segs[4 * i + 4] - segs[4 * i + 2], segs[4 * i + 5] - segs[4 * i + 3]);
    if (g > 1e-12) gaps.push(g);
  }
  gaps.sort((a, b) => b - a);
  return gaps;
}

// ---- Plate 293: the snowflake sweep of Plate 69, with a bug of your own ----
// The 13-interval generator from the snow-sweeps page (chapter 7), redeclared here so the bug toy
// can corrupt a copy of it. Codes were read off the book's second stage; see DECISIONS.md.
const SNOW_PTS = (() => {
  const pol = (L, a) => [L * Math.cos((a * Math.PI) / 180), L * Math.sin((a * Math.PI) / 180)];
  const steps = [pol(1 / 3, 60), pol(1 / 3, 60), pol(1 / 3, 0), pol(1 / 3, -60), pol(1 / R3, 210), pol(1 / 3, 0), pol(1 / 3, 0)];
  const P = [[0, 0]];
  for (const [dx, dy] of steps) { const [x, y] = P[P.length - 1]; P.push([x + dx, y + dy]); }
  P[7] = [1, 0];
  return P;
})();
const SNOW_CODES = [1, 3, 3, 3, 2, 1, 3];
const GEN_S293 = genFromCodes(SNOW_PTS, SNOW_CODES);
const GEN_13BUG = substituteLeg(GEN_S293, 4, mirrorGen(GEN_S293));   // the 13-interval generator of Plate 69
// a corrupted copy: flip the mirror bit and/or the reversal of legs hit by the bug
function buggyGen(G, legs, flipMirror, flipRev) {
  return G.map(([f, r], k) => {
    if (!legs.includes(k)) return [f, r];
    const g = flipMirror ? C.comp(f, MX) : f.slice();
    return [g, flipRev ? r ^ 1 : r];
  });
}
