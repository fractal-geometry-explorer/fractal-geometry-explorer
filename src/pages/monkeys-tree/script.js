// Plate 31: the monkeys tree, computed from its 11-segment generator. Geometry and page
// behaviour; the band measurement and the measuring chart come from the sausage kit
// (pages/minkowski-sausage/sausage.js), and the canvas plumbing from shared/draw.js.
// CORE START (also shipped to the measuring workers)
const S3 = Math.sqrt(3);
const LONG = 1 / 3, SHORT = 1 / (3 * S3);
const STEPS = [[LONG, 60], [LONG, 60], [LONG, 0], [LONG, -60], [SHORT, 150], [SHORT, 150], [SHORT, 210], [SHORT, 270], [SHORT, 270], [LONG, 0], [LONG, 0]];
const GX = [0], GY = [0];
for (const [r, a] of STEPS) {
  const t = a * Math.PI / 180;
  GX.push(GX[GX.length - 1] + r * Math.cos(t));
  GY.push(GY[GY.length - 1] + r * Math.sin(t));
}
GX[11] = 1; GY[11] = 0;
const MANDEL = [1, 3, 0, 3, 3, 1, 2, 2, 0, 2, 0]; // decoded from the book's second-stage drawing
const ORIENT = ['as drawn', 'mirrored', 'reversed', 'reversed and mirrored'];
const BAND = 0.295;   // band depth measured from the plate, as a fraction of the base
const BETA = -0.5;    // vertex tangents lean slightly toward the longer neighbouring segment (best fit to the plate)
const GROWTH = 2 + 5 / (3 * S3);

