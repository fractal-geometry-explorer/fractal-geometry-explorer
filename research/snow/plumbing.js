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

