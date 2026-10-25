const src = require('fs').readFileSync(__dirname + '/crit3.js', 'utf8').split('for (const [a, n]')[0];
eval(src + ';globalThis.crossings=crossings;');
for (const n of [6, 7, 8, 9, 10]) {
  let hiCross = null;
  for (let k = 0; k <= 800; k++) { const a = 68 - k * 0.01; const c = crossings(curve((180 - a) * Math.PI / 180, n)).filter(x => x.depth > 1e-9); if (c.length) { hiCross = a; break; } }
  // confirm everything below also crosses (spot check)
  const below = [hiCross - 0.5, hiCross - 1, hiCross - 2].map(a => crossings(curve((180 - a) * Math.PI / 180, n)).filter(x => x.depth > 1e-9).length);
  console.log(`stage ${n}: first real crossing at interior angle ${(hiCross ?? NaN).toFixed(2)}°, crossings just below: ${below.join(', ')}`);
}
