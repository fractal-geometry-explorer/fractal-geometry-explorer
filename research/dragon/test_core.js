const fs = require('fs');
eval(fs.readFileSync('core.js', 'utf8') + ';global.X={sweep,ownedTrapezoid,processedSweep,hilbertXY,dragon,TW,skinCurve,twinDigits,dimension};');

const r = (v) => Math.round(v * 1e6) / 1e6;
let d = sweep(45, 4); const pts = []; for (let i = 0; i < d.P.length; i += 2) pts.push([r(d.P[i]), r(d.P[i + 1])]);
console.log('stage4', JSON.stringify(pts));
// Hilbert order at even stages
for (const n of [2, 4, 6, 8, 10, 12]) {
  d = sweep(45, n); const N = 1 << (n / 2), cells = [];
  for (let i = 0; i < d.m; i++) { const Q = ownedTrapezoid(d, i); const cx = (Q[0] + Q[2] + Q[4] + Q[6]) / 4, cy = (Q[1] + Q[3] + Q[5] + Q[7]) / 4; cells.push([Math.floor(cx * N), Math.floor(cy * N)]); }
  // compare with hilbert under the 8 symmetries
  let ok = false;
  for (let s = 0; s < 8 && !ok; s++) {
    ok = cells.every((c, i) => { let [x, y] = hilbertXY(N, i); if (s & 1) [x, y] = [y, x]; if (s & 2) x = N - 1 - x; if (s & 4) y = N - 1 - y; return x === c[0] && y === c[1]; });
  }
  const uniq = new Set(cells.map(String)).size;
  console.log('stage', n, 'cells', cells.length, 'distinct', uniq, 'hilbert', ok);
}
const DEG = 180 / Math.PI;
for (const phi of [30, 45, 60]) { d = sweep(phi, 8); let A = 0; for (let i = 0; i < d.m; i++) { const Q = ownedTrapezoid(d, i); let s = 0; for (let k = 0; k < 4; k++) { const j = (k + 1) % 4; s += Q[2 * k] * Q[2 * j + 1] - Q[2 * j] * Q[2 * k + 1]; } A += Math.abs(s) / 2; } console.log('phi', phi, 'sum area', A.toFixed(5), '1/sin2phi', (1 / Math.sin(2 * phi / DEG)).toFixed(5)); }
// dragon early stages from (1,0) to (0,0)
for (const n of [1, 2, 3]) { const P = dragon(Array(20).fill(1), n, 1, 0, 0, 0); const o = []; for (let i = 0; i < P.length; i += 2) o.push([r(P[i]), r(P[i + 1])]); console.log('dragon', n, JSON.stringify(o)); }
// digits round trip
const b = [-1, 1];
let bad = 0;
for (let t = 0; t < 300; t++) {
  const dg = []; for (let k = 0; k < 70; k++) dg.push(Math.random() < 0.5 ? 0 : 1);
  // w = Σ d_k β^-k ; β^-1 = (-1 - i)/2
  let px = 1, py = 0, wx = 0, wy = 0;
  for (let k = 0; k < 70; k++) { const nx = (-px + py) / 2, ny = (-px - py) / 2; px = nx; py = ny; if (dg[k]) { wx += px; wy += py; } }
  const got = twinDigits(wx, wy, 14).d;
  if (got !== dg.slice(0, 14).join('')) bad++;
}
console.log('digit mismatches of 300:', bad, twinDigits(3, 3, 10));
console.log('D skin', dimension([Math.SQRT1_2, Math.SQRT1_2 ** 3, Math.SQRT1_2 ** 3]));
