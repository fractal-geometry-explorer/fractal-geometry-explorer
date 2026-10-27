// Plate 340 — original evidence for scaling in economics (cotton prices), and the
// scaling-principle simulations. Dots are digitised from the scan; every curve is the
// computed symmetric Lévy stable distribution (Nolan's integral), nothing is traced.
'use strict';

/* ---------- symmetric stable tail, Pr(X > x), standard scale, 1 < D <= 2 ---------- */
// 12-node Gauss–Legendre
const GLX = [0.9815606342467192, 0.9041172563704749, 0.7699026741943047, 0.5873179542866175, 0.3678314989981802, 0.1252334085114689];
const GLW = [0.0471753363865118, 0.1069393259953184, 0.1600783285433462, 0.2031674267230659, 0.2334925365383548, 0.2491470458134028];
const LEVELS = Array.from({ length: 21 }, (_, k) => 120 * Math.pow(0.6, k));
function stableTail(x, a) {
  if (x <= 1e-12) return 0.5;
  if (a >= 2) return 0.5 * erfc(x / 2);
  const q = a / (a - 1), lam = Math.pow(x, q);
  const V = (th) => {
    const c = Math.cos(th);
    if (th < 1e-12) return Infinity;
    if (c < 1e-15) return 0;
    return Math.pow(c / Math.sin(a * th), q) * Math.cos((a - 1) * th) / c;
  };
  const solve = (level) => {
    let lo = 1e-10, hi = Math.PI / 2 - 1e-12;
    if (lam * V(hi) > level) return hi;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (lam * V(m) > level) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  let tot = 0, prev = solve(LEVELS[0]);
  for (let p = 1; p <= LEVELS.length; p++) {
    const c = p < LEVELS.length ? solve(LEVELS[p]) : Math.PI / 2;
    if (c <= prev) continue;
    const h = (c - prev) / 2, m = (c + prev) / 2;
    let s = 0;
    for (let i = 0; i < 6; i++) { s += GLW[i] * (Math.exp(-lam * V(m + h * GLX[i])) + Math.exp(-lam * V(m - h * GLX[i]))); }
    tot += s * h; prev = c;
  }
  return tot / Math.PI;
}
// Abramowitz–Stegun 7.1.26, |error| < 1.5e-7 — far below a pixel here
function erfc(x) {
  const t = 1 / (1 + 0.3275911 * x);
  return t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
}
// the whole standard curve as a table of log10 Pr against log10 u; shape is fixed per D,
// so dragging the curve is a pure translation and fitting a series is table lookups
function stdTable(a, step = 0.02) {
  const lu0 = -4.6, lu1 = 4.0, n = Math.round((lu1 - lu0) / step) + 1, lF = new Float64Array(n);
  for (let i = 0; i < n; i++) lF[i] = Math.log10(Math.max(1e-300, stableTail(Math.pow(10, lu0 + i * step), a)));
  return { lu0, step, lF };
}
const lookup = (T, lu) => {
  const t = Math.min(T.lF.length - 1.001, Math.max(0, (lu - T.lu0) / T.step)), i = Math.floor(t);
  return T.lF[i] + (T.lF[i + 1] - T.lF[i]) * (t - i);
};
function fitSeries(T, pts) {
  // least squares in log10 Pr over the horizontal position, golden section
  const err = (ls) => { let s = 0; for (const [lu, lF] of pts) { const d = lookup(T, lu - ls) - lF; s += d * d; } return s / pts.length; };
  const g = (Math.sqrt(5) - 1) / 2;
  let lo = -4, hi = 0, x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = err(x1), f2 = err(x2);
  for (let i = 0; i < 60; i++) {
    if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = err(x1); }
    else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = err(x2); }
  }
  const ls = (lo + hi) / 2;
  return { ls, rms: Math.sqrt(err(ls)) };
}

