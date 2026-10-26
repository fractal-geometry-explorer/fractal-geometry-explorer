// Chapter 28's machinery: seeded Gaussian noise, fractional Brown surfaces by spectral synthesis
// (the periodic shortcut the book itself uses for Plates 264-267, "cropped to keep to a central
// portion unaffected by periodicity"), great-circle faults on the sphere for Plate 269, the Hammer
// projection, contour tracing and simple surface statistics.

// ---- seeded randomness ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussMaker(rng) {
  let spare = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u, v, s;
    do { u = 2 * rng() - 1; v = 2 * rng() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const k = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * k;
    return u * k;
  };
}

// ---- FFT (iterative radix-2, in place) ----
function fft1(re, im, i0, stride, n, inv) {
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
function fft2(re, im, n, inv) {
  for (let r = 0; r < n; r++) fft1(re, im, r * n, 1, n, inv);
  for (let c = 0; c < n; c++) fft1(re, im, c, n, n, inv);
}

// ---- fractional Brown surface, period n, exponent H in (0, 1): surface D = 3 - H ----
// White complex Gaussian noise is filtered to spectral density ~ k^-(2H+2); the real part of the
// inverse transform is a periodic stationary Gaussian field with the fBm-like spectrum. The field
// is normalised to mean 0 and unit variance.
function fbmSurface(n, H, seed) {
  const rng = mulberry32((seed * 2654435761) >>> 0), g = gaussMaker(rng);
  const re = new Float64Array(n * n), im = new Float64Array(n * n);
  const e = -(H + 1);
  for (let j = 0; j < n; j++) {
    const ky = j <= n / 2 ? j : j - n;
    for (let i = 0; i < n; i++) {
      const kx = i <= n / 2 ? i : i - n, k2 = kx * kx + ky * ky;
      const a = k2 === 0 ? 0 : Math.pow(k2, e / 2);
      const o = j * n + i;
      re[o] = g() * a; im[o] = g() * a;
    }
  }
  fft2(re, im, n, true);
  let m = 0;
  for (let i = 0; i < re.length; i++) m += re[i];
  m /= re.length;
  let s = 0;
  for (let i = 0; i < re.length; i++) { re[i] -= m; s += re[i] * re[i]; }
  s = Math.sqrt(s / re.length) || 1;
  for (let i = 0; i < re.length; i++) re[i] /= s;
  return re;
}
// central w x h crop of an n-period field (keeps clear of the periodic seam)
function cropField(src, n, w, h) {
  const out = new Float64Array(w * h), i0 = (n - w) >> 1, j0 = (n - h) >> 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[j * w + i] = src[(j + j0) * n + i + i0];
  return out;
}
// bilinear upsample by factor u (smooth coastlines instead of grid stairs)
function upsample(src, w, h, u) {
  const W = (w - 1) * u + 1, Hh = (h - 1) * u + 1, out = new Float64Array(W * Hh);
  for (let j = 0; j < Hh; j++) {
    const y = j / u, j1 = Math.min(h - 2, Math.floor(y)), fy = y - j1;
    for (let i = 0; i < W; i++) {
      const x = i / u, i1 = Math.min(w - 2, Math.floor(x)), fx = x - i1;
      const o = j1 * w + i1;
      out[j * W + i] = src[o] * (1 - fx) * (1 - fy) + src[o + 1] * fx * (1 - fy) + src[o + w] * (1 - fx) * fy + src[o + w + 1] * fx * fy;
    }
  }
  return { data: out, w: W, h: Hh };
}
function quantile(arr, q) {
  const a = Array.from(arr).sort((x, y) => x - y);
  const t = q * (a.length - 1), i = Math.floor(t);
  return a[i] + (a[Math.min(a.length - 1, i + 1)] - a[i]) * (t - i);
}
// fraction of samples above the level
function landFraction(h, level) {
  let n = 0;
  for (let i = 0; i < h.length; i++) if (h[i] > level) n++;
  return n / h.length;
}
// connected components above the level (4-neighbour), ignoring specks under minCells
function islandCount(h, w, hgt, level, minCells = 3) {
  const seen = new Uint8Array(w * hgt), stack = [];
  let count = 0;
  for (let s = 0; s < w * hgt; s++) {
    if (seen[s] || h[s] <= level) continue;
    let cells = 0;
    stack.length = 0; stack.push(s); seen[s] = 1;
    while (stack.length) {
      const o = stack.pop(), x = o % w, y = (o - x) / w;
      cells++;
      if (x > 0 && !seen[o - 1] && h[o - 1] > level) { seen[o - 1] = 1; stack.push(o - 1); }
      if (x < w - 1 && !seen[o + 1] && h[o + 1] > level) { seen[o + 1] = 1; stack.push(o + 1); }
      if (y > 0 && !seen[o - w] && h[o - w] > level) { seen[o - w] = 1; stack.push(o - w); }
      if (y < hgt - 1 && !seen[o + w] && h[o + w] > level) { seen[o + w] = 1; stack.push(o + w); }
    }
    if (cells >= minCells) count++;
  }
  return count;
}
// marching squares: segments of the level line, in grid coordinates
function contourSegs(h, w, hgt, level) {
  const segs = [];
  const lerp = (a, b) => (level - a) / (b - a);
  for (let j = 0; j < hgt - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const o = j * w + i, a = h[o], b = h[o + 1], c = h[o + w + 1], d = h[o + w];
      let m = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (m === 0 || m === 15) continue;
      // edge points: top (a-b), right (b-c), bottom (d-c), left (a-d)
      const T = [i + lerp(a, b), j], R = [i + 1, j + lerp(b, c)], B = [i + lerp(d, c), j + 1], L = [i, j + lerp(a, d)];
      const put = (p, q) => segs.push([p[0], p[1], q[0], q[1]]);
      switch (m) {
        case 1: case 14: put(L, B); break;
        case 2: case 13: put(B, R); break;
        case 3: case 12: put(L, R); break;
        case 4: case 11: put(T, R); break;
        case 6: case 9: put(T, B); break;
        case 7: case 8: put(T, L); break;
        case 5: put(T, R); put(L, B); break;
        case 10: put(T, L); put(B, R); break;
      }
    }
  }
  return segs;
}

