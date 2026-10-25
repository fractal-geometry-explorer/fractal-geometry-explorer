const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  await (await p.$('#p64')).scrollIntoViewIfNeeded();
  await p.click('#plate64'); await p.waitForTimeout(600);
  await (await p.$('#cT')).screenshot({ path: 'fgn/chev_page.png' });
  console.log(await p.$eval('#p64dim', e => e.textContent), '|', await p.$eval('#p64 dl', e => e.innerText.replace(/\n/g, ' ')));
  await (await p.$('#p64 > .plate-body')).screenshot({ path: 'fgn/chev_section.png' });
  for (const [rule, st, name] of [[1, 10, 'polya'], [2, 10, 'cesaro'], [4, 10, 'square']]) {
    await p.click(`#rT button:nth-child(${rule})`); await p.click(`#sT button:nth-child(${st})`); await p.waitForTimeout(400);
    await (await p.$('#cT')).screenshot({ path: `fgn/chev_${name}.png` });
  }
  const t = await p.evaluate(async () => { const t0 = performance.now(); document.querySelectorAll('#sT button')[12].click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; });
  console.log('stage 16 chevrons ms', Math.round(t));
  console.log('errors', errs);
  await b.close();
})();
