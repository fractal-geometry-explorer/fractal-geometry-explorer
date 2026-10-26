// Chapter 26 core: seeded randomness, midpoint-displacement curves in the plane and on the line,
// Poisson strata, a segment-crossing counter and the trema field behind Plate 246's story.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gaussOf = (rnd) => () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

// ---- the plane curve B*_H(t): midpoint displacement on a time grid ----
// At stage k every side (nominally of length 2^(-k/D)) is bent at its middle; the displacement's
// mean square length is the book's 2^(-2(k+1)/D) - 2^(-2(k/D+1)). Rules: 'random' (isotropic
// Gaussian, the book's randomization), 'alt' (perpendicular, side alternating by stage: at
// D = log 4/log 3 this is the Koch snowflake curve in base N = 2), 'same' (always the same side:
// at D = 2, the Levy C curve).
function planeCurve(D, rule, n, seed) {
  const g = gaussOf(mulberry32(seed));
  let P = new Float64Array([0, 0, 1, 0]);
  for (let k = 0; k < n; k++) {
    // the book's 2^(-2(k+1)/D) - 2^(-2(k/D+1)); the second term is 2^(-2k/D)/4
    const sig2 = Math.pow(2, (-2 * (k + 1)) / D) - Math.pow(2, (-2 * k) / D) / 4;
    const m = P.length / 2 - 1, Q = new Float64Array(2 * (2 * m) + 2);
    const side = rule === 'alt' ? (k % 2 === 0 ? 1 : -1) : 1;
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3];
      let mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (rule === 'random') {
        const s = Math.sqrt(sig2 / 2);
        mx += s * g(); my += s * g();
      } else {
        const L = Math.hypot(bx - ax, by - ay) || 1, d = Math.sqrt(Math.max(0, sig2)) * side;
        mx += (-(by - ay) / L) * d; my += ((bx - ax) / L) * d;
      }
      Q[4 * i] = ax; Q[4 * i + 1] = ay; Q[4 * i + 2] = mx; Q[4 * i + 3] = my;
    }
    Q[Q.length - 2] = P[P.length - 2]; Q[Q.length - 1] = P[P.length - 1];
    P = Q;
  }
  return P;
}

// ---- the line-to-line function X(t): midpoint displacement with exponent H ----
// Values on the grid j/2^n. Refining an interval of length 2^(-k), the midpoint gets the average
// of the ends plus a Gaussian of variance 2^(-2Hk) (2^(-2H) - 1/4), so that over every dyadic
// interval <dX^2> = dt^(2H) exactly. Returns the final values and, if wanted, the teragon of
// every stage interpolated onto the final grid (for the layers view).
function lineCurve(H, n, seed, keepStages) {
  const g = gaussOf(mulberry32(seed)), N = 1 << n, X = new Float64Array(N + 1);
  X[0] = 0; X[N] = g();
  const stages = [];
  const snapshot = () => {
    const S = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) S[i] = X[i];
    return S;
  };
  const interp = (step) => {              // fill between the known points at spacing `step`
    for (let a = 0; a < N; a += step) for (let j = 1; j < step; j++) X[a + j] = X[a] + ((X[a + step] - X[a]) * j) / step;
  };
  if (keepStages) { interp(N); stages.push(snapshot()); }
  for (let k = 0; k < n; k++) {
    const s = Math.sqrt(Math.pow(2, -2 * H * k) * (Math.pow(2, -2 * H) - 0.25)), step = N >> k;
    for (let a = 0; a < N; a += step) X[a + step / 2] = (X[a] + X[a + step]) / 2 + s * g();
    if (keepStages) { interp(step / 2); stages.push(snapshot()); }
  }
  if (!keepStages) interp(1);
  return keepStages ? { X, stages } : { X };
}

// Measured nonstationarity: the mean square increment over windows of length dt = 2^(-m), when the
// window is dyadic (h dt to (h+1) dt) and when it is slid by half a step. Averaged over windows
// and over `trials` fresh curves.
function slidWindows(H, m, trials, seed0) {
  const n = m + 1, N = 1 << n;
  let dy = 0, sl = 0, cd = 0, cs = 0;
  for (let t = 0; t < trials; t++) {
    const { X } = lineCurve(H, n, seed0 + 7919 * t);
    for (let h = 0; h < (1 << m); h++) {
      const d = X[(h + 1) * 2] - X[h * 2];
      dy += d * d; cd++;
      if (h) { const e = X[h * 2 + 1] - X[h * 2 - 1]; sl += e * e; cs++; }
    }
  }
  return { dyadic: dy / cd, slid: sl / cs };
}