// ---- Plate 269: Levy's Brown function on the sphere, by great-circle faults ----
// Each fault is a random great circle; the relief steps up by a on one side and down on the other.
// The sum over a Poisson collection of faults, rescaled, converges to the sphere-to-line Brown
// function Bo(P) (the integral of white noise over the hemisphere centred at P).
function sphereFaults(nLat, nLon, nFaults, seed) {
  const rng = mulberry32((seed * 2654435761 + 7) >>> 0), g = gaussMaker(rng);
  const h = new Float64Array(nLat * nLon);
  const px = new Float64Array(nLat * nLon), py = new Float64Array(nLat * nLon), pz = new Float64Array(nLat * nLon);
  for (let j = 0; j < nLat; j++) {
    const lat = (-90 + (180 * j) / (nLat - 1)) * (Math.PI / 180), cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < nLon; i++) {
      const lon = (-180 + (360 * i) / (nLon - 1)) * (Math.PI / 180), o = j * nLon + i;
      px[o] = cl * Math.cos(lon); py[o] = cl * Math.sin(lon); pz[o] = sl;
    }
  }
  for (let f = 0; f < nFaults; f++) {
    let ux = g(), uy = g(), uz = g();
    const L = Math.hypot(ux, uy, uz) || 1;
    ux /= L; uy /= L; uz /= L;
    const s = rng() < 0.5 ? -1 : 1;
    for (let o = 0; o < h.length; o++) h[o] += px[o] * ux + py[o] * uy + pz[o] * uz > 0 ? s : -s;
  }
  let m = 0, sw = 0;
  for (let j = 0; j < nLat; j++) {
    const w = Math.cos((-90 + (180 * j) / (nLat - 1)) * (Math.PI / 180));
    for (let i = 0; i < nLon; i++) { m += h[j * nLon + i] * w; sw += w; }
  }
  m /= sw;
  let s2 = 0;
  for (let o = 0; o < h.length; o++) { h[o] -= m; s2 += h[o] * h[o]; }
  s2 = Math.sqrt(s2 / h.length) || 1;
  for (let o = 0; o < h.length; o++) h[o] /= s2;
  return h;
}
// the sea level that puts fraction q of the sphere's AREA under water (weights by cos latitude)
function sphereSeaLevel(h, nLat, nLon, q) {
  const vals = [], ws = [];
  for (let j = 0; j < nLat; j++) {
    const w = Math.cos((-90 + (180 * j) / (nLat - 1)) * (Math.PI / 180));
    for (let i = 0; i < nLon; i++) { vals.push(h[j * nLon + i]); ws.push(w); }
  }
  const idx = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
  const total = ws.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const i of idx) { acc += ws[i]; if (acc >= q * total) return vals[i]; }
  return vals[idx[idx.length - 1]];
}
// Hammer projection: lon, lat in radians -> x in [-2sqrt2, 2sqrt2], y in [-sqrt2, sqrt2]
function hammer(lon, lat) {
  const d = Math.sqrt(1 + Math.cos(lat) * Math.cos(lon / 2));
  return [(2 * Math.SQRT2 * Math.cos(lat) * Math.sin(lon / 2)) / d, (Math.SQRT2 * Math.sin(lat)) / d];
}
// inverse: null outside the ellipse
function hammerInv(x, y) {
  const z2 = 1 - (x * x) / 16 - (y * y) / 4;
  if (z2 < 0.5) return null;
  const z = Math.sqrt(z2);
  return [2 * Math.atan2(z * x, 2 * (2 * z2 - 1)), Math.asin(Math.max(-1, Math.min(1, z * y)))];
}
