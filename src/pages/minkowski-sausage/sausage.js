// The sausage kit, shared by the three pages that measure a curve through its ε-band: Plate 31
// (monkeys-tree), Plate 32 (minkowski-sausage, this folder) and the Wiener sausage. Loaded after
// shared/draw.js. It provides the ε scale and its slider mapping, band-area measurement in a pool
// of workers, the distance-field band painter for the on-screen figure, the slope fit, and the
// log–log measuring chart with its legend, tooltip and numbers table.

// ---------- ε on a log scale ----------
function epsScale(lo, hi) {
  return {
    lo, hi,
    fromSlider: (v) => lo * Math.pow(hi / lo, v / 1000),
    toSlider: (e) => Math.round((1000 * Math.log(e / lo)) / Math.log(hi / lo)),
    grid: (n) => Array.from({ length: n }, (_, i) => lo * Math.pow(hi / lo, i / (n - 1))),
  };
}

// fitted D = 1 − slope of log(area ÷ 2ε) against log ε, over the grid points with ε ≤ fitMax
function fitSlopeD(grid, vals, fitMax, minPts = 5) {
  const X = [], Y = [];
  grid.forEach((e, i) => { if (e <= fitMax && isFinite(vals[i])) { X.push(Math.log(e)); Y.push(Math.log(vals[i])); } });
  if (X.length < minPts) return NaN;
  const mx = X.reduce((a, b) => a + b) / X.length, my = Y.reduce((a, b) => a + b) / Y.length;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < X.length; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; }
  return 1 - sxy / sxx;
}

// ---------- band areas ----------
// A round-capped, round-joined stroke of width 2ε is exactly the union of discs of radius ε along
// the curve. Areas are measured by rasterizing that stroke at about six pixels per ε and summing
// pixel coverage; diff() is the symmetric difference of two stages' bands, from per-pixel coverage.
// geom: { path(n) -> Path2D, bbox(n) -> {x0,x1,y0,y1} } for the page's curve at stage/level n.
function bandKit(createCanvas, geom) {
  const cnv = createCanvas(), g = cnv.getContext('2d', { willReadFrequently: true });
  function setup(bb, eps) {
    const bw = bb.x1 - bb.x0 + 2 * eps, bh = bb.y1 - bb.y0 + 2 * eps;
    let h = eps / 6;
    if (Math.max(bw, bh) / h > 2000) h = Math.max(bw, bh) / 2000;
    const W = Math.ceil(bw / h) + 2, H = Math.ceil(bh / h) + 2;
    cnv.width = W; cnv.height = H;
    return { h, W, H, bb };
  }
  function render(n, eps, s) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s.W, s.H);
    g.setTransform(1 / s.h, 0, 0, -1 / s.h, (eps - s.bb.x0) / s.h + 1, (s.bb.y1 + eps) / s.h + 1);
    g.lineWidth = 2 * eps; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#000';
    g.stroke(geom.path(n));
    return g.getImageData(0, 0, s.W, s.H).data;
  }
  const union = (a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });
  return {
    area(n, eps) {
      const s = setup(geom.bbox(n), eps), d = render(n, eps, s);
      let sum = 0;
      for (let i = 3; i < d.length; i += 4) sum += d[i];
      return (sum / 255) * s.h * s.h;
    },
    diff(n, m, eps) {
      const s = setup(union(geom.bbox(n), geom.bbox(m)), eps), a = render(n, eps, s), b = render(m, eps, s);
      let sum = 0;
      for (let i = 3; i < a.length; i += 4) sum += Math.abs(a[i] - b[i]);
      return (sum / 255) * s.h * s.h;
    },
  };
}