/* ---------- the digitised plate: [log10 u, log10 Pr] on each series' own scale ---------- */
const SERIES = {
  bp: [[-2.448, -0.620], [-2.334, -0.719], [-2.240, -0.824], [-2.123, -0.948], [-2.031, -1.100], [-1.946, -1.307], [-1.834, -1.541], [-1.666, -2.015], [-1.543, -2.222], [-1.375, -2.513], [-1.236, -2.811]],
  ap: [[-2.121, -0.583], [-1.996, -0.650], [-1.901, -0.741], [-1.758, -0.961], [-1.699, -1.052], [-1.608, -1.268], [-1.525, -1.424], [-1.460, -1.594], [-1.361, -1.881], [-1.301, -2.007], [-1.226, -2.185], [-1.101, -2.380], [-0.893, -2.661], [-0.832, -2.835]],
  cp: [[-1.393, -0.609], [-1.213, -0.741], [-1.092, -0.915], [-1.000, -1.119], [-0.870, -1.389], [-0.827, -1.687], [-0.684, -1.965], [-0.583, -2.176], [-0.406, -2.407], [-0.204, -2.596], [-0.141, -2.885]],
  bn: [[-2.744, -0.528], [-2.440, -0.750], [-2.251, -0.965], [-2.067, -1.213], [-1.863, -1.517], [-1.681, -1.887], [-1.552, -2.124], [-1.377, -2.387], [-1.253, -2.600]],
  an: [[-2.314, -0.480], [-2.020, -0.667], [-1.847, -0.894], [-1.727, -1.093], [-1.542, -1.419], [-1.417, -1.718], [-1.321, -1.956], [-1.125, -2.252], [-0.872, -2.672]],
  cn: [[-1.531, -0.496], [-1.318, -0.685], [-1.179, -0.893], [-1.061, -1.109], [-0.910, -1.420], [-0.803, -1.619], [-0.695, -1.828], [-0.641, -2.028], [-0.489, -2.407], [-0.153, -2.576], [-0.069, -2.889]],
};
const ORDER = ['bp', 'ap', 'cp', 'bn', 'an', 'cn'];
const META = {
  bp: { tag: 'b⁺', what: 'daily rises of a cotton-price index', when: '1944–58' },
  ap: { tag: 'a⁺', what: 'daily rises, New York Cotton Exchange', when: '1900–05' },
  cp: { tag: 'c⁺', what: 'monthly rises, New York Cotton Exchange', when: '1880–1940' },
  bn: { tag: 'b⁻', what: 'daily falls of a cotton-price index', when: '1944–58' },
  an: { tag: 'a⁻', what: 'daily falls, New York Cotton Exchange', when: '1900–05' },
  cn: { tag: 'c⁻', what: 'monthly falls, New York Cotton Exchange', when: '1880–1940' },
};
const NEG_SHIFT = 2; // the plate's negative scale sits exactly two decades right of the positive
const shiftOf = (k) => (k.endsWith('n') ? NEG_SHIFT : 0);
// series label positions, read off the plate (plot units)
const LABEL_AT = { bp: -2.68, ap: -2.13, cp: -1.5, bn: -0.81, an: -0.38, cn: 0.41 };

/* ===================== Plate 340 ===================== */
const PRINTED = { a: 1.7, pos: -0.884 }; // the printed curve: D = 1.7 at scale 0.1305
const A = { a: 1.7, pos: PRINTED.pos, table: null, fits: {}, grid: false, hover: null, timer: 0 };
const LX0 = -3.15, LX1 = 2.16, LY0 = -3.14, LY1 = 0.15;

function rebuildA(step) {
  A.table = stdTable(A.a, step);
  for (const k of ORDER) A.fits[k] = fitSeries(A.table, SERIES[k]);
}
rebuildA(0.02);

