// CORE START
const DEG = 180 / Math.PI;
// ---- Plate 63: Peano's generator on [0, 3] (y to the left of travel), placed the same way on every side
const PG = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 0], [1, 0], [1, -1], [2, -1], [2, 0], [3, 0]];
const islandCache = [];
// stage-n island on the unit square, counterclockwise; vertex k·9ⁿ is corner k of the square
function peanoIsland(n) {
  if (islandCache[n]) return islandCache[n];
  const N = Math.pow(3, n);
  let P = [0, 0, N, 0, N, N, 0, N];
  for (let s = 0; s < n; s++) {
    const m = P.length / 2, Q = new Array(m * 18);
    let w = 0;
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, dx = (P[j] - ax) / 3, dy = (P[j + 1] - ay) / 3;
      for (let g = 0; g < 9; g++) { Q[w++] = ax + dx * PG[g][0] - dy * PG[g][1]; Q[w++] = ay + dy * PG[g][0] + dx * PG[g][1]; }
    }
    P = Q;
  }
  const F = new Float64Array(P.length);
  for (let i = 0; i < P.length; i++) F[i] = P[i] / N;
  return (islandCache[n] = F);
}
// Cut every turn by a fraction c of the side, except the square's four corners. Left and right turns then come in
// equal numbers, so the cuts cancel and the area stays exactly 1; the cut polygon has no self-contact.
function cutCorners(P, n, c) {
  const m = P.length / 2, per = Math.pow(9, n), out = [];
  for (let i = 0; i < m; i++) {
    const h = (i - 1 + m) % m, j = (i + 1) % m;
    const x = P[2 * i], y = P[2 * i + 1], d1x = x - P[2 * h], d1y = y - P[2 * h + 1], d2x = P[2 * j] - x, d2y = P[2 * j + 1] - y;
    if (i % per === 0 || Math.abs(d1x * d2y - d1y * d2x) < 1e-15) { out.push(x, y); continue; }
    out.push(x - d1x * c, y - d1y * c, x + d2x * c, y + d2y * c);
  }
  return Float64Array.from(out);
}
// land or sea at stage n: the island is the chessboard squares with i + j even inside |x − ½| + |y − ½| < 1
function isLandCell(i, j, N) {
  const cx = (i + 0.5) / N, cy = (j + 0.5) / N;
  return Math.abs(cx - 0.5) + Math.abs(cy - 0.5) < 1 && (((i + j) % 2) + 2) % 2 === 0;
}
const isLandAt = (x, y, n) => { const N = Math.pow(3, n); return isLandCell(Math.floor(x * N), Math.floor(y * N), N); };
function landShare(x, y, side, n) {
  const N = Math.pow(3, n), x0 = x - side / 2, x1 = x + side / 2, y0 = y - side / 2, y1 = y + side / 2;
  let land = 0;
  for (let i = Math.floor(x0 * N); i <= Math.floor(x1 * N); i++) {
    const wx = Math.min(x1, (i + 1) / N) - Math.max(x0, i / N);
    if (wx <= 0) continue;
    for (let j = Math.floor(y0 * N); j <= Math.floor(y1 * N); j++) {
      const wy = Math.min(y1, (j + 1) / N) - Math.max(y0, j / N);
      if (wy > 0 && isLandCell(i, j, N)) land += wx * wy;
    }
  }
  return land / (side * side);
}
// one side's curve: the generator applied the same way at every stage, from (0,0) to (1,0)
const sideCache = [];
function peanoSide(n) {
  if (sideCache[n]) return sideCache[n];
  const out = [0, 0];
  const rec = (ax, ay, bx, by, d) => {
    if (d === 0) { out.push(bx, by); return; }
    const dx = (bx - ax) / 3, dy = (by - ay) / 3;
    for (let g = 0; g < 9; g++) rec(ax + dx * PG[g][0] - dy * PG[g][1], ay + dy * PG[g][0] + dx * PG[g][1], ax + dx * PG[g + 1][0] - dy * PG[g + 1][1], ay + dy * PG[g + 1][0] + dx * PG[g + 1][1], d - 1);
  };
  rec(0, 0, 1, 0, n);
  return (sideCache[n] = Float64Array.from(out));
}
// ---- Plates 64–65: two-interval generators. A is the apex in the segment's own frame (y to the left of travel).
// codes per piece: 0 as drawn, 1 mirrored, 2 run backwards, 3 both.
//   Pólya: apex to the left, codes [1, 3]. Each piece is the half of the right triangle cut off by its altitude,
//          so this is also the rule for unequal legs (Plate 64).
//   Cesàro: apex to the right of the initiator [1, 0], codes [1, 1]: sides alternate from stage to stage.
// Unequal legs: φ is the angle at the start when the apex angle θ is 90°. As θ opens, both base angles shrink
// in proportion, (180° − θ)/90°, so any φ and θ give a proper triangle; at θ = 180° the apex lands on the chord.
function baseAngles(phiDeg, thetaDeg) { const k = (180 - thetaDeg) / 90; return [phiDeg * k, (90 - phiDeg) * k]; }
function apexOf(phiDeg, thetaDeg) {
  const [a, b] = baseAngles(phiDeg, thetaDeg);
  const r1 = a + b < 1e-9 ? (90 - phiDeg) / 90 : Math.sin(b / DEG) / Math.sin((a + b) / DEG);
  return [r1 * Math.cos(a / DEG), r1 * Math.sin(a / DEG)];
}
// If apexOut is given, it receives, for each final interval in curve order, the corner the next stage would add.
function twoCurve(A, codes, n, ax, ay, bx, by, apexOut) {
  const out = [ax, ay];
  const rec = (ax, ay, bx, by, m, rev, d) => {
    if (d === 0) {
      if (rev) out.push(ax, ay); else out.push(bx, by);
      if (apexOut) { const gy = m ? -A[1] : A[1], dx = bx - ax, dy = by - ay; apexOut.push(ax + dx * A[0] - dy * gy, ay + dy * A[0] + dx * gy); }
      return;
    }
    const gy = m ? -A[1] : A[1], dx = bx - ax, dy = by - ay;
    const cx = ax + dx * A[0] - dy * gy, cy = ay + dy * A[0] + dx * gy;
    const P = [[ax, ay], [cx, cy], [bx, by]], kids = [];
    for (let k = 0; k < 2; k++) {
      const c = codes[k], cm = m ^ (c & 1);
      kids.push(c >= 2 ? [P[k + 1], P[k], cm, 1] : [P[k], P[k + 1], cm, 0]);
    }
    const order = rev ? [kids[1], kids[0]] : kids;
    for (const [p, q, cm, cr] of order) rec(p[0], p[1], q[0], q[1], cm, rev ^ cr, d - 1);
  };
  rec(ax, ay, bx, by, 0, 0, n);
  return out;
}
function dimension(rs) {
  let lo = 0.01, hi = 6;
  for (let i = 0; i < 90; i++) { const mid = (lo + hi) / 2, g = rs.reduce((s, r) => s + Math.pow(r, mid), 0); if (g > 1) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
// ---- Plate 65 caption: four Cesàro sweeps along the sides of the unit square, each inward, run in turn.
// First-visit time: inside triangle (a, b, c) with hypotenuse a→b and right angle c, the curve sweeps the half
// (a, c, m) first and then (c, b, m), with m the midpoint of a b. Each side takes one unit of time.
const SQ = [[0, 0], [1, 0], [1, 1], [0, 1]], CEN = [0.5, 0.5];
const cr2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function triTime(P, a, b, c) {
  let t = 0, h = 1;
  for (let k = 0; k < 48; k++) {
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    h /= 2;
    if (cr2(c, m, P) * cr2(c, m, a) >= 0) { b = c; c = m; } else { t += h; a = c; c = m; }
  }
  return t;
}
function cesaroTime(P) {
  for (let k = 0; k < 4; k++) {
    const a = SQ[k], b = SQ[(k + 1) % 4], s1 = cr2(a, b, P), s2 = cr2(b, CEN, P), s3 = cr2(CEN, a, P);
    if (s1 >= -1e-12 && s2 >= -1e-12 && s3 >= -1e-12) return k + triTime(P, a, b, CEN);
  }
  return 4;
}
// CORE END

(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-US');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PRINT = { paper: '#ecebe6', ink: '#151515', rule: '#c9c8c2', muted: '#66665f', accent: '#2f5f9e', red: '#c2452d', faint: '#bdbbb3' };

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
    const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, s = Math.min(f.w / (w * (1 + 2 * pad)), f.h / (h * (1 + 2 * pad)));
    return { s, ox: f.w / 2 - ((bb.x0 + bb.x1) / 2) * s, oy: f.h / 2 + ((bb.y0 + bb.y1) / 2) * s };
  }
  const toWorld = (f, v) => f.ctx.setTransform(f.dpr * v.s, 0, 0, -f.dpr * v.s, f.dpr * v.ox, f.dpr * v.oy);
  const toScreen = (f) => f.ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  function paper(f, color) { f.ctx.setTransform(1, 0, 0, 1, 0, 0); f.ctx.fillStyle = color; f.ctx.fillRect(0, 0, f.canvas.width, f.canvas.height); }
  function polyPath(P, closed = true, upto) {
    const p = new Path2D(), m = upto === undefined ? P.length / 2 : upto;
    p.moveTo(P[0], P[1]);
    for (let i = 1; i < m; i++) p.lineTo(P[2 * i], P[2 * i + 1]);
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
  // pan and zoom: a quick rescaled snapshot while moving, a full redraw once it settles
  function zoomable(wrapId, canvasId, fitOf, render, maxZoom = 300) {
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
  const shoelace = (P) => { let s = 0; const m = P.length / 2; for (let i = 0; i < m; i++) { const j = ((i + 1) % m) * 2; s += P[2 * i] * P[j + 1] - P[j] * P[2 * i + 1]; } return s / 2; };
  const DIAMOND = [0.5, -0.5, 1.5, 0.5, 0.5, 1.5, -0.5, 0.5];

  // ====================== Plate 63: the island ======================
  const CUT = 0.25, WIN = 0.08;
  const st63 = { n: 2, cut: true, pt: null };
  const islandPaths = {};
  function islandPath(n, cut) {
    const key = `${n}|${cut}`;
    if (!islandPaths[key]) { const P = peanoIsland(n); islandPaths[key] = { path: polyPath(cut && n > 0 ? cutCorners(P, n, CUT) : P), area: shoelace(cut && n > 0 ? cutCorners(P, n, CUT) : P) }; }
    return islandPaths[key];
  }
  let view63 = null;
  const f63 = figure($('c63'), () => {
    const f = f63, c = f.ctx, v = (view63 = fitBox(f, { x0: -0.5, x1: 1.5, y0: -0.5, y1: 1.5 }, 0.03));
    paper(f, PRINT.paper); toWorld(f, v);
    c.setLineDash([5 / v.s, 4 / v.s]); c.lineWidth = 1 / v.s; c.strokeStyle = PRINT.faint; c.stroke(polyPath(DIAMOND)); c.setLineDash([]);
    c.fillStyle = PRINT.ink; c.fill(islandPath(st63.n, st63.cut).path, 'nonzero');
    if (st63.pt) {
      const [x, y] = st63.pt;
      toScreen(f);
      const sx = v.ox + x * v.s, sy = v.oy - y * v.s, hw = (WIN / 2) * v.s;
      c.lineWidth = 3; c.strokeStyle = PRINT.paper; c.strokeRect(sx - hw, sy - hw, 2 * hw, 2 * hw);
      c.lineWidth = 1.6; c.strokeStyle = PRINT.red; c.strokeRect(sx - hw, sy - hw, 2 * hw, 2 * hw);
      c.fillStyle = PRINT.red; c.strokeStyle = PRINT.paper; c.lineWidth = 2;
      c.beginPath(); c.arc(sx, sy, 4.5, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  });
  function set63() {
    const n = st63.n;
    mark63(n);
    $('s63v').textContent = `stage ${n}`; $('c63s').textContent = n; $('c63c').textContent = st63.cut && n > 0 ? ', corners cut' : '';
    $('r63a').textContent = fmt(Math.pow(9, n));
    $('r63b').textContent = n === 0 ? '1' : `1/${fmt(Math.pow(3, n))}`;
    $('r63c').innerHTML = `${fmt(4 * Math.pow(3, n))} <small>× the square's side</small>`;
    $('r63d').innerHTML = `${islandPath(n, st63.cut).area.toFixed(6)} <small>× the black box</small>`;
    $('c63').setAttribute('aria-label', `Peano island at stage ${n}: ${fmt(Math.pow(9, n))} black squares${st63.cut ? ' with the corners cut' : ''}`);
    f63.draw();
  }
  const mark63 = stepButtons($('s63'), [0, 1, 2, 3, 4], String, (n) => `Stage ${n}`, (n) => { st63.n = n; set63(); });
  $('cut63').addEventListener('change', (e) => { st63.cut = e.target.checked; set63(); });
  function pick63(x, y) {
    st63.pt = [x, y];
    const land = [], share = [];
    for (let n = 1; n <= 12; n++) land.push(isLandAt(x, y, n));
    for (let n = 1; n <= 8; n++) share.push(landShare(x, y, WIN, n));
    drawFlip(land, share);
    let flips = 0;
    for (let i = 1; i < land.length; i++) if (land[i] !== land[i - 1]) flips++;
    const inside = Math.abs(x - 0.5) + Math.abs(y - 0.5) < 1;
    $('flipInfo').innerHTML = inside
      ? `<b>Point (${x.toFixed(3)}, ${y.toFixed(3)})</b> is land at ${land.filter(Boolean).length} of stages 1–12 and changes sides ${flips} times. The share of land in the little square around it ends at ${(share[7] * 100).toFixed(1)}%.`
      : `<b>Point (${x.toFixed(3)}, ${y.toFixed(3)})</b> is outside the square of area 2 that the coastline fills, so it is sea at every stage.`;
    f63.draw();
  }
  function drawFlip(land, share) {
    const W = 400, x0 = 34, cw = (W - x0 - 8) / 12;
    let s = `<text x="4" y="40">point</text>`;
    land.forEach((l, i) => {
      const x = x0 + i * cw;
      s += `<rect x="${(x + 2).toFixed(1)}" y="22" width="${(cw - 4).toFixed(1)}" height="${(cw - 4).toFixed(1)}" fill="${l ? '#151515' : '#ecebe6'}" stroke="#8a8a84" stroke-width="1"/><text x="${(x + cw / 2).toFixed(1)}" y="${(22 + cw + 8).toFixed(1)}" text-anchor="middle">${i + 1}</text>`;
    });
    const by0 = 88, bh = 84, bw = cw;
    s += `<text x="4" y="${by0 + bh / 2 + 3}">land</text>`;
    s += `<line x1="${x0}" x2="${x0 + 8 * cw}" y1="${by0 + bh / 2}" y2="${by0 + bh / 2}" stroke="#2f5f9e" stroke-dasharray="4 3"/><text x="${x0 + 8 * cw + 6}" y="${by0 + bh / 2 + 3}" style="fill:#2f5f9e">½</text>`;
    s += `<line x1="${x0}" x2="${x0 + 8 * cw}" y1="${by0 + bh}" y2="${by0 + bh}" stroke="#8a8a84"/>`;
    share.forEach((v, i) => {
      const x = x0 + i * bw, h = v * bh;
      s += `<rect x="${(x + 3).toFixed(1)}" y="${(by0 + bh - h).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${h.toFixed(1)}" fill="#151515"/><text x="${(x + bw / 2).toFixed(1)}" y="${by0 + bh + 13}" text-anchor="middle">${i + 1}</text>`;
    });
    $('flip').innerHTML = s;
  }
  $('c63').addEventListener('click', (e) => {
    if (!view63) return;
    const r = $('c63').getBoundingClientRect();
    pick63((e.clientX - r.left - view63.ox) / view63.s, (view63.oy - (e.clientY - r.top)) / view63.s);
  });
  $('c63').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); pick63(0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6);
  });

  // ====================== Plate 63: the sweep ======================
  const ROUND = 0.25;
  const TRACE_IDLE = 'With sharp corners the curve touches itself at the points it visits twice. Rounded, it neither crosses nor touches itself.';
  const stS = { n: 3, round: true, trace: -1, raf: 0 };
  const sidePaths = {};
  function sidePath(n, round, upto) {
    const key = `${n}|${round}`;
    if (upto === undefined && sidePaths[key]) return sidePaths[key];
    const P = peanoSide(n), m = upto === undefined ? P.length / 2 : upto + 1, p = new Path2D();
    p.moveTo(P[0], P[1]);
    for (let i = 1; i < m; i++) {
      const x = P[2 * i], y = P[2 * i + 1];
      if (!round || i === m - 1) { p.lineTo(x, y); continue; }
      const d1x = x - P[2 * i - 2], d1y = y - P[2 * i - 1], d2x = P[2 * i + 2] - x, d2y = P[2 * i + 3] - y;
      if (Math.abs(d1x * d2y - d1y * d2x) < 1e-15) { p.lineTo(x, y); continue; }
      p.lineTo(x - d1x * ROUND, y - d1y * ROUND); p.quadraticCurveTo(x, y, x + d2x * ROUND, y + d2y * ROUND);
    }
    if (upto !== undefined) return p;
    return (sidePaths[key] = p);
  }
  const SIDE_DIAMOND = [0, 0, 0.5, -0.5, 1, 0, 0.5, 0.5];
  const zS = zoomable('wS', 'cS', (f) => fitBox(f, { x0: 0, x1: 1, y0: -0.5, y1: 0.5 }, 0.04), (f, v) => {
    const c = f.ctx, n = stS.n, step = Math.pow(3, -n);
    paper(f, PRINT.paper); toWorld(f, v);
    c.setLineDash([5 / v.s, 4 / v.s]); c.lineWidth = 1 / v.s; c.strokeStyle = PRINT.faint; c.stroke(polyPath(SIDE_DIAMOND)); c.setLineDash([]);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const lw = Math.max(0.8 / v.s, Math.min(step * 0.22, 2.2 / v.s));
    c.lineWidth = lw; c.strokeStyle = stS.trace >= 0 ? PRINT.faint : PRINT.ink; c.stroke(sidePath(n, stS.round));
    if (stS.trace >= 0) {
      const P = peanoSide(n), k = Math.min(stS.trace, P.length / 2 - 1);
      c.strokeStyle = PRINT.accent; c.lineWidth = lw * 1.4; c.stroke(sidePath(n, stS.round, k));
      toScreen(f);
      c.fillStyle = PRINT.red; c.strokeStyle = PRINT.paper; c.lineWidth = 2;
      c.beginPath(); c.arc(v.ox + P[2 * k] * v.s, v.oy - P[2 * k + 1] * v.s, 5, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  });
  function setS() {
    const n = stS.n, N = Math.pow(9, n);
    markS(n);
    $('sSv').textContent = `stage ${n}`; $('cSs').textContent = n; $('cSn').textContent = `${fmt(N)} steps of 1/${fmt(Math.pow(3, n))}`;
    zS.schedule();
  }
  function stopTrace() { cancelAnimationFrame(stS.raf); stS.raf = 0; stS.trace = -1; $('traceS').textContent = 'Trace the curve'; }
  const markS = stepButtons($('sS'), [1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { stopTrace(); stS.n = n; setS(); $('traceInfo').textContent = TRACE_IDLE; });
  $('roundS').addEventListener('change', (e) => { stS.round = e.target.checked; zS.schedule(); });
  $('traceS').addEventListener('click', () => {
    if (stS.raf) { stopTrace(); $('traceInfo').textContent = TRACE_IDLE; zS.schedule(); return; }
    const N = Math.pow(9, stS.n), t0 = performance.now(), dur = reduceMotion ? 1 : 9000;
    $('traceS').textContent = 'Stop';
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      stS.trace = Math.round(p * N);
      const third = Math.min(9, Math.floor(stS.trace / (N / 9)) + 1);
      $('traceInfo').innerHTML = p < 1
        ? `<b>Ninth ${third} of 9</b> · step ${fmt(stS.trace)} of ${fmt(N)}. Each ninth of the curve fills one ninth of the square before moving on.`
        : `<b>Done:</b> ${fmt(N)} steps fill the whole square, area ½, without crossing.`;
      zS.schedule();
      if (p < 1) stS.raf = requestAnimationFrame(tick); else { stS.raf = 0; $('traceS').textContent = 'Trace the curve'; }
    };
    stS.raf = requestAnimationFrame(tick);
  });

  // ====================== Plates 64–65 ======================
  const RULES = {
    polya: { name: 'Pólya', title: 'Pólya sweep', note: 'Initiator [0, 1]. The generator alternates between the right and the left of the teragon, and the first position alternates too. The teragons are pieces of square graph paper inside a right isosceles triangle whose side is [0, 1].' },
    cesaro: { name: 'Cesàro', title: 'Cesàro sweep', note: 'Initiator [1, 0]. Odd stages put the generator to the right, even stages to the left, so the teragons are grids parallel first to the diagonals, then to the sides. The curve fills the right isosceles triangle whose hypotenuse is [0, 1], and every interval of its grids is drawn twice. The caption says its drawings of stages 2 and 3 use θ = 85°; at 85° their lines would cross, and they match 95° instead. That is 180° − 85°, so the caption’s 85° seems to be the angle measured the other way, as the turn at the corner. Plate 65 matches 95° too.' },
    p64: { name: 'Plate 64: unequal legs', title: 'Plate 64: Pólya sweep, unequal legs', note: "Pólya's rule with two unequal legs. At a right angle the curve sweeps a right triangle that is not isosceles: each step cuts a triangle in two along its altitude. Measured from the plate, Plate 64 is this curve with a 30° angle at the start, so the triangle is a 30-60-90 one, drawn at stage 7. Each interval is printed as a thin chevron pointing toward the corner the next stage would add, which is how the plate avoids self-contact (the processing Mandelbrot leaves 'to the reader as an exercise'). As θ opens past 90°, both angles at the base shrink in proportion, so the legs keep the same split." },
    square: { name: 'Square: two Cesàro sweeps', title: 'Square sweep: two Cesàro curves', note: 'The Cesàro sweeps initiated by [0, 1] and by [1, 0], run one after the other, together sweep a square whose diagonal is [0, 1]. Turned 45° here, as in Plate 65.' },
    p65: { name: 'Plate 65 as printed', title: 'Plate 65 as printed', note: "Plate 65 itself. The caption builds it from the Cesàro sweeps of [0, 1] and [1, 0] with θ = 85° 'for the sake of clarity'. Measured against the plate, the first stage is a right angle, so the four intervals are exactly the sides of the square, and every later stage uses θ = 95° (180° − 85°). The plate is stage 14 drawn as an island: the closed curve is filled, and its line is drawn with a pen about half an interval wide. Because the angle is opened, the two halves of every triangle no longer touch. The gaps enclosed by the curve fill in as the dark X along the diagonals; the gaps open to the outside stay white, as the crosses. Even stages give this pattern." },
  };
  const stT = { rule: 'polya', th: 90, ph: 30, n: 10, fill: false, chev: false };
  const curveCache = {};
  const R45 = Math.SQRT1_2;
  function curveT() {
    const key = `${stT.rule}|${stT.th}|${stT.ph}|${stT.n}`;
    if (curveCache[key]) return curveCache[key];
    const th = stT.th, n = stT.n, h = 0.5 / Math.tan(th / 2 / DEG);
    let P, rs, region;
    const APX = [];
    if (stT.rule === 'polya') {
      P = twoCurve([0.5, h], [1, 3], n, 0, 0, 1, 0, APX); rs = [Math.hypot(0.5, h), Math.hypot(0.5, h)]; region = [0, 0, 1, 0, 1, 1];
    } else if (stT.rule === 'cesaro') {
      P = twoCurve([0.5, -h], [1, 1], n, 1, 0, 0, 0, APX); rs = [Math.hypot(0.5, h), Math.hypot(0.5, h)]; region = [1, 0, 0.5, 0.5, 0, 0];
    } else if (stT.rule === 'p64') {
      const A = apexOf(stT.ph, th);
      P = twoCurve(A, [1, 3], n, 0, 0, 1, 0, APX); rs = [Math.hypot(A[0], A[1]), Math.hypot(1 - A[0], A[1])];
      region = [0, 0, 1, 0, 1, Math.tan(stT.ph / DEG)];
    } else if (stT.rule === 'p65') {
      // the caption's construction with a right-angled first stage: [0, 1] and [1, 0] each become two sides of the
      // square whose diagonal is [0, 1]; every later stage is Cesàro's at θ (first copy mirrored, as Cesàro alternates)
      P = [];
      for (const [ax, ay, bx, by] of [[0, 0, 0.5, -0.5], [0.5, -0.5, 1, 0], [1, 0, 0.5, 0.5], [0.5, 0.5, 0, 0]]) {
        const c = twoCurve([0.5, h], [1, 1], Math.max(0, n - 1), ax, ay, bx, by, APX);
        P = P.length ? P.concat(c.slice(2)) : c;
      }
      rs = [Math.hypot(0.5, h), Math.hypot(0.5, h)]; region = [0, 0, 0.5, -0.5, 1, 0, 0.5, 0.5];
      const rot = (Q) => { for (let i = 0; i < Q.length; i += 2) { const x = Q[i], y = Q[i + 1]; Q[i] = R45 * (x - y); Q[i + 1] = R45 * (x + y); } return Q; };
      rot(P); rot(region); rot(APX);
    } else {
      const a = twoCurve([0.5, -h], [1, 1], n, 0, 0, 1, 0, APX), b = twoCurve([0.5, -h], [1, 1], n, 1, 0, 0, 0, APX);
      P = a.concat(b.slice(2)); rs = [Math.hypot(0.5, h), Math.hypot(0.5, h)]; region = [0, 0, 0.5, -0.5, 1, 0, 0.5, 0.5];
      const rot = (Q) => { for (let i = 0; i < Q.length; i += 2) { const x = Q[i], y = Q[i + 1]; Q[i] = R45 * (x - y); Q[i + 1] = R45 * (x + y); } return Q; };
      rot(P); rot(region); rot(APX);
    }
    const F = Float64Array.from(P);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < F.length; i += 2) { x0 = Math.min(x0, F[i]); x1 = Math.max(x1, F[i]); y0 = Math.min(y0, F[i + 1]); y1 = Math.max(y1, F[i + 1]); }
    // intervals drawn twice: count segments whose (unordered) end points repeat
    const seen = new Map(), q = (v) => Math.round(v * 1e7);
    let dup = 0;
    const m = F.length / 2 - 1;
    for (let i = 0; i < m; i++) {
      const a = `${q(F[2 * i])},${q(F[2 * i + 1])}`, b = `${q(F[2 * i + 2])},${q(F[2 * i + 3])}`, k = a < b ? a + '|' + b : b + '|' + a;
      if (seen.has(k)) dup++; else seen.set(k, 1);
    }
    return (curveCache[key] = { P: F, APX, path: polyPath(F, false), rs, D: dimension(rs), region, box: { x0, x1, y0, y1 }, segs: m, dup, chev: null });
  }
  const zT = zoomable('wT', 'cT', (f) => {
    const d = curveT(), b = { ...d.box };
    if (Math.abs(stT.th - 90) < 1e-9) for (let i = 0; i < d.region.length; i += 2) { b.x0 = Math.min(b.x0, d.region[i]); b.x1 = Math.max(b.x1, d.region[i]); b.y0 = Math.min(b.y0, d.region[i + 1]); b.y1 = Math.max(b.y1, d.region[i + 1]); }
    return fitBox(f, { x0: Math.min(b.x0, 0), x1: Math.max(b.x1, 0.2), y0: Math.min(b.y0, -0.05), y1: Math.max(b.y1, 0.05) }, 0.05);
  }, (f, v) => {
    const c = f.ctx, d = curveT();
    paper(f, PRINT.paper); toWorld(f, v);
    if (Math.abs(stT.th - 90) < 1e-9) { c.setLineDash([5 / v.s, 4 / v.s]); c.lineWidth = 1.2 / v.s; c.strokeStyle = '#9d9b93'; c.stroke(polyPath(d.region)); c.setLineDash([]); }
    const segPx = stT.rule === 'p65' ? v.s * R45 * Math.pow(d.rs[0], stT.n - 1) : v.s * Math.pow(Math.max(...d.rs), stT.n);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = PRINT.ink;
    if (stT.chev) {
      c.fillStyle = PRINT.ink; for (const p of chevrons(d)) c.fill(p);
    } else {
      if (stT.fill) { const fp = new Path2D(d.path); fp.closePath(); c.fillStyle = PRINT.ink; c.fill(fp, 'nonzero'); }
      // Plate 65 is printed with a pen about half an interval wide
      c.lineWidth = (stT.fill && stT.rule === 'p65' ? Math.max(0.6, segPx * 0.6) : Math.max(0.6, Math.min(2.2, segPx * 0.18))) / v.s;
      c.stroke(d.path);
    }
    toScreen(f);
    const dot = (x, y) => { c.beginPath(); c.arc(v.ox + x * v.s, v.oy - y * v.s, 4, 0, Math.PI * 2); c.fill(); c.stroke(); };
    c.fillStyle = PRINT.red; c.strokeStyle = PRINT.paper; c.lineWidth = 1.5;
    dot(d.P[0], d.P[1]); dot(d.P[d.P.length - 2], d.P[d.P.length - 1]);
  });
  // Plate 64's drawing, measured from the plate: each interval a→b of the last stage becomes a thin chevron a, C, b, D
  // whose corners point toward F, the corner the next stage would add: C = M + 0.43·(F − M), D = M + 0.235·(F − M),
  // with M the midpoint of a b. Chevrons meet only at their tips, so the drawing avoids self-contact.
  const CHEV_OUT = 0.43, CHEV_IN = 0.235;
  function chevrons(d) {
    if (d.chev) return d.chev;
    // many small paths fill far faster than one path with a hundred thousand pieces
    const P = d.P, F = d.APX, out = [];
    let p = null;
    for (let i = 0; i < F.length / 2; i++) {
      if (i % 512 === 0) { p = new Path2D(); out.push(p); }
      const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3], mx = (ax + bx) / 2, my = (ay + by) / 2;
      const vx = F[2 * i] - mx, vy = F[2 * i + 1] - my;
      p.moveTo(ax, ay); p.lineTo(mx + CHEV_OUT * vx, my + CHEV_OUT * vy); p.lineTo(bx, by); p.lineTo(mx + CHEV_IN * vx, my + CHEV_IN * vy); p.closePath();
    }
    return (d.chev = out);
  }
  function setT(refit) {
    const R = RULES[stT.rule], d = curveT(), right = Math.abs(stT.th - 90) < 1e-9;
    markR(stT.rule); markST(stT.n);
    $('ruleNote').textContent = R.note;
    $('phTwrap').hidden = stT.rule !== 'p64';
    const phNow = baseAngles(stT.ph, stT.th)[0];
    $('thTv').textContent = `${stT.th.toFixed(1)}°`;
    $('phTv').textContent = right ? `${stT.ph.toFixed(1)}°` : `${stT.ph.toFixed(1)}° (now ${phNow.toFixed(1)}°)`;
    $('sTv').textContent = `stage ${stT.n}`; $('cTs').textContent = stT.n; $('cTt').textContent = R.title;
    $('cTn').textContent = `${fmt(d.segs)} intervals`;
    $('rTa').textContent = fmt(d.segs);
    $('rTb').textContent = d.D > 1.9999 ? '2' : d.D.toFixed(4);
    const areas = { polya: '½', cesaro: '¼', square: '½ (two curves)', p65: '½ (two curves)', p64: `${(Math.tan(stT.ph / DEG) / 2).toFixed(4)}` };
    $('rTc').innerHTML = right ? areas[stT.rule] : '0 <small>(D &lt; 2: the curve is thin)</small>';
    $('rTd').textContent = d.dup ? `${fmt(d.dup)} of ${fmt(d.segs)} (${((100 * d.dup) / d.segs).toFixed(0)}%)` : 'none';
    const r = d.rs[0] === d.rs[1] ? `r = ${d.rs[0].toFixed(4)}` : `r = ${d.rs[0].toFixed(3)} and ${d.rs[1].toFixed(3)}`;
    $('p64dim').textContent = `${stT.rule === 'p64' ? 'Two unequal intervals' : 'Two equal intervals'} at θ = ${stT.th.toFixed(1)}° · N = 2, ${r} · D ${d.D > 1.9999 ? '= 2' : '≈ ' + d.D.toFixed(4)}`;
    if (refit) zT.refit(); else zT.schedule();
  }
  const markR = stepButtons($('rT'), ['polya', 'cesaro', 'p64', 'square', 'p65'], (k) => RULES[k].name, (k) => `Rule: ${RULES[k].name}`, (k) => {
    if (k === 'p65' && stT.rule !== 'p65') {        // as printed: 95°, stage 14, filled
      Object.assign(stT, { th: 95, n: 14, fill: true, chev: false });
      $('thT').value = '950'; $('fillT').checked = true; $('chevT').checked = false; $('fillT').disabled = false;
    }
    stT.rule = k; setT(true);
  });
  const markST = stepButtons($('sT'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16], String, (n) => `Stage ${n}`, (n) => { stT.n = n; setT(false); });
  let rafT = 0;
  $('thT').addEventListener('input', (e) => { stT.th = +e.target.value / 10; if (!rafT) rafT = requestAnimationFrame(() => { rafT = 0; setT(true); }); });
  $('fillT').addEventListener('change', (e) => { stT.fill = e.target.checked; zT.schedule(); });
  $('chevT').addEventListener('change', (e) => { stT.chev = e.target.checked; $('fillT').disabled = stT.chev; zT.schedule(); });
  $('plate64').addEventListener('click', () => {
    Object.assign(stT, { rule: 'p64', ph: 30, th: 90, n: 7, chev: true });
    $('phT').value = '300'; $('thT').value = '900'; $('chevT').checked = true; $('fillT').disabled = true;
    setT(true);
  });
  $('phT').addEventListener('input', (e) => { stT.ph = +e.target.value / 10; if (!rafT) rafT = requestAnimationFrame(() => { rafT = 0; setT(true); }); });
  for (const [th, label] of [[90, '90°: D = 2'], [95, "95°: like the book's drawings"], [120, '120°: Koch (with Cesàro)'], [180, '180°: a straight line']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', () => { stT.th = th; $('thT').value = String(Math.round(th * 10)); setT(true); });
    $('preT').append(b);
  }

  // ====================== Plate 65: Kakutani–Gomory ======================
  // Points are [x, y, t], t the minute (0 to 4) at which the four Cesàro curves first reach them.
  const stK = { pts: [], shuffle: [], u: -1, raf: 0 };
  // The curve for the trace, at stage 10 on each side. Segment i of side k is the curve's minute k + i/1024 to
  // k + (i + 1)/1024; in the limit it sweeps the triangle on its segment with right angle at F, the next corner.
  const TR_ST = 10, TR_N = 1 << TR_ST;
  const TR = (() => {
    const seg = new Float64Array(4 * TR_N * 4), apx = new Float64Array(4 * TR_N * 2);
    SQ.forEach((a, k) => {
      const b = SQ[(k + 1) % 4], F = [], P = twoCurve([0.5, 0.5], [1, 1], TR_ST, a[0], a[1], b[0], b[1], F);
      for (let i = 0; i < TR_N; i++) {
        const j = k * TR_N + i;
        seg.set([P[2 * i], P[2 * i + 1], P[2 * i + 2], P[2 * i + 3]], 4 * j); apx.set([F[2 * i], F[2 * i + 1]], 2 * j);
      }
    });
    // cached paths for each block of 64 segments, so a frame only builds the block in progress
    const B = 64, swept = [], line = [];
    for (let j0 = 0; j0 < 4 * TR_N; j0 += B) {
      const sp = new Path2D(), lp = new Path2D();
      lp.moveTo(seg[4 * j0], seg[4 * j0 + 1]);
      for (let j = j0; j < j0 + B; j++) {
        sp.moveTo(seg[4 * j], seg[4 * j + 1]); sp.lineTo(apx[2 * j], apx[2 * j + 1]); sp.lineTo(seg[4 * j + 2], seg[4 * j + 3]); sp.closePath();
        lp.lineTo(seg[4 * j + 2], seg[4 * j + 3]);
      }
      swept.push(sp); line.push(lp);
    }
    return { seg, apx, n: 4 * TR_N, B, swept, line };
  })();
  const KIDLE = 'Press "Trace the curve" to watch it sweep the square. Each point joins the blue path when the curve first reaches it.';
  let viewK = null;
  const fK = figure($('cK'), () => {
    const f = fK, c = f.ctx, v = (viewK = fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0.06)), u = stK.u, tracing = u >= 0;
    paper(f, PRINT.paper); toWorld(f, v);
    const TRI_FILL = ['#e3e1d9', '#dcdad1', '#e3e1d9', '#dcdad1'];
    SQ.forEach((a, k) => { const b = SQ[(k + 1) % 4]; c.fillStyle = TRI_FILL[k]; c.fill(polyPath([a[0], a[1], b[0], b[1], 0.5, 0.5])); });
    let mower = null;
    if (tracing) {
      // the area swept so far, then the curve itself up to the mower
      const done = Math.min(TR.n, Math.floor(u * TR_N)), S = TR.seg, A = TR.apx, full = Math.floor(done / TR.B);
      const swept = new Path2D(), line = new Path2D();
      const j0 = full * TR.B;
      if (j0 < TR.n) line.moveTo(S[4 * j0], S[4 * j0 + 1]);
      for (let j = j0; j < done; j++) {
        swept.moveTo(S[4 * j], S[4 * j + 1]); swept.lineTo(A[2 * j], A[2 * j + 1]); swept.lineTo(S[4 * j + 2], S[4 * j + 3]); swept.closePath();
        line.lineTo(S[4 * j + 2], S[4 * j + 3]);
      }
      if (done < TR.n) {
        const fr = u * TR_N - done;
        mower = [S[4 * done] + (S[4 * done + 2] - S[4 * done]) * fr, S[4 * done + 1] + (S[4 * done + 3] - S[4 * done + 1]) * fr];
        line.lineTo(mower[0], mower[1]);
      }
      c.fillStyle = 'rgba(47, 95, 158, 0.2)';
      for (let k = 0; k < full; k++) c.fill(TR.swept[k]);
      c.fill(swept);
      c.lineWidth = 1 / v.s; c.strokeStyle = '#6f6d66'; c.lineJoin = 'round';
      for (let k = 0; k < full; k++) c.stroke(TR.line[k]);
      c.stroke(line);
    }
    c.lineWidth = 1.4 / v.s; c.strokeStyle = PRINT.ink; c.strokeRect(0, 0, 1, 1);
    const chain = chainK().filter((p) => !tracing || p[2] <= u);
    if (chain.length > 1) {
      const p = new Path2D(); p.moveTo(chain[0][0], chain[0][1]);
      for (let i = 1; i < chain.length; i++) p.lineTo(chain[i][0], chain[i][1]);
      c.lineWidth = 2 / v.s; c.strokeStyle = PRINT.accent; c.lineJoin = 'round'; c.stroke(p);
    }
    toScreen(f);
    const X = (x) => v.ox + x * v.s, Y = (y) => v.oy - y * v.s;
    for (const p of stK.pts) {
      const reached = !tracing || p[2] <= u;
      c.beginPath(); c.arc(X(p[0]), Y(p[1]), 4.5, 0, Math.PI * 2);
      if (reached) { c.fillStyle = PRINT.red; c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.fill(); c.stroke(); }
      else { c.fillStyle = PRINT.paper; c.strokeStyle = PRINT.red; c.lineWidth = 1.5; c.fill(); c.stroke(); }
    }
    if (mower) {
      c.fillStyle = PRINT.ink; c.strokeStyle = PRINT.paper; c.lineWidth = 2;
      c.beginPath(); c.arc(X(mower[0]), Y(mower[1]), 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  });
  function chainK() { return stK.pts.slice().sort((a, b) => a[2] - b[2]); }
  const sumSq = (ch) => { let s = 0; for (let i = 0; i + 1 < ch.length; i++) s += (ch[i][0] - ch[i + 1][0]) ** 2 + (ch[i][1] - ch[i + 1][1]) ** 2; return s; };
  function infoK() {
    if (stK.u < 0) return;
    const ch = chainK().filter((p) => p[2] <= stK.u);
    $('traceKInfo').innerHTML = `<b>Minute ${Math.min(4, stK.u).toFixed(2)} of 4</b> · ${fmt(ch.length)} of ${fmt(stK.pts.length)} points reached · score so far ${sumSq(ch).toFixed(3)}`;
  }
  function setK() {
    const M = stK.pts.length;
    $('rKa').textContent = fmt(M);
    if (!M) { $('rKb').textContent = '—'; $('rKc').textContent = '—'; } else { $('rKb').textContent = sumSq(chainK()).toFixed(3); $('rKc').textContent = sumSq(stK.shuffle).toFixed(3); }
    infoK(); fK.draw();
  }
  function addPoint(x, y) {
    const p = [x, y, cesaroTime([x, y])];
    stK.pts.push(p);
    stK.shuffle.splice(Math.floor(Math.random() * (stK.shuffle.length + 1)), 0, p);
  }
  function stopTraceK(finished) {
    cancelAnimationFrame(stK.raf); stK.raf = 0; stK.u = -1;
    $('traceK').textContent = 'Trace the curve';
    $('traceKInfo').innerHTML = finished
      ? `<b>Done.</b> In 4 minutes the curve swept the whole square, and the blue path joins the points in the order it reached them.`
      : KIDLE;
    fK.draw();
  }
  $('traceK').addEventListener('click', () => {
    if (stK.raf) { stopTraceK(false); return; }
    if (reduceMotion) { stopTraceK(true); return; }
    const t0 = performance.now(), DUR = 12000;
    $('traceK').textContent = 'Stop';
    const tick = (now) => {
      stK.u = Math.min(4, (4 * (now - t0)) / DUR);
      infoK(); fK.draw();
      if (stK.u < 4) stK.raf = requestAnimationFrame(tick); else stopTraceK(true);
    };
    stK.u = 0; stK.raf = requestAnimationFrame(tick);
  });
  $('addK').addEventListener('click', () => { for (let i = 0; i < 10; i++) addPoint(Math.random(), Math.random()); setK(); });
  $('clrK').addEventListener('click', () => { stK.pts = []; stK.shuffle = []; setK(); });
  $('cK').addEventListener('click', (e) => {
    if (!viewK) return;
    const r = $('cK').getBoundingClientRect(), x = (e.clientX - r.left - viewK.ox) / viewK.s, y = (viewK.oy - (e.clientY - r.top)) / viewK.s;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    addPoint(x, y); setK();
  });

  // ---------- boot ----------
  set63();
  pick63(0.6175, 0.5405);
  setS();
  setT(true);
  for (let i = 0; i < 10; i++) addPoint(Math.random(), Math.random());
  setK();
})();
