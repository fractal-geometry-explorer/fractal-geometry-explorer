const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const vp of [{width:1280,height:1000},{width:400,height:860}]) {
    const p = await b.newPage({ viewport: vp });
    await p.goto('file://' + process.argv[2]); await p.waitForTimeout(800);
    for (const v of [459, 1000]) {
      await p.$eval('#eps', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
      for (const n of [4, 5, 6]) {
        const ms = await p.evaluate(async (n) => {
          const t0 = performance.now();
          document.querySelectorAll('#stages button')[n - 1].click();
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          return performance.now() - t0;
        }, n);
        const w = await p.evaluate(() => document.getElementById('cv').width);
        console.log(`${vp.width}px canvas ${w}px  eps slider ${v}  stage ${n}: ${ms.toFixed(0)} ms`);
      }
    }
    await p.close();
  }
  await b.close();
})();
