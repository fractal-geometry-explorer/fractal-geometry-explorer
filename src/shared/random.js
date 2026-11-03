// Shared randomness and spectral synthesis: the site's one seedable PRNG, a Gaussian sampler, and
// the in-place radix-2 FFT. Every random figure names its seed, and the pages' copies of these
// functions were numerically identical, so a page moved onto this file draws the same pixels for
// the same seed.

// ---- mulberry32: a tiny seedable PRNG; returns a function giving uniforms in [0, 1) ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- standard Gaussians by Marsaglia's polar method, with the spare value cached ----
function gaussMaker(rnd) {
  let spare = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u, v, s;
    do { u = 2 * rnd() - 1; v = 2 * rnd() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const k = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * k;
    return u * k;
  };
}

// ---- FFT: iterative radix-2, in place, length a power of two ----
// The core works on a strided slice (i0, stride, n), so one function serves 1D rows, 2D columns
// and plain arrays. No scaling: an inverse pass returns n times the inverse transform.
function fftStride(re, im, i0, stride, n, inv) {
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const a = i0 + i * stride, b = i0 + j * stride;
      let t = re[a]; re[a] = re[b]; re[b] = t;
      t = im[a]; im[a] = im[b]; im[b] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i0 + (i + k) * stride, b = i0 + (i + k + half) * stride;
        const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi;
        re[a] += vr; im[a] += vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
// Whole-array transform; the inverse divides by n, so fft(re, im, true) undoes fft(re, im).
function fft(re, im, inv) {
  const n = re.length;
  fftStride(re, im, 0, 1, n, inv);
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
// 2D transform of an n×n grid stored row-major, rows then columns, unscaled either way.
function fft2(re, im, n, inv) {
  for (let r = 0; r < n; r++) fftStride(re, im, r * n, 1, n, inv);
  for (let c = 0; c < n; c++) fftStride(re, im, c, n, n, inv);
}
