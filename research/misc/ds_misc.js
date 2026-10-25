const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  const T = async (sel) => p.evaluate(async (sel) => { const t0 = performance.now(); document.querySelector(sel).click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t0); }, sel);
  await (await p.$('#dragon')).scrollIntoViewIfNeeded();
  console.log('curve mode', await T('#mC button:nth-child(1)'), 'stage', await p.$eval('#sCv', e => e.textContent));
  console.log('curve 18', await T('#sC button:nth-child(19)'));
  console.log('curve 16', await T('#sC button:nth-child(17)'));
  console.log('stage 0', await T('#sC button:nth-child(1)'), await p.$eval('#cCn', e => e.textContent));
  await (await p.$('#sq')).scrollIntoViewIfNeeded();
  console.log('sq0', await T('#sA button:nth-child(1)'), await p.$eval('#infoA', e => e.textContent));
  await p.check('#ownA'); await p.waitForTimeout(200); await (await p.$('#wA')).screenshot({ path: 'fgn/ds_sq0.png' });
  console.log('sq1', await T('#sA button:nth-child(2)'));  await (await p.$('#wA')).screenshot({ path: 'fgn/ds_sq1.png' });
  await (await p.$('#p67')).scrollIntoViewIfNeeded();
  // drag slider timing at stage 9
  const t = await p.evaluate(async () => { const el = document.getElementById('phB'); const t0 = performance.now(); for (let v = 300; v < 400; v += 10) { el.value = String(v); el.dispatchEvent(new Event('input')); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); } return Math.round((performance.now() - t0) / 10); });
  console.log('slider per step ms (stage 9)', t);
  await p.screenshot({ path: 'fgn/ds_top.png' });
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200); await p.screenshot({ path: 'fgn/ds_head.png' });
  console.log('errors', errs);
  await b.close();
})();