// A pool of workers running bandKit over the page's geometry, falling back to the page thread
// where workers or OffscreenCanvas are missing. The page supplies its geometry twice: `preamble`
// (a code string defining its construction functions, usually serialized from its own CORE block)
// with `geomExpr` (an expression string over `cfg` evaluating to the geom object) for the workers,
// and `localGeom(cfg)` (the same factory as a real function) for the fallback.
// configure(cfg) ships new geometry data (it must survive structured clone) and drops stale jobs.
// Jobs: { tag, kind: 'area'|'diff', n, m, eps, done(value) }.
function measurePool({ preamble, geomExpr, localGeom, size = 2 }) {
  let seq = 0, gen = 0, cfgNow = null, localKit = null;
  const jobs = [], pool = [];
  const runner = { busy: false, job: null };
  const local = () => localKit || (localKit = bandKit(() => document.createElement('canvas'), localGeom(cfgNow)));
  try {
    if (typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined') {
      const src = `${bandKit}\n${preamble}\nconst GEOM=(cfg)=>(${geomExpr});\nlet kit=null;\n` +
        `onmessage=(e)=>{const j=e.data;if(j.type==='cfg'){kit=bandKit(()=>new OffscreenCanvas(1,1),GEOM(j.cfg));return;}` +
        `postMessage({id:j.id,v:j.kind==='area'?kit.area(j.n,j.eps):kit.diff(j.n,j.m,j.eps)});};`;
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const n = Math.max(1, Math.min(size, (navigator.hardwareConcurrency || 2) - 1));
      for (let k = 0; k < n; k++) {
        const slot = { w: new Worker(url), job: null };
        slot.w.onmessage = (e) => {
          const j = slot.job; slot.job = null;
          if (j && j.id === e.data.id && j.gen === gen) j.done(e.data.v);
          next();
        };
        slot.w.onerror = (e) => {              // a broken worker leaves the pool; its job goes back in line
          if (e && e.preventDefault) e.preventDefault();
          pool.splice(pool.indexOf(slot), 1);
          if (slot.job) jobs.unshift(slot.job);
          slot.job = null; next();
        };
        pool.push(slot);
      }
    }
  } catch (_) { pool.length = 0; }
  function next() {
    if (pool.length) {
      for (const slot of pool) {
        if (slot.job || !jobs.length) continue;
        const j = jobs.shift(); j.id = ++seq; slot.job = j;
        slot.w.postMessage({ id: j.id, kind: j.kind, n: j.n, m: j.m, eps: j.eps });
      }
      return;
    }
    if (runner.busy || !jobs.length) return;    // no workers: one job at a time on the page
    const j = jobs.shift();
    runner.busy = true; runner.job = j;
    setTimeout(() => {
      const kit = local(), v = j.kind === 'area' ? kit.area(j.n, j.eps) : kit.diff(j.n, j.m, j.eps);
      runner.busy = false; runner.job = null;
      if (j.gen === gen) j.done(v);
      next();
    }, 0);
  }
  return {
    configure(cfg) {
      gen++; cfgNow = cfg; localKit = null; jobs.length = 0;
      for (const slot of pool) slot.w.postMessage({ type: 'cfg', cfg });
    },
    enqueue(job, front) { job.gen = gen; front ? jobs.unshift(job) : jobs.push(job); next(); },
    cancelTag(tag) { for (let k = jobs.length - 1; k >= 0; k--) if (jobs[k].tag === tag) jobs.splice(k, 1); },
    pending(test) { return jobs.some(test) || pool.some((s) => s.job && s.job.gen === gen && test(s.job)) || !!(runner.job && runner.job.gen === gen && test(runner.job)); },
  };
}

// fill a results store (one Float64Array of grid.length per series key) through the pool
function queueChart(pool, results, grid, order, onCell) {
  pool.cancelTag('chart');
  for (const d of order) {
    if (!results[d]) results[d] = new Float64Array(grid.length).fill(NaN);
    for (let i = 0; i < grid.length; i++) {
      if (!isNaN(results[d][i]) || pool.pending((j) => j.tag === 'chart' && j.d === d && j.i === i)) continue;
      pool.enqueue({ tag: 'chart', kind: 'area', n: d, eps: grid[i], d, i, done: (v) => { results[d][i] = v / (2 * grid[i]); onCell(); } });
    }
  }
}

