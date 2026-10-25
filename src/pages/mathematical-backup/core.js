// Chapter 39 numerics. The chapter prints no figures, so everything here computes the entry's own
// formulas: fractional Gaussian noise by circulant embedding (Davies–Harte, exact covariance),
// Lévy stable densities by FFT inversion of the characteristic function (the book's equation (L)
// with (A:D)), ball coverings of the triadic sets, R/S statistics, and the Weierstrass sums.

// ---------- seeded randomness ----------
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussMaker(rand) {
  let spare = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u, v, s;
    do { u = 2 * rand() - 1; v = 2 * rand() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * m;
    return u * m;
  };
}

// ---------- FFT: iterative radix-2, in place, length a power of two ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

// ---------- fractional Gaussian noise, exact, by circulant embedding (Davies–Harte) ----------
// Returns n unit-variance increments of B_H at unit steps; cov(k) = (|k+1|^2H − 2|k|^2H + |k−1|^2H)/2.
function fgn(H, n, seed) {
  const m = 2 * n, g = Math.pow;
  const cov = (k) => 0.5 * (g(k + 1, 2 * H) - 2 * g(k, 2 * H) + g(Math.abs(k - 1), 2 * H));
  const re = new Float64Array(m), im = new Float64Array(m);
  for (let k = 0; k <= n; k++) re[k] = cov(k);
  for (let k = 1; k < n; k++) re[m - k] = re[k];
  fft(re, im);                                   // eigenvalues of the circulant (theoretically ≥ 0)
  const lam = re.map((v) => Math.max(0, v));
  const rnd = gaussMaker(mulberry(seed));
  const vr = new Float64Array(m), vi = new Float64Array(m);
  vr[0] = Math.sqrt(lam[0]) * rnd();
  vr[n] = Math.sqrt(lam[n]) * rnd();
  for (let j = 1; j < n; j++) {
    const s = Math.sqrt(lam[j] / 2), a = s * rnd(), b = s * rnd();
    vr[j] = a; vi[j] = b; vr[m - j] = a; vi[m - j] = -b;
  }
  fft(vr, vi);
  const out = new Float64Array(n), norm = 1 / Math.sqrt(m);
  for (let k = 0; k < n; k++) out[k] = vr[k] * norm;
  return out;
}
// B_H on [0,1] from its increments, scaled so that B(t+Δ) − B(t) has sd Δ^H: self-affine with exponent H
function fbmFromFgn(inc, H) {
  const n = inc.length, B = new Float64Array(n + 1), s = Math.pow(n, -H);
  for (let k = 0; k < n; k++) B[k + 1] = B[k] + inc[k] * s;
  return B;
}

// ---------- Lévy stable densities: invert the characteristic function with the FFT ----------
// Standard (S1) form: log φ(f) = −|f|^D [1 − iβ tan(πD/2) sgn f], and for D = 1 the tangent is
// replaced by −(2/π) ln|f|. The book's three closed forms come out exactly: D=2 (Gauss, variance 2),
// D=1, β=0 (Cauchy 1/π(1+x²)), D=1/2, β=1 (the Brown recurrence density (2π)^(−1/2) e^(−1/2x) x^(−3/2)).
function stableGrid(D, beta) {
  const N = 8192;
  const F = Math.max(60, Math.pow(Math.log(1e9), 1 / D));   // e^(−F^D) ≈ 1e−9: no truncation ringing
  const df = (2 * F) / N, dx = (2 * Math.PI) / (N * df);
  const re = new Float64Array(N), im = new Float64Array(N);
  const t2 = D === 1 ? 0 : Math.tan((Math.PI * D) / 2);
  for (let j = 0; j < N; j++) {
    const f = (j - N / 2) * df, af = Math.abs(f);
    if (af < 1e-12) { re[j] = (j % 2 ? -1 : 1); continue; }
    const mag = Math.exp(-Math.pow(af, D));
    const phase = D === 1 ? -beta * (2 / Math.PI) * Math.sign(f) * af * Math.log(af)
      : beta * t2 * Math.sign(f) * Math.pow(af, D);
    const sgn = j % 2 ? -1 : 1;                 // ×(−1)^j recentres the transform
    re[j] = sgn * mag * Math.cos(phase); im[j] = sgn * mag * Math.sin(phase);
  }
  fft(re, im);
  const p = new Float64Array(N), c = df / (2 * Math.PI);
  for (let k = 0; k < N; k++) p[k] = Math.max(0, (k % 2 ? -1 : 1) * c * re[k]);
  return { p, x0: (-N / 2) * dx, dx, N };
}
const stableAt = (G, x) => {
  const u = (x - G.x0) / G.dx, i = Math.floor(u);
  if (i < 0 || i >= G.N - 1) return 0;
  const f = u - i;
  return G.p[i] * (1 - f) + G.p[i + 1] * f;
};
// one sample of a symmetric stable variable (Chambers–Mallows–Stuck)
function stableSample(D, rand) {
  const th = Math.PI * (rand() - 0.5), E = -Math.log(1 - rand());
  if (D === 1) return Math.tan(th);
  return (Math.sin(D * th) / Math.pow(Math.cos(th), 1 / D)) * Math.pow(Math.cos((1 - D) * th) / E, (1 - D) / D);
}

