const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  const el = await p.$('#cB'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await el.screenshot({ path: 'fgn/upB_full.png' });
  console.log(await p.$eval('#p57b dl', e => e.innerText.replace(/\n/g, ' ')), '|', await p.$eval('#cBn', e => e.textContent));
  await (await p.$('#p57b')).screenshot({ path: 'fgn/upB_section.png' });
  console.log('errors', errs);
  await b.close();
})();
