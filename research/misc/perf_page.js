const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await (await p.$('#dragon')).scrollIntoViewIfNeeded();
  for (const [sel, label] of [['#sC button:nth-child(17)', 'st16'], ['#sC button:nth-child(19)', 'st18'], ['#mC button:nth-child(3)', 'along18'], ['#mC button:nth-child(2)', 'fill18 again'], ['#sC button:nth-child(15)', 'st14']]) {
    const t = await p.evaluate(async (sel) => {
      const t0 = performance.now(); document.querySelector(sel).click();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return performance.now() - t0;
    }, sel);
    console.log(label, Math.round(t));
  }
  await b.close();
})();
