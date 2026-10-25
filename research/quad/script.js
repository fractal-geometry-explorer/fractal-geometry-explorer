// CORE START
const DEG = 180 / Math.PI;
// ---- the quadric generators: lattice paths from (0,0) to (b,0), read off the book's caption diagrams.
// y points to the left of travel; on a counterclockwise square that is inward, which matches the plates.
const QUAD = {
  8: { b: 4, plate: '51', p: [0,0, 1,0, 1,1, 2,1, 2,0, 2,-1, 3,-1, 3,0, 4,0] },
  18: { b: 6, plate: '53', p: [0,0, 1,0, 1,1, 1,2, 2,2, 3,2, 3,1, 2,1, 2,0, 3,0, 4,0, 4,-1, 3,-1, 3,-2, 4,-2, 5,-2, 5,-1, 5,0, 6,0] },
  32: { b: 8, plate: '55', p: [0,0, 0,1, 1,1, 1,2, 0,2, 0,3, 1,3, 2,3, 2,4, 3,4, 3,3, 3,2, 2,2, 2,1, 3,1, 4,1, 4,0, 4,-1, 5,-1, 6,-1, 6,-2, 5,-2, 5,-3, 5,-4, 6,-4, 6,-3, 7,-3, 8,-3, 8,-2, 7,-2, 7,-1, 8,-1, 8,0] },
  98: { b: 14, plate: '54', p: [0,0, 1,0, 1,1, 2,1, 2,0, 2,-1, 2,-2, 3,-2, 3,-1, 3,0, 3,1, 4,1, 5,1, 5,2, 4,2, 3,2, 3,3, 4,3, 5,3, 5,4, 6,4, 6,5, 6,6, 7,6, 7,5, 8,5, 9,5, 9,4, 10,4, 10,3, 9,3, 8,3, 8,4, 7,4, 7,3, 6,3, 6,2, 7,2, 8,2, 9,2, 10,2, 10,1, 10,0, 9,0, 9,1, 8,1, 7,1, 6,1, 6,0, 7,0, 8,0, 8,-1, 7,-1, 6,-1, 5,-1, 5,0, 4,0, 4,-1, 4,-2, 5,-2, 6,-2, 7,-2, 8,-2, 8,-3, 7,-3, 7,-4, 6,-4, 6,-3, 5,-3, 4,-3, 4,-4, 5,-4, 5,-5, 6,-5, 7,-5, 7,-6, 8,-6, 8,-5, 8,-4, 9,-4, 9,-3, 10,-3, 11,-3, 11,-2, 10,-2, 9,-2, 9,-1, 10,-1, 11,-1, 11,0, 11,1, 11,2, 12,2, 12,1, 12,0, 12,-1, 13,-1, 13,0, 14,0] },
};
// The limit of one side stays within B × (its length) of the side's midpoint: B = max |child midpoint − 1/2| / (1 − r).
function genBound(g, r) {
  let m = 0;
  for (let k = 0; k + 1 < g.length; k++) m = Math.max(m, Math.hypot((g[k][0] + g[k + 1][0]) / 2 - 0.5, (g[k][1] + g[k + 1][1]) / 2));
  return m / (1 - r);
}
for (const key in QUAD) {
  const q = QUAD[key];
  q.N = +key; q.gen = [];
  for (let i = 0; i < q.p.length; i += 2) q.gen.push([q.p[i] / q.b, q.p[i + 1] / q.b]);
  q.D = Math.log(q.N) / Math.log(q.b); q.B = genBound(q.gen, 1 / q.b);
}
const SQUARE = Float64Array.from([0, 0, 1, 0, 1, 1, 0, 1]);     // counterclockwise
const qCache = {};
function islandQ(N, n) {
  const key = N + '|' + n;
  if (qCache[key]) return qCache[key];
  const g = QUAD[N].gen;
  let P = SQUARE;
  for (let k = 0; k < n; k++) {
    const m = P.length / 2, Q = new Float64Array(m * N * 2);
    let w = 0;
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, dx = P[j] - ax, dy = P[j + 1] - ay;
      for (let s = 0; s < N; s++) { Q[w++] = ax + dx * g[s][0] - dy * g[s][1]; Q[w++] = ay + dx * g[s][1] + dy * g[s][0]; }
    }
    P = Q;
  }
  return (qCache[key] = P);
}
// ---- Plate 49's generator: three equal legs turning by θ = 360°/M and back. As in the plates (and in Gosper's
// island), the first leg turns to the right of travel round a counterclockwise polygon.
function zigzag(theta) {
  const d0 = 2 + Math.cos(theta), d1 = -Math.sin(theta), dd = d0 * d0 + d1 * d1;   // 2 + e^{−iθ}
  const w = [d0 / dd, d1 / dd];                                                    // conj(1/(2 + e^{−iθ}))
  const v = [w[0] * Math.cos(theta) - w[1] * Math.sin(theta), w[0] * Math.sin(theta) + w[1] * Math.cos(theta)];
  const gen = [[0, 0], w, [w[0] + v[0], w[1] + v[1]], [1, 0]];
  const r = Math.hypot(w[0], w[1]);
  return { gen, mirror: gen.map((p) => [p[0], -p[1]]), r, D: Math.log(3) / Math.log(1 / r), B: genBound(gen, r) };
}
function polygonM(M, R, rot) {
  const P = new Float64Array(2 * M);
  for (let k = 0; k < M; k++) { const a = rot + (2 * Math.PI * k) / M; P[2 * k] = R * Math.cos(a); P[2 * k + 1] = R * Math.sin(a); }
  return P;
}
function edgesOf(P) {
  const m = P.length / 2, E = new Float64Array(4 * m);
  for (let i = 0; i < m; i++) { const j = ((i + 1) % m) * 2; E[4 * i] = P[2 * i]; E[4 * i + 1] = P[2 * i + 1]; E[4 * i + 2] = P[j]; E[4 * i + 3] = P[j + 1]; }
  return E;
}
// ---- the quartet (Plates 72–73): a Peano curve with 5 legs of 1/√5, v, v, −iv, −v, −iv with v = (1 + 2i)/5.
// Pieces 1 and 4 run backwards (read from the book's second-stage drawing). It fills Plate 49's central island.
const QG = [[0, 0], [0.2, 0.4], [0.4, 0.8], [0.8, 0.6], [0.6, 0.2], [1, 0]];
const QCODE = [1, 0, 0, 1, 0];
function quartet(ax, ay, bx, by, n) {
  const out = [ax, ay];
  const emit = (ax, ay, bx, by, d, rev) => {
    if (d === 0) { if (rev) out.push(ax, ay); else out.push(bx, by); return; }
    const dx = bx - ax, dy = by - ay, p = QG.map((g) => [ax + dx * g[0] - dy * g[1], ay + dx * g[1] + dy * g[0]]);
    if (!rev) for (let k = 0; k < 5; k++) { if (QCODE[k]) emit(p[k + 1][0], p[k + 1][1], p[k][0], p[k][1], d - 1, true); else emit(p[k][0], p[k][1], p[k + 1][0], p[k + 1][1], d - 1, false); }
    else for (let k = 4; k >= 0; k--) { if (QCODE[k]) emit(p[k + 1][0], p[k + 1][1], p[k][0], p[k][1], d - 1, false); else emit(p[k][0], p[k][1], p[k + 1][0], p[k + 1][1], d - 1, true); }
  };
  emit(ax, ay, bx, by, n, false);
  return out;
}
// ---- the zigzag curve on [0, 1] and its self-crossings
function zigzagCurve(theta, n) {
  const g = zigzag(theta).gen;
  let P = [0, 0, 1, 0];
  for (let k = 0; k < n; k++) {
    const Q = [];
    for (let i = 0; i + 2 < P.length; i += 2) {
      const ax = P[i], ay = P[i + 1], dx = P[i + 2] - ax, dy = P[i + 3] - ay;
      for (let j = 0; j < 3; j++) Q.push(ax + dx * g[j][0] - dy * g[j][1], ay + dx * g[j][1] + dy * g[j][0]);
    }
    Q.push(1, 0); P = Q;
  }
  return P;
}
// proper crossings between non-adjacent segments (ignoring touches thinner than 1e−9 of a segment's square)
function crossingsOf(P, cap = 400) {
  const m = P.length / 2 - 1, L = Math.hypot(P[2] - P[0], P[3] - P[1]), cell = L * 1.5, grid = new Map(), out = [];
  const keyOf = (i) => `${Math.floor((P[2 * i] + P[2 * i + 2]) / 2 / cell)},${Math.floor((P[2 * i + 1] + P[2 * i + 3]) / 2 / cell)}`;
  for (let i = 0; i < m; i++) { const k = keyOf(i); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(i); }
  const cr = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  let count = 0;
  for (let i = 0; i < m; i++) {
    const gx = Math.floor((P[2 * i] + P[2 * i + 2]) / 2 / cell), gy = Math.floor((P[2 * i + 1] + P[2 * i + 3]) / 2 / cell);
    const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const list = grid.get(`${gx + dx},${gy + dy}`);
      if (!list) continue;
      for (const j of list) {
        if (j <= i + 1) continue;
        const cx = P[2 * j], cy = P[2 * j + 1], ex = P[2 * j + 2], ey = P[2 * j + 3];
        const d1 = cr(ax, ay, bx, by, cx, cy), d2 = cr(ax, ay, bx, by, ex, ey), d3 = cr(cx, cy, ex, ey, ax, ay), d4 = cr(cx, cy, ex, ey, bx, by);
        if ((d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0) && Math.min(Math.abs(d1), Math.abs(d2), Math.abs(d3), Math.abs(d4)) > 1e-9 * L * L) {
          count++;
          if (out.length < 2 * cap) { const t = d3 / (d3 - d4); out.push(ax + (bx - ax) * t, ay + (by - ay) * t); }
        }
      }
    }
  }
  // touches: the curve coming back to a point it already visited (as at 60°, where it retraces its own lattice)
  const seen = new Map(), tol = L * 1e-6;
  let touches = 0;
  for (let i = 0; i <= m; i++) {
    const k = `${Math.round(P[2 * i] / tol)},${Math.round(P[2 * i + 1] / tol)}`, j = seen.get(k);
    if (j !== undefined && i - j > 1) { touches++; if (out.length < 2 * cap) out.push(P[2 * i], P[2 * i + 1]); } else if (j === undefined) seen.set(k, i);
  }
  return { count, touches, pts: out };
}
// CORE END

