// CORE START
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
// Band areas, measured by rasterizing a round-capped, round-joined stroke of width 2ε (exactly the union of discs)
// and summing its pixel coverage. Runs in a worker when it can; the same code runs on the page otherwise.
function makeMeasurer(createCanvas) {
  const paths = {};
  const cnv = createCanvas(), g = cnv.getContext('2d', { willReadFrequently: true });
  function path(n) {
    if (!paths[n]) {
      const c = buildStage(n), p = new Path2D();
      p.moveTo(c.xs[0], c.ys[0]);
      for (let i = 1; i < c.xs.length; i++) p.lineTo(c.xs[i], c.ys[i]);
      paths[n] = p;
    }
    return paths[n];
  }
  function setup(eps) {
    const bw = 1 + 2 * eps, bh = 2 * YMAX + 2 * eps;
    let h = eps / 6;                                   // about six pixels per ε
    if (Math.max(bw, bh) / h > 2000) h = Math.max(bw, bh) / 2000;
    const W = Math.ceil(bw / h) + 2, H = Math.ceil(bh / h) + 2;
    cnv.width = W; cnv.height = H;
    return { h, W, H };
  }
  function render(n, eps, s) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s.W, s.H);
    g.setTransform(1 / s.h, 0, 0, -1 / s.h, eps / s.h + 1, (YMAX + eps) / s.h + 1);
    g.lineWidth = 2 * eps; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#000';
    g.stroke(path(n));
    return g.getImageData(0, 0, s.W, s.H).data;
  }
  return {
    area(n, eps) {
      const s = setup(eps), d = render(n, eps, s);
      let sum = 0;
      for (let i = 3; i < d.length; i += 4) sum += d[i];
      return (sum / 255) * s.h * s.h;
    },
    // area of the symmetric difference between two bands, from per-pixel coverage (no edge artifacts)
    diff(n, m, eps) {
      const s = setup(eps), a = render(n, eps, s), b = render(m, eps, s);
      let sum = 0;
      for (let i = 3; i < a.length; i += 4) sum += Math.abs(a[i] - b[i]);
      return (sum / 255) * s.h * s.h;
    },
  };
}
// CORE END

