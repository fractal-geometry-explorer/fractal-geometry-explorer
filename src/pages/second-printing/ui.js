// Update-for-the-second-printing UI: Plate VIII (Julia basins), Plate X (the lambda-map),
// Plates II and 467 (quaternions), and the page-461 diagrams.

const cplx = (re, im, digits = 4) => `${re.toFixed(digits)} ${im < 0 ? '−' : '+'} ${Math.abs(im).toFixed(digits)}i`;

// ---------- Plate VIII: Julia basins of lam(z - 1/z) ----------
const J = { lam: [0.22127359, 0.48341992], cyc: null, c: null, t: 0 };
const J_PRESETS = [
  ['Plate VIII', 0.22127359, 0.48341992],
  ['Period 4', -0.05, -0.95],
  ['Period 2', -0.5, 0],
  ['Period 1', 0.65, 0],
];
function setLamJ(lr, li) {
  J.lam = [lr, li];
  J.cyc = lzCycle(lr, li);
  J.c = null;
  markJ(J_PRESETS.findIndex((p) => Math.abs(p[1] - lr) + Math.abs(p[2] - li) < 1e-9));
  const c = J.cyc;
  $('rJa').textContent = cplx(lr, li);
  $('rJb').textContent = c ? String(c.p) : 'none found';
  $('rJc').textContent = c ? cplx(c.pts[0][0], c.pts[0][1], 3) : '—';
  $('rJd').textContent = Math.hypot(lr, li).toFixed(4);
  $('infoJ').innerHTML = c
    ? `The critical orbit settles on a <b>${c.p}-point</b> limit cycle; each basin phase gets its own gray, and the Julia set between the basins prints as ink.`
    : 'No small limit cycle: the critical orbit escapes or wanders, and the picture is boundary alone.';
  zj.refit();
}
// coarse pass right away, the full pass once the view settles: the heavy-slider rhythm
function cachedRaster(store, key, W, H, compute, onFine) {
  if (store.c && store.c.key === key) return store.c;
  clearTimeout(store.t);
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const img = off.getContext('2d').createImageData(W, H);
  compute(img, 2);
  off.getContext('2d').putImageData(img, 0, 0);
  store.c = { key, off, fine: false };
  store.t = setTimeout(() => {
    if (!store.c || store.c.key !== key) return;
    compute(img, 1);
    off.getContext('2d').putImageData(img, 0, 0);
    store.c.fine = true;
    onFine();
  }, 170);
  return store.c;
}
const zj = zoomable('wJ', 'cJ', (f) => fitBox(f, { x0: -2.2, x1: 2.2, y0: -2.2, y1: 2.2 }), (f, v) => {
  const W = Math.round(f.w), H = Math.round(f.h);
  const key = [J.lam[0], J.lam[1], W, H, v.s, v.ox, v.oy].join('|');
  const cache = cachedRaster(J, key, W, H,
    (img, step) => rasterBasins(img, { s: v.s, ox: v.ox, oy: v.oy }, J.lam, J.cyc, 600, step),
    () => zj.schedule());
  paper(f, PRINT.paper); toScreen(f);
  f.ctx.imageSmoothingEnabled = false;
  f.ctx.drawImage(cache.off, 0, 0, W, H);
}, { maxZoom: 2000 });
const markJ = stepButtons($('mJ'), [0, 1, 2, 3], (i) => J_PRESETS[i][0], (i) => `Set lambda to the ${J_PRESETS[i][0]} value`, (i) => setLamJ(J_PRESETS[i][1], J_PRESETS[i][2]));
$('plate8').addEventListener('click', () => { setLamJ(J_PRESETS[0][1], J_PRESETS[0][2]); });

