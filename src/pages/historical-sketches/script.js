// Historical Sketches (chapter 41): three illustrations of the chapter's stories.
// 1. Lebesgue's bricks — a running-bond paving where no point touches more than 3 bricks.
// 2. Hyperbolic decay against exponentials and Hopkinson's mixtures, on log–log axes.
// 3. The Weierstrass function, and Riemann's function with Gerver's tangent.
'use strict';

const MONO = '500 11px "IBM Plex Mono", ui-monospace, monospace';

/* ===================== 1. Lebesgue's bricks ===================== */
(() => {
  const state = { n: 8, offset: true, probe: null }; // probe: {xf, yf} as fractions of the canvas
  const f = figure($('cBr'), draw);

  const rowOff = (r, w) => (state.offset && ((r % 2) + 2) % 2 === 1) ? w / 2 : 0;

  // closed bricks containing (x, y), on the infinite paving (rows may run past the canvas)
  function countBricks(x, y) {
    const h = f.h / state.n, w = 2 * h, eps = 1e-6 * h;
    const rows = [];
    const rf = y / h, r0 = Math.floor(rf + eps);
    rows.push(r0);
    if (Math.abs(y - r0 * h) < eps) rows.push(r0 - 1);
    const hit = new Set();
    for (const r of rows) {
      const off = rowOff(r, w), xf = (x - off) / w, m0 = Math.floor(xf + eps);
      hit.add(r + ':' + m0);
      if (Math.abs((x - off) - m0 * w) < eps) hit.add(r + ':' + (m0 - 1));
    }
    return hit.size;
  }

  // snap a tap to the nearest edge or corner within reach, so exact counts are possible by hand
  function snap(x, y) {
    const h = f.h / state.n, w = 2 * h, tol = Math.min(10, h * 0.3);
    const ky = Math.round(y / h);
    const onY = Math.abs(y - ky * h) < tol;
    if (onY) y = ky * h;
    const r = onY ? ky : Math.floor(y / h);           // for a point on an edge, snap x to that edge's row grid
    const off = rowOff(r, w), kx = Math.round((x - off) / w);
    const onX = Math.abs((x - off) - kx * w) < tol;
    if (onX) x = off + kx * w;
    const kind = onX && onY ? 'a corner' : (onX || onY ? 'an edge' : 'an interior point');
    return { x, y, kind };
  }

  function placeAtCorner() {
    const h = f.h / state.n, w = 2 * h, r = Math.floor(state.n / 2), off = rowOff(r, w);
    const m = Math.round((f.w / 2 - off) / w);
    state.probe = { xf: (off + m * w) / f.w, yf: (r * h) / f.h };
  }

  function draw() {
    if (!state.probe) placeAtCorner();
    const c = f.ctx, h = f.h / state.n, w = 2 * h;
    paper(f, PRINT.paper);
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    for (let r = 0; r < state.n; r++) {
      const off = rowOff(r, w);
      for (let m = -1; off + m * w < f.w; m++) {
        const x = off + m * w;
        if (((m % 2) + 2) % 2 === 0) { c.fillStyle = 'rgba(21,21,21,0.05)'; c.fillRect(x, r * h, w, h); }
        c.strokeStyle = PRINT.ink; c.lineWidth = 1.25;
        c.strokeRect(x, r * h, w, h);
      }
    }
    const p = snap(state.probe.xf * f.w, state.probe.yf * f.h);
    const nB = countBricks(p.x, p.y);
    c.beginPath(); c.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
    c.fillStyle = PRINT.red; c.fill(); c.strokeStyle = PRINT.paper; c.lineWidth = 2; c.stroke();
    $('infoBr').innerHTML = `The marked point is <b>${p.kind}</b>: it lies in <b>${nB} brick${nB > 1 ? 's' : ''}</b> (closed bricks counted). Near an edge or a corner, the probe snaps to it.`;
  }

  const markMode = stepButtons($('mBr'), [true, false],
    (v) => v ? 'Offset courses' : 'Aligned grid',
    (v) => v ? 'Offset courses, the bricklayer’s bond' : 'Aligned grid',
    (v) => { state.offset = v; state.probe = null; markMode(v); $('rBrA').textContent = v ? '3 bricks' : '4 bricks'; draw(); });
  markMode(true);

  $('szBr').addEventListener('input', () => {
    state.n = +$('szBr').value; state.probe = null;
    $('szBrv').textContent = `1/${state.n} of the height`;
    draw();
  });

  $('cBr').parentElement.addEventListener('pointerdown', (e) => {
    const r = $('cBr').parentElement.getBoundingClientRect();
    state.probe = { xf: (e.clientX - r.left) / f.w, yf: (e.clientY - r.top) / f.h };
    draw();
  });
})();

