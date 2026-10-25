const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await (await p.$('#snow')).scrollIntoViewIfNeeded();
  const t0 = Date.now(); await p.click('#plate69'); await p.waitForTimeout(600); console.log('p69 ms', Date.now() - t0);
  await (await p.$('#wA')).screenshot({ path: 'fgn/p69_page3.png' });
  await p.check('#swapA'); await p.click('#sA button:nth-child(2)'); await p.waitForTimeout(400); await (await p.$('#wA')).screenshot({ path: 'fgn/p69_page1.png' });
  await p.click('#sA button:nth-child(3)'); await p.waitForTimeout(400); await (await p.$('#wA')).screenshot({ path: 'fgn/p69_page2.png' });
  console.log(await p.$eval('#infoA', e => e.textContent));
  await p.click('#sA button:nth-child(5)'); await p.waitForTimeout(600); await (await p.$('#wA')).screenshot({ path: 'fgn/p69_page4.png' });
  await p.click('#gA button:nth-child(1)'); await p.click('#sA button:nth-child(7)'); await p.waitForTimeout(800); await (await p.$('#wA')).screenshot({ path: 'fgn/p69_page7_6.png' });
  console.log('errors', errs);
  await b.close();
})();
