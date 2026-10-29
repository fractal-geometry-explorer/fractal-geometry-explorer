// Chapter 2: the artificial fractal flakes (Plates 10–11) and Perrin's Brownian
// tracings (Plate 13). This file holds the computation: a 3D fractional Brown
// field by spectral synthesis, an orthographic raycaster for its isosurface, a
// coarsened-ruler count of the surface's dimension, and the Brownian-bridge
// refinement of Perrin's digitised tracings. Uses rng/gauss/fft from
// pages/fractal-landscapes/fbm.js.

// ---------- the 3D field ----------
// Periodic fractional Brown field on an n^3 grid (n a power of 2), rms 1.
// Spectral amplitude |k|^-(H + 3/2): density k^-(2H+3), increments ~ |dP|^H,
// isosurface dimension 3 - H. The Gaussian draws are consumed in a fixed order
// and k = 0 draws too, so one seed gives the *same* noise for every H: the
// flake deforms coherently as D moves, which is the book's "overall shapes
// being the same in all 3 cases" (an artifact of the Fourier approximation,
// as the caption of Plates 266-267 explains for the coastlines).
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
        const g1 = gauss(r), g2 = gauss(r);
        if (!k2) continue;
        const amp = Math.pow(k2, -(H + 1.5) / 2);
        const i = (z * n + y) * n + x;
        re[i] = g1 * amp; im[i] = g2 * amp;
      }
    }
  }
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

// the level above which a share q of the volume lies, by sorting a subsample
function levelOfShare(f, q) {
  const step = Math.max(1, Math.floor(f.length / 262144));
  const sub = [];
  for (let i = 0; i < f.length; i += step) sub.push(f[i]);
  sub.sort((a, b) => a - b);
  return sub[Math.max(0, Math.min(sub.length - 1, Math.round((1 - q) * (sub.length - 1))))];
}

// ---------- the raycaster ----------
// Orthographic view along z of the set f > L, lit like a photograph. First a
// per-column integer march on the binary mask, then a per-pixel trilinear
// refinement around the column hits, with the normal from the field's gradient.
function tri(f, n, x, y, z) {
  const xi = x | 0, yi = y | 0, zi = z | 0;
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const x1 = Math.min(n - 1, xi + 1), y1 = Math.min(n - 1, yi + 1), z1 = Math.min(n - 1, zi + 1);
  const i000 = (zi * n + yi) * n + xi, i001 = (zi * n + yi) * n + x1, i010 = (zi * n + y1) * n + xi, i011 = (zi * n + y1) * n + x1;
  const i100 = (z1 * n + yi) * n + xi, i101 = (z1 * n + yi) * n + x1, i110 = (z1 * n + y1) * n + xi, i111 = (z1 * n + y1) * n + x1;
  const a = f[i000] * (1 - fx) + f[i001] * fx, b = f[i010] * (1 - fx) + f[i011] * fx;
  const c = f[i100] * (1 - fx) + f[i101] * fx, d = f[i110] * (1 - fx) + f[i111] * fx;
  return (a * (1 - fy) + b * fy) * (1 - fz) + (c * (1 - fy) + d * fy) * fz;
}
// keep only the big connected pieces of the set f > L: the plates render one
// suspended flake with a few detached crumbs, not the whole periodic box
function flakeMask(f, n, L, minShare = 0.02) {
  const N = n * n * n;
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) mask[i] = f[i] > L ? 1 : 0;
  const lab = new Int32Array(N);
  const stack = new Int32Array(N);
  const sizes = [0];
  let nl = 0;
  for (let s = 0; s < N; s++) {
    if (!mask[s] || lab[s]) continue;
    nl++;
    let top = 0, size = 0;
    stack[top++] = s; lab[s] = nl;
    while (top) {
      const i = stack[--top];
      size++;
      const x = i % n, y = (i / n | 0) % n, z = i / (n * n) | 0;
      if (x > 0 && mask[i - 1] && !lab[i - 1]) { lab[i - 1] = nl; stack[top++] = i - 1; }
      if (x < n - 1 && mask[i + 1] && !lab[i + 1]) { lab[i + 1] = nl; stack[top++] = i + 1; }
      if (y > 0 && mask[i - n] && !lab[i - n]) { lab[i - n] = nl; stack[top++] = i - n; }
      if (y < n - 1 && mask[i + n] && !lab[i + n]) { lab[i + n] = nl; stack[top++] = i + n; }
      if (z > 0 && mask[i - n * n] && !lab[i - n * n]) { lab[i - n * n] = nl; stack[top++] = i - n * n; }
      if (z < n - 1 && mask[i + n * n] && !lab[i + n * n]) { lab[i + n * n] = nl; stack[top++] = i + n * n; }
    }
    sizes.push(size);
  }
  const biggest = Math.max(...sizes);
  const keep = sizes.map((s) => s >= biggest * minShare);
  for (let i = 0; i < N; i++) mask[i] = keep[lab[i]] ? 1 : 0;
  return mask;
}