const figA = figure($('cA'), () => drawA());
function frameA(f) {
  const narrow = f.w < 480;
  const L = narrow ? 44 : 58, R = narrow ? 10 : 16, T = narrow ? 38 : 46, B = narrow ? 42 : 50;
  const X = (lx) => L + ((lx - LX0) / (LX1 - LX0)) * (f.w - L - R);
  const Y = (ly) => T + ((LY1 - ly) / (LY1 - LY0)) * (f.h - T - B);
  return { L, R, T, B, X, Y, narrow, perDec: (f.w - L - R) / (LX1 - LX0) };
}
function drawA() {
  const f = figA, c = f.ctx, g = frameA(f);
  paper(f, PRINT.paper); toScreen(f);
  const fs = g.narrow ? 9 : 11.5, ink = PRINT.ink;
  c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1.2;
  c.strokeRect(g.L, g.T, f.w - g.L - g.R, f.h - g.T - g.B);
  c.font = `500 ${fs}px "IBM Plex Mono", monospace`;
  const tick = (px, py, dx, dy, major) => { c.beginPath(); c.moveTo(px, py); c.lineTo(px + dx * (major ? 8 : 4.5), py + dy * (major ? 8 : 4.5)); c.stroke(); };
  const yB = f.h - g.B, decs = [1, 0.30103, 0.47712, 0.60206, 0.69897, 0.77815, 0.8451, 0.90309, 0.95424];
  for (let d = -3; d <= 0; d++) { // bottom scale, .001 to 1.
    tick(g.X(d), yB, 0, -1, true);
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText(d === 0 ? '1.' : '.' + '000'.slice(0, -d - 1) + '1', g.X(d), yB + 5);
    if (d < 0) for (let k = 1; k < 9; k++) tick(g.X(d + decs[k]), yB, 0, -1, false);
    if (A.grid) { c.save(); c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.beginPath(); c.moveTo(g.X(d), g.T); c.lineTo(g.X(d), yB); c.stroke(); c.restore(); }
  }
  for (let d = -1; d <= 2; d++) { // top scale (falls), two decades over
    tick(g.X(d), g.T, 0, 1, true);
    c.textAlign = 'center'; c.textBaseline = 'bottom';
    const v = d - NEG_SHIFT;
    c.fillText(v === 0 ? '-1.' : '-.' + '000'.slice(0, -v - 1) + '1', g.X(d), g.T - 5);
    if (d < 2) for (let k = 1; k < 9; k++) tick(g.X(d + decs[k]), g.T, 0, 1, false);
  }
  for (let d = -3; d <= 0; d++) { // tail frequency
    tick(g.L, g.Y(d), 1, 0, true);
    c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText(d === 0 ? '1.' : '.' + '000'.slice(0, -d - 1) + '1', g.L - 6, g.Y(d));
    if (d < 0) for (let k = 1; k < 9; k++) if (g.Y(d + decs[k]) > g.T) tick(g.L, g.Y(d + decs[k]), 1, 0, false);
    if (A.grid && d < 0) { c.save(); c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.beginPath(); c.moveTo(g.L, g.Y(d)); c.lineTo(f.w - g.R, g.Y(d)); c.stroke(); c.restore(); }
  }
  c.font = `600 ${fs + 0.5}px "Schibsted Grotesk", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText('scale of a⁺, b⁺, c⁺ = positive changes of logarithm of price', (g.L + f.w - g.R) / 2, f.h - (g.narrow ? 6 : 10));
  c.textBaseline = 'top';
  c.fillText('scale of a⁻, b⁻, c⁻ = negative changes of logarithm of price', (g.L + f.w - g.R) / 2, g.narrow ? 2 : 4);
  c.save(); c.translate(g.narrow ? 10 : 14, (g.T + f.h - g.B) / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText('tail frequency', 0, 0); c.restore();
  // the six digitised clouds
  c.save(); c.beginPath(); c.rect(g.L, g.T, f.w - g.L - g.R, f.h - g.T - g.B); c.clip();
  const r = Math.max(2.4, 0.0062 * (f.w - g.L - g.R));
  for (const k of ORDER) {
    const sh = shiftOf(k);
    c.fillStyle = ink;
    for (const [lu, lF] of SERIES[k]) { c.beginPath(); c.arc(g.X(lu + sh), g.Y(lF), r, 0, Math.PI * 2); c.fill(); }
    if (A.hover === k) { const [lu, lF] = SERIES[k][0]; c.beginPath(); c.arc(g.X(lu + sh), g.Y(lF), r + 3, 0, Math.PI * 2); c.strokeStyle = PRINT.accent; c.lineWidth = 1.6; c.stroke(); }
  }
  c.font = `600 ${fs + 2}px "IBM Plex Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink;
  for (const k of ORDER) c.fillText(META[k].tag, g.X(LABEL_AT[k]), g.Y(-0.27));
  // the stable curve at its current position
  const T = A.table;
  c.strokeStyle = PRINT.red; c.lineWidth = g.narrow ? 1.8 : 2.4; c.lineJoin = 'round'; c.beginPath();
  let pen = false;
  for (let i = 0; i < T.lF.length; i++) {
    const lx = T.lu0 + i * T.step + A.pos, lF = T.lF[i];
    if (lx < LX0 - 0.05 || lx > LX1 + 0.05 || lF < LY0 - 0.3 || lF > -0.42) { pen = false; continue; } // the plate draws the curve only from F ≈ 0.33 down
    const px = g.X(lx), py = g.Y(lF);
    if (pen) c.lineTo(px, py); else { c.moveTo(px, py); pen = true; }
  }
  c.stroke(); c.restore();
  markSnaps();
}

