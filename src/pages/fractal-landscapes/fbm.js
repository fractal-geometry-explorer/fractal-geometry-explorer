// Fractional Brown fields by spectral synthesis — the "numerical Fourier methods" the caption of
// Plate C15 names. A seeded Gaussian spectrum with amplitude |k|^-(H+1) gives a periodic field
// whose increments scale like |ΔP|^H: an ordinary Brown field at H = 1/2, persistent above,
// antipersistent below. Shared by the landscape and isothermal-surface pages; a candidate for
// src/shared/ once a third page needs it.

// mulberry32: a tiny seedable PRNG, so that every figure can name its seed
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// in-place iterative radix-2 FFT on interleaved complex arrays
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// 2D inverse FFT of an n×n spectrum (rows then columns)
function ifft2(re, im, n) {
  const tr = new Float64Array(n), ti = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    const row = y * n;
    fft(re.subarray(row, row + n), im.subarray(row, row + n), true);
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { tr[y] = re[y * n + x]; ti[y] = im[y * n + x]; }
    fft(tr, ti, true);
    for (let y = 0; y < n; y++) { re[y * n + x] = tr[y]; im[y * n + x] = ti[y]; }
  }
}

// A periodic fractional Brown field on an n×n grid (n a power of 2), normalised to rms 1.
// H in (0, 1): the increment exponent. Returns a Float64Array of length n*n.
function fbm2d(n, H, seed) {
  const re = new Float64Array(n * n), im = new Float64Array(n * n), r = rng(seed);
  for (let y = 0; y < n; y++) {
    const ky = y <= n / 2 ? y : y - n;
    for (let x = 0; x < n; x++) {
      const kx = x <= n / 2 ? x : x - n;
      const k2 = kx * kx + ky * ky;
      if (!k2) continue;
      const amp = Math.pow(k2, -(H + 1) / 2);
      re[y * n + x] = gauss(r) * amp;
      im[y * n + x] = gauss(r) * amp;
    }
  }
  ifft2(re, im, n);                           // the real part is the field
  let m = 0, s = 0;
  for (let i = 0; i < re.length; i++) m += re[i];
  m /= re.length;
  for (let i = 0; i < re.length; i++) { re[i] -= m; s += re[i] * re[i]; }
  s = Math.sqrt(s / re.length) || 1;
  for (let i = 0; i < re.length; i++) re[i] /= s;
  return re;
}

// A periodic fractional Brown line-to-line function on n points, rms 1
function fbm1d(n, H, seed) {
  const re = new Float64Array(n), im = new Float64Array(n), r = rng(seed);
  for (let x = 1; x < n; x++) {
    const k = x <= n / 2 ? x : n - x;
    const amp = Math.pow(k, -(H + 0.5));
    re[x] = gauss(r) * amp; im[x] = gauss(r) * amp;
  }
  fft(re, im, true);
  let m = 0, s = 0;
  for (let i = 0; i < n; i++) m += re[i];
  m /= n;
  for (let i = 0; i < n; i++) { re[i] -= m; s += re[i] * re[i]; }
  s = Math.sqrt(s / n) || 1;
  for (let i = 0; i < n; i++) re[i] /= s;
  return re;
}

// the altitude quantile q of a field (q in [0,1]), by sorting a copy
function quantile(h, q) {
  const s = Float64Array.from(h).sort();
  return s[Math.max(0, Math.min(s.length - 1, Math.round(q * (s.length - 1))))];
}

// Plate C13's trick: keep D the same everywhere, but raise the altitude above the floor to a
// power. gamma = 3 carves smooth valleys (C9, C13 top); gamma < 1 makes mesas (C13 bottom).
function valleyPower(h, floor, gamma) {
  const out = new Float64Array(h.length);
  let top = 0;
  for (let i = 0; i < h.length; i++) top = Math.max(top, h[i] - floor);
  top = top || 1;
  for (let i = 0; i < h.length; i++) {
    const a = h[i] - floor;
    out[i] = a <= 0 ? a : top * Math.pow(a / top, gamma);
  }
  return out;
}
