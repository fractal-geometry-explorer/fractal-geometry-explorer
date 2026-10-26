// Landscape renderers for Plates C9–C15: a painter's-algorithm height-field view in parallel
// projection with the base "rolled around a cylinder" and lit from 60° over the left, as the
// caption of Plate C11 describes; a zenith view for Plate C15; and the fault-built Brown planet
// of Plate C9. Everything draws into a plain 2D canvas.

// ---- colour ramps, matched by eye to the printed plates ----
const rampStops = (stops) => (t) => {
  t = Math.max(0, Math.min(1, t));
  const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};
// Times-Atlas-like land: valley green, tan, brown, bare rock, snow
const LAND = rampStops([[62, 112, 48], [120, 141, 58], [176, 148, 76], [146, 100, 60], [120, 84, 58], [150, 130, 118], [236, 238, 240]]);
// ochre foreground of Plate C9
const MOON = rampStops([[66, 30, 12], [140, 62, 18], [203, 106, 24], [238, 164, 36], [250, 218, 90]]);
// Plate C15's zenith palette: shelf blue up through cyan, violet, rose, white ridges
const ZEN = rampStops([[72, 118, 214], [96, 170, 224], [140, 206, 224], [182, 160, 210], [212, 120, 160], [232, 170, 120], [245, 240, 235]]);
const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

// ---- the perspective view (Plates C11, C13, and the hill of C9) ----
// h: n×n field (row 0 far), already in display units. opts:
//   sea: altitude of the flat reference level (null: none) · zs: vertical scale in fractions of height
//   ramp: altitude→colour · snow: altitude above which rock turns white (null: none)
//   sky: [top,bottom] colours or null for black · light: azimuthal direction, default upper left
function heightField(ctx, W, H, h, n, opts) {
  const sea = opts.sea, ramp = opts.ramp || LAND;
  const lo = opts.lo, hi = opts.hi;                         // altitude range for colouring
  const span = hi - lo || 1;
  const zs = (opts.zs || 0.3) * H / span;                   // relief as a fraction of the canvas
  // sky ('none': the caller has already painted the background)
  if (opts.sky !== 'none') {
    if (opts.sky) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, opts.sky[0]); g.addColorStop(1, opts.sky[1]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }
  // parallel projection with a cylindrical droop toward the horizon
  const y0 = opts.horizon !== undefined ? opts.horizon * H : 0.30 * H;
  const rows = opts.rows || n, cols = n;
  const yAt = (i, alt) => {
    const t = i / (rows - 1);                               // 0 far → 1 near
    const base = y0 + Math.pow(t, 1.35) * (H - y0) * 0.92;  // the roll: far rows bunch at the horizon
    return base - alt * zs * (0.35 + 0.65 * t);             // far relief is shortened by the roll
  };
  const xAt = (j) => (j / (cols - 1)) * W;
  const L = opts.light || [-0.74, -0.42, 0.52];             // 60° over the left
  const Ln = Math.hypot(L[0], L[1], L[2]);
  const px = W / cols;
  for (let i = 0; i < rows - 1; i++) {
    const r0 = i * n, r1 = (i + 1) * n;
    for (let j = 0; j < cols - 1; j++) {
      let a = h[r0 + j], b = h[r0 + j + 1], c = h[r1 + j + 1], d = h[r1 + j];
      const wet = sea !== null && a <= sea && b <= sea && c <= sea && d <= sea;
      const depth = wet ? sea - (a + b + c + d) / 4 : 0;
      if (sea !== null) { a = Math.max(a, sea); b = Math.max(b, sea); c = Math.max(c, sea); d = Math.max(d, sea); }
      const alt = (a + b + c + d) / 4;
      // normal from the cell's two gradients (grid steps are 1)
      const gx = (b + c - a - d) / 2, gy = (c + d - a - b) / 2;
      const gs = zs / px * 0.9;
      const nx = -gx * gs, ny = -gy * gs;
      const inv = 1 / Math.hypot(nx, ny, 1);
      let lam = Math.max(0, (nx * L[0] + ny * L[1] + L[2]) * inv / Ln);
      let col;
      if (wet) {
        const t = Math.min(1, depth / (0.25 * span));
        col = [70 - 25 * t, 130 - 40 * t, 205 - 35 * t];
      } else {
        const t = (alt - lo) / span;
        col = ramp(opts.snow !== null && alt > opts.snow ? 1 : t * 0.86);
        const li = 0.34 + 0.78 * lam;
        col = [col[0] * li, col[1] * li, col[2] * li];
      }
      ctx.fillStyle = rgb(col);
      const x0 = xAt(j) - 0.35, x1 = xAt(j + 1) + 0.35;
      const ya = yAt(i, a), yb = yAt(i, b), yc = yAt(i + 1, c), yd = yAt(i + 1, d);
      ctx.beginPath();
      ctx.moveTo(x0, ya - 0.35); ctx.lineTo(x1, yb - 0.35); ctx.lineTo(x1, yc + 0.35); ctx.lineTo(x0, yd + 0.35);
      ctx.fill();
    }
  }
  // the front face: from the nearest row's surface down to the bottom edge, in shadowed ground
  ctx.fillStyle = opts.face || '#17110b';
  ctx.beginPath();
  ctx.moveTo(0, H + 2);
  const iN = rows - 1;
  for (let j = 0; j < cols; j++) {
    let a = h[iN * n + j];
    if (sea !== null) a = Math.max(a, sea);
    ctx.lineTo(xAt(j), yAt(iN, a) + 0.5);
  }
  ctx.lineTo(W, H + 2);
  ctx.closePath();
  ctx.fill();
}

