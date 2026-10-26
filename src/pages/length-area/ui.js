(() => {

  // ====================== The fractal length-area relation ======================
  const SIZES = [1, 2, 4, 8, 16];
  const GAP = 1.2;
  const stA = { shape: 'koch', g: 55 };
  const gOf = (v) => 0.04 * Math.pow(2 / 0.04, v / 100);

  const layoutCache = {};
  function layoutA(shape) {
    if (layoutCache[shape]) return layoutCache[shape];
    const bb = bbox(islandTeragon(shape, shape === 'circle' ? 0 : 3));
    const isles = [];
    let x = 0;
    for (const s of SIZES) {
      isles.push({ s, ox: x - bb.x0 * s, oy: -bb.y0 * s, w: (bb.x1 - bb.x0) * s });
      x += (bb.x1 - bb.x0) * s + GAP;
    }
    const top = (bb.y1 - bb.y0) * SIZES[SIZES.length - 1];
    return (layoutCache[shape] = { isles, box: { x0: -0.3, x1: x - GAP + 0.3, y0: -0.4, y1: top + 0.4 } });
  }
  // the walks: one divider walk per island, at a stage fine enough for this G. Drawing uses a
  // coarser teragon (its error is below a pixel), cached as a Path2D — a million-point path per
  // frame is the kind of cost DECISIONS.md warns about.
  const pathCache = {};
  function displayPath(shape) {
    if (pathCache[shape]) return pathCache[shape];
    const n = shape === 'circle' ? 0 : shape === 'koch' ? 6 : 4;
    return (pathCache[shape] = polyPath(islandTeragon(shape, n), true));
  }
  let measA = null;
  function measureA() {
    const G = gOf(stA.g), L = layoutA(stA.shape), out = [];
    for (const isle of L.isles) {
      const n = stageFor(stA.shape, isle.s, G);
      const P = islandTeragon(stA.shape, n);
      const walk = dividerWalk(P, G, isle.s, isle.ox, isle.oy);
      out.push({ isle, n, walk, area: shoelace(P) * isle.s * isle.s, glen: walk.steps * G });
    }
    const rows = out.map((o) => [Math.log10(o.area), Math.log10(o.glen)]);
    return (measA = { G, out, rows, fit: leastSquares(rows) });
  }

  const zA = zoomable('wA', 'cA', (f) => fitBox(f, layoutA(stA.shape).box, 0.02), (f, v) => {
    const c = f.ctx, M = measA || measureA();
    paper(f, PRINT.paper); toWorld(f, v);
    const shapePath = displayPath(stA.shape);
    for (const o of M.out) {
      c.save(); c.translate(o.isle.ox, o.isle.oy); c.scale(o.isle.s, o.isle.s);
      c.fillStyle = '#e2e0d8'; c.fill(shapePath);
      c.strokeStyle = '#a9a79f'; c.lineWidth = 0.7 / (v.s * o.isle.s); c.stroke(shapePath);
      c.restore();
      c.strokeStyle = PRINT.red; c.lineJoin = 'round'; c.lineWidth = 1.4 / v.s;
      c.stroke(polyPath(o.walk.poly, false));
    }
    toScreen(f);
    // yardstick vertices, when they are far enough apart to read
    if (M.G * v.s > 14) {
      for (const o of M.out) {
        const p = o.walk.poly;
        for (let i = 0; i < p.length - 2; i += 2) {
          c.beginPath(); c.arc(v.ox + p[i] * v.s, v.oy - p[i + 1] * v.s, 2.4, 0, 2 * Math.PI);
          c.fillStyle = PRINT.red; c.fill();
        }
      }
    }
  });
  const fA2 = figure($('cA2'), () => {
    const M = measA || measureA(), S = SHAPES[stA.shape];
    const xs = M.rows.map((r) => r[0]), ys = M.rows.map((r) => r[1]);
    const x0 = Math.min(...xs) - 0.4, x1 = Math.max(...xs) + 0.4;
    const y0 = Math.min(...ys) - 0.4, y1 = Math.max(...ys) + 0.4;
    const ch = chartFrame(fA2, { x0, x1, y0, y1, xlabel: 'G-area', ylabel: 'G-length', left: 52 });
    ch.line(S.D / 2, M.fit.b + (M.fit.slope - S.D / 2) * ((x0 + x1) / 2), PRINT.accent, [5, 4]);
    ch.line(M.fit.slope, M.fit.b, PRINT.ink);
    for (const [x, y] of M.rows) ch.rain(x, y, 4.5);
  });
  function setA(refitView) {
    const M = measureA(), S = SHAPES[stA.shape], G = M.G;
    markShA(stA.shape);
    $('gAv').textContent = `G = ${G.toFixed(G < 0.1 ? 3 : 2)}`;
    const Dfit = 2 * M.fit.slope;
    $('rAslope').textContent = M.fit.slope.toFixed(3);
    $('rAd').textContent = Dfit.toFixed(3);
    $('rAtrue').textContent = S.D.toFixed(4) + (stA.shape === 'koch' ? ' (log 4/log 3)' : stA.shape === 'quad' ? ' (3/2)' : ' (standard)');
    const ratios = M.out.map((o) => Math.pow(o.glen, 1 / S.D) / Math.sqrt(o.area));
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const spread = (Math.max(...ratios) - Math.min(...ratios)) / mean;
    $('rAratio').textContent = `±${(100 * spread / 2).toFixed(1)}%`;
    const n1 = M.out[0], n5 = M.out[M.out.length - 1];
    $('infoA').innerHTML = stA.shape === 'circle'
      ? `A standard family: the walk takes <b>${n1.walk.steps.toFixed(1)}</b> steps around the smallest circle and <b>${n5.walk.steps.toFixed(1)}</b> around the largest, and the slope is the classical 1/2. The ratio length/√area is 2√π ≈ 3.545 for every circle, whatever G is.`
      : `With this G the smallest island's coast measures <b>${n1.glen.toFixed(2)}</b> and the largest <b>${n5.glen.toFixed(1)}</b>. Shrink G: every G-length grows without bound (the coasts are fractal), yet the slope — and the ratio (G-length)<sup>1/D</sup>/√(G-area), constant across islands to the spread shown — keeps reporting the same D.`;
    $('dimA').innerHTML = `(G-length) ∝ (G-area)<sup>D/2</sup> at a fixed yardstick G · ${S.name} D = ${stA.shape === 'koch' ? 'log 4/log 3 ≈ 1.2619' : stA.shape === 'quad' ? 'log 8/log 4 = 3/2' : '1'}`;
    if (refitView) zA.refit(); else zA.schedule();
    fA2.draw();
  }
  const markShA = stepButtons($('shA'), ['koch', 'quad', 'circle'], (k) => SHAPES[k].name, (k) => `Family: ${SHAPES[k].name}`, (k) => { stA.shape = k; setA(true); });
  $('gA').addEventListener('input', (e) => { stA.g = +e.target.value; setA(false); });

  // ====================== Plate 115 ======================
  const stB = { cloud: true, rain: true, book: true, fit: false };
  const fB = figure($('cB'), () => {
    const ch = chartFrame(fB, { x0: -0.35, x1: 6.5, y0: 0.3, y1: 5.2, xlabel: 'area (km²)', ylabel: 'perimeter (km)', left: 52 });
    const shown = P115.filter((p) => (p[2] ? stB.rain : stB.cloud));
    if (stB.book) ch.line(PRINTED_LINE.slope, PRINTED_LINE.b, PRINT.ink);
    const fit = leastSquares(shown);
    if (stB.fit && fit) ch.line(fit.slope, fit.b, PRINT.red, [6, 4]);
    for (const [x, y, k] of shown) { if (k) ch.rain(x, y); else ch.cloud(x, y); }
    return fit;
  });
  function setB() {
    for (const [id, k] of [['kCloud', 'cloud'], ['kRain', 'rain'], ['kBook', 'book'], ['kFit', 'fit']]) $(id).checked = stB[k];
    const shown = P115.filter((p) => (p[2] ? stB.rain : stB.cloud));
    const fit = leastSquares(shown);
    $('rBn').textContent = `${fmt(shown.length)}`;
    $('cBn').textContent = `${fmt(shown.length)} point${shown.length === 1 ? '' : 's'}`;
    $('rBslope').textContent = fit ? fit.slope.toFixed(3) : '—';
    $('rBd').textContent = fit ? (2 * fit.slope).toFixed(3) : '—';
    $('rBrms').textContent = fit ? `${fit.rms.toFixed(3)} decades` : '—';
    $('infoB').innerHTML = !stB.cloud && !stB.rain ? 'Nothing shown — tick clouds or rain areas.'
      : stB.cloud && stB.rain ? 'Rain areas carry the small end of the chart and clouds the large end, with an overlap near 10²–10⁴ km²; one straight line serves both. The printed line is solid ink; the least-squares refit is dashed red.'
      : stB.cloud ? 'The satellite clouds alone: slope and dimension barely move, since they dominate the fit.'
      : 'The radar rain areas alone cover about four decades at the small end and give nearly the same dimension — the book\'s point: one D from local wiggles to continental scales.';
    fB.draw();
  }
  for (const [id, k] of [['kCloud', 'cloud'], ['kRain', 'rain'], ['kBook', 'book'], ['kFit', 'fit']]) {
    $(id).addEventListener('change', (e) => { stB[k] = e.target.checked; setB(); });
  }
  $('plate115btn').addEventListener('click', () => { Object.assign(stB, { cloud: true, rain: true, book: true, fit: false }); setB(); });

  // ====================== Area-volume: why big brains fold ======================
  const stC = { v: 35, jerison: false };
  const EPS = 0.045, GRAY = 0.55, R_MIN = 0.35, R_MAX = 1.6;
  const rOf = (v) => R_MIN * Math.pow(R_MAX / R_MIN, v / 100);
  function targetL(R) {
    const full = (GRAY * Math.PI * R * R) / EPS;
    if (!stC.jerison) return full;
    const L0 = (GRAY * Math.PI * R_MIN * R_MIN) / EPS;
    return L0 * Math.pow((R * R) / (R_MIN * R_MIN), 0.92);
  }
  const fC = figure($('cC'), () => {
    const c = fC.ctx, R = rOf(stC.v), L = targetL(R);
    const cx = cortexCurve(R, L);
    paper(fC, PRINT.paper);
    const v = fitBox(fC, { x0: -R_MAX - 0.15, x1: R_MAX + 0.15, y0: -R_MAX - 0.15, y1: R_MAX + 0.15 }, 0.02);
    toWorld(fC, v);
    c.beginPath(); c.arc(0, 0, R, 0, 2 * Math.PI); c.fillStyle = '#f6f5ee'; c.fill();
    c.strokeStyle = '#a9a79f'; c.lineWidth = 1 / v.s; c.stroke();
    const p = polyPath(cx.pts, true);
    c.strokeStyle = '#9b9a93'; c.lineJoin = 'round'; c.lineWidth = 2 * EPS; c.stroke(p); // the gray matter ribbon
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.2 / v.s; c.stroke(p);                     // the pia
    toScreen(fC);
    fC.last = cx;
  });
  function setC() {
    const R = rOf(stC.v), A = Math.PI * R * R, A0 = Math.PI * R_MIN * R_MIN;
    fC.draw();
    const cx = fC.last;
    $('gCv').textContent = `×${(A / A0).toFixed(1)} the smallest`;
    $('rCv').textContent = A.toFixed(2);
    $('rCa').textContent = cx.length.toFixed(1);
    $('rCf').textContent = `${(cx.length / (2 * Math.PI * R)).toFixed(1)}× the circle`;
    $('rCd').textContent = stC.jerison ? '≈ 2.76' : '3 (space-filling)';
  }
  $('gC').addEventListener('input', (e) => { stC.v = +e.target.value; setC(); });
  $('kJerison').addEventListener('change', (e) => { stC.jerison = e.target.checked; setC(); });

  setA(true); setB(); setC();
})();
