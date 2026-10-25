const src = require('fs').readFileSync(__dirname + '/crit.js', 'utf8').split('// minimum distance')[0];
eval(src + ';globalThis.curve=curve;');
// robust: report crossing pairs with their penetration (smallest |cross| relative to L²) and index gap
function crossings(P) {
  const m = P.length / 2 - 1, L = Math.hypot(P[2] - P[0], P[3] - P[1]), cell = L * 1.5, grid = new Map(), out = [];
  for (let i = 0; i < m; i++) { const k = `${Math.floor((P[2*i] + P[2*i+2]) / 2 / cell)},${Math.floor((P[2*i+1] + P[2*i+3]) / 2 / cell)}`; (grid.get(k) || grid.set(k, []).get(k)).push(i); }
  const cr = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  for (let i = 0; i < m; i++) {
    const gx = Math.floor((P[2*i] + P[2*i+2]) / 2 / cell), gy = Math.floor((P[2*i+1] + P[2*i+3]) / 2 / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${gx+dx},${gy+dy}`) || []) {
      if (j <= i + 1) continue;
      const p = [P[2*i], P[2*i+1], P[2*i+2], P[2*i+3]], q = [P[2*j], P[2*j+1], P[2*j+2], P[2*j+3]];
      const d1 = cr(...p, q[0], q[1]), d2 = cr(...p, q[2], q[3]), d3 = cr(...q, p[0], p[1]), d4 = cr(...q, p[2], p[3]);
      if ((d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)) out.push({ i, j, depth: Math.min(Math.abs(d1), Math.abs(d2), Math.abs(d3), Math.abs(d4)) / (L * L) });
    }
  }
  return out;
}
for (const [a, n] of [[73.4, 8], [71.0, 9], [66.0, 8], [64.0, 8], [62.0, 8], [61.0, 9]]) {
  const c = crossings(curve((180 - a) * Math.PI / 180, n));
  const deep = c.filter(x => x.depth > 1e-9);
  console.log(`angle ${a} stage ${n}: flagged ${c.length}, with depth>1e-9: ${deep.length}, max depth ${c.length ? Math.max(...c.map(x => x.depth)).toExponential(2) : '-'}`);
}