// ---- the zenith view (Plate C15) ----
// draws an n×n shaded relief into an offscreen canvas and returns it
function zenithView(h, n, sea, span) {
  const cv = document.createElement('canvas');
  cv.width = n; cv.height = n;
  const c2 = cv.getContext('2d'), img = c2.createImageData(n, n);
  const L = [-0.62, -0.62, 0.48], Ln = Math.hypot(L[0], L[1], L[2]);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x, a = h[i];
      let col;
      if (a <= sea) {
        const t = Math.min(1, (sea - a) / (0.6 * span));
        col = [58 + 20 * (1 - t), 92 + 36 * (1 - t), 196 + 18 * (1 - t)];
      } else {
        const gx = (h[y * n + Math.min(n - 1, x + 1)] - h[y * n + Math.max(0, x - 1)]) / 2;
        const gy = (h[Math.min(n - 1, y + 1) * n + x] - h[Math.max(0, y - 1) * n + x]) / 2;
        const gs = 34 / span;
        const nx = -gx * gs, ny = -gy * gs, inv = 1 / Math.hypot(nx, ny, 1);
        const lam = Math.max(0, (nx * L[0] + ny * L[1] + L[2]) * inv / Ln);
        col = ZEN(Math.pow((a - sea) / (0.9 * span), 0.75));
        const li = 0.42 + 0.72 * lam;
        col = [col[0] * li, col[1] * li, col[2] * li];
      }
      img.data[4 * i] = col[0]; img.data[4 * i + 1] = col[1]; img.data[4 * i + 2] = col[2]; img.data[4 * i + 3] = 255;
    }
  }
  c2.putImageData(img, 0, 0);
  return cv;
}

// ---- the Brown planet of Plate C9 ----
// Brown relief on the sphere from random great-circle faults (the model of Chapter 28): each
// fault lifts one hemisphere by a small step. Returns a lat-long height grid.
function sphereFaults(nu, nv, faults, seed) {
  const h = new Float64Array(nu * nv), r = rng(seed);
  const ux = new Float64Array(faults), uy = new Float64Array(faults), uz = new Float64Array(faults), sg = new Float64Array(faults);
  for (let k = 0; k < faults; k++) {
    const z = 2 * r() - 1, ph = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z);
    ux[k] = s * Math.cos(ph); uy[k] = s * Math.sin(ph); uz[k] = z; sg[k] = r() < 0.5 ? -1 : 1;
  }
  for (let v = 0; v < nv; v++) {
    const th = (v + 0.5) / nv * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let u = 0; u < nu; u++) {
      const ph = u / nu * 2 * Math.PI, px = st * Math.cos(ph), py = st * Math.sin(ph), pz = ct;
      let s = 0;
      for (let k = 0; k < faults; k++) s += (ux[k] * px + uy[k] * py + uz[k] * pz) > 0 ? sg[k] : -sg[k];
      h[v * nu + u] = s;
    }
  }
  return h;
}

// the planet as an orthographic globe with the given sea quantile, on its own canvas
// (putImageData would overwrite the sky, so the caller drawImages the result)
function planetView(R, grid, nu, nv, seaQ) {
  const sea = quantile(grid, seaQ);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < grid.length; i++) { lo = Math.min(lo, grid[i]); hi = Math.max(hi, grid[i]); }
  const span = hi - sea || 1;
  const D = Math.ceil(2 * R), cv = document.createElement('canvas');
  cv.width = D; cv.height = D;
  const c2 = cv.getContext('2d'), img = c2.createImageData(D, D);
  for (let y = 0; y < D; y++) {
    for (let x = 0; x < D; x++) {
      const sx = (x - R) / R, sy = (y - R) / R, r2 = sx * sx + sy * sy;
      if (r2 > 1) continue;
      const sz = Math.sqrt(1 - r2);
      // tilt the globe a little toward the viewer
      const t = 0.45, py = sy * Math.cos(t) - sz * Math.sin(t), pz = sy * Math.sin(t) + sz * Math.cos(t);
      const th = Math.acos(Math.max(-1, Math.min(1, -py)));
      const ph = Math.atan2(pz, sx);
      // bilinear sample of the lat-long grid
      const fu = ((ph / (2 * Math.PI) + 1) * nu) % nu, fv = Math.min(nv - 1.001, Math.max(0, th / Math.PI * nv - 0.5));
      const u0 = fu | 0, v0 = fv | 0, du = fu - u0, dv = fv - v0;
      const u1 = (u0 + 1) % nu, v1 = Math.min(nv - 1, v0 + 1);
      const a = grid[v0 * nu + u0] * (1 - du) * (1 - dv) + grid[v0 * nu + u1] * du * (1 - dv)
              + grid[v1 * nu + u0] * (1 - du) * dv + grid[v1 * nu + u1] * du * dv;
      let col;
      if (a <= sea) {
        const d = Math.min(1, (sea - a) / (1.2 * span));
        col = [40 + 30 * (1 - d), 70 + 60 * (1 - d), 160 + 70 * (1 - d)];
      } else {
        const tt = (a - sea) / span;
        col = tt > 0.78 ? [242, 238, 230] : tt > 0.5 ? [196, 160, 110] : [74 + 60 * tt, 142 + 30 * tt, 64 + 30 * tt];
      }
      // limb shading, lit from the upper right
      const lam = Math.max(0.12, 0.35 + 0.65 * Math.max(0, (sx * 0.5 + -sy * 0.42 + sz * 0.75)));
      img.data[4 * (y * D + x)] = col[0] * lam;
      img.data[4 * (y * D + x) + 1] = col[1] * lam;
      img.data[4 * (y * D + x) + 2] = col[2] * lam;
      img.data[4 * (y * D + x) + 3] = 255;
    }
  }
  c2.putImageData(img, 0, 0);
  return cv;
}