// ---------- the on-screen band, from a distance field ----------
// Stroke the curve one pixel thin, take an exact Euclidean distance transform (Felzenszwalb &
// Huttenlocher), and fill the pixels within ε (see DECISIONS.md: the cost is per pixel, not per
// step or per ε). The band is a plate reproduction, so its inks are fixed print colours.
function bandPainter() {
  const seedC = document.createElement('canvas'), seedG = seedC.getContext('2d', { willReadFrequently: true });
  const bandC = document.createElement('canvas'), bandG = bandC.getContext('2d');
  const fields = new Map();
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
  // distance map for a set of paths over the visible canvas plus a margin wide enough for radius R (device px)
  function field(name, paths, R, fig, v) {
    const W = fig.canvas.width, H = fig.canvas.height;
    const key = `${W}|${H}|${fig.dpr}|${v.s}|${v.ox}|${v.oy}`;
    const c = fields.get(name);
    if (c && c.key === key && c.M >= Math.ceil(R) + 2) return c;
    const M = Math.ceil(R * 1.5) + 3;                 // headroom, so dragging ε wider rarely rebuilds
    let k = 1;
    while (((W + 2 * M) / k) * ((H + 2 * M) / k) > 3.0e6) k *= 2;
    const w = Math.ceil((W + 2 * M) / k), h = Math.ceil((H + 2 * M) / k), a = (fig.dpr * v.s) / k;
    seedC.width = w; seedC.height = h;
    seedG.setTransform(a, 0, 0, -a, (fig.dpr * v.ox + M) / k, (fig.dpr * v.oy + M) / k);
    seedG.lineWidth = 1 / a; seedG.lineJoin = 'round'; seedG.lineCap = 'round'; seedG.strokeStyle = '#000';
    for (const p of paths) seedG.stroke(p);
    const img = seedG.getImageData(0, 0, w, h).data, seed = new Uint8Array(w * h);
    for (let i = 0, j = 3; i < seed.length; i++, j += 4) seed[i] = img[j] > 30 ? 1 : 0;
    const out = { key, M, k, w, h, d2: edtSq(seed, w, h) };
    fields.delete(name); fields.set(name, out);
    while (fields.size > 4) fields.delete(fields.keys().next().value);
    return out;
  }
  const ACC = [47, 95, 158], CHG = [194, 69, 45], SOFT = 0.16;   // PRINT.accent, PRINT.red
  // spec: { key, paths } for the band, and optionally chg: { aKey, aPaths, bKey, bPaths } to
  // colour the symmetric difference between two stages' bands in the change ink
  function draw(fig, v, eps, spec) {
    const W = fig.canvas.width, H = fig.canvas.height, R = eps * v.s * fig.dpr;
    const F = field(spec.key, spec.paths, R, fig, v);
    const A = spec.chg ? field(spec.chg.aKey, spec.chg.aPaths, R, fig, v) : null;
    const B = spec.chg ? field(spec.chg.bKey, spec.chg.bPaths, R, fig, v) : null;
    bandC.width = W; bandC.height = H;
    const img = bandG.createImageData(W, H), px = img.data;
    const P = Math.max(3, Math.round(3.5 * fig.dpr)), dot = fig.dpr > 1.5 ? 2 : 1;  // screen-tone stipple, as in the book
    const reach2 = (R + 0.5) * (R + 0.5), t = 0.6;
    const dist = (f, X, Y) => Math.sqrt(f.d2[(((Y + f.M) / f.k) | 0) * f.w + (((X + f.M) / f.k) | 0)]) * f.k;
    for (let Y = 0; Y < H; Y++) {
      const fy = (((Y + F.M) / F.k) | 0) * F.w;
      for (let X = 0; X < W; X++) {
        const d2 = F.d2[fy + (((X + F.M) / F.k) | 0)] * F.k * F.k;
        if (spec.chg) {
          const da = dist(A, X, Y), db = dist(B, X, Y);
          if ((da <= R - t && db > R + t) || (db <= R - t && da > R + t)) {
            const o = (Y * W + X) * 4;
            px[o] = CHG[0]; px[o + 1] = CHG[1]; px[o + 2] = CHG[2]; px[o + 3] = 225;
            continue;
          }
        }
        if (d2 > reach2) continue;
        const cov = Math.min(1, R + 0.5 - Math.sqrt(d2)), o = (Y * W + X) * 4;
        const isDot = X % P < dot && Y % P < dot;
        px[o] = ACC[0]; px[o + 1] = ACC[1]; px[o + 2] = ACC[2];
        px[o + 3] = Math.round(255 * cov * (isDot ? 0.6 : SOFT));
      }
    }
    bandG.putImageData(img, 0, 0);
    fig.ctx.setTransform(1, 0, 0, 1, 0, 0);
    fig.ctx.drawImage(bandC, 0, 0);
  }
  return { draw, reset: () => fields.clear() };
}