/* ===================== 2. Hyperbolic decay ===================== */
(() => {
  const XD = 7.5, YD = 5;                       // decades drawn: t in [1, 10^7.5] s, f in [10^-5, 1]
  const BAND = [2, Math.log10(1.6e7)];          // von Schweidler's measured range
  const state = { g: 0.3, exp: true, ltau: 3.0, mix: true, k: 3 };
  const f = figure($('cDe'), draw);

  function draw() {
    const c = f.ctx, L = 48, R = 14, T = 14, B = 32, W = f.w - L - R, H = f.h - T - B;
    const X = (d) => L + (d / XD) * W, Y = (d) => T + (-d / YD) * H;   // d = log10
    paper(f, PRINT.paper);
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);

    // measured band, grid, axes
    c.fillStyle = 'rgba(47,95,158,0.07)';
    c.fillRect(X(BAND[0]), T, X(BAND[1]) - X(BAND[0]), H);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1;
    for (let d = 0; d <= 7; d++) { c.beginPath(); c.moveTo(X(d), T); c.lineTo(X(d), T + H); c.stroke(); }
    for (let d = 0; d >= -YD; d--) { c.beginPath(); c.moveTo(L, Y(d)); c.lineTo(L + W, Y(d)); c.stroke(); }
    c.fillStyle = PRINT.muted; c.font = MONO; c.textAlign = 'center'; c.textBaseline = 'top';
    const xlab = { 0: '1 s', 2: '10²', 4: '10⁴', 6: '10⁶' };
    for (const d in xlab) c.fillText(xlab[d], X(+d), T + H + 6);
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let d = 0; d >= -YD; d -= 1) c.fillText(d === 0 ? '1' : '10' + '⁻' + '⁰¹²³⁴⁵'[-d], L - 6, Y(d));
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (const [t, name] of [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [3.156e7, 'year']]) {
      const x = X(Math.log10(t));
      c.strokeStyle = PRINT.faint; c.beginPath(); c.moveTo(x, T); c.lineTo(x, T + 7); c.stroke();
      c.fillStyle = PRINT.gray; c.fillText(name, x, T + 10);
    }

    c.save(); c.beginPath(); c.rect(L, T, W, H); c.clip();
    const M = 260, hyp = (lt) => -state.g * lt;                        // log10 f for t^-gamma
    const line = (lf, color, width, dash) => {
      c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash || []);
      c.beginPath();
      for (let i = 0; i <= M; i++) { const lt = (i / M) * XD, d = lf(lt); (i ? c.lineTo : c.moveTo).call(c, X(lt), Y(Math.max(d, -YD - 1))); }
      c.stroke(); c.setLineDash([]);
    };
    line(hyp, PRINT.ink, 2.4);

    if (state.exp) line((lt) => Math.pow(10, lt - state.ltau) * -Math.LOG10E, PRINT.accent, 1.8);   // log10 exp(-t/tau)

    let worst = 1;
    if (state.mix) {
      // k relaxation times, log-spaced; weights tau^-gamma are the log-discretised gamma integral
      const taus = [], ws = [];
      for (let j = 0; j < state.k; j++) { const d = 0.4 + ((j + 0.5) / state.k) * 6.7; taus.push(Math.pow(10, d)); ws.push(Math.pow(10, -d * state.g)); }
      const mixLog = (lt) => { const t = Math.pow(10, lt); let s = 0; for (let j = 0; j < state.k; j++) s += ws[j] * Math.exp(-t / taus[j]); return Math.log10(Math.max(s, 1e-300)); };
      let bias = 0;                                                     // scale the mixture to the hyperbola over the measured band
      const S = 64;
      for (let i = 0; i <= S; i++) { const lt = BAND[0] + (i / S) * (BAND[1] - BAND[0]); bias += hyp(lt) - mixLog(lt); }
      bias /= S + 1;
      for (let i = 0; i <= S; i++) { const lt = BAND[0] + (i / S) * (BAND[1] - BAND[0]); worst = Math.max(worst, Math.pow(10, Math.abs(hyp(lt) - (mixLog(lt) + bias)))); }
      line((lt) => mixLog(lt) + bias, PRINT.red, 1.8, [6, 4]);
    }
    c.restore();

    // labels along the curves
    c.font = MONO; c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillStyle = PRINT.ink; c.fillText('t⁻ᵞ  (scaling)', X(4.45), Y(hyp(4.45)) - 5);
    if (state.exp) { c.fillStyle = PRINT.accent; c.fillText('exp(−t/τ)', X(Math.min(state.ltau, 6.1)) + 6, Y(-0.43) - 4); }
    if (state.mix) { c.fillStyle = PRINT.red; c.textBaseline = 'top'; c.fillText(`mixture of ${state.k}`, X(0.35), Y(hyp(0.35)) + 8); }

    $('rDeA').textContent = state.mix ? (worst >= 10 ? `× ${worst.toFixed(0)} off` : `× ${worst.toFixed(2)} off`) : '—';
  }

  $('gDe').addEventListener('input', () => { state.g = +$('gDe').value / 100; $('gDev').textContent = `γ = ${state.g.toFixed(2)}`; draw(); });
  $('tDe').addEventListener('input', () => { state.ltau = +$('tDe').value / 10; $('tDev').textContent = `τ = 10${sup(state.ltau)} s`; draw(); });
  $('kDe').addEventListener('input', () => { state.k = +$('kDe').value; $('kDev').textContent = `k = ${state.k}`; draw(); });
  $('expDe').addEventListener('change', () => { state.exp = $('expDe').checked; $('tauWrap').hidden = !state.exp; draw(); });
  $('mixDe').addEventListener('change', () => { state.mix = $('mixDe').checked; $('mixWrap').hidden = !state.mix; draw(); });
  function sup(x) { // 10^x with one decimal as superscript text
    const s = (Math.round(x * 10) / 10).toString();
    return [...s].map((ch) => ({ '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '.': '˙' }[ch] || ch)).join('');
  }
})();

/* ===================== 3. Weierstrass and Riemann ===================== */
(() => {
  const TAU = Math.PI * 2;
  const state = { mode: 'weier', H: 0.5, b: 3.0 };
  const FMAX = 1e9;   // frequencies past this would lose cos() to floating-point error

  const fitOf = (f) => state.mode === 'weier'
    ? fitBox(f, { x0: 0, x1: 1, y0: -1.12, y1: 1.12 }, 0.02)
    : fitBox(f, { x0: 0, x1: TAU, y0: -1.0, y1: 1.0 }, 0.02);

  function render(f, v) {
    const c = f.ctx;
    paper(f, PRINT.paper);
    const wx0 = (0 - v.ox) / v.s, wx1 = (f.w - v.ox) / v.s;

    // baseline and unit ticks
    toWorld(f, v);
    c.beginPath(); c.moveTo(wx0, 0); c.lineTo(wx1, 0);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1 / v.s; c.stroke();
    toScreen(f);
    c.strokeStyle = PRINT.rule; c.fillStyle = PRINT.gray; c.font = MONO; c.textAlign = 'center'; c.textBaseline = 'bottom';
    const step = state.mode === 'weier' ? 0.5 : Math.PI;
    for (let k = Math.ceil(wx0 / step); k * step <= wx1; k++) {
      const x = v.ox + k * step * v.s;
      c.beginPath(); c.moveTo(x, f.h - 12); c.lineTo(x, f.h - 6); c.stroke();
      c.fillText(state.mode === 'weier' ? (k * step).toString() : (k === 0 ? '0' : (k === 1 ? 'π' : k + 'π')), x, f.h - 14);
    }

    let terms, y;
    const M = Math.max(900, Math.min(4200, Math.round(f.w * (state.mode === 'weier' ? 4 : 2))));
    if (state.mode === 'weier') {
      const { b, H } = state, A = 1 / (1 - Math.pow(b, -H));            // sup of the sum, so the plot fits [-1, 1]
      const amps = [], freqs = [];
      for (let n = 0, fr = 1, am = 1; n < 500; n++, fr *= b, am *= Math.pow(b, -H)) {
        if (fr > FMAX || (am / A) * v.s * 1.1 < 0.2 && n > 2) break;    // drop terms finer than a fifth of a pixel
        amps.push(am / A); freqs.push(fr * TAU);
      }
      terms = amps.length;
      y = (t) => { let s = 0; for (let n = 0; n < terms; n++) s += amps[n] * Math.cos(freqs[n] * t); return s; };
    } else {
      terms = Math.max(400, Math.min(9000, Math.ceil(2.5 * v.s)));      // tail of sum(1/n^2) past N is about 1/N
      y = (t) => { let s = 0; for (let n = 1; n <= terms; n++) s += Math.sin(n * n * t) / (n * n); return s; };
    }

    const p = new Path2D();
    for (let i = 0; i <= M; i++) {
      const t = wx0 + (i / M) * (wx1 - wx0), py = v.oy - y(t) * v.s, px = v.ox + t * v.s;
      if (i) p.lineTo(px, py); else p.moveTo(px, py);
    }
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.1; c.lineJoin = 'round'; c.stroke(p);

    if (state.mode === 'riemann') {                                     // Gerver's point: R'(pi) = -1/2
      const gx = v.ox + Math.PI * v.s;
      c.strokeStyle = PRINT.red; c.lineWidth = 1.4; c.setLineDash([7, 5]);
      c.beginPath(); c.moveTo(v.ox + wx0 * v.s, v.oy + (wx0 - Math.PI) * 0.5 * v.s);
      c.lineTo(v.ox + wx1 * v.s, v.oy + (wx1 - Math.PI) * 0.5 * v.s);
      c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(gx, v.oy, 4.5, 0, TAU); c.fillStyle = PRINT.red; c.fill();
      c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke();
    }
    $('rWb').textContent = fmt(terms);
  }

  const zw = zoomable('wW', 'cW', fitOf, render, { maxZoom: 300 });

  function applyView(bb) {
    const v = fitBox(zw.f, bb, 0.02);
    zw.z.view = { s: v.s, ox: v.ox, oy: v.oy, fit: fitOf(zw.f).s };
    zw.z.user = true; zw.schedule();
  }

  function setMode(m) {
    state.mode = m; markMode(m);
    $('hWrap').hidden = $('bWrap').hidden = m !== 'weier';
    $('cWt').textContent = m === 'weier' ? 'Weierstrass function' : 'Riemann’s function Σ n⁻² sin(n²t)';
    $('rWa').textContent = m === 'weier' ? `D = ${(2 - state.H).toFixed(2)}` : 'see the note';
    zw.refit();
  }
  const markMode = stepButtons($('mW'), ['weier', 'riemann'],
    (v) => v === 'weier' ? 'Weierstrass' : 'Riemann',
    (v) => v === 'weier' ? 'The Weierstrass function' : 'Riemann’s function',
    setMode);
  markMode('weier');

  const showH = () => { $('hWv').textContent = `H = ${state.H.toFixed(2)} · D = ${(2 - state.H).toFixed(2)}`; $('rWa').textContent = `D = ${(2 - state.H).toFixed(2)}`; };
  $('hW').addEventListener('input', () => { state.H = +$('hW').value / 100; showH(); zw.schedule(); });
  $('bW').addEventListener('input', () => { state.b = +$('bW').value / 10; $('bWv').textContent = `b = ${state.b.toFixed(1)}`; zw.schedule(); });
  for (const btn of document.querySelectorAll('#weierstrass [data-d]')) {
    btn.addEventListener('click', () => {
      state.H = Math.round((2 - +btn.dataset.d) * 100) / 100;
      $('hW').value = String(state.H * 100); showH();
      if (state.mode !== 'weier') setMode('weier'); else zw.refit();
    });
  }
  $('gerverW').addEventListener('click', () => {
    if (state.mode !== 'riemann') setMode('riemann');
    applyView({ x0: Math.PI - 0.085, x1: Math.PI + 0.085, y0: -0.062, y1: 0.062 });
  });
})();