// ---------- Plate X: the lambda-map ----------
// Drawn in the print's orientation: world x = Im lam, world y = Re lam.
const X = { byPeriod: false, c: null, t: 0, pick: null };
const XVIEW_PRINT = { x0: -0.127, x1: 1.053, y0: -1.085, y1: 0.119 }; // fitted to the plate
const XVIEW_ALL = { x0: -1.3, x1: 1.3, y0: -1.3, y1: 1.3 };
let xview = XVIEW_PRINT;
const zx = zoomable('wX', 'cX', (f) => fitBox(f, xview, 0.01), (f, v) => {
  const W = Math.round(f.w), H = Math.round(f.h);
  const key = [X.byPeriod ? 1 : 0, W, H, v.s, v.ox, v.oy].join('|');
  const cache = cachedRaster(X, key, W, H,
    (img, step) => rasterLamMap(img, { s: v.s, ox: v.ox, oy: v.oy }, { byPeriod: X.byPeriod, step }),
    () => zx.schedule());
  paper(f, PRINT.paper); toScreen(f);
  f.ctx.imageSmoothingEnabled = false;
  f.ctx.drawImage(cache.off, 0, 0, W, H);
  if (X.pick) dot(f.ctx, v, X.pick[1], X.pick[0], 5);
}, {
  maxZoom: 3000,
  onTap: (wx, wy) => {
    const lr = wy, li = wx;
    X.pick = [lr, li]; X.c = null;
    let p = classifyLam(lr, li, 2600);
    $('rXa').textContent = cplx(lr, li);
    $('rXb').textContent = p === 0 ? 'escapes to ∞' : p === -2 ? 'hits the pole' : p === -1 ? 'none found (chaotic?)' : `limit cycle of ${p}`;
    $('rXc').textContent = Math.hypot(lr, li).toFixed(4);
    $('rXd').textContent = Math.hypot(lr + 0.5, li).toFixed(4);
    $('toJ').disabled = false;
    $('infoX').innerHTML = `Tapped λ = <b>${cplx(lr, li, 3)}</b> · ${p >= 1 ? `the critical orbit settles on <b>${p}</b> limit point${p > 1 ? 's' : ''} — in the print that paints ${p === 2 ? 'paper' : 'ink'}.` : p === 0 ? 'the orbit runs to infinity: paper.' : 'no small cycle: part of the dust.'}`;
    zx.schedule();
  },
});
const markX = stepButtons($('mX'), [0, 1], (i) => ['As printed', 'By cycle size'][i], (i) => ['Print rule', 'Colour cycles by size'][i], (i) => {
  X.byPeriod = i === 1; X.c = null; markX(i); zx.schedule();
});
markX(0);
$('plateX').addEventListener('click', () => { xview = XVIEW_PRINT; zx.refit(); });
$('wholeX').addEventListener('click', () => { xview = XVIEW_ALL; zx.refit(); });
$('toJ').addEventListener('click', () => {
  if (!X.pick) return;
  setLamJ(X.pick[0], X.pick[1]);
  document.getElementById('p8').scrollIntoView({ behavior: 'smooth' });
});

