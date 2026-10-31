// Chapter 30: isotherms of a fractional Brown temperature field. Uses the spectral synthesis in
// pages/fractal-landscapes/fbm.js (loaded before this script).
'use strict';

const N_I = 512;
const HS = [
  { key: 'k', H: 1 / 3, btn: 'H = 1/3 Kolmogorov', name: 'Kolmogorov turbulence' },
  { key: 'b', H: 1 / 2, btn: 'H = 1/2 Burgers', name: 'Burgers turbulence' },
  { key: 'p', H: 2 / 3, btn: 'H = 2/3 persistent', name: 'the persistent flake of Plate 10 (surface D = 7/3)' },
];
const stI = { h: HS[0], level: 50, seed: 2, mode: 'coast' };
let fieldI = null, fieldKey = '';

function getField() {
  const k = `${stI.h.key}|${stI.seed}`;
  if (fieldKey !== k) { fieldI = fbm2d(N_I, stI.h.H, stI.seed); fieldKey = k; }
  return fieldI;
}

// show twelfths as the book's fractions: 1/3, 2/3, 5/3, 8/3, 3/4, 5/4 …
const fr3 = (x) => {
  const n = Math.round(x * 12), d = 12;
  for (const dd of [2, 3, 4, 6, 12]) if (n % (d / dd) === 0) return `${n / (d / dd)}/${dd}`.replace(/^(\d+)\/1$/, '$1');
  return x.toFixed(2);
};

// The isotherm's dimension, measured the way a coastline is: sample the field with a ruler of
// s grid steps and count the cells the isotherm crosses; the count scales like s^-D. (Covering
// the pixel-resolution curve with boxes instead underestimates D — see DECISIONS.md.)
function rulerCount(h, n, t0) {
  const xs = [], ys = [];
  for (const s of [1, 2, 4, 8, 16]) {
    const m = Math.floor(n / s);
    let cnt = 0;
    for (let y = 0; y < m - 1; y++)
      for (let x = 0; x < m - 1; x++) {
        const a = h[y * s * n + x * s] > t0;
        if ((h[y * s * n + (x + 1) * s] > t0) !== a || (h[(y + 1) * s * n + x * s] > t0) !== a) cnt++;
      }
    if (cnt > 8) { xs.push(Math.log(1 / s)); ys.push(Math.log(cnt)); }
  }
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
  return num / den;
}

function drawIso() {
  const f = figI;
  const h = getField();
  const t0 = quantile(h, stI.level / 100);
  const n = N_I;
  // boundary mask: a cell on the isotherm has a 4-neighbour across the level
  const mask = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = h[y * n + x] > t0;
      if ((x + 1 < n && (h[y * n + x + 1] > t0) !== a) || (y + 1 < n && (h[(y + 1) * n + x] > t0) !== a)) mask[y * n + x] = 1;
    }
  }
  const cv = drawIso.cv || (drawIso.cv = document.createElement('canvas'));
  cv.width = n; cv.height = n;
  const c2 = cv.getContext('2d'), img = c2.createImageData(n, n);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < h.length; i++) { lo = Math.min(lo, h[i]); hi = Math.max(hi, h[i]); }
  for (let i = 0; i < n * n; i++) {
    let r, g, b;
    if (stI.mode === 'map') {
      const t = (h[i] - lo) / (hi - lo || 1);
      // cool-to-warm temperature wash
      r = 70 + 175 * t; g = 95 + 60 * Math.sin(Math.PI * t); b = 230 - 185 * t;
      if (mask[i]) { r = 21; g = 21; b = 21; }
    } else {
      const above = h[i] > t0;
      r = g = b = above ? 222 : 236;
      if (above) { r = 223; g = 219; b = 206; }
      if (mask[i]) { r = 21; g = 21; b = 21; }
    }
    img.data[4 * i] = r; img.data[4 * i + 1] = g; img.data[4 * i + 2] = b; img.data[4 * i + 3] = 255;
  }
  c2.putImageData(img, 0, 0);
  const c = f.ctx;
  c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, 0, 0, f.w, f.h);
  const Db = rulerCount(h, n, t0);
  $('rIb').textContent = `D ≈ ${Db.toFixed(2)}`;
  return mask;
}