// ---------- Γ(x) (Lanczos) and the d-dimensional unit ball volume γ(d) = Γ(1/2)^d / Γ(1 + d/2) ----------
function gammaFn(x) {
  const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x));
  x -= 1;
  let a = 0.99999999999980993;
  for (let i = 0; i < 8; i++) a += g[i] / (x + i + 1);
  const t = x + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}
const ballVol = (d) => Math.pow(Math.PI, d / 2) / gammaFn(1 + d / 2);

// ---------- the sets that get covered: triadic Koch curve, triadic Cantor dust, an interval ----------
function kochPoints(depth) {
  let P = [0, 0, 1, 0];
  for (let s = 0; s < depth; s++) {
    const out = new Float64Array((P.length / 2 - 1) * 4 * 2 + 2);
    let j = 0;
    const push = (x, y) => { out[j++] = x; out[j++] = y; };
    push(P[0], P[1]);
    for (let i = 0; i + 3 < P.length; i += 2) {
      const ax = P[i], ay = P[i + 1], bx = P[i + 2], by = P[i + 3];
      const dx = (bx - ax) / 3, dy = (by - ay) / 3;
      const px = ax + dx, py = ay + dy, qx = ax + 2 * dx, qy = ay + 2 * dy;
      const tx = px + dx / 2 - dy * (Math.sqrt(3) / 2), ty = py + dy / 2 + dx * (Math.sqrt(3) / 2);
      push(px, py); push(tx, ty); push(qx, qy); push(bx, by);
    }
    P = out;
  }
  return P instanceof Float64Array ? P : new Float64Array(P);
}
// the covering of stage n: one ball per stage-n piece — centre of the piece's box, radius reaching
// its farthest point (all pieces are congruent, so the radius is computed once)
function coverBalls(P, pieces) {
  const per = (P.length / 2 - 1) / pieces;        // points per piece (segments)
  const balls = new Float64Array(2 * pieces);
  let r = 0;
  for (let k = 0; k < pieces; k++) {
    const i0 = 2 * Math.round(k * per), i1 = 2 * Math.round((k + 1) * per);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = i0; i <= i1; i += 2) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    balls[2 * k] = cx; balls[2 * k + 1] = cy;
    if (k === 0) for (let i = i0; i <= i1; i += 2) r = Math.max(r, Math.hypot(P[i] - cx, P[i + 1] - cy));
  }
  return { balls, r };
}
// starts of the 2^n triadic Cantor pieces of length 3^−n
function cantorStarts(n) {
  let starts = [0], len = 1;
  for (let k = 0; k < n; k++) {
    const out = new Float64Array(starts.length * 2);
    let j = 0;
    for (const a of starts) { out[j++] = a; out[j++] = a + (2 * len) / 3; }
    starts = out; len /= 3;
  }
  return { starts, len };
}