// ---------- Plates II and 467: quaternions ----------
const Q = { mu: [0.15652, -1.03225], yaw: 25, pitch: 20, job: 0 };
const Q_PRESETS = [['Plate 467', 0.15652, -1.03225, 25, 20], ['Plate II', 0.35, 0.55, 35, 15]];
const QRES = 460;
const qoff = document.createElement('canvas'); qoff.width = qoff.height = QRES;
const qctx = qoff.getContext('2d');
const qimg = qctx.createImageData(QRES, QRES);
const figQ = figure($('cQ'), () => blitQ());
function blitQ() {
  paper(figQ, PRINT.paper);
  const c = figQ.ctx; toScreen(figQ);
  const s = Math.min(figQ.w, figQ.h);
  c.imageSmoothingEnabled = true;
  c.drawImage(qoff, (figQ.w - s) / 2, (figQ.h - s) / 2, s, s);
}
function renderQ(fine) {
  const job = ++Q.job;
  const cam = quatCamera(Q.yaw, Q.pitch);
  const row = new Float64Array(QRES);
  const put = (j) => {
    for (let i = 0; i < QRES; i++) {
      const g = row[i], o = (j * QRES + i) * 4;
      // tinted toward the printed paper so the figure sits on the page like a plate
      qimg.data[o] = Math.min(236, g); qimg.data[o + 1] = Math.min(235, g * 0.996); qimg.data[o + 2] = Math.min(230, g * 0.976);
      qimg.data[o + 3] = 255;
    }
  };
  if (!fine) {
    for (let j = 0; j < QRES; j += 3) {
      quatRow(row, QRES, QRES, j, cam, Q.mu[0], Q.mu[1], 3);
      put(j); if (j + 1 < QRES) put(j + 1); if (j + 2 < QRES) put(j + 2);
    }
    qctx.putImageData(qimg, 0, 0); blitQ();
    return;
  }
  let j = 0;
  const chunk = () => {
    if (job !== Q.job) return;
    const t0 = performance.now();
    while (j < QRES && performance.now() - t0 < 28) {
      quatRow(row, QRES, QRES, j, cam, Q.mu[0], Q.mu[1], 1);
      put(j); j++;
    }
    qctx.putImageData(qimg, 0, 0); blitQ();
    if (j < QRES) setTimeout(chunk, 0);
  };
  chunk();
}
let qFineTimer = 0;
function paramQ() {
  renderQ(false);
  clearTimeout(qFineTimer);
  qFineTimer = setTimeout(() => renderQ(true), 180);
  // the complex-plane section's cycle, from the critical point of x^2 - mu
  let zr = 0, zi = 0, per = 0;
  for (let k = 0; k < 6000; k++) { const nr = zr * zr - zi * zi - Q.mu[0], ni = 2 * zr * zi - Q.mu[1]; zr = nr; zi = ni; if (zr * zr + zi * zi > 1e8) { per = -1; break; } }
  if (per === 0) {
    const sr = zr, si = zi;
    for (let p = 1; p <= 64; p++) { const nr = zr * zr - zi * zi - Q.mu[0], ni = 2 * zr * zi - Q.mu[1]; zr = nr; zi = ni; const dr = zr - sr, di = zi - si; if (dr * dr + di * di < 1e-16) { per = p; break; } }
  }
  $('rQa').textContent = cplx(Q.mu[0], Q.mu[1]);
  $('rQb').textContent = per > 0 ? `attracting ${per}-cycle` : per === -1 ? 'escapes (dust section)' : 'none found';
  $('rQc').textContent = `${Q.yaw.toFixed(0)}° / ${Q.pitch.toFixed(0)}°`;
  $('rQd').textContent = '16';
  markQ(Q_PRESETS.findIndex((p) => Math.abs(p[1] - Q.mu[0]) + Math.abs(p[2] - Q.mu[1]) < 1e-9));
}
const markQ = stepButtons($('pQ'), [0, 1], (i) => Q_PRESETS[i][0], (i) => `Show ${Q_PRESETS[i][0]}`, (i) => {
  const [, mr, mi, yaw, pitch] = Q_PRESETS[i];
  Q.mu = [mr, mi]; Q.yaw = yaw; Q.pitch = pitch;
  $('mQr').value = mr; $('mQi').value = mi; $('mQrv').textContent = mr.toFixed(3); $('mQiv').textContent = mi.toFixed(3);
  paramQ();
});
for (const [id, vid, k] of [['mQr', 'mQrv', 0], ['mQi', 'mQiv', 1]]) {
  $(id).addEventListener('input', () => { Q.mu[k] = +$(id).value; $(vid).textContent = (+$(id).value).toFixed(3); paramQ(); });
}
// drag to turn the shape
{
  const wrap = $('wQ');
  let drag = null;
  wrap.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY, Q.yaw, Q.pitch]; try { wrap.setPointerCapture(e.pointerId); } catch (_) {} });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    Q.yaw = drag[2] + (e.clientX - drag[0]) * 0.4;
    Q.pitch = Math.max(-80, Math.min(80, drag[3] + (e.clientY - drag[1]) * 0.4));
    paramQ();
  });
  const up = () => { drag = null; };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
}

