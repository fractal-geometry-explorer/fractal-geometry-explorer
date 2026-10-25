const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const core = s.slice(s.indexOf('// CORE START'), s.indexOf('// CORE END'));
eval(core.replace(/^(const|let) /gm, 'var ') + ';globalThis.twoCurve=twoCurve;globalThis.peanoSide=peanoSide;');
function stats(P, name) {
  const q = (v) => Math.round(v * 1e6), vis = new Map(), edges = new Map();
  const m = P.length / 2;
  for (let i = 0; i < m; i++) { const k = q(P[2 * i]) + ',' + q(P[2 * i + 1]); vis.set(k, (vis.get(k) || 0) + 1); }
  for (let i = 0; i + 1 < m; i++) { const a = q(P[2 * i]) + ',' + q(P[2 * i + 1]), b = q(P[2 * i + 2]) + ',' + q(P[2 * i + 3]), k = a < b ? a + '|' + b : b + '|' + a; edges.set(k, (edges.get(k) || 0) + 1); }
  const vh = {}, eh = {};
  for (const v of vis.values()) vh[v] = (vh[v] || 0) + 1;
  for (const v of edges.values()) eh[v] = (eh[v] || 0) + 1;
  console.log(name.padEnd(10), 'steps', m - 1, '| grid points visited k times:', JSON.stringify(vh), '| edges traced k times:', JSON.stringify(eh), '| steps per grid point', ((m - 1) / vis.size).toFixed(3));
}
stats(twoCurve([0.5, 0.5], [1, 3], 14, 0, 0, 1, 0), 'Polya');
stats(twoCurve([0.5, -0.5], [1, 1], 14, 1, 0, 0, 0), 'Cesaro');
stats(peanoSide(5), 'Peano 63');