function shadeAt(f, n, gx, gy, gz, lx, ly, lz, eps, amb) {
  const dx = tri(f, n, Math.min(n - 1, gx + eps), gy, gz) - tri(f, n, Math.max(0, gx - eps), gy, gz);
  const dy = tri(f, n, gx, Math.min(n - 1, gy + eps), gz) - tri(f, n, gx, Math.max(0, gy - eps), gz);
  const dz = tri(f, n, gx, gy, Math.min(n - 1, gz + eps)) - tri(f, n, gx, gy, Math.max(0, gz - eps));
  const g = Math.hypot(dx, dy, dz) || 1;
  // the outward normal is -grad f, so this is dot(normal, to_light)
  const lam = Math.max(0, (dx * lx + dy * ly + dz * lz) / g);
  return amb + (1 - amb) * lam;
}

function renderFlake(f, n, mask, L, px, img) {
  // img: ImageData px*px. Light from the upper left, slightly toward the viewer.
  // to_light points from the surface toward the lamp; the outward normal is
  // -grad f (f grows inward), so brightness = dot(grad f, -to_light)/|grad f|.
  const lx = 0.5, ly = 0.6, lz = 0.62;
  const data = img.data;
  // per-column first-hit depth (z marching away from the viewer at z = 0)
  const hit = new Int16Array(n * n).fill(-1);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    for (let z = 0; z < n; z++) if (mask[(z * n + y) * n + x]) { hit[y * n + x] = z; break; }
  }
  const inMask = (x, y, z) => mask[((Math.round(z) * n) + Math.round(y)) * n + Math.round(x)] === 1;
  const sc = (n - 1.002) / px;
  const amb = 0.18, eps = 0.9;
  for (let py = 0; py < px; py++) {
    const gy = py * sc;
    const yi = gy | 0, y1 = Math.min(n - 1, yi + 1);
    for (let pxx = 0; pxx < px; pxx++) {
      const gx = pxx * sc;
      const xi = gx | 0, x1 = Math.min(n - 1, xi + 1);
      // earliest hit among the four surrounding columns
      let z0 = 1e9;
      for (const h of [hit[yi * n + xi], hit[yi * n + x1], hit[y1 * n + xi], hit[y1 * n + x1]])
        if (h >= 0 && h < z0) z0 = h;
      const o = (py * px + pxx) * 4;
      let shade = -1, depth = 0;
      if (z0 < 1e9) {
        const zFrom = Math.max(0, z0 - 2);
        let prev = tri(f, n, gx, gy, zFrom) - L;
        let zAbove = prev > 0 ? zFrom : -1; // first sample above the level, as a fallback
        for (let zz = 1; zz < 2 * (n - zFrom); zz++) {
          const z = zFrom + zz * 0.5;
          const cur = tri(f, n, gx, gy, z) - L;
          if (cur > 0 && zAbove < 0) zAbove = z;
          if (prev <= 0 && cur > 0 && inMask(gx, gy, z)) {
            const t = prev / (prev - cur);
            const gz = z - 0.5 + 0.5 * t;
            shade = shadeAt(f, n, gx, gy, gz, lx, ly, lz, eps, amb);
            depth = gz / n;
            break;
          }
          prev = cur;
        }
        // the strict pass can miss at the surface's own pixels (the crossing
        // voxel rounds into a removed crumb, or the level is already exceeded
        // at zFrom); shade the first above-level sample instead of leaving a
        // paper-coloured speck inside the flake
        if (shade < 0 && zAbove >= 0) {
          shade = shadeAt(f, n, gx, gy, zAbove, lx, ly, lz, eps, amb);
          depth = zAbove / n;
        }
      }
      if (shade < 0) { data[o] = 236; data[o + 1] = 235; data[o + 2] = 230; data[o + 3] = 255; continue; }
      // the book's prints are hard: most of the flake near black, the lit
      // facets burning out to white. A steep gamma on the Lambert term gets
      // that look; depth dims the far crumbs a touch.
      const v = Math.round(12 + 243 * Math.pow(shade, 2.4) * (1 - 0.25 * depth));
      data[o] = v; data[o + 1] = v; data[o + 2] = Math.max(0, v - 3); data[o + 3] = 255;
    }
  }
  return img;
}

