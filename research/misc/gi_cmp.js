const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  for (const n of [0, 1, 2]) { await p.click(`#s46 button:nth-child(${n + 1})`); await p.waitForTimeout(150); const el = await p.$('#c46'); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `fgn/gi_s${n}.png` }); }
  await b.close();
})();
