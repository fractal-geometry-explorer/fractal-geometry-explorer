const G = require('./core.js');
const H = G.hexagon();
console.log('PHI deg', G.PHI * 180 / Math.PI);
for (const sg of [1, -1]) console.log('island sgn', sg, 'areas', [0,1,2,3,4,5].map(n => G.area(G.islandPoly(n, sg)).toFixed(12)).join(' '));
// flowsnake from lower-left vertex (index 0) to lower-right (index 2)
for (const fs of [1, -1]) for (const sg of [1, -1]) {
  const I = G.islandPoly(5, sg), F = G.flowsnake(6, fs, H[0], H[1], H[4], H[5]);
  let inn = 0; const n = F.length / 2; for (let i = 0; i < n; i += 7) if (G.inside(I, F[2 * i], F[2 * i + 1])) inn++;
  console.log('flowsnake sgn', fs, 'island sgn', sg, 'inside frac', (inn / Math.ceil(n / 7)).toFixed(4));
}
// stage 1 flowsnake points for both handedness, in the book's frame (chord horizontal)
for (const fs of [1, -1]) { const F = G.flowsnake(1, fs, H[0], H[1], H[4], H[5]); console.log('fs', fs, Array.from(F).map(v => v.toFixed(3)).join(',')); }