// coarsened-ruler count of the isosurface's box dimension: cells of side s
// whose corners straddle the level. Returns {D, counts}.
function surfaceDim(f, n, L) {
  const counts = [1, 2, 4].map((s) => {
    const m = Math.floor(n / s);
    let c = 0;
    for (let z = 0; z < m - 1; z++) for (let y = 0; y < m - 1; y++) for (let x = 0; x < m - 1; x++) {
      const v0 = f[((z * s) * n + y * s) * n + x * s] > L;
      let diff = false;
      for (let b = 1; b < 8 && !diff; b++) {
        const zz = z + (b >> 2 & 1), yy = y + (b >> 1 & 1), xx = x + (b & 1);
        if ((f[((zz * s) * n + yy * s) * n + xx * s] > L) !== v0) diff = true;
      }
      if (diff) c++;
    }
    return c;
  });
  return { D: Math.log(counts[0] / counts[2]) / Math.log(4), counts };
}

// ---------- Perrin's tracings ----------
// Brownian-bridge refinement: divide every 30-second interval into 2^m pieces,
// repeatedly displacing midpoints by an isotropic Gaussian of the bridge
// variance tau/4 * sigma2 per coordinate, where sigma2 is the mean square
// displacement per unit time measured from the digitised plate itself. Seeded
// per segment, so zooming or re-drawing never reshuffles the detail.
function refineSegment(ax, ay, bx, by, m, sigma2, r) {
  const pts = [ax, ay, bx, by];
  let cur = [ax, ay, bx, by];
  for (let d = 0; d < m; d++) {
    const tau = 1 / (1 << d);                 // interval length in units of 30 s
    const sd = Math.sqrt(sigma2 * tau / 4);
    const next = [];
    for (let i = 0; i + 3 < cur.length; i += 2) {
      const x0 = cur[i], y0 = cur[i + 1], x1 = cur[i + 2], y1 = cur[i + 3];
      next.push(x0, y0, (x0 + x1) / 2 + gauss(r) * sd, (y0 + y1) / 2 + gauss(r) * sd);
    }
    next.push(cur[cur.length - 2], cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

// mean square step and derived physics from the grid panel
function perrinStats(grid) {
  let s = 0;
  for (const [i, j] of grid.seg) {
    const dx = grid.pts[j][0] - grid.pts[i][0], dy = grid.pts[j][1] - grid.pts[i][1];
    s += dx * dx + dy * dy;
  }
  const msdCells = s / grid.seg.length;              // cells^2 per 30 s
  const cell = 3.2e-6;                               // the caption's 3.2 um
  const msd = msdCells * cell * cell;                // m^2 per 30 s
  const Dm = msd / (4 * 30);                         // m^2/s
  // Einstein-Smoluchowski: D = RT / (N_A * 6 pi eta a)
  const R = 8.314, T = 290, eta = 1.1e-3, a = 0.53e-6;
  const NA = R * T / (6 * Math.PI * eta * a * Dm);
  return { msdCells, Dm, NA };
}
