const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  await p.click('#addK'); await p.click('#addK');
  const el = await p.$('#eff'); await el.scrollIntoViewIfNeeded();
  await p.click('#traceK');
  for (const ms of [1500, 4200, 7500]) {
    await p.waitForTimeout(ms - (ms === 1500 ? 0 : (ms === 4200 ? 1500 : 4200)));
    await (await p.$('#cK')).screenshot({ path: `fgn/traceK_${ms}.png` });
    console.log(ms, await p.$eval('#traceKInfo', e => e.textContent));
  }
  const fr = await p.evaluate(async () => { let n = 0, worst = 0, prev = performance.now(); const t0 = prev; await new Promise(r => { const f = (now) => { n++; worst = Math.max(worst, now - prev); prev = now; if (now - t0 < 1500) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }); return [n, Math.round(worst)]; });
  console.log('frames in 1.5 s, worst gap ms', fr);
  await p.waitForTimeout(4000);
  console.log('end', await p.$eval('#traceKInfo', e => e.textContent), await p.$eval('#traceK', e => e.textContent));
  await (await p.$('#cK')).screenshot({ path: 'fgn/traceK_end.png' });
  console.log(await p.$eval('#eff dl', e => e.innerText.replace(/\n/g, ' ')));
  console.log('errors', errs);
  await b.close();
})();