function drawLine() {
  const f = figL;
  const h = getField();
  const n = N_I;
  const t0 = quantile(h, stI.level / 100);
  const c = f.ctx;
  c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  c.fillStyle = PRINT.paper;
  c.fillRect(0, 0, f.w, f.h);
  // the first row of the planar field
  let lo = Infinity, hi = -Infinity;
  for (let x = 0; x < n; x++) { lo = Math.min(lo, h[x]); hi = Math.max(hi, h[x]); }
  const pad = 10, Y = (v) => f.h - pad - (v - lo) / (hi - lo || 1) * (f.h - 2 * pad - 14);
  // the level
  c.strokeStyle = PRINT.red; c.lineWidth = 1;
  c.setLineDash([5, 4]);
  c.beginPath(); c.moveTo(0, Y(t0)); c.lineTo(f.w, Y(t0)); c.stroke();
  c.setLineDash([]);
  // the record
  c.strokeStyle = PRINT.ink; c.lineWidth = 1.4; c.lineJoin = 'round';
  c.beginPath();
  for (let x = 0; x < n; x++) {
    const sx = x / (n - 1) * f.w;
    if (x) c.lineTo(sx, Y(h[x])); else c.moveTo(sx, Y(h[x]));
  }
  c.stroke();
  // crossings
  let crossings = 0;
  c.strokeStyle = PRINT.accent; c.lineWidth = 1.2;
  c.beginPath();
  for (let x = 1; x < n; x++) {
    if ((h[x - 1] > t0) !== (h[x] > t0)) {
      crossings++;
      const sx = x / (n - 1) * f.w;
      c.moveTo(sx, 2); c.lineTo(sx, 10);
    }
  }
  c.stroke();
  $('rLc').textContent = fmt(crossings);
}

const figI = figure($('cI'), () => { drawIso(); });
const figL = figure($('cL'), () => { drawLine(); });

function syncI() {
  const H = stI.h.H, Diso = 2 - H;
  $('capI').textContent = `H = ${fr3(H)} · isotherm D = ${fr3(Diso)}`;
  $('seedI').textContent = stI.seed;
  $('vI0').textContent = stI.level === 50 ? 'median' : `${stI.level}th percentile`;
  $('rIa').textContent = `D = ${fr3(Diso)}`;
  $('rIc').textContent = `D = ${fr3(3 - H)}`;
  $('rId').textContent = H === 0.5 ? '|ΔP|' : `|ΔP|^${fr3(2 * H)}`;
  $('dimI').textContent = `T is a fractional Brown function of (x, y, z), H = ${fr3(H)} · isosurface D = ${fr3(3 - H)} · its planar isotherms D = ${fr3(Diso)}`;
  $('capL').textContent = `H = ${fr3(H)}`;
  $('rLa').textContent = `D = ${fr3(2 - H)}`;
  $('rLb').textContent = `D = ${fr3(1 - H)}`;
  hMark(stI.h.key); mMark(stI.mode);
  drawIso(); drawLine();
}
const hMark = stepButtons($('hI'), HS.map((x) => x.key), (k) => HS.find((x) => x.key === k).btn, (k) => HS.find((x) => x.key === k).name,
  (k) => { stI.h = HS.find((x) => x.key === k); syncI(); });
const mMark = stepButtons($('mI'), ['coast', 'map'], (m) => (m === 'coast' ? 'the isotherm alone' : 'the whole field'), (m) => m,
  (m) => { stI.mode = m; syncI(); });
$('sI0').addEventListener('input', () => { stI.level = +$('sI0').value; syncI(); });
$('rollI').addEventListener('click', () => { stI.seed = (stI.seed % 9999) + 1; syncI(); });

syncI();