function segMap(i, o) {
  let px = GX[i], py = GY[i], qx = GX[i + 1], qy = GY[i + 1];
  const rev = o >= 2, conj = o === 1 || o === 3;
  if (rev) { [px, py, qx, qy] = [qx, qy, px, py]; }
  return { px, py, dx: qx - px, dy: qy - py, conj, rev };
}
function applyMap(mp, xs, ys) {
  const m = xs.length - 1, ox = new Float64Array(m + 1), oy = new Float64Array(m + 1);
  for (let j = 0; j <= m; j++) {
    const idx = mp.rev ? m - j : j;
    const zx = xs[idx], zy = mp.conj ? -ys[idx] : ys[idx];
    ox[j] = mp.px + mp.dx * zx - mp.dy * zy;
    oy[j] = mp.py + mp.dx * zy + mp.dy * zx;
  }
  return { xs: ox, ys: oy };
}
function buildLevel(n, opts) {
  let xs = new Float64Array([0, 1]), ys = new Float64Array([0, 0]);
  const maps = opts.map((o, i) => segMap(i, o));
  for (let k = 0; k < n; k++) {
    const m = xs.length - 1, N = 11 * m + 1;
    const nx = new Float64Array(N), ny = new Float64Array(N);
    let w = 0;
    for (let i = 0; i < 11; i++) {
      const mp = maps[i];
      for (let j = i === 0 ? 0 : 1; j <= m; j++) {
        const idx = mp.rev ? m - j : j;
        const zx = xs[idx], zy = mp.conj ? -ys[idx] : ys[idx];
        nx[w] = mp.px + mp.dx * zx - mp.dy * zy;
        ny[w] = mp.py + mp.dx * zy + mp.dy * zx;
        w++;
      }
    }
    xs = nx; ys = ny;
  }
  return { xs, ys };
}
// the raw polygon with its box, as the band measurer wants it (the band is measured on the true
// curve, never on the rounded display curve)
function monkeysGeom(opts) {
  const paths = {}, bbs = {};
  const ensure = (n) => {
    if (paths[n]) return;
    const c = buildLevel(n, opts), p = new Path2D();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < c.xs.length; i++) {
      const x = c.xs[i], y = c.ys[i];
      i ? p.lineTo(x, y) : p.moveTo(x, y);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    paths[n] = p; bbs[n] = { x0, x1, y0, y1 };
  };
  return { path: (n) => { ensure(n); return paths[n]; }, bbox: (n) => { ensure(n); return bbs[n]; } };
}
// ---- circular-arc rounding ----
// Each segment becomes a biarc: two circular arcs through its endpoints whose tangents match where they meet.
// At every vertex both neighbouring biarcs share one tangent, so the whole outline is G1 (no kinks) and made only of circles.
const wrapAngle = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
function vertexTangents(xs, ys) {
  const N = xs.length, ta = new Float64Array(N);
  ta[0] = Math.atan2(ys[1] - ys[0], xs[1] - xs[0]);
  ta[N - 1] = Math.atan2(ys[N - 1] - ys[N - 2], xs[N - 1] - xs[N - 2]);
  for (let k = 1; k < N - 1; k++) {
    const ux = xs[k] - xs[k - 1], uy = ys[k] - ys[k - 1], wx = xs[k + 1] - xs[k], wy = ys[k + 1] - ys[k];
    const lu = Math.hypot(ux, uy), lw = Math.hypot(wx, wy);
    const fu = Math.pow(lw, BETA) / lu, fw = Math.pow(lu, BETA) / lw;
    ta[k] = Math.atan2(uy * fu + wy * fw, ux * fu + wx * fw);
  }
  return ta;
}
// Packed arcs: [sx, sy, ex, ey, cx, cy, R, a0, sweep] per arc; sweep 0 means a straight piece.
const AW = 9;
function arcSpline(xs, ys, round) {
  const S = xs.length - 1, A = new Float64Array(S * 2 * AW);
  const ta = round > 0 && xs.length > 2 ? vertexTangents(xs, ys) : null;
  let w = 0;
  const push = (sx, sy, tx, ty, ex, ey) => {
    const chx = ex - sx, chy = ey - sy;
    const cr = tx * chy - ty * chx, dt = tx * chx + ty * chy;
    let sw = 2 * Math.atan2(cr, dt), cx = 0, cy = 0, R = 0, a0 = 0;
    if (Math.abs(sw) < 1e-7 || Math.abs(sw) > 1.95 * Math.PI) sw = 0;
    else {
      const rs = (chx * chx + chy * chy) / (2 * cr);
      cx = sx - ty * rs; cy = sy + tx * rs; R = Math.abs(rs); a0 = Math.atan2(sy - cy, sx - cx);
    }
    A[w++] = sx; A[w++] = sy; A[w++] = ex; A[w++] = ey; A[w++] = cx; A[w++] = cy; A[w++] = R; A[w++] = a0; A[w++] = sw;
  };
  for (let i = 0; i < S; i++) {
    const p1x = xs[i], p1y = ys[i], p2x = xs[i + 1], p2y = ys[i + 1];
    const vx = p2x - p1x, vy = p2y - p1y, ca = Math.atan2(vy, vx);
    let a1 = ca, a2 = ca;
    if (ta) { a1 = ca + round * wrapAngle(ta[i] - ca); a2 = ca + round * wrapAngle(ta[i + 1] - ca); }
    const t1x = Math.cos(a1), t1y = Math.sin(a1), t2x = Math.cos(a2), t2y = Math.sin(a2);
    const vv = vx * vx + vy * vy, den = 2 * (1 - (t1x * t2x + t1y * t2y));
    let d;
    if (Math.abs(den) < 1e-12) {
      const vt2 = vx * t2x + vy * t2y;
      d = Math.abs(vt2) > 1e-12 ? vv / (4 * vt2) : Math.sqrt(vv) / 2;
    } else {
      const vt = vx * (t1x + t2x) + vy * (t1y + t2y);
      d = (-vt + Math.sqrt(vt * vt + den * vv)) / den;
    }
    const mx = (p1x + p2x) / 2, my = (p1y + p2y) / 2;
    if (!(d > 0) || !isFinite(d)) {
      const cx_ = Math.cos(ca), cy_ = Math.sin(ca);
      push(p1x, p1y, cx_, cy_, mx, my); push(mx, my, cx_, cy_, p2x, p2y);
      continue;
    }
    const m1x = p1x + d * t1x, m1y = p1y + d * t1y, m2x = p2x - d * t2x, m2y = p2y - d * t2y;
    const jx = (m1x + m2x) / 2, jy = (m1y + m2y) / 2;
    let tmx = m2x - m1x, tmy = m2y - m1y;
    const tl = Math.hypot(tmx, tmy);
    if (tl < 1e-15) { tmx = t1x; tmy = t1y; } else { tmx /= tl; tmy /= tl; }
    push(p1x, p1y, t1x, t1y, jx, jy);
    push(jx, jy, tmx, tmy, p2x, p2y);
  }
  return A;
}
// points along the arcs, k per arc (vertex v of the polygon lands at index 2·k·v)
function sampleArcs(A, k) {
  const n = A.length / AW, xs = new Float64Array(n * k + 1), ys = new Float64Array(n * k + 1);
  xs[0] = A[0]; ys[0] = A[1];
  let w = 1;
  for (let o = 0; o < A.length; o += AW) {
    const sw = A[o + 8];
    for (let j = 1; j <= k; j++) {
      const f = j / k;
      if (sw === 0) { xs[w] = A[o] + (A[o + 2] - A[o]) * f; ys[w] = A[o + 1] + (A[o + 3] - A[o + 1]) * f; }
      else { const a = A[o + 7] + sw * f; xs[w] = A[o + 4] + A[o + 6] * Math.cos(a); ys[w] = A[o + 5] + A[o + 6] * Math.sin(a); }
      w++;
    }
  }
  return { xs, ys };
}
// true if no two segments cross, overlap or touch (other than consecutive segments sharing their joint)
function selfAvoiding(xs, ys) {
  const n = xs.length - 1, E = 1e-12, T = 1e-10;
  const minx = new Float64Array(n), maxx = new Float64Array(n), miny = new Float64Array(n), maxy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    minx[i] = Math.min(xs[i], xs[i + 1]) - T; maxx[i] = Math.max(xs[i], xs[i + 1]) + T;
    miny[i] = Math.min(ys[i], ys[i + 1]) - T; maxy[i] = Math.max(ys[i], ys[i + 1]) + T;
  }
  const orient = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const onSeg = (i, px, py) => px >= minx[i] && px <= maxx[i] && py >= miny[i] && py <= maxy[i];
  for (let i = 0; i < n; i++) {
    const ax = xs[i], ay = ys[i], bx = xs[i + 1], by = ys[i + 1];
    for (let j = i + 1; j < n; j++) {
      if (maxx[i] < minx[j] || maxx[j] < minx[i] || maxy[i] < miny[j] || maxy[j] < miny[i]) continue;
      const cx = xs[j], cy = ys[j], dx = xs[j + 1], dy = ys[j + 1];
      if (j === i + 1) {
        const cr = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
        const dt = (bx - ax) * (dx - cx) + (by - ay) * (dy - cy);
        if (Math.abs(cr) < E && dt < 0) return false;
        continue;
      }
      const d1 = orient(cx, cy, dx, dy, ax, ay), d2 = orient(cx, cy, dx, dy, bx, by);
      const d3 = orient(ax, ay, bx, by, cx, cy), d4 = orient(ax, ay, bx, by, dx, dy);
      if (((d1 > E && d2 < -E) || (d1 < -E && d2 > E)) && ((d3 > E && d4 < -E) || (d3 < -E && d4 > E))) return false;
      if (Math.abs(d1) <= E && onSeg(j, ax, ay)) return false;
      if (Math.abs(d2) <= E && onSeg(j, bx, by)) return false;
      if (Math.abs(d3) <= E && onSeg(i, cx, cy)) return false;
      if (Math.abs(d4) <= E && onSeg(i, dx, dy)) return false;
    }
  }
  return true;
}
function solveD() {
  let lo = 1, hi = 2;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    const f = 6 * Math.pow(LONG, mid) + 5 * Math.pow(SHORT, mid) - 1;
    if (f > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
// CORE END

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARC_SAMPLES = [1, 12, 8, 4, 2, 1]; // points per arc for tracing and highlighting; drawing uses true arcs
  const MAXN = 5;
  const SOFT = 'rgba(47, 95, 158, 0.16)';  // PRINT.accent at the band's wash strength

  const state = { n: 3, opts: MANDEL.slice(), mode: 'fill', round: 1, gap: 0.15, constr: false, eps: 0.02, hover: -1, trace: null };
  let cache = {};      // raw curves by level for the current arrangement
  let rawPaths = {};   // the exact polygon, used for the sausage
  let disp = null;     // smoothed display curve + paths

  function curve(n) {
    if (!cache[n]) cache[n] = buildLevel(n, state.opts);
    return cache[n];
  }
  function boundsOf(c) {
    let x0 = 0, x1 = 1, y0 = -BAND, y1 = 0;
    for (let i = 0; i < c.xs.length; i++) {
      const x = c.xs[i], y = c.ys[i];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const p = 0.04;
    return { x0: x0 - p, x1: x1 + p, y0: y0 - p, y1: y1 + p };
  }
  function pathFrom(xs, ys, close) {
    const p = new Path2D();
    p.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) p.lineTo(xs[i], ys[i]);
    if (close) {
      const last = xs.length - 1;
      p.lineTo(xs[last], -BAND); p.lineTo(xs[0], -BAND); p.closePath();
    }
    return p;
  }
  function arcPath(A, close) {
    const p = new Path2D();
    p.moveTo(A[0], A[1]);
    for (let o = 0; o < A.length; o += AW) {
      const sw = A[o + 8];
      if (sw === 0) p.lineTo(A[o + 2], A[o + 3]);
      else p.arc(A[o + 4], A[o + 5], A[o + 6], A[o + 7], A[o + 7] + sw, sw < 0);
    }
    if (close) {
      const ex = A[A.length - AW + 2];
      p.lineTo(ex, -BAND); p.lineTo(A[0], -BAND); p.closePath();
    }
    return p;
  }
  function rawPath(n) {
    if (!rawPaths[n]) { const c = curve(n); rawPaths[n] = pathFrom(c.xs, c.ys, false); }
    return rawPaths[n];
  }
  function rebuildDisplay() {
    const c = curve(state.n);
    const A = arcSpline(c.xs, c.ys, state.round);
    const k = ARC_SAMPLES[state.n];
    const s = sampleArcs(A, k);
    disp = { xs: s.xs, ys: s.ys, m: 2 * k, line: arcPath(A, false), fill: arcPath(A, true), raw: rawPath(state.n), bounds: boundsOf(c) };
    scene.key = '';
  }

  // ---------- the figure: a cached scene, with construction lines, hover and trace on top ----------
  const scene = { key: '', canvas: document.createElement('canvas') };
  let patCache = null;
  function stipple(f, v) {        // screen-space dot stipple, echoing the screen tone of the book's sausage
    if (!window.DOMMatrix) return null;
    const key = String(f.dpr);
    if (!patCache || patCache.key !== key) {
      const c = document.createElement('canvas'), n = Math.max(3, Math.round(3.5 * f.dpr));
      c.width = c.height = n;
      const g = c.getContext('2d');
      g.fillStyle = PRINT.accent; g.globalAlpha = 0.6;
      g.beginPath(); g.arc(n / 2, n / 2, 0.7 * f.dpr, 0, Math.PI * 2); g.fill();
      patCache = { key, canvas: c };
    }
    const p = scene.canvas.getContext('2d').createPattern(patCache.canvas, 'repeat');
    if (!p || !p.setTransform) return null;
    const a = f.dpr * v.s, e = f.dpr * v.ox, fy = f.dpr * v.oy;
    p.setTransform(new DOMMatrix([1 / a, 0, 0, -1 / a, -e / a, fy / a]));
    return p;
  }
  function drawScene(f, v) {
    scene.canvas.width = f.canvas.width; scene.canvas.height = f.canvas.height;
    const c = scene.canvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = PRINT.paper; c.fillRect(0, 0, scene.canvas.width, scene.canvas.height);
    c.setTransform(f.dpr * v.s, 0, 0, -f.dpr * v.s, f.dpr * v.ox, f.dpr * v.oy);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (state.mode === 'fill') {
      c.fillStyle = PRINT.ink; c.fill(disp.fill, 'nonzero');
      if (state.gap > 0) {
        c.strokeStyle = PRINT.paper;
        c.lineWidth = state.gap * 0.4 * Math.pow(3, -Math.max(state.n, 3));
        c.stroke(disp.line);
      }
    } else if (state.mode === 'sausage') {
      // a round-capped, round-joined stroke of width 2ε is exactly the union of discs of radius ε along the curve
      c.lineWidth = 2 * state.eps;
      c.strokeStyle = SOFT; c.stroke(disp.raw);
      const pat = stipple(f, v);
      if (pat) { c.strokeStyle = pat; c.stroke(disp.raw); }
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.2 / v.s; c.stroke(disp.raw);
    } else {
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.4 / v.s; c.stroke(disp.line);
    }
  }
  function strokeRange(c, xs, ys, a, b) {
    c.beginPath(); c.moveTo(xs[a], ys[a]);
    for (let i = a + 1; i <= b; i++) c.lineTo(xs[i], ys[i]);
    c.stroke();
  }
  function drawOverlay(f, v) {
    const c = f.ctx, s = v.s;
    toWorld(f, v);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (state.constr && state.n > 0) {
      const p = curve(state.n - 1);
      c.strokeStyle = PRINT.accent; c.lineWidth = 1.5 / s; c.setLineDash([6 / s, 4 / s]);
      strokeRange(c, p.xs, p.ys, 0, p.xs.length - 1);
      c.setLineDash([]);
      if (p.xs.length <= 122) {
        c.fillStyle = PRINT.accent;
        for (let i = 0; i < p.xs.length; i++) { c.beginPath(); c.arc(p.xs[i], p.ys[i], 3 / s, 0, Math.PI * 2); c.fill(); }
      }
    }
    if (state.hover >= 0 && state.n > 0) {
      const per = Math.pow(11, state.n - 1) * disp.m;
      const a = state.hover * per, b = a + per;
      c.strokeStyle = SOFT; c.lineWidth = 9 / s; strokeRange(c, disp.xs, disp.ys, a, b);
      c.strokeStyle = PRINT.accent; c.lineWidth = 2.5 / s; strokeRange(c, disp.xs, disp.ys, a, b);
    }
    if (state.trace) {
      const last = disp.xs.length - 1;
      const k = Math.max(1, Math.floor(state.trace.p * last));
      c.strokeStyle = PRINT.accent; c.lineWidth = 2.25 / s; strokeRange(c, disp.xs, disp.ys, 0, k);
      c.fillStyle = PRINT.accent; c.beginPath(); c.arc(disp.xs[k], disp.ys[k], 4.5 / s, 0, Math.PI * 2); c.fill();
    }
  }
  function render(f, v) {
    const key = [f.canvas.width, f.canvas.height, v.s, v.ox, v.oy, state.n, state.mode, state.round, state.gap, state.mode === 'sausage' ? state.eps : 0].join('|');
    if (scene.key !== key) { drawScene(f, v); scene.key = key; }
    f.ctx.setTransform(1, 0, 0, 1, 0, 0);
    f.ctx.drawImage(scene.canvas, 0, 0);
    drawOverlay(f, v);
  }
  const zoom = zoomable('wrap', 'cv', (f) => fitBox(f, disp.bounds, 0), render, { maxZoom: 600 });

  // ---------- depth thumbnails ----------
  const depthsEl = $('depths');
  const thumbs = [];
  for (let n = 0; n <= MAXN; n++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(n === state.n));
    b.setAttribute('aria-label', `Level ${n}, ${fmt(Math.pow(11, n))} segments`);
    const c = document.createElement('canvas');
    const lab = document.createElement('b'); lab.textContent = `n = ${n}`;
    const cnt = document.createElement('span'); cnt.textContent = fmt(Math.pow(11, n));
    b.append(c, lab, cnt);
    b.addEventListener('click', () => setDepth(n));
    depthsEl.append(b);
    thumbs.push({ b, c });
  }
  function drawThumbs() {
    for (let n = 0; n <= MAXN; n++) {
      const { c } = thumbs[n];
      const w = c.clientWidth || 48, h = c.clientHeight || 60;
      const r = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(w * r); c.height = Math.round(h * r);
      const g = c.getContext('2d');
      g.fillStyle = PRINT.paper; g.fillRect(0, 0, c.width, c.height);
      const cu = curve(n), bd = boundsOf(cu);
      const s = Math.min(c.width / (bd.x1 - bd.x0), c.height / (bd.y1 - bd.y0));
      const ox = c.width / 2 - (bd.x0 + bd.x1) / 2 * s, oy = c.height / 2 + (bd.y0 + bd.y1) / 2 * s;
      g.setTransform(s, 0, 0, -s, ox, oy);
      g.fillStyle = PRINT.ink; g.fill(pathFrom(cu.xs, cu.ys, true), 'nonzero');
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  // ---------- generator editor ----------
  const NS = 'http://www.w3.org/2000/svg';
  const gen = $('gen');
  const segEls = [];
  function ghostPts(i, o) {
    const g = applyMap(segMap(i, o), Float64Array.from(GX), Float64Array.from(GY));
    let d = '';
    for (let k = 0; k < g.xs.length; k++) d += (k ? 'L' : 'M') + g.xs[k].toFixed(4) + ' ' + (-g.ys[k]).toFixed(4);
    return { d, g };
  }
  (function buildGen() {
    let x0 = 0, x1 = 1, y0 = 0, y1 = 0;
    for (let i = 0; i < 11; i++) for (let o = 0; o < 4; o++) {
      const { g } = ghostPts(i, o);
      for (let k = 0; k < g.xs.length; k++) {
        x0 = Math.min(x0, g.xs[k]); x1 = Math.max(x1, g.xs[k]);
        y0 = Math.min(y0, -g.ys[k]); y1 = Math.max(y1, -g.ys[k]);
      }
    }
    const p = 0.05;
    gen.setAttribute('viewBox', `${(x0 - p).toFixed(3)} ${(y0 - p).toFixed(3)} ${(x1 - x0 + 2 * p).toFixed(3)} ${(y1 - y0 + 2 * p).toFixed(3)}`);
    for (let i = 0; i < 11; i++) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 's'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      const ghost = document.createElementNS(NS, 'path');
      ghost.setAttribute('class', 'ghost'); ghost.setAttribute('vector-effect', 'non-scaling-stroke');
      ghost.setAttribute('stroke-width', '1.3'); ghost.setAttribute('stroke-linejoin', 'round');
      const main = document.createElementNS(NS, 'line');
      main.setAttribute('class', 'main'); main.setAttribute('vector-effect', 'non-scaling-stroke');
      main.setAttribute('stroke-width', '2.6'); main.setAttribute('stroke-linecap', 'round');
      const hit = document.createElementNS(NS, 'line');
      hit.setAttribute('class', 'hit'); hit.setAttribute('vector-effect', 'non-scaling-stroke'); hit.setAttribute('stroke-width', '22');
      for (const el of [main, hit]) {
        el.setAttribute('x1', GX[i]); el.setAttribute('y1', -GY[i]); el.setAttribute('x2', GX[i + 1]); el.setAttribute('y2', -GY[i + 1]);
      }
      const title = document.createElementNS(NS, 'title');
      g.append(title, ghost, main, hit);
      gen.append(g);
      const cycle = () => { state.opts[i] = (state.opts[i] + 1) % 4; optsChanged(); describe(i); };
      g.addEventListener('click', cycle);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); } });
      g.addEventListener('pointerenter', () => setHover(i));
      g.addEventListener('pointerleave', () => setHover(-1));
      g.addEventListener('focus', () => setHover(i));
      g.addEventListener('blur', () => setHover(-1));
      segEls.push({ g, ghost, title });
    }
    for (let k = 0; k <= 11; k++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', GX[k]); c.setAttribute('cy', -GY[k]);
      c.setAttribute('r', k === 0 || k === 11 ? 0.022 : 0.012);
      c.setAttribute('class', k === 0 || k === 11 ? 'end' : 'vtx');
      c.style.pointerEvents = 'none';
      gen.append(c);
    }
  })();
  const isLong = (i) => STEPS[i][0] === LONG;
  function segText(i) {
    return `Segment ${i + 1} of 11, ${isLong(i) ? 'long (1/3)' : 'short (1/3√3)'}: copy ${ORIENT[state.opts[i]]}`;
  }
  function refreshGen() {
    for (let i = 0; i < 11; i++) {
      const { g, ghost, title } = segEls[i];
      ghost.setAttribute('d', ghostPts(i, state.opts[i]).d);
      title.textContent = segText(i) + '. Click to change.';
      g.setAttribute('aria-label', segText(i) + '. Press Enter to change.');
    }
  }
  const hint = $('hint');
  const defaultHint = hint.innerHTML;
  function describe(i) {
    if (i < 0) { hint.innerHTML = defaultHint; return; }
    hint.innerHTML = `<b>Segment ${i + 1} of 11</b> · ${isLong(i) ? 'long, 1/3' : 'short, 1/(3√3)'} · copy laid down <b>${ORIENT[state.opts[i]]}</b>. Click to cycle through the four ways.`;
  }
  function setHover(i) {
    state.hover = i;
    segEls.forEach((s, k) => s.g.classList.toggle('on', k === i));
    describe(i);
    zoom.schedule();
  }
  function checkStatus() {
    const el = $('status');
    const same = state.opts.every((o, i) => o === MANDEL[i]);
    let fail = 0;
    for (const n of [2, 3]) { if (!selfAvoiding(curve(n).xs, curve(n).ys)) { fail = n; break; } }
    el.classList.toggle('bad', !!fail);
    el.textContent = fail
      ? `This arrangement touches or crosses itself by level ${fail}, so the filled shape breaks apart.`
      : same
        ? `Mandelbrot's arrangement. The curve stays clear of itself at every level checked (2 and 3).`
        : `Self-avoiding through level 3. You found another arrangement that works.`;
  }

  // ---------- Minkowski sausage: measurement and chart ----------
  const ES = epsScale(0.004, 0.12), EPS_N = 12, FIT_MAX = 0.031, DTRUE = solveD();
  const EPS_GRID = ES.grid(EPS_N);
  const pool = measurePool({
    preamble: `const GX=${JSON.stringify(GX)},GY=${JSON.stringify(GY)};\n${segMap}\n${buildLevel}\n${monkeysGeom}`,
    geomExpr: 'monkeysGeom(cfg.opts)',
    localGeom: (cfg) => monkeysGeom(cfg.opts),
    size: 2,
  });
  const results = {};
  let chartRaf = 0;
  const chartSoon = () => { if (!chartRaf) chartRaf = requestAnimationFrame(() => { chartRaf = 0; chart.draw(); updateFit(); }); };
  const sQueue = () => queueChart(pool, results, EPS_GRID, [state.n, 5, 4, 3, 2, 1].filter((d, i, a) => d > 0 && a.indexOf(d) === i), chartSoon);
  let measureT = 0, readGen = 0;
  function measureNow() {
    clearTimeout(measureT);
    measureT = setTimeout(() => {
      pool.cancelTag('read');
      const gen = ++readGen, n = state.n, eps = state.eps;
      pool.enqueue({ tag: 'read', kind: 'area', n, eps, done: (v) => {
        if (gen !== readGen) return;
        $('sA').textContent = v.toFixed(4);
        $('sL').textContent = (v / (2 * eps)).toFixed(2);
      } }, true);
    }, 110);
  }
  function updateFit() {
    const D = state.n > 0 && results[state.n] ? fitSlopeD(EPS_GRID, results[state.n], FIT_MAX, 4) : NaN;
    $('sD').textContent = state.n === 0 ? '—' : isFinite(D) ? D.toFixed(2) : 'measuring…';
  }
  const chart = sausageChart({
    ids: { box: 'sBox', svg: 'sChart', tip: 'sTip', legend: 'sLegend', table: 'sTable', status: 'chartStatus' },
    grid: EPS_GRID,
    series: Array.from({ length: MAXN }, (_, i) => ({ key: i + 1, label: `Level ${i + 1}` })),
    results,
    getCurrent: () => state.n,
    getEps: () => state.eps,
    onPick: (e) => setEps(e, true),
    xTicks: [0.005, 0.01, 0.02, 0.05, 0.1],
    yFloor: [1.5, 100],
    serOpacity: (d) => 0.22 + 0.13 * d,
    extraLegend: [{ cls: 'ref', label: 'slope 1 − D' }],
    refs: (X, Y, f, rs) => {
      const deep = rs[MAXN], ia = EPS_GRID.findIndex((e) => e >= 0.025);
      if (!deep || !isFinite(deep[ia])) return '';
      const L = (e) => deep[ia] * Math.pow(e / EPS_GRID[ia], 1 - DTRUE);
      return `<path class="ref" d="M${f(X(ES.lo))} ${f(Y(L(ES.lo)))} L${f(X(0.07))} ${f(Y(L(0.07)))}"/>`;
    },
  });
  function setEps(e, fromChart) {
    state.eps = e;
    if (fromChart) $('eps').value = ES.toSlider(e);
    if (state.mode !== 'sausage') { state.mode = 'sausage'; markInk('sausage'); }
    updateText(); measureNow(); chart.draw(); zoom.schedule();
  }

  // ---------- state changes ----------
  const markInk = stepButtons($('mInk'), ['fill', 'line', 'sausage'],
    (m) => ({ fill: 'Filled', line: 'Outline', sausage: 'Sausage' }[m]),
    (m) => ({ fill: 'Fill the plate', line: 'Draw the outline only', sausage: 'Wrap the curve in its ε-band' }[m]),
    (m) => { state.mode = m; markInk(m); updateText(); zoom.schedule(); });
  function updateText() {
    const n = state.n;
    $('depthVal').textContent = `level ${n}`;
    $('capLevel').textContent = n;
    $('capSegs').textContent = fmt(Math.pow(11, n));
    $('stN').textContent = fmt(Math.pow(11, n));
    const L = Math.pow(GROWTH, n);
    $('stL').innerHTML = `${L < 100 ? L.toFixed(L < 10 ? 2 : 1) : fmt(Math.round(L))} <small>× base</small>`;
    $('stS').innerHTML = n === 0 ? `1 <small>(the base)</small>` : `1/${fmt(Math.round(Math.pow(3 * S3, n)))} <small>of base</small>`;
    const how = state.mode === 'fill' ? 'filled' : state.mode === 'line' ? 'drawn as an outline' : `wrapped in a band of radius ${state.eps.toFixed(3)}`;
    $('cv').setAttribute('aria-label', `Monkeys Tree fractal at level ${n}, ${fmt(Math.pow(11, n))} segments, ${how}`);
    $('epsVal').textContent = `${state.eps.toFixed(state.eps < 0.01 ? 4 : 3)} of base`;
    $('round').disabled = state.mode === 'sausage';
    thumbs.forEach((t, k) => t.b.setAttribute('aria-pressed', String(k === n)));
    $('roundVal').textContent = Math.round(state.round * 100) + '%';
    $('gapVal').textContent = Math.round(state.gap * 100) + '%';
    $('gap').disabled = state.mode !== 'fill';
  }
  function stopTrace() { if (state.trace) { cancelAnimationFrame(state.trace.raf); state.trace = null; } $('trace').textContent = 'Trace the curve'; }
  function setDepth(n) {
    if (n === state.n) return;
    stopTrace();
    state.n = n;
    rebuildDisplay();
    updateText(); zoom.schedule();
    sQueue(); measureNow(); chart.draw(); updateFit();
  }
  function optsChanged() {
    stopTrace();
    cache = {}; rawPaths = {};
    rebuildDisplay();
    refreshGen(); checkStatus(); drawThumbs(); updateText(); zoom.schedule();
    pool.configure({ opts: state.opts.slice() });
    for (const k in results) delete results[k];
    sQueue(); measureNow(); chart.draw(); updateFit();
  }

  $('eps').addEventListener('input', (e) => setEps(ES.fromSlider(+e.target.value), false));
  $('round').addEventListener('input', (e) => { state.round = e.target.value / 100; rebuildDisplay(); stopTrace(); updateText(); zoom.schedule(); });
  $('gap').addEventListener('input', (e) => { state.gap = e.target.value / 100; scene.key = ''; updateText(); zoom.schedule(); });
  $('constr').addEventListener('change', (e) => { state.constr = e.target.checked; zoom.schedule(); });
  $('mandel').addEventListener('click', () => { state.opts = MANDEL.slice(); optsChanged(); });
  $('shuffle').addEventListener('click', () => { state.opts = state.opts.map(() => Math.floor(Math.random() * 4)); optsChanged(); });
  $('restore').addEventListener('click', () => {
    state.mode = 'fill'; state.round = 1; state.gap = 0.15; state.constr = false; state.n = 3;
    $('round').value = 100; $('gap').value = 15; $('constr').checked = false;
    markInk('fill');
    state.opts = MANDEL.slice(); optsChanged(); zoom.refit();
  });
  $('trace').addEventListener('click', () => {
    if (state.trace && state.trace.p < 1) { stopTrace(); zoom.schedule(); return; }
    stopTrace();
    if (reduceMotion) { state.trace = { p: 1, raf: 0 }; $('trace').textContent = 'Trace again'; zoom.schedule(); return; }
    const dur = 4200 + 900 * state.n, t0 = performance.now();
    state.trace = { p: 0, raf: 0 };
    $('trace').textContent = 'Stop tracing';
    const step = (t) => {
      if (!state.trace) return;
      state.trace.p = Math.min(1, (t - t0) / dur);
      zoom.schedule();
      if (state.trace.p < 1) state.trace.raf = requestAnimationFrame(step);
      else $('trace').textContent = 'Trace again';
    };
    state.trace.raf = requestAnimationFrame(step);
  });

  // boot
  $('stD').textContent = solveD().toFixed(4);
  $('eqD').textContent = solveD().toFixed(5);
  pool.configure({ opts: state.opts.slice() });
  rebuildDisplay();
  markInk('fill');
  refreshGen(); checkStatus(); updateText();
  drawThumbs();
  window.addEventListener('resize', () => drawThumbs());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawThumbs(); });
  sQueue(); measureNow(); chart.draw(); updateFit();
})();