// ---------- page 461: the three diagrams ----------
const C = { mode: 0, refit: false };
const figC = figure($('cC'), () => drawC());
function axesC(f, x0, x1, y0, y1, logx, logy, xlab, ylab) {
  const narrow = f.w < 480;
  const L = narrow ? 46 : 58, R = narrow ? 10 : 14, T = 14, Bm = narrow ? 36 : 42;
  const Xf = (v) => L + ((v - x0) / (x1 - x0)) * (f.w - L - R);
  const Yf = (v) => T + ((y1 - v) / (y1 - y0)) * (f.h - T - Bm);
  const c = f.ctx, fs = narrow ? 9 : 11;
  c.strokeStyle = PRINT.ink; c.fillStyle = PRINT.ink; c.lineWidth = 1.2;
  c.strokeRect(L, T, f.w - L - R, f.h - T - Bm);
  c.font = `500 ${fs}px "IBM Plex Mono", monospace`;
  c.textAlign = 'center'; c.textBaseline = 'top';
  const SUP = '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079';
  const lab = (d) => '10' + String(d).split('').map((ch) => (ch === '-' ? '\u207b' : SUP[+ch])).join('');
  if (logx) for (let dd = Math.ceil(x0); dd <= Math.floor(x1); dd++) { c.beginPath(); c.moveTo(Xf(dd), f.h - Bm); c.lineTo(Xf(dd), f.h - Bm - 7); c.stroke(); c.fillText(lab(dd), Xf(dd), f.h - Bm + 5); }
  else for (let vv = Math.ceil(x0 * 10) / 10; vv <= x1 + 1e-9; vv = Math.round((vv + 0.1) * 10) / 10) { c.beginPath(); c.moveTo(Xf(vv), f.h - Bm); c.lineTo(Xf(vv), f.h - Bm - 7); c.stroke(); c.fillText(vv.toFixed(2), Xf(vv), f.h - Bm + 5); }
  c.textAlign = 'right'; c.textBaseline = 'middle';
  if (logy) for (let dd = Math.ceil(y0); dd <= Math.floor(y1); dd++) { c.beginPath(); c.moveTo(L, Yf(dd)); c.lineTo(L + 7, Yf(dd)); c.stroke(); c.fillText(lab(dd), L - 6, Yf(dd)); }
  else for (let vv = Math.ceil(y0 / 50) * 50; vv <= y1; vv += 50) { c.beginPath(); c.moveTo(L, Yf(vv)); c.lineTo(L + 7, Yf(vv)); c.stroke(); c.fillText(String(vv), L - 6, Yf(vv)); }
  c.font = `600 ${fs + 0.5}px "Schibsted Grotesk", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText(xlab, (L + f.w - R) / 2, f.h - (narrow ? 4 : 6));
  c.save(); c.translate(narrow ? 10 : 13, (T + f.h - Bm) / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText(ylab, 0, 0); c.restore();
  return { Xf, Yf, fs, L, T };
}
function drawC() {
  const f = figC, c = f.ctx;
  paper(f, PRINT.paper); toScreen(f);
  if (C.mode === 0) {
    const g = axesC(f, 0.9, 4.5, 0.8, 7.2, true, true, 'wave number · 1/μm × 1E−4', 'sum of power · sq μm');
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.6; c.beginPath();
    SPEC_CURVE.forEach(([x, y], i) => (i ? c.lineTo(g.Xf(x), g.Yf(y)) : c.moveTo(g.Xf(x), g.Yf(y))));
    c.stroke();
    c.strokeStyle = PRINT.accent; c.lineWidth = 1.4; c.setLineDash([7, 5]); c.beginPath();
    c.moveTo(g.Xf(1.0), g.Yf(SPEC_LINE.m * 1.0 + SPEC_LINE.b)); c.lineTo(g.Xf(4.35), g.Yf(SPEC_LINE.m * 4.35 + SPEC_LINE.b)); c.stroke(); c.setLineDash([]);
    c.fillStyle = PRINT.accent;
    for (const [x, y] of SPEC_DOTS.chain) { c.beginPath(); c.arc(g.Xf(x), g.Yf(y), 3.4, 0, 7); c.fill(); }
    c.strokeStyle = PRINT.gray; c.lineWidth = 1; c.setLineDash([2, 5]);
    c.fillStyle = PRINT.ink;
    for (const [cx, ys] of SPEC_DOTS.cols) {
      c.beginPath(); c.moveTo(g.Xf(cx), g.Yf(ys[ys.length - 1])); c.lineTo(g.Xf(cx), g.Yf(ys[0])); c.stroke();
      for (const y of ys) { c.beginPath(); c.arc(g.Xf(cx), g.Yf(y), 3.4, 0, 7); c.fill(); }
    }
    c.setLineDash([]);
    c.font = `700 ${g.fs + 5}px "Schibsted Grotesk", sans-serif`; c.textAlign = 'left'; c.fillText('D = 1.118', g.Xf(1.7), g.Yf(6.6));
    $('rCa').textContent = 'spectral, one specimen';
    $('rCb').textContent = '−1.768';
    $('rCc').textContent = '1.116';
    $('rCd').textContent = '1.118';
  } else if (C.mode === 1) {
    const g = axesC(f, -0.1, 4.2, -0.2, 6.2, true, true, 'perimeter in μm', 'area in sq μm');
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.4; c.beginPath();
    c.moveTo(g.Xf(SLIT_LINE.x0), g.Yf(SLIT_LINE.y0)); c.lineTo(g.Xf(SLIT_LINE.x1), g.Yf(SLIT_LINE.y1)); c.stroke();
    if (C.refit) {
      // least squares through the recovered markers
      let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = SLIT_PTS.length;
      for (const [x, y] of SLIT_PTS) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
      const m = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - m * sx) / n;
      c.strokeStyle = PRINT.red; c.setLineDash([7, 5]); c.beginPath();
      c.moveTo(g.Xf(0.5), g.Yf(m * 0.5 + b)); c.lineTo(g.Xf(4.0), g.Yf(m * 4.0 + b)); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.red; c.font = `600 ${g.fs + 1}px "Schibsted Grotesk", sans-serif`; c.textAlign = 'left';
      c.fillText(`refit: D = ${(2 / m).toFixed(3)}`, g.Xf(2.2), g.Yf(1.1));
    }
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.6;
    for (const [x, y] of SLIT_PTS) {
      c.beginPath(); c.moveTo(g.Xf(x) - 5, g.Yf(y)); c.lineTo(g.Xf(x) + 5, g.Yf(y));
      c.moveTo(g.Xf(x), g.Yf(y) - 5); c.lineTo(g.Xf(x), g.Yf(y) + 5); c.stroke();
    }
    c.fillStyle = PRINT.ink; c.font = `700 ${g.fs + 5}px "Schibsted Grotesk", sans-serif`; c.textAlign = 'left'; c.fillText('D = 1.164', g.Xf(0.35), g.Yf(5.5));
    $('rCa').textContent = `slit islands, ${SLIT_PTS.length} recovered`;
    $('rCb').textContent = '1.724';
    $('rCc').textContent = '1.160';
    $('rCd').textContent = '1.164';
  } else {
    const g = axesC(f, 1.0, 1.4, 0, 190, false, false, 'fractal dimension D', 'impact energy · joules');
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.4; c.beginPath();
    c.moveTo(g.Xf(CHARPY_LINE.x0), g.Yf(CHARPY_LINE.y0)); c.lineTo(g.Xf(CHARPY_LINE.x1), g.Yf(CHARPY_LINE.y1)); c.stroke();
    c.fillStyle = PRINT.ink; c.font = `600 ${g.fs + 1}px "Schibsted Grotesk", sans-serif`;
    for (const [D, E, t] of CHARPY) {
      c.fillRect(g.Xf(D) - 5, g.Yf(E) - 5, 10, 10);
      c.textAlign = D > 1.15 ? 'left' : 'right';
      c.fillText(t, g.Xf(D) + (D > 1.15 ? 10 : -10), g.Yf(E) - 2);
    }
    $('rCa').textContent = 'Charpy, 6 heat treatments';
    $('rCb').textContent = '—';
    $('rCc').textContent = '1.10 → 1.28';
    $('rCd').textContent = '165 → 32 J';
  }
}
const markC = stepButtons($('mC'), [0, 1, 2], (i) => ['Spectrum', 'Slit islands', 'Impact energy'][i], (i) => ['Spectral diagram', 'Slit-island diagram', 'Impact energy against D'][i], (i) => {
  C.mode = i; markC(i);
  $('refitWrap').hidden = i !== 1;
  drawC();
});
markC(0);
$('refitWrap').hidden = true;
$('refitC').addEventListener('change', () => { C.refit = $('refitC').checked; drawC(); });

// ---------- start ----------
setLamJ(J.lam[0], J.lam[1]);
paramQ();