// ---- randomly positioned strata: B_H-dagger(t) ----
// Stratum k is a broken line through Poisson instants, b^k of them per unit time on average, with
// independent Gaussian values of standard deviation b^(-Hk) (the amplitude is our choice; the book
// fixes only the rates). Sampled onto a grid of M+1 points over [0, 1].
function strata(H, b, K, seed, M) {
  const rnd = mulberry32(seed), g = gaussOf(rnd), layers = [], sum = new Float64Array(M + 1);
  for (let k = 0; k <= K; k++) {
    const lam = Math.pow(b, k), amp = Math.pow(b, -H * k), S = new Float64Array(M + 1);
    let t1 = Math.log(1 - rnd()) / lam, v1 = amp * g();          // first instant left of 0
    let t2 = t1 - Math.log(1 - rnd()) / lam, v2 = amp * g();
    for (let i = 0; i <= M; i++) {
      const t = i / M;
      while (t2 < t) { t1 = t2; v1 = v2; t2 = t1 - Math.log(1 - rnd()) / lam; v2 = amp * g(); }
      S[i] = v1 + ((v2 - v1) * (t - t1)) / (t2 - t1);
    }
    layers.push(S);
    for (let i = 0; i <= M; i++) sum[i] += S[i];
  }
  const s0 = sum[0];
  for (let i = 0; i <= M; i++) sum[i] -= s0;
  return { layers, sum };
}

// ---- proper crossings of a polyline (self-intersections of the teragon) ----
function crossings(P) {
  const m = P.length / 2 - 1;
  let cell = 0;
  for (let i = 0; i < m; i++) cell = Math.max(cell, Math.abs(P[2 * i + 2] - P[2 * i]), Math.abs(P[2 * i + 3] - P[2 * i + 1]));
  cell = cell || 1;
  const grid = new Map(), key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const boxes = [];
  for (let i = 0; i < m; i++) {
    const x0 = Math.min(P[2 * i], P[2 * i + 2]), x1 = Math.max(P[2 * i], P[2 * i + 2]);
    const y0 = Math.min(P[2 * i + 1], P[2 * i + 3]), y1 = Math.max(P[2 * i + 1], P[2 * i + 3]);
    boxes.push([x0, y0, x1, y1]);
    for (let cx = Math.floor(x0 / cell); cx <= Math.floor(x1 / cell); cx++)
      for (let cy = Math.floor(y0 / cell); cy <= Math.floor(y1 / cell); cy++) {
        const k = `${cx},${cy}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      }
  }
  const seen = new Set();
  let count = 0;
  const seg = (i) => [P[2 * i], P[2 * i + 1], P[2 * i + 2], P[2 * i + 3]];
  const cross = (a, b) => {
    const [ax, ay, bx, by] = seg(a), [cx2, cy2, dx, dy] = seg(b);
    const d1 = (bx - ax) * (cy2 - ay) - (by - ay) * (cx2 - ax), d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    const d3 = (dx - cx2) * (ay - cy2) - (dy - cy2) * (ax - cx2), d4 = (dx - cx2) * (by - cy2) - (dy - cy2) * (bx - cx2);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  for (const list of grid.values())
    for (let a = 0; a < list.length; a++)
      for (let b = a + 1; b < list.length; b++) {
        const i = list[a], j = list[b];
        if (Math.abs(i - j) < 2) continue;
        const id = i < j ? i * m + j : j * m + i;
        if (seen.has(id)) continue;
        const A = boxes[i], B = boxes[j];
        if (A[2] < B[0] || B[2] < A[0] || A[3] < B[1] || B[3] < A[1]) continue;
        seen.add(id);
        if (cross(i, j)) count++;
      }
  return count;
}

// ---- the trema field: the "very strict order" behind Plate 246's story ----
// Round tremas with Nr(radius > u) proportional to u^(-2), the design of Plates 306-309.
function tremaField(seed, count = 300, rMin = 0.016, rMax = 0.34) {
  const rnd = mulberry32(seed), out = [];
  const q = 1 - (rMin / rMax) * (rMin / rMax);
  for (let i = 0; i < count; i++) out.push([-0.4 + 1.8 * rnd(), -0.4 + 1.8 * rnd(), rMin / Math.sqrt(1 - q * rnd())]);
  return out;
}
