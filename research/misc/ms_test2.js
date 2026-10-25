const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: {width:1280,height:1000}, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  await p.goto('file://' + process.argv[2]);
  console.log('worker in use:', await p.evaluate(() => typeof OffscreenCanvas !== 'undefined'));
  // responsiveness: time a main-thread task while measurements run
  await p.waitForTimeout(1500);
  const lag = await p.evaluate(async () => { const t = performance.now(); await new Promise(r => setTimeout(r, 0)); return performance.now() - t; });
  console.log('main-thread setTimeout lag during measuring (ms):', lag.toFixed(1));
  console.log('readouts at 1.5s:', await p.$eval('#rA', e=>e.textContent), '|', await p.$eval('#rC', e=>e.textContent));
  const t0 = Date.now();
  await p.waitForFunction(() => [...document.querySelectorAll('#sTable td')].length && [...document.querySelectorAll('#sTable td')].every(td => td.textContent !== '…'), null, { timeout: 180000 });
  console.log('chart complete after', Date.now()-t0+1500, 'ms; status:', await p.$eval('#chartStatus', e=>e.textContent));
  for (const n of [1,2,3,4,5,6]) { await p.click(`#stages button:nth-child(${n})`); await p.waitForFunction(() => !document.querySelector('#rC').textContent.includes('…'), null, {timeout: 30000}); console.log('stage', n, 'D', await p.$eval('#rD', e=>e.textContent), '| changed', await p.$eval('#rC', e=>e.textContent)); }
  await p.click('#stages button:nth-child(4)'); await p.waitForTimeout(800);
  await p.screenshot({ path: '../fgn/ms_desk.png', fullPage: true });
  await p.check('#chg'); await p.click('#stages button:nth-child(3)'); await p.waitForTimeout(900);
  await (await p.$('#wrap')).screenshot({ path: '../fgn/ms_change3.png' });
  await p.click('#stages button:nth-child(5)'); await p.waitForTimeout(1500);
  await (await p.$('#wrap')).screenshot({ path: '../fgn/ms_change5.png' });
  const p2 = await b.newPage({ viewport: {width:400,height:860}, colorScheme: 'dark' });
  p2.on('pageerror', e => errs.push('phone: '+e.message));
  await p2.goto('file://' + process.argv[2]); await p2.waitForTimeout(3000);
  await p2.screenshot({ path: '../fgn/ms_phone.png', fullPage: true });
  console.log('phone overflow', await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  console.log('errors', errs);
  await b.close();
})();
