const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await (await p.$('#numBox')).scrollIntoViewIfNeeded();
  await p.tap('#numEx button:nth-child(5)'); await p.waitForTimeout(400);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  await (await p.$('#twin')).screenshot({ path: 'fgn/num_phone.png' });
  const box = await (await p.$('#wD')).boundingBox();
  await p.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height * 0.5); await p.waitForTimeout(400);
  console.log('sw', sw, '| tap:', (await p.$eval('#addrD', e => e.innerText)).slice(0, 90));
  console.log('errors', errs);
  await b.close();
})();
