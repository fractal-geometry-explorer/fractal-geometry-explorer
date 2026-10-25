const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  for (const id of ['tiling', 'lox']) { const el = await p.$('#' + id); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `fgn/gi_phone_${id}.png` }); }
  console.log('overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'errors', errs);
  await b.close();
})();
