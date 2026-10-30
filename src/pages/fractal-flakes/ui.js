// Chapter 2 page wiring: the flake laboratory (Plates 10-11) and Perrin's
// tracings (Plate 13).

// ===================== Plates 10-11: the flakes =====================
const DS = [
  { key: 'a', H: 2 / 3, Htxt: '2/3', Dtxt: '7/3', btn: 'D = 7/3', name: 'Plate 10, surface dimension 7/3' },
  { key: 'b', H: 1 / 2, Htxt: '1/2', Dtxt: '5/2', btn: 'D = 5/2', name: 'Plate 11 top, surface dimension 5/2' },
  { key: 'c', H: 1 / 3, Htxt: '1/3', Dtxt: '8/3', btn: 'D = 8/3', name: 'Plate 11 bottom, surface dimension 8/3' },
];
const stF = { d: DS[0], q: 0.14, seed: 1906, shared: true };
const FR = { coarse: { n: 64, px: 224 }, full: { n: 128, px: 448 } };
const fieldCache = new Map();
function fieldFor(n, H, seedEff) {
  const key = n + '|' + H.toFixed(4) + '|' + seedEff;
  if (!fieldCache.has(key)) {
    if (fieldCache.size > 6) fieldCache.clear();
    fieldCache.set(key, fbm3d(n, H, seedEff));
  }
  return fieldCache.get(key);
}
const flakeImg = document.createElement('canvas');
let fullTimer = 0, dimTimer = 0;

function seedEffF() { return stF.shared ? stF.seed : stF.seed + 1000 * DS.indexOf(stF.d); }

function drawFlake(res) {
  const { n, px } = res;
  const f = fieldFor(n, stF.d.H, seedEffF());
  const L = levelOfShare(f, stF.q);
  const mask = flakeMask(f, n, L);
  flakeImg.width = px; flakeImg.height = px;
  const c2 = flakeImg.getContext('2d');
  c2.putImageData(renderFlake(f, n, mask, L, px, c2.createImageData(px, px)), 0, 0);
  zF.schedule();
  return { f, n, L };
}

const zF = zoomable('wF', 'cF', (f) => fitBox(f, { x0: 0, x1: 1, y0: -1, y1: 0 }, 0.0), (f, v) => {
  paper(f, PRINT.paper);
  const c = f.ctx;
  toWorld(f, v);
  c.imageSmoothingEnabled = true;
  c.drawImage(flakeImg, 0, 0, flakeImg.width, flakeImg.height, 0, -1, 1, 1);
  toScreen(f);
}, { maxZoom: 40 });

function syncFlake(quick) {
  $('capFt').textContent = `Surface D = ${stF.d.Dtxt}`;
  $('capF').textContent = `H = ${stF.d.Htxt} · ${stF.shared ? 'one seeded draw shared by all three plates' : 'its own draw'}`;
  $('seedF').textContent = String(stF.seed);
  $('vFq').textContent = Math.round(stF.q * 100) + '%';
  $('rFa').textContent = `H = ${stF.d.Htxt}`;
  $('rFb').textContent = `D = ${stF.d.Dtxt}`;
  $('rFd').textContent = `${Math.round(stF.q * 100)}% of the box`;
  dMark(stF.d.key);
  drawFlake(FR.coarse);
  $('rFc').textContent = '…';
  clearTimeout(fullTimer); clearTimeout(dimTimer);
  fullTimer = setTimeout(() => {
    const { f, n, L } = drawFlake(FR.full);
    dimTimer = setTimeout(() => {
      const m = surfaceDim(f, n, L);
      $('rFc').textContent = 'D ≈ ' + m.D.toFixed(2);
    }, 60);
  }, quick ? 420 : 40);
}
const dMark = stepButtons($('dF'), DS.map((x) => x.key), (k) => DS.find((x) => x.key === k).btn, (k) => DS.find((x) => x.key === k).name,
  (k) => { stF.d = DS.find((x) => x.key === k); syncFlake(); });
$('sFq').addEventListener('input', () => { stF.q = $('sFq').value / 100; syncFlake(true); });
$('kFs').addEventListener('change', () => { stF.shared = $('kFs').checked; syncFlake(); });
$('rollF').addEventListener('click', () => { stF.seed = (Math.random() * 10000) | 0; syncFlake(); });
function presetF(key) {
  stF.d = DS.find((x) => x.key === key); stF.q = 0.14; stF.seed = 1906; stF.shared = true;
  $('sFq').value = 14; $('kFs').checked = true;
  zF.refit(); syncFlake();
}
$('pF10').addEventListener('click', () => presetF('a'));
$('pF11a').addEventListener('click', () => presetF('b'));
$('pF11b').addEventListener('click', () => presetF('c'));

// ===================== Plate 13: Perrin's tracings =====================
// World coordinates in grid cells, y down (drawn with the shared y-up transform
// by negating y). The free panel sits above the gridded panel, as printed.
const CELL_PX = 93;                       // scan px per cell at 600 dpi
const TOPSC = 1 / CELL_PX;
const P13 = (() => {
  const t = PERRIN.top, g = PERRIN.grid;
  const topPts = t.pts.map(([x, y, r]) => [x * TOPSC, y * TOPSC, r * TOPSC]);
  const th = Math.max(...topPts.map((p) => p[1])) + 0.6;
  const gy0 = th + 1.2;                   // the grid panel starts below the free panel
  const gridPts = g.pts.map(([x, y, r]) => [x, y + gy0, r * TOPSC]);
  return { topPts, gridPts, gy0, th, gw: Math.max(...topPts.map((p) => p[0])), nx: g.nx, ny: g.ny };
})();
const stP = { m: 0, seed: 1909 };
const stats = perrinStats(PERRIN.grid);
const SIGMA2 = stats.msdCells / 2;        // per-coordinate mean square step, cells^2 per 30 s

