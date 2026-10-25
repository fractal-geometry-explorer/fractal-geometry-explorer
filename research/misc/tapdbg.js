const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await (await p.$('#wD')).scrollIntoViewIfNeeded();
  await p.evaluate(() => { window.__ev = []; const w = document.getElementById('wD'); for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'click']) w.addEventListener(t, (e) => window.__ev.push(t + ':' + (e.pointerType || '')), true); });
  const box = await (await p.$('#wD')).boundingBox();
  await p.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height * 0.5); await p.waitForTimeout(400);
  console.log(await p.evaluate(() => window.__ev), (await p.$eval('#addrD', e => e.innerText)).slice(0, 80));
  await b.close();
})();
