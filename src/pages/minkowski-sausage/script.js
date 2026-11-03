// Plate 32: the quadric Koch curve (Plate 51's generator) wrapped in its Minkowski sausage.
// Geometry and page behaviour; the band measurement, band painter and measuring chart come from
// sausage.js, and the canvas plumbing from shared/draw.js.
// CORE START (also shipped to the measuring workers)
const G8 = [0, 1, 0, 3, 3, 0, 1, 0];          // right, up, right, down, down, right, up, right
const STEP = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const D_TRUE = Math.log(8) / Math.log(4);
const PIECE = 170 / 512;                      // the book's lower drawing: steps 1–169 of 512 at stage 3
const LOWER_DY = -0.505;                      // where the book puts it: below the curve's start, about half a base down
const YMAX = 0.328125;                        // the curve's height above and below its base
function buildStage(n) {
  let dirs = new Uint8Array([0]);
  for (let k = 0; k < n; k++) {
    const nd = new Uint8Array(dirs.length * 8);
    let w = 0;
    for (let i = 0; i < dirs.length; i++) for (let j = 0; j < 8; j++) nd[w++] = (dirs[i] + G8[j]) & 3;
    dirs = nd;
  }
  const u = Math.pow(4, -n), N = dirs.length, xs = new Float64Array(N + 1), ys = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) { xs[i + 1] = xs[i] + STEP[dirs[i]][0] * u; ys[i + 1] = ys[i] + STEP[dirs[i]][1] * u; }
  return { xs, ys };
}
// the curve on [0, 1] with its fixed box, as the band measurer wants it
function quadricGeom() {
  const paths = {};
  return {
    path(n) {
      if (!paths[n]) {
        const c = buildStage(n), p = new Path2D();
        p.moveTo(c.xs[0], c.ys[0]);
        for (let i = 1; i < c.xs.length; i++) p.lineTo(c.xs[i], c.ys[i]);
        paths[n] = p;
      }
      return paths[n];
    },
    bbox: () => ({ x0: 0, x1: 1, y0: -YMAX, y1: YMAX }),
  };
}
// CORE END