// ---------- R/S: the self-rescaled self-adjusted range, pox-plotted over the lag d ----------
// Within a block of length d: R = range of the cumulative sum detrended by its own bridge,
// S = the block's standard deviation; Q = R/S. J is the slope of log Q against log d.
function rsBlocks(X, d) {
  const out = [];
  for (let s = 0; s + d <= X.length; s += d) {
    let sum = 0, sq = 0;
    for (let i = s; i < s + d; i++) { sum += X[i]; sq += X[i] * X[i]; }
    const mean = sum / d, S = Math.sqrt(Math.max(1e-300, sq / d - mean * mean));
    let acc = 0, mn = 0, mx = 0;
    for (let i = s; i < s + d; i++) {
      acc += X[i] - mean;                         // cumulative sum minus the bridge trend
      if (acc < mn) mn = acc;
      if (acc > mx) mx = acc;
    }
    out.push((mx - mn) / S);
  }
  return out;
}
function rsAnalysis(X, lags) {
  const pts = [];
  for (const d of lags) {
    const qs = rsBlocks(X, d).map((q) => Math.log10(Math.max(1e-12, q)));
    if (!qs.length) continue;
    pts.push({ d, qs, mean: qs.reduce((a, b) => a + b, 0) / qs.length });
  }
  // least squares through the means
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
  for (const p of pts) { const x = Math.log10(p.d); sx += x; sy += p.mean; sxx += x * x; sxy += x * p.mean; n++; }
  const J = (n * sxy - sx * sy) / (n * sxx - sx * sx), b0 = (sy - J * sx) / n;
  return { pts, J, b0 };
}

// ---------- Weierstrass sums (limits checked on the scan at 200 dpi, page 388–389) ----------
// W0(t) = (1−w²)^(−1/2) Σ_{n≥0} w^n exp(2πi b^n t), w = b^(−H) = b^(D−2).
// Modified: W1(t) − W1(0) = (1−w²)^(−1/2) Σ_{n=−∞}^{∞} w^n [exp(2πi b^n t) − 1].
// Real (cosine) parts, evaluated with the frequency cut fMax (terms above it are below a pixel):
function weierW0(t, b, w, fMax) {
  let s = 0, freq = 1, amp = 1;
  while (freq <= fMax && amp > 1e-6) { s += amp * Math.cos(2 * Math.PI * freq * t); freq *= b; amp *= w; }
  return s / Math.sqrt(1 - w * w);
}
function weierW1(t, b, w, fMax) {
  let s = 0, freq = 1, amp = 1;
  while (freq <= fMax && amp > 1e-6) { s += amp * (Math.cos(2 * Math.PI * freq * t) - 1); freq *= b; amp *= w; }
  freq = 1 / b; amp = 1 / w;                      // n < 0: converges, continuous and differentiable
  for (let n = 0; n < 240; n++) {
    const term = amp * (Math.cos(2 * Math.PI * freq * t) - 1);
    s += term;
    if (Math.abs(amp * freq) * 7 * Math.abs(t) < 1e-5) break;   // |cos(x)−1| ≤ x²/2 bound kicked in
    freq /= b; amp /= w;
  }
  return s / Math.sqrt(1 - w * w);
}
// Gauss randomized: each term × a complex Gaussian factor (zero mean, unit variance), drawn per n
function weierGaussFactors(seed, nMin, nMax) {
  const rnd = gaussMaker(mulberry(seed)), out = new Map();
  for (let n = nMin; n <= nMax; n++) out.set(n, [rnd() * Math.SQRT1_2, rnd() * Math.SQRT1_2]);
  return out;
}
function weierGauss(t, b, w, fMax, fac, nMin) {
  let s = 0;
  for (let n = nMin, freq = Math.pow(b, nMin), amp = Math.pow(w, nMin); freq <= fMax && n < nMin + 400; n++, freq *= b, amp *= w) {
    if (amp < 1e-6 && n > 0) break;
    const g = fac.get(n);
    if (!g) continue;
    const c = Math.cos(2 * Math.PI * freq * t) - 1, sn = Math.sin(2 * Math.PI * freq * t);
    s += amp * (g[0] * c - g[1] * sn);
  }
  return s / Math.sqrt(1 - w * w);
}
