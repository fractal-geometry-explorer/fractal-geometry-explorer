// Wiring for the four landscape sections. Each figure resynthesises its field from (H, seed)
// and redraws; heavy redraws run coarse-first in the rhythm of DECISIONS.md's "heavy sliders".
'use strict';

const GRID = 256;
const fieldCache = new Map();
function field(n, H, seed) {
  const k = `${n}|${H.toFixed(3)}|${seed}`;
  if (!fieldCache.has(k)) {
    if (fieldCache.size > 14) fieldCache.delete(fieldCache.keys().next().value);
    fieldCache.set(k, fbm2d(n, H, seed));
  }
  return fieldCache.get(k);
}
function range(h) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < h.length; i++) { lo = Math.min(lo, h[i]); hi = Math.max(hi, h[i]); }
  return [lo, hi];
}
// downsample an n×n field by 2 for the coarse pass
function half(h, n) {
  const m = n >> 1, out = new Float64Array(m * m);
  for (let y = 0; y < m; y++) for (let x = 0; x < m; x++)
    out[y * m + x] = (h[2 * y * n + 2 * x] + h[2 * y * n + 2 * x + 1] + h[(2 * y + 1) * n + 2 * x] + h[(2 * y + 1) * n + 2 * x + 1]) / 4;
  return out;
}
// debounced two-pass redraw helper
function twoPass(fig, drawAt) {
  let t = 0;
  return () => {
    drawAt(fig, true);
    clearTimeout(t);
    t = setTimeout(() => drawAt(fig, false), 170);
  };
}

/* ===================== C11: Gaussian hills ===================== */
const st11 = { D: 2.5, z: 1, sea: 30, seed: 5 };
function draw11(f, coarse) {
  const H = 3 - st11.D;
  let h = field(GRID, H, st11.seed), n = GRID;
  if (coarse) { h = half(h, n); n >>= 1; }
  const [lo, hi] = range(h);
  const sea = quantile(h, st11.sea / 100);
  const c = f.ctx;
  c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  heightField(c, f.w, f.h, h, n, {
    sea: st11.sea > 0 ? sea : null, zs: 0.55 * st11.z, lo, hi, ramp: LAND,
    snow: lo + (hi - lo) * 0.78, sky: ['#2233bb', '#3a55d4'], horizon: 0.34,
  });
}
const f11 = figure($('c11c'), () => red11());
const red11 = twoPass(f11, draw11);
function sync11() {
  const H = 3 - st11.D;
  $('v11D').textContent = `D = ${st11.D.toFixed(2)}`;
  $('v11z').textContent = st11.z.toFixed(2).replace(/0$/, '');
  $('v11sea').textContent = `${st11.sea}%`;
  $('cap11').textContent = `H = ${H.toFixed(2)}, D = ${st11.D.toFixed(2)}`;
  $('seed11').textContent = st11.seed;
  $('r11a').textContent = `D = ${st11.D.toFixed(2)}`;
  $('r11b').textContent = `D = ${(2 - H).toFixed(2)}`;
  $('r11c').textContent = st11.seed;
  $('s11D').value = st11.D; $('s11z').value = st11.z; $('s11sea').value = st11.sea;
  red11();
}
$('s11D').addEventListener('input', () => { st11.D = +$('s11D').value; sync11(); });
$('s11z').addEventListener('input', () => { st11.z = +$('s11z').value; sync11(); });
$('s11sea').addEventListener('input', () => { st11.sea = +$('s11sea').value; sync11(); });
$('roll11').addEventListener('click', () => { st11.seed = (st11.seed % 9999) + 1; sync11(); });
$('p11').addEventListener('click', () => { Object.assign(st11, { D: 2.5, z: 1, sea: 30, seed: PLATE_SEEDS.c11 }); sync11(); });

/* ===================== C13: valleys fixed ===================== */
const st13 = { D: 2.5, g: 3, seed: 7 };
function draw13(f, coarse) {
  const H = 3 - st13.D;
  let h0 = field(GRID, H, st13.seed), n = GRID;
  if (coarse) { h0 = half(h0, n); n >>= 1; }
  const floor = quantile(h0, 0.02);
  const h = valleyPower(h0, floor, st13.g);
  const [lo, hi] = range(h);
  const sea = lo + (hi - lo) * (st13.g < 1 ? 0.14 : 0.045);
  const c = f.ctx;
  c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  heightField(c, f.w, f.h, h, n, {
    sea, zs: st13.g < 1 ? 0.34 : 0.5, lo, hi,
    ramp: st13.g < 1 ? MOON : LAND,
    snow: st13.g < 1 ? null : lo + (hi - lo) * 0.8,
    sky: ['#2233bb', '#3a55d4'], horizon: 0.3,
  });
}
const f13 = figure($('c13c'), () => red13());
const red13 = twoPass(f13, draw13);
function sync13() {
  $('v13g').textContent = `γ = ${st13.g.toFixed(2)}`;
  $('v13D').textContent = `D = ${st13.D.toFixed(2)}`;
  $('cap13t').textContent = st13.g > 1.02 ? 'Smooth valleys' : st13.g < 0.98 ? 'Mesa and canyon' : 'Gaussian relief';
  $('cap13').textContent = `γ = ${st13.g.toFixed(2)}`;
  $('seed13').textContent = st13.seed;
  $('r13a').textContent = st13.g.toFixed(2);
  $('r13b').textContent = `D = ${st13.D.toFixed(2)}`;
  $('r13c').textContent = st13.seed;
  $('s13g').value = st13.g; $('s13D').value = st13.D;
  red13();
}
$('s13g').addEventListener('input', () => { st13.g = +$('s13g').value; sync13(); });
$('s13D').addEventListener('input', () => { st13.D = +$('s13D').value; sync13(); });
$('roll13').addEventListener('click', () => { st13.seed = (st13.seed % 9999) + 1; sync13(); });
$('p13a').addEventListener('click', () => { Object.assign(st13, { D: 2.5, g: 3, seed: PLATE_SEEDS.c13top }); sync13(); });
$('p13b').addEventListener('click', () => { Object.assign(st13, { D: 2.5, g: 0.35, seed: PLATE_SEEDS.c13bot }); sync13(); });