// ---------- the measuring chart ----------
// A log–log SVG chart of area ÷ 2ε against ε, one line per stage, with a hover tooltip, a numbers
// table and click-to-set-ε. Like the figures, it is drawn on printed paper with fixed inks, so it
// reads the same in both themes. The kit injects its own stylesheet once.
const SAUSAGE_CSS = `
.schart-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11.5px; color: var(--muted); }
.schart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.schart-legend span.cur { color: var(--text); font-weight: 600; }
.schart-legend i { display: inline-block; width: 16px; height: 0; border-top: 2px solid #8f8e88; }
.schart-legend i.cur { border-top-color: #2f5f9e; }
.schart-legend i.ref { border-top: 1.5px dashed #151515; opacity: 0.6; }
.schart-legend i.law { border-top: 2px dotted #151515; opacity: 0.75; }
.schart-box { position: relative; }
.schart-box svg { display: block; width: 100%; height: auto; background: #ecebe6; outline: 1px solid var(--rule); touch-action: pan-y; cursor: crosshair; }
.schart-box svg .grid line { stroke: #dddcd5; stroke-width: 1; }
.schart-box svg text { font-family: var(--f-mono); font-size: 10px; fill: #66665f; }
.schart-box svg .ser { fill: none; stroke: #8f8e88; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.schart-box svg .ser.cur { stroke: #2f5f9e; }
.schart-box svg .ref { fill: none; stroke: #151515; stroke-width: 1.25; stroke-dasharray: 4 3; opacity: 0.6; }
.schart-box svg .law { fill: none; stroke: #151515; stroke-width: 1.6; stroke-dasharray: 1.5 3.5; stroke-linecap: round; opacity: 0.75; }
.schart-box svg .mark { stroke: #2f5f9e; stroke-width: 1; }
.schart-box svg .dot { fill: #2f5f9e; stroke: #ecebe6; stroke-width: 2; }
.schart-box svg .hair { stroke: #66665f; stroke-width: 1; }
.schart-tip { position: absolute; top: 8px; pointer-events: none; z-index: 2; background: var(--surface);
  border: 1px solid var(--rule); padding: 6px 8px; display: grid; gap: 2px; min-width: 112px;
  font-size: 11.5px; color: var(--muted); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
.schart-tip .hd { font-family: var(--f-mono); color: var(--text); margin-bottom: 2px; }
.schart-tip .row { display: flex; align-items: center; gap: 6px; }
.schart-tip .row i { display: inline-block; width: 12px; border-top: 2px solid #8f8e88; }
.schart-tip .row b { font-family: var(--f-mono); font-weight: 500; color: var(--text); min-width: 3.2em; text-align: right; }
.schart-nums summary { cursor: pointer; font-size: 12.5px; font-weight: 600; }
.schart-nums .tbl-wrap { overflow-x: auto; margin-top: 6px; }
.schart-nums table { border-collapse: collapse; width: 100%; font-family: var(--f-mono); font-size: 11.5px; font-variant-numeric: tabular-nums; }
.schart-nums th, .schart-nums td { padding: 3px 6px; text-align: right; border-bottom: 1px solid var(--rule); white-space: nowrap; }
.schart-nums th { color: var(--muted); font-weight: 500; }`;
let sausageCssDone = false;

