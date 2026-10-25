const G = require('./core.js');
function crossings(P) {
  const m = P.length / 2; let proper = 0, touch = 0;
  const cr = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  for (let i = 0; i < m; i++) for (let j = i + 2; j < m; j++) {
    if (i === 0 && j === m - 1) continue;
    const a = [P[2 * i], P[2 * i + 1]], b = [P[(2 * i + 2) % (2 * m)], P[(2 * i + 3) % (2 * m)]], c = [P[2 * j], P[2 * j + 1]], d = [P[(2 * j + 2) % (2 * m)], P[(2 * j + 3) % (2 * m)]];
    const d1 = cr(...a, ...b, ...c), d2 = cr(...a, ...b, ...d), d3 = cr(...c, ...d, ...a), d4 = cr(...c, ...d, ...b), e = 1e-12;
    if (((d1 > e && d2 < -e) || (d1 < -e && d2 > e)) && ((d3 > e && d4 < -e) || (d3 < -e && d4 > e))) proper++;
    else if (Math.min(Math.abs(d1), Math.abs(d2), Math.abs(d3), Math.abs(d4)) < e) { // possible touching
      const near = (p, q, r) => Math.abs(cr(...p, ...q, ...r)) < e && Math.min(p[0], q[0]) - e <= r[0] && r[0] <= Math.max(p[0], q[0]) + e && Math.min(p[1], q[1]) - e <= r[1] && r[1] <= Math.max(p[1], q[1]) + e;
      if (near(a, b, c) || near(a, b, d) || near(c, d, a) || near(c, d, b)) touch++;
    }
  }
  return { proper, touch };
}
for (const sg of [-1, 1]) for (const n of [1, 2, 3, 4]) console.log('sgn', sg, 'n', n, JSON.stringify(crossings(G.islandPoly(n, sg))));
