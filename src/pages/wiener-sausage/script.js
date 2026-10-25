// CORE START
const KMAX = 18;                                  // finest construction: 2^18 = 262,144 steps (stage 9)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Mandelbrot pp. 234–235: random initiator of mean-square length 1, then isotropic Gaussian midpoint
// displacements whose mean square halves at each pass. Coarser stages are subsets of the same points.
function brownPath(seed) {
  const rnd = mulberry32(seed * 2654435761);
  let spare = null;
  const gauss = () => {
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
// Band areas, measured by rasterizing a round-capped, round-joined stroke of width 2ε (exactly the union of discs)
// and summing its pixel coverage. Runs in a worker when it can; the same code runs on the page otherwise.
function makeMeasurer(createCanvas) {
  let P = null, paths = {}, bb = null;
  const cnv = createCanvas(), g = cnv.getContext('2d', { willReadFrequently: true });
  function setPath(xs, ys) {
    P = { xs, ys }; paths = {};
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < xs.length; i++) { const x = xs[i], y = ys[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    bb = { x0, x1, y0, y1 };
  }
  function path(n) {
    if (!paths[n]) {
      const st = strideOf(n), p = new Path2D();
      p.moveTo(P.xs[0], P.ys[0]);
      for (let i = st; i < P.xs.length; i += st) p.lineTo(P.xs[i], P.ys[i]);
      paths[n] = p;
    }
    return paths[n];
  }
  function setup(eps) {
    const bw = bb.x1 - bb.x0 + 2 * eps, bh = bb.y1 - bb.y0 + 2 * eps;
    let h = eps / 6;
    if (Math.max(bw, bh) / h > 2000) h = Math.max(bw, bh) / 2000;
    const W = Math.ceil(bw / h) + 2, H = Math.ceil(bh / h) + 2;
    cnv.width = W; cnv.height = H;
    return { h, W, H };
  }
  function render(n, eps, s) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s.W, s.H);
    g.setTransform(1 / s.h, 0, 0, -1 / s.h, (eps - bb.x0) / s.h + 1, (bb.y1 + eps) / s.h + 1);
    g.lineWidth = 2 * eps; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#000';
    g.stroke(path(n));
    return g.getImageData(0, 0, s.W, s.H).data;
  }
  return {
    setPath,
    area(n, eps) {
      const s = setup(eps), d = render(n, eps, s);
      let sum = 0;
      for (let i = 3; i < d.length; i += 4) sum += d[i];
      return (sum / 255) * s.h * s.h;
    },
    diff(n, m, eps) {
      const s = setup(eps), a = render(n, eps, s), b = render(m, eps, s);
      let sum = 0;
      for (let i = 3; i < a.length; i += 4) sum += Math.abs(a[i] - b[i]);
      return (sum / 255) * s.h * s.h;
    },
  };
}
// Wiener's law for the expected band area in these units (E|B(1)|² = 1): about π / ln(1 / 2ε²)
const lawArea = (e) => Math.PI / Math.log(1 / (2 * e * e));
// CORE END

(() => {
  const $ = (id) => document.getElementById(id);
  const wrap = $('wrap'), cv = $('cv'), ctx = cv.getContext('2d');
  const fmt = (n) => n.toLocaleString('en-US');
  const NMIN = 4, NMAX = 9, STAGES = [4, 5, 6, 7, 8, 9];
  const EPS_MIN = 0.004, EPS_MAX = 0.15, EPS_N = 13, FIT_MAX = 0.031;
  const EPS_GRID = Array.from({ length: EPS_N }, (_, i) => EPS_MIN * Math.pow(EPS_MAX / EPS_MIN, i / (EPS_N - 1)));
  const sliderToEps = (v) => EPS_MIN * Math.pow(EPS_MAX / EPS_MIN, v / 1000);
  const epsToSlider = (e) => Math.round(1000 * Math.log(e / EPS_MIN) / Math.log(EPS_MAX / EPS_MIN));
  const fmtEps = (e) => e.toFixed(e < 0.01 ? 4 : 3);

  const state = { seed: 7, n: 7, eps: 0.01, prev: false, chg: false, view: null, userView: false };
  let colors = {}, dpr = 1, path = null, bbox = null;

  function readColors() {
    const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
    colors = { ink: g('--ink'), plate: g('--plate'), accent: g('--accent'), soft: g('--accent-soft'), muted: g('--muted'), change: g('--change') };
  }

  // ---------- geometry ----------
  let stagePaths = {};
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
  // The band on screen comes from a distance map: draw the path thin, find each pixel's distance to it, and fill
  // the pixels within ε. The cost does not grow with the number of steps or the width of the band.
  function parseColor(c) {
    let m = /^#?([0-9a-f]{6})$/i.exec(c);
    if (m) { const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1]; }
    m = /rgba?\(([^)]+)\)/i.exec(c);
    if (m) { const p = m[1].split(',').map((s) => parseFloat(s)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    return [40, 88, 149, 1];
  }
  function edtSq(seed, w, h) {
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
  function field(name, paths, R) {
    const v = state.view, W = cv.width, H = cv.height;
    const key = `${state.seed}|${W}|${H}|${dpr}|${v.s}|${v.ox}|${v.oy}`;
    const c = fields.get(name);
    if (c && c.key === key && c.M >= Math.ceil(R) + 2) return c;
    const M = Math.ceil(R * 1.5) + 3;
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
    const F = field(`band|${n}`, [stagePath(n)], R);
    const chg = state.chg && n > NMIN - 1;
    const B = chg ? field(`band|${n - 1}`, [stagePath(n - 1)], R) : null;
    bandC.width = W; bandC.height = H;
    const img = bandG.createImageData(W, H), px = img.data;
    const [ar, ag, ab] = parseColor(colors.accent), softA = parseColor(colors.soft)[3], [cr, cg, cb] = parseColor(colors.change);
    const P = Math.max(3, Math.round(3.5 * dpr)), dot = dpr > 1.5 ? 2 : 1;
    const reach2 = (R + 0.5) * (R + 0.5), t = 0.6;
    for (let Y = 0; Y < H; Y++) {
      const fy = ((Y + F.M) / F.k | 0) * F.w;
      for (let X = 0; X < W; X++) {
        const d2 = F.d2[fy + ((X + F.M) / F.k | 0)] * F.k * F.k;
        if (chg) {
          const db = Math.sqrt(B.d2[((Y + B.M) / B.k | 0) * B.w + ((X + B.M) / B.k | 0)]) * B.k, da = Math.sqrt(d2);
          if ((da <= R - t && db > R + t) || (db <= R - t && da > R + t)) { const o = (Y * W + X) * 4; px[o] = cr; px[o + 1] = cg; px[o + 2] = cb; px[o + 3] = 225; continue; }
        }
        if (d2 > reach2) continue;
        const cov = Math.min(1, R + 0.5 - Math.sqrt(d2)), o = (Y * W + X) * 4, isDot = (X % P) < dot && (Y % P) < dot;
        px[o] = ar; px[o + 1] = ag; px[o + 2] = ab;
        px[o + 3] = Math.round(255 * cov * (isDot ? 0.6 : softA));
      }
    }
    bandG.putImageData(img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bandC, 0, 0);
  }
  function marker(wx, wy, filled, text) {
    const v = state.view, x = v.ox + wx * v.s, y = v.oy - wy * v.s;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = filled ? colors.ink : colors.plate; ctx.fill();
    ctx.lineWidth = 1.75; ctx.strokeStyle = colors.ink; ctx.stroke();
    ctx.font = '600 12px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = colors.plate;   // halo, so the label reads over a dense trail
    ctx.strokeText(text, x + 9, y - 10);
    ctx.fillStyle = colors.ink; ctx.fillText(text, x + 9, y - 10);
  }
  function drawMain() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = colors.plate; ctx.fillRect(0, 0, cv.width, cv.height);
    const n = state.n, s = state.view.s;
    drawBand();
    setWorld(ctx);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = colors.ink; ctx.lineWidth = 1 / s;
    ctx.stroke(stagePath(n));
    if (state.prev && n > NMIN - 1) { ctx.strokeStyle = colors.accent; ctx.lineWidth = 1.6 / s; ctx.stroke(stagePath(n - 1)); }
    const N = path.xs.length - 1;
    marker(path.xs[0], path.ys[0], true, 't = 0');
    marker(path.xs[N], path.ys[N], false, 't = 1');
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
      g.fillStyle = colors.plate; g.fillRect(0, 0, c.width, c.height);
      const s = Math.min(c.width / (bw * 1.12), c.height / (bh * 1.12));
      g.setTransform(s, 0, 0, -s, c.width / 2 - ((bbox.x0 + bbox.x1) / 2) * s, c.height / 2 + ((bbox.y0 + bbox.y1) / 2) * s);
      g.strokeStyle = colors.ink; g.lineWidth = 0.8 * r / s; g.lineJoin = 'round';
      g.stroke(stagePath(n));
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  // ---------- measurement: a small pool of workers, falling back to the page itself ----------
  // Bands around 262,144 steps are slow to rasterize, so jobs are spread over several workers at once.
  let seq = 0, pathGen = 0;
  const jobs = [], pool = [], localM = makeMeasurer(() => document.createElement('canvas'));
  const runner = { busy: false, job: null };
  try {
    if (typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined') {
      const src = `const KMAX=${KMAX};\nconst strideOf=${strideOf};\n${makeMeasurer}\n` +
        `let M=null;onmessage=(e)=>{const j=e.data;if(!M)M=makeMeasurer(()=>new OffscreenCanvas(1,1));` +
        `if(j.type==='path'){M.setPath(j.xs,j.ys);return;}` +
        `const v=j.kind==='area'?M.area(j.n,j.eps):M.diff(j.n,j.m,j.eps);postMessage({id:j.id,v});};`;
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const size = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
      for (let k = 0; k < size; k++) {
        const slot = { w: new Worker(url), job: null };
        slot.w.onmessage = (e) => {
          const j = slot.job; slot.job = null;
          if (j && j.id === e.data.id && j.gen === pathGen) j.done(e.data.v);
          next();
        };
        slot.w.onerror = (e) => {
          if (e && e.preventDefault) e.preventDefault();
          pool.splice(pool.indexOf(slot), 1);
          if (slot.job) jobs.unshift(slot.job);
          slot.job = null; next();
        };
        pool.push(slot);
      }
    }
  } catch (_) { pool.length = 0; }
  function sendPath() {
    pathGen++;
    for (const slot of pool) slot.w.postMessage({ type: 'path', xs: path.xs, ys: path.ys });
    localM.setPath(path.xs, path.ys);
  }
  const inflight = () => pool.map((s) => s.job).concat(runner.job ? [runner.job] : []).filter(Boolean);
  function next() {
    if (pool.length) {
      for (const slot of pool) {
        if (slot.job || !jobs.length) continue;
        const j = jobs.shift(); j.id = ++seq; slot.job = j;
        slot.w.postMessage({ id: j.id, kind: j.kind, n: j.n, m: j.m, eps: j.eps });
      }
      return;
    }
    if (runner.busy || !jobs.length) return;      // no workers: one job at a time on the page
    const j = jobs.shift();
    runner.busy = true; runner.job = j;
    setTimeout(() => {
      const v = j.kind === 'area' ? localM.area(j.n, j.eps) : localM.diff(j.n, j.m, j.eps);
      runner.busy = false; runner.job = null;
      if (j.gen === pathGen) j.done(v);
      next();
    }, 0);
  }
  function enqueue(job) { job.gen = pathGen; jobs.push(job); next(); }

  const sz = { results: {} };
  let chartRaf = 0;
  const chartSoon = () => { if (!chartRaf) chartRaf = requestAnimationFrame(() => { chartRaf = 0; drawChart(); updateVerdict(); }); };
  function sQueue() {
    for (let k = jobs.length - 1; k >= 0; k--) if (jobs[k].tag === 'chart') jobs.splice(k, 1);
    const order = [state.n, 9, 8, 7, 6, 5, 4].filter((d, i, a) => a.indexOf(d) === i);
    for (const d of order) {
      if (!sz.results[d]) sz.results[d] = new Float64Array(EPS_N).fill(NaN);
      for (let i = 0; i < EPS_N; i++) {
        if (!isNaN(sz.results[d][i]) || inflight().some((j) => j.tag === 'chart' && j.d === d && j.i === i && j.gen === pathGen)) continue;
        enqueue({ tag: 'chart', kind: 'area', n: d, eps: EPS_GRID[i], d, i, done: (v) => { sz.results[d][i] = v / (2 * EPS_GRID[i]); chartSoon(); } });
      }
    }
  }
  function chartProgress() {
    let done = 0, total = 0;
    for (const d of STAGES) { const r = sz.results[d]; if (!r) continue; for (const v of r) { total++; if (isFinite(v)) done++; } }
    $('chartStatus').textContent = done < total ? `measuring ${done}/${total}` : 'log–log';
  }
  function fitSlopeD(vals) {
    const X = [], Y = [];
    EPS_GRID.forEach((e, i) => { if (e <= FIT_MAX && isFinite(vals[i])) { X.push(Math.log(e)); Y.push(Math.log(vals[i])); } });
    if (X.length < 5) return NaN;
    const mx = X.reduce((a, b) => a + b) / X.length, my = Y.reduce((a, b) => a + b) / Y.length;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < X.length; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; }
    return 1 - sxy / sxx;
  }
  const fitD = (d) => (sz.results[d] ? fitSlopeD(sz.results[d]) : NaN);
  const LAW = EPS_GRID.map((e) => lawArea(e) / (2 * e));
  $('lawD').textContent = fitSlopeD(LAW).toFixed(2);

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
      const areaJob = { tag: 'read', kind: 'area', n, eps, gen: pathGen, done: (v) => {
        if (gen !== readGen) return;
        got.A = v;
        $('rA').textContent = v.toFixed(4);
        $('rL').textContent = (v / (2 * eps)).toFixed(2);
        finish();
      } };
      const diffJob = { tag: 'read', kind: 'diff', n, m: n - 1, eps, gen: pathGen, done: (v) => { if (gen === readGen) { got.X = v; finish(); } } };
      jobs.unshift(areaJob, diffJob);    // the readouts never wait behind the chart
      next();
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

  // ---------- chart ----------
  const sBox = $('sBox'), sChart = $('sChart'), sTip = $('sTip');
  const serOpacity = (d) => (d === state.n ? 1 : 0.2 + 0.11 * (d - 3));
  let geo = null, hoverIdx = -1;
  (function buildLegend() {
    const lg = $('sLegend');
    for (const d of STAGES) {
      const s = document.createElement('span'), i = document.createElement('i');
      s.dataset.d = d; s.append(i, document.createTextNode(`Stage ${d}`)); lg.append(s);
    }
    for (const [cls, text] of [['ref', 'slope 1 − D (D = 2)'], ['law', "Wiener's law"]]) {
      const s = document.createElement('span'), i = document.createElement('i');
      i.className = cls; s.append(i, document.createTextNode(text)); lg.append(s);
    }
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
    const seen = (v) => { if (isFinite(v)) { ymax = Math.max(ymax, v * 1.12); ymin = Math.min(ymin, v / 1.12); } };
    for (const d in sz.results) for (const v of sz.results[d]) seen(v);
    LAW.forEach(seen);
    const lx0 = Math.log(EPS_MIN), lx1 = Math.log(EPS_MAX), ly0 = Math.log(ymin), ly1 = Math.log(ymax);
    const X = (e) => ml + ((Math.log(e) - lx0) / (lx1 - lx0)) * (W - ml - mr);
    const Y = (v) => mt + (1 - (Math.log(v) - ly0) / (ly1 - ly0)) * (H - mt - mb);
    geo = { X, W };
    const f = (v) => v.toFixed(1);
    const xt = [0.005, 0.01, 0.02, 0.05, 0.1], yt = [1, 2, 5, 10, 20, 50, 100].filter((v) => v >= ymin && v <= ymax);
    let s = '<g class="grid">';
    for (const t of xt) s += `<line x1="${f(X(t))}" x2="${f(X(t))}" y1="${mt}" y2="${H - mb}"/>`;
    for (const t of yt) s += `<line x1="${ml}" x2="${W - mr}" y1="${f(Y(t))}" y2="${f(Y(t))}"/>`;
    s += '</g>';
    for (const t of xt) s += `<text x="${f(X(t))}" y="${H - mb + 13}" text-anchor="middle">${t}</text>`;
    for (const t of yt) s += `<text x="${ml - 5}" y="${f(Y(t) + 3.5)}" text-anchor="end">${t}</text>`;
    s += `<text x="${W - mr - 2}" y="${mt + 10}" text-anchor="end">area ÷ 2ε</text>`;
    s += `<text x="${f((ml + W - mr) / 2)}" y="${H - 4}" text-anchor="middle">band radius ε (log scale)</text>`;
    let lp = '';
    EPS_GRID.forEach((e, i) => { lp += (i ? 'L' : 'M') + f(X(e)) + ' ' + f(Y(LAW[i])); });
    s += `<path class="law" d="${lp}"/>`;
    const deep = sz.results[NMAX], ia = EPS_GRID.findIndex((e) => e >= 0.03);
    if (deep && isFinite(deep[ia])) {
      const L = (e) => deep[ia] * Math.pow(e / EPS_GRID[ia], -1);
      s += `<path class="ref" d="M${f(X(EPS_MIN))} ${f(Y(L(EPS_MIN)))} L${f(X(0.1))} ${f(Y(L(0.1)))}"/>`;
    }
    const order = STAGES.filter((d) => d !== state.n).concat([state.n]);
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
    t.textContent = '';
    const tr0 = document.createElement('tr');
    ['ε', ...STAGES.map((d) => `Stage ${d}`), "Wiener's law"].forEach((c) => { const th = document.createElement('th'); th.textContent = c; tr0.append(th); });
    t.append(tr0);
    EPS_GRID.forEach((e, i) => {
      const tr = document.createElement('tr');
      [e.toFixed(4), ...STAGES.map((d) => { const r = sz.results[d]; return r && isFinite(r[i]) ? r[i].toFixed(2) : '…'; }), LAW[i].toFixed(2)]
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
    const row = (keyStyle, value, label) => {
      const r = document.createElement('div'); r.className = 'row';
      const key = document.createElement('i'); Object.assign(key.style, keyStyle);
      const b = document.createElement('b'); b.textContent = value;
      r.append(key, b, document.createTextNode(label)); sTip.append(r);
    };
    for (const d of [...STAGES].reverse()) {
      const r = sz.results[d], v = r ? r[i] : NaN;
      row({ borderTopColor: d === state.n ? 'var(--accent)' : 'var(--muted)', opacity: serOpacity(d) }, isFinite(v) ? v.toFixed(2) : '…', `stage ${d}`);
    }
    row({ borderTopStyle: 'dotted', borderTopColor: 'var(--text)' }, LAW[i].toFixed(2), "Wiener's law");
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
    $('capSeed').textContent = fmt(state.seed); $('capStage').textContent = n; $('capSteps').textContent = fmt(Math.pow(4, n));
    const e = fmtEps(state.eps);
    $('capEps').textContent = e; $('epsVal').textContent = e;
    cv.setAttribute('aria-label', `Stage ${n} of a simulated Brownian trail (${fmt(Math.pow(4, n))} steps) wrapped in a band of radius ${e}`);
    thumbs.forEach(({ n: k, b }) => b.setAttribute('aria-pressed', String(k === n)));
  }
  function setStage(n) {
    if (n === state.n) return;
    state.n = n;
    updateText(); sQueue(); measureNow(); drawChart(); updateVerdict(); schedule();
  }
  function setEps(e, fromChart) {
    state.eps = e;
    if (fromChart) $('eps').value = epsToSlider(e);
    updateText(); measureNow(); drawChart(); schedule();
  }
  function newPath(seed) {
    state.seed = seed;
    makePath(seed); sendPath(); fields.clear();
    for (let k = jobs.length - 1; k >= 0; k--) jobs.splice(k, 1);
    sz.results = {};
    fitView(); updateText(); drawThumbs(); sQueue(); measureNow(); drawChart(); updateVerdict(); schedule();
  }
  $('eps').addEventListener('input', (e) => setEps(sliderToEps(+e.target.value), false));
  $('prev').addEventListener('change', (e) => { state.prev = e.target.checked; schedule(); });
  $('chg').addEventListener('change', (e) => { state.chg = e.target.checked; schedule(); });
  $('newPath').addEventListener('click', () => newPath(1 + Math.floor(Math.random() * 999999)));
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
  makePath(state.seed); sendPath();
  $('eps').value = epsToSlider(state.eps);
  updateText();
  new ResizeObserver(() => resize()).observe(wrap);
  resize();
  drawThumbs();
  window.addEventListener('resize', drawThumbs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawThumbs(); drawMain(); });
  sQueue(); measureNow(); drawChart();
})();