(() => {
  const $ = (id) => document.getElementById(id);
  const wrap = $('wrap'), cv = $('cv'), ctx = cv.getContext('2d');
  const fmt = (n) => n.toLocaleString('en-US');
  const MAXN = 6;
  const EPS_MIN = 0.002, EPS_MAX = 0.12, EPS_N = 13, FIT_MAX = 0.031;
  const EPS_GRID = Array.from({ length: EPS_N }, (_, i) => EPS_MIN * Math.pow(EPS_MAX / EPS_MIN, i / (EPS_N - 1)));
  const sliderToEps = (v) => EPS_MIN * Math.pow(EPS_MAX / EPS_MIN, v / 1000);
  const epsToSlider = (e) => Math.round(1000 * Math.log(e / EPS_MIN) / Math.log(EPS_MAX / EPS_MIN));

  const state = { n: 4, eps: 0.012, lower: true, chg: false, view: null, userView: false };
  let colors = {}, dpr = 1;

  function readColors() {
    const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
    colors = { ink: g('--ink'), plate: g('--plate'), accent: g('--accent'), soft: g('--accent-soft'), muted: g('--muted'), change: g('--change') };
  }

  // ---------- geometry ----------
  const curves = {}, upPaths = {}, lowPaths = {}, lowBounds = {};
  const curve = (n) => curves[n] || (curves[n] = buildStage(n));
  function upPath(n) {            // as on the page: turned half round, drawn from right to left
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

  // ---------- view ----------
  const cssSize = () => ({ w: wrap.clientWidth, h: wrap.clientHeight });
  function fitView() {
    const { w, h } = cssSize(), b = bounds();
    const s = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0));
    state.view = { s, ox: w / 2 - ((b.x0 + b.x1) / 2) * s, oy: h / 2 + ((b.y0 + b.y1) / 2) * s, fit: s };
    state.userView = false; updateTouch();
  }
  function zoomAt(px, py, f) {
    const v = state.view, ns = Math.min(v.fit * 800, Math.max(v.fit * 0.6, v.s * f));
    const wx = (px - v.ox) / v.s, wy = (v.oy - py) / v.s;
    v.s = ns; v.ox = px - wx * ns; v.oy = py + wy * ns;
    state.userView = true; updateTouch(); scheduleView();
  }
  function panBy(dx, dy) { state.view.ox += dx; state.view.oy += dy; state.userView = true; scheduleView(); }
  function updateTouch() { wrap.style.touchAction = state.view && state.view.s > state.view.fit * 1.02 ? 'none' : 'pan-y'; }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const { w, h } = cssSize();
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    if (!state.view || !state.userView) fitView();
    drawMain();
  }

  // ---------- drawing ----------
  const setWorld = (c) => { const v = state.view; c.setTransform(dpr * v.s, 0, 0, -dpr * v.s, dpr * v.ox, dpr * v.oy); };
  // The band on screen is drawn from a distance map, not by stroking a wide line: draw the curve thin,
  // find every pixel's distance to it, and fill the pixels within ε. The cost no longer grows with the
  // number of steps or the width of the band (a wide stroke around 262,144 steps can take most of a minute).
  function parseColor(c) {
    let m = /^#?([0-9a-f]{6})$/i.exec(c);
    if (m) { const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1]; }
    m = /rgba?\(([^)]+)\)/i.exec(c);
    if (m) { const p = m[1].split(',').map((s) => parseFloat(s)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    return [40, 88, 149, 1];
  }
  function edtSq(seed, w, h) {
    // exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher), in working pixels
    const N = w * h, g = new Float32Array(N), INF = 1e20;
    for (let i = 0; i < N; i++) g[i] = seed[i] ? 0 : INF;
    const L = Math.max(w, h), f = new Float64Array(L), d = new Float64Array(L), v = new Int32Array(L), z = new Float64Array(L + 1);
    const pass = (n) => {
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < n; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const t = q - v[k]; d[q] = t * t + f[v[k]]; }
    };
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; pass(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
    for (let y = 0; y < h; y++) { const o = y * w; for (let x = 0; x < w; x++) f[x] = g[o + x]; pass(w); for (let x = 0; x < w; x++) g[o + x] = d[x]; }
    return g;
  }
  const seedC = document.createElement('canvas'), seedG = seedC.getContext('2d', { willReadFrequently: true });
  const fields = new Map();
  // distance map for a set of paths over the visible canvas plus a margin wide enough for radius R (device px)
  function field(name, paths, R) {
    const v = state.view, W = cv.width, H = cv.height;
    const key = `${W}|${H}|${dpr}|${v.s}|${v.ox}|${v.oy}`;
    const c = fields.get(name);
    if (c && c.key === key && c.M >= Math.ceil(R) + 2) return c;
    const M = Math.ceil(R * 1.5) + 3;                     // headroom, so dragging ε wider rarely rebuilds
    let k = 1;
    while (((W + 2 * M) / k) * ((H + 2 * M) / k) > 3.0e6) k *= 2;
    const w = Math.ceil((W + 2 * M) / k), h = Math.ceil((H + 2 * M) / k), a = (dpr * v.s) / k;
    seedC.width = w; seedC.height = h;
    seedG.setTransform(a, 0, 0, -a, (dpr * v.ox + M) / k, (dpr * v.oy + M) / k);
    seedG.lineWidth = 1 / a; seedG.lineJoin = 'round'; seedG.lineCap = 'round'; seedG.strokeStyle = '#000';
    for (const p of paths) seedG.stroke(p);
    const img = seedG.getImageData(0, 0, w, h).data, seed = new Uint8Array(w * h);
    for (let i = 0, j = 3; i < seed.length; i++, j += 4) seed[i] = img[j] > 30 ? 1 : 0;
    const out = { key, M, k, w, h, d2: edtSq(seed, w, h) };
    fields.delete(name); fields.set(name, out);
    while (fields.size > 4) fields.delete(fields.keys().next().value);
    return out;
  }
  const bandC = document.createElement('canvas'), bandG = bandC.getContext('2d');
  function drawBand() {
    const n = state.n, W = cv.width, H = cv.height, R = state.eps * state.view.s * dpr;
    const showLow = state.lower && n >= 1;
    const F = field(`band|${n}|${showLow}`, showLow ? [upPath(n), lowPath(n - 1)] : [upPath(n)], R);
    const chg = state.chg && n >= 1;
    const A = chg ? field(`up|${n}`, [upPath(n)], R) : null, B = chg ? field(`up|${n - 1}`, [upPath(n - 1)], R) : null;
    bandC.width = W; bandC.height = H;
    const img = bandG.createImageData(W, H), px = img.data;
    const [ar, ag, ab] = parseColor(colors.accent), softA = parseColor(colors.soft)[3], [cr, cg, cb] = parseColor(colors.change);
    const P = Math.max(3, Math.round(3.5 * dpr)), dot = dpr > 1.5 ? 2 : 1;          // screen-tone stipple, as in the book
    const reach2 = (R + 0.5) * (R + 0.5), t = 0.6;
    const dist = (f, X, Y) => Math.sqrt(f.d2[((Y + f.M) / f.k | 0) * f.w + ((X + f.M) / f.k | 0)]) * f.k;
    for (let Y = 0; Y < H; Y++) {
      const fy = ((Y + F.M) / F.k | 0) * F.w;
      for (let X = 0; X < W; X++) {
        const d2 = F.d2[fy + ((X + F.M) / F.k | 0)] * F.k * F.k;
        if (d2 > reach2) continue;
        const cov = Math.min(1, R + 0.5 - Math.sqrt(d2)), o = (Y * W + X) * 4;
        if (chg) {
          const da = dist(A, X, Y), db = dist(B, X, Y);
          if ((da <= R - t && db > R + t) || (db <= R - t && da > R + t)) { px[o] = cr; px[o + 1] = cg; px[o + 2] = cb; px[o + 3] = 225; continue; }
        }
        const isDot = (X % P) < dot && (Y % P) < dot;
        px[o] = ar; px[o + 1] = ag; px[o + 2] = ab;
        px[o + 3] = Math.round(255 * cov * (isDot ? 0.6 : softA));
      }
    }
    bandG.putImageData(img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bandC, 0, 0);
  }
  function label(text, wx, wy, align) {
    const v = state.view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '600 12px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = colors.muted; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(text, v.ox + wx * v.s, v.oy - wy * v.s);
  }
  function drawMain() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = colors.plate; ctx.fillRect(0, 0, cv.width, cv.height);
    const n = state.n, s = state.view.s, showLow = state.lower && n >= 1;
    drawBand();
    setWorld(ctx);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = colors.ink; ctx.lineWidth = 1.15 / s;
    ctx.stroke(upPath(n)); if (showLow) ctx.stroke(lowPath(n - 1));
    label(`Stage ${n} · whole curve`, -1, YMAX + 0.06, 'left');
    if (showLow) { const l = lowBounds[n - 1]; label(`Stage ${n - 1} · first third`, l.x0 - 0.04, (l.y0 + l.y1) / 2, 'right'); }
    snapC.width = cv.width; snapC.height = cv.height; snapC.getContext('2d').drawImage(cv, 0, 0);
    snapView = { s: state.view.s, ox: state.view.ox, oy: state.view.oy };
  }
  const snapC = document.createElement('canvas');
  let snapView = null, fullTimer = 0, raf = 0;
  function drawFast() {
    const v = state.view, f = v.s / snapView.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = colors.plate; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(snapC, (v.ox - snapView.ox * f) * dpr, (v.oy - snapView.oy * f) * dpr, snapC.width * f, snapC.height * f);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawMain(); }); }
  function scheduleView() {
    if (!snapView) { schedule(); return; }
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawFast(); });
    clearTimeout(fullTimer); fullTimer = setTimeout(schedule, 160);
  }

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
      g.fillStyle = colors.plate; g.fillRect(0, 0, c.width, c.height);
      const s = Math.min(c.width / 1.12, c.height / (2 * YMAX + 0.12));
      g.setTransform(s, 0, 0, -s, c.width / 2 + 0.5 * s, c.height / 2);
      g.strokeStyle = colors.ink; g.lineWidth = 1.1 * r / s; g.lineJoin = 'round';
      g.stroke(upPath(n));
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  // ---------- measurement: one job at a time, in a worker when possible ----------
  let worker = null, busy = false, inflight = null, seq = 0;
  const jobs = [], localM = makeMeasurer(() => document.createElement('canvas'));
  try {
    if (typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined') {
      const src = `const G8=${JSON.stringify(G8)},STEP=${JSON.stringify(STEP)},YMAX=${YMAX};\n${buildStage}\n${makeMeasurer}\n` +
        `let M=null;onmessage=(e)=>{const j=e.data;if(!M)M=makeMeasurer(()=>new OffscreenCanvas(1,1));` +
        `const v=j.kind==='area'?M.area(j.n,j.eps):M.diff(j.n,j.m,j.eps);postMessage({id:j.id,v});};`;
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = (e) => { const j = inflight; inflight = null; busy = false; if (j && j.id === e.data.id) j.done(e.data.v); next(); };
      worker.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); worker = null; const j = inflight; inflight = null; busy = false; if (j) jobs.unshift(j); next(); };
    }
  } catch (_) { worker = null; }
  function next() {
    if (busy || !jobs.length) return;
    const j = jobs.shift();
    busy = true; inflight = j; j.id = ++seq;
    if (worker) worker.postMessage({ id: j.id, kind: j.kind, n: j.n, m: j.m, eps: j.eps });
    else setTimeout(() => {
      const v = j.kind === 'area' ? localM.area(j.n, j.eps) : localM.diff(j.n, j.m, j.eps);
      inflight = null; busy = false; j.done(v); next();
    }, 0);
  }
  function enqueue(job, front) { front ? jobs.unshift(job) : jobs.push(job); next(); }

  const sz = { results: {} };
  let chartRaf = 0;
  const chartSoon = () => { if (!chartRaf) chartRaf = requestAnimationFrame(() => { chartRaf = 0; drawChart(); updateVerdict(); }); };
  function sQueue() {
    // chart jobs: the current stage first, then the deepest stages
    for (let k = jobs.length - 1; k >= 0; k--) if (jobs[k].tag === 'chart') jobs.splice(k, 1);
    const order = [state.n, 6, 5, 4, 3, 2, 1].filter((d, i, a) => a.indexOf(d) === i);
    for (const d of order) {
      if (!sz.results[d]) sz.results[d] = new Float64Array(EPS_N).fill(NaN);
      for (let i = 0; i < EPS_N; i++) {
        if (!isNaN(sz.results[d][i]) || (inflight && inflight.tag === 'chart' && inflight.d === d && inflight.i === i)) continue;
        enqueue({ tag: 'chart', kind: 'area', n: d, eps: EPS_GRID[i], d, i, done: (v) => { sz.results[d][i] = v / (2 * EPS_GRID[i]); chartSoon(); } });
      }
    }
  }
  function pump() { next(); }
  function chartProgress() {
    let done = 0, total = 0;
    for (let d = 1; d <= MAXN; d++) { const r = sz.results[d]; if (!r) continue; for (const v of r) { total++; if (isFinite(v)) done++; } }
    $('chartStatus').textContent = done < total ? `measuring ${done}/${total}` : 'log–log';
  }
  function fitD(d) {
    const r = sz.results[d];
    if (!r) return NaN;
    const X = [], Y = [];
    EPS_GRID.forEach((e, i) => { if (e <= FIT_MAX && isFinite(r[i])) { X.push(Math.log(e)); Y.push(Math.log(r[i])); } });
    if (X.length < 5) return NaN;
    const mx = X.reduce((a, b) => a + b) / X.length, my = Y.reduce((a, b) => a + b) / Y.length;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < X.length; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; }
    return 1 - sxy / sxx;
  }
  let last = { A: NaN, chg: NaN };
  let measureT = 0, readGen = 0;
  function measureNow() {
    clearTimeout(measureT);
    $('rA').textContent = '…'; $('rL').textContent = '…'; $('rC').textContent = '…';
    last = { A: NaN, chg: NaN }; updateVerdict();
    measureT = setTimeout(() => {
      for (let k = jobs.length - 1; k >= 0; k--) if (jobs[k].tag === 'read') jobs.splice(k, 1);
      const gen = ++readGen, n = state.n, eps = state.eps, got = { A: NaN, X: NaN };
      const finish = () => {
        if (gen !== readGen || !isFinite(got.A) || !isFinite(got.X)) return;
        last = { A: got.A, chg: got.X / got.A };
        $('rC').textContent = (100 * last.chg).toFixed(1) + '%';
        updateVerdict();
      };
      const areaJob = { tag: 'read', kind: 'area', n, eps, done: (v) => {
        if (gen !== readGen) return;
        got.A = v;
        $('rA').innerHTML = `${v.toFixed(4)} <small>base²</small>`;
        $('rL').textContent = (v / (2 * eps)).toFixed(2);
        finish();
      } };
      const diffJob = { tag: 'read', kind: 'diff', n, m: n - 1, eps, done: (v) => { if (gen === readGen) { got.X = v; finish(); } } };
      // both go to the front of the line, so the readouts never wait behind the chart
      jobs.unshift(areaJob, diffJob);
      next();
    }, 110);
  }
  function updateVerdict() {
    const n = state.n, step = Math.pow(4, -n), e = state.eps;
    const D = fitD(n);
    $('rD').textContent = isFinite(D) ? D.toFixed(3) : 'measuring…';
    const v = $('verdict');
    if (!isFinite(last.chg)) { v.classList.add('stale'); return; }   // keep the last sentence, dimmed, until the new one is ready
    v.classList.remove('stale');
    let t;
    if (step < e / 2) t = `This stage's new bumps are ${step.toPrecision(2)} of the base, under half of ε. The band hardly notices them: only ${(100 * last.chg).toFixed(1)}% of it moved. Later stages leave it essentially unaffected, as page 32 says.`;
    else if (step < e) t = `This stage's bumps (${step.toPrecision(2)} of the base) are a little smaller than ε, so the band is near its critical stage: ${(100 * last.chg).toFixed(1)}% of it moved.`;
    else t = `This stage's bumps (${step.toPrecision(2)} of the base) are at least as large as ε, so the band still follows them: ${(100 * last.chg).toFixed(1)}% of it moved from the stage before.`;
    v.textContent = t;
  }

  // ---------- chart ----------
  const sBox = $('sBox'), sChart = $('sChart'), sTip = $('sTip');
  const serOpacity = (d) => (d === state.n ? 1 : 0.2 + 0.11 * d);
  let geo = null, hoverIdx = -1;
  (function buildLegend() {
    const lg = $('sLegend');
    for (let d = 1; d <= MAXN; d++) {
      const s = document.createElement('span'), i = document.createElement('i');
      s.dataset.d = d; s.append(i, document.createTextNode(`Stage ${d}`)); lg.append(s);
    }
    const s = document.createElement('span'), i = document.createElement('i');
    i.className = 'ref'; s.append(i, document.createTextNode('slope 1 − D')); lg.append(s);
  })();
  function paintLegend() {
    $('sLegend').querySelectorAll('span[data-d]').forEach((s) => {
      const d = +s.dataset.d, cur = d === state.n, i = s.querySelector('i');
      s.classList.toggle('cur', cur);
      i.style.borderTopColor = cur ? 'var(--accent)' : 'var(--muted)'; i.style.opacity = serOpacity(d);
    });
  }
  function interpL(r, e) {
    for (let i = 0; i < EPS_N - 1; i++) {
      if (e >= EPS_GRID[i] && e <= EPS_GRID[i + 1] && isFinite(r[i]) && isFinite(r[i + 1])) {
        const f = Math.log(e / EPS_GRID[i]) / Math.log(EPS_GRID[i + 1] / EPS_GRID[i]);
        return Math.exp(Math.log(r[i]) + f * (Math.log(r[i + 1]) - Math.log(r[i])));
      }
    }
    return NaN;
  }
  function drawChart() {
    const W = Math.max(240, Math.round(sBox.clientWidth || 320)), H = 226;
    const ml = 34, mr = 10, mt = 10, mb = 34;
    let ymin = 1, ymax = 30;
    for (const d in sz.results) for (const v of sz.results[d]) if (isFinite(v)) { ymax = Math.max(ymax, v * 1.12); ymin = Math.min(ymin, v / 1.12); }
    const lx0 = Math.log(EPS_MIN), lx1 = Math.log(EPS_MAX), ly0 = Math.log(ymin), ly1 = Math.log(ymax);
    const X = (e) => ml + ((Math.log(e) - lx0) / (lx1 - lx0)) * (W - ml - mr);
    const Y = (v) => mt + (1 - (Math.log(v) - ly0) / (ly1 - ly0)) * (H - mt - mb);
    geo = { X, W };
    const f = (v) => v.toFixed(1);
    const xt = [0.002, 0.005, 0.01, 0.02, 0.05, 0.1], yt = [1, 2, 5, 10, 20, 50, 100].filter((v) => v >= ymin && v <= ymax);
    let s = '<g class="grid">';
    for (const t of xt) s += `<line x1="${f(X(t))}" x2="${f(X(t))}" y1="${mt}" y2="${H - mb}"/>`;
    for (const t of yt) s += `<line x1="${ml}" x2="${W - mr}" y1="${f(Y(t))}" y2="${f(Y(t))}"/>`;
    s += '</g>';
    for (const t of xt) s += `<text x="${f(X(t))}" y="${H - mb + 13}" text-anchor="middle">${t}</text>`;
    for (const t of yt) s += `<text x="${ml - 5}" y="${f(Y(t) + 3.5)}" text-anchor="end">${t}</text>`;
    s += `<text x="${W - mr - 2}" y="${mt + 10}" text-anchor="end">area ÷ 2ε</text>`;
    s += `<text x="${f((ml + W - mr) / 2)}" y="${H - 4}" text-anchor="middle">band radius ε (log scale)</text>`;
    const deep = sz.results[6], ia = EPS_GRID.findIndex((e) => e >= 0.03);
    if (deep && isFinite(deep[ia])) {
      const L = (e) => deep[ia] * Math.pow(e / EPS_GRID[ia], 1 - D_TRUE);
      s += `<path class="ref" d="M${f(X(EPS_MIN))} ${f(Y(L(EPS_MIN)))} L${f(X(0.08))} ${f(Y(L(0.08)))}"/>`;
    }
    const order = [1, 2, 3, 4, 5, 6].filter((d) => d !== state.n).concat([state.n]);
    for (const d of order) {
      const r = sz.results[d]; if (!r) continue;
      let p = '';
      r.forEach((v, i) => { if (isFinite(v)) p += (p ? 'L' : 'M') + f(X(EPS_GRID[i])) + ' ' + f(Y(v)); });
      if (p) s += `<path class="ser${d === state.n ? ' cur' : ''}" style="stroke-opacity:${serOpacity(d)}" d="${p}"/>`;
    }
    if (hoverIdx >= 0) s += `<line class="hair" x1="${f(X(EPS_GRID[hoverIdx]))}" x2="${f(X(EPS_GRID[hoverIdx]))}" y1="${mt}" y2="${H - mb}"/>`;
    const ex = X(Math.min(EPS_MAX, Math.max(EPS_MIN, state.eps)));
    s += `<line class="mark" x1="${f(ex)}" x2="${f(ex)}" y1="${mt}" y2="${H - mb}"/>`;
    const cr = sz.results[state.n];
    if (cr) { const v = interpL(cr, state.eps); if (isFinite(v)) s += `<circle class="dot" cx="${f(ex)}" cy="${f(Y(v))}" r="4"/>`; }
    sChart.setAttribute('viewBox', `0 0 ${W} ${H}`);
    sChart.innerHTML = s;
    paintLegend(); drawTable(); chartProgress();
  }
  function drawTable() {
    const t = $('sTable');
    const head = ['ε', ...Array.from({ length: MAXN }, (_, i) => `Stage ${i + 1}`)];
    t.textContent = '';
    const tr0 = document.createElement('tr');
    head.forEach((c) => { const th = document.createElement('th'); th.textContent = c; tr0.append(th); });
    t.append(tr0);
    EPS_GRID.forEach((e, i) => {
      const tr = document.createElement('tr');
      [e.toFixed(4), ...Array.from({ length: MAXN }, (_, k) => { const r = sz.results[k + 1]; return r && isFinite(r[i]) ? r[i].toFixed(2) : '…'; })]
        .forEach((c) => { const td = document.createElement('td'); td.textContent = c; tr.append(td); });
      t.append(tr);
    });
  }
  function nearestIdx(e) {
    const r = sChart.getBoundingClientRect(), x = (e.clientX - r.left) * (geo.W / r.width);
    let best = 0, bd = Infinity;
    EPS_GRID.forEach((g, i) => { const dx = Math.abs(geo.X(g) - x); if (dx < bd) { bd = dx; best = i; } });
    return best;
  }
  function showTip(i) {
    sTip.textContent = '';
    const hd = document.createElement('div'); hd.className = 'hd'; hd.textContent = `ε = ${EPS_GRID[i].toFixed(4)}`; sTip.append(hd);
    for (let d = MAXN; d >= 1; d--) {
      const r = sz.results[d], v = r ? r[i] : NaN, row = document.createElement('div'); row.className = 'row';
      const key = document.createElement('i'); key.style.borderTopColor = d === state.n ? 'var(--accent)' : 'var(--muted)'; key.style.opacity = serOpacity(d);
      const b = document.createElement('b'); b.textContent = isFinite(v) ? v.toFixed(2) : '…';
      row.append(key, b, document.createTextNode(`stage ${d}`)); sTip.append(row);
    }
    sTip.hidden = false;
    const bw = sBox.clientWidth, tw = sTip.offsetWidth, px = (geo.X(EPS_GRID[i]) / geo.W) * bw;
    sTip.style.left = (px + 12 + tw > bw ? Math.max(0, px - 12 - tw) : px + 12) + 'px';
  }
  sChart.addEventListener('pointermove', (e) => { if (!geo) return; hoverIdx = nearestIdx(e); drawChart(); showTip(hoverIdx); });
  sChart.addEventListener('pointerleave', () => { hoverIdx = -1; sTip.hidden = true; drawChart(); });
  sChart.addEventListener('click', (e) => { if (geo) setEps(EPS_GRID[nearestIdx(e)], true); });
  new ResizeObserver(() => drawChart()).observe(sBox);

  // ---------- state changes ----------
  function updateText() {
    const n = state.n;
    $('stageVal').textContent = `stage ${n}`;
    $('capStage').textContent = n; $('capSteps').textContent = fmt(Math.pow(8, n));
    const e = state.eps.toFixed(state.eps < 0.01 ? 4 : 3);
    $('capEps').textContent = e; $('epsVal').textContent = `${e} of base`;
    cv.setAttribute('aria-label', `Stage ${n} of the quadric Koch curve (${fmt(Math.pow(8, n))} steps) wrapped in a band of radius ${e}${state.lower && n >= 1 ? `, with the first third of stage ${n - 1} below it` : ''}`);
    thumbs.forEach(({ n: k, b }) => b.setAttribute('aria-pressed', String(k === n)));
  }
  function setStage(n) {
    if (n === state.n) return;
    state.n = n;
    if (!state.userView) fitView();
    updateText(); sQueue(); pump(); measureNow(); drawChart(); updateVerdict(); schedule();
  }
  function setEps(e, fromChart) {
    state.eps = e;
    if (fromChart) $('eps').value = epsToSlider(e);
    updateText(); measureNow(); drawChart(); schedule();
  }
  $('eps').addEventListener('input', (e) => setEps(sliderToEps(+e.target.value), false));
  $('lower').addEventListener('change', (e) => { state.lower = e.target.checked; if (!state.userView) fitView(); updateText(); schedule(); });
  $('chg').addEventListener('change', (e) => { state.chg = e.target.checked; schedule(); });
  const center = () => { const { w, h } = cssSize(); return [w / 2, h / 2]; };
  $('zin').addEventListener('click', () => zoomAt(...center(), 1.6));
  $('zout').addEventListener('click', () => zoomAt(...center(), 1 / 1.6));
  $('zfit').addEventListener('click', () => { fitView(); schedule(); });

  // pointer pan / pinch
  const pts = new Map();
  let pinch = null;
  const local = (e) => { const r = wrap.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.view-tools')) return;
    pts.set(e.pointerId, local(e));
    try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; }
    wrap.classList.add('dragging');
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), cur = local(e);
    pts.set(e.pointerId, cur);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      panBy(m[0] - pinch.m[0], m[1] - pinch.m[1]);
      if (pinch.d > 0) zoomAt(m[0], m[1], d / pinch.d);
      pinch = { d, m };
    } else if (pts.size === 1) {
      if (e.pointerType !== 'touch' || state.view.s > state.view.fit * 1.02) panBy(cur[0] - prev[0], cur[1] - prev[1]);
    }
  });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) wrap.classList.remove('dragging'); };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); const [x, y] = local(e); zoomAt(x, y, Math.exp(-e.deltaY * 0.0045));
  }, { passive: false });
  wrap.addEventListener('dblclick', (e) => { if (e.target.closest('.view-tools')) return; const [x, y] = local(e); zoomAt(x, y, e.shiftKey ? 0.5 : 2); });

  const retheme = () => { readColors(); drawThumbs(); drawMain(); };
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // boot
  readColors();
  $('eps').value = epsToSlider(state.eps);
  updateText();
  new ResizeObserver(() => resize()).observe(wrap);
  resize();
  drawThumbs();
  window.addEventListener('resize', drawThumbs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawThumbs(); drawMain(); });
  sQueue(); measureNow(); drawChart(); pump();
})();
