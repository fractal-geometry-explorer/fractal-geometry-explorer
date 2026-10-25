const G = require('./core.js');
const SG = -1, H = G.hexagon();
let rnd = 777; const R = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
// tiling: find lattice angle th so that I_n + translates by √3 e^{i(th+60k)} tile (no overlap, cover a central disc)
for (const n of [1, 2, 3, 4]) {
  const I = G.islandPoly(n, SG); let best = null;
  for (let m = -2 * n; m <= 2 * n; m++) {
    const th = m * G.PHI, T = [];
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const x = G.S3 * (a * Math.cos(th) + b * Math.cos(th + Math.PI / 3)), y = G.S3 * (a * Math.sin(th) + b * Math.sin(th + Math.PI / 3)); T.push([x, y]); }
    let gap = 0, ov = 0; for (let i = 0; i < 4000; i++) { const x = -1.5 + 3 * R(), y = -1.5 + 3 * R(); let k = 0; for (const [tx, ty] of T) if (Math.abs(x - tx) < 2 && Math.abs(y - ty) < 2 && G.inside(I, x - tx, y - ty)) k++; if (k === 0) gap++; if (k > 1) ov++; }
    if (!best || gap + ov < best.e) best = { m, e: gap + ov, gap, ov };
  }
  console.log('tiling n', n, JSON.stringify(best), 'deg', (best.m * G.PHI * 180 / Math.PI).toFixed(2));
}
// flowsnake provinces: stage 5 from V0 to V2, blocks of 7^4 points
const F = G.flowsnake(5, -1, H[0], H[1], H[4], H[5]), B = Math.pow(7, 4), types = 'ABBAAAB';
for (let k = 0; k < 7; k++) { let sx = 0, sy = 0; for (let i = k * B; i < (k + 1) * B; i++) { sx += F[2 * i]; sy += F[2 * i + 1]; } sx /= B; sy /= B; console.log('province', k, types[k], 'centroid', sx.toFixed(3), sy.toFixed(3), 'angle', (Math.atan2(sy, sx) * 180 / Math.PI).toFixed(1), 'r', Math.hypot(sx, sy).toFixed(3)); }
// spiral at V0 along side V0->V1: P(t) on generator, local frame
const w = { r: Math.cos(G.PHI) / G.S7, i: SG * Math.sin(G.PHI) / G.S7 };
const v = { r: w.r * 0.5 - w.i * (-SG * G.S3 / 2), i: w.r * (-SG * G.S3 / 2) + w.i * 0.5 };
const g = [[0, 0], [w.r, w.i], [w.r + v.r, w.i + v.i], [1, 0]];
function sideP(t) { const d = []; let x = Math.min(Math.max(t, 0), 1); for (let k = 0; k < 40; k++) { x *= 3; let q = Math.floor(x); if (q > 2) q = 2; d.push(q); x -= q; } let zr = 0, zi = 0; for (let k = d.length - 1; k >= 0; k--) { const a = g[d[k]], b = g[d[k] + 1], dr = b[0] - a[0], di = b[1] - a[1]; const nr = a[0] + dr * zr - di * zi, ni = a[1] + dr * zi + di * zr; zr = nr; zi = ni; } return [zr, zi]; }
let mn = 9, mx = 0, amn = 999, amx = -999, maxdev = 0;
for (let i = 0; i <= 20000; i++) { const u = i / 20000, P = sideP(Math.pow(3, -u)), sc = Math.pow(7, u / 2), rot = -SG * G.PHI * u; const X = sc * (Math.cos(rot) * P[0] - Math.sin(rot) * P[1]), Y = sc * (Math.sin(rot) * P[0] + Math.cos(rot) * P[1]); const r = Math.hypot(X, Y), a = Math.atan2(Y, X) * 180 / Math.PI; mn = Math.min(mn, r); mx = Math.max(mx, r); amn = Math.min(amn, a); amx = Math.max(amx, a); }
for (let i = 0; i <= 50000; i++) { const P = sideP(i / 50000); maxdev = Math.max(maxdev, Math.hypot(P[0] - 0.5, P[1])); }
console.log('co-rotating screen radius', mn.toFixed(4), mx.toFixed(4), 'screen angle', amn.toFixed(2), amx.toFixed(2), 'side curve max dist from midpoint', maxdev.toFixed(4));
let pe = 0; for (let i = 0; i < 2000; i++) { const t = i / 2000, A = sideP(t / 3), P = sideP(t); const Wr = w.r * P[0] - w.i * P[1], Wi = w.r * P[1] + w.i * P[0]; pe = Math.max(pe, Math.hypot(A[0] - Wr, A[1] - Wi)); }
console.log('P(t/3)=w P(t) err', pe);
console.log('true angle at u=0..20 step 1:', Array.from({ length: 21 }, (_, u) => { const P = sideP(Math.pow(3, -u)); return (Math.atan2(P[1], P[0]) * 180 / Math.PI).toFixed(1); }).join(' '));
