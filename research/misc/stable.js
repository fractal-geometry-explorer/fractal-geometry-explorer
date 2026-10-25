const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const vp of [{width:1280,height:1000},{width:400,height:860},{width:360,height:760},{width:900,height:900}]) {
    const p = await b.newPage({ viewport: vp });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
    const seen = new Set(), tops = new Set();
    for (const n of [1, 3, 4, 6]) {
      await p.click(`#stages button:nth-child(${n})`);
      for (const v of [0, 150, 300, 459, 600, 800, 1000]) {
        await p.$eval('#eps', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
        for (let k = 0; k < 3; k++) {             // sample while measuring and after
          await p.waitForTimeout(k === 0 ? 20 : 250);
          const r = await p.evaluate(() => [document.querySelector('.verdict').getBoundingClientRect().height, document.querySelector('#sChart').getBoundingClientRect().top + scrollY]);
          seen.add(Math.round(r[0])); tops.add(Math.round(r[1]));
        }
      }
    }
    console.log(vp.width + 'px  verdict heights seen:', [...seen], ' chart top positions seen:', [...tops]);
    await p.close();
  }
  console.log('errors', errs);
  await b.close();
})();
