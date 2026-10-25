// CORE START
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

module.exports={buildLevel,arcSpline,sampleArcs,AW,MANDEL,BAND};