// cfg: { ids: { box, svg, tip, legend, table, status? }, grid, series: [{ key, label }],
//        results, getCurrent(), getEps(), onPick(e), xTicks, yFloor: [ymin, ymax],
//        refs?: (X, Y, f, results) => svg string, extraLegend?: [{ cls, label }],
//        extraCols?: [{ label, value(i) }], extraTipRows?: (i, row) => void, serOpacity(d) }
function sausageChart(cfg) {
  if (!sausageCssDone) {
    const st = document.createElement('style');
    st.textContent = SAUSAGE_CSS;
    document.head.append(st);
    sausageCssDone = true;
  }
  const box = $(cfg.ids.box), svg = $(cfg.ids.svg), tip = $(cfg.ids.tip), table = cfg.ids.table && $(cfg.ids.table);
  const grid = cfg.grid;
  let geo = null, hoverIdx = -1;
  (function buildLegend() {
    const lg = $(cfg.ids.legend);
    for (const s of cfg.series) {
      const sp = document.createElement('span'), i = document.createElement('i');
      sp.dataset.d = s.key; sp.append(i, document.createTextNode(s.label)); lg.append(sp);
    }
    for (const { cls, label } of cfg.extraLegend || []) {
      const sp = document.createElement('span'), i = document.createElement('i');
      i.className = cls; sp.append(i, document.createTextNode(label)); lg.append(sp);
    }
  })();
  function paintLegend() {
    $(cfg.ids.legend).querySelectorAll('span[data-d]').forEach((sp) => {
      const d = +sp.dataset.d, cur = d === cfg.getCurrent(), i = sp.querySelector('i');
      sp.classList.toggle('cur', cur);
      i.classList.toggle('cur', cur);
      i.style.opacity = cur ? 1 : cfg.serOpacity(d);
    });
  }
  function interpL(r, e) {
    for (let i = 0; i < grid.length - 1; i++) {
      if (e >= grid[i] && e <= grid[i + 1] && isFinite(r[i]) && isFinite(r[i + 1])) {
        const f = Math.log(e / grid[i]) / Math.log(grid[i + 1] / grid[i]);
        return Math.exp(Math.log(r[i]) + f * (Math.log(r[i + 1]) - Math.log(r[i])));
      }
    }
    return NaN;
  }
  function draw() {
    const W = Math.max(240, Math.round(box.clientWidth || 320)), H = 226;
    const ml = 34, mr = 10, mt = 10, mb = 34;
    let [ymin, ymax] = cfg.yFloor;
    const seen = (v) => { if (isFinite(v)) { ymax = Math.max(ymax, v * 1.12); ymin = Math.min(ymin, v / 1.12); } };
    for (const d in cfg.results) for (const v of cfg.results[d]) seen(v);
    if (cfg.alsoScale) cfg.alsoScale.forEach(seen);
    const lo = grid[0], hi = grid[grid.length - 1];
    const lx0 = Math.log(lo), lx1 = Math.log(hi), ly0 = Math.log(ymin), ly1 = Math.log(ymax);
    const X = (e) => ml + ((Math.log(e) - lx0) / (lx1 - lx0)) * (W - ml - mr);
    const Y = (v) => mt + (1 - (Math.log(v) - ly0) / (ly1 - ly0)) * (H - mt - mb);
    geo = { X, W };
    const f = (v) => v.toFixed(1);
    const xt = cfg.xTicks, yt = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].filter((v) => v >= ymin && v <= ymax);
    let s = '<g class="grid">';
    for (const t of xt) s += `<line x1="${f(X(t))}" x2="${f(X(t))}" y1="${mt}" y2="${H - mb}"/>`;
    for (const t of yt) s += `<line x1="${ml}" x2="${W - mr}" y1="${f(Y(t))}" y2="${f(Y(t))}"/>`;
    s += '</g>';
    for (const t of xt) s += `<text x="${f(X(t))}" y="${H - mb + 13}" text-anchor="middle">${t}</text>`;
    for (const t of yt) s += `<text x="${ml - 5}" y="${f(Y(t) + 3.5)}" text-anchor="end">${t}</text>`;
    s += `<text x="${W - mr - 2}" y="${mt + 10}" text-anchor="end">area ÷ 2ε</text>`;
    s += `<text x="${f((ml + W - mr) / 2)}" y="${H - 4}" text-anchor="middle">band radius ε (log scale)</text>`;
    if (cfg.refs) s += cfg.refs(X, Y, f, cfg.results);
    const cur = cfg.getCurrent();
    const order = cfg.series.map((x) => x.key).filter((d) => d !== cur).concat([cur]);
    for (const d of order) {
      const r = cfg.results[d]; if (!r) continue;
      let p = '';
      r.forEach((v, i) => { if (isFinite(v)) p += (p ? 'L' : 'M') + f(X(grid[i])) + ' ' + f(Y(v)); });
      if (p) s += `<path class="ser${d === cur ? ' cur' : ''}" style="stroke-opacity:${d === cur ? 1 : cfg.serOpacity(d)}" d="${p}"/>`;
    }
    if (hoverIdx >= 0) s += `<line class="hair" x1="${f(X(grid[hoverIdx]))}" x2="${f(X(grid[hoverIdx]))}" y1="${mt}" y2="${H - mb}"/>`;
    const ex = X(Math.min(hi, Math.max(lo, cfg.getEps())));
    s += `<line class="mark" x1="${f(ex)}" x2="${f(ex)}" y1="${mt}" y2="${H - mb}"/>`;
    const cr = cfg.results[cur];
    if (cr) { const v = interpL(cr, cfg.getEps()); if (isFinite(v)) s += `<circle class="dot" cx="${f(ex)}" cy="${f(Y(v))}" r="4"/>`; }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
    paintLegend();
    if (table) drawTable();
    if (cfg.ids.status) progress();
  }
  function progress() {
    let done = 0, total = 0;
    for (const { key } of cfg.series) { const r = cfg.results[key]; if (!r) continue; for (const v of r) { total++; if (isFinite(v)) done++; } }
    $(cfg.ids.status).textContent = done < total ? `measuring ${done}/${total}` : 'log–log';
  }
  function drawTable() {
    table.textContent = '';
    const tr0 = document.createElement('tr');
    ['ε', ...cfg.series.map((x) => x.label), ...(cfg.extraCols || []).map((c) => c.label)]
      .forEach((c) => { const th = document.createElement('th'); th.textContent = c; tr0.append(th); });
    table.append(tr0);
    grid.forEach((e, i) => {
      const tr = document.createElement('tr');
      [e.toFixed(4),
        ...cfg.series.map(({ key }) => { const r = cfg.results[key]; return r && isFinite(r[i]) ? r[i].toFixed(2) : '…'; }),
        ...(cfg.extraCols || []).map((c) => c.value(i))]
        .forEach((c) => { const td = document.createElement('td'); td.textContent = c; tr.append(td); });
      table.append(tr);
    });
  }
  function nearestIdx(e) {
    const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (geo.W / r.width);
    let best = 0, bd = Infinity;
    grid.forEach((g, i) => { const dx = Math.abs(geo.X(g) - x); if (dx < bd) { bd = dx; best = i; } });
    return best;
  }
  function showTip(i) {
    tip.textContent = '';
    const hd = document.createElement('div'); hd.className = 'hd'; hd.textContent = `ε = ${grid[i].toFixed(4)}`; tip.append(hd);
    const row = (keyStyle, value, label) => {
      const r = document.createElement('div'); r.className = 'row';
      const key = document.createElement('i'); Object.assign(key.style, keyStyle);
      const b = document.createElement('b'); b.textContent = value;
      r.append(key, b, document.createTextNode(label)); tip.append(r);
    };
    for (const { key, label } of [...cfg.series].reverse()) {
      const r = cfg.results[key], v = r ? r[i] : NaN;
      row({ borderTopColor: key === cfg.getCurrent() ? '#2f5f9e' : '#8f8e88', opacity: key === cfg.getCurrent() ? 1 : cfg.serOpacity(key) },
        isFinite(v) ? v.toFixed(2) : '…', label.toLowerCase());
    }
    if (cfg.extraTipRows) cfg.extraTipRows(i, row);
    tip.hidden = false;
    const bw = box.clientWidth, tw = tip.offsetWidth, px = (geo.X(grid[i]) / geo.W) * bw;
    tip.style.left = (px + 12 + tw > bw ? Math.max(0, px - 12 - tw) : px + 12) + 'px';
  }
  svg.addEventListener('pointermove', (e) => { if (!geo) return; hoverIdx = nearestIdx(e); draw(); showTip(hoverIdx); });
  svg.addEventListener('pointerleave', () => { hoverIdx = -1; tip.hidden = true; draw(); });
  svg.addEventListener('click', (e) => { if (geo) cfg.onPick(grid[nearestIdx(e)]); });
  new ResizeObserver(() => draw()).observe(box);
  return { draw };
}
