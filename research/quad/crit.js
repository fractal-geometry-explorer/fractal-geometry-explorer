// zigzag Koch curve on [0,1]: legs w, w·e^{-iτ}, w (τ = turning angle, interior angle 180°−τ), same generator every stage
function curve(tau, n) {
  const den = [2 + Math.cos(-tau), Math.sin(-tau)], dd = den[0] ** 2 + den[1] ** 2;
  const w = [den[0] / dd, -den[1] / dd];                       // 1/(2 + e^{-iτ})
  const v = [w[0] * Math.cos(-tau) - w[1] * Math.sin(-tau), w[0] * Math.sin(-tau) + w[1] * Math.cos(-tau)];
  const g = [[0, 0], w, [w[0] + v[0], w[1] + v[1]], [1, 0]];
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
// minimum distance between non-adjacent segments (relative to segment length) and whether any pair crosses
function selfApproach(P) {
  const m = P.length / 2 - 1, L = Math.hypot(P[2] - P[0], P[3] - P[1]), cell = L * 2, grid = new Map();
  const key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  for (let i = 0; i < m; i++) { const k = key((P[2 * i] + P[2 * i + 2]) / 2, (P[2 * i + 1] + P[2 * i + 3]) / 2); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
  const segd = (i, j) => { // distance between segments i and j
    const p = [P[2 * i], P[2 * i + 1], P[2 * i + 2], P[2 * i + 3]], q = [P[2 * j], P[2 * j + 1], P[2 * j + 2], P[2 * j + 3]];
    const cr = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const d1 = cr(p[0], p[1], p[2], p[3], q[0], q[1]), d2 = cr(p[0], p[1], p[2], p[3], q[2], q[3]), d3 = cr(q[0], q[1], q[2], q[3], p[0], p[1]), d4 = cr(q[0], q[1], q[2], q[3], p[2], p[3]);
    if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0;
    const pd = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
    return Math.min(pd(q[0], q[1], p[0], p[1], p[2], p[3]), pd(q[2], q[3], p[0], p[1], p[2], p[3]), pd(p[0], p[1], q[0], q[1], q[2], q[3]), pd(p[2], p[3], q[0], q[1], q[2], q[3]));
  };
  let best = Infinity;
  for (let i = 0; i < m; i++) {
    const cx = Math.floor((P[2 * i] + P[2 * i + 2]) / 2 / cell), cy = Math.floor((P[2 * i + 1] + P[2 * i + 3]) / 2 / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${cx + dx},${cy + dy}`) || []) if (j > i + 1) best = Math.min(best, segd(i, j) / L);
  }
  return best;
}
for (const n of [4, 6, 8]) {
  const row = [];
  for (let interior = 120; interior >= 60; interior -= 5) { const tau = (180 - interior) * Math.PI / 180; row.push(`${interior}°:${selfApproach(curve(tau, n)).toFixed(3)}`); }
  console.log('stage', n, row.join(' '));
}
// bisection on the first crossing at stage 8
for (const n of [6, 7, 8, 9]) {
  let lo = 60, hi = 120;      // interior angles; crossing below crit
  for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (selfApproach(curve((180 - mid) * Math.PI / 180, n)) === 0) lo = mid; else hi = mid; }
  console.log('stage', n, 'first self-crossing at interior angle ≈', hi.toFixed(3), '°  (turn', (180 - hi).toFixed(3), '°)');
}