(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-US');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PRINT = { paper: '#ecebe6', ink: '#151515', rule: '#c9c8c2', muted: '#66665f', accent: '#2f5f9e', light: '#e7e6e0', dark: '#1b1b1b', hatchBase: '#cbcac3', hatch: '#262626', red: '#c2552d' };

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
  function fitView(f, cx, cy, r, box) {
    const W = box ? box.w : f.w, H = box ? box.h : f.h, s = Math.min(W, H) / (2 * r);
    return { s, ox: (box ? box.x : 0) + W / 2 - cx * s, oy: (box ? box.y : 0) + H / 2 + cy * s };
  }
  const toWorld = (f, v) => f.ctx.setTransform(f.dpr * v.s, 0, 0, -f.dpr * v.s, f.dpr * v.ox, f.dpr * v.oy);
  const toScreen = (f) => f.ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  function paper(f, color) { f.ctx.setTransform(1, 0, 0, 1, 0, 0); f.ctx.fillStyle = color; f.ctx.fillRect(0, 0, f.canvas.width, f.canvas.height); }
  function polyPath(P, closed = true) {
    const p = new Path2D();
    p.moveTo(P[0], P[1]);
    for (let i = 2; i < P.length; i += 2) p.lineTo(P[i], P[i + 1]);
    if (closed) p.closePath();
    return p;
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
  // A Koch polygon refined only where it is on screen and only while a side is longer than minPx; returns screen
  // points. Points are not clamped: at a low stage a side can cross the screen with both ends far outside, and moving
  // those ends would move the side (zoom is capped, so coordinates stay small enough for the canvas).
  function adaptivePoly(edges, genAt, B, maxLvl, v, box, minPx) {
    const out = [], s = v.s, x0 = box.x, y0 = box.y, x1 = box.x + box.w, y1 = box.y + box.h;
    const clx = (x) => x, cly = (y) => y;
    const rec = (ax, ay, bx, by, lvl) => {
      const dx = bx - ax, dy = by - ay, lp = Math.hypot(dx, dy) * s;
      const sx = v.ox + (ax + bx) * 0.5 * s, sy = v.oy - (ay + by) * 0.5 * s, r = lp * B + 2;
      if (lvl >= maxLvl || lp < minPx || sx + r < x0 || sx - r > x1 || sy + r < y0 || sy - r > y1) { out.push(clx(v.ox + ax * s), cly(v.oy - ay * s)); return; }
      const g = genAt(lvl);
      for (let k = 0; k + 1 < g.length; k++) {
        const p = g[k], q = g[k + 1];
        rec(ax + dx * p[0] - dy * p[1], ay + dx * p[1] + dy * p[0], ax + dx * q[0] - dy * q[1], ay + dx * q[1] + dy * q[0], lvl + 1);
      }
    };
    for (let i = 0; i < edges.length; i += 4) rec(edges[i], edges[i + 1], edges[i + 2], edges[i + 3], 0);
    return out;
  }
  const frameBox = (f) => ({ x: 0, y: 0, w: f.w, h: f.h });
  // pan and zoom for a canvas: a quick rescaled snapshot while moving, a full redraw once it settles
  function zoomable(wrapId, canvasId, fitOf, render, maxZoom = 400) {
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
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = z.ground || PRINT.paper; c.fillRect(0, 0, f.canvas.width, f.canvas.height);
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
        pan(m[0] - pinch.m[0], m[1] - pinch.m[1]);
        if (pinch.d > 0) zoomAt(m[0], m[1], d / pinch.d);
        pinch = { d, m };
      } else if (pts.size === 1 && (e.pointerType !== 'touch' || z.view.s > z.view.fit * 1.02)) pan(cur[0] - prev[0], cur[1] - prev[1]);
    });
    const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) wrap.classList.remove('dragging'); };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const [x, y] = local(e); zoomAt(x, y, Math.exp(-e.deltaY * 0.0045)); }, { passive: false });
    wrap.addEventListener('dblclick', (e) => { if (e.target.closest('.view-tools')) return; const [x, y] = local(e); zoomAt(x, y, e.shiftKey ? 0.5 : 2); });
    return { f, z, schedule, refit: () => { z.user = false; schedule(); } };
  }
  // small lattice drawing of a generator
  function latticeSVG(svg, q) {
    const xs = [], ys = [];
    for (let i = 0; i < q.p.length; i += 2) { xs.push(q.p[i]); ys.push(-q.p[i + 1]); }
    const x0 = Math.min(...xs) - 0.6, x1 = Math.max(...xs) + 0.6, y0 = Math.min(...ys) - 0.6, y1 = Math.max(...ys) + 0.6;
    svg.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
    const sw = Math.max(0.09, (x1 - x0) / 90), r = Math.max(0.13, (x1 - x0) / 70);
    let s = `<line x1="0" y1="0" x2="${q.b}" y2="0" stroke="#8a8a84" stroke-width="${sw * 0.5}" stroke-dasharray="${sw * 2} ${sw * 1.6}"/>`;
    s += `<polyline points="${xs.map((x, i) => x + ',' + ys[i]).join(' ')}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="round"/>`;
    s += xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="${i === 0 || i === xs.length - 1 ? r * 1.5 : r}" fill="currentColor"/>`).join('');
    svg.innerHTML = s;
  }
  // bounding box of a quadric island, measured once on an explicit stage
  const BOX = {};
  for (const [N, k] of [[8, 4], [18, 3], [32, 2], [98, 2]]) {
    const P = islandQ(N, k);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < P.length; i += 2) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
    BOX[N] = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: Math.max(x1 - x0, y1 - y0) / 2 * 1.04 };
  }
  const SQ_EDGES = edgesOf(SQUARE);
  const minPxOf = (q) => Math.max(1.2, 0.22 * q.b);
  const quadReadouts = (q, n, ids) => {
    $(ids[0]).textContent = fmt(4 * Math.pow(q.N, n));
    $(ids[1]).textContent = n === 0 ? '1' : `1/${fmt(Math.pow(q.b, n))}`;
    const L = Math.pow(q.N / q.b, n);
    $(ids[2]).innerHTML = `${L < 1000 ? +L.toFixed(3) : fmt(Math.round(L))} <small>× the square's</small>`;
    $(ids[3]).innerHTML = `${(Math.abs(shoelace(islandQ(q.N, Math.min(n, q.N === 98 ? 2 : q.N === 32 ? 2 : 3)))).toFixed(6))} <small>× the square</small>`;
  };
  function shoelace(P) { let s = 0; const m = P.length / 2; for (let i = 0; i < m; i++) { const j = ((i + 1) % m) * 2; s += P[2 * i] * P[j + 1] - P[j] * P[2 * i + 1]; } return s / 2; }

  // ====================== Plate 49 ======================
  // Sizes and turns fitted to the plate: each island keeps its polygon's area, so the measured areas give the polygons.
  const NEST = [
    { M: 32, R: 1, fill: PRINT.light }, { M: 16, R: 0.893, fill: PRINT.dark },
    { M: 8, R: 0.779, fill: PRINT.light }, { M: 4, R: 0.561, fill: PRINT.hatchBase },
  ].map((o) => ({ ...o, z: zigzag((2 * Math.PI) / o.M), edges: edgesOf(polygonM(o.M, o.R, Math.PI / o.M)) }));
  const st49 = { n: 6, hatch: true };
  const quartetPaths = {};
  function quartetPath(m) {
    if (quartetPaths[m]) return quartetPaths[m];
    const R = NEST[3].R, a = Math.PI / 4;
    const P = quartet(R * Math.cos(a), R * Math.sin(a), R * Math.cos(3 * a), R * Math.sin(3 * a), m);
    return (quartetPaths[m] = { path: polyPath(P, false), seg: R * Math.SQRT2 * Math.pow(5, -m / 2) });
  }
  const z49 = zoomable('w49', 'c49', (f) => fitView(f, 0, 0, 1.03), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.dark);
    toScreen(f);
    let inner = null;
    for (const o of NEST) {
      const p = polyPath(adaptivePoly(o.edges, () => o.z.gen, o.z.B, st49.n, v, frameBox(f), 1.1));
      c.fillStyle = o.fill; c.fill(p);
      inner = p;
    }
    if (st49.hatch) {
      const q = quartetPath(Math.max(1, Math.min(7, st49.n)));
      c.save(); c.clip(inner); toWorld(f, v);
      c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = PRINT.hatch; c.lineWidth = Math.max(q.seg * 0.42, 0.45 / v.s);
      c.stroke(q.path); c.restore();
    }
  });
  z49.z.ground = PRINT.dark;
  const mark49 = stepButtons($('s49'), [0, 1, 2, 3, 4, 5, 6], String, (n) => `Stage ${n}`, (n) => { st49.n = n; mark49(n); $('s49v').textContent = `stage ${n}`; $('c49s').textContent = n; z49.schedule(); });
  $('hatch49').addEventListener('change', (e) => { st49.hatch = e.target.checked; z49.schedule(); });
  $('t49').innerHTML = NEST.map((o) => `<tr><td>M = ${o.M}${o.M === 16 ? ' (lake)' : ''}</td><td>${(360 / o.M).toFixed(2).replace(/\.?0+$/, '')}°</td><td>${(1 / o.z.r).toFixed(4)}</td><td>${o.z.D.toFixed(4)}</td></tr>`).join('');

  // ====================== One rule, any polygon ======================
  const stF = { M: 4, n: 5, alt: false };
  const fF = figure($('cF'), () => {
    const f = fF, c = f.ctx, M = stF.M, zz = zigzag((2 * Math.PI) / M);
    const reach = Math.max(1, Math.cos(Math.PI / M) + zz.B * 2 * Math.sin(Math.PI / M));
    const v = fitView(f, 0, 0, Math.min(reach, 1.6) * 1.03);
    paper(f, PRINT.paper); toScreen(f);
    const pts = adaptivePoly(edgesOf(polygonM(M, 1, Math.PI / M)), (lvl) => (stF.alt && lvl % 2 === 1 ? zz.mirror : zz.gen), zz.B, stF.n, v, frameBox(f), 1.1);
    c.fillStyle = PRINT.ink; c.fill(polyPath(pts), 'nonzero');
    toWorld(f, v);
    c.setLineDash([5 / v.s, 4 / v.s]); c.lineWidth = 1.2 / v.s; c.strokeStyle = '#8c8b84';
    c.stroke(polyPath(polygonM(M, 1, Math.PI / M))); c.setLineDash([]);
  });
  const NOTES = {
    3: 'θ = 120°: the legs meet at 60°, D = 2, and the coastline runs over itself. Plates 72–73 take this case up as the "fudgeflake".',
    4: 'The central island of Plate 49, which the quartet Peano curve fills.',
    6: "Gosper's island, Plates 46–47.",
    32: 'Almost a circle: D ≈ 1.004.',
  };
  function setF() {
    const M = stF.M, zz = zigzag((2 * Math.PI) / M);
    markM(M); markSF(stF.n); markA(stF.alt);
    $('mFv').textContent = `M = ${M}`; $('sFv').textContent = `stage ${stF.n}`;
    $('cFn').textContent = `M = ${M}, stage ${stF.n}${stF.alt ? ', S and F alternating' : ''}`;
    $('rFa').textContent = `${+(360 / M).toFixed(2)}°`;
    $('rFb').textContent = (1 / zz.r).toFixed(4);
    $('rFc').textContent = zz.D.toFixed(4);
    $('nF').textContent = NOTES[M] || `${fmt(M * Math.pow(3, stF.n))} sides at this stage.`;
    fF.draw();
  }
  const markM = stepButtons($('mF'), [3, 4, 5, 6, 8, 12, 16, 32], String, (m) => `${m} sides`, (m) => { stF.M = m; setF(); });
  const markSF = stepButtons($('sF'), [0, 1, 2, 3, 4, 5, 6, 7], String, (n) => `Stage ${n}`, (n) => { stF.n = n; setF(); });
  const markA = stepButtons($('aF'), [false, true], (a) => (a ? 'S, F, S, F …' : 'S at every stage'), (a) => (a ? 'Alternate the generator and its mirror image' : 'The same generator at every stage'), (a) => { stF.alt = a; setF(); });

  // ====================== A critical dimension ======================
  const stC = { a: 90, n: 7, data: null, key: '' };
  function dataC() {
    const key = `${stC.a}|${stC.n}`;
    if (key === stC.key) return stC.data;
    const theta = (180 - stC.a) / DEG, P = zigzagCurve(theta, stC.n), X = crossingsOf(P);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < P.length; i += 2) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
    stC.key = key;
    return (stC.data = { path: polyPath(P, false), X, box: { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }, z: zigzag(theta) });
  }
  const fC = figure($('cC'), () => {
    const f = fC, c = f.ctx, d = dataC();
    paper(f, PRINT.paper);
    const s = Math.min(f.w / (d.box.w * 1.08 + 0.02), f.h / (d.box.h * 1.12 + 0.04));
    const v = { s, ox: f.w / 2 - d.box.cx * s, oy: f.h / 2 + d.box.cy * s };
    toWorld(f, v);
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.2 / s; c.stroke(d.path);
    toScreen(f);
    c.strokeStyle = PRINT.red; c.lineWidth = 2;
    for (let i = 0; i < Math.min(d.X.pts.length, 240); i += 2) { c.beginPath(); c.arc(v.ox + d.X.pts[i] * s, v.oy - d.X.pts[i + 1] * s, 6, 0, Math.PI * 2); c.stroke(); }
  });
  let rafC = 0;
  function setC() {
    const d = dataC();
    $('aCv').textContent = `${stC.a.toFixed(1)}°`;
    $('sCv').textContent = `stage ${stC.n}`; $('cCn').textContent = `angle ${stC.a.toFixed(1)}°, stage ${stC.n}`;
    $('dCv').textContent = `D = ${d.z.D.toFixed(4)} · 1/r = ${(1 / d.z.r).toFixed(4)}`;
    const el = $('xC');
    el.classList.toggle('bad', d.X.count + d.X.touches > 0);
    el.textContent = d.X.count
      ? `Crosses itself at stage ${stC.n}: ${fmt(d.X.count)} crossing${d.X.count > 1 ? 's' : ''}.`
      : d.X.touches
        ? `Runs back onto itself at stage ${stC.n}: it revisits ${fmt(d.X.touches)} point${d.X.touches > 1 ? 's' : ''} it has already passed through.`
        : `No self-crossing or self-contact at stage ${stC.n}.`;
    markSC(stC.n); fC.draw();
  }
  $('aC').addEventListener('input', (e) => { stC.a = +e.target.value / 10; if (!rafC) rafC = requestAnimationFrame(() => { rafC = 0; setC(); }); });
  const markSC = stepButtons($('sC'), [1, 2, 3, 4, 5, 6, 7, 8, 9], String, (n) => `Stage ${n}`, (n) => { stC.n = n; setC(); });
  for (const [a, label] of [[180, '180°: straight'], [120, '120°: M = 6'], [90, '90°: M = 4'], [64.4, '64.4°: critical'], [60, '60°: D = 2']]) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', () => { stC.a = a; $('aC').value = String(Math.round(a * 10)); if (a < 66 && stC.n < 9) stC.n = 9; setC(); });
    $('pC').append(b);
  }

  // ====================== Plate 51 ======================
  const Q8 = QUAD[8];
  const st51 = { n: 4, d: 0, hover: -1, anim: null, provs: [], msg: '' };
  let view51 = null;
  // cells of the stage-d island (at scale 1/4^d): the squares the provinces are built on
  const cellCache = {};
  function cellsOf(d) {
    if (cellCache[d]) return cellCache[d];
    const P = islandQ(8, d), sc = Math.pow(4, d), m = P.length / 2, out = [];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < P.length; i += 2) { x0 = Math.min(x0, P[i] * sc); x1 = Math.max(x1, P[i] * sc); y0 = Math.min(y0, P[i + 1] * sc); y1 = Math.max(y1, P[i + 1] * sc); }
    for (let i = Math.floor(x0); i < x1; i++) for (let j = Math.floor(y0); j < y1; j++) if (insidePoly(P, (i + 0.5) / sc, (j + 0.5) / sc)) out.push([i, j]);
    return (cellCache[d] = out);
  }
  function insidePoly(P, x, y) {
    let c = false;
    const m = P.length / 2;
    for (let i = 0, j = m - 1; i < m; j = i++) {
      const xi = P[2 * i], yi = P[2 * i + 1], xj = P[2 * j], yj = P[2 * j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const TONES = [0.84, 0.6, 0.72, 0.5];
  const toneOf = (i, j) => TONES[(((i % 2) + 2) % 2) + 2 * (((j % 2) + 2) % 2)];
  const grey = (L) => { const v = Math.round(L * 255); return `rgb(${v},${Math.round(v * 0.99)},${Math.round(v * 0.95)})`; };
  function placed(P, a, bx, by) { const Q = new Float64Array(P.length); for (let i = 0; i < P.length; i += 2) { Q[i] = bx + a * P[i]; Q[i + 1] = by + a * P[i + 1]; } return Q; }
  function buildProvs51() {
    const d = st51.d;
    if (!d) { st51.provs = []; return; }
    const base = islandQ(8, Math.max(0, Math.min(st51.n - d, 3))), sc = Math.pow(4, -d), cells = cellsOf(d);
    const parents = d === 2 ? cellsOf(1).map(([i, j]) => ({ i, j, P: placed(islandQ(8, 1), 0.25, i / 4, j / 4) })) : null;
    st51.provs = cells.map(([i, j]) => {
      const P = placed(base, sc, i * sc, j * sc);
      let L = toneOf(i, j);
      if (parents) { const pa = parents.find((q) => insidePoly(q.P, (i + 0.5) * sc, (j + 0.5) * sc)); if (pa) L = 0.55 * L + 0.45 * toneOf(pa.i, pa.j); }
      return { P, path: polyPath(P), L, i, j, a: sc, bx: i * sc, by: j * sc };
    });
    st51.top = d === 2 ? cellsOf(1).map(([i, j]) => polyPath(placed(islandQ(8, Math.max(0, Math.min(st51.n - 1, 3))), 0.25, i / 4, j / 4))) : [];
  }
  const outline51 = (n) => islandQ(8, Math.min(n, 4));
  const easeT = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const smoothT = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  function drawProvs(c, k, provs, o) {
    provs.forEach((p, i) => { c.fillStyle = i === o.hover ? '#9db8de' : grey(p.L); c.fill(p.path); });
    c.lineWidth = (st51.d === 2 ? 0.5 : 0.8) / k; c.strokeStyle = st51.d === 2 ? 'rgba(21,21,21,0.4)' : PRINT.ink; c.lineJoin = 'round';
    provs.forEach((p) => c.stroke(p.path));
    c.strokeStyle = PRINT.ink;
    if (st51.d === 2) { c.lineWidth = 1.6 / k; for (const t of o.top) c.stroke(t); }
    c.lineWidth = 2 / k; c.stroke(o.outline);
  }
  const f51 = figure($('c51'), () => draw51());
  function draw51() {
    const f = f51, c = f.ctx, B = BOX[8], an = st51.anim;
    const v = (view51 = fitView(f, B.cx, B.cy, B.r));
    paper(f, PRINT.paper);
    if (!st51.d) {
      toScreen(f);
      c.fillStyle = PRINT.ink; c.fill(polyPath(adaptivePoly(SQ_EDGES, () => Q8.gen, Q8.B, st51.n, v, frameBox(f), 1.1)));
      return;
    }
    const outline = polyPath(outline51(st51.n));
    if (!an) {
      toWorld(f, v);
      drawProvs(c, v.s, st51.provs, { hover: st51.hover, top: st51.top, outline });
      if (st51.hover >= 0) { c.lineWidth = 2.4 / v.s; c.strokeStyle = PRINT.accent; c.stroke(st51.provs[st51.hover].path); }
      return;
    }
    // the chosen province T(z) = b + a·z grows about its fixed point b/(1 − a) until it is the whole island
    const e = easeT(an.t), s = smoothT(0.12, 0.8, e), g = Math.exp(-e * Math.log(an.a)), k = v.s * g;
    toWorld(f, v); c.translate(an.z[0], an.z[1]); c.scale(g, g); c.translate(-an.z[0], -an.z[1]);
    c.globalAlpha = 1 - e;
    drawProvs(c, k, an.others, { hover: -1, top: st51.top, outline });
    c.globalAlpha = 1 - s; c.fillStyle = grey(an.L); c.fill(an.path);
    c.globalAlpha = s;
    drawProvs(c, k, an.subs, { hover: -1, top: an.top, outline: an.outline });
    c.globalAlpha = 1 - s; c.lineWidth = 2.6 / k; c.strokeStyle = PRINT.accent; c.stroke(an.path);
    c.globalAlpha = 1;
  }
  function expand51(i) {
    if (st51.anim || i < 0 || !st51.d) return;
    const p = st51.provs[i], T = (P) => placed(P, p.a, p.bx, p.by);
    st51.hover = -1;
    st51.anim = {
      t: 0, t0: performance.now(), dur: 1500, a: p.a, z: [p.bx / (1 - p.a), p.by / (1 - p.a)], path: p.path, L: p.L,
      others: st51.provs.filter((_, j) => j !== i),
      subs: st51.provs.map((q) => ({ path: polyPath(T(q.P)), L: q.L })),
      top: st51.d === 2 ? cellsOf(1).map(([ci, cj]) => polyPath(T(placed(islandQ(8, Math.max(0, Math.min(st51.n - 1, 3))), 0.25, ci / 4, cj / 4)))) : [],
      outline: polyPath(T(outline51(st51.n))),
    };
    st51.msg = `<b>Province (${p.i}, ${p.j})</b> grew ${st51.d === 1 ? '4' : '16'} times and fills the island exactly, with ${st51.d === 1 ? '16' : '256'} provinces of its own: the picture you started with.`;
    $('i51').innerHTML = st51.msg;
    if (reduceMotion) { st51.anim = null; draw51(); return; }
    const step = (now) => { const an = st51.anim; if (!an) return; an.t = Math.min(1, (now - an.t0) / an.dur); draw51(); if (an.t < 1) requestAnimationFrame(step); else { st51.anim = null; draw51(); } };
    requestAnimationFrame(step);
  }
  function info51() {
    const el = $('i51');
    if (!st51.d) { el.textContent = 'The island splits into 16 islands a quarter the size, each built on one of the 16 squares of the first stage. Show them, then click one to expand it.'; return; }
    if (st51.hover < 0) { if (st51.msg) el.innerHTML = st51.msg; else el.textContent = `Click any of the ${st51.d === 1 ? 16 : 256} provinces (or use the arrow keys and Enter) to expand it to the whole island.`; return; }
    const p = st51.provs[st51.hover];
    el.innerHTML = `<b>Province (${p.i}, ${p.j})</b>: the whole island at ${st51.d === 1 ? '1/4' : '1/16'} the size, built on one small square. Click to expand it.`;
  }
  function set51() {
    if (st51.anim) return;
    if (st51.d > st51.n) st51.d = st51.n;
    mark51(st51.n); markD51(st51.d);
    markD51.buttons.forEach((b, k) => { b.disabled = k > st51.n; });
    $('s51v').textContent = `stage ${st51.n}`; $('c51n').textContent = `stage ${st51.n}`;
    $('d51v').textContent = ['none', '16 provinces', '256 provinces'][st51.d];
    $('c51h').textContent = st51.d ? ` · ${st51.d === 1 ? 16 : 256} provinces · click one to expand it` : '';
    $('c51').style.cursor = st51.d ? 'pointer' : 'default';
    quadReadouts(Q8, st51.n, ['r51a', 'r51b', 'r51c', 'r51d']);
    $('r51b').textContent = st51.n === 0 ? '1' : `1/${fmt(Math.pow(4, st51.n))}`;
    st51.hover = -1; st51.msg = '';
    buildProvs51(); info51(); draw51();
  }
  const mark51 = stepButtons($('s51'), [0, 1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { st51.n = n; set51(); });
  const markD51 = stepButtons($('d51'), [0, 1, 2], (d) => ['None', '16', '256'][d], (d) => ['No provinces', '16 provinces', '256 provinces'][d], (d) => { st51.d = d; set51(); });
  const c51 = $('c51');
  const hit51 = (e) => { const r = c51.getBoundingClientRect(), x = (e.clientX - r.left - view51.ox) / view51.s, y = (view51.oy - (e.clientY - r.top)) / view51.s; for (let i = 0; i < st51.provs.length; i++) if (insidePoly(st51.provs[i].P, x, y)) return i; return -1; };
  let down51 = null;
  c51.addEventListener('pointermove', (e) => { if (!st51.d || st51.anim || !view51) return; const h = hit51(e); if (h !== st51.hover) { st51.hover = h; if (h >= 0) st51.msg = ''; info51(); draw51(); } });
  c51.addEventListener('pointerdown', (e) => { down51 = [e.clientX, e.clientY]; });
  c51.addEventListener('pointerup', (e) => { if (!down51 || !st51.d || !view51) return; const moved = Math.hypot(e.clientX - down51[0], e.clientY - down51[1]); down51 = null; if (moved <= 8) expand51(hit51(e)); });
  c51.addEventListener('pointerleave', () => { if (st51.hover >= 0 && !st51.anim) { st51.hover = -1; info51(); draw51(); } });
  c51.addEventListener('keydown', (e) => {
    if (!st51.d || st51.anim) return;
    const n = st51.provs.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') st51.hover = (st51.hover + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') st51.hover = st51.hover <= 0 ? n - 1 : st51.hover - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand51(st51.hover >= 0 ? st51.hover : 0); return; }
    else return;
    e.preventDefault(); st51.msg = ''; info51(); draw51();
  });
  latticeSVG($('g51'), Q8);

  // ====================== Plate 53 ======================
  const Q18 = QUAD[18];
  const st53 = { n: 3 };
  const renderQuad = (q, getN) => (f, v) => {
    paper(f, PRINT.paper); toScreen(f);
    f.ctx.fillStyle = PRINT.ink;
    f.ctx.fill(polyPath(adaptivePoly(SQ_EDGES, () => q.gen, q.B, getN(), v, frameBox(f), minPxOf(q))));
  };
  const z53 = zoomable('w53', 'c53', (f) => fitView(f, BOX[18].cx, BOX[18].cy, BOX[18].r), renderQuad(Q18, () => st53.n));
  const mark53 = stepButtons($('s53'), [0, 1, 2, 3, 4], String, (n) => `Stage ${n}`, (n) => { st53.n = n; mark53(n); $('s53v').textContent = `stage ${n}`; $('c53n').textContent = `stage ${n}`; z53.schedule(); });
  latticeSVG($('g53'), Q18);
  // maximality: N_max = b²/2 (b even) or (b² + 1)/2 (b odd), D_max = log N_max / log b
  (function maxPlot() {
    const W = 360, H = 190, ml = 34, mr = 10, mt = 12, mb = 34, bmax = 16;
    const X = (b) => ml + ((b - 2) / (bmax - 2)) * (W - ml - mr), Y = (D) => mt + ((2 - D) / 1) * (H - mt - mb);
    const nmax = (b) => (b % 2 ? (b * b + 1) / 2 : (b * b) / 2), dmax = (b) => Math.log(nmax(b)) / Math.log(b);
    let s = '';
    for (const D of [1, 1.25, 1.5, 1.75, 2]) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(D)}" y2="${Y(D)}" stroke="#c9c8c2"${D === 2 ? ' stroke-dasharray="4 3"' : ''}/><text x="${ml - 5}" y="${Y(D) + 3.5}" text-anchor="end">${D}</text>`;
    for (let b = 2; b <= bmax; b += 2) s += `<text x="${X(b)}" y="${H - mb + 14}" text-anchor="middle">${b}</text>`;
    s += `<text x="${(ml + W - mr) / 2}" y="${H - 4}" text-anchor="middle">b (steps of 1/b)</text>`;
    let p = '';
    for (let b = 2; b <= bmax; b++) p += (b === 2 ? 'M' : 'L') + X(b).toFixed(1) + ' ' + Y(dmax(b)).toFixed(1);
    s += `<path d="${p}" fill="none" stroke="#151515" stroke-width="1.2"/>`;
    const used = { 4: '51', 6: '53', 8: '55', 14: '54' };
    for (let b = 2; b <= bmax; b++) {
      const u = used[b];
      s += `<circle cx="${X(b)}" cy="${Y(dmax(b))}" r="${u ? 4.2 : 2.6}" fill="${u ? '#2f5f9e' : '#151515'}" stroke="#ecebe6" stroke-width="1.5"><title>b = ${b}: N = ${nmax(b)}, D = ${dmax(b).toFixed(4)}</title></circle>`;
      if (u) s += `<text x="${X(b) + 4}" y="${Y(dmax(b)) + 17}" text-anchor="start" style="fill:#2f5f9e">Plate ${u}</text>`;
    }
    $('maxPlot').innerHTML = s;
  })();

  // ====================== Plates 54–55 ======================
  const st54 = { N: 32, n: 3 };
  const z54 = zoomable('w54', 'c54', (f) => fitView(f, BOX[st54.N].cx, BOX[st54.N].cy, BOX[st54.N].r), (f, v) => renderQuad(QUAD[st54.N], () => st54.n)(f, v), 1000);
  const fS = figure($('cS'), () => {
    const f = fS, c = f.ctx, q = QUAD[st54.N], Bx = BOX[st54.N];
    paper(f, PRINT.paper); toScreen(f);
    const pw = f.w / 4;
    for (let k = 0; k < 4; k++) {
      const box = { x: k * pw + 4, y: 18, w: pw - 8, h: f.h - 24 };
      const v = fitView(f, Bx.cx, Bx.cy, Bx.r, box);
      c.fillStyle = PRINT.ink; c.fill(polyPath(adaptivePoly(SQ_EDGES, () => q.gen, q.B, k, v, box, minPxOf(q))));
      c.font = '600 11px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif'; c.fillStyle = PRINT.muted; c.textBaseline = 'top';
      c.fillText(`stage ${k}`, k * pw + 6, 3);
    }
  });
  function set54() {
    const q = QUAD[st54.N];
    if (st54.n > (st54.N === 98 ? 3 : 4)) st54.n = st54.N === 98 ? 3 : 4;
    markQ(st54.N); mark54(st54.n);
    mark54.buttons.forEach((b, k) => { b.disabled = st54.N === 98 && k > 3; });
    $('c54t').textContent = `Plate ${q.plate}`; $('c54n').textContent = `stage ${st54.n}`; $('s54v').textContent = `stage ${st54.n}`;
    $('g54t').innerHTML = st54.N === 32 ? 'N = 32, r = 1/b = 1/8<br>D = log 32 / log 8 = 5/3' : 'N = 98, r = 1/b = 1/14<br>D = log 98 / log 14 ≈ 1.7373';
    $('cSn').textContent = st54.N === 32 ? 'the 32-step generator of Plate 55' : 'the 98-step generator of Plate 54';
    latticeSVG($('g54'), q);
    quadReadouts(q, st54.n, ['r54a', 'r54b', 'r54c', 'r54d']);
    z54.refit(); fS.draw();
  }
  const markQ = stepButtons($('q54'), [32, 98], (N) => (N === 32 ? 'N = 32 (Plate 55)' : 'N = 98 (Plate 54)'), (N) => `The ${N}-step generator`, (N) => { st54.N = N; st54.n = N === 98 ? 2 : 3; set54(); });
  const mark54 = stepButtons($('s54'), [0, 1, 2, 3, 4], String, (n) => `Stage ${n}`, (n) => { st54.n = n; set54(); });

  // ---------- boot ----------
  mark49(6);
  setF();
  setC();
  set51();
  mark53(3);
  set54();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fS.draw());
})();
