const G = require('./core.js');
const SG = -1;
function sim(P, cx, cy, ang, sc) { const c = Math.cos(ang) * sc, s = Math.sin(ang) * sc, Q = new Float64Array(P.length); for (let i = 0; i < P.length; i += 2) { Q[i] = cx + c * P[i] - s * P[i + 1]; Q[i + 1] = cy + s * P[i] + c * P[i + 1]; } return Q; }
function copies(Pprev, psi) {
  const out = [sim(Pprev, 0, 0, psi, 1 / G.S7)];
  for (let k = 0; k < 6; k++) { const a = psi + k * Math.PI / 3; out.push(sim(Pprev, Math.cos(a) * G.S3 / G.S7, Math.sin(a) * G.S3 / G.S7, psi, 1 / G.S7)); }
  return out;
}
const R = Math.random;
for (const psi of [G.PHI, -G.PHI]) for (const n of [1, 3, 5]) {
  const In = G.islandPoly(n, SG), C = copies(G.islandPoly(n - 1, SG), psi);
  let bad = 0, dbl = 0, N = 20000;
  for (let i = 0; i < N; i++) { const x = -1.1 + 2.2 * R(), y = -1.1 + 2.2 * R(); const a = G.inside(In, x, y); let k = 0; for (const c of C) if (G.inside(c, x, y)) k++; if (a !== (k > 0)) bad++; if (k > 1) dbl++; }
  console.log('psi', (psi * 180 / Math.PI).toFixed(2), 'n', n, 'mismatch', bad, 'overlap', dbl);
}
