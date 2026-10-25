const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: {width:1280,height:1000}, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(300);
  await p.click('#mSaus');
  const t0 = Date.now();
  await p.waitForFunction(() => [...document.querySelectorAll('#sTable td')].every(td => td.textContent !== '…'), null, { timeout: 60000 });
  console.log('all 60 measurements done in', Date.now() - t0, 'ms');
  const rows = await p.$$eval('#sTable tr', trs => trs.map(tr => [...tr.children].map(c => c.textContent)));
  console.log(JSON.stringify(rows));
  console.log('readouts', await p.$eval('#sA', e=>e.textContent), await p.$eval('#sL', e=>e.textContent), 'fitted D(level3)', await p.$eval('#sD', e=>e.textContent));
  for (const n of [4,5]) { await p.click(`#depths button:nth-child(${n+1})`); await p.waitForTimeout(400); console.log('fitted D level', n, await p.$eval('#sD', e=>e.textContent)); }
  await p.click('#depths button:nth-child(4)'); await p.waitForTimeout(500);
  await p.screenshot({ path: '../fgn/saus_desk.png', fullPage: false, clip: {x:0,y:220,width:1280,height:1000} });
  // hover chart
  const bb = await (await p.$('#sChart')).boundingBox();
  await p.mouse.move(bb.x + bb.width*0.3, bb.y + bb.height*0.5); await p.waitForTimeout(150);
  await (await p.$('#sGroup')).screenshot({ path: '../fgn/saus_group.png' });
  const p2 = await b.newPage({ viewport: {width:400,height:860}, colorScheme: 'dark' });
  p2.on('pageerror', e => errs.push('phone: '+e.message));
  await p2.goto('file://' + process.argv[2]); await p2.waitForTimeout(300);
  await p2.click('#mSaus'); await p2.waitForTimeout(2500);
  await p2.screenshot({ path: '../fgn/saus_phone.png', fullPage: true });
  console.log('phone overflow', await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  console.log('errors', errs);
  await b.close();
})();
