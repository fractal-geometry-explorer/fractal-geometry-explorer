const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const core = src.split('// CORE START')[1]?.split('// CORE END')[0] ?? src.match(/const S3[\s\S]*?\/\/ CORE END/)[0];
eval(core.replace(/^(const|let) /gm, 'var ') + ';globalThis.kochPoint=kochPoint;');
let mn = 9, mx = 0, amin = 99, amax = -99, mnU, mxU;
for (let i = 0; i <= 100000; i++) {
  const u = i / 100000, P = kochPoint(Math.pow(4, -u)), m = Math.pow(3, u) * Math.hypot(P[0], P[1]);
  const a = -Math.atan2(P[1], P[0]) * 180 / Math.PI;
  if (m < mn) { mn = m; mnU = u; } if (m > mx) { mx = m; mxU = u; }
  amin = Math.min(amin, a); amax = Math.max(amax, a);
}
console.log('screen radius ratio min', mn.toFixed(4), 'at u', mnU, 'max', mx.toFixed(4), 'at u', mxU, 'angle', amin.toFixed(3), amax.toFixed(3));
// periodicity check
let pd = 0; for (let i = 0; i < 1000; i++) { const u = i/1000; const A = kochPoint(Math.pow(4,-u)), B = kochPoint(Math.pow(4,-u-1)); pd = Math.max(pd, Math.hypot(A[0]/3 - B[0], A[1]/3 - B[1])); }
console.log('P(t/4) = P(t)/3 max err', pd);
