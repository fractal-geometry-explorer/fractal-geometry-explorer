const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  await (await p.$('#p64')).scrollIntoViewIfNeeded();
  const t = await p.evaluate(async () => { const t0 = performance.now(); document.querySelectorAll('#rT button')[4].click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; });
  await p.waitForTimeout(400);
  console.log('p65 ms', Math.round(t), await p.$eval('#cTt', e => e.textContent), '|', await p.$eval('#p64dim', e => e.textContent), '|', await p.$eval('#p64 dl', e => e.innerText.replace(/\n/g, ' ')));
  console.log('rules:', await p.$$eval('#rT button', bs => bs.map(b => b.textContent).join(' / ')));
  await (await p.$('#cT')).screenshot({ path: 'fgn/p65_page.png' });
  for (const [idx, n] of [[11, 12], [12, 14], [13, 16], [9, 9]]) {
    await p.click(`#sT button:nth-child(${idx})`); await p.waitForTimeout(500);
    await (await p.$('#cT')).screenshot({ path: `fgn/p65_page_${n}.png` });
  }
  await p.click('#sT button:nth-child(12)');
  await p.click('#rT button:nth-child(4)'); await p.waitForTimeout(400); await (await p.$('#cT')).screenshot({ path: 'fgn/p65_square_after.png' });
  console.log('square after:', await p.$eval('#cTt', e => e.textContent), await p.$eval('#thTv', e => e.textContent), await p.$eval('#sTv', e => e.textContent));
  await (await p.$('#p64 > .plate-body')).screenshot({ path: 'fgn/p65_section.png' });
  console.log('errors', errs);
  await b.close();
})();
