const src = require('fs').readFileSync(__dirname + '/crit.js', 'utf8').split('for (const n of [4, 6, 8])')[0];
eval(src + ';globalThis.curve=curve;globalThis.selfApproach=selfApproach;');
for (const n of [8, 9, 10, 11]) {
  let firstCross = null, lastClean = null; const crosses = [];
  for (let a = 75; a >= 60; a -= 0.1) {
    const c = selfApproach(curve((180 - a) * Math.PI / 180, n)) === 0;
    if (c) { crosses.push(a.toFixed(1)); if (firstCross === null) firstCross = a; } else if (firstCross === null) lastClean = a;
  }
  console.log('stage', n, 'largest crossing angle', firstCross && firstCross.toFixed(2), '| crossing count', crosses.length, '| sample', crosses.slice(0, 8).join(','));
}
