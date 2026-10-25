const G = require('./core.js');
const SG = -1, AH = 3 * G.S3 / 2;
const R = Math.random;
for (const n of [1, 2, 3]) {
  const A = G.islandPoly(n, SG), B = G.islandPoly(n - 1, SG); let gain = 0, loss = 0; const N = 400000;
  for (let i = 0; i < N; i++) { const x = -1.2 + 2.4 * R(), y = -1.2 + 2.4 * R(); const a = G.inside(A, x, y), b = G.inside(B, x, y); if (a && !b) gain++; if (b && !a) loss++; }
  const box = 2.4 * 2.4, f = (1 / 14) * Math.pow(3 / 7, n - 1);
  console.log('n', n, 'gain/hex', (gain / N * box / AH).toFixed(4), 'loss/hex', (loss / N * box / AH).toFixed(4), 'formula', f.toFixed(4));
}
for (const n of [5, 6]) {
  const I = G.islandPoly(n, SG), th = -2 * G.PHI, T = [];
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) T.push([G.S3 * (a * Math.cos(th) + b * Math.cos(th + Math.PI / 3)), G.S3 * (a * Math.sin(th) + b * Math.sin(th + Math.PI / 3))]);
  let gap = 0, ov = 0; for (let i = 0; i < 3000; i++) { const x = -1.2 + 2.4 * R(), y = -1.2 + 2.4 * R(); let k = 0; for (const [tx, ty] of T) if (G.inside(I, x - tx, y - ty)) k++; if (k === 0) gap++; if (k > 1) ov++; }
  console.log('tiling n', n, 'gap', gap, 'overlap', ov);
}
