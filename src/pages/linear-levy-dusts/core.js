// Chapter 31 geometry: interval tremas on the line, the street-strip tremas of Plate 285, and
// the Lévy staircases of Plates 286–287. All three follow one rule, the chapter's Poisson trema
// law: the trema of rank p (the p-th largest) has covering size κ/p, κ = (E − D)·(measure of
// the sampled region) — length of an interval on the line (E = 1), width of a strip in the
// plane (E = 2; a strip covers a point when the line's offset falls within its width). Every
// random figure is seeded so it can be reproduced; same rng and pareto as the chapter 32 page.

// ---- seeded randomness ----
function rng(seed) {
  let a = seed >>> 0;
  const u = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return u;
}
// a hyperbolic (Pareto) jump: Pr(U > u) = u^(−D) for u ≥ 1, the caption's law for Plates 286–287
const pareto = (u, D) => Math.pow(1 - u(), -1 / D);
// one uniform [0,1) per (stream, rank), as on the disc-tremas page: trema p's position never
// depends on D or on the cutoff, so varying D keeps the same sample
function hash01(stream, p) {
  let h = (stream ^ Math.imul(p, 0x9e3779b9)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x21f0aaad);
  h ^= h >>> 15; h = Math.imul(h, 0x735a2d97);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const EULER = 0.5772156649015329;

// ---- interval tremas (pages 282–284) ----
// Tremas centered in a stretch of length Δt, with length above u, number (1 − Dt)·Δt/u in
// expectation: trema p is an interval of length κ/p with κ = (1 − Dt)·T, centers uniform over
// the window [0, 1] grown by a margin m on both sides (tremas centered off the window still
// bite into it). The margin should be half the largest trema, which itself grows with T;
// iterate, capping at 1.5 so Dt near 0 stays finite.
function lineLayout(Dt) {
  let m = 0.1;
  for (let i = 0; i < 60; i++) m = Math.min(1.5, ((1 - Dt) * (1 + 2 * m)) / 2);
  const T = 1 + 2 * m;
  return { m, T, kap: (1 - Dt) * T };
}
// survivors of [0, 1] under all tremas of rank 1…P: merged trema intervals, complemented.
// Returns a flat array [a0, b0, a1, b1, …] of the surviving intervals, clipped to [0, 1].
function lineSurvivors(Dt, P, seed, L = lineLayout(Dt)) {
  const s = 2 * seed + 1, cuts = [];
  for (let p = 1; p <= P; p++) {
    const len = L.kap / p, c = hash01(s, p) * L.T - L.m;
    const a = c - len / 2, b = c + len / 2;
    if (b > 0 && a < 1) cuts.push([Math.max(0, a), Math.min(1, b)]);
  }
  cuts.sort((u, v) => u[0] - v[0]);
  const out = [];
  let at = 0;
  for (const [a, b] of cuts) {
    if (a > at) out.push(at, a);
    at = Math.max(at, b);
  }
  if (at < 1) out.push(at, 1);
  return out;
}
// ink coverage of a set of intervals on a row of pixels, with the sub-pixel deposit rule from
// DECISIONS.md: a surviving piece shorter than a pixel deposits total mass (ℓ/px)^D, the one
// weight that keeps the deposit steady as the threshold falls
function coverIntervals(buf, ints, wx0, px, D) {
  for (let i = 0; i < ints.length; i += 2) {
    const a = ints[i], b = ints[i + 1], len = b - a;
    if (b <= wx0 || a >= wx0 + buf.length * px) continue;
    const w = len < px && D > 0 ? Math.pow(len / px, D) : 1;
    const i0 = Math.max(0, Math.floor((a - wx0) / px)), i1 = Math.min(buf.length - 1, Math.floor((b - wx0) / px));
    for (let j = i0; j <= i1; j++) {
      const lo = Math.max(a, wx0 + j * px), hi = Math.min(b, wx0 + (j + 1) * px);
      if (hi > lo) buf[j] += ((hi - lo) / px) * w;
    }
  }
}
// a Cantor dust with the same dimension, for the side-by-side: N = 2 pieces of r = 2^(−1/D),
// evenly spaced as on the cantor-dust page; returns surviving intervals at stage n
function cantorIntervals(D, n) {
  const r = Math.pow(2, -1 / D);
  let starts = [0], len = 1;
  for (let k = 0; k < n; k++) {
    const out = new Float64Array(2 * starts.length);
    let j = 0;
    for (const a of starts) { out[j++] = a; out[j++] = a + (1 - r) * len; }
    starts = out; len *= r;
  }
  const ints = new Float64Array(2 * starts.length);
  for (let i = 0; i < starts.length; i++) { ints[2 * i] = starts[i]; ints[2 * i + 1] = starts[i] + len; }
  return ints;
}

// ---- Plate 285: street-strip tremas ----
// The window is the printed plate's shape, measured from the scan. Street p is an infinite
// strip of width κ/p, κ = (2 − D)·(range of line offsets); its direction is isotropic and its
// offset uniform, so every point of the window sees the same law. The offset range must cover
// every line that meets the window, i.e. half the diagonal plus half the widest street; iterate.
const W285 = 1.366;
function streetLayout(D) {
  const diag = Math.hypot(W285, 1);
  let kap = 0.1;
  for (let i = 0; i < 60; i++) kap = Math.min(1.5, (2 - D) * (diag + kap));
  return { kap, range: diag + kap };
}
// the streets of rank 1…P: [cos θ, sin θ, offset t, width w] per street, offsets measured from
// the window's center along the strip's normal
function streets(D, P, seed, L = streetLayout(D)) {
  const s1 = 2 * seed + 1, s2 = 2 * seed + 2, out = new Float64Array(4 * P);
  for (let p = 1; p <= P; p++) {
    const th = Math.PI * hash01(s1, p), o = 4 * (p - 1);
    out[o] = Math.cos(th); out[o + 1] = Math.sin(th);
    out[o + 2] = (hash01(s2, p) - 0.5) * L.range;
    out[o + 3] = L.kap / p;
  }
  return out;
}
// the streets' cuts through the horizontal line y = y0 (offsets re-centered on the window
// center): surviving intervals of [0, W285] — the "blocks of houses" seen along one line
function streetSection(S, y0) {
  const cx = W285 / 2, cy = 0.5, cuts = [];
  for (let o = 0; o < S.length; o += 4) {
    const nx = S[o], ny = S[o + 1], t = S[o + 2], w = S[o + 3];
    const c = t + cx * nx + cy * ny;                  // line offset in absolute coordinates
    if (Math.abs(nx) < 1e-9) {
      if (Math.abs(y0 * ny - c) <= w / 2) return [];  // a horizontal street swallows the line
      continue;
    }
    const xa = (c - w / 2 - y0 * ny) / nx, xb = (c + w / 2 - y0 * ny) / nx;
    const a = Math.min(xa, xb), b = Math.max(xa, xb);
    if (b > 0 && a < W285) cuts.push([Math.max(0, a), Math.min(W285, b)]);
  }
  cuts.sort((u, v) => u[0] - v[0]);
  const out = [];
  let at = 0;
  for (const [a, b] of cuts) {
    if (a > at) out.push(at, a);
    at = Math.max(at, b);
  }
  if (at < W285) out.push(at, W285);
  return out;
}
// the share of the window the streets are expected to leave white after P ranks:
// exp(−Σ w_p/range) = exp(−(2 − D)·H_P)
const whiteShare = (D, P) => Math.exp(-(2 - D) * (Math.log(P) + EULER));

// ---- Plates 286–287: Lévy staircases ----
// The caption's recipe: each time the ordinate climbs by Δy, the abscissa jumps by U with
// Pr(U > u) = u^(−D), u ≥ 1; then rescale so the staircase ends at (1, 1). Returns the jump
// abscissas X[0…steps] with X[steps] = 1, plus the largest tread and its position.
function levyStair(D, steps, seed) {
  const u = rng(seed), X = new Float64Array(steps + 1);
  for (let i = 1; i <= steps; i++) X[i] = X[i - 1] + pareto(u, D);
  const T = X[steps];
  let big = 0, bigAt = 0;
  for (let i = 0; i <= steps; i++) X[i] /= T;
  for (let i = 1; i <= steps; i++) {
    const tread = X[i] - X[i - 1];
    if (tread > big) { big = tread; bigAt = i; }
  }
  return { X, big, bigAt };
}
