(() => {
  const sup = (n) => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x) => {
    if (x === 0) return '0';
    if (x >= 0.001) return x.toFixed(x >= 0.1 ? 3 : 4);
    const [m, e] = x.toExponential(1).split('e');
    return `${m}·10⁻${sup(-e)}`;
  };
  const MONO = '"IBM Plex Mono", monospace';
  // a screen-space chart frame; draws the box and returns pixel mappers
  function frame(c, f, mg, xlab, ylab) {
    const { l, r, t, b } = mg, iw = f.w - l - r, ih = f.h - t - b;
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(l, t, iw, ih);
    c.fillStyle = PRINT.muted; c.font = `500 10.5px ${MONO}`;
    if (xlab) { c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(xlab, l + iw / 2, f.h - 15); }
    if (ylab) { c.save(); c.translate(13, t + ih / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ylab, 0, 0); c.restore(); }
    return { l, t, iw, ih, X: (u) => l + u * iw, Y: (u) => t + ih - u * ih };
  }
  const gridline = (c, x0, y0, x1, y1) => { c.strokeStyle = '#dddbd2'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };

  // ====================== 1 · self-similar and self-affine ======================
  const stA = { H: 0.5, alpha: 0.5, win: 0.25, mode: 'rescale', seed: 1 };
  const cacheA = {};
  function dataA() {
    const key = `${stA.H}|${stA.seed}`;
    if (!cacheA[key]) {
      const B = fbmFromFgn(fgn(stA.H, 2048, 90 + stA.seed * 7), stA.H);
      let m = 0;
      for (let i = 0; i < B.length; i++) m = Math.max(m, Math.abs(B[i]));
      cacheA[key] = { B, m };
    }
    return cacheA[key];
  }
  const tracePath = (B, X, Y, t0, t1, scale) => {
    const p = new Path2D(), n = B.length - 1;
    for (let px = 0; px <= 480; px++) {
      const tt = px / 480, t = t0 + tt * (t1 - t0), u = t * n, i = Math.min(n - 1, Math.floor(u)), fr = u - i;
      const v = (B[i] * (1 - fr) + B[i + 1] * fr) * scale;
      if (px) p.lineTo(X(tt), Y(v)); else p.moveTo(X(tt), Y(v));
    }
    return p;
  };
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }), (f) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const { B, m } = dataA(), n = B.length - 1;
    const panel = (t, h, title) => {
      const l = 46, r = 12, iw = f.w - l - r;
      c.strokeStyle = PRINT.rule; c.strokeRect(l, t, iw, h);
      c.fillStyle = PRINT.muted; c.font = `500 10.5px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText(title, l, t - 4);
      const mid = t + h / 2;
      gridline(c, l, mid, l + iw, mid);
      return { X: (u) => l + u * iw, Y: (v) => mid - (v / (1.1 * m)) * (h / 2), l, t, iw, h };
    };
    const short = f.w < 540;
    if (stA.mode === 'rescale') {
      const hTop = Math.round((f.h - 24 - 54 - 14) / 2), hBot = hTop;
      const top = panel(22, hTop, short ? `B(t) · H = ${stA.H.toFixed(2)}` : `the whole function B(t), t in [0, 1] · H = ${stA.H.toFixed(2)}`);
      // the chosen piece
      c.fillStyle = 'rgba(47,95,158,0.14)';
      c.fillRect(top.X(0), top.t, top.X(stA.win) - top.X(0), top.h);
      c.strokeStyle = PRINT.accent; c.lineWidth = 1; c.strokeRect(top.X(0), top.t, top.X(stA.win) - top.X(0), top.h);
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.4; c.stroke(tracePath(B, top.X, top.Y, 0, 1, 1));
      const bot = panel(hTop + 76, hBot, short ? `the piece, ×${Math.round(1 / stA.win)}, α = ${stA.alpha.toFixed(2)}` : `the piece over [0, ${fracLabel(stA.win)}], time × ${Math.round(1 / stA.win)}, height × (1/h)^α, α = ${stA.alpha.toFixed(2)}`);
      c.save(); c.beginPath(); c.rect(bot.l, bot.t, bot.iw, bot.h); c.clip();
      c.strokeStyle = PRINT.accent; c.lineWidth = 1.4; c.stroke(tracePath(B, bot.X, bot.Y, 0, stA.win, Math.pow(stA.win, -stA.alpha)));
      c.restore();
    } else {
      const h = f.h - 70, top = panel(26, h, `B(t) and its zeroset · H = ${stA.H.toFixed(2)}`);
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.4; c.stroke(tracePath(B, top.X, top.Y, 0, 1, 1));
      c.strokeStyle = PRINT.red; c.lineWidth = 1.4;
      let count = 0;
      c.beginPath();
      for (let i = 1; i <= n; i++) {
        if ((B[i - 1] < 0 && B[i] >= 0) || (B[i - 1] >= 0 && B[i] < 0)) {
          const x = top.X((i - 0.5) / n);
          c.moveTo(x, top.t + h + 6); c.lineTo(x, top.t + h + 16);
          count++;
        }
      }
      c.stroke();
      stA.crossings = count;
      c.fillStyle = PRINT.muted; c.font = `500 10.5px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText(`${count} crossings of 0 at this resolution — a dust of dimension 1 − H = ${(1 - stA.H).toFixed(2)}`, top.X(0), top.t + h + 20);
    }
  });
  function fracLabel(w) { return { 0.5: '1/2', 0.25: '1/4', 0.125: '1/8', 0.0625: '1/16' }[w] || w.toFixed(3); }
  const INFO_A = {
    rescale: (ok) => `Both panels use the same vertical ruler. ${ok
      ? '<b>α = H:</b> the stretched piece has the same visual roughness and sweep as the whole — the two are statistically indistinguishable, which is what self-affine means.'
      : 'With α ≠ H the piece comes out visibly flatter or wilder than the whole: the affinity only closes with the function’s own exponent. Slide α toward H.'}`,
    zeros: 'The instants where B(t) = 0 form a dust like Cantor’s, of dimension 1 − H: persistence (large H) makes crossings rarer, antipersistence crowds them. Chapter 8’s fractal errors are modeled on exactly such zerosets.',
  };
  function setA(redraw = true) {
    markMA(stA.mode); markWA(stA.win);
    $('aWrap').hidden = stA.mode !== 'rescale';
    $('hAv').textContent = `H = ${stA.H.toFixed(2)}`;
    $('aAv').textContent = `α = ${stA.alpha.toFixed(2)}`;
    const ok = Math.abs(stA.alpha - stA.H) < 0.026;
    $('infoA').innerHTML = stA.mode === 'rescale' ? INFO_A.rescale(ok) : INFO_A.zeros;
    $('cAt').textContent = stA.mode === 'rescale' ? 'Rescaling a piece' : 'The zeroset';
    $('cAn').textContent = stA.mode === 'rescale'
      ? `h = ${fracLabel(stA.win)} · the piece, stretched, below the whole`
      : 'red ticks mark the crossings of zero';
    $('rAa').textContent = (2 - stA.H).toFixed(2);
    $('rAb').textContent = (1 - stA.H).toFixed(2);
    $('rAc').textContent = (Math.pow(2, 2 * stA.H - 1) - 1).toFixed(3);
    if (stA.mode === 'rescale') {
      const { B } = dataA(), n = B.length - 1;
      let w0 = 0, w1 = 0, p0 = 0, p1 = 0;
      for (let i = 0; i <= n; i++) {
        w0 = Math.min(w0, B[i]); w1 = Math.max(w1, B[i]);
        if (i <= n * stA.win) { p0 = Math.min(p0, B[i]); p1 = Math.max(p1, B[i]); }
      }
      $('rAd').textContent = `${((p1 - p0) * Math.pow(stA.win, -stA.alpha) / (w1 - w0)).toFixed(2)}×`;
    } else $('rAd').textContent = '—';
    if (redraw) zA.schedule();
  }
  const markMA = stepButtons($('mA'), ['rescale', 'zeros'], (k) => (k === 'rescale' ? 'Rescale a piece' : 'The zeroset'), (k) => `Show ${k}`, (k) => { stA.mode = k; setA(); });
  const markWA = stepButtons($('wAs'), [0.5, 0.25, 0.125, 0.0625], fracLabel, (w) => `Window ${fracLabel(w)}`, (w) => { stA.win = w; setA(); });
  $('hAs').addEventListener('input', (e) => { stA.H = +e.target.value; setA(); });
  $('aAs').addEventListener('input', (e) => { stA.alpha = +e.target.value; setA(); });
  $('seedA').addEventListener('click', () => { stA.seed++; setA(); });
  $('presetA').addEventListener('click', () => { Object.assign(stA, { H: 0.5, alpha: 0.5, mode: 'rescale' }); $('hAs').value = 0.5; $('aAs').value = 0.5; setA(); });

  // ====================== 2 · covering by balls ======================
  const KOCH = kochPoints(8);
  const stB = { set: 'koch', mode: 'cover', n: 2 };
  const SETS_B = {
    koch: { label: 'Koch curve', D: Math.log(4) / Math.log(3), maxN: 6, count: (n) => Math.pow(4, n) },
    dust: { label: 'Cantor dust', D: Math.log(2) / Math.log(3), maxN: 7, count: (n) => Math.pow(2, n) },
    line: { label: 'An interval', D: 1, maxN: 5, count: (n) => Math.pow(3, n) },
  };
  const cacheB = {};
  function ballsB(set, n) {
    const key = `${set}|${n}`;
    if (cacheB[key]) return cacheB[key];
    let out;
    if (set === 'koch') out = coverBalls(KOCH, Math.pow(4, n));
    else {
      const { starts, len } = set === 'dust' ? cantorStarts(n) : { starts: Array.from({ length: Math.pow(3, n) }, (_, i) => i / Math.pow(3, n)), len: Math.pow(3, -n) };
      const balls = new Float64Array(2 * starts.length);
      for (let i = 0; i < starts.length; i++) { balls[2 * i] = starts[i] + len / 2; balls[2 * i + 1] = 0; }
      out = { balls, r: len / 2 };
    }
    return (cacheB[key] = out);
  }
  let kochPath = null;
  const zB = zoomable('wB', 'cB', (f) => {
    if (stB.mode === 'jump') return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
    if (stB.set === 'koch') return fitBox(f, { x0: -0.06, x1: 1.06, y0: -0.1, y1: 0.4 }, 0.02);
    return fitBox(f, { x0: -0.06, x1: 1.06, y0: -0.22, y1: 0.22 }, 0.02);
  }, (f, v) => {
    const c = f.ctx, S = SETS_B[stB.set];
    paper(f, PRINT.paper);
    if (stB.mode === 'cover') {
      toWorld(f, v);
      const { balls, r } = ballsB(stB.set, stB.n);
      c.fillStyle = 'rgba(194,69,45,0.10)'; c.strokeStyle = PRINT.red; c.lineWidth = 1 / v.s;
      for (const p of chunked(balls.length / 2, (p, i) => { p.moveTo(balls[2 * i] + r, balls[2 * i + 1]); p.arc(balls[2 * i], balls[2 * i + 1], r, 0, 2 * Math.PI); }, 1024)) { c.fill(p); c.stroke(p); }
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(1.1 / v.s, Math.min(2 / v.s, 0.002));
      if (stB.set === 'koch') { if (!kochPath) kochPath = polyPath(KOCH, false); c.stroke(kochPath); }
      else if (stB.set === 'line') { c.beginPath(); c.moveTo(0, 0); c.lineTo(1, 0); c.stroke(); }
      else {
        const { starts, len } = cantorStarts(8), bar = new Path2D();
        for (const a of starts) bar.rect(a, -0.004, len, 0.008);
        c.fillStyle = PRINT.ink; c.fill(bar);
      }
      toScreen(f);
    } else {
      toScreen(f);
      const fr = frame(c, f, { l: 52, r: 14, t: 14, b: 34 }, 'trial dimension d', 'log₁₀ Σ γ(d) ρᵈ');
      const y0 = -3, y1 = 3, X = (d) => fr.X(d / 2), Y = (lg) => fr.Y((Math.min(y1, Math.max(y0, lg)) - y0) / (y1 - y0));
      c.font = `500 10.5px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = PRINT.muted;
      for (let d = 0; d <= 2; d += 0.5) { gridline(c, X(d), fr.t, X(d), fr.t + fr.ih); c.fillText(d.toFixed(1), X(d), fr.t + fr.ih + 5); }
      gridline(c, fr.l, Y(0), fr.l + fr.iw, Y(0));
      const rOf = (n) => (stB.set === 'koch' ? ballsB('koch', 1).r * Math.pow(3, 1 - n) : Math.pow(3, -n) / 2);
      for (let n = 1; n <= 7; n++) {
        const N = S.count(n), rho = rOf(n);
        c.strokeStyle = ramp(n / 7); c.lineWidth = n === 7 ? 2 : 1.3; c.beginPath();
        for (let k = 0; k <= 120; k++) {
          const d = (2 * k) / 120, lg = Math.log10(N) + Math.log10(ballVol(d)) + d * Math.log10(rho);
          const x = X(d), y = Y(lg);
          if (k) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
      }
      c.strokeStyle = PRINT.red; c.lineWidth = 1.4; c.setLineDash([6, 4]);
      c.beginPath(); c.moveTo(X(S.D), fr.t); c.lineTo(X(S.D), fr.t + fr.ih); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.red; c.textAlign = S.D > 1.4 ? 'right' : 'left'; c.textBaseline = 'top';
      c.fillText(`D = ${S.D.toFixed(4)}`, X(S.D) + (S.D > 1.4 ? -6 : 6), fr.t + 6);
      c.fillStyle = PRINT.muted; c.textAlign = 'left';
      c.fillText('↑ d < D: blows up', X(0.06), Y(2.6));
      c.textAlign = 'right'; c.fillText('d > D: dies ↓', X(1.97), Y(-2.2));
    }
  });
  const INFO_B = {
    cover: 'One ball per piece of the construction: each stage multiplies the count and shrinks the radius, and the exponent log N/log(1/ρ) closes in on D. For the interval it is exactly 1 — dimension by covering recovers the standard one.',
    jump: 'Each curve is one radius ρ: the total measure Σ γ(d)ρᵈ against the trial dimension d. As ρ shrinks (yellow → blue) the curves swing like a gate hinged at d = D: below D the total grows without bound, above D it collapses to zero. The hinge is the Hausdorff–Besicovitch dimension.',
  };
  function setB(refit) {
    markMB(stB.mode); markSetB(stB.set); markSB(stB.n);
    const S = SETS_B[stB.set];
    stB.n = Math.min(stB.n, S.maxN);
    markSB(stB.n);
    markSB.buttons.forEach((b, i) => { b.disabled = i + 1 > S.maxN; });
    $('sBwrap').hidden = stB.mode !== 'cover';
    $('sBv').textContent = `stage ${stB.n}`;
    $('cBt').textContent = stB.mode === 'cover' ? `Covering: ${S.label}` : `The measure against d`;
    $('cBn').textContent = stB.mode === 'cover' ? `${fmt(S.count(stB.n))} balls` : `${S.label} · one curve per radius ρ`;
    $('infoB').innerHTML = INFO_B[stB.mode];
    const { r } = stB.mode === 'cover' ? ballsB(stB.set, stB.n) : { r: 0 };
    const N = S.count(stB.n);
    $('rBa').textContent = stB.mode === 'cover' ? fmt(N) : '—';
    $('rBb').textContent = stB.mode === 'cover' ? sci(r) : '—';
    $('rBc').textContent = stB.mode === 'cover' ? (Math.log(N) / Math.log(1 / r)).toFixed(4) : '—';
    $('rBd').textContent = S.D === 1 ? '1' : `${S.D.toFixed(4)}${stB.set === 'koch' ? ' = log 4/log 3' : ' = log 2/log 3'}`;
    $('dimB').textContent = stB.mode === 'cover'
      ? `N(ρ) balls of radius ρ · log N(ρ)/log(1/ρ) → D · ${S.label}: D = ${S.D.toFixed(4)}`
      : `Σ over the cover of γ(d) ρᵈ · infinite for d < D, zero for d > D · ${S.label}: D = ${S.D.toFixed(4)}`;
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), ['cover', 'jump'], (k) => (k === 'cover' ? 'Cover with balls' : 'The d-measure jump'), (k) => `Show ${k}`, (k) => { stB.mode = k; setB(true); });
  const markSetB = stepButtons($('setB'), Object.keys(SETS_B), (k) => SETS_B[k].label, (k) => `Set: ${SETS_B[k].label}`, (k) => { stB.set = k; setB(true); });
  const markSB = stepButtons($('sB'), [1, 2, 3, 4, 5, 6, 7], String, (n) => `Stage ${n}`, (n) => { stB.n = n; setB(false); });
  $('presetB').addEventListener('click', () => { Object.assign(stB, { set: 'koch', mode: 'cover', n: 2 }); setB(true); });

  // ====================== 3 · Lévy stability ======================
  const stC = { D: 1, beta: 0, mode: 'density', u: 3 };
  let gridC = { key: '', G: null };
  function densC() {
    const key = `${stC.D}|${stC.beta}`;
    if (gridC.key !== key) gridC = { key, G: stableGrid(stC.D, stC.beta) };
    return gridC.G;
  }
  const closedC = () => {
    if (stC.D === 2) return { name: 'Gauss', f: (x) => Math.exp(-x * x / 4) / (2 * Math.sqrt(Math.PI)) };
    if (stC.D === 1 && stC.beta === 0) return { name: 'Cauchy', f: (x) => 1 / (Math.PI * (1 + x * x)) };
    if (stC.D === 0.5 && Math.abs(stC.beta) === 1) {
      const s = Math.sign(stC.beta);
      return { name: 'Brown recurrence', f: (x) => (s * x > 0 ? Math.exp(-1 / (2 * s * x)) / (Math.sqrt(2 * Math.PI) * Math.pow(s * x, 1.5)) : 0) };
    }
    return null;
  };
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }), (f) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const G = densC();
    if (stC.mode === 'density') {
      const x0 = -7, x1 = 7;
      let pm = 0;
      for (let x = x0; x <= x1; x += 0.02) pm = Math.max(pm, stableAt(G, x));
      const fr = frame(c, f, { l: 46, r: 14, t: 14, b: 34 }, 'x', 'p(x)');
      const X = (x) => fr.X((x - x0) / (x1 - x0)), Y = (p) => fr.Y(Math.min(1, p / (1.07 * pm)));
      c.font = `500 10.5px ${MONO}`; c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let x = -6; x <= 6; x += 2) { gridline(c, X(x), fr.t, X(x), fr.t + fr.ih); c.fillText(String(x), X(x), fr.t + fr.ih + 5); }
      const cf = closedC();
      if (cf) {
        c.strokeStyle = PRINT.red; c.lineWidth = 2.2; c.setLineDash([2, 5]); c.beginPath();
        for (let k = 0; k <= 560; k++) { const x = x0 + ((x1 - x0) * k) / 560; const y = Y(cf.f(x)); if (k) c.lineTo(X(x), y); else c.moveTo(X(x), y); }
        c.stroke(); c.setLineDash([]);
        c.fillStyle = PRINT.red; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(`dashed red: the closed form (${cf.name})`, fr.l + 8, fr.t + fr.ih - 6);
      }
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.6; c.beginPath();
      for (let k = 0; k <= 560; k++) { const x = x0 + ((x1 - x0) * k) / 560; const y = Y(stableAt(G, x)); if (k) c.lineTo(X(x), y); else c.moveTo(X(x), y); }
      c.stroke();
    } else {
      // the conditional density of one addend, the sum of two being u
      const u = stC.u, s = Math.pow(2, 1 / stC.D), p2u = stableAt(G, u / s) / s;
      const y0 = Math.min(-4, u - 10), y1 = Math.max(4, u + 4) + 2;
      const q = (y) => (p2u > 0 ? (stableAt(G, y) * stableAt(G, u - y)) / p2u : 0);
      let qm = 0;
      for (let y = y0; y <= y1; y += 0.02) qm = Math.max(qm, q(y));
      const fr = frame(c, f, { l: 46, r: 14, t: 14, b: 34 }, 'one addend y, the sum being u', 'density of y');
      const X = (y) => fr.X((y - y0) / (y1 - y0)), Y = (p) => fr.Y(Math.min(1, p / (1.07 * (qm || 1))));
      const marks = [[0, 'y = 0'], [u / 2, 'u/2'], [u, 'y = u']];
      c.font = `500 10.5px ${MONO}`;
      for (const [y, lb] of marks) {
        c.strokeStyle = PRINT.rule; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(X(y), fr.t); c.lineTo(X(y), fr.t + fr.ih); c.stroke(); c.setLineDash([]);
        c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(lb, X(y), fr.t + 5);
      }
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.6; c.beginPath();
      for (let k = 0; k <= 640; k++) { const y = y0 + ((y1 - y0) * k) / 640; const yy = Y(q(y)); if (k) c.lineTo(X(y), yy); else c.moveTo(X(y), yy); }
      c.stroke();
    }
  });
  const INFO_C = {
    density: () => `All these laws keep their shape under addition. ${stC.D === 2 ? 'At D = 2 the tails are the Gaussian’s — the one stable law with finite variance.' : `With D = ${stC.D.toFixed(2)} the tail${Math.abs(stC.beta) === 1 ? ' on one side' : 's'} fall${Math.abs(stC.beta) === 1 ? 's' : ''} off as x⁻ᴰ⁻¹ — slow enough that the variance diverges.`} β tilts the law: at β = ±1 and D < 1 it vanishes on one whole side.`,
    addend: () => `Two independent copies added up to u = ${stC.u.toFixed(1)}. ${stC.D === 2 ? 'In the Gaussian case the conditional law of one addend is a bell at u/2, whatever u: fair shares.' : stC.bimodal ? 'The middle has become the least likely split: one addend took nearly all of u, the other nearly none. This is the clustering of Lévy flights and the inequity of chapter 37’s price records.' : 'For small u the split is still unimodal near u/2. Raise u: past a threshold the density bifurcates into two humps near 0 and u.'}`,
  };
  function setC() {
    markMC(stC.mode);
    $('uWrap').hidden = stC.mode !== 'addend';
    $('dCv').textContent = `D = ${stC.D.toFixed(2)}`;
    $('bCv').textContent = `β = ${stC.beta.toFixed(2)}`;
    $('uCv').textContent = `u = ${stC.u.toFixed(1)}`;
    $('cCt').textContent = stC.mode === 'density' ? 'The density' : 'One addend of a sum';
    $('cCn').textContent = `D = ${stC.D.toFixed(2)}, β = ${stC.beta.toFixed(2)}`;
    const cf = closedC();
    $('rCa').textContent = stC.D === 2 ? 'e⁻ˣ²/⁴' : `∝ |x|⁻${(stC.D + 1).toFixed(2)}`;
    $('rCb').textContent = stC.D > 1 ? '0' : 'undefined';
    $('rCc').textContent = stC.D === 2 ? '2' : '∞';
    $('rCd').textContent = cf ? cf.name : 'none — computed';
    if (stC.mode === 'addend') {
      const G = densC(), u = stC.u, s = Math.pow(2, 1 / stC.D), p2u = stableAt(G, u / s) / s;
      const q = (y) => (p2u > 0 ? (stableAt(G, y) * stableAt(G, u - y)) / p2u : 0);
      stC.bimodal = q(u / 2) < Math.max(q(0), q(u)) * 0.999;
    }
    zC.schedule();
    $('infoC').innerHTML = INFO_C[stC.mode]();
  }
  const markMC = stepButtons($('mC'), ['density', 'addend'], (k) => (k === 'density' ? 'The density' : 'One addend of a sum'), (k) => `Show ${k}`, (k) => { stC.mode = k; setC(); });
  $('dCs').addEventListener('input', (e) => { stC.D = +e.target.value; setC(); });
  $('bCs').addEventListener('input', (e) => { stC.beta = +e.target.value; setC(); });
  $('uCs').addEventListener('input', (e) => { stC.u = +e.target.value; setC(); });
  const preC = (D, b) => { stC.D = D; stC.beta = b; $('dCs').value = D; $('bCs').value = b; setC(); };
  $('preG').addEventListener('click', () => preC(2, 0));
  $('preC').addEventListener('click', () => preC(1, 0));
  $('preL').addEventListener('click', () => preC(0.5, 1));

  // ====================== 4 · R/S analysis ======================
  const stD = { proc: 'fgn', H: 0.7, seed: 2 };
  const PROCS_D = { gauss: 'White Gauss', fgn: 'Fractional Gauss', levy: 'White Lévy, D = 1.5', walk: 'A random walk' };
  const THEORY_D = { gauss: () => 0.5, fgn: () => stD.H, levy: () => 0.5, walk: () => 1 };
  const LAGS_D = [8, 16, 32, 64, 128, 256, 512];
  const cacheD = {};
  function dataD() {
    const key = `${stD.proc}|${stD.proc === 'fgn' ? stD.H : ''}|${stD.seed}`;
    if (!cacheD[key]) {
      const n = 2048;
      let X;
      if (stD.proc === 'fgn') X = fgn(stD.H, n, 40 + stD.seed * 13);
      else {
        X = new Float64Array(n);
        const rand = mulberry(40 + stD.seed * 13), g = gaussMaker(rand);
        if (stD.proc === 'levy') for (let i = 0; i < n; i++) X[i] = stableSample(1.5, rand);
        else {
          let acc = 0;
          for (let i = 0; i < n; i++) { const v = g(); X[i] = stD.proc === 'walk' ? (acc += v) : v; }
        }
      }
      cacheD[key] = { X, rs: rsAnalysis(X, LAGS_D) };
    }
    return cacheD[key];
  }
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }), (f) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const { X, rs } = dataD();
    // the record, on a thin strip
    const sh = Math.round(f.h * 0.2), l = 52, iw = f.w - l - 14;
    c.strokeStyle = PRINT.rule; c.strokeRect(l, 10, iw, sh);
    const sorted = Array.from(X).sort((a, b) => a - b);
    const lo = sorted[Math.floor(0.004 * X.length)], hi = sorted[Math.ceil(0.996 * X.length) - 1];
    const sy = (v) => 10 + sh - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (sh - 4) - 2;
    c.strokeStyle = PRINT.ink; c.lineWidth = 0.8; c.beginPath();
    for (let i = 0; i < X.length; i++) { const x = l + (i / (X.length - 1)) * iw; if (i) c.lineTo(x, sy(X[i])); else c.moveTo(x, sy(X[i])); }
    c.stroke();
    c.fillStyle = PRINT.muted; c.font = `500 10.5px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(`the record X(t) · ${PROCS_D[stD.proc]}${stD.proc === 'fgn' ? `, H = ${stD.H.toFixed(2)}` : ''}`, l, sh + 15);
    // the pox plot
    const top = sh + 34;
    const fr = { l, t: top, iw, ih: f.h - top - 34 };
    c.strokeStyle = PRINT.rule; c.strokeRect(fr.l, fr.t, fr.iw, fr.ih);
    const lx0 = Math.log10(LAGS_D[0]) - 0.15, lx1 = Math.log10(LAGS_D[LAGS_D.length - 1]) + 0.15;
    let qlo = Infinity, qhi = -Infinity;
    for (const p of rs.pts) for (const q of p.qs) { qlo = Math.min(qlo, q); qhi = Math.max(qhi, q); }
    const pad = 0.12 * (qhi - qlo);
    qlo -= pad; qhi += pad;
    const PX = (ld) => fr.l + ((ld - lx0) / (lx1 - lx0)) * fr.iw;
    const PY = (lq) => fr.t + fr.ih - ((lq - qlo) / (qhi - qlo)) * fr.ih;
    c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
    for (const d of LAGS_D) { gridline(c, PX(Math.log10(d)), fr.t, PX(Math.log10(d)), fr.t + fr.ih); c.fillText(String(d), PX(Math.log10(d)), fr.t + fr.ih + 5); }
    c.fillText('lag d (log scale) — each dot is one span’s R/S', fr.l + fr.iw / 2, f.h - 15);
    c.save(); c.translate(13, fr.t + fr.ih / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('log₁₀ R/S', 0, 0); c.restore();
    c.fillStyle = 'rgba(47,95,158,0.45)';
    for (const p of rs.pts) for (const q of p.qs) { c.beginPath(); c.arc(PX(Math.log10(p.d)), PY(q), 2.2, 0, 2 * Math.PI); c.fill(); }
    c.fillStyle = PRINT.ink;
    for (const p of rs.pts) { c.beginPath(); c.arc(PX(Math.log10(p.d)), PY(p.mean), 4, 0, 2 * Math.PI); c.fill(); }
    c.strokeStyle = PRINT.red; c.lineWidth = 1.6; c.setLineDash([6, 4]); c.beginPath();
    c.moveTo(PX(lx0), PY(rs.b0 + rs.J * lx0)); c.lineTo(PX(lx1), PY(rs.b0 + rs.J * lx1)); c.stroke(); c.setLineDash([]);
    c.fillStyle = PRINT.red; c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText(`slope J = ${rs.J.toFixed(2)}`, fr.l + 10, PY(rs.b0 + rs.J * lx0) - 6);
  });
  const INFO_D = {
    gauss: 'No memory, finite variance: the benchmark. R/S grows like √d, so the fitted slope sits near J = 1/2 (a touch above on short samples).',
    fgn: 'The increments of a fractional Brown function: genuinely long-run dependent. The slope follows the noise’s own H — persistence tips it above 1/2, antipersistence below.',
    levy: 'Infinite variance — the record is all spikes and ⟨X²⟩ means nothing — yet the spikes carry no memory, and J stays near 1/2. This robustness against the marginal law is the technique’s principal virtue.',
    walk: 'A record that is only stationary when differenced. R/S saturates its range: J = 1, the technique’s signal that the record itself, not its increments, should have been analyzed.',
  };
  function setD() {
    markPD(stD.proc);
    $('hDwrap').hidden = stD.proc !== 'fgn';
    $('hDv').textContent = `H = ${stD.H.toFixed(2)}`;
    const { rs } = dataD();
    $('cDt').textContent = 'R/S pox plot';
    $('cDn').textContent = `${PROCS_D[stD.proc]}${stD.proc === 'fgn' ? `, H = ${stD.H.toFixed(2)}` : ''} · fitted J = ${rs.J.toFixed(2)}`;
    $('infoD').innerHTML = INFO_D[stD.proc];
    $('rDa').textContent = rs.J.toFixed(2);
    const th = THEORY_D[stD.proc]();
    $('rDb').textContent = stD.proc === 'fgn' ? `H = ${th.toFixed(2)}` : String(th);
    $('rDc').textContent = { gauss: '1', fgn: '1', levy: '∞', walk: 'grows with t' }[stD.proc];
    zD.schedule();
  }
  const markPD = stepButtons($('pD'), Object.keys(PROCS_D), (k) => PROCS_D[k], (k) => `Record: ${PROCS_D[k]}`, (k) => { stD.proc = k; setD(); });
  $('hDs').addEventListener('input', (e) => { stD.H = +e.target.value; setD(); });
  $('seedD').addEventListener('click', () => { stD.seed++; setD(); });
  $('presetD').addEventListener('click', () => { Object.assign(stD, { proc: 'fgn', H: 0.7 }); $('hDs').value = 0.7; setD(); });

  // ====================== 5 · Weierstrass ======================
  const stE = { mode: 'w0', D: 1.5, b: 1.5, m: 0, seed: 3 };
  let facE = { key: '', fac: null };
  function factorsE() {
    const key = String(stE.seed);
    if (facE.key !== key) facE = { key, fac: weierGaussFactors(1234 + stE.seed * 11, -40, 120) };
    return facE.fac;
  }
  const MODES_E = { w0: 'Original W₀', w1: 'Modified W₁', rand: 'Gauss randomized', spec: 'Energy spectrum' };
  function curveE(mode, m, cols) {
    const b = stE.b, H = 2 - stE.D, w = Math.pow(b, -H);
    const bm = Math.pow(b, m), wm = Math.pow(w, m), fMax = (2.2 * cols) / bm;
    const out = new Float64Array(cols + 1);
    const fac = mode === 'rand' ? factorsE() : null;
    const base = mode === 'w0' ? weierW0(0, b, w, fMax) : 0;
    for (let k = 0; k <= cols; k++) {
      const t = (k / cols) * bm;
      out[k] = wm * (mode === 'w0' ? weierW0(t, b, w, fMax) - base : mode === 'w1' ? weierW1(t, b, w, fMax) : weierGauss(t, b, w, fMax, fac, -40));
    }
    return out;
  }
  const zE = zoomable('wE', 'cE', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }), (f) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const b = stE.b, H = 2 - stE.D, w = Math.pow(b, -H);
    if (stE.mode === 'spec') {
      const fr = frame(c, f, { l: 52, r: 14, t: 14, b: 34 }, 'log₁₀ frequency f', 'log₁₀ energy');
      const lb = Math.log10(b), x0 = -2.6, x1 = 4.2;
      const nLo = Math.ceil(x0 / lb), nHi = Math.floor(x1 / lb);
      const yOf = (n) => 2 * n * Math.log10(w);
      let yMin = Math.min(yOf(nHi), yOf(nLo)) - 0.5, yMax = Math.max(yOf(nHi), yOf(nLo)) + 0.5;
      const X = (lx) => fr.X((lx - x0) / (x1 - x0)), Y = (ly) => fr.Y((ly - yMin) / (yMax - yMin));
      c.font = `500 10.5px ${MONO}`; c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let e = Math.ceil(x0); e <= Math.floor(x1); e++) { gridline(c, X(e), fr.t, X(e), fr.t + fr.ih); c.fillText(`10${e < 0 ? '⁻' : ''}${sup(Math.abs(e))}`, X(e), fr.t + fr.ih + 5); }
      for (let n = nLo; n <= nHi; n++) {
        const lx = n * lb, added = n < 0;
        c.strokeStyle = added ? PRINT.accent : PRINT.ink; c.lineWidth = added ? 1.4 : 2;
        if (added) c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(X(lx), fr.t + fr.ih); c.lineTo(X(lx), Y(yOf(n))); c.stroke(); c.setLineDash([]);
      }
      c.strokeStyle = PRINT.red; c.lineWidth = 1.4; c.setLineDash([6, 4]);
      c.beginPath(); c.moveTo(X(x0), Y(-2 * H * x0)); c.lineTo(X(x1), Y(-2 * H * x1)); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.red; c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText(`f⁻²ᴴ, H = ${H.toFixed(2)}`, X(x1 - 0.1), Y(-2 * H * (x1 - 0.1)) - 8);
      c.fillStyle = PRINT.accent; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText('dashed blue: the lines W₁ adds below f = 1', fr.l + 8, fr.t + fr.ih - 6);
    } else {
      const cols = Math.min(760, Math.max(320, Math.round(f.w)));
      const ref = curveE(stE.mode === 'rand' ? 'rand' : stE.mode, 0, cols);
      let lo = Infinity, hi = -Infinity;
      for (const v of ref) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const pad = 0.1 * (hi - lo || 1);
      lo -= pad; hi += pad;
      const fr = frame(c, f, { l: 46, r: 12, t: 14, b: 30 }, stE.m ? `t, after t → b${sup(stE.m)}t, X → w${sup(stE.m)}X` : 't from 0 to 1', null);
      const X = (k) => fr.l + (k / cols) * fr.iw, Y = (v) => fr.t + fr.ih - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * fr.ih;
      gridline(c, fr.l, Y(0), fr.l + fr.iw, Y(0));
      if (stE.m > 0) {
        c.strokeStyle = PRINT.gray; c.lineWidth = 1.1; c.beginPath();
        for (let k = 0; k <= cols; k++) { if (k) c.lineTo(X(k), Y(ref[k])); else c.moveTo(X(k), Y(ref[k])); }
        c.stroke();
      }
      const cur = stE.m === 0 ? ref : curveE(stE.mode === 'rand' ? 'rand' : stE.mode, stE.m, cols);
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.4; c.beginPath();
      for (let k = 0; k <= cols; k++) { if (k) c.lineTo(X(k), Y(cur[k])); else c.moveTo(X(k), Y(cur[k])); }
      c.stroke();
      if (stE.m > 0) {
        c.fillStyle = PRINT.muted; c.font = `500 10.5px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'top';
        c.fillText(stE.mode === 'w1' ? 'gray: the unrescaled curve — it coincides' : 'gray: the unrescaled curve — it does not coincide', fr.l + 8, fr.t + 6);
      }
    }
  });
  const INFO_E = {
    w0: () => (stE.m === 0
      ? 'The original sum, frequencies bⁿ from n = 0 up. It is periodic with period 1 — its spectrum stops at f = 1, so it cannot be scaling at the low-frequency end.'
      : 'Rescaled: time squeezed by b, height by w, m times over. The fine wiggles map onto each other but the sweep does not — the missing frequencies below f = 1 (the IR cutoff) break self-affinity.'),
    w1: () => (stE.m === 0
      ? 'Subtract W(0) first, then let n run to −∞: the added low-frequency terms converge and are smooth, and the sum is scaling down to f = 0.'
      : 'Rescaled: wᵐ[W₁(bᵐt) − W₁(0)] lands exactly on the unrescaled curve, for every m — the repaired function is self-affine about its focal time t = 0.'),
    rand: () => 'Every Fourier coefficient multiplied by its own complex Gaussian: a stationary random cousin of W₁ whose spectrum is as close to the fractional Brown function’s f⁻²ᴴ⁻¹ as a discrete spectrum can be. Rescaling now reproduces the law, not the sample.',
    spec: () => 'Energy against frequency, on log paper: spectral lines at f = bⁿ with energies w²ⁿ sit on the scaling line f⁻²ᴴ. Weierstrass’s sum keeps only n ≥ 0 (black); extending to n < 0 (dashed blue) is the infrared repair that W₁ survives by first subtracting W(0).',
  };
  function setE() {
    markME(stE.mode); markZE(stE.m);
    const H = 2 - stE.D, w = Math.pow(stE.b, -H);
    $('zWrap').hidden = stE.mode === 'spec';
    $('seedE').hidden = stE.mode !== 'rand';
    $('dEv').textContent = `D = ${stE.D.toFixed(2)}`;
    $('bEv').textContent = `b = ${stE.b.toFixed(1)}`;
    $('zEv').textContent = stE.m === 0 ? 'as is' : `m = ${stE.m}: ×b${sup(stE.m)} in, ×w${sup(stE.m)} down`;
    $('cEt').textContent = MODES_E[stE.mode];
    $('cEn').textContent = `b = ${stE.b.toFixed(1)}, H = ${H.toFixed(2)}, w = b⁻ᴴ = ${w.toFixed(3)}`;
    $('infoE').innerHTML = INFO_E[stE.mode]();
    $('rEa').textContent = H.toFixed(2);
    $('rEb').textContent = w.toFixed(4);
    $('rEc').textContent = (2 - H).toFixed(2);
    $('rEd').textContent = (1 - H).toFixed(2);
    $('dimE').innerHTML = `W₀(t) = (1−w²)<sup>−1/2</sup> Σ₀<sup>∞</sup> wⁿ exp(2πibⁿt) · w = b⁻ᴴ = ${w.toFixed(3)} · graph D = ${(2 - H).toFixed(2)}, conjectured`;
    zE.schedule();
  }
  const markME = stepButtons($('mE'), Object.keys(MODES_E), (k) => MODES_E[k], (k) => `Show ${MODES_E[k]}`, (k) => { stE.mode = k; setE(); });
  const markZE = stepButtons($('zE'), [0, 1, 2, 3], (m) => (m === 0 ? '×1' : `×b${sup(m)}`), (m) => `Rescale ${m} times`, (m) => { stE.m = m; setE(); });
  $('dEs').addEventListener('input', (e) => { stE.D = +e.target.value; setE(); });
  $('bEs').addEventListener('input', (e) => { stE.b = +e.target.value; setE(); });
  $('seedE').addEventListener('click', () => { stE.seed++; setE(); });
  $('presetE').addEventListener('click', () => { Object.assign(stE, { D: 1.5, b: 1.5, m: 0, mode: 'w0' }); $('dEs').value = 1.5; $('bEs').value = 1.5; setE(); });

  setA(); setB(true); setC(); setD(); setE();
})();
