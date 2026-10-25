const fs = require('fs');
eval(fs.readFileSync('core.js', 'utf8') + ';global.X={parseBase,expansionsOf,formatExpansion,GQ,intDigits};');
const show = (s) => { const p = X.parseBase(s); if (!p) { console.log(s, 'PARSE FAIL'); return; } const t0 = Date.now(); const e = X.expansionsOf(p.value); console.log(s, '=', p.value.map(String).join(','), '->', e.map(X.formatExpansion).join('  |  '), (Date.now() - t0) + 'ms'); };
for (const s of ['0.(1)', '0.0(001)', '0.1(100)', '0.000(001)', '1', '11', '1110', '0', '0.1', '11.01', '1.(0)', '0.0111', '0.(01)', '101.(110)', '0.(0011)', '0.11011001(10101)', '0.(000000000001)']) show(s);
const corner = X.expansionsOf([1n, 3n, 5n]); console.log('(1+3i)/5:', corner.map(X.formatExpansion));
console.log('i =', X.intDigits(0n, 1n), ' 1+i =', X.intDigits(1n, 1n), ' -1 =', X.intDigits(-1n, 0n), ' 2 =', X.intDigits(2n, 0n));
