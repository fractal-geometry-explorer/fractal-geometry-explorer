(() => {
  const pow = Math.pow, log10 = (x) => Math.log(x) / Math.LN10;
  const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x) => { if (x >= 0.01 && x < 1000) return x.toPrecision(3); const [m, e] = x.toExponential(1).split('e'); return `${m}·10${sup(+e)}`; };
  const MONO = '500 10.5px "IBM Plex Mono", monospace';

  // a screen-space chart frame with margins; returns the plot rectangle
  function frame(c, f, ml = 52, mr = 14, mt = 14, mb = 36) {
    const iw = f.w - ml - mr, ih = f.h - mt - mb;
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, mt, iw, ih);
    c.font = MONO;
    return { ml, mt, iw, ih };
  }
  const xlabel = (c, f, r, s) => { c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(s, r.ml + r.iw / 2, f.h - 16); };
  const ylabel = (c, r, s) => { c.save(); c.translate(14, r.mt + r.ih / 2); c.rotate(-Math.PI / 2); c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, 0); c.restore(); };
  const dotAt = (c, x, y, color) => { c.beginPath(); c.arc(x, y, 4.5, 0, 2 * Math.PI); c.fillStyle = color; c.fill(); c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke(); };

  // ====================== 1: stringing singularities together ======================
  const stA = { mode: 'rational', D: 0.5 };
  // the graph's y is drawn at a gentler scale than x, so the picture fills the frame
  const ysA = () => (stA.mode === 'rational' ? 0.1 : 0.08);
  const zA = zoomable('wA', 'cA', (f) => {
    const k = ysA();
    if (stA.mode === 'rational') return fitBox(f, { x0: -1.05, x1: 1.05, y0: -4.2 * k, y1: 4.2 * k }, 0.03);
    return fitBox(f, { x0: -0.08, x1: 1.08, y0: -1.1 * k, y1: 8.6 * k }, 0.03);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const X = (x) => v.ox + x * v.s, Y = (y) => v.oy - y * ysA() * v.s;
    const vx0 = -v.ox / v.s, vx1 = (f.w - v.ox) / v.s, px = 1 / v.s;
    const clampY = (sy) => Math.max(-60, Math.min(f.h + 60, sy));
    // the axis and its ticks
    c.strokeStyle = PRINT.rule; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(f.w, Y(0)); c.stroke();
    c.font = MONO; c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
    for (const t of stA.mode === 'rational' ? [-1, -0.5, 0.5, 1] : [0, 1]) if (t > vx0 && t < vx1) c.fillText(String(t), X(t), Y(0) + (stA.mode === 'rational' ? 6 : 26));
    if (stA.mode === 'rational') {
      // the finite list of singularities: dashed asymptotes and a dot per pole
      c.strokeStyle = PRINT.faint; c.setLineDash([5, 4]); c.beginPath();
      for (const p of POLES) { c.moveTo(X(p), 0); c.lineTo(X(p), f.h); }
      c.stroke(); c.setLineDash([]);
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath();
      let prev = null;
      for (let i = 0; i <= f.w; i++) {
        const x = (i - v.ox) / v.s, y = Math.max(-1e6, Math.min(1e6, fRational(x))), sy = clampY(Y(y));
        if (prev !== null && y * prev < 0 && Math.abs(y) > 3 && Math.abs(prev) > 3) c.moveTo(i, sy);
        else prev === null ? c.moveTo(i, sy) : c.lineTo(i, sy);
        prev = y;
      }
      c.stroke();
      for (const p of POLES) dotAt(c, X(p), Y(0), PRINT.red);
    } else {
      const r = ratioOf(stA.D), d0 = (1 - 2 * r) / 2;
      // the singular set itself, on the axis
      const band = new Path2D();
      const pieces = dustPieces(r, px, vx0, vx1);
      for (let i = 0; i < pieces.length; i += 2) band.rect(X(pieces[i]), Y(0) + 14, Math.max(1, pieces[i + 1] * v.s), 7);
      c.fillStyle = PRINT.red; c.fill(band);
      // f = d0 / dist(x, C): per column, the largest of three subsamples catches the spike
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath();
      let pen = false;
      for (let i = 0; i <= f.w; i++) {
        let y = 0;
        for (let s = -1; s <= 1; s++) y = Math.max(y, d0 / Math.max(1e-12, distDust((i + s / 3 - v.ox) / v.s, r)));
        const sy = clampY(Y(Math.min(y, 1e6))), off = sy < -30;
        if (off && pen) { pen = false; continue; }
        pen && !off ? c.lineTo(i, sy) : c.moveTo(i, sy);
        pen = true;
      }
      c.stroke();
    }
  }, { maxZoom: 1e5 });
  const MODES_A = { rational: 'Three points (a rational function)', dust: 'A Cantor dust' };
  const INFO_A = {
    rational: 'Three poles, each an isolated point: the graph blows up there and is smooth everywhere else. The whole story of the function is the finite list of its singularities — the red dots — and zooming in on one shows just that one.',
    dust: 'Here the function blows up on a Cantor dust (red, on the axis): between any two spikes lie more spikes. No finite list captures the singular set — zoom in anywhere on the dust and the picture splits again, without end.',
  };
  function setA(refit) {
    markMA(stA.mode);
    $('dWrapA').hidden = stA.mode !== 'dust';
    const D = stA.D;
    $('DAv').textContent = `D = ${D.toFixed(2)}`;
    $('dimA').textContent = stA.mode === 'rational'
      ? 'standard singularities: points, curves and surfaces · here, three poles · dimension of the singular set: 0'
      : `singular on the dust C(r), r = 2^(−1/D) ≈ ${ratioOf(D).toFixed(3)} · dimension of the singular set: D = ${D.toFixed(2)}`;
    $('cAt').textContent = stA.mode === 'rational' ? 'A rational function' : 'Singular on a dust';
    $('cAn').textContent = stA.mode === 'rational' ? 'poles at −0.62, 0.08 and 0.66' : `f = 1/dist to a dust of dimension ${D.toFixed(2)}`;
    $('infoA').innerHTML = INFO_A[stA.mode];
    $('rAa').textContent = stA.mode === 'rational' ? '3 points' : 'a Cantor dust';
    $('rAb').textContent = stA.mode === 'rational' ? '0' : D.toFixed(3);
    $('rAc').textContent = stA.mode === 'rational' ? 'f ~ 1/(x − p)' : 'f ~ 1/dist(x, C)';
    $('rAd').textContent = stA.mode === 'rational' ? 'one isolated pole' : 'the same dust';
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Singular on: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  $('DAs').addEventListener('input', (e) => { stA.D = +e.target.value; setA(false); });
  $('pA1').addEventListener('click', () => { stA.mode = 'rational'; setA(true); });
  $('pA2').addEventListener('click', () => { stA.mode = 'dust'; stA.D = 0.5; $('DAs').value = 0.5; setA(true); });

  // ====================== 2: the zoom test ======================
  const stB = { mode: 'dust' };
  const ANCHOR = { point: [0, 0], curve: [0, 0], dust: [0.25, 0.25] };
  const zB = zoomable('wB', 'cB', (f) => {
    const [ax, ay] = ANCHOR[stB.mode];
    return fitBox(f, { x0: ax - 0.85, x1: ax + 0.85, y0: ay - 0.85, y1: ay + 0.85 }, 0.02);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    if (stB.mode === 'point') {
      c.beginPath(); c.arc(v.ox, v.oy, 5, 0, 2 * Math.PI); c.fillStyle = PRINT.ink; c.fill();
    } else if (stB.mode === 'curve') {
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i <= f.w; i++) {
        const x = (i - v.ox) / v.s, sy = Math.max(-20, Math.min(f.h + 20, v.oy - x * x * v.s));
        i ? c.lineTo(i, sy) : c.moveTo(i, sy);
      }
      c.stroke();
    } else {
      const px = 1 / v.s, vx0 = -v.ox / v.s, vx1 = (f.w - v.ox) / v.s, vy0 = (v.oy - f.h) / v.s, vy1 = v.oy / v.s;
      c.fillStyle = PRINT.ink;
      dustSquares(px, vx0 - px, vx1 + px, vy0 - px, vy1 + px, (x, y, w) => {
        c.globalAlpha = Math.min(1, pow(w * v.s, DUST2_D));
        c.fillRect(v.ox + x * v.s, v.oy - (y + w) * v.s, Math.max(1, w * v.s), Math.max(1, w * v.s));
      });
      c.globalAlpha = 1;
    }
    // the zoom's fixed point, marked
    const [ax, ay] = ANCHOR[stB.mode];
    dotAt(c, v.ox + ax * v.s, v.oy - ay * v.s, PRINT.red);
    $('rBb').textContent = `${sci(v.s / v.fit)}×`;
  }, { maxZoom: 1e6 });
  const MODES_B = { point: 'A point', curve: 'A smooth curve', dust: 'A fractal dust' };
  const INFO_B = {
    point: 'A point survives any magnification — it is scale-free, and it is standard. Singularities at isolated points head the classical list, and they are the first to have failed for turbulence.',
    curve: 'The parabola fails the test: a few ×9 zooms iron the arc into a featureless straight line. A smooth curve carries a built-in scale, its radius of curvature — and the scale-free Euler equations have nowhere to get one from.',
    dust: 'The dust passes: every ×9 zoom, centred on the red point (which belongs to it), reproduces it exactly. Scale-free like a point or a line, but with fractional dimension — "the next best known sets" once the standard ones proved inadequate.',
  };
  function setB(refit) {
    markMB(stB.mode);
    $('cBt').textContent = MODES_B[stB.mode];
    $('cBn').textContent = 'the zoom stays centred on the red point of the set';
    $('infoB').innerHTML = INFO_B[stB.mode];
    $('rBa').textContent = stB.mode === 'point' ? '0' : stB.mode === 'curve' ? '1' : `log 4/log 3 ≈ ${DUST2_D.toFixed(3)}`;
    $('rBc').textContent = stB.mode === 'point' ? 'the same point' : stB.mode === 'curve' ? 'a straight line' : 'the same dust';
    $('rBd').textContent = stB.mode === 'curve' ? 'its curvature' : 'none';
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Candidate set: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(true); });
  function zoomCentre(k) {
    const v = zB.z.view;
    if (!v) return;
    const px = zB.f.w / 2, py = zB.f.h / 2, ns = Math.min(v.fit * 1e6, Math.max(v.fit * 0.8, v.s * k));
    const wx = (px - v.ox) / v.s, wy = (v.oy - py) / v.s;
    v.s = ns; v.ox = px - wx * ns; v.oy = py + wy * ns; zB.z.user = true; zB.schedule();
  }
  $('zBin').addEventListener('click', () => zoomCentre(9));
  $('zBout').addEventListener('click', () => zoomCentre(1 / 9));

  // ====================== 3: Chorin's D ≈ 2.5 ======================
  const stC = { mode: 'check', D: 2.5 };
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0), (f) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const r = frame(c, f);
    if (stC.mode === 'check') {
      const X = (D) => r.ml + (D - 2) * r.iw, Y = (B) => r.mt + (1 - B / 0.36) * r.ih;
      c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      for (const D of [2, 2.25, 2.5, 2.75, 3]) c.fillText(D.toFixed(2), X(D), r.mt + r.ih + 6);
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (const B of [0, 0.1, 0.2, 0.3]) c.fillText(B.toFixed(1), r.ml - 6, Y(B));
      xlabel(c, f, r, 'dimension D of the vortex body'); ylabel(c, r, 'correction B to Kolmogorov');
      // Chorin's unpublished refinement, 2.5 < D < 2.6
      c.fillStyle = 'rgba(194,69,45,0.12)'; c.fillRect(X(2.5), r.mt, X(2.6) - X(2.5), r.ih);
      c.fillStyle = PRINT.red; c.textAlign = 'center'; c.fillText('2.5 < D < 2.6', (X(2.5) + X(2.6)) / 2, r.mt + r.ih - 18);
      // the curdling line B = (3 − D)/3
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(X(2), Y(1 / 3)); c.lineTo(X(3), Y(0)); c.stroke();
      c.fillStyle = PRINT.ink; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('B = (3 − D)/3', X(2.05), Y(specB(2.13)) - 6);
      // Chorin 1981: B = 0.17 ± 0.03 at D ≈ 2.5
      c.strokeStyle = PRINT.accent; c.lineWidth = 2; c.beginPath();
      c.moveTo(X(2.5), Y(0.14)); c.lineTo(X(2.5), Y(0.2));
      c.moveTo(X(2.5) - 5, Y(0.14)); c.lineTo(X(2.5) + 5, Y(0.14));
      c.moveTo(X(2.5) - 5, Y(0.2)); c.lineTo(X(2.5) + 5, Y(0.2));
      c.stroke();
      dotAt(c, X(2.5), Y(0.17), PRINT.accent);
      c.fillStyle = PRINT.accent; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('Chorin: 0.17 ± 0.03', X(2.5) + 10, Y(0.2) - 8);
      dotAt(c, X(stC.D), Y(specB(stC.D)), PRINT.red);
    } else {
      const X = (le) => r.ml + (-le / 3) * r.iw, Y = (lv) => r.mt + (-lv / 3) * r.ih;
      c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let e = 0; e >= -3; e--) {
        const x = X(e);
        if (e < 0) { c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(x, r.mt); c.lineTo(x, r.mt + r.ih); c.stroke(); }
        c.fillText(`10${sup(e)}`, x, r.mt + r.ih + 6);
      }
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let e = 0; e >= -3; e--) {
        const y = Y(e);
        if (e < 0) { c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(r.ml, y); c.lineTo(r.ml + r.iw, y); c.stroke(); }
        c.fillText(`10${sup(e)}`, r.ml - 6, y);
      }
      xlabel(c, f, r, 'thickness ε'); ylabel(c, r, 'volume of the thickened body');
      const line = (D, color, lw, dash = []) => {
        c.strokeStyle = color; c.lineWidth = lw; c.setLineDash(dash);
        const ex = 3 - D, le1 = Math.max(-3, -3 / Math.max(ex, 1e-9));
        c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(le1), Y(le1 * ex)); c.stroke(); c.setLineDash([]);
      };
      line(3, PRINT.faint, 1.4); line(2, PRINT.faint, 1.4);
      c.fillStyle = PRINT.muted; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText('D = 3: volume stays', X(-0.75), Y(0) + 6);
      c.fillText('D = 2', X(-2.45), Y(-2.45) + 6);
      line(stC.D, PRINT.red, 2.2);
      c.fillStyle = PRINT.red; c.textBaseline = 'bottom';
      const ex = 3 - stC.D;
      c.fillText(`D = ${stC.D.toFixed(2)}: volume ~ ε${sup(ex.toFixed(2))}`, X(-1.45), Y(-1.45 * ex) - 7);
    }
  });
  const MODES_C = { check: 'Exponent check', volume: 'Shrinking volume' };
  const INFO_C = {
    check: 'Chorin\'s measured correction falls on the curdling line within its error bar: a vortex calculation run on the equations, and chapter 10\'s geometry read off gusty records, meet at D ≈ 2.5. Slide D to see how tightly the two numbers pin each other down.',
    volume: 'Thicken the vortex body to thickness ε and measure the volume: for a set of dimension D it scales as ε^(3−D), shrinking to zero as the stretching proceeds. Yet with D > 2 the body still meets straight probes with positive probability — chapter 10\'s requirement.',
  };
  function setC(refit) {
    markMC(stC.mode);
    const D = stC.D, B = specB(D);
    $('DCv').textContent = `D = ${D.toFixed(2)}`;
    $('cCt').textContent = MODES_C[stC.mode];
    $('cCn').textContent = `B = (3 − ${D.toFixed(2)})/3 ≈ ${B.toFixed(3)}`;
    $('infoC').innerHTML = INFO_C[stC.mode];
    $('rCa').textContent = B.toFixed(4);
    $('rCc').textContent = sci(pow(10, -3 * (3 - D)));
    $('rCd').textContent = `~ k${sup(`-${(5 / 3 + B).toFixed(2)}`)}`;
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(false); });
  $('DCs').addEventListener('input', (e) => { stC.D = +e.target.value; setC(false); });
  const presetC = (D) => { stC.D = D; $('DCs').value = D; setC(false); };
  $('pC1').addEventListener('click', () => presetC(2.5));
  $('pC2').addEventListener('click', () => presetC(3));

  // ====================== 4: viscosity and Scheffer's bounds ======================
  const stD = { Dt: 0.5, k: 2, mark: true };
  // log-dissipation drawn at a scale that keeps the record as wide as the frame however high ν lets it climb
  const ysD = () => 0.65 / (stD.k + 2.6);
  const zD = zoomable('wD', 'cD', (f) => {
    const k = ysD();
    return fitBox(f, { x0: -0.06, x1: 1.06, y0: -2 * k, y1: (stD.k + 0.6) * k }, 0.03);
  }, (f, v) => {
    const c = f.ctx, r = ratioOf(stD.Dt), nu = pow(10, -stD.k);
    paper(f, PRINT.paper); toScreen(f);
    const X = (x) => v.ox + x * v.s, Y = (y) => v.oy - y * ysD() * v.s;
    const vx0 = -v.ox / v.s, vx1 = (f.w - v.ox) / v.s, px = 1 / v.s;
    // gridlines where the record reads 1, 10, 100, ...
    c.font = MONO; c.textAlign = 'left'; c.textBaseline = 'middle';
    for (let e = 0; e <= Math.ceil(stD.k); e++) {
      const y = Y(e);
      if (y < -20 || y > f.h + 20) continue;
      c.strokeStyle = '#dddbd2'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, y); c.lineTo(f.w, y); c.stroke();
      c.fillStyle = PRINT.muted; c.fillText(`10${sup(e)}`, 6, y - 8);
    }
    // the singular times, a dust on the time axis
    if (stD.mark) {
      const band = new Path2D(), pieces = dustPieces(r, px, vx0, vx1);
      for (let i = 0; i < pieces.length; i += 2) band.rect(X(pieces[i]), Y(-1.1), Math.max(1, pieces[i + 1] * v.s), 0.35 * ysD() * v.s);
      c.fillStyle = PRINT.red; c.fill(band);
    }
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y(-0.55)); c.lineTo(f.w, Y(-0.55)); c.stroke();
    c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
    for (const t of [0, 1]) if (t > vx0 && t < vx1) c.fillText(`t = ${t}`, X(t), Y(-1.78));
    // the record, log10 of 1/sqrt(dist² + ν²): per column, the largest of three subsamples
    c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i <= f.w; i++) {
      let eps = 0;
      for (let s = -1; s <= 1; s++) { const d = distDust((i + s / 3 - v.ox) / v.s, r); eps = Math.max(eps, 1 / Math.sqrt(d * d + nu * nu)); }
      const sy = Math.max(-30, Math.min(f.h + 30, Y(log10(eps))));
      i ? c.lineTo(i, sy) : c.moveTo(i, sy);
    }
    c.stroke();
  }, { maxZoom: 1e4 });
  function setD(refit) {
    const Dt = stD.Dt, nu = pow(10, -stD.k), ok = Dt <= 0.5001;
    $('DDv').textContent = `D = ${Dt.toFixed(2)}`;
    $('nDv').textContent = `ν = ${sci(nu)}`;
    $('cDn').textContent = `singular times: a dust of dimension ${Dt.toFixed(2)} · peaks reach 1/ν = ${sci(1 / nu)}`;
    $('infoD').innerHTML = ok
      ? `Allowed: singular times of dimension ${Dt.toFixed(2)} fit under Scheffer's ceiling of 1/2. Zoom into a peak — bursts split into bursts, the near-singularities of intermittency; shrink ν and they sharpen toward Euler's true singularities.`
      : `Forbidden: singular times of dimension ${Dt.toFixed(2)} would contradict the Leray–Scheffer inequality — a Navier–Stokes solution with finite energy at t = 0 cannot be this singular in time. The equations themselves cap their solutions' wildness.`;
    $('rDa').textContent = Dt.toFixed(3);
    $('rDb').textContent = ok ? 'satisfied (≤ 1/2)' : 'exceeded — ruled out';
    $('rDc').textContent = `~ 1/ν = ${sci(1 / nu)}`;
    if (refit) zD.refit(); else zD.schedule();
  }
  $('DDs').addEventListener('input', (e) => { stD.Dt = +e.target.value; setD(false); });
  $('nDs').addEventListener('input', (e) => { stD.k = +e.target.value; setD(true); });
  $('markD').addEventListener('change', (e) => { stD.mark = e.target.checked; setD(false); });
  $('pD1').addEventListener('click', () => { stD.Dt = 0.5; $('DDs').value = 0.5; setD(false); });
  $('pD2').addEventListener('click', () => { stD.k = 5; $('nDs').value = 5; setD(true); });

  setA(true); setB(true); setC(true); setD(true);
})();