/* --- Plate 340 controls --- */
const snapBtns = {};
for (const k of ORDER) {
  const b = document.createElement('button');
  b.type = 'button'; b.innerHTML = `${META[k].tag}<small>${META[k].when}</small>`;
  b.setAttribute('aria-label', `Lay the curve on series ${META[k].tag}: ${META[k].what}, ${META[k].when}`);
  b.addEventListener('click', () => { A.pos = A.fits[k].ls + shiftOf(k); drawA(); sayFit(k); });
  $('snapA').append(b); snapBtns[k] = b;
}
function markSnaps() {
  for (const k of ORDER) snapBtns[k].setAttribute('aria-pressed', String(Math.abs(A.pos - (A.fits[k].ls + shiftOf(k))) < 0.01));
  $('rAd').textContent = A.a.toFixed(2);
  $('rAt').textContent = A.a >= 2 ? 'Gaussian' : '−' + A.a.toFixed(2);
  const sPos = Math.pow(10, A.pos);
  $('rAs').textContent = sPos >= 0.001 ? sPos.toPrecision(3) : Math.pow(10, A.pos - NEG_SHIFT).toPrecision(3) + ' (neg. axis)';
}
function sayFit(k) {
  const m = META[k], fit = A.fits[k], s = Math.pow(10, fit.ls);
  $('infoA').innerHTML = `Laid on <b>${m.tag}</b> (${m.what}, ${m.when}): scale σ ≈ ${s.toPrecision(2)}, a typical change near ${(100 * s).toPrecision(2)}% — rms misfit ${fit.rms.toFixed(2)} decades at D = ${A.a.toFixed(2)}.`;
}
function sayPrinted() {
  $('infoA').innerHTML = `As printed: D = 1.7, σ = 0.131. One curve, slid horizontally, fits all six clouds — on logarithmic paper a slide <b>is</b> a change of scale, which is all the scaling principle allows.`;
}
$('aA').addEventListener('input', () => {
  A.a = +$('aA').value;
  $('aAv').textContent = 'D = ' + A.a.toFixed(2);
  rebuildA(0.06); drawA(); // coarse at once, fine after the slider settles
  clearTimeout(A.timer); A.timer = setTimeout(() => { rebuildA(0.02); drawA(); }, 160);
});
$('gridA').addEventListener('change', () => { A.grid = $('gridA').checked; drawA(); });
$('plate340btn').addEventListener('click', () => {
  $('aA').value = '1.70'; A.a = 1.7; $('aAv').textContent = 'D = 1.70';
  rebuildA(0.02); A.pos = PRINTED.pos; drawA(); sayPrinted();
});
sayPrinted();

// drag the curve like the caption's transparency
{
  const wrap = $('wA');
  let drag = null;
  wrap.addEventListener('pointerdown', (e) => {
    const rect = wrap.getBoundingClientRect();
    drag = { x: e.clientX - rect.left, pos: A.pos };
    try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
    wrap.classList.add('dragging');
  });
  wrap.addEventListener('pointermove', (e) => {
    const rect = wrap.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (drag) {
      A.pos = Math.min(2.5, Math.max(-2, drag.pos + (x - drag.x) / frameA(figA).perDec));
      drawA();
      const sP = Math.pow(10, A.pos), sN = Math.pow(10, A.pos - NEG_SHIFT);
      let snapped = '';
      for (const k of ORDER) if (Math.abs(A.pos - (A.fits[k].ls + shiftOf(k))) < 0.01) snapped = k;
      if (snapped) sayFit(snapped);
      else $('infoA').innerHTML = `Curve at σ = ${sP.toPrecision(2)} on the positive axis (read ${sN.toPrecision(2)} on the negative axis). Slide it onto a cloud, or use the buttons to fit one exactly.`;
      return;
    }
    // hover: name the nearest dot
    const g = frameA(figA);
    let best = null, bd = 18 * 18;
    for (const k of ORDER) for (const [lu, lF] of SERIES[k]) {
      const dx = g.X(lu + shiftOf(k)) - x, dy = g.Y(lF) - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = { k, lu, lF }; }
    }
    if (best) {
      const m = META[best.k], u = Math.pow(10, best.lu), F = Math.pow(10, best.lF);
      $('infoA').innerHTML = `<b>${m.tag}</b> · ${m.what}, ${m.when}: a ${best.k.endsWith('n') ? 'fall' : 'rise'} of log price by ${u.toPrecision(2)} or more (≈ ${(100 * u).toPrecision(2)}%) had frequency ${F.toPrecision(2)}.`;
    }
  });
  const end = () => { drag = null; wrap.classList.remove('dragging'); };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
}