function refinedPaths(pts, segs, m, seedBase) {
  const out = [];
  for (let s = 0; s < segs.length; s++) {
    const [i, j] = segs[s];
    const r = rng(seedBase + s * 7919);
    out.push(refineSegment(pts[i][0], pts[i][1], pts[j][0], pts[j][1], m, SIGMA2, r));
  }
  return out;
}
function pathLength(paths) {
  let L = 0;
  for (const p of paths) for (let i = 0; i + 3 < p.length; i += 2) L += Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
  return L;
}

const zP = zoomable('wP', 'cP', (f) => fitBox(f, { x0: -0.6, x1: P13.nx + 0.6, y0: -(P13.gy0 + P13.ny + 0.8), y1: 0.4 }, 0.01), (f, v) => {
  paper(f, PRINT.paper);
  const c = f.ctx;
  toWorld(f, v);
  const lwBase = 1 / v.s;                 // one screen px in world units
  // the 3.2 um grid
  c.strokeStyle = '#b9b7ae'; c.lineWidth = Math.min(0.05, 1.2 * lwBase);
  c.beginPath();
  for (let k = 0; k <= P13.nx; k++) { c.moveTo(k, -P13.gy0); c.lineTo(k, -(P13.gy0 + P13.ny)); }
  for (let k = 0; k <= P13.ny; k++) { c.moveTo(0, -(P13.gy0 + k)); c.lineTo(P13.nx, -(P13.gy0 + k)); }
  c.stroke();
  c.strokeStyle = PRINT.ink; c.lineWidth = Math.min(0.09, 2.2 * lwBase);
  c.strokeRect(0, -(P13.gy0 + P13.ny), P13.nx, P13.ny);
  // the tracings
  const draw = (pts, segs, faint) => {
    const paths = stP.m === 0
      ? segs.map(([i, j]) => [pts[i][0], pts[i][1], pts[j][0], pts[j][1]])
      : refinedPaths(pts, segs, stP.m, stP.seed);
    const p2 = new Path2D();
    for (const p of paths) {
      p2.moveTo(p[0], -p[1]);
      for (let i = 2; i < p.length; i += 2) p2.lineTo(p[i], -p[i + 1]);
    }
    c.strokeStyle = faint ? PRINT.gray : PRINT.ink;
    c.lineWidth = faint ? Math.min(0.025, 1.1 * lwBase) : Math.min(0.05, 1.6 * lwBase);
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke(p2);
    if (!faint) {
      const dots = new Path2D();
      for (const [x, y, r] of pts) {
        const rr = Math.max(Math.min(r, 0.14), 2 * lwBase);
        dots.moveTo(x + rr, -y); dots.arc(x, -y, rr, 0, Math.PI * 2);
      }
      c.fillStyle = PRINT.ink; c.fill(dots);
    }
  };
  draw(P13.topPts, PERRIN.top.seg, false);
  if (PERRIN.top.faint.length) draw(P13.topPts, PERRIN.top.faint, true);
  draw(P13.gridPts, PERRIN.grid.seg, false);
  toScreen(f);
}, { maxZoom: 200 });

const MP = [
  { key: 0, btn: 'as printed', name: 'A dot every 30 seconds, as printed' },
  { key: 2, btn: '4×', name: 'Four positions per interval' },
  { key: 4, btn: '16×', name: 'Sixteen positions per interval' },
  { key: 6, btn: '64×', name: 'Sixty-four positions per interval' },
];
function syncP() {
  mMark(stP.m);
  const base = refinedBase();
  const now = stP.m === 0 ? base
    : pathLength(refinedPaths(P13.topPts, PERRIN.top.seg, stP.m, stP.seed)) + pathLength(refinedPaths(P13.gridPts, PERRIN.grid.seg, stP.m, stP.seed));
  $('rPa').textContent = (now / base).toFixed(2) + '×';
  $('capP').textContent = stP.m === 0
    ? 'as printed: 700 positions, 848 intervals'
    : `every interval refilled ${1 << stP.m}× by a seeded Brownian bridge`;
  $('rPb').innerHTML = stats.msdCells.toFixed(2) + ' cells² <small>= ' + (stats.msdCells * 3.2 * 3.2).toFixed(1) + ' µm² / 30 s</small>';
  $('rPc').innerHTML = (stats.Dm * 1e12).toFixed(3) + ' µm²/s';
  $('rPd').innerHTML = (stats.NA / 1e23).toFixed(0) + ' × 10²³ <small>true: 6.02</small>';
  zP.schedule();
}
function refinedBase() {
  return pathLength(PERRIN.top.seg.map(([i, j]) => [P13.topPts[i][0], P13.topPts[i][1], P13.topPts[j][0], P13.topPts[j][1]]))
    + pathLength(PERRIN.grid.seg.map(([i, j]) => [P13.gridPts[i][0], P13.gridPts[i][1], P13.gridPts[j][0], P13.gridPts[j][1]]));
}
const mMark = stepButtons($('mP'), MP.map((x) => x.key), (k) => MP.find((x) => x.key === k).btn, (k) => MP.find((x) => x.key === k).name,
  (k) => { stP.m = k; syncP(); });
$('rollP').addEventListener('click', () => { stP.seed = (Math.random() * 10000) | 0; if (stP.m) syncP(); });
$('pP13').addEventListener('click', () => { stP.m = 0; zP.refit(); syncP(); });

// first paint
syncFlake();
syncP();
