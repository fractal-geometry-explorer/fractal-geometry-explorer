// Plate C7: the self-inverse patchwork. The generator (4 lines, 4 circles, adjacent circles
// tangent) and the 6 Γ-discs are enumerated through the group of reflections and inversions,
// and every image of a Γ-disc is drawn in its cloth colour with multiply blending — transparent
// cloth on a white scrim. Coordinates here are the PLATE's frame, which is the caption diagram
// turned 90°: lines x = ±B and y = ±1, with B = 0.7. See DECISIONS.md for the fit.
'use strict';

const PB = 0.7;                                     // the short half-side
const PR1 = 0.6;                                    // circles on the lines x = ±B
const PR2 = Math.sqrt(1 + PB * PB) - PR1;           // circles on the lines y = ±1: tangent chain
const PX0 = (1 + PB * PB + PR1 * PR1 - PR2 * PR2) / 2;
const PRG = Math.sqrt(PX0 * PX0 - PR1 * PR1);       // corner Γ-discs
const PXM = (1 - PB * PB - PR2 * PR2 + PR1 * PR1) / 2;
const PRM = Math.sqrt(PXM * PXM + PB * PB - PR1 * PR1); // medallion Γ-discs

// cloth colours sampled from the print: medallion red and green, corners blue/yellow/orange/pink
const CLOTH = ['#e03028', '#7fa42e', '#46a8dc', '#efc924', '#f09a28', '#e070b0'];
const GAMMA_DISCS = [
  [0, PXM, PRM, 0],                                 // red: the upper medallion disc
  [0, -PXM, PRM, 1],                                // green: the lower one
  [-PB, PX0, PRG, 2], [PB, PX0, PRG, 3],            // blue, yellow at the top corners
  [-PB, -PX0, PRG, 4], [PB, -PX0, PRG, 5],          // orange, pink at the bottom
];
const INV_CIRCLES = [[-PB, 0, PR1], [PB, 0, PR1], [0, -1, PR2], [0, 1, PR2]];

const pw = { mode: 'cloth', fine: 1, count: 0, minr: 0 };

// every image of the Γ-discs with radius above minr, within the given world rect (expanded)
function enumerate(minr, x0, x1, y0, y1) {
  const out = [];
  const seen = new Set();
  const q = [];
  const key = (x, y, r) => `${Math.round(x * 8192)},${Math.round(y * 8192)},${Math.round(r * 8192)}`;
  for (const [x, y, r, c] of GAMMA_DISCS) { seen.add(key(x, y, r)); q.push([x, y, r, c]); out.push([x, y, r, c]); }
  const bx0 = x0 - 1, bx1 = x1 + 1, by0 = y0 - 1, by1 = y1 + 1;
  let head = 0;
  while (head < q.length && out.length < 140000) {
    const [cx, cy, r, c] = q[head++];
    for (let t = 0; t < 8; t++) {
      let nx, ny, nr;
      if (t === 0) { nx = 2 * PB - cx; ny = cy; nr = r; }
      else if (t === 1) { nx = -2 * PB - cx; ny = cy; nr = r; }
      else if (t === 2) { nx = cx; ny = 2 - cy; nr = r; }
      else if (t === 3) { nx = cx; ny = -2 - cy; nr = r; }
      else {
        const [ax, ay, rho] = INV_CIRCLES[t - 4];
        const d2 = (cx - ax) * (cx - ax) + (cy - ay) * (cy - ay) - r * r;
        if (d2 <= 1e-12) continue;
        const k = rho * rho / d2;
        nx = ax + k * (cx - ax); ny = ay + k * (cy - ay); nr = k * r;
      }
      if (nr < minr || nx < bx0 || nx > bx1 || ny < by0 || ny > by1) continue;
      const kk = key(nx, ny, nr);
      if (seen.has(kk)) continue;
      seen.add(kk);
      q.push([nx, ny, nr, c]); out.push([nx, ny, nr, c]);
    }
  }
  return out;
}

function patchRender(f, v) {
  const c = f.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, f.canvas.width, f.canvas.height);
  const x0 = (0 - v.ox) / v.s, x1 = (f.w - v.ox) / v.s;
  const y1 = v.oy / v.s, y0 = (v.oy - f.h) / v.s;
  const minr = Math.max(0.0012, pw.fine / v.s);
  const discs = enumerate(minr, x0, x1, y0, y1);
  discs.sort((a, b) => b[2] - a[2]);
  toWorld(f, v);
  c.globalCompositeOperation = 'multiply';
  let batch = -1;
  for (const [dx, dy, dr, cl] of discs) {
    if (cl !== batch) { batch = cl; }
    c.fillStyle = CLOTH[cl];
    c.beginPath();
    c.arc(dx, dy, dr, 0, 6.2832);
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  if (pw.mode !== 'cloth') {
    c.lineWidth = 1.6 / (f.dpr * v.s);
    c.strokeStyle = '#15151599';
    for (const L of [-PB, PB]) { c.beginPath(); c.moveTo(L, y0 - 1); c.lineTo(L, y1 + 1); c.stroke(); }
    for (const L of [-1, 1]) { c.beginPath(); c.moveTo(x0 - 1, L); c.lineTo(x1 + 1, L); c.stroke(); }
    for (const [ax, ay, rho] of INV_CIRCLES) { c.beginPath(); c.arc(ax, ay, rho, 0, 6.2832); c.stroke(); }
    if (pw.mode === 'gamma') {
      c.lineWidth = 2.6 / (f.dpr * v.s);
      c.strokeStyle = '#151515';
      for (const [gx, gy, gr] of GAMMA_DISCS) { c.beginPath(); c.arc(gx, gy, gr, 0, 6.2832); c.stroke(); }
    }
  }
  toScreen(f);
  pw.count = discs.length;
  pw.minr = minr;
  $('r7a').textContent = fmt(discs.length);
  $('r7b').textContent = `r ≈ ${(minr).toFixed(4)}`;
  $('cP7s').textContent = `${fmt(discs.length)} discs of 6 cloths`;
}

// the plate's crop: centred on the red medallion disc, just over a half-period wide
const PLATE_VIEW = { x0: -1.09, x1: 1.09, y0: PXM - 1.09, y1: PXM + 1.09 };
const pz = zoomable('wP7', 'cP7', (f) => fitBox(f, PLATE_VIEW, 0.0), patchRender, { maxZoom: 60 });
pz.z.ground = '#fff';

const mode7 = stepButtons($('mode7'), ['cloth', 'frame', 'gamma'],
  (m) => ({ cloth: 'the cloth alone', frame: '+ lines and circles', gamma: '+ Γ-circles' }[m]), (m) => m,
  (m) => { pw.mode = m; mode7(m); pz.schedule(); });
const fine7 = stepButtons($('fine7'), [3, 1.5, 1, 0.5], (x) => `${x} px`, (x) => `discs down to ${x} px`,
  (x) => { pw.fine = x; fine7(x); $('v7fine').textContent = `discs down to ${x} px`; pz.schedule(); });
$('p7').addEventListener('click', () => { pw.mode = 'cloth'; mode7('cloth'); pz.refit(); });
$('p7g').addEventListener('click', () => { pw.mode = 'gamma'; mode7('gamma'); pz.refit(); });

mode7('cloth');
fine7(1);
