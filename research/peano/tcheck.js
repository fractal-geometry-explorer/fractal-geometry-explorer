const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const core = s.slice(s.indexOf('// CORE START'), s.indexOf('// CORE END'));
eval(core.replace(/^(const|let) /gm, 'var ') + ';globalThis.twoCurve=twoCurve;globalThis.cesaroTime=cesaroTime;globalThis.SQ=SQ;');
const st = 10, n = 1 << st; let worst = 0, bad = 0;
for (let k = 0; k < 4; k++) {
  const a = SQ[k], b = SQ[(k + 1) % 4], F = [];
  const P = twoCurve([0.5, 0.5], [1, 1], st, a[0], a[1], b[0], b[1], F);
  for (let i = 0; i < n; i++) {
    const cx = (P[2 * i] + P[2 * i + 2] + F[2 * i]) / 3, cy = (P[2 * i + 1] + P[2 * i + 3] + F[2 * i + 1]) / 3;
    const t = cesaroTime([cx, cy]), lo = k + i / n, hi = k + (i + 1) / n;
    if (t < lo - 1e-9 || t > hi + 1e-9) bad++;
    worst = Math.max(worst, Math.max(lo - t, t - hi, 0));
  }
}
console.log('triangles', 4 * n, 'centroid time outside its slot:', bad, 'worst', worst);