/* ===================== the scaling principle, simulated ===================== */
const B = { a: 1.7, seed: 1, mode: 'record', rescale: true, n: 1250, big: 16384 };
function mulberry32(s) {
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Chambers–Mallows–Stuck; the Brownian record reuses the same (U, W) so the two runs are twins
function simulate() {
  const rnd = mulberry32(B.seed * 2654435761), n = B.big, a = B.a, s0 = 0.009;
  const Xs = new Float64Array(n), Xg = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const U = (rnd() - 0.5) * Math.PI, W = -Math.log(1 - rnd());
    Xg[i] = 2 * Math.sin(U) * Math.sqrt(W) * s0;
    Xs[i] = a >= 2 ? Xg[i] :
      (Math.sin(a * U) / Math.pow(Math.cos(U), 1 / a)) * Math.pow(Math.cos(U * (1 - a)) / W, (1 - a) / a) * s0;
  }
  return { Xs, Xg };
}
let SIM = simulate();

const figB = figure($('cB'), () => drawB());
function axesB(f, x0, x1, y0, y1, logx, logy, xlab, ylab) {
  const narrow = f.w < 480;
  const L = narrow ? 46 : 58, R = narrow ? 10 : 14, T = 14, Bm = narrow ? 36 : 42;
  const X = (v) => L + ((v - x0) / (x1 - x0)) * (f.w - L - R);
  const Y = (v) => T + ((y1 - v) / (y1 - y0)) * (f.h - T - Bm);
  const c = f.ctx, fs = narrow ? 9 : 11;
  c.strokeStyle = PRINT.ink; c.fillStyle = PRINT.ink; c.lineWidth = 1.2;
  c.strokeRect(L, T, f.w - L - R, f.h - T - Bm);
  c.font = `500 ${fs}px "IBM Plex Mono", monospace`;
  const fmtLog = (d) => (d >= 0 ? Math.pow(10, d).toLocaleString('en-US') : '.' + '0'.repeat(-d - 1) + '1');
  c.textAlign = 'center'; c.textBaseline = 'top';
  if (logx) { for (let d = Math.ceil(x0); d <= Math.floor(x1); d++) { c.beginPath(); c.moveTo(X(d), f.h - Bm); c.lineTo(X(d), f.h - Bm - 7); c.stroke(); c.fillText(fmtLog(d), X(d), f.h - Bm + 5); } }
  else { const st = Math.max(250, Math.round((x1 - x0) / 5 / 250) * 250); for (let v = Math.ceil(x0 / st) * st; v <= x1; v += st) { c.beginPath(); c.moveTo(X(v), f.h - Bm); c.lineTo(X(v), f.h - Bm - 7); c.stroke(); c.fillText(fmt(v), X(v), f.h - Bm + 5); } }
  c.textAlign = 'right'; c.textBaseline = 'middle';
  if (logy) { for (let d = Math.ceil(y0); d <= Math.floor(y1); d++) { c.beginPath(); c.moveTo(L, Y(d)); c.lineTo(L + 7, Y(d)); c.stroke(); c.fillText(fmtLog(d), L - 6, Y(d)); } }
  else {
    const span = y1 - y0, st = Math.pow(10, Math.floor(Math.log10(span / 4))) * ([1, 2, 5].find((m) => span / (Math.pow(10, Math.floor(Math.log10(span / 4))) * m) <= 6) || 10);
    for (let v = Math.ceil(y0 / st) * st; v <= y1 + 1e-12; v += st) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(L + 7, Y(v)); c.stroke(); c.fillText(Math.abs(v) < 1e-12 ? '0' : v.toFixed(Math.max(0, -Math.floor(Math.log10(st)))), L - 6, Y(v)); }
  }
  c.font = `600 ${fs + 0.5}px "Schibsted Grotesk", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText(xlab, (L + f.w - R) / 2, f.h - (narrow ? 4 : 6));
  c.save(); c.translate(narrow ? 10 : 13, (T + f.h - Bm) / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText(ylab, 0, 0); c.restore();
  return { L, R, T, Bm, X, Y, fs };
}
function keyB(f, g, items) {
  const c = f.ctx; c.font = `600 ${g.fs}px "Schibsted Grotesk", sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
  let y = g.T + 14;
  for (const [color, label] of items) {
    c.strokeStyle = color; c.lineWidth = 2.4; c.beginPath(); c.moveTo(g.L + 12, y); c.lineTo(g.L + 34, y); c.stroke();
    c.fillStyle = PRINT.ink; c.fillText(label, g.L + 40, y); y += 16;
  }
}
function drawB() {
  const f = figB, c = f.ctx;
  paper(f, PRINT.paper); toScreen(f);
  c.save(); const n = B.n, { Xs, Xg } = SIM;
  if (B.mode === 'record') {
    let ys = 0, yg = 0; const Ps = new Float64Array(n + 1), Pg = new Float64Array(n + 1);
    let lo = 0, hi = 0;
    for (let i = 0; i < n; i++) { ys += Xs[i]; yg += Xg[i]; Ps[i + 1] = ys; Pg[i + 1] = yg; lo = Math.min(lo, ys, yg); hi = Math.max(hi, ys, yg); }
    const pad = 0.08 * (hi - lo) || 1;
    const g = axesB(f, 0, n, lo - pad, hi + pad, false, false, 'trading day', 'logarithm of price');
    c.beginPath(); c.rect(g.L, g.T, f.w - g.L - g.R, f.h - g.T - g.Bm); c.clip();
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.beginPath(); c.moveTo(g.L, g.Y(0)); c.lineTo(f.w - g.R, g.Y(0)); c.stroke();
    const line = (P, color, lw) => { c.strokeStyle = color; c.lineWidth = lw; c.lineJoin = 'round'; c.beginPath(); c.moveTo(g.X(0), g.Y(P[0])); for (let i = 1; i <= n; i++) c.lineTo(g.X(i), g.Y(P[i])); c.stroke(); };
    line(Pg, PRINT.accent, 1.4); line(Ps, PRINT.ink, 1.6);
    keyB(f, g, [[PRINT.ink, `stable, D = ${B.a.toFixed(2)}`], [PRINT.accent, 'Brownian, same draws']]);
  } else if (B.mode === 'meansq') {
    const Vs = [], Vg = []; let ss = 0, sg = 0;
    for (let i = 0; i < n; i++) { ss += Xs[i] * Xs[i]; sg += Xg[i] * Xg[i]; if (i >= 9) { Vs.push([Math.log10(i + 1), Math.log10(ss / (i + 1))]); Vg.push([Math.log10(i + 1), Math.log10(sg / (i + 1))]); } }
    let ylo = Infinity, yhi = -Infinity;
    for (const [, v] of Vs) { ylo = Math.min(ylo, v); yhi = Math.max(yhi, v); }
    for (const [, v] of Vg) { ylo = Math.min(ylo, v); yhi = Math.max(yhi, v); }
    const g = axesB(f, 1, Math.log10(n), Math.floor(ylo - 0.2), Math.ceil(yhi + 0.2), true, true, 'sample size (days)', 'mean square of daily changes');
    c.beginPath(); c.rect(g.L, g.T, f.w - g.L - g.R, f.h - g.T - g.Bm); c.clip();
    const line = (P, color, lw) => { c.strokeStyle = color; c.lineWidth = lw; c.lineJoin = 'round'; c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(g.X(x), g.Y(y)) : c.moveTo(g.X(x), g.Y(y)))); c.stroke(); };
    line(Vg, PRINT.accent, 1.4); line(Vs, PRINT.ink, 1.6);
    keyB(f, g, [[PRINT.ink, `stable, D = ${B.a.toFixed(2)} — never settles`], [PRINT.accent, 'Brownian — converges']]);
  } else { // tails by lag, Plate 340's test on simulated data
    const lags = [1, 8, 64], colors = [PRINT.ink, PRINT.accent, PRINT.red], pts = [];
    let xlo = Infinity, xhi = -Infinity;
    for (let li = 0; li < lags.length; li++) {
      const d = lags[li], m = Math.floor(SIM.Xs.length / d), ch = [];
      for (let j = 0; j < m; j++) { let s = 0; for (let i = j * d; i < (j + 1) * d; i++) s += SIM.Xs[i]; if (s > 0) ch.push(B.rescale ? s / Math.pow(d, 1 / B.a) : s); }
      ch.sort((p, q) => q - p);
      const P = [];
      for (let j = 0; j < ch.length; j++) {
        const F = (j + 1) / m;
        if (F < 3e-4 && d === 1) continue;
        if (j > 0 && Math.log10(ch[j - 1] / ch[j]) < 0.03 && (j + 1) % Math.ceil(m / 160) !== 0) continue;
        P.push([Math.log10(ch[j]), Math.log10(F)]);
        xlo = Math.min(xlo, Math.log10(ch[j])); xhi = Math.max(xhi, Math.log10(ch[j]));
      }
      pts.push(P);
    }
    const g = axesB(f, Math.max(xlo, xhi - 3.6) - 0.1, xhi + 0.15, -3.2, 0.08, true, true, B.rescale ? 'change over d days, divided by d^(1/D)' : 'change over d days', 'tail frequency');
    c.beginPath(); c.rect(g.L, g.T, f.w - g.L - g.R, f.h - g.T - g.Bm); c.clip();
    for (let li = 0; li < lags.length; li++) {
      c.fillStyle = colors[li];
      for (const [x, y] of pts[li]) { c.beginPath(); c.arc(g.X(x), g.Y(y), 2.6, 0, Math.PI * 2); c.fill(); }
    }
    keyB(f, g, lags.map((d, i) => [colors[i], `d = ${d} day${d > 1 ? 's' : ''}`]));
  }
  c.restore();
  readoutsB();
}
function readoutsB() {
  const n = B.mode === 'tails' ? SIM.Xs.length : B.n;
  let big = 0, tot = 0; const sq = [];
  for (let i = 0; i < B.n; i++) { const q = SIM.Xs[i] * SIM.Xs[i]; sq.push(q); tot += q; big = Math.max(big, Math.abs(SIM.Xs[i])); }
  sq.sort((a, b) => b - a);
  let top = 0; for (let i = 0; i < 10; i++) top += sq[i];
  let totG = 0; const sqG = [];
  for (let i = 0; i < B.n; i++) { const q = SIM.Xg[i] * SIM.Xg[i]; sqG.push(q); totG += q; }
  sqG.sort((a, b) => b - a);
  let topG = 0; for (let i = 0; i < 10; i++) topG += sqG[i];
  $('rBa').textContent = (100 * big).toPrecision(2) + '%';
  $('rBb').innerHTML = `${(100 * top / tot).toPrecision(2)}% <small>Brownian ${(100 * topG / totG).toPrecision(2)}%</small>`;
  $('rBc').textContent = fmt(n);
  $('rBd').textContent = String(B.seed);
}
const MODES_B = [
  ['record', 'Price record', 'five years of daily changes, stable against Brownian'],
  ['meansq', 'Sample variance', 'the mean square refuses to converge when D < 2'],
  ['tails', 'Tails by lag', 'changes over 1, 8 and 64 days collapse onto one curve'],
];
const markMB = stepButtons($('mB'), MODES_B.map((m) => m[0]), (v) => MODES_B.find((m) => m[0] === v)[1], (v) => MODES_B.find((m) => m[0] === v)[1], (v) => {
  B.mode = v;
  $('rescaleWrap').hidden = v !== 'tails';
  const m = MODES_B.find((q) => q[0] === v);
  $('cBt').textContent = m[1]; $('cBs').textContent = m[2];
  markMB(v); drawB();
});
markMB('record');
$('aB').addEventListener('input', () => { B.a = +$('aB').value; $('aBv').textContent = 'D = ' + B.a.toFixed(2); SIM = simulate(); drawB(); });
$('reseedB').addEventListener('click', () => { B.seed += 1; SIM = simulate(); drawB(); });
$('rescaleB').addEventListener('change', () => { B.rescale = $('rescaleB').checked; drawB(); });
$('infoB').innerHTML = 'The two records are built from the same random draws: only the distribution of the daily change differs. Set D = 2 and they coincide.';
