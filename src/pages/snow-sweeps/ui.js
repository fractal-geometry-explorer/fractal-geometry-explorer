(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-US');
  const PRINT = { paper: '#ecebe6', ink: '#151515', rule: '#c9c8c2', muted: '#66665f', accent: '#2f5f9e', red: '#c2452d', faint: '#bdbbb3', gray: '#8f8e88' };
  const RAMP = [[233, 185, 73], [217, 113, 59], [184, 66, 79], [125, 58, 120], [63, 79, 151], [43, 122, 138]];
  const ramp = (t, a = 1) => {
    const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x)), f = x - i;
    const c = RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * f));
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };
  const CAT = ['#151515', '#9a988f', '#2f5f9e', '#c2452d', '#3f8f6c', '#b58a2a', '#6b4e9b', '#5f8fae'];

  // ---------- shared plumbing ----------
  function figure(canvas, draw) {
    const wrap = canvas.parentElement;
    const f = { canvas, ctx: canvas.getContext('2d'), w: 1, h: 1, dpr: 1, draw };
    const resize = () => {
      f.dpr = Math.min(2, window.devicePixelRatio || 1);
      f.w = wrap.clientWidth || 1; f.h = wrap.clientHeight || 1;
      canvas.width = Math.round(f.w * f.dpr); canvas.height = Math.round(f.h * f.dpr);
      f.draw();
    };
    new ResizeObserver(resize).observe(wrap);
    return f;
  }
  function fitBox(f, bb, pad = 0.04) {
    const w = Math.max(1e-9, bb.x1 - bb.x0), h = Math.max(1e-9, bb.y1 - bb.y0), s = Math.min(f.w / (w * (1 + 2 * pad)), f.h / (h * (1 + 2 * pad)));
    return { s, ox: f.w / 2 - ((bb.x0 + bb.x1) / 2) * s, oy: f.h / 2 + ((bb.y0 + bb.y1) / 2) * s };
  }
  const toWorld = (f, v) => f.ctx.setTransform(f.dpr * v.s, 0, 0, -f.dpr * v.s, f.dpr * v.ox, f.dpr * v.oy);
  const toScreen = (f) => f.ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  function paper(f, color) { f.ctx.setTransform(1, 0, 0, 1, 0, 0); f.ctx.fillStyle = color; f.ctx.fillRect(0, 0, f.canvas.width, f.canvas.height); }
  function polyPath(P, closed = true) {
    const p = new Path2D(), m = P.length / 2;
    p.moveTo(P[0], P[1]);
    for (let i = 1; i < m; i++) p.lineTo(P[2 * i], P[2 * i + 1]);
    if (closed) p.closePath();
    return p;
  }
  function bbox(P, bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }) {
    for (let i = 0; i < P.length; i += 2) { bb.x0 = Math.min(bb.x0, P[i]); bb.x1 = Math.max(bb.x1, P[i]); bb.y0 = Math.min(bb.y0, P[i + 1]); bb.y1 = Math.max(bb.y1, P[i + 1]); }
    return bb;
  }
  function stepButtons(el, values, text, aria, onPick) {
    const bs = values.map((v) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = text(v); b.setAttribute('aria-label', aria(v));
      b.addEventListener('click', () => onPick(v));
      el.append(b);
      return b;
    });
    const mark = (cur) => bs.forEach((b, i) => b.setAttribute('aria-pressed', String(values[i] === cur)));
    mark.buttons = bs;
    return mark;
  }
  // pan and zoom: a quick rescaled snapshot while moving, a full redraw once it settles
  function zoomable(wrapId, canvasId, fitOf, render, opts = {}) {
    const maxZoom = opts.maxZoom || 400;
    const wrap = $(wrapId), z = { view: null, user: false, snapView: null, raf: 0, full: 0 };
    const snap = document.createElement('canvas');
    const f = figure($(canvasId), () => draw());
    function touch() { wrap.style.touchAction = z.view && z.view.s > z.view.fit * 1.02 ? 'none' : 'pan-y'; }
    function draw() {
      if (!z.view || !z.user) { z.view = fitOf(f); z.view.fit = z.view.s; z.user = false; touch(); }
      render(f, z.view);
      snap.width = f.canvas.width; snap.height = f.canvas.height; snap.getContext('2d').drawImage(f.canvas, 0, 0);
      z.snapView = { s: z.view.s, ox: z.view.ox, oy: z.view.oy };
    }
    function quick() {
      const v = z.view, k = v.s / z.snapView.s, c = f.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PRINT.paper; c.fillRect(0, 0, f.canvas.width, f.canvas.height);
      c.drawImage(snap, (v.ox - z.snapView.ox * k) * f.dpr, (v.oy - z.snapView.oy * k) * f.dpr, snap.width * k, snap.height * k);
    }
    function schedule() { if (!z.raf) z.raf = requestAnimationFrame(() => { z.raf = 0; draw(); }); }
    function moved() {
      if (!z.snapView) { schedule(); return; }
      if (!z.raf) z.raf = requestAnimationFrame(() => { z.raf = 0; quick(); });
      clearTimeout(z.full); z.full = setTimeout(schedule, 160);
    }
    function zoomAt(px, py, k) {
      const v = z.view, ns = Math.min(v.fit * maxZoom, Math.max(v.fit * 0.8, v.s * k)), wx = (px - v.ox) / v.s, wy = (v.oy - py) / v.s;
      v.s = ns; v.ox = px - wx * ns; v.oy = py + wy * ns; z.user = true; touch(); moved();
    }
    function pan(dx, dy) { z.view.ox += dx; z.view.oy += dy; z.user = true; moved(); }
    wrap.querySelector('[data-z="in"]').addEventListener('click', () => zoomAt(f.w / 2, f.h / 2, 1.6));
    wrap.querySelector('[data-z="out"]').addEventListener('click', () => zoomAt(f.w / 2, f.h / 2, 1 / 1.6));
    wrap.querySelector('[data-z="fit"]').addEventListener('click', () => { z.user = false; schedule(); });
    const pts = new Map();
    let pinch = null, down = null;
    const local = (e) => { const r = wrap.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.view-tools')) return;
      pts.set(e.pointerId, local(e));
      down = pts.size === 1 ? { p: local(e), t: performance.now(), moved: 0 } : null;
      try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; }
      wrap.classList.add('dragging');
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = local(e);
      pts.set(e.pointerId, cur);
      if (down) down.moved = Math.max(down.moved, Math.hypot(cur[0] - down.p[0], cur[1] - down.p[1]));
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        pan(m[0] - pinch.m[0], m[1] - pinch.m[1]);
        if (pinch.d > 0) zoomAt(m[0], m[1], d / pinch.d);
        pinch = { d, m };
      } else if (pts.size === 1 && (e.pointerType !== 'touch' || z.view.s > z.view.fit * 1.02)) pan(cur[0] - prev[0], cur[1] - prev[1]);
    });
    const end = (e) => {
      if (down && pts.size === 1 && down.moved < 5 && opts.onTap) { const [x, y] = local(e), v = z.view; opts.onTap((x - v.ox) / v.s, (v.oy - y) / v.s); }
      down = null;
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) wrap.classList.remove('dragging');
    };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', (e) => { down = null; end(e); });
    wrap.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const [x, y] = local(e); zoomAt(x, y, Math.exp(-e.deltaY * 0.0045)); }, { passive: false });
    wrap.addEventListener('dblclick', (e) => { if (e.target.closest('.view-tools')) return; const [x, y] = local(e); zoomAt(x, y, e.shiftKey ? 0.5 : 2); });
    return { f, z, schedule, refit: () => { z.user = false; schedule(); } };
  }
  // chunked paths: many small paths fill far faster than one path with a hundred thousand pieces
  function chunked(count, add, size = 512) {
    const out = [];
    let p = null;
    for (let i = 0; i < count; i++) { if (i % size === 0) { p = new Path2D(); out.push(p); } add(p, i); }
    return out;
  }
  // fill and outline in the same colour, so that tiles which only meet along an edge show no hairline seams
  function solid(c, paths, color, lw) {
    c.fillStyle = color; c.strokeStyle = color; c.lineWidth = lw; c.lineJoin = 'miter';
    for (const p of paths) { c.fill(p); c.stroke(p); }
  }
  const dot = (c, v, x, y, r = 4, color = PRINT.red) => { c.beginPath(); c.arc(v.ox + x * v.s, v.oy - y * v.s, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke(); };

  // a polyline (Float64Array or [[x,y],...]) as SVG points with y flipped
  const svgPts = (P) => (P instanceof Float64Array ? Array.from({ length: P.length / 2 }, (_, i) => [P[2 * i], P[2 * i + 1]]) : P).map(([x, y]) => `${x.toFixed(4)},${(-y).toFixed(4)}`).join(' ');
  function miniCurve(id, P, dots = true) {
    const pts = P instanceof Float64Array ? Array.from({ length: P.length / 2 }, (_, i) => [P[2 * i], P[2 * i + 1]]) : P;
    $(id).innerHTML = `<line x1="0" y1="0" x2="1" y2="0" stroke="#8a8a84" stroke-width="0.008" stroke-dasharray="0.025 0.02"/>` +
      `<polyline points="${svgPts(pts)}" fill="none" stroke="currentColor" stroke-width="0.02" stroke-linejoin="round"/>` +
      (dots ? `<g fill="currentColor">${pts.map(([x, y], i) => `<circle cx="${x.toFixed(4)}" cy="${(-y).toFixed(4)}" r="${i === 0 || i === pts.length - 1 ? 0.03 : 0.018}"/>`).join('')}</g>` : '');
  }
  function miniTree(id, links, dx = 0) {
    const ends = new Set(), mid = new Set(), k = (x, y) => `${x.toFixed(4)},${y.toFixed(4)}`;
    let s = '';
    for (const [px, py, qx, qy] of links) {
      s += `<line x1="${(px + dx).toFixed(4)}" y1="${(-py).toFixed(4)}" x2="${(qx + dx).toFixed(4)}" y2="${(-qy).toFixed(4)}" stroke="currentColor" stroke-width="0.02" stroke-linecap="round"/>`;
      mid.add(k(px + dx, py)); mid.add(k(qx + dx, qy));
    }
    s += `<g fill="currentColor">${[...mid].map((p) => { const [x, y] = p.split(',').map(Number); const big = (Math.abs(x - dx) < 1e-6 || Math.abs(x - dx - 1) < 1e-6) && Math.abs(y) < 1e-6; return `<circle cx="${x}" cy="${-y}" r="${big ? 0.03 : 0.018}"/>`; }).join('')}</g>`;
    return s;
  }
  // canvas transform for a similarity map f = [ar, ai, br, bi, m] composed with the view
  function setMap(f, c, v, fig) {
    const [ar, ai, br, bi, m] = f, k = fig.dpr * v.s;
    if (m) c.setTransform(k * ar, -k * ai, k * ai, k * ar, fig.dpr * (v.ox + v.s * br), fig.dpr * (v.oy - v.s * bi));
    else c.setTransform(k * ar, -k * ai, -k * ai, -k * ar, fig.dpr * (v.ox + v.s * br), fig.dpr * (v.oy - v.s * bi));
  }
  const segPath = (segs, pick) => { const p = new Path2D(); for (const s of segs) if (!pick || pick(s)) { p.moveTo(s[0], s[1]); p.lineTo(s[2], s[3]); } return p; };

  // ====================== Plates 68–69: snowflake sweeps ======================
  const stA = { gen: '7', n: 3, seq: ['S', 'S', 'S', 'S', 'S', 'S'], mode: 'teragon', swap: true };
  const MAXA = { 7: 6, 13: 4 };
  let cacheA = { key: '' };
  function gensA() {
    const pair = stA.gen === '7' ? [GEN_S, GEN_F] : stA.swap ? [GEN_13, GEN_13M] : [GEN_13S, GEN_13F];
    return stA.seq.slice(0, stA.n).map((s) => (s === 'S' ? pair[0] : pair[1]));
  }
  function dataA() {
    const key = `${stA.gen}|${stA.n}|${stA.seq.join('')}|${stA.swap}`;
    if (cacheA.key === key) return cacheA;
    const gens = gensA(), L = leaves(gens), P = curveOf(gens);
    return (cacheA = { key, L, P, path: polyPath(P, false), round: null, tiles: null });
  }
  const FLAKE = [kochFlake(2), kochFlake(3), kochFlake(4), kochFlake(5)].map((K) => polyPath(K.flat(), true));
  const FLAKE_OUT = polyPath(kochFlake(5).flat(), true);
  // the rounded curve: each interval becomes a sixth of a circle, bulging toward the snowflake it owns
  function roundedCurve(L) {
    const out = [0, 0];
    for (const [f, rev] of L) {
      let [ax, ay] = C.app(f, 0, 0), [bx, by] = C.app(f, 1, 0), side = f[4] ? -1 : 1;
      if (rev) { [ax, ay, bx, by] = [bx, by, ax, ay]; side = -side; }
      arcPts(ax, ay, bx, by, side, 6, out);
    }
    out.push(1, 0);
    return out.slice(2);
  }
  // The snowflake's outline, rounded in parallel. Plate 69 does this two ways, measured from the scan: the two small
  // figures (stages 1 and 2) bow the edges of the Koch curve at the same stage inward; the large one (stage 3) bows
  // a finer outline outward, with edges as short as the curve's shortest intervals, 1/(3√3)ⁿ.
  const outlineCache = {};
  function roundedOutline(n) {
    const key = n;
    if (outlineCache[key]) return outlineCache[key];
    const big = n >= 3, j = big ? Math.min(11, 3 * n - 1) : 2 * n - 1, side = big ? -1 : 1, per = big ? (j > 9 ? 3 : 5) : 10;
    const O = j < 0 ? [[0, 0], [1, 0], [0.5, R3 / 2]] : snowOutline(j), out = [];
    for (let i = 0; i < O.length; i++) { const [ax, ay] = O[i], [bx, by] = O[(i + 1) % O.length]; arcPts(ax, ay, bx, by, side, per, out); }
    return (outlineCache[key] = { pts: out, per, count: O.length, i1: O.findIndex(([x, y]) => Math.abs(x - 1) < 1e-9 && Math.abs(y) < 1e-9) });
  }
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'rounded') return fitBox(f, { x0: -0.14, x1: 1.14, y0: -0.36, y1: 0.94 }, 0.02);
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: stA.mode === 'domains' ? -0.36 : -0.31, y1: 0.89 }, 0.03);
  }, (f, v) => {
    const c = f.ctx, D = dataA(), mode = stA.mode;
    paper(f, PRINT.paper); toWorld(f, v);
    const Lmin = Math.pow(stA.gen === '13' ? 1 / (3 * R3) : 1 / 3, stA.n) * v.s;
    if (mode === 'teragon') {
      c.strokeStyle = '#a9a79f'; c.lineWidth = 1 / v.s; c.setLineDash([4 / v.s, 3 / v.s]); c.stroke(FLAKE_OUT); c.setLineDash([]);
      c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = Math.max(0.5, Math.min(2.2, Lmin * 0.12)) / v.s; c.stroke(D.path);
    } else if (mode === 'domains') {
      const p = polyPath(D.P, false); p.lineTo(1, -0.33); p.lineTo(0, -0.33); p.closePath();
      c.fillStyle = PRINT.ink; c.fill(p);
      c.strokeStyle = PRINT.ink; c.lineWidth = 0.6 / v.s; c.stroke(D.path);
    } else if (mode === 'rounded') {
      const O = roundedOutline(stA.n);
      c.beginPath(); c.arc(0.5, R3 / 6, 0.64, 0, 2 * Math.PI); c.fillStyle = PRINT.ink; c.fill();
      c.fillStyle = '#e4e2da'; c.fill(polyPath(O.pts, true));
      if (!D.round) D.round = roundedCurve(D.L);
      // the side to the right of the curve, closed along the outline's lower arc, from 1 back to 0
      const p = polyPath(D.round, false);
      for (let i = O.i1 * O.per; i >= 0; i--) p.lineTo(O.pts[2 * i], O.pts[2 * i + 1]);
      p.closePath(); c.fillStyle = '#9b9a93'; c.fill(p);
      const ring = new Path2D(); ring.arc(0.5, R3 / 6, 0.64, 0, 2 * Math.PI); ring.closePath(); ring.addPath(polyPath(O.pts, true));
      c.fillStyle = PRINT.ink; c.fill(ring, 'evenodd');
    } else {
      // every interval owns a snowflake built on it; they tile the big one
      const n = D.L.length, k = Math.max(0, Math.min(3, Math.round(Math.log(Math.max(1, Lmin)) / Math.log(3)))), K = FLAKE[k];
      D.L.forEach(([fm], i) => { setMap(fm, c, v, f); c.fillStyle = ramp(n > 1 ? i / (n - 1) : 0.5); c.fill(K); });
      toWorld(f, v); c.strokeStyle = 'rgba(21,21,21,0.55)'; c.lineWidth = Math.max(0.4, Math.min(1.2, Lmin * 0.05)) / v.s; c.stroke(D.path);
    }
    toScreen(f);
    if (mode !== 'rounded') { dot(c, v, 0, 0); dot(c, v, 1, 0); }
  });
  function setA(refit) {
    const D = dataA(), max = MAXA[stA.gen];
    markGA(stA.gen); markSA(stA.n); markMA(stA.mode);
    markSA.buttons.forEach((b, i) => { b.disabled = i > max || (stA.mode === 'tiles' && i > 5); });
    $('swapWrap').hidden = stA.gen !== '13'; $('swapA').checked = stA.swap;
    seqBtnsA.forEach((b, k) => { const s = stA.seq[k]; b.innerHTML = `${s}<small>${k + 1}</small>`; b.setAttribute('aria-pressed', String(s === 'F')); b.setAttribute('aria-label', `Stage ${k + 1}: generator ${s}`); b.classList.toggle('off', k >= stA.n); b.hidden = k >= max; });
    $('sAv').textContent = `stage ${stA.n}`; $('cAs').textContent = stA.n; $('cAn').textContent = `${fmt(D.L.length)} interval${D.L.length > 1 ? 's' : ''}`;
    $('rAa').textContent = fmt(D.L.length);
    $('cAt').textContent = { teragon: 'Snowflake sweep', domains: 'Two domains', rounded: 'Rounded off', tiles: 'Unequal snowflakes' }[stA.mode];
    $('snowDim').textContent = stA.gen === '7' ? 'Seven intervals: six of length 1/3, one of 1/√3 · 6·(1/3)² + (1/√3)² = 1 · D = 2 · rivers D = log 4/log 3 ≈ 1.2619'
      : 'Thirteen intervals: seven of length 1/3, six of 1/(3√3) · 7·(1/3)² + 6·(1/(3√3))² = 1 · D = 2';
    $('infoA').innerHTML = {
      teragon: stA.gen === '7' ? 'Dashed: the Koch snowflake on the triangle with base [0, 1], the region the curve fills. Flip any stage between S and F above: the curve changes, the region does not.'
        : 'The thirteen-interval generator replaces the long fifth leg by a copy of the whole generator, reduced by 1/√3 and placed in the F position. Its F is its mirror image, as before.',
      domains: '<b>Plate 68.</b> An advanced teragon, drawn as the boundary between two fantastically intertwined domains, "serves better than any number of words to explain what plane-filling means." Everything to the right of the curve is black.',
      rounded: `<b>Plate 69.</b> Each interval is rounded off into one sixth of a circle, which makes the teragon look isotropic and more "natural". The snowflake's outline is rounded in parallel, ${stA.n >= 3 ? 'here as in the large figure: a finer outline, its edges as short as the curve\'s shortest intervals, bowed outward' : 'here as in the two small figures: the Koch curve at the same stage, its edges bowed inward'}. The two sides of the curve are shown in two grays.`,
      tiles: `As a by-product the snowflake is tiled by unequal snowflakes: every interval owns the snowflake built on it. At stage 1 that is ${stA.gen === '7' ? 'one snowflake of scale 1/√3 in the middle and six of scale 1/3 around it' : 'seven snowflakes of scale 1/3 and six of scale 1/(3√3)'}. Coloured in the order the curve reaches them.`,
    }[stA.mode];
    if (refit) zA.refit(); else zA.schedule();
  }
  const markGA = stepButtons($('gA'), ['7', '13'], (g) => (g === '7' ? '7 intervals' : '13 intervals'), (g) => `${g}-interval generator`, (g) => { stA.gen = g; stA.n = Math.min(stA.n, MAXA[g]); setA(true); });
  const markSA = stepButtons($('sA'), [0, 1, 2, 3, 4, 5, 6], String, (n) => `Stage ${n}`, (n) => { stA.n = n; setA(false); });
  const MODES_A = { teragon: 'Teragon', domains: 'Two domains', rounded: 'Rounded', tiles: 'Snowflake tiles' };
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Draw: ${MODES_A[k]}`, (k) => { stA.mode = k; if (k === 'tiles' && stA.gen === '7' && stA.n > 5) stA.n = 5; setA(true); });
  const seqBtnsA = [];
  for (let k = 0; k < 6; k++) {
    const b = document.createElement('button'); b.type = 'button';
    b.addEventListener('click', () => { stA.seq[k] = stA.seq[k] === 'S' ? 'F' : 'S'; setA(false); });
    $('seqA').append(b); seqBtnsA.push(b);
  }
  for (const [label, make] of [['All S', () => 'SSSSSS'], ['All F', () => 'FFFFFF'], ['Alternate', () => 'SFSFSF'], ['Random', () => Array.from({ length: 6 }, () => (Math.random() < 0.5 ? 'S' : 'F')).join('')]]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', () => { stA.seq = make().split(''); setA(false); });
    $('preSeq').append(b);
  }
  $('plate68').addEventListener('click', () => { Object.assign(stA, { gen: '13', n: 4, mode: 'domains', swap: true, seq: 'SSSSSS'.split('') }); setA(true); });
  $('plate69').addEventListener('click', () => { Object.assign(stA, { gen: '13', n: 3, mode: 'rounded', swap: false, seq: 'SFFFFF'.split('') }); setA(true); });
  $('swapA').addEventListener('change', (e) => { stA.swap = e.target.checked; setA(false); });
  miniCurve('miniS', SNOW_PTS); miniCurve('miniF', curveOf([GEN_F])); miniCurve('mini13', curveOf([GEN_13]), false);

  // ====================== Plates 70–71: the Peano–Gosper curve and its trees ======================
  const stB = { n: 4, mode: 'bw' };
  const cacheB = {};
  function dataB(n) {
    if (cacheB[n]) return cacheB[n];
    const Lp = flowsnakeLattice(n), T = latticeFrame(Lp), P = new Float64Array(2 * Lp.length);
    Lp.forEach(([i, j], k) => { const [x, y] = T(i, j); P[2 * k] = x; P[2 * k + 1] = y; });
    return (cacheB[n] = { Lp, T, P, path: polyPath(P, false), box: bbox(P), trees: null });
  }
  function treesB(D, n) {
    if (D.trees) return D.trees;
    const G = gosperTrees(n), T = D.T;
    const cen = G.tris.map((t) => { let x = 0, y = 0; for (const [i, j] of t) { const [px, py] = T(i, j); x += px / 3; y += py / 3; } return [x, y]; });
    // each finger is a tree; its mouth is the triangle that opens onto the island's edge
    const onEdge = new Set();
    const ekey = (a, b) => `${Math.min(a[0] * 1e5 + a[1], b[0] * 1e5 + b[1])}:${Math.max(a[0] * 1e5 + a[1], b[0] * 1e5 + b[1])}`;
    const bset = new Set(G.boundary.map(([a, b]) => ekey(a, b)));
    G.tris.forEach((t, k) => { for (const [u, w] of [[0, 1], [1, 2], [0, 2]]) if (bset.has(ekey(t[u], t[w]))) onEdge.add(k); });
    // root each component at a mouth, then measure how far upstream each link reaches, as the crow flies
    const N = G.tris.length, parent = new Int32Array(N).fill(-2), reach = new Float64Array(N), order = [];
    let fingers = 0;
    const visit = (root) => {
      fingers++; parent[root] = -1; const stack = [root];
      while (stack.length) { const a = stack.pop(); order.push(a); for (const b of G.adj[a]) if (parent[b] === -2) { parent[b] = a; stack.push(b); } }
    };
    for (const k of onEdge) if (parent[k] === -2) visit(k);
    for (let k = 0; k < N; k++) if (parent[k] === -2) visit(k);
    // for every triangle, its farthest source upstream, as the crow flies (each node keeps the child's source
    // that lies farthest from it)
    const farX = new Float64Array(N), farY = new Float64Array(N);
    for (let k = 0; k < N; k++) { farX[k] = cen[k][0]; farY[k] = cen[k][1]; }
    const best = new Float64Array(N);
    for (let i = order.length - 1; i >= 0; i--) {
      const a = order[i], p = parent[a];
      if (p < 0) continue;
      const d = Math.hypot(farX[a] - cen[p][0], farY[a] - cen[p][1]);
      if (d > best[p]) { best[p] = d; farX[p] = farX[a]; farY[p] = farY[a]; }
    }
    const segs = [];
    for (const [a, b] of G.links) {
      const child = parent[a] === b ? a : b, down = child === a ? b : a, s = G.sideOf[a];
      segs.push([cen[a][0], cen[a][1], cen[b][0], cen[b][1], s, Math.hypot(farX[child] - cen[down][0], farY[child] - cen[down][1])]);
    }
    const bsegs = G.boundary.map(([a, b, s]) => { const [x0, y0] = T(...a), [x1, y1] = T(...b); return [x0, y0, x1, y1, s]; });
    const riv = segs.filter((s) => s[4] < 0).length;      // rivers follow the white fingers, to the right of the curve
    return (D.trees = { segs, bsegs, riv, wat: segs.length - riv, fingers, maxReach: Math.max(...segs.map((s) => s[5])) });
  }
  const zB = zoomable('wB', 'cB', (f) => { const b = { ...dataB(stB.n).box }; if (stB.mode === 'bw') b.y1 = Math.max(b.y1, 0.75); return fitBox(f, b, 0.04); }, (f, v) => {
    const c = f.ctx, D = dataB(stB.n), L = Math.pow(1 / Math.sqrt(7), stB.n) * v.s;
    paper(f, PRINT.paper); toWorld(f, v);
    if (stB.mode === 'curve') {
      c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = Math.max(0.5, Math.min(2.4, L * 0.14)) / v.s; c.stroke(D.path);
    } else if (stB.mode === 'bw') {
      const b = D.box, p = polyPath(D.P, false);
      p.lineTo(b.x1 + 0.08, 0); p.lineTo(b.x1 + 0.08, b.y1 + 0.3); p.lineTo(b.x0 - 0.08, b.y1 + 0.3); p.lineTo(b.x0 - 0.08, 0); p.closePath();
      c.fillStyle = PRINT.ink; c.fill(p, 'evenodd');
    } else {
      const T = treesB(D, stB.n), w0 = Math.max(0.5, Math.min(1.4, L * 0.1)) / v.s;
      c.lineCap = 'round'; c.lineJoin = 'round';
      if (stB.mode === 'trees') {
        c.lineWidth = w0; c.strokeStyle = PRINT.ink; c.stroke(segPath(T.segs, (s) => s[4] < 0));
        c.strokeStyle = PRINT.gray; c.stroke(segPath(T.segs, (s) => s[4] > 0));
        c.strokeStyle = 'rgba(194,69,45,0.35)'; c.lineWidth = w0 * 0.8; c.stroke(D.path);
      } else {
        // widths in proportion to how far each river reaches upstream, as the crow flies
        const B = 6, groups = Array.from({ length: 2 * B }, () => new Path2D());
        for (const s of T.segs) { const g = Math.min(B - 1, Math.floor((s[5] / T.maxReach) * B)); const p = groups[(s[4] < 0 ? 0 : B) + g]; p.moveTo(s[0], s[1]); p.lineTo(s[2], s[3]); }
        for (let g = 0; g < 2 * B; g++) { c.strokeStyle = g < B ? PRINT.ink : PRINT.gray; c.lineWidth = w0 * (0.6 + 6 * ((g % B) / (B - 1)) ** 2); c.stroke(groups[g]); }
        c.lineWidth = w0 * 6.6; c.strokeStyle = PRINT.ink; c.stroke(segPath(T.bsegs, (s) => s[4] < 0)); c.strokeStyle = PRINT.gray; c.stroke(segPath(T.bsegs, (s) => s[4] > 0));
      }
    }
    toScreen(f);
    if (stB.mode !== 'bw') { dot(c, v, 0, 0); dot(c, v, 1, 0); }
  });
  const MODES_B = { bw: 'Black and white', trees: 'Rivers and watersheds', widths: 'Widths by importance', curve: 'Curve' };
  const CAP_B = {
    bw: '<b>Left of Plate 70.</b> The fourth teragon as the boundary between a black and a white region: everything to the left of the curve is black.',
    trees: '<b>Right of Plate 70.</b> Rivers (black) run along the midlines of the white fingers and watersheds (gray) along the black ones. Here they join the centres of the lattice triangles across the links the curve does not use. The faint red line is the curve itself.',
    widths: '<b>Top of Plate 71.</b> Rivers in black, watersheds in gray, each link redrawn as wide as its importance in the Horton–Strahler scheme. As in the plate, the width is proportional to the river\'s length as the crow flies: here, the straight-line distance from the link to its farthest source. The island\'s own coastline is part river and part watershed.',
    curve: 'The teragon itself. Its fifth stage is the variable-width hatching of Plate 46.',
  };
  function setB(refit) {
    const D = dataB(stB.n);
    markMB(stB.mode); markSB(stB.n);
    $('cBt').textContent = MODES_B[stB.mode]; $('capB').innerHTML = CAP_B[stB.mode];
    $('sBv').textContent = `stage ${stB.n}`; $('cBs').textContent = stB.n; $('cBn').textContent = `${fmt(D.Lp.length - 1)} links`;
    $('rBa').textContent = fmt(D.Lp.length - 1);
    if (stB.mode === 'trees' || stB.mode === 'widths') { const T = treesB(D, stB.n); $('rBb').textContent = fmt(T.riv); $('rBc').textContent = fmt(T.wat); $('rBd').textContent = fmt(T.fingers); }
    else { $('rBb').textContent = '—'; $('rBc').textContent = '—'; $('rBd').textContent = '—'; }
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(true); });
  const markSB = stepButtons($('sB'), [1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { stB.n = n; setB(true); });
  { const D = dataB(1); miniCurve('miniG', D.P); }

  // ====================== Plate 71, bottom: a tree by Koch cascade ======================
  const stC = { n: 4, clip: true };
  const cacheC = {};
  function dataC() {
    const key = `${stC.n}|${stC.clip}`;
    if (cacheC[key]) return cacheC[key];
    const all = treeCascade(GOS_TREE.links, GOS_TREE.codes, GOS_TREE.main, stC.n), segs = stC.clip && stC.n > 1 ? clipSources(all) : all;
    const maxLv = Math.max(0, ...segs.map((s) => s[4]));
    const groups = Array.from({ length: maxLv + 1 }, (_, l) => segPath(segs, (s) => s[4] === l));
    return (cacheC[key] = { all, segs, groups, maxLv, box: bbox(segs.flatMap((s) => [s[0], s[1], s[2], s[3]])) });
  }
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, dataC().box, 0.04), (f, v) => {
    const c = f.ctx, D = dataC(), L = Math.pow(1 / Math.sqrt(7), stC.n) * v.s;
    paper(f, PRINT.paper); toWorld(f, v);
    c.strokeStyle = PRINT.ink; c.lineCap = 'round'; c.lineJoin = 'round';
    const w0 = Math.max(0.5, Math.min(1.6, L * 0.12));
    D.groups.forEach((p, l) => { c.lineWidth = (w0 * Math.max(0.7, 2.6 - 0.65 * l)) / v.s; c.stroke(p); });
    toScreen(f); dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  function setC(refit) {
    const D = dataC();
    markSC(stC.n);
    $('sCv').textContent = `stage ${stC.n}`; $('cCs').textContent = stC.n; $('cCn').textContent = `${fmt(D.all.length)} links`;
    $('rCa').textContent = fmt(D.all.length); $('rCb').textContent = fmt(D.segs.length);
    if (refit) zC.refit(); else zC.schedule();
  }
  const markSC = stepButtons($('sC'), [1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { stC.n = n; setC(false); });
  $('clipC').addEventListener('change', (e) => { stC.clip = e.target.checked; setC(false); });
  $('miniT').innerHTML = miniTree('miniT', GOS_TREE.links);

  // ====================== Plates 72–73: fudgeflake ======================
  const stD = { n: 7, mode: 'plate' };
  const cacheD = {};
  function dataD() {
    const key = `${stD.mode}|${stD.n}`;
    if (cacheD[key]) return cacheD[key];
    let out;
    if (stD.mode === 'sweep') {
      const gens = new Array(stD.n).fill(genFromCodes(TER_PTS, TER_CODES));
      // the three sides of Δ, run clockwise, so that each terdragon bulges inward
      const sides = [[0, 0, 0.5, R3 / 2], [0.5, R3 / 2, 1, 0], [1, 0, 0, 0]], P = curveOf(gens), paths = [];
      for (const [ax, ay, bx, by] of sides) {
        const dx = bx - ax, dy = by - ay, Q = new Float64Array(P.length);
        for (let i = 0; i < P.length; i += 2) { Q[i] = ax + dx * P[i] - dy * P[i + 1]; Q[i + 1] = ay + dy * P[i] + dx * P[i + 1]; }
        paths.push(Q);
      }
      out = { paths, count: 3 * (P.length / 2 - 1), box: bbox(paths[0], bbox(paths[1], bbox(paths[2]))) };
    } else {
      const all = treeCascade(FUDGE_LINKS, FUDGE_CODES, FUDGE_MAIN, stD.n);
      const segs = stD.mode === 'plate' ? clipSources(all) : all;
      out = { all, segs, path: segPath(segs, (s) => s[4] > 0), main: segPath(segs, (s) => s[4] === 0), count: all.length, box: bbox(all.flatMap((s) => [s[0], s[1], s[2], s[3]])) };
    }
    return (cacheD[key] = out);
  }
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, dataD().box, 0.05), (f, v) => {
    const c = f.ctx, D = dataD(), L = Math.pow(1 / R3, stD.n) * v.s;
    paper(f, PRINT.paper); toWorld(f, v);
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (stD.mode === 'sweep') {
      const p = new Path2D(); for (const Q of D.paths) { p.moveTo(Q[0], Q[1]); for (let i = 2; i < Q.length; i += 2) p.lineTo(Q[i], Q[i + 1]); }
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(0.4, Math.min(2, L * 0.08)) / v.s; c.stroke(p);
      c.strokeStyle = 'rgba(194,69,45,0.6)'; c.lineWidth = 1.6 / v.s; c.beginPath(); c.moveTo(0, 0); c.lineTo(0.5, R3 / 2); c.lineTo(1, 0); c.closePath(); c.stroke();
    } else if (stD.mode === 'plate') {
      // the plate draws each link as a thin outlined capsule, the principal river solid and bold
      const w = Math.max(1.2, Math.min(9, L * 0.32));
      c.strokeStyle = '#3a3a37'; c.lineWidth = w / v.s; c.stroke(D.path);
      c.strokeStyle = PRINT.paper; c.lineWidth = Math.max(0.3, w - 1.6) / v.s; c.stroke(D.path);
      c.strokeStyle = PRINT.ink; c.lineWidth = (w * 1.15) / v.s; c.setLineDash([L * 0.55 / v.s, L * 0.45 / v.s]); c.stroke(D.main); c.setLineDash([]);
    } else {
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(0.5, Math.min(2.2, L * 0.1)) / v.s; c.stroke(segPath(D.segs));
      c.strokeStyle = PRINT.red; c.lineWidth = Math.max(1.2, Math.min(3.5, L * 0.2)) / v.s; c.stroke(D.main);
    }
    toScreen(f); dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  const MODES_D = { plate: 'As in Plate 73', tree: 'The whole tree', sweep: 'Fudgeflake sweep' };
  const CAP_D = {
    plate: '<b>Top of Plate 73.</b> The tree made more transparent: every interval that touches a source is erased, and the principal river is drawn with a bolder pen. The area drained by this tree is √3/2 ≈ 0.8660.',
    tree: 'The whole tree, principal river in red. Its teragons never overlap, but they touch themselves badly, so the drawing is an illegible chunk of hexagonal graph paper bounded by an approximate fractal. That is unavoidable, and fitting: several rivers can rise at the same point.',
    sweep: 'Now draw a Peano curve on a Δ-shaped initiator, with a Z-shaped generator whose equal legs make angles of 60° (Davis &amp; Knuth 1970). This is the extreme case M = 3 of the family of Plates 46–47, but it differs profoundly from the others. Its river tree is the tree drawn above. With sides of length 1 it sweeps an area of only √3/6 ≈ 0.2886 ("how inefficient!").',
  };
  function setD(refit) {
    const D = dataD();
    markMD(stD.mode); markSD(stD.n);
    $('cDt').textContent = { plate: 'Fudgeflake river tree', tree: 'Fudgeflake river tree', sweep: 'Fudgeflake sweep' }[stD.mode];
    $('capD').innerHTML = CAP_D[stD.mode];
    $('sDv').textContent = `stage ${stD.n}`; $('cDs').textContent = stD.n; $('cDn').textContent = `${fmt(D.count)} ${stD.mode === 'sweep' ? 'intervals' : 'links'}`;
    $('rDa').textContent = fmt(D.count); $('rDb').textContent = stD.mode === 'sweep' ? '√3/6 ≈ 0.2886' : '√3/2 ≈ 0.8660';
    if (refit) zD.refit(); else zD.schedule();
  }
  const markMD = stepButtons($('mD'), Object.keys(MODES_D), (k) => MODES_D[k], (k) => `Show: ${MODES_D[k]}`, (k) => { stD.mode = k; if (k === 'sweep' && stD.n > 5) stD.n = 5; setD(true); });
  const markSD = stepButtons($('sD'), [1, 2, 3, 4, 5, 6, 7, 8, 9], String, (n) => `Stage ${n}`, (n) => { stD.n = n; setD(true); });
  $('miniY').innerHTML = miniTree('miniY', FUDGE_LINKS);
  $('miniR').innerHTML = `<polyline points="${svgPts([[0, 0], FUDGE_C, [1, 0]])}" fill="none" stroke="currentColor" stroke-width="0.02"/>` +
    `<polyline points="${svgPts([[1.12, 0], [1.12 + 1 / 3, 0], [1.12 + FUDGE_C[0], FUDGE_C[1]], [1.12 + 5 / 6, FUDGE_C[1]], [2.12, 0]])}" fill="none" stroke="currentColor" stroke-width="0.02"/>` +
    `<g fill="currentColor"><circle cx="0" cy="0" r="0.03"/><circle cx="1" cy="0" r="0.03"/><circle cx="1.12" cy="0" r="0.03"/><circle cx="2.12" cy="0" r="0.03"/></g>`;

  // ====================== Plate 73 and Plate 49: the quartet ======================
  const stE = { n: 4, mode: 'curve' };
  const QGEN = genFromCodes(QUART_PTS, QUART_CODES);
  const cacheE = {};
  function quartetBoundary(n) {
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1]], out = [];
    const G = curveOf(new Array(n).fill(genFromCodes(QUART_BOUND, [0, 0, 0])));
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = sq[k], [bx, by] = sq[(k + 1) % 4], dx = bx - ax, dy = by - ay;
      for (let i = 0; i + 2 < G.length; i += 2) out.push(ax + dx * G[i] - dy * G[i + 1], ay + dy * G[i] + dx * G[i + 1]);
    }
    return out;
  }
  function dataE() {
    const key = `${stE.mode}|${stE.n}`;
    if (cacheE[key]) return cacheE[key];
    let out;
    if (stE.mode === 'treeH' || stE.mode === 'treeF') {
      const H = stE.mode === 'treeH', segs = treeCascade(H ? QH_LINKS : QF_LINKS, H ? QH_CODES : QF_CODES, H ? QH_MAIN : QF_MAIN, stE.n);
      const maxLv = Math.max(0, ...segs.map((s) => s[4]));
      out = { segs, count: segs.length, groups: Array.from({ length: maxLv + 1 }, (_, l) => segPath(segs, (s) => s[4] === l)), box: bbox(segs.flatMap((s) => [s[0], s[1], s[2], s[3]])) };
    } else {
      const P = curveOf(new Array(stE.n).fill(QGEN)), m = P.length / 2 - 1, pieces = [];
      for (let k = 0; k < 5; k++) { const a = Math.floor((k * m) / 5), b = Math.floor(((k + 1) * m) / 5); pieces.push(polyPath(P.slice(2 * a, 2 * b + 2), false)); }
      out = { P, count: m, path: polyPath(P, false), pieces, bound: polyPath(quartetBoundary(Math.max(1, stE.n + 1)), true), box: { x0: -0.18, x1: 1.18, y0: -0.18, y1: 1.18 } };
    }
    return (cacheE[key] = out);
  }
  const PLAYER = ['#c2452d', '#2f5f9e', '#3f8f6c', '#b58a2a', '#151515'];   // four players and, fourth in the curve's order, the table
  const zE = zoomable('wE', 'cE', (f) => fitBox(f, dataE().box, 0.04), (f, v) => {
    const c = f.ctx, D = dataE(), L = Math.pow(1 / Math.sqrt(5), stE.n) * v.s;
    paper(f, PRINT.paper); toWorld(f, v);
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (stE.mode === 'curve' || stE.mode === 'boundary') {
      const w = Math.max(0.5, Math.min(2.2, L * 0.12)) / v.s;
      if (stE.mode === 'boundary') { c.fillStyle = '#dcdad2'; c.fill(D.bound); c.strokeStyle = 'rgba(21,21,21,0.35)'; c.lineWidth = w; c.stroke(D.path); c.strokeStyle = PRINT.ink; c.lineWidth = 1.8 / v.s; c.stroke(D.bound); }
      else if (stE.n === 0) { c.strokeStyle = PRINT.ink; c.lineWidth = w; c.stroke(D.path); }
      else D.pieces.forEach((p, k) => { c.strokeStyle = PLAYER[k]; c.lineWidth = w; c.stroke(p); });
    } else {
      c.strokeStyle = PRINT.ink; const w0 = Math.max(0.5, Math.min(1.8, L * 0.12));
      D.groups.forEach((p, l) => { c.lineWidth = (w0 * Math.max(0.7, 2.2 - 0.5 * l)) / v.s; c.stroke(p); });
    }
    toScreen(f); dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  const MODES_E = { curve: 'Peano curve', boundary: 'Boundary', treeH: 'H tree', treeF: 'F tree' };
  const CAP_E = {
    curve: 'The Peano curve, its five pieces in five colours: four players (red, blue, green, black) around the table (ochre). Each piece is a smaller quartet, at scale 1/√5.',
    boundary: 'The quartet\'s boundary: on each side of the unit square, a Koch curve whose generator has three intervals of length 1/√5, D = log 3/log √5 ≈ 1.3652. Advanced teragons of this boundary and of the Peano curve are the centre of Plate 49.',
    treeH: 'The quartet\'s interior is drained by its own river tree, but quite different patterns of drainage come from tree-shaped generators. With this H-shaped generator, the teragons touch themselves, as in the fudgeflake, and the drainage area turns out to be ½.',
    treeF: 'With this generator, the teragons avoid self-contact, and the drainage area is 1. An advanced teragon is the bottom figure of Plate 73.',
  };
  function setE(refit) {
    const D = dataE();
    markME(stE.mode); markSE(stE.n);
    markSE.buttons.forEach((b, i) => { b.disabled = i > (stE.mode.startsWith('tree') ? 6 : 6) || (stE.mode.startsWith('tree') && i === 0); });
    $('cEt').textContent = { curve: 'Quartet', boundary: 'Quartet boundary', treeH: 'H tree', treeF: 'F tree' }[stE.mode];
    $('capE').innerHTML = CAP_E[stE.mode];
    $('sEv').textContent = `stage ${stE.n}`; $('cEs').textContent = stE.n; $('cEn').textContent = `${fmt(D.count)} ${stE.mode.startsWith('tree') ? 'links' : 'intervals'}`;
    $('rEa').textContent = fmt(D.count); $('rEb').textContent = stE.mode === 'treeH' ? 'yes' : 'no';
    if (refit) zE.refit(); else zE.schedule();
  }
  const markME = stepButtons($('mE'), Object.keys(MODES_E), (k) => MODES_E[k], (k) => `Show: ${MODES_E[k]}`, (k) => { stE.mode = k; if (k.startsWith('tree') && stE.n === 0) stE.n = 1; setE(true); });
  const markSE = stepButtons($('sE'), [0, 1, 2, 3, 4, 5, 6], String, (n) => `Stage ${n}`, (n) => { stE.n = n; setE(true); });
  miniCurve('miniQ', QUART_PTS);
  $('miniQT').innerHTML = miniTree('miniQT', QH_LINKS) + miniTree('miniQT', QF_LINKS, 1.2);

  setA(true); setB(true); setC(true); setD(true); setE(true);
})();
