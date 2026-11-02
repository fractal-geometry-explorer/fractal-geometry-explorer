// Fractional Brown fields by spectral synthesis — the "numerical Fourier methods" the caption of
// Plate C15 names. A seeded Gaussian spectrum with amplitude |k|^-(H+1) gives a periodic field
// whose increments scale like |ΔP|^H: an ordinary Brown field at H = 1/2, persistent above,
// antipersistent below. Shared by the landscape, flake and isothermal-surface pages; mulberry32
// and the FFT come from shared/random.js.
function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
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
  const re = new Float64Array(n * n), im = new Float64Array(n * n), r = mulberry32(seed);
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
  const re = new Float64Array(n), im = new Float64Array(n), r = mulberry32(seed);
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
