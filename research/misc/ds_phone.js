const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    wide: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(e => e.tagName + '#' + e.id + '.' + e.className).slice(0, 10) }));
  console.log(JSON.stringify(ov));
  await p.screenshot({ path: 'fgn/ds_phone_top.png' });
  for (const id of ['sq', 'p67', 'dragon', 'twin']) { await (await p.$('#' + id)).scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await (await p.$('#' + id)).screenshot({ path: `fgn/ds_phone_${id}.png` }); }
  await p.click('#mD button:nth-child(4)'); await p.waitForTimeout(400); await (await p.$('#twin')).screenshot({ path: 'fgn/ds_phone_river.png' });
  console.log('errors', errs);
  await b.close();
})();
