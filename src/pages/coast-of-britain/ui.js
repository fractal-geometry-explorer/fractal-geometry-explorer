(() => {

  // ====================== Plate 33 ======================
  const stA = { show: Object.fromEntries(P33_ORDER.map((k) => [k, true])), printed: true, refit: false, law: false };
  const CIRCLE_C = 1e4; // the smooth law drawn for a circle of circumference 10,000 km

  const fA = figure($('cA'), () => {
    const ch = chartFrame(fA, { x0: 0.85, x1: 3.65, y0: 2.55, y1: 4.35, tick: 0.5, xlabel: 'log₁₀ (length of side in kilometers)', ylabel: 'log₁₀ (total length in kilometers)', left: 50 });
    for (const k of P33_ORDER) {
      if (!stA.show[k]) continue;
      const S = P33[k];
      if (stA.printed && S.printed) ch.clipLine(S.printed.x1, S.printed.x2, S.printed.slope, S.printed.b, PRINT.ink);
      if (k === 'circle') {
        if (stA.law) {
          const pts = [];
          for (let t = 0; t <= 160; t++) {
            const lx = 0.9 + ((3.504 - 0.9) * t) / 160, L = circleLaw(CIRCLE_C, Math.pow(10, lx));
            if (Number.isFinite(L)) pts.push([lx, Math.log10(L)]);
          }
          ch.curve(pts, PRINT.accent, [5, 4]);
        }
        S.pts.forEach(([x, y], i) => { if (i === 7) ch.ring(x, y, 4, PRINT.ink); else ch.dot(x, y, 4.5); });
      } else {
        if (stA.refit) { const fit = leastSquares(S.pts); ch.clipLine(S.pts[0][0] - 0.1, S.pts[S.pts.length - 1][0] + 0.1, fit.slope, fit.b, PRINT.red, [6, 4]); }
        for (const [x, y] of S.pts) ch.ring(x, y);
      }
    }
    // series labels, roughly where the plate prints them
    const LBL = { australia: [2.55, 4.17], circle: [2.6, 3.87], safrica: [2.5, 3.69], german: [2.1, 3.52], britain: [1.95, 3.26], portugal: [2.2, 2.88] };
    for (const k of P33_ORDER) if (stA.show[k]) ch.label(LBL[k][0], LBL[k][1], P33[k].label.toUpperCase());
  });

  function tableA() {
    const rows = P33_ORDER.filter((k) => k !== 'circle').map((k) => {
      const S = P33[k], fit = leastSquares(S.pts);
      return `<b>${S.label}</b> · printed slope ${S.printed.slope.toFixed(3)}, D ≈ ${(1 - S.printed.slope).toFixed(2)} · refit ${fit.slope.toFixed(3)}, D ≈ ${(1 - fit.slope).toFixed(2)}`;
    });
    $('tblA').innerHTML = rows.join('<br>') + '<br><b>Circle</b> · rectifiable: slope → 0, D = 1';
  }
  function setA() {
    for (const k of P33_ORDER) $('k_' + k).checked = stA.show[k];
    $('kPrinted').checked = stA.printed; $('kRefit').checked = stA.refit; $('kLaw').checked = stA.law;
    const shown = P33_ORDER.filter((k) => stA.show[k] && k !== 'circle');
    $('infoA').innerHTML = shown.length === 0
      ? 'Only the circle: every approximate length settles at the circumference, then the walk collapses once the yardstick nears the diameter.'
      : 'Each coastline falls on its own straight line — shrink the yardstick tenfold and the measured length grows by a fixed factor, with no sign of settling. The circle settles at once: that is what having a length means.';
    fA.draw();
  }
  for (const k of P33_ORDER) $('k_' + k).addEventListener('change', (e) => { stA.show[k] = e.target.checked; setA(); });
  $('kPrinted').addEventListener('change', (e) => { stA.printed = e.target.checked; setA(); });
  $('kRefit').addEventListener('change', (e) => { stA.refit = e.target.checked; setA(); });
  $('kLaw').addEventListener('change', (e) => { stA.law = e.target.checked; setA(); });
  $('plate33btn').addEventListener('click', () => {
    Object.assign(stA, { printed: true, refit: false, law: false });
    for (const k of P33_ORDER) stA.show[k] = true;
    setA();
  });

  // ====================== The divider walk ======================
  const stB = { coast: 'quad', e: 45 };
  const eOf = (v) => 0.4 * Math.pow(0.004 / 0.4, v / 100);

  let measB = null;
  function measureB() {
    const e = eOf(stB.e), kind = stB.coast;
    const P = coastCurve(kind, coastStage(kind, e));
    const walk = dividerWalkOpen(P, e);
    return (measB = { e, kind, P, walk, L: walk.steps * e, ladder: measureLadder(kind) });
  }

  const zB = zoomable('wB', 'cB', (f) => fitBox(f, stB.coast === 'quad' ? { x0: -0.05, x1: 1.05, y0: -0.42, y1: 0.42 } : stB.coast === 'koch' ? { x0: -0.05, x1: 1.05, y0: -0.06, y1: 0.4 } : { x0: -0.05, x1: 1.05, y0: -0.06, y1: 0.56 }, 0.02), (f, v) => {
    const c = f.ctx, M = measB || measureB();
    paper(f, PRINT.paper); toWorld(f, v);
    const draw = coastCurve(M.kind, M.kind === 'circle' ? 0 : Math.min(COASTS[M.kind].maxN, coastStage(M.kind, M.e) + 1));
    c.strokeStyle = PRINT.gray; c.lineJoin = 'round'; c.lineWidth = 1 / v.s;
    c.stroke(polyPath(draw, false));
    c.strokeStyle = PRINT.red; c.lineWidth = 1.6 / v.s;
    c.stroke(polyPath(M.walk.poly, false));
    toScreen(f);
    if (M.e * v.s > 12) {
      const p = M.walk.poly;
      for (let i = 0; i < p.length; i += 2) {
        c.beginPath(); c.arc(v.ox + p[i] * v.s, v.oy - p[i + 1] * v.s, 2.6, 0, 2 * Math.PI);
        c.fillStyle = PRINT.red; c.fill();
      }
    }
  });

  const fB2 = figure($('cB2'), () => {
    const M = measB || measureB(), S = COASTS[M.kind];
    const rows = M.ladder.map((m) => [Math.log10(m.e), Math.log10(m.L)]);
    const xs = rows.map((r) => r[0]), ys = rows.map((r) => r[1]);
    const ch = chartFrame(fB2, { x0: Math.min(...xs) - 0.25, x1: Math.max(...xs) + 0.25, y0: Math.min(...ys) - 0.2, y1: Math.max(...ys) + 0.25, tick: 1, xlabel: 'log₁₀ yardstick ε', ylabel: 'log₁₀ length L(ε)', left: 50 });
    const fit = leastSquares(rows);
    ch.clipLine(Math.min(...xs) - 0.25, Math.max(...xs) + 0.25, 1 - S.D, fit.b + (fit.slope - (1 - S.D)) * ((Math.min(...xs) + Math.max(...xs)) / 2), PRINT.accent, [5, 4]);
    ch.clipLine(Math.min(...xs) - 0.25, Math.max(...xs) + 0.25, fit.slope, fit.b, PRINT.ink);
    for (const [x, y] of rows) ch.ring(x, y, 4);
    ch.dot(Math.log10(M.e), Math.log10(M.L), 4.5, PRINT.red);
    fB2.fit = fit;
  });

  function setB(refitView) {
    const M = measureB(), S = COASTS[M.kind];
    markCoast(stB.coast);
    $('eBv').textContent = `ε = ${M.e.toFixed(M.e < 0.01 ? 4 : 3)}`;
    $('rBsteps').textContent = M.walk.steps.toFixed(1);
    $('rBlen').textContent = M.L.toFixed(3);
    const fit = fB2.fit || leastSquares(M.ladder.map((m) => [Math.log10(m.e), Math.log10(m.L)]));
    $('rBslope').textContent = fit ? fit.slope.toFixed(3) : '—';
    $('rBd').textContent = fit ? (1 - fit.slope).toFixed(3) : '—';
    $('rBtrue').textContent = S.dlabel;
    $('dimB').innerHTML = `L(ε) ≈ F·ε<sup>1−D</sup> · ${S.name} D = ${S.dlabel}`;
    $('infoB').innerHTML = M.kind === 'circle'
      ? `The walk takes <b>${M.walk.steps.toFixed(1)}</b> steps and already reports the semicircle's length ${(Math.PI / 2).toFixed(3)} to ${(100 * Math.abs(M.L - Math.PI / 2) / (Math.PI / 2)).toFixed(1)}%. Shrinking ε refines it — the measurements converge, so the slope is 0 and D = 1.`
      : `At this opening the dividers take <b>${M.walk.steps.toFixed(1)}</b> steps, measuring L = <b>${M.L.toFixed(2)}</b> against a base of 1. Shrink ε and the measured length keeps climbing as ε<sup>1−D</sup>; on the chart the measurements line up with slope ${(1 - S.D).toFixed(3)}.`;
    if (refitView) zB.refit(); else zB.schedule();
    fB2.draw();
  }
  const markCoast = stepButtons($('shB'), ['quad', 'koch', 'circle'], (k) => COASTS[k].name, (k) => `Coastline: ${COASTS[k].name}`, (k) => { stB.coast = k; measB = null; setB(true); });
  $('eB').addEventListener('input', (e) => { stB.e = +e.target.value; setB(false); });

  // ====================== The approximate measure in dimension d ======================
  const stC = { d: 50 };
  const dOf = (v) => 1 + v / 100; // d from 1 to 2

  const fC = figure($('cC'), () => {
    const d = dOf(stC.d), lad = measureLadder('quad');
    const rows = lad.map((m) => [Math.log10(m.e), Math.log10(m.steps * Math.pow(m.e, d))]);
    const ch = chartFrame(fC, { x0: -2.6, x1: -0.2, y0: -1.6, y1: 1.6, tick: 1, xlabel: 'log₁₀ yardstick ε', ylabel: 'log₁₀ approximate measure', left: 50 });
    ch.clipLine(-2.6, -0.2, 0, 0, PRINT.rule);
    // reference traces for d = 1 (length) and d = 2 (area), faint
    for (const [dd, lab] of [[1, 'd = 1: length, diverges'], [2, 'd = 2: area, vanishes']]) {
      const rr = lad.map((m) => [Math.log10(m.e), Math.log10(m.steps * Math.pow(m.e, dd))]);
      ch.curve(rr, PRINT.faint, [4, 4]);
      ch.label(rr[12][0] + 0.32, rr[12][1] + (dd === 1 ? 0.1 : -0.22), lab, PRINT.muted);
    }
    const fit = leastSquares(rows);
    ch.curve(rows, PRINT.ink, null, 1.6);
    for (const [x, y] of rows) ch.dot(x, y, 3);
    fC.fit = fit;
  });
  function setC() {
    const d = dOf(stC.d), lad = measureLadder('quad');
    $('dCv').textContent = `d = ${d.toFixed(2)}`;
    fC.draw();
    $('rCslope').textContent = fC.fit.slope.toFixed(3);
    const m0 = lad[0], m1 = lad[lad.length - 1];
    const v0 = m0.steps * Math.pow(m0.e, d), v1 = m1.steps * Math.pow(m1.e, d);
    $('rCratio').textContent = `${(v1 / v0).toFixed(v1 / v0 < 10 ? 2 : 0)}×`;
    $('infoC').innerHTML = Math.abs(d - 1.5) < 0.02
      ? 'At d = D = 3/2 the measure holds steady as the yardstick shrinks a hundredfold — the one exponent at which the coastline has a finite, nonzero "amount".'
      : d < 1.5
        ? `With d = ${d.toFixed(2)} &lt; D the approximate measure grows without bound as ε → 0, the way the length of a square's interior is infinite.`
        : `With d = ${d.toFixed(2)} &gt; D the approximate measure dies away to zero, the way a line's area is zero.`;
  }
  $('dC').addEventListener('input', (e) => { stC.d = +e.target.value; setC(); });
  $('dCbtn').addEventListener('click', () => { stC.d = 50; setC(); });

  tableA(); setA(); setB(true); setC();
})();