(() => {
  const MAXN = 6;
  const ES = epsScale(0.002, 0.12), EPS_N = 13, FIT_MAX = 0.031;
  const EPS_GRID = ES.grid(EPS_N);
  const state = { n: 4, eps: 0.012, lower: true, chg: false };

  // ---------- geometry, as printed: turned half round, drawn from right to left ----------
  const curves = {}, upPaths = {}, lowPaths = {}, lowBounds = {};
  const curve = (n) => curves[n] || (curves[n] = buildStage(n));
  function upPath(n) {
    if (!upPaths[n]) {
      const c = curve(n), p = new Path2D();
      p.moveTo(-c.xs[0], -c.ys[0]);
      for (let i = 1; i < c.xs.length; i++) p.lineTo(-c.xs[i], -c.ys[i]);
      upPaths[n] = p;
    }
    return upPaths[n];
  }
  function lowPath(m) {           // first third of stage m, placed below the curve's start
    if (!lowPaths[m]) {
      const c = curve(m), N = c.xs.length - 1, f = PIECE * N, k = Math.floor(f), p = new Path2D();
      let x0 = 0, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      const add = (x, y, first) => {
        const X = -x, Y = -y + LOWER_DY;
        first ? p.moveTo(X, Y) : p.lineTo(X, Y);
        if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
      };
      for (let i = 0; i <= k; i++) add(c.xs[i], c.ys[i], i === 0);
      if (f > k && k < N) add(c.xs[k] + (c.xs[k + 1] - c.xs[k]) * (f - k), c.ys[k] + (c.ys[k + 1] - c.ys[k]) * (f - k), false);
      lowPaths[m] = p; lowBounds[m] = { x0, x1, y0, y1 };
    }
    return lowPaths[m];
  }
  function bounds() {
    let b = { x0: -1, x1: 0, y0: -YMAX, y1: YMAX };
    if (state.lower) { lowPath(state.n - 1); const l = lowBounds[state.n - 1]; b = { x0: Math.min(b.x0, l.x0), x1: Math.max(b.x1, l.x1), y0: Math.min(b.y0, l.y0), y1: b.y1 }; }
    const p = 0.07;
    return { x0: b.x0 - p, x1: b.x1 + p, y0: b.y0 - p, y1: b.y1 + p + 0.05 };
  }

  // ---------- the figure ----------
  const painter = bandPainter();
  function label(f, v, text, wx, wy, align) {
    const c = f.ctx;
    toScreen(f);
    c.font = '600 12px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
    c.fillStyle = PRINT.muted; c.textAlign = align; c.textBaseline = 'middle';
    c.fillText(text, v.ox + wx * v.s, v.oy - wy * v.s);
  }
  function render(f, v) {
    paper(f, PRINT.paper);
    const n = state.n, showLow = state.lower && n >= 1;
    const bandPaths = showLow ? [upPath(n), lowPath(n - 1)] : [upPath(n)];
    const spec = { key: `band|${n}|${showLow}`, paths: bandPaths };
    if (state.chg && n >= 1) spec.chg = { aKey: `up|${n}`, aPaths: [upPath(n)], bKey: `up|${n - 1}`, bPaths: [upPath(n - 1)] };
    painter.draw(f, v, state.eps, spec);
    toWorld(f, v);
    const c = f.ctx;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.15 / v.s;
    c.stroke(upPath(n)); if (showLow) c.stroke(lowPath(n - 1));
    label(f, v, `Stage ${n} · whole curve`, -1, YMAX + 0.06, 'left');
    if (showLow) { const l = lowBounds[n - 1]; label(f, v, `Stage ${n - 1} · first third`, l.x0 - 0.04, (l.y0 + l.y1) / 2, 'right'); }
  }
  const zoom = zoomable('wrap', 'cv', (f) => fitBox(f, bounds(), 0), render, { maxZoom: 800 });

  // ---------- stage thumbnails ----------
  const thumbs = [];
  for (let n = 1; n <= MAXN; n++) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', `Stage ${n}, ${fmt(Math.pow(8, n))} steps`);
    const c = document.createElement('canvas'), lab = document.createElement('b'), cnt = document.createElement('span');
    lab.textContent = `n = ${n}`; cnt.textContent = fmt(Math.pow(8, n));
    b.append(c, lab, cnt); b.addEventListener('click', () => setStage(n));
    $('stages').append(b); thumbs.push({ n, b, c });
  }
  function drawThumbs() {
    for (const { n, b, c } of thumbs) {
      b.setAttribute('aria-pressed', String(n === state.n));
      const r = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth || 48, h = c.clientHeight || 36;
      c.width = Math.round(w * r); c.height = Math.round(h * r);
      const g = c.getContext('2d');
      g.fillStyle = PRINT.paper; g.fillRect(0, 0, c.width, c.height);
      const s = Math.min(c.width / 1.12, c.height / (2 * YMAX + 0.12));
      g.setTransform(s, 0, 0, -s, c.width / 2 + 0.5 * s, c.height / 2);
      g.strokeStyle = PRINT.ink; g.lineWidth = 1.1 * r / s; g.lineJoin = 'round';
      g.stroke(upPath(n));
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  // ---------- measurement ----------
  const pool = measurePool({
    preamble: `const G8=${JSON.stringify(G8)},STEP=${JSON.stringify(STEP)},YMAX=${YMAX};\n${buildStage}\n${quadricGeom}`,
    geomExpr: 'quadricGeom()',
    localGeom: () => quadricGeom(),
    size: 2,
  });
  pool.configure(null);
  const results = {};
  let chartRaf = 0;
  const chartSoon = () => { if (!chartRaf) chartRaf = requestAnimationFrame(() => { chartRaf = 0; chart.draw(); updateVerdict(); }); };
  const sQueue = () => queueChart(pool, results, EPS_GRID, [state.n, 6, 5, 4, 3, 2, 1].filter((d, i, a) => a.indexOf(d) === i), chartSoon);
  const fitD = (d) => (results[d] ? fitSlopeD(EPS_GRID, results[d], FIT_MAX) : NaN);

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
        $('rA').innerHTML = `${v.toFixed(4)} <small>base²</small>`;
        $('rL').textContent = (v / (2 * eps)).toFixed(2);
        finish();
      } }, true);
    }, 110);
  }
  function updateVerdict() {
    const n = state.n, step = Math.pow(4, -n), e = state.eps;
    const D = fitD(n);
    $('rD').textContent = isFinite(D) ? D.toFixed(3) : 'measuring…';
    const D6 = fitD(6);
    $('rD6').textContent = isFinite(D6) ? D6.toFixed(3) : 'measuring…';
    const v = $('verdict');
    if (!isFinite(last.chg)) { v.classList.add('stale'); return; }   // keep the last sentence, dimmed, until the new one is ready
    v.classList.remove('stale');
    let t;
    if (step < e / 2) t = `This stage's new bumps are ${step.toPrecision(2)} of the base, under half of ε. The band hardly notices them: only ${(100 * last.chg).toFixed(1)}% of it moved. Later stages leave it essentially unaffected, as page 32 says.`;
    else if (step < e) t = `This stage's bumps (${step.toPrecision(2)} of the base) are a little smaller than ε, so the band is near its critical stage: ${(100 * last.chg).toFixed(1)}% of it moved.`;
    else t = `This stage's bumps (${step.toPrecision(2)} of the base) are at least as large as ε, so the band still follows them: ${(100 * last.chg).toFixed(1)}% of it moved from the stage before.`;
    v.textContent = t;
  }

  // ---------- the chart ----------
  const chart = sausageChart({
    ids: { box: 'sBox', svg: 'sChart', tip: 'sTip', legend: 'sLegend', table: 'sTable', status: 'chartStatus' },
    grid: EPS_GRID,
    series: Array.from({ length: MAXN }, (_, i) => ({ key: i + 1, label: `Stage ${i + 1}` })),
    results,
    getCurrent: () => state.n,
    getEps: () => state.eps,
    onPick: (e) => setEps(e, true),
    xTicks: [0.002, 0.005, 0.01, 0.02, 0.05, 0.1],
    yFloor: [1, 30],
    serOpacity: (d) => 0.2 + 0.11 * d,
    extraLegend: [{ cls: 'ref', label: 'slope 1 − D' }],
    refs: (X, Y, f, rs) => {
      const deep = rs[MAXN], ia = EPS_GRID.findIndex((e) => e >= 0.03);
      if (!deep || !isFinite(deep[ia])) return '';
      const L = (e) => deep[ia] * Math.pow(e / EPS_GRID[ia], 1 - D_TRUE);
      return `<path class="ref" d="M${f(X(ES.lo))} ${f(Y(L(ES.lo)))} L${f(X(0.08))} ${f(Y(L(0.08)))}"/>`;
    },
  });

  // ---------- state changes ----------
  function updateText() {
    const n = state.n;
    $('stageVal').textContent = `stage ${n}`;
    $('capStage').textContent = n; $('capSteps').textContent = fmt(Math.pow(8, n));
    const e = state.eps.toFixed(state.eps < 0.01 ? 4 : 3);
    $('capEps').textContent = e; $('epsVal').textContent = `${e} of base`;
    $('cv').setAttribute('aria-label', `Stage ${n} of the quadric Koch curve (${fmt(Math.pow(8, n))} steps) wrapped in a band of radius ${e}${state.lower && n >= 1 ? `, with the first third of stage ${n - 1} below it` : ''}`);
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
  $('eps').addEventListener('input', (e) => setEps(ES.fromSlider(+e.target.value), false));
  $('lower').addEventListener('change', (e) => { state.lower = e.target.checked; updateText(); zoom.schedule(); });
  $('chg').addEventListener('change', (e) => { state.chg = e.target.checked; zoom.schedule(); });
  $('asPrinted').addEventListener('click', () => {
    state.lower = true; state.chg = false;
    $('lower').checked = true; $('chg').checked = false;
    if (state.n !== 4) setStage(4);
    setEps(0.012, true);
    zoom.refit();
  });

  // boot
  $('eps').value = ES.toSlider(state.eps);
  updateText();
  drawThumbs();
  window.addEventListener('resize', drawThumbs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawThumbs());
  sQueue(); measureNow(); chart.draw();
})();
