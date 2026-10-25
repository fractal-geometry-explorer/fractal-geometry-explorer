const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: {width:1280,height:1000}, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  await p.goto('file://' + process.argv[2]);
  const t0 = Date.now();
  await p.waitForFunction(() => document.querySelectorAll('#sTable td').length && [...document.querySelectorAll('#sTable td')].every(td => td.textContent !== '…'), null, { timeout: 120000 });
  console.log('all measurements in', Date.now()-t0, 'ms');
  const rows = await p.$$eval('#sTable tr', trs => trs.map(tr => [...tr.children].map(c => c.textContent).join(' ')));
  console.log(rows.join('\n'));
  console.log('readouts:', await p.$eval('#rA', e=>e.textContent), '|', await p.$eval('#rL', e=>e.textContent), '|', await p.$eval('#rC', e=>e.textContent), '| D', await p.$eval('#rD', e=>e.textContent));
  console.log('verdict:', await p.$eval('#verdict', e=>e.textContent));
  for (const n of [2,3,5,6]) { await p.click(`#stages button:nth-child(${n})`); await p.waitForTimeout(700); console.log('stage', n, 'D', await p.$eval('#rD', e=>e.textContent), 'changed', await p.$eval('#rC', e=>e.textContent)); }
  await p.click('#stages button:nth-child(4)'); await p.waitForTimeout(600);
  await p.screenshot({ path: '../fgn/ms_desk.png', fullPage: true });
  await p.check('#chg'); await p.click('#stages button:nth-child(2)'); await p.waitForTimeout(700);
  await (await p.$('#wrap')).screenshot({ path: '../fgn/ms_change2.png' });
  const p2 = await b.newPage({ viewport: {width:400,height:860}, colorScheme: 'dark' });
  p2.on('pageerror', e => errs.push('phone: '+e.message));
  await p2.goto('file://' + process.argv[2]); await p2.waitForTimeout(2500);
  await p2.screenshot({ path: '../fgn/ms_phone.png', fullPage: true });
  console.log('phone overflow', await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  console.log('errors', errs);
  await b.close();
})();
