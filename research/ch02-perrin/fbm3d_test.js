// Verify the 3D fractional Brown field: increment scaling and isosurface dimension.
// Run: node fbm3d_test.js  (concatenated with shared fns, per DECISIONS testing lesson)

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

// Periodic fractional Brown field on an n^3 grid, rms 1. Spectral amplitude
// |k|^-(H + 3/2), so the spectral density is k^-(2H+3) and increments scale as
// |dP|^H. The same seed gives the same Gaussian draws for every H, so the
// "overall shapes" stay the same as D varies (the book's approximation bias).
function fbm3d(n, H, seed) {
  const N = n * n * n;
  const re = new Float64Array(N), im = new Float64Array(N), r = rng(seed);
  for (let z = 0; z < n; z++) {
    const kz = z <= n / 2 ? z : z - n;
    for (let y = 0; y < n; y++) {
      const ky = y <= n / 2 ? y : y - n;
      for (let x = 0; x < n; x++) {
        const kx = x <= n / 2 ? x : x - n;
        const k2 = kx * kx + ky * ky + kz * kz;
        const g1 = gauss(r), g2 = gauss(r);     // draw even at k=0, to keep seeds aligned
        if (!k2) continue;
        const amp = Math.pow(k2, -(H + 1.5) / 2);
        const i = (z * n + y) * n + x;
        re[i] = g1 * amp; im[i] = g2 * amp;
      }
    }
  }
  // inverse FFT along x, then y, then z
  const tr = new Float64Array(n), ti = new Float64Array(n);
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) {
    const o = (z * n + y) * n;
    fft(re.subarray(o, o + n), im.subarray(o, o + n), true);
  }
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { const i = (z * n + y) * n + x; tr[y] = re[i]; ti[y] = im[i]; }
    fft(tr, ti, true);
    for (let y = 0; y < n; y++) { const i = (z * n + y) * n + x; re[i] = tr[y]; im[i] = ti[y]; }
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    for (let z = 0; z < n; z++) { const i = (z * n + y) * n + x; tr[z] = re[i]; ti[z] = im[i]; }
    fft(tr, ti, true);
    for (let z = 0; z < n; z++) { const i = (z * n + y) * n + x; re[i] = tr[z]; im[i] = ti[z]; }
  }
  let m = 0, s = 0;
  for (let i = 0; i < N; i++) m += re[i];
  m /= N;
  for (let i = 0; i < N; i++) { re[i] -= m; s += re[i] * re[i]; }
  s = Math.sqrt(s / N) || 1;
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = re[i] / s;
  return out;
}

const n = 64;
for (const H of [1 / 3, 1 / 2, 2 / 3]) {
  const t0 = Date.now();
  const f = fbm3d(n, H, 1982);
  const dt = Date.now() - t0;
  // increment scaling along x
  const lags = [1, 2, 4, 8, 16];
  const vs = lags.map((L) => {
    let s = 0, c = 0;
    for (let z = 0; z < n; z += 3) for (let y = 0; y < n; y += 3) for (let x = 0; x < n - L; x += 2) {
      const i = (z * n + y) * n + x;
      const d = f[i + L] - f[i];
      s += d * d; c++;
    }
    return s / c;
  });
  const slope = (Math.log(vs[3] / vs[0]) / Math.log(lags[3] / lags[0])) / 2;
  // isosurface dimension at level 0: count s-cells (coarsened rulers) with a sign change
  const counts = [1, 2, 4, 8].map((s) => {
    let c = 0;
    const m = Math.floor(n / s);
    for (let z = 0; z < m - 1; z++) for (let y = 0; y < m - 1; y++) for (let x = 0; x < m - 1; x++) {
      const v = (zz, yy, xx) => f[((z + zz) * s * n + (y + yy) * s) * n + (x + xx) * s];
      const a = v(0, 0, 0);
      let sign = false;
      for (const [zz, yy, xx] of [[0, 0, 1], [0, 1, 0], [1, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0], [1, 1, 1]])
        if ((v(zz, yy, xx) > 0) !== (a > 0)) { sign = true; break; }
      if (sign) c++;
    }
    return c;
  });
  const Dmeas = Math.log(counts[0] / counts[2]) / Math.log(4);
  console.log(`H=${H.toFixed(3)} synth ${dt}ms  increment slope H≈${slope.toFixed(3)}  isosurface D≈${Dmeas.toFixed(3)} (theory ${(3 - H).toFixed(3)})  counts ${counts}`);
}
