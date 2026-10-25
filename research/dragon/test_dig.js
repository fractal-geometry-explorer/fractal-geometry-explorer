const fs = require('fs');
eval(fs.readFileSync('core.js', 'utf8') + ';global.X={twinDigits};');
let shown = 0;
for (let t = 0; t < 300; t++) {
  const dg = []; for (let k = 0; k < 70; k++) dg.push(Math.random() < 0.5 ? 0 : 1);
  let px = 1, py = 0, wx = 0, wy = 0;
  for (let k = 0; k < 70; k++) { const nx = (-px + py) / 2, ny = (-px - py) / 2; px = nx; py = ny; if (dg[k]) { wx += px; wy += py; } }
  const got = X.twinDigits(wx, wy, 14);
  if (got !== dg.slice(0, 14).join('') && shown++ < 4) console.log(dg.slice(0, 20).join(''), got, wx.toFixed(4), wy.toFixed(4));
}
