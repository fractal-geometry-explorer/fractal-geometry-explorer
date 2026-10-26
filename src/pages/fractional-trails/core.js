// Fractional Brown fractals: a seeded Gaussian source, an FFT, exact fractional Gaussian noise by
// circulant embedding (Davies & Harte 1987), and the chapter's two measurements, Hurst's R/S and
// the spectrum. H is the Hurst exponent, fGn the yearly increments, fBm their running sum.

// ---- seeded Gaussians ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normals(seed, count) {
  const rnd = mulberry32(seed), out = new Float64Array(count);
  for (let i = 0; i < count; i += 2) {
    const r = Math.sqrt(-2 * Math.log(1 - rnd())), a = 2 * Math.PI * rnd();
    out[i] = r * Math.cos(a);
    if (i + 1 < count) out[i + 1] = r * Math.sin(a);
  }
  return out;
}

// ---- in-place radix-2 FFT (n a power of two) ----
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, ang = -2 * Math.PI / len;
    for (let k = 0; k < half; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
      for (let i = k; i < n; i += len) {
        const j = i + half, tr = re[j] * wr - im[j] * wi, ti = re[j] * wi + im[j] * wr;
        re[j] = re[i] - tr; im[j] = im[i] - ti; re[i] += tr; im[i] += ti;
      }
    }
  }
}

// ---- exact fGn: eigenvalues of the circulant embedding of the covariance ----
// cov(k) = ((k+1)^2H − 2 k^2H + |k−1|^2H)/2; the 2N eigenvalues are its Fourier transform.
const lamCache = new Map();
function fgnLambdas(N, H) {
  const key = N + '|' + H;
  if (lamCache.has(key)) return lamCache.get(key);
  const M = 2 * N, re = new Float64Array(M), im = new Float64Array(M), p = 2 * H;
  const g = (k) => (Math.pow(k + 1, p) - 2 * Math.pow(k, p) + Math.pow(Math.abs(k - 1), p)) / 2;
  for (let k = 0; k <= N; k++) re[k] = g(k);
  for (let k = N + 1; k < M; k++) re[k] = re[M - k];
  fft(re, im);
  for (let k = 0; k < M; k++) re[k] = Math.max(0, re[k]);   // clip rounding dust
  if (lamCache.size > 40) lamCache.clear();
  return lamCache.set(key, re).get(key);
}
// one draw of white Gaussians, reused across every H so the "seed" is the same as H moves
const drawCache = new Map();
function gaussDraw(seed, N) {
  const key = seed + '|' + N;
  if (!drawCache.has(key)) {
    if (drawCache.size > 12) drawCache.clear();
    drawCache.set(key, normals(seed, 2 * N));
  }
  return drawCache.get(key);
}
// N samples of fractional Gaussian noise: variance 1, covariance exact at every lag
function fgn(N, H, seed) {
  const M = 2 * N, lam = fgnLambdas(N, H), Z = gaussDraw(seed, N);
  const re = new Float64Array(M), im = new Float64Array(M);
  re[0] = Math.sqrt(lam[0] / M) * Z[0];
  re[N] = Math.sqrt(lam[N] / M) * Z[1];
  for (let k = 1; k < N; k++) {
    const w = Math.sqrt(lam[k] / (2 * M));
    re[k] = w * Z[2 * k]; im[k] = w * Z[2 * k + 1];
    re[M - k] = re[k]; im[M - k] = -im[k];
  }
  fft(re, im);
  return re.subarray(0, N);
}
function cumsum(X) {
  const B = new Float64Array(X.length + 1);
  for (let i = 0; i < X.length; i++) B[i + 1] = B[i] + X[i];
  return B;
}
// a trail: two independent fGn's cumulated, interleaved [x0,y0,x1,y1,...]
function trail(N, H, seed) {
  const X = cumsum(fgn(N, H, seed * 2 + 1)), Y = cumsum(fgn(N, H, seed * 2 + 2));
  const P = new Float64Array(2 * X.length);
  for (let i = 0; i < X.length; i++) { P[2 * i] = X[i]; P[2 * i + 1] = Y[i]; }
  return P;
}

// ---- Hurst's R/S: adjusted range over sample deviation, averaged over blocks of length d ----
function rsPoints(X, ds) {
  const out = [];
  for (const d of ds) {
    const nb = Math.floor(X.length / d);
    let sum = 0, used = 0;
    for (let b = 0; b < nb; b++) {
      const o = b * d;
      let mean = 0;
      for (let i = 0; i < d; i++) mean += X[o + i];
      mean /= d;
      let acc = 0, mx = 0, mn = 0, varr = 0;
      for (let i = 0; i < d; i++) {
        const dev = X[o + i] - mean;
        acc += dev; varr += dev * dev;
        if (acc > mx) mx = acc; if (acc < mn) mn = acc;
      }
      const S = Math.sqrt(varr / d);
      if (S > 1e-12) { sum += (mx - mn) / S; used++; }
    }
    if (used) out.push([d, sum / used]);
  }
  return out;
}
// ---- periodogram of X, averaged into log-spaced frequency bins ----
function spectrumPoints(X, bins = 26) {
  const n = X.length, re = Float64Array.from(X), im = new Float64Array(n);
  fft(re, im);
  const kMax = n / 2, out = [];
  let k0 = 1;
  for (let b = 0; b < bins; b++) {
    const k1 = Math.min(kMax, Math.max(k0 + 1, Math.round(Math.pow(kMax, (b + 1) / bins))));
    let s = 0, fs = 0, c = 0;
    for (let k = k0; k < k1; k++) { s += (re[k] * re[k] + im[k] * im[k]) / n; fs += k / n; c++; }
    if (c) out.push([fs / c, s / c]);
    k0 = k1;
    if (k0 >= kMax) break;
  }
  return out;
}
// least-squares slope of log10 y against log10 x
function logSlope(pts) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  const n = pts.length;
  for (const [x, y] of pts) { const lx = Math.log10(x), ly = Math.log10(Math.max(1e-12, y)); sx += lx; sy += ly; sxx += lx * lx; sxy += lx * ly; }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { slope, icept: (sy - slope * sx) / n };
}
