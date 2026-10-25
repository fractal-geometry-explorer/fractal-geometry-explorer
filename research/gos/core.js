const S3 = Math.sqrt(3), S7 = Math.sqrt(7);
const PHI = Math.atan2(S3, 5);                       // 19.1066°
// pointy-top hexagon of side 1, counterclockwise, starting at the lower-left vertex
function hexagon() { const P = []; for (let k = 0; k < 6; k++) { const a = (-150 + 60 * k) * Math.PI / 180; P.push(Math.cos(a), Math.sin(a)); } return P; }
// generator for edge a->b: three pieces of length 1/√7, turning by sgn·φ, −60°, +60°
function islandPoly(n, sgn) {
  let P = hexagon();
  const wr = Math.cos(PHI) / S7, wi = sgn * Math.sin(PHI) / S7;     // w
  const tr = 0.5, ti = -sgn * S3 / 2;                               // e^{∓iπ/3}
  const vr = wr * tr - wi * ti, vi = wr * ti + wi * tr;             // w·e^{∓iπ/3}
  for (let k = 0; k < n; k++) {
    const m = P.length / 2, Q = [];
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, dx = P[j] - ax, dy = P[j + 1] - ay;
      const p1x = ax + dx * wr - dy * wi, p1y = ay + dx * wi + dy * wr;
      const p2x = p1x + dx * vr - dy * vi, p2y = p1y + dx * vi + dy * vr;
      Q.push(ax, ay, p1x, p1y, p2x, p2y);
    }
    P = Q;
  }
  return P;
}
// Peano-Gosper curve by turtle: A -> A-B--B+A++AA+B-, B -> +A-BB--B-A++A+B ; '+' = turn by +60·sgn
function flowsnake(n, sgn, ax, ay, bx, by) {
  let s = 'A';
  for (let k = 0; k < n; k++) s = s.replace(/[AB]/g, (c) => c === 'A' ? 'A-B--B+A++AA+B-' : '+A-BB--B-A++A+B');
  let x = 0, y = 0, h = 0; const pts = [0, 0];
  for (const c of s) {
    if (c === '+') h += sgn * 60; else if (c === '-') h -= sgn * 60;
    else { x += Math.cos(h * Math.PI / 180); y += Math.sin(h * Math.PI / 180); pts.push(x, y); }
  }
  // map (0,0)->(ax,ay), end->(bx,by)
  const ex = pts[pts.length - 2], ey = pts[pts.length - 1], L2 = ex * ex + ey * ey;
  const dx = bx - ax, dy = by - ay, cr = (dx * ex + dy * ey) / L2, ci = (dy * ex - dx * ey) / L2;
  const out = new Float64Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) { out[i] = ax + cr * pts[i] - ci * pts[i + 1]; out[i + 1] = ay + ci * pts[i] + cr * pts[i + 1]; }
  return out;
}
function area(P) { let s = 0; const m = P.length / 2; for (let i = 0; i < m; i++) { const j = ((i + 1) % m) * 2; s += P[2 * i] * P[j + 1] - P[j] * P[2 * i + 1]; } return s / 2; }
function inside(P, x, y) { let c = false; const m = P.length / 2; for (let i = 0, j = m - 1; i < m; j = i++) { const xi = P[2 * i], yi = P[2 * i + 1], xj = P[2 * j], yj = P[2 * j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
module.exports = { S3, S7, PHI, hexagon, islandPoly, flowsnake, area, inside };