/* ===================== C15: islands from the zenith ===================== */
const st15 = { sea: 75, seed: 11 };
function recentre(h, n) {
  // put the maximum mid-frame, using the field's periodicity
  let bi = 0;
  for (let i = 1; i < h.length; i++) if (h[i] > h[bi]) bi = i;
  const my = (bi / n) | 0, mx = bi % n, out = new Float64Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
    out[y * n + x] = h[((y + my - (n >> 1) + n) % n) * n + ((x + mx - (n >> 1) + n) % n)];
  return out;
}
function draw15(cv, Hexp) {
  const f = cv.fig;
  const h = recentre(field(GRID, Hexp, st15.seed), GRID);
  const [lo, hi] = range(h);
  const sea = quantile(h, st15.sea / 100);
  const img = zenithView(h, GRID, sea, hi - lo);
  const c = f.ctx;
  c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  c.imageSmoothingEnabled = true;
  c.drawImage(img, 0, 0, f.w, f.h);
}
const f15a = figure($('c15a'), () => draw15({ fig: f15a }, 0.5));
const f15b = figure($('c15b'), () => draw15({ fig: f15b }, 0.8));
function sync15() {
  $('v15sea').textContent = `${st15.sea}%`;
  $('seed15').textContent = `${st15.seed} / ${st15.seed}`;
  $('r15c').textContent = st15.seed;
  $('s15sea').value = st15.sea;
  draw15({ fig: f15a }, 0.5); draw15({ fig: f15b }, 0.8);
}
$('s15sea').addEventListener('input', () => { st15.sea = +$('s15sea').value; sync15(); });
$('roll15').addEventListener('click', () => { st15.seed = (st15.seed % 9999) + 1; sync15(); });
$('p15').addEventListener('click', () => { Object.assign(st15, { sea: 75, seed: PLATE_SEEDS.c15 }); sync15(); });

/* ===================== C9: planetrise ===================== */
const st9 = { faults: 800, sea: 55, seedP: 3, seedH: 5 };
let planetCache = null;
function draw9(f, coarse) {
  if (f.w < 10 || f.h < 10) return;          // the figure has not been laid out yet
  const c = f.ctx;
  c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  c.fillStyle = '#050507';
  c.fillRect(0, 0, f.w, f.h);
  // the planet: cached per (seed, faults, sea, size)
  const R = Math.round(f.w * 0.33);
  const key = `${st9.seedP}|${st9.faults}|${st9.sea}|${R}`;
  if (!planetCache || planetCache.key !== key) {
    const grid = sphereFaults(192, 96, st9.faults, st9.seedP);
    planetCache = { key, cv: planetView(R, grid, 192, 96, st9.sea / 100) };
  }
  c.drawImage(planetCache.cv, f.w * 0.33 - R, f.h * 0.40 - R);
  // Labelgraph Hill across the foreground: a cubed Brown relief strip
  let n = GRID, h0 = field(GRID, 0.5, st9.seedH);
  if (coarse) { h0 = half(h0, n); n >>= 1; }
  const floor = quantile(h0, 0.02);
  const hp = valleyPower(h0, floor, 3);
  const [lo, hi] = range(hp);
  heightField(c, f.w, f.h, hp, n, {
    sea: null, zs: 0.30, lo, hi, ramp: MOON, snow: null,
    sky: 'none', horizon: 0.58, light: [-0.9, -0.2, 0.37],
  });
}
const f9 = figure($('c9c'), () => red9());
const red9 = twoPass(f9, draw9);
function sync9() {
  $('v9f').textContent = st9.faults;
  $('v9sea').textContent = `${st9.sea}%`;
  $('cap9f').textContent = st9.faults;
  $('seed9').textContent = `${st9.seedP} / ${st9.seedH}`;
  $('r9a').textContent = st9.faults;
  $('r9b').textContent = `${st9.seedP} / ${st9.seedH}`;
  $('s9f').value = st9.faults; $('s9sea').value = st9.sea;
  red9();
}
$('s9f').addEventListener('input', () => { st9.faults = +$('s9f').value; sync9(); });
$('s9sea').addEventListener('input', () => { st9.sea = +$('s9sea').value; sync9(); });
$('roll9').addEventListener('click', () => { st9.seedP = (st9.seedP % 9999) + 1; st9.seedH = (st9.seedH % 9999) + 2; sync9(); });
$('p9').addEventListener('click', () => { Object.assign(st9, { faults: 800, sea: 55, seedP: PLATE_SEEDS.c9planet, seedH: PLATE_SEEDS.c9hill }); sync9(); });

/* seeds for the "as printed" presets, chosen by comparing compositions with the scans */
const PLATE_SEEDS = { c11: 5, c13top: 7, c13bot: 7, c15: 11, c9planet: 3, c9hill: 5 };

sync11(); sync13(); sync15(); sync9();
