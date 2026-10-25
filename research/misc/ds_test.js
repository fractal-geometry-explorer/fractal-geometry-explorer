const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const t0 = Date.now();
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  console.log('load ms', Date.now() - t0);
  for (const id of ['sq', 'p67', 'dragon', 'twin']) {
    await (await p.$('#' + id)).scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    await (await p.$(`#${id} > .plate-body`)).screenshot({ path: `fgn/ds_${id}.png` });
  }
  console.log('errors', errs);
  await b.close();
})();
