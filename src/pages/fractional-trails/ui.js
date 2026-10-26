(() => {
  const pow = Math.pow, sup = (s) => String(s).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).replace(/\./g, '·');
  const hFmt = (h) => h.toFixed(h * 200 % 2 ? 3 : 2);
  const MONO = '500 10.5px "IBM Plex Mono", monospace';

  // axes of a doubly logarithmic chart in screen space; returns X(u), Y(u) in pixels
  function logChart(f, c, lx0, lx1, ly0, ly1, xlab, ylab) {
    const ml = 56, mr = 14, mt = 14, mb = 36, iw = f.w - ml - mr, ih = f.h - mt - mb;
    const X = (u) => ml + ((Math.log10(u) - lx0) / (lx1 - lx0)) * iw;
    const Y = (u) => mt + ih - ((Math.log10(u) - ly0) / (ly1 - ly0)) * ih;
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, mt, iw, ih);
    c.font = MONO; c.fillStyle = PRINT.muted;
    const tick = (e) => `10${e < 0 ? '⁻' : ''}${sup(Math.abs(e))}`;
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (let e = Math.ceil(lx0); e <= Math.floor(lx1); e++) {
      const x = ml + ((e - lx0) / (lx1 - lx0)) * iw;
      c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(x, mt); c.lineTo(x, mt + ih); c.stroke();
      c.fillText(tick(e), x, mt + ih + 6);
    }
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let e = Math.ceil(ly0); e <= Math.floor(ly1); e++) {
      const y = mt + ih - ((e - ly0) / (ly1 - ly0)) * ih;
      c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(ml, y); c.lineTo(ml + iw, y); c.stroke();
      c.fillText(tick(e), ml - 6, y);
    }
    c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(xlab, ml + iw / 2, f.h - 16);
    c.save(); c.translate(14, mt + ih / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText(ylab, 0, 0); c.restore();
    return { X, Y, ml, mt, iw, ih };
  }

  // ====================== Plate 255: the trails ======================
  const stA = { mode: 'printed', H: 0.9, seed: 2, n: 4096 };
  // each trail normalised into a unit box so two values of H sit side by side as in the plate
  function placed(P, x0) {
    const bb = bbox(P), s = 1 / Math.max(1e-9, bb.y1 - bb.y0, bb.x1 - bb.x0);
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const out = new Float64Array(P.length);
    for (let i = 0; i < P.length; i += 2) { out[i] = x0 + 0.5 + (P[i] - cx) * s; out[i + 1] = 0.5 + (P[i + 1] - cy) * s; }
    return out;
  }
  const cacheA = {};
  function dataA() {
    const key = `${stA.mode}|${stA.H}|${stA.seed}|${stA.n}`;
    if (cacheA[key]) return cacheA[key];
    for (const k in cacheA) delete cacheA[k];
    let out;
    if (stA.mode === 'printed') {
      const L = placed(trail(stA.n, 0.9, stA.seed), 0), R = placed(trail(stA.n, 0.7, stA.seed), 0);
      const dx = bbox(L).x1 + 0.3 - bbox(R).x0;
      for (let i = 0; i < R.length; i += 2) R[i] += dx;
      out = { trails: [L, R], bb: bbox(R, bbox(L)) };
    } else {
      const P = trail(stA.n, stA.H, stA.seed);
      out = { trails: [P], bb: bbox(P) };
    }
    return (cacheA[key] = out);
  }
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, dataA().bb, 0.05), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 1.15 / v.s;
    for (const P of dataA().trails) c.stroke(polyPath(P, false));
    toScreen(f);
  });
  function setA(refit) {
    markMA(stA.mode); markNA(stA.n);
    const single = stA.mode === 'single', H = stA.H, D = Math.min(2, 1 / H);
    $('hA').disabled = !single;
    $('hAv').textContent = single ? `H = ${hFmt(H)}` : 'H = 0.90 and 0.70';
    $('cAt').textContent = single ? 'One trail' : 'As printed';
    $('cAn').textContent = single ? `H = ${hFmt(H)} · D = ${D.toFixed(4)}` : 'H = 0.9 and H = 0.7, same seed';
    $('nAv').textContent = fmt(stA.n);
    $('rAa').textContent = single ? `D = ${D.toFixed(4)}` : '1.1111 and 1.4285';
    $('rAb').textContent = single ? `Δt${sup(hFmt(H))}` : 'Δt⁰·⁹ and Δt⁰·⁷';
    $('rAc').textContent = fmt(stA.n);
    $('rAd').textContent = String(stA.seed);
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), ['printed', 'single'], (k) => (k === 'printed' ? 'Both, as printed' : 'One trail'), (k) => (k === 'printed' ? 'Both trails as printed' : 'A single trail'), (k) => { stA.mode = k; setA(true); });
  const markNA = stepButtons($('nA'), [1024, 4096, 8192], fmt, (n) => `${n} steps`, (n) => { stA.n = n; setA(true); });
  $('hA').addEventListener('input', (e) => { stA.H = +e.target.value; setA(true); });
  $('seedA').addEventListener('click', () => { stA.seed += 1; setA(true); });
  $('plate255').addEventListener('click', () => { Object.assign(stA, { mode: 'printed', H: 0.9, seed: 2, n: 4096 }); $('hA').value = 0.9; setA(true); });

  // ====================== The Joseph Effect ======================
  const stB = { H: 0.9, seed: 11, n: 1024 };
  const fB = figure($('cB'), () => drawB());
  function drawB() {
    const f = fB, c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const X = fgn(stB.n, stB.H, stB.seed), B = cumsum(X);
    const ml = 16, mr = 16, iw = f.w - ml - mr;
    const panel = (vals, y0, hgt, title, bar) => {
      let lo = Infinity, hi = -Infinity;
      for (const u of vals) { if (u < lo) lo = u; if (u > hi) hi = u; }
      const pad = (hi - lo) * 0.08 + 1e-9;
      lo -= pad; hi += pad;
      const Y = (u) => y0 + hgt - ((u - lo) / (hi - lo)) * hgt;
      const Xp = (i) => ml + (i / (vals.length - 1)) * iw;
      c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, y0, iw, hgt);
      if (lo < 0 && hi > 0) { c.strokeStyle = '#d8d6cd'; c.beginPath(); c.moveTo(ml, Y(0)); c.lineTo(ml + iw, Y(0)); c.stroke(); }
      c.strokeStyle = PRINT.ink; c.lineWidth = bar ? 0.7 : 1.3; c.lineJoin = 'round';
      c.beginPath();
      if (bar) for (let i = 0; i < vals.length; i++) { c.moveTo(Xp(i), Y(0)); c.lineTo(Xp(i), Y(vals[i])); }
      else for (let i = 0; i < vals.length; i++) { if (i) c.lineTo(Xp(i), Y(vals[i])); else c.moveTo(Xp(i), Y(vals[i])); }
      c.stroke();
      c.font = MONO; c.fillStyle = PRINT.muted; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText(title, ml + 6, y0 - 4);
    };
    const h1 = Math.round(f.h * 0.48), top2 = h1 + 46;
    panel(Array.from(B), 24, h1 - 24, `cumulated discharge  B_H(t)`, false);
    panel(Array.from(X), top2, f.h - top2 - 14, 'yearly discharges (the increments)', true);
  }
  function setB() {
    const H = stB.H;
    $('hBv').textContent = `H = ${hFmt(H)}`;
    $('cBn').textContent = `${fmt(stB.n)} years · H = ${hFmt(H)}`;
    $('rBa').textContent = `D = ${(2 - H).toFixed(2)}`;
    $('rBb').textContent = `D = ${(1 - H).toFixed(2)}`;
    $('rBc').textContent = `|Δt|${sup((2 * H).toFixed(2))}`;
    $('rBd').textContent = H > 0.52 ? 'persistent' : H < 0.48 ? 'antipersistent' : 'independent';
    drawB();
  }
  $('hB').addEventListener('input', (e) => { stB.H = +e.target.value; setB(); });
  $('nileB').addEventListener('click', () => { stB.H = 0.9; $('hB').value = 0.9; setB(); });
  $('rhineB').addEventListener('click', () => { stB.H = 0.5; $('hB').value = 0.5; setB(); });
  $('seedB').addEventListener('click', () => { stB.seed += 1; setB(); });

  // ====================== Hurst's R/S and the spectrum ======================
  const stC = { mode: 'rs', H: 0.9, seed: 21, n: 8192 };
  const DS = Array.from({ length: 8 }, (_, i) => 8 << i);          // 8 … 1024
  let fitC = { slope: 0 };
  const fC = figure($('cC'), () => drawC());
  function drawC() {
    const f = fC, c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const X = fgn(stC.n, stC.H, stC.seed);
    if (stC.mode === 'rs') {
      const pts = rsPoints(X, DS), fit = logSlope(pts.filter(([d]) => d >= 64));
      fitC = fit;
      const lx0 = Math.log10(6), lx1 = Math.log10(1500);
      const ly1 = Math.log10(pts[pts.length - 1][1]) + 0.35;
      const A = logChart(f, c, lx0, lx1, 0, Math.max(1.2, ly1), 'span d (years)', 'R(d)/S(d)');
      // reference √d through the first dot
      const ref0 = pts[0][1];
      c.strokeStyle = PRINT.gray; c.lineWidth = 1.2; c.setLineDash([3, 4]); c.beginPath();
      c.moveTo(A.X(8), A.Y(ref0)); c.lineTo(A.X(1024), A.Y(ref0 * Math.sqrt(1024 / 8))); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.gray; c.font = MONO; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText('slope ½ (white noise)', A.X(40), A.Y(ref0 * Math.sqrt(40 / 8)) + 8);
      // fitted line
      c.strokeStyle = PRINT.red; c.lineWidth = 1.4; c.setLineDash([6, 4]); c.beginPath();
      c.moveTo(A.X(6), A.Y(pow(10, fit.icept + fit.slope * Math.log10(6))));
      c.lineTo(A.X(1500), A.Y(pow(10, fit.icept + fit.slope * Math.log10(1500)))); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.red; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText(`slope H ≈ ${fit.slope.toFixed(3)}`, A.ml + 10, A.mt + 22);
      c.fillStyle = PRINT.ink;
      for (const [d, rs] of pts) { c.beginPath(); c.arc(A.X(d), A.Y(rs), 3.2, 0, 2 * Math.PI); c.fill(); }
    } else {
      const pts = spectrumPoints(X), fit = logSlope(pts);
      fitC = fit;
      let lo = Infinity, hi = -Infinity;
      for (const [, s] of pts) { lo = Math.min(lo, s); hi = Math.max(hi, s); }
      const A = logChart(f, c, Math.log10(pts[0][0]) - 0.15, Math.log10(0.5) + 0.1, Math.log10(lo) - 0.4, Math.log10(hi) + 0.4, 'frequency f (cycles/year)', 'spectral density');
      const beta = 2 * stC.H - 1;
      // theory line 1/f^beta through the cloud's centre
      let mx = 0, my = 0;
      for (const [fq, s] of pts) { mx += Math.log10(fq); my += Math.log10(s); }
      mx /= pts.length; my /= pts.length;
      c.strokeStyle = PRINT.red; c.lineWidth = 1.4; c.setLineDash([6, 4]); c.beginPath();
      const yAt = (fq) => pow(10, my - beta * (Math.log10(fq) - mx));
      c.moveTo(A.X(pts[0][0]), A.Y(yAt(pts[0][0]))); c.lineTo(A.X(0.5), A.Y(yAt(0.5))); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.red; c.font = MONO; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText(`theory 1/f^β, β = ${beta.toFixed(2)} · measured β ≈ ${(-fit.slope).toFixed(2)}`, A.ml + 10, A.mt + 22);
      c.fillStyle = PRINT.ink;
      for (const [fq, s] of pts) { c.beginPath(); c.arc(A.X(fq), A.Y(s), 3, 0, 2 * Math.PI); c.fill(); }
    }
  }
  const CAP_C = {
    rs: 'Hurst measured rivers with the rescaled range: over each span of d years, R(d) is the reservoir capacity ideal performance would have needed — the range of the cumulated, detrended discharge — and S(d) the standard deviation. White noise and every textbook process give R/S ∝ √d. The Nile\'s records instead gave R/S ∝ d<sup>0.9</sup>. The diagram plots R/S for the simulated discharges on doubly logarithmic paper, one dot per span d, averaged over the blocks in 8,192 years. The fitted slope recovers H; it is fitted over the longer spans, because short spans feel a transient. Near H = 1 the slope still reads a few hundredths low at this sample size — a known bias of R/S, not of the noise.',
    sp: 'The other test of scaling is the spectrum. A noise is spectrally scaling when its spectral density follows 1/f^β: a straight line on doubly logarithmic paper. For fractional Gaussian noise β = 2H − 1, so the persistent noises of this chapter, H near 1, are "1/f noises" — the hiss with equal power per octave found in electronics, music and river records alike. Each dot averages the periodogram of the simulated discharges over a band of frequencies.',
  };
  function setC() {
    markMC(stC.mode);
    const H = stC.H, beta = 2 * H - 1;
    $('hCv').textContent = `H = ${hFmt(H)}`;
    $('capC').innerHTML = CAP_C[stC.mode === 'rs' ? 'rs' : 'sp'];
    $('cCt').textContent = stC.mode === 'rs' ? "Hurst's diagram" : 'The spectrum';
    $('cCn').textContent = `${fmt(stC.n)} years · H = ${hFmt(H)}`;
    $('rCa').textContent = hFmt(H);
    $('rCc').textContent = stC.mode === 'rs' ? `H = ${hFmt(H)}` : `β = ${beta.toFixed(2)}`;
    $('rCd').textContent = beta > 0.05 ? `1/f${sup(beta.toFixed(2))}` : beta < -0.05 ? `f${sup((-beta).toFixed(2))}` : 'white (flat)';
    drawC();                                   // computes the fitted slope
    $('rCb').textContent = stC.mode === 'rs' ? `H ≈ ${fitC.slope.toFixed(3)}` : `β ≈ ${(-fitC.slope).toFixed(2)}`;
  }
  const markMC = stepButtons($('mC'), ['rs', 'spectrum'], (k) => (k === 'rs' ? "Hurst's R/S" : 'The spectrum'), (k) => (k === 'rs' ? 'Rescaled range diagram' : 'Spectral density diagram'), (k) => { stC.mode = k; setC(); });
  $('hC').addEventListener('input', (e) => { stC.H = +e.target.value; setC(); });
  $('seedC').addEventListener('click', () => { stC.seed += 1; setC(); });

  setA(true); setB(); setC();
})();
