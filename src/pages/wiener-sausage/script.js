// The Wiener sausage: a simulated planar Brown trail (chapter 25's midpoint construction) in its
// ε-band. Geometry and page behaviour; the band measurement, band painter and measuring chart come
// from the sausage kit (pages/minkowski-sausage/sausage.js), the canvas plumbing from shared/draw.js.
// CORE START (also shipped to the measuring workers; mulberry32 comes from shared/random.js and
// is not needed in the workers, which receive the path's points ready-made)
const KMAX = 18;                                  // finest construction: 2^18 = 262,144 steps (stage 9)
// Mandelbrot pp. 234–235: random initiator of mean-square length 1, then isotropic Gaussian midpoint
// displacements whose mean square halves at each pass. Coarser stages are subsets of the same points.
function brownPath(seed) {
  const rnd = mulberry32(seed * 2654435761);
  let spare = null;
  const gauss = () => {        // Box–Muller, kept local: the shared gaussMaker consumes uniforms differently
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = rnd();
    const v = rnd(), r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  const N = 1 << KMAX, xs = new Float64Array(N + 1), ys = new Float64Array(N + 1);
  xs[N] = gauss() * Math.SQRT1_2; ys[N] = gauss() * Math.SQRT1_2;
  let step = N, dt = 1;
  while (step > 1) {
    const h = step >> 1, sd = Math.sqrt(dt / 8);     // per-coordinate sd of a bridge midpoint
    for (let i = 0; i < N; i += step) {
      xs[i + h] = (xs[i] + xs[i + step]) / 2 + gauss() * sd;
      ys[i + h] = (ys[i] + ys[i + step]) / 2 + gauss() * sd;
    }
    step = h; dt /= 2;
  }
  return { xs, ys };
}
const strideOf = (n) => 1 << (KMAX - 2 * n);      // stage n uses every (4^(9−n))th point: 4^n steps
// the sampled path with its box, as the band measurer wants it
function wienerGeom(cfg) {
  const paths = {};
  let bb = null;
  return {
    path(n) {
      if (!paths[n]) {
        const st = strideOf(n), p = new Path2D();
        p.moveTo(cfg.xs[0], cfg.ys[0]);
        for (let i = st; i < cfg.xs.length; i += st) p.lineTo(cfg.xs[i], cfg.ys[i]);
        paths[n] = p;
      }
      return paths[n];
    },
    bbox() {
      if (!bb) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (let i = 0; i < cfg.xs.length; i++) {
          const x = cfg.xs[i], y = cfg.ys[i];
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        bb = { x0, x1, y0, y1 };
      }
      return bb;
    },
  };
}
// Wiener's law for the expected band area in these units (E|B(1)|² = 1): about π / ln(1 / 2ε²)
const lawArea = (e) => Math.PI / Math.log(1 / (2 * e * e));
// CORE END

(() => {
  const NMIN = 4, NMAX = 9, STAGES = [4, 5, 6, 7, 8, 9];
  const ES = epsScale(0.004, 0.15), EPS_N = 13, FIT_MAX = 0.031;
  const EPS_GRID = ES.grid(EPS_N);
  const fmtEps = (e) => e.toFixed(e < 0.01 ? 4 : 3);

  const state = { seed: 7, n: 7, eps: 0.01, prev: false, chg: false };
  let path = null, bbox = null, stagePaths = {};

  function stagePath(n) {
    if (!stagePaths[n]) {
      const st = strideOf(n), p = new Path2D();
      p.moveTo(path.xs[0], path.ys[0]);
      for (let i = st; i < path.xs.length; i += st) p.lineTo(path.xs[i], path.ys[i]);
      stagePaths[n] = p;
    }
    return stagePaths[n];
  }
  function makePath(seed) {
    path = brownPath(seed); stagePaths = {};
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < path.xs.length; i++) { const x = path.xs[i], y = path.ys[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    bbox = { x0, x1, y0, y1 };
  }
  function bounds() {
    const p = 0.08 * Math.max(bbox.x1 - bbox.x0, bbox.y1 - bbox.y0);
    return { x0: bbox.x0 - p, x1: bbox.x1 + p, y0: bbox.y0 - p, y1: bbox.y1 + p };
  }

  // ---------- the figure ----------
  const painter = bandPainter();
  function marker(f, v, wx, wy, filled, text) {
    const c = f.ctx, x = v.ox + wx * v.s, y = v.oy - wy * v.s;
    toScreen(f);
    c.beginPath(); c.arc(x, y, 4.5, 0, Math.PI * 2);
    c.fillStyle = filled ? PRINT.ink : PRINT.paper; c.fill();
    c.lineWidth = 1.75; c.strokeStyle = PRINT.ink; c.stroke();
    c.font = '600 12px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = PRINT.paper;   // halo, so the label reads over a dense trail
    c.strokeText(text, x + 9, y - 10);
    c.fillStyle = PRINT.ink; c.fillText(text, x + 9, y - 10);
  }
  function render(f, v) {
    paper(f, PRINT.paper);
    const n = state.n;
    const spec = { key: `band|${n}`, paths: [stagePath(n)] };
    if (state.chg && n > NMIN - 1) spec.chg = { aKey: `band|${n}`, aPaths: [stagePath(n)], bKey: `band|${n - 1}`, bPaths: [stagePath(n - 1)] };
    painter.draw(f, v, state.eps, spec);
    toWorld(f, v);
    const c = f.ctx;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = PRINT.ink; c.lineWidth = 1 / v.s;
    c.stroke(stagePath(n));
    if (state.prev && n > NMIN - 1) { c.strokeStyle = PRINT.accent; c.lineWidth = 1.6 / v.s; c.stroke(stagePath(n - 1)); }
    const N = path.xs.length - 1;
    marker(f, v, path.xs[0], path.ys[0], true, 't = 0');
    marker(f, v, path.xs[N], path.ys[N], false, 't = 1');
  }
  const zoom = zoomable('wrap', 'cv', (f) => fitBox(f, bounds(), 0), render, { maxZoom: 800 });

  // ---------- stage thumbnails ----------
  const thumbs = [];
  for (const n of STAGES) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', `Stage ${n}, ${fmt(Math.pow(4, n))} steps`);
    const c = document.createElement('canvas'), lab = document.createElement('b'), cnt = document.createElement('span');
    lab.textContent = `n = ${n}`; cnt.textContent = fmt(Math.pow(4, n));
    b.append(c, lab, cnt); b.addEventListener('click', () => setStage(n));
    $('stages').append(b); thumbs.push({ n, b, c });
  }
  function drawThumbs() {
    const bw = bbox.x1 - bbox.x0, bh = bbox.y1 - bbox.y0;
    for (const { n, b, c } of thumbs) {
      b.setAttribute('aria-pressed', String(n === state.n));
      const r = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth || 48, h = c.clientHeight || 36;
      c.width = Math.round(w * r); c.height = Math.round(h * r);
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = PRINT.paper; g.fillRect(0, 0, c.width, c.height);
      const s = Math.min(c.width / (bw * 1.12), c.height / (bh * 1.12));
      g.setTransform(s, 0, 0, -s, c.width / 2 - ((bbox.x0 + bbox.x1) / 2) * s, c.height / 2 + ((bbox.y0 + bbox.y1) / 2) * s);
      g.strokeStyle = PRINT.ink; g.lineWidth = 0.8 * r / s; g.lineJoin = 'round';
      g.stroke(stagePath(n));
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  // ---------- measurement ----------
  // Bands around 262,144 steps are slow to rasterize, so jobs are spread over several workers.
  const pool = measurePool({
    preamble: `const KMAX=${KMAX};\nconst strideOf=${strideOf};\n${wienerGeom}`,
    geomExpr: 'wienerGeom(cfg)',
    localGeom: (cfg) => wienerGeom(cfg),
    size: 4,
  });
  const results = {};
  let chartRaf = 0;
  const chartSoon = () => { if (!chartRaf) chartRaf = requestAnimationFrame(() => { chartRaf = 0; chart.draw(); updateVerdict(); }); };
  const sQueue = () => queueChart(pool, results, EPS_GRID, [state.n, 9, 8, 7, 6, 5, 4].filter((d, i, a) => a.indexOf(d) === i), chartSoon);
  const fitD = (d) => (results[d] ? fitSlopeD(EPS_GRID, results[d], FIT_MAX) : NaN);
  const LAW = EPS_GRID.map((e) => lawArea(e) / (2 * e));

  let last = { A: NaN, chg: NaN };
  let measureT = 0, readGen = 0;
  function measureNow() {
    clearTimeout(measureT);
    $('rA').textContent = '…'; $('rL').textContent = '…'; $('rC').textContent = '…';
    last = { A: NaN, chg: NaN }; updateVerdict();
    measureT = setTimeout(() => {
      pool.cancelTag('read');
      const gen = ++readGen, n = state.n, eps = state.eps, got = { A: NaN, X: NaN };
      const finish = () => {
        if (gen !== readGen || !isFinite(got.A) || !isFinite(got.X)) return;
        last = { A: got.A, chg: got.X / got.A };
        $('rC').textContent = (100 * last.chg).toFixed(1) + '%';
        updateVerdict();
      };
      // both go to the front of the line, so the readouts never wait behind the chart
      pool.enqueue({ tag: 'read', kind: 'diff', n, m: n - 1, eps, done: (v) => { if (gen === readGen) { got.X = v; finish(); } } }, true);
      pool.enqueue({ tag: 'read', kind: 'area', n, eps, done: (v) => {
        if (gen !== readGen) return;
        got.A = v;
        $('rA').textContent = v.toFixed(4);
        $('rL').textContent = (v / (2 * eps)).toFixed(2);
        finish();
      } }, true);
    }, 110);
  }
  function updateVerdict() {
    const n = state.n, step = Math.pow(2, -n), e = state.eps;
    const D = fitD(n);
    $('rD').textContent = isFinite(D) ? D.toFixed(3) : 'measuring…';
    const v = $('verdict');
    if (!isFinite(last.chg)) { v.classList.add('stale'); return; }
    v.classList.remove('stale');
    const pc = (100 * last.chg).toFixed(1), st = step.toPrecision(2);
    let t;
    if (step < e / 2) t = `This stage's new steps are about ${st} long, under half of ε. The band hardly notices them: only ${pc}% of it moved. Finer stages leave it essentially unaffected, as page 32 says.`;
    else if (step < e) t = `This stage's steps (about ${st} long) are a little shorter than ε, so the band is near its critical stage: ${pc}% of it moved.`;
    else t = `This stage's steps (about ${st} long) are at least as long as ε, so the band still follows them: ${pc}% of it moved from the stage before.`;
    v.textContent = t;
  }

  // ---------- the chart ----------
  const chart = sausageChart({
    ids: { box: 'sBox', svg: 'sChart', tip: 'sTip', legend: 'sLegend', table: 'sTable', status: 'chartStatus' },
    grid: EPS_GRID,
    series: STAGES.map((d) => ({ key: d, label: `Stage ${d}` })),
    results,
    getCurrent: () => state.n,
    getEps: () => state.eps,
    onPick: (e) => setEps(e, true),
    xTicks: [0.005, 0.01, 0.02, 0.05, 0.1],
    yFloor: [1, 30],
    alsoScale: LAW,
    serOpacity: (d) => 0.2 + 0.11 * (d - 3),
    extraLegend: [{ cls: 'ref', label: 'slope 1 − D (D = 2)' }, { cls: 'law', label: "Wiener's law" }],
    refs: (X, Y, f, rs) => {
      let s = '', lp = '';
      EPS_GRID.forEach((e, i) => { lp += (i ? 'L' : 'M') + f(X(e)) + ' ' + f(Y(LAW[i])); });
      s += `<path class="law" d="${lp}"/>`;
      const deep = rs[NMAX], ia = EPS_GRID.findIndex((e) => e >= 0.03);
      if (deep && isFinite(deep[ia])) {
        const L = (e) => deep[ia] * Math.pow(e / EPS_GRID[ia], -1);
        s += `<path class="ref" d="M${f(X(ES.lo))} ${f(Y(L(ES.lo)))} L${f(X(0.1))} ${f(Y(L(0.1)))}"/>`;
      }
      return s;
    },
    extraCols: [{ label: "Wiener's law", value: (i) => LAW[i].toFixed(2) }],
    extraTipRows: (i, row) => row({ borderTopStyle: 'dotted', borderTopColor: '#151515' }, LAW[i].toFixed(2), "Wiener's law"),
  });
  $('lawD').textContent = fitSlopeD(EPS_GRID, LAW, FIT_MAX).toFixed(2);

  // ---------- state changes ----------
  function updateText() {
    const n = state.n;
    $('stageVal').textContent = `stage ${n}`;
    $('capSeed').textContent = fmt(state.seed); $('capStage').textContent = n; $('capSteps').textContent = fmt(Math.pow(4, n));
    const e = fmtEps(state.eps);
    $('capEps').textContent = e; $('epsVal').textContent = e;
    $('cv').setAttribute('aria-label', `Stage ${n} of a simulated Brownian trail (${fmt(Math.pow(4, n))} steps) wrapped in a band of radius ${e}`);
    thumbs.forEach(({ n: k, b }) => b.setAttribute('aria-pressed', String(k === n)));
  }
  function setStage(n) {
    if (n === state.n) return;
    state.n = n;
    updateText(); sQueue(); measureNow(); chart.draw(); updateVerdict(); zoom.schedule();
  }
  function setEps(e, fromChart) {
    state.eps = e;
    if (fromChart) $('eps').value = ES.toSlider(e);
    updateText(); measureNow(); chart.draw(); zoom.schedule();
  }
  function newPath(seed) {
    state.seed = seed;
    makePath(seed);
    pool.configure({ xs: path.xs, ys: path.ys });
    painter.reset();
    for (const k in results) delete results[k];
    zoom.refit(); updateText(); drawThumbs(); sQueue(); measureNow(); chart.draw(); updateVerdict();
  }
  $('eps').addEventListener('input', (e) => setEps(ES.fromSlider(+e.target.value), false));
  $('prev').addEventListener('change', (e) => { state.prev = e.target.checked; zoom.schedule(); });
  $('chg').addEventListener('change', (e) => { state.chg = e.target.checked; zoom.schedule(); });
  $('newPath').addEventListener('click', () => newPath(1 + Math.floor(Math.random() * 999999)));

  // boot
  makePath(state.seed);
  pool.configure({ xs: path.xs, ys: path.ys });
  $('eps').value = ES.toSlider(state.eps);
  updateText();
  drawThumbs();
  window.addEventListener('resize', drawThumbs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawThumbs());
  sQueue(); measureNow(); chart.draw();
})();
