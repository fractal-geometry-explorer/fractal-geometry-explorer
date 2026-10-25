const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: {width:1280,height:1000}, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  await (await p.$('#wrap')).screenshot({ path: '../fgn/ms2_default.png' });
  await p.check('#chg'); await p.click('#stages button:nth-child(3)'); await p.waitForTimeout(1200);
  await (await p.$('#wrap')).screenshot({ path: '../fgn/ms2_chg3.png' });
  await p.click('#stages button:nth-child(6)'); await p.waitForTimeout(2500);
  await (await p.$('#wrap')).screenshot({ path: '../fgn/ms2_chg6.png' });
  console.log('errors', errs); await b.close();
})();
