(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-US');
  const PRINT = { paper: '#ecebe6', ink: '#151515', rule: '#c9c8c2', muted: '#66665f', accent: '#2f5f9e', red: '#c2452d', faint: '#bdbbb3', gray: '#8f8e88' };
  const CHEV_OUT = 0.43, CHEV_IN = 0.235;            // Plate 64's chevrons, measured from the plate
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
  function chevronPaths(P, F, m) {
    return chunked(m, (p, i) => {
      const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3], mx = (ax + bx) / 2, my = (ay + by) / 2;
      const vx = F[2 * i] - mx, vy = F[2 * i + 1] - my;
      p.moveTo(ax, ay); p.lineTo(mx + CHEV_OUT * vx, my + CHEV_OUT * vy); p.lineTo(bx, by); p.lineTo(mx + CHEV_IN * vx, my + CHEV_IN * vy); p.closePath();
    });
  }
  // the region each interval of a sweep owns: its trapezoid (type S), or the two trapezoids of its children
  function ownedPolys(phi, n) {
    if (n % 2 === 0) { const d = sweep(phi, n); return Array.from({ length: d.m }, (_, i) => [ownedTrapezoid(d, i)]); }
    const d = sweep(phi, n + 1); return Array.from({ length: d.m / 2 }, (_, i) => [ownedTrapezoid(d, 2 * i), ownedTrapezoid(d, 2 * i + 1)]);
  }
  function fillOwned(c, polys) {
    const G = Math.min(96, polys.length);
    for (let g = 0; g < G; g++) {
      const p = new Path2D(), a = Math.floor((g * polys.length) / G), b = Math.floor(((g + 1) * polys.length) / G);
      for (let i = a; i < b; i++) for (const Q of polys[i]) { p.moveTo(Q[0], Q[1]); for (let k = 2; k < Q.length; k += 2) p.lineTo(Q[k], Q[k + 1]); p.closePath(); }
      c.fillStyle = ramp(G === 1 ? 0.5 : g / (G - 1), 0.55); c.fill(p);
    }
  }
  // fill and outline in the same colour, so that tiles which only meet along an edge show no hairline seams
  function solid(c, paths, color, lw) {
    c.fillStyle = color; c.strokeStyle = color; c.lineWidth = lw; c.lineJoin = 'miter';
    for (const p of paths) { c.fill(p); c.stroke(p); }
  }
  const dot = (c, v, x, y, r = 4, color = PRINT.red) => { c.beginPath(); c.arc(v.ox + x * v.s, v.oy - y * v.s, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke(); };

  // ====================== Plate 66: Peano's later square sweep ======================
  const stA = { n: 4, proc: true, own: false, hil: false };
  const cacheA = {};
  function dataA(n) {
    if (cacheA[n]) return cacheA[n];
    const d = sweep(45, n), L = Math.pow(Math.SQRT1_2, n);
    const proc = processedSweep(d, 0.1);
    // edges traced twice in the plain teragon
    const seen = new Set(); let dup = 0;
    const q = (v) => Math.round(v * 1e7);
    for (let i = 0; i < d.m; i++) {
      const a = `${q(d.P[2 * i])},${q(d.P[2 * i + 1])}`, b = `${q(d.P[2 * i + 2])},${q(d.P[2 * i + 3])}`, k = a < b ? a + '|' + b : b + '|' + a;
      if (seen.has(k)) dup++; else seen.add(k);
    }
    let hil = null;
    if (n % 2 === 0) { hil = new Float64Array(2 * d.m); for (let i = 0; i < d.m; i++) { const Q = ownedTrapezoid(d, i); hil[2 * i] = (Q[0] + Q[4]) / 2; hil[2 * i + 1] = (Q[1] + Q[5]) / 2; } }
    return (cacheA[n] = { d, L, raw: polyPath(d.P, false), proc: polyPath(proc, false), dup, hil: hil && polyPath(hil, false), owned: null });
  }
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0.05), (f, v) => {
    const c = f.ctx, D = dataA(stA.n);
    paper(f, PRINT.paper); toWorld(f, v);
    if (stA.own) { if (!D.owned) D.owned = ownedPolys(45, stA.n); fillOwned(c, D.owned); }
    c.lineWidth = 1 / v.s; c.strokeStyle = '#8f8d86'; c.strokeRect(0, 0, 1, 1);
    const px = D.L * v.s;
    c.lineJoin = 'miter'; c.lineCap = 'butt'; c.strokeStyle = PRINT.ink;
    c.lineWidth = Math.max(0.7, Math.min(2.6, px * 0.07)) / v.s;
    c.stroke(stA.proc ? D.proc : D.raw);
    if (stA.hil && D.hil) { c.strokeStyle = PRINT.red; c.lineJoin = 'round'; c.lineWidth = Math.max(1, Math.min(2.4, px * 0.06)) / v.s; c.stroke(D.hil); }
    toScreen(f);
    dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  function panelsA() {
    const box = $('panelsA');
    for (const n of [2, 4, 6]) {
      const d = sweep(45, n), P = processedSweep(d, 0.1), pts = [];
      for (let i = 0; i < P.length; i += 2) pts.push(`${(0.06 + P[i] * 0.88).toFixed(4)},${(0.94 - P[i + 1] * 0.88).toFixed(4)}`);
      const fig = document.createElement('figure');
      fig.innerHTML = `<svg viewBox="0 0 1 1" aria-hidden="true"><rect x="0.06" y="0.06" width="0.88" height="0.88" fill="none" stroke="#8f8d86" stroke-width="0.008"/><polyline points="${pts.join(' ')}" fill="none" stroke="#151515" stroke-width="0.022" stroke-linejoin="miter"/><circle cx="0.06" cy="0.94" r="0.028" fill="#151515"/><circle cx="0.94" cy="0.94" r="0.028" fill="#151515"/></svg><figcaption>stage ${n}</figcaption>`;
      box.append(fig);
    }
  }
  function setA() {
    const D = dataA(stA.n), even = stA.n % 2 === 0;
    markA(stA.n);
    $('sAv').textContent = `stage ${stA.n}`; $('cAs').textContent = stA.n; $('cAn').textContent = `${fmt(D.d.m)} interval${D.d.m > 1 ? 's' : ''}`;
    $('rAa').textContent = fmt(D.d.m);
    $('rAb').textContent = even ? 'a square' : 'a 1 × 2 rectangle';
    $('rAd').textContent = D.dup ? fmt(D.dup) : 'none';
    $('hilA').disabled = !even;
    const k = stA.n / 2, side = `1/${Math.pow(2, Math.floor(stA.n / 2))}`;
    $('infoA').innerHTML = stA.n === 0 ? 'Stage 0 is the initiator [0, 1], the side of the unit square above it, which it owns.' : even
      ? `At stage ${stA.n} every interval is the side of a square of side ${side}, beside it on the left or the right. The ${fmt(D.d.m)} squares tile the unit square.${stA.hil && stA.n ? ` <b>Red:</b> their centres in the order the curve visits them, which is Hilbert's curve at order ${k}.` : ''}`
      : `At odd stages each interval runs from a corner of a 1 × 2 rectangle (half of a square from the stage before) to the middle of its long side. One stage on, it splits into two squares.`;
    zA.schedule();
  }
  const markA = stepButtons($('sA'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], String, (n) => `Stage ${n}`, (n) => { stA.n = n; setA(); });
  $('procA').addEventListener('change', (e) => { stA.proc = e.target.checked; zA.schedule(); });
  $('ownA').addEventListener('change', (e) => { stA.own = e.target.checked; zA.schedule(); });
  $('hilA').addEventListener('change', (e) => { stA.hil = e.target.checked; setA(); });
  panelsA();

  // ====================== Plate 67: the right-trapezoid sweep ======================
  const stB = { phi: 30, n: 9, chev: true, trap: true, own: false };
  let cacheB = { key: '' };
  function dataB() {
    const key = `${stB.phi}|${stB.n}`;
    if (cacheB.key === key) return cacheB;
    const d = sweep(stB.phi, stB.n);
    return (cacheB = { key, d, path: polyPath(d.P, false), chev: null, owned: null, box: bbox(d.P) });
  }
  const trapOf = (phi) => { const t = Math.tan(phi / DEG); return [0, 0, 1, 0, 1, 1 / t, 0, t]; };
  const zB = zoomable('wB', 'cB', (f) => {
    const D = dataB(), b = { ...D.box };
    if (stB.trap || stB.own) bbox(trapOf(stB.phi), b);
    return fitBox(f, b, 0.04);
  }, (f, v) => {
    const c = f.ctx, D = dataB(), d = D.d;
    paper(f, PRINT.paper); toWorld(f, v);
    if (stB.own) { if (!D.owned) D.owned = ownedPolys(stB.phi, stB.n); fillOwned(c, D.owned); }
    if (stB.trap) { c.setLineDash([5 / v.s, 4 / v.s]); c.lineWidth = 1.2 / v.s; c.strokeStyle = '#8f8d86'; c.stroke(polyPath(trapOf(stB.phi))); c.setLineDash([]); }
    const Lmax = Math.pow(Math.max(Math.cos(stB.phi / DEG), Math.sin(stB.phi / DEG)), stB.n) * v.s;
    if (stB.chev) {
      if (!D.chev) D.chev = chevronPaths(d.P, d.F, d.m);
      c.fillStyle = PRINT.ink; for (const p of D.chev) c.fill(p);
    } else {
      c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = PRINT.ink;
      c.lineWidth = Math.max(0.6, Math.min(2, Lmax * 0.05)) / v.s; c.stroke(D.path);
    }
    toScreen(f);
    dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  function setB(refit) {
    const D = dataB(), a = stB.phi / DEG, t = Math.tan(a);
    markB(stB.n);
    $('phBv').textContent = `${stB.phi.toFixed(1)}°`; $('cBp').textContent = `${stB.phi.toFixed(1)}°`;
    $('sBv').textContent = `stage ${stB.n}`; $('cBs').textContent = stB.n; $('cBn').textContent = `${fmt(D.d.m)} intervals`;
    const r1 = Math.cos(a), r2 = Math.sin(a);
    $('rBa').textContent = `${r1.toFixed(3)}, ${r2.toFixed(3)}`;
    $('rBc').textContent = `${Math.min(t, 1 / t).toFixed(3)}, ${Math.max(t, 1 / t).toFixed(3)}`;
    $('rBd').textContent = (1 / Math.sin(2 * a)).toFixed(4);
    $('p67dim').textContent = Math.abs(stB.phi - 45) < 1e-9 ? 'Two equal legs at 90°: the square sweep · r = 1/√2 · D = 2'
      : `Two unequal legs at 90° · r₁ = cos ${stB.phi.toFixed(1)}° = ${r1.toFixed(3)}, r₂ = sin ${stB.phi.toFixed(1)}° = ${r2.toFixed(3)} · D = 2`;
    if (refit) zB.refit(); else zB.schedule();
  }
  const markB = stepButtons($('sB'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], String, (n) => `Stage ${n}`, (n) => { stB.n = n; setB(true); });
  let rafB = 0;
  $('phB').addEventListener('input', (e) => { stB.phi = +e.target.value / 10; if (!rafB) rafB = requestAnimationFrame(() => { rafB = 0; setB(true); }); });
  $('chevB').addEventListener('change', (e) => { stB.chev = e.target.checked; zB.schedule(); });
  $('trapB').addEventListener('change', (e) => { stB.trap = e.target.checked; zB.refit(); });
  $('ownB').addEventListener('change', (e) => { stB.own = e.target.checked; zB.refit(); });
  $('plate67').addEventListener('click', () => {
    Object.assign(stB, { phi: 30, n: 9, chev: true, trap: false, own: false });
    $('phB').value = '300'; $('chevB').checked = true; $('trapB').checked = false; $('ownB').checked = false;
    setB(true);
  });
  $('sq45').addEventListener('click', () => { stB.phi = 45; $('phB').value = '450'; setB(true); });

  // ====================== Plate 66: dragons ======================
  const NSEQ = 18;
  const stC = { xs: new Array(NSEQ).fill(1), n: 14, mode: 'fill', k: 3, ghost: false };
  let cacheC = { key: '' };
  const seqKey = () => stC.xs.slice(0, stC.n).join('');
  function dataC() {
    const key = `${seqKey()}|${stC.n}`;
    if (cacheC.key === key) return cacheC;
    const P = dragon(stC.xs, stC.n, 1, 0, 0, 0), m = P.length / 2 - 1;
    return (cacheC = { key, P, m, prevPath: null, box: bbox(P), round: null });
  }
  // the curve with its corners rounded: straight through the midpoints, a quarter-turn at each grid point
  function roundedPath(P) {
    const p = new Path2D(), m = P.length / 2 - 1;
    p.moveTo(P[0], P[1]);
    if (m === 1) { p.lineTo(P[2], P[3]); return p; }
    p.lineTo((P[0] + P[2]) / 2, (P[1] + P[3]) / 2);
    for (let i = 1; i < m; i++) p.quadraticCurveTo(P[2 * i], P[2 * i + 1], (P[2 * i] + P[2 * i + 2]) / 2, (P[2 * i + 1] + P[2 * i + 3]) / 2);
    p.lineTo(P[2 * m], P[2 * m + 1]);
    return p;
  }
  // each interval is the diagonal of a small square; the squares tile the region the curve sweeps
  function diamondPaths(P, from, to, size = 2048) {
    return chunked(to - from, (p, j) => {
      const i = from + j, ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3], hx = (bx - ax) / 2, hy = (by - ay) / 2, mx = ax + hx, my = ay + hy;
      p.moveTo(ax, ay); p.lineTo(mx - hy, my + hx); p.lineTo(bx, by); p.lineTo(mx + hy, my - hx); p.closePath();
    }, size);
  }
  // A filled dragon at stage n is 2^K copies of one stage-(n − K) dragon, one on each interval of stage K, so a
  // single small path, cached, is drawn 2^K times. On an odd-numbered interval the copy's first fold is on the
  // other side, and that is the same set as the copy run backwards, from b to a.
  const baseCache = new Map();
  function basePaths(tail, n) {
    const key = `${tail.join('')}|${n}`;
    if (!baseCache.has(key)) {
      const P = dragon(tail, n, 0, 0, 1, 0);
      if (baseCache.size > 40) baseCache.clear();
      baseCache.set(key, diamondPaths(P, 0, P.length / 2 - 1));
    }
    return baseCache.get(key);
  }
  // colourOf(j, K) gives the colour of copy j of 2^K; kMin asks for at least 2^kMin separate copies
  function drawDragon(f, v, xs, n, ax, ay, bx, by, colourOf, kMin = 0) {
    const K = Math.min(n, Math.max(kMin, n - 12)), c = f.ctx;
    const P = dragon(xs, K, ax, ay, bx, by), base = basePaths(xs.slice(K, n), n - K);
    const W = f.w / v.s, Hh = f.h / v.s, cx0 = -v.ox / v.s, cy1 = v.oy / v.s;     // the visible world box
    for (let j = 0; j < 1 << K; j++) {
      let px = P[2 * j], py = P[2 * j + 1], qx = P[2 * j + 2], qy = P[2 * j + 3];
      if (j & 1) { [px, py, qx, qy] = [qx, qy, px, py]; }
      const dx = qx - px, dy = qy - py, L = Math.hypot(dx, dy), mx = px + dx / 2, my = py + dy / 2;
      if (mx + L < cx0 || mx - L > cx0 + W || my - L > cy1 || my + L < cy1 - Hh) continue;   // off screen
      const k = f.dpr * v.s;
      c.setTransform(k * dx, -k * dy, -k * dy, -k * dx, f.dpr * (v.ox + v.s * px), f.dpr * (v.oy - v.s * py));
      solid(c, base, colourOf(j, K), 0.8 / (v.s * L));
    }
  }
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, dataC().box, 0.05), (f, v) => {
    const c = f.ctx, D = dataC(), L = Math.pow(Math.SQRT1_2, stC.n), px = L * v.s;
    paper(f, PRINT.paper); toWorld(f, v);
    if (stC.ghost && stC.n) {
      if (!D.prevPath) D.prevPath = polyPath(dragon(stC.xs, stC.n - 1, 1, 0, 0, 0), false);
      c.strokeStyle = '#a9a79f'; c.lineJoin = 'miter'; c.lineWidth = Math.max(0.8, Math.min(3, px * 0.12)) / v.s; c.stroke(D.prevPath);
    }
    if (stC.mode === 'curve') {
      if (!D.round) D.round = roundedPath(D.P);
      c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineCap = 'round';
      c.lineWidth = Math.max(0.6, Math.min(3, px * 0.16)) / v.s; c.stroke(D.round);
    } else if (stC.mode === 'fill') {
      drawDragon(f, v, stC.xs, stC.n, 1, 0, 0, 0, () => PRINT.ink);
    } else if (stC.mode === 'along') {
      drawDragon(f, v, stC.xs, stC.n, 1, 0, 0, 0, (j, K) => ramp(K ? j / ((1 << K) - 1) : 0.5), 6);
    } else {
      const kc = Math.min(stC.k, stC.n);
      drawDragon(f, v, stC.xs, stC.n, 1, 0, 0, 0, (j, K) => CAT[(j >> (K - kc)) % CAT.length], kc);
    }
    toScreen(f);
    dot(c, v, 1, 0); dot(c, v, 0, 0);
  });
  // the sequence editor
  const seqBtns = [];
  for (let k = 0; k < NSEQ; k++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', () => { stC.xs[k] = 1 - stC.xs[k]; setC(true); });
    $('seqC').append(b); seqBtns.push(b);
  }
  const PRESETS = [
    ['Harter–Heighway: always right', () => new Array(NSEQ).fill(1)],
    ['Pólya: alternate', () => Array.from({ length: NSEQ }, (_, k) => (k % 2 === 0 ? 1 : 0))],
    ['Random sequence', () => Array.from({ length: NSEQ }, () => (Math.random() < 0.5 ? 0 : 1))],
  ];
  for (const [label, make] of PRESETS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', () => { stC.xs = make(); setC(true); });
    $('preC').append(b);
  }
  function kindC() {
    const s = seqKey();
    if (/^1*$/.test(s)) return 'hh';
    if (/^(10)*1?$/.test(s) || /^(01)*0?$/.test(s)) return 'polya';
    return 'alt';
  }
  function setC(refit) {
    const D = dataC(), kind = kindC();
    seqBtns.forEach((b, k) => {
      const on = stC.xs[k] === 1;
      b.innerHTML = `${on ? 'R' : 'L'}<small>${k + 1}</small>`;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `Stage ${k + 1}: first copy to the ${on ? 'right' : 'left'}`);
      b.classList.toggle('off', k >= stC.n);
    });
    markS(stC.n); markM(stC.mode); markK(stC.k);
    $('kC').hidden = stC.mode !== 'copies';
    $('ghostC').disabled = stC.n === 0;
    $('sCv').textContent = `stage ${stC.n}`; $('cCs').textContent = stC.n; $('cCn').textContent = `${fmt(D.m)} interval${D.m > 1 ? 's' : ''}`;
    $('rCa').textContent = fmt(D.m);
    const title = { hh: 'Harter–Heighway dragon', polya: 'Pólya triangle sweep', alt: 'Alternate dragon' }[kind];
    $('cCt').textContent = title;
    $('rCc').textContent = { hh: 'a dragon', polya: 'a right triangle', alt: 'an alternate dragon' }[kind];
    $('rCd').innerHTML = { hh: '≈ 1.5236', polya: '1 <small>(a triangle)</small>', alt: '<small>depends on the sequence</small>' }[kind];
    $('dragDim').textContent = `Initiator [1, 0] · two equal legs at 90° · ${{ hh: 'first copy always to the right', polya: 'first copy alternating from stage to stage', alt: 'first copy set by the sequence xₖ' }[kind]} · D = 2`;
    $('seqNote').innerHTML = {
      hh: 'All R: the Harter–Heighway dragon. Tap any stage to flip it.',
      polya: 'Alternating R, L, R, L…: the first copy changes side from stage to stage, and the curve sweeps a right triangle. This is Pólya’s sweep of Plate 64.',
      alt: '<b>Alternate dragons</b> (Davis &amp; Knuth 1970): pick any sequence x₁, x₂, … of 0s and 1s, and let xₖ decide the side of the first copy at stage k. Each sequence gives a different alternate dragon, and every one fills area ½.',
    }[kind];
    if (refit) zC.refit(); else zC.schedule();
  }
  const markS = stepButtons($('sC'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], String, (n) => `Stage ${n}`, (n) => { stC.n = n; setC(true); });
  const MODES = { curve: 'Curve', fill: 'Filled, as printed', along: 'Along the curve', copies: 'Copies' };
  const markM = stepButtons($('mC'), Object.keys(MODES), (k) => MODES[k], (k) => `Draw: ${MODES[k]}`, (k) => {
    stC.mode = k;
    if (k === 'curve' && stC.n > 12) stC.n = 8;
    setC(false);
  });
  const markK = stepButtons($('kC'), [1, 2, 3, 4, 5, 6], (k) => String(1 << k), (k) => `${1 << k} copies`, (k) => { stC.k = k; setC(false); });
  $('ghostC').addEventListener('change', (e) => { stC.ghost = e.target.checked; zC.schedule(); });

  // ====================== Plates 66–67: the twindragon ======================
  const stD = { mode: 'halves', k: 2, sk: 5, rv: 11, pr: 2, num: null };
  const ONE = new Array(24).fill(1);
  // the twindragon: the dragons on [0, 1] and [1, 0], or their images under a similarity (x, y) → M(x, y)
  function drawTwin(f, v, n, colA, colB, M) {
    const T = M || ((x, y) => [x, y]), [ax, ay] = T(0, 0), [bx, by] = T(1, 0);
    drawDragon(f, v, ONE, n, ax, ay, bx, by, () => colA);
    drawDragon(f, v, ONE, n, bx, by, ax, ay, () => colB);
  }
  const twinBox = { x0: -0.35, x1: 1.35, y0: -0.7, y1: 0.7 };
  // page → page map that takes the twindragon to its replica with digits ds (T_d = Σ d_j β^−j + β^−k T)
  function replicaMatrix(ds) {
    const k = ds.length;
    let br = 1, bi = 0;                                   // β^−k
    for (let j = 0; j < k; j++) { const r = (-br + bi) / 2, i = (-br - bi) / 2; br = r; bi = i; }
    let cx = 0, cy = 0, pr = 1, pi = 0;
    for (let j = 0; j < k; j++) { const r = (-pr + pi) / 2, i = (-pr - pi) / 2; pr = r; pi = i; if (ds[j] === 1) { cx += pr; cy += pi; } }
    // z → w = toT(z); w → β^−k w + c; → toPage
    const map = (x, y) => { const [wx, wy] = TW.toT(x, y), ux = br * wx - bi * wy + cx, uy = br * wy + bi * wx + cy; return TW.toPage(ux, uy); };
    const o = map(0, 0), ex = map(1, 0), ey = map(0, 1);
    return [ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]];
  }
  const digitsOf = (i, k) => Array.from({ length: k }, (_, j) => (i >> (k - 1 - j)) & 1);
  function skinPath(n) {
    const C = TW.corners, out = [];
    for (let j = 0; j < 6; j++) {
      const [ax, ay] = C[j], [bx, by] = C[(j + 1) % 6], pts = [ax, ay];
      skinCurve(ax, ay, bx, by, n, pts);
      for (let i = 0; i < pts.length; i += 2) { const [x, y] = TW.toPage(pts[i], pts[i + 1]); out.push(x, y); }
    }
    return polyPath(out, true);
  }
  let riverCache = {};
  // the streams drawn wider the more of the tree they carry: an edge's weight is the smaller of the two parts the
  // tree falls into when that edge is cut
  function riverPath(n, pr) {
    const key = `${n}|${pr}`;
    if (riverCache[key]) return riverCache[key];
    const R = riverCache[n] || (riverCache[n] = riverTree(n)), g = pruneTree(R.adj, pr);
    const N = g.size, size = new Map(), parent = new Map(), order = [];
    const root = g.keys().next().value, stack = [root];
    parent.set(root, -1);
    while (stack.length) { const a = stack.pop(); order.push(a); for (const b of g.get(a)) if (!parent.has(b)) { parent.set(b, a); stack.push(b); } }
    for (let i = order.length - 1; i >= 0; i--) { const a = order[i]; size.set(a, (size.get(a) || 0) + 1); const p = parent.get(a); if (p >= 0) size.set(p, (size.get(p) || 0) + size.get(a)); }
    const paths = [new Path2D(), new Path2D(), new Path2D()];
    let segs = 0;
    for (const a of order) {
      const p = parent.get(a); if (p < 0) continue;
      const w = Math.min(size.get(a), N - size.get(a)), cls = w >= N / 10 ? 2 : w >= N / 60 ? 1 : 0;
      const [x0, y0] = R.toXY(a), [x1, y1] = R.toXY(p); paths[cls].moveTo(x0, y0); paths[cls].lineTo(x1, y1); segs++;
    }
    return (riverCache[key] = { paths, segs, nodes: R.nodes });
  }
    const TILE_COLS = ['#dcc387', '#c4abd3', '#a8cbb5', '#e3a99a'];
  const tilesOf = (num) => (num ? num.tiles : []);
  const zD = zoomable('wD', 'cD', (f) => {
    const b = { ...twinBox };
    for (const t of tilesOf(stD.num)) { b.x0 = Math.min(b.x0, twinBox.x0 + t.n); b.x1 = Math.max(b.x1, twinBox.x1 + t.n); b.y0 = Math.min(b.y0, twinBox.y0 + t.m); b.y1 = Math.max(b.y1, twinBox.y1 + t.m); }
    return fitBox(f, b, 0.03);
  }, (f, v) => {
    const c = f.ctx, mode = stD.mode;
    paper(f, PRINT.paper);
    const pickDs = stD.num && stD.num.d;
    // neighbouring tiles T + g that also hold the number (toPage(w + g) = toPage(w) + (Im g, Re g))
    for (const t of tilesOf(stD.num)) drawTwin(f, v, 14, t.col, t.col, (x, y) => [x + t.n, y + t.m]);
    if (mode === 'halves') {
      drawTwin(f, v, 16, PRINT.gray, PRINT.ink);
    } else if (mode === 'replicas') {
      const k = stD.k, N = 1 << k;
      for (let i = 0; i < N; i++) {
        const ds = digitsOf(i, k), m = replicaMatrix(ds);
        const hit = pickDs && ds.every((x, j) => x === +pickDs[j]);
        const tone = hit ? PRINT.accent : ds[k - 1] ? PRINT.gray : PRINT.ink;   // two tones, by the last digit, as in the book
        drawTwin(f, v, Math.max(6, 16 - k), tone, tone, (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
      }
    } else if (mode === 'skin') {
      drawTwin(f, v, 16, '#d5d3cc', '#d5d3cc'); toWorld(f, v);
      c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = Math.max(0.8, Math.min(2.2, 2.2 * Math.pow(0.8, stD.sk))) / v.s;
      c.stroke(skinPath(stD.sk));
      toScreen(f);
      for (const [x, y] of TW.corners) { const [px, py] = TW.toPage(x, y); dot(c, v, px, py, 4, PRINT.red); }
    } else {
      drawTwin(f, v, 16, '#dedcd5', '#dedcd5'); toWorld(f, v);
      const R = riverPath(stD.rv, stD.pr), h = Math.pow(Math.SQRT1_2, stD.rv) * v.s, w0 = Math.max(0.7, Math.min(1.6, h * 0.16));
      c.strokeStyle = PRINT.ink; c.lineCap = 'square'; c.lineJoin = 'miter';
      R.paths.forEach((p, i) => { c.lineWidth = (w0 * [1, 1.6, 2.4][i]) / v.s; c.stroke(p); });
    }
    toScreen(f);
    const N = stD.num;
    if (N) {
      // where 0 is, and which way 1 and i point in this drawing (the book's orientation mirrors the usual one)
      const [ox, oy] = TW.toPage(0, 0), sx = v.ox + ox * v.s, sy = v.oy - oy * v.s;
      c.strokeStyle = PRINT.red; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx - 6, sy); c.lineTo(sx + 6, sy); c.moveTo(sx, sy - 6); c.lineTo(sx, sy + 6); c.stroke();
      c.font = '600 12px "IBM Plex Mono", monospace'; c.fillStyle = PRINT.red; c.fillText('0', sx + 5, sy + 15);
      const kx = 18, ky = f.h - 18, L = 34;
      c.strokeStyle = PRINT.muted; c.fillStyle = PRINT.muted; c.lineWidth = 1.4;
      const arrow = (x1, y1, lab, lx, ly) => {
        c.beginPath(); c.moveTo(kx, ky); c.lineTo(x1, y1); c.stroke();
        const a = Math.atan2(y1 - ky, x1 - kx); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 7 * Math.cos(a - 0.45), y1 - 7 * Math.sin(a - 0.45)); c.lineTo(x1 - 7 * Math.cos(a + 0.45), y1 - 7 * Math.sin(a + 0.45)); c.closePath(); c.fill();
        c.fillText(lab, lx, ly);
      };
      arrow(kx, ky - L, '1', kx - 4, ky - L - 6); arrow(kx + L, ky, 'i', kx + L + 5, ky + 4);
      if (N.x !== null) dot(c, v, N.x, N.y, 5, mode === 'replicas' ? '#f2c14e' : PRINT.red);
    }
  }, {
    onTap: (x, y) => {
      const [wx, wy] = TW.toT(x, y), a = twinDigits(wx, wy, 16);
      $('numIn').value = `${a.I || '0'}.${a.d}`;
      showNumber(true);
    },
  });
  const fmtG = (m, n) => {                        // a Gaussian integer m + n i
    if (!n) return String(m).replace('-', '−');
    const im = Math.abs(n) === 1 ? 'i' : `${Math.abs(n)}i`;
    return m ? `${String(m).replace('-', '−')} ${n < 0 ? '−' : '+'} ${im}` : `${n < 0 ? '−' : ''}${im}`;
  };
  function fmtQ([a, b, q]) {                     // exact value (a + b i)/q
    const re = a.toString().replace('-', '−'), mag = (b < 0n ? -b : b), im = mag === 1n ? 'i' : `${mag}i`;
    let top = b === 0n ? re : a === 0n ? `${b < 0n ? '−' : ''}${im}` : `${re} ${b < 0n ? '−' : '+'} ${im}`;
    if (q === 1n) return top;
    return (a !== 0n && b !== 0n ? `(${top})` : top) + `/${q}`;
  }
  function showNumber(clicked) {
    stD.clicked = clicked;
    const el = $('addrD'), raw = $('numIn').value.trim();
    if (!raw) { stD.num = null; el.innerHTML = ''; zD.refit(); return; }
    if (/(…|\.\.\.)$/.test(raw)) { el.innerHTML = '<p class="note">Put the repeating block in parentheses instead of “…”: 0.(1) means 0.111…, and 0.0(001) means 0.0001001001….</p>'; return; }
    const P = parseBase(raw);
    if (!P) { el.innerHTML = '<p class="note">Use only the digits 0 and 1, one point, and parentheses around a repeating block at the end, like 11.0(01).</p>'; return; }
    const exps = expansionsOf(P.value), [wx, wy] = GQ.num(P.value), [x, y] = TW.toPage(wx, wy);
    const want = expandFrac(P.pre, P.per, 60);
    const isTyped = (e) => (e.I || '') === P.I.replace(/^0+/, '') && expandFrac(e.pre, e.per, 60) === want;
    const tiles = [];
    for (const e of exps) if ((e.m || e.n) && !tiles.some((t) => t.m === e.m && t.n === e.n)) tiles.push({ m: e.m, n: e.n, col: TILE_COLS[tiles.length % TILE_COLS.length] });
    const home = exps.find((e) => !e.m && !e.n), main = exps.find(isTyped) || exps[0];
    stD.num = { x, y, tiles, d: home ? expandFrac(home.pre, home.per, 16) : null };
    const k = stD.mode === 'replicas' && stD.num.d ? stD.k : 0;
    const rows = exps.map((e) => {
      const t = tiles.find((t) => t.m === e.m && t.n === e.n), sw = t ? t.col : '#151515';
      let s = formatExpansion(e);
      if (k && !e.m && !e.n) { const fr = s.split('.')[1] || ''; s = `0.<span class="hl">${fr.slice(0, k)}</span>${fr.slice(k)}`; }
      const where = !e.m && !e.n ? 'in the twindragon' : `in the copy moved by ${fmtG(e.m, e.n)}`;
      return `<li class="${isTyped(e) ? 'typed' : ''}"><i style="background:${sw}"></i><span>${s} <small>${where}</small></span></li>`;
    });
    const same = new Set(exps.map((e) => `${e.m},${e.n}`)).size, words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
    const why = exps.length < 2 ? 'Only one expansion: at every scale the number lies inside a single piece.'
      : `${words[exps.length] || exps.length} expansions: the number lies on a seam where ${(words[exps.length] || String(exps.length)).toLowerCase()} pieces meet` +
        (same > 1 ? (home ? `, on the twindragon’s edge, where it meets the shaded neighbouring ${tiles.length > 1 ? 'copies' : 'copy'}.` : ', where the shaded copies meet.') : ' inside the twindragon.');
    el.innerHTML = `<div class="val">${clicked ? 'The point you clicked, to 16 digits:' : 'Value:'} ${fmtQ(P.value)} ≈ ${wx.toFixed(4).replace('-', '−')} ${wy < 0 ? '−' : '+'} ${Math.abs(wy).toFixed(4)}i</div>` +
      (exps.length ? `<ol>${rows.join('')}</ol><p class="note">${why}${k ? ` In blue: the replica picked by the first ${k} digit${k > 1 ? 's' : ''}.` : ''}</p>` : '<p class="note">That one is too long to untangle here; try a shorter repeating block.</p>');
    zD.refit();
  }
  $('numForm').addEventListener('submit', (e) => { e.preventDefault(); showNumber(false); });
  for (const ex of ['0.(1)', '1', '0.0(001)', '0.000(001)', '0.(010)', '11.1']) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = ex;
    b.addEventListener('click', () => { $('numIn').value = ex; showNumber(false); });
    $('numEx').append(b);
  }
  const showAddr = () => { if (stD.num) showNumber(stD.clicked); };
  const MODES_D = { halves: 'Two dragons', replicas: 'Replicas', skin: 'Skin', river: 'River' };
  const CAP_D = {
    halves: 'One component dragon is in black, the other in gray, as in the book: in black the dragon on [1, 0] from the section above, in gray the dragon on [0, 1], each with its first copy to the right.',
    replicas: 'A twindragon can be tiled by reduced replicas of itself: two at scale 1/√2, four at scale ½, and so on, in two tones as in the book. A replica’s digits are the first digits of the addresses of its points.',
    skin: 'The twindragon’s boundary, its skin, is a Koch curve on six sides with the generator below. The red dots are the six points where it meets two of its neighbours in the tiling of the plane.',
    river: 'Round off the corners of the twindragon’s curve, here at stage 11. Where it passes a grid point twice, the two turns cut off two opposite grid squares and leave the other two joined. The squares inside the curve, joined that way, form one tree: the river. Those outside reach in from the coast and form the watershed. With the streams near the sources erased, for legibility, the river tree looks like the book’s. Main channels, the ones that split the tree into two big parts, are drawn wider.',
  };
  function setD() {
    markMD(stD.mode);
    $('cDt').textContent = { halves: 'Twindragon', replicas: 'Replicas', skin: 'Twindragon skin', river: 'Twindragon river' }[stD.mode];
    $('modeCap').textContent = CAP_D[stD.mode];
    $('skinMini').hidden = stD.mode !== 'skin';
    const g = $('kDg'); g.hidden = stD.mode === 'halves';
    $('kD').innerHTML = '';
    if (stD.mode === 'replicas') {
      $('kDl').textContent = 'Replicas'; $('kDv').textContent = `${1 << stD.k} at scale ${stD.k % 2 ? `1/${Math.pow(2, (stD.k - 1) / 2)}√2` : `1/${Math.pow(2, stD.k / 2)}`}`.replace('1/1√2', '1/√2');
      stepButtons($('kD'), [1, 2, 3, 4, 5, 6, 7, 8], (k) => String(1 << k), (k) => `${1 << k} replicas`, (k) => { stD.k = k; setD(); })(stD.k);
      $('cDn').textContent = `${1 << stD.k} replicas`;
    } else if (stD.mode === 'skin') {
      $('kDl').textContent = 'Stage of the skin'; $('kDv').textContent = `stage ${stD.sk} · ${fmt(6 * Math.pow(3, stD.sk))} pieces`;
      stepButtons($('kD'), [0, 1, 2, 3, 4, 5, 6, 7, 8], String, (k) => `Skin stage ${k}`, (k) => { stD.sk = k; setD(); })(stD.sk);
      $('cDn').textContent = `skin at stage ${stD.sk}`;
    } else if (stD.mode === 'river') {
      const R = riverPath(stD.rv, stD.pr);
      $('kDl').textContent = 'Streams erased'; $('kDv').textContent = `${stD.pr} round${stD.pr === 1 ? '' : 's'} · ${fmt(R.segs)} of ${fmt(R.nodes - 1)} links`;
      stepButtons($('kD'), [0, 1, 2, 3, 4], String, (k) => `Erase ${k} rounds of streams`, (k) => { stD.pr = k; setD(); })(stD.pr);
      $('cDn').textContent = `river tree, curve at stage ${stD.rv}`;
    } else $('cDn').textContent = 'two dragons';
    showAddr();
    zD.schedule();
  }
  const markMD = stepButtons($('mD'), Object.keys(MODES_D), (k) => MODES_D[k], (k) => `Show: ${MODES_D[k]}`, (k) => { stD.mode = k; setD(); });

  setA(); setB(true); setC(true); setD();
})();
