const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await (await p.$('#twin')).scrollIntoViewIfNeeded();
  await p.click('#mD button:nth-child(3)'); await p.waitForTimeout(200);
  await p.click('#kD button:nth-child(9)'); await p.waitForTimeout(600);
  await (await p.$('#wD')).screenshot({ path: 'fgn/skin8.png' });
  await b.close();
})();
