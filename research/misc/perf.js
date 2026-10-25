const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: {width:1280,height:1000}, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(600);
  for (const n of [3,4,5]) {
    const t = await p.evaluate(async (n) => {
      const btn = document.querySelectorAll('#depths button')[n];
      const t0 = performance.now(); btn.click();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const t1 = performance.now();
      // time a pure redraw (zoom in then out)
      const z0 = performance.now(); document.getElementById('zin').click();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const z1 = performance.now(); document.getElementById('zfit').click();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return [Math.round(t1-t0), Math.round(z1-z0)];
    }, n);
    console.log('level', n, 'switch ms', t[0], 'redraw ms', t[1]);
  }
  await p.evaluate(() => document.querySelectorAll('#depths button')[3].click());
  await p.waitForTimeout(300);
  const el = await p.$('#wrap'); await el.screenshot({ path: '../fgn/page_l3.png' });
  console.log('errors', errs);
  await b.close();
})();
