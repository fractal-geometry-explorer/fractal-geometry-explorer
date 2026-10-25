const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  const t0 = Date.now();
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1800);
  console.log('load ms', Date.now() - t0, 'errors so far', errs);
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await el.screenshot({ path: `fgn/qi_${name}.png` }); };
  await shot('#p49 > .plate-body', 'p49');
  await shot('#family .plate-body', 'family');
  await shot('#crit .plate-body', 'crit');
  await shot('#p51 > .plate-body', 'p51');
  await shot('#p53 > .plate-body', 'p53');
  await shot('#p54', 'p54');
  console.log('t49', await p.$eval('#t49', e => e.innerText.replace(/\n/g, ' | ')));
  console.log('51 readouts', await p.$eval('#p51 dl', e => e.innerText.replace(/\n/g, ' ')));
  console.log('54 readouts', await p.$eval('#p54 dl', e => e.innerText.replace(/\n/g, ' ')));
  console.log('crit', await p.$eval('#xC', e => e.textContent), await p.$eval('#dCv', e => e.textContent));
  for (const label of ['64.4°: critical', '60°: D = 2']) { await p.click(`#pC button:has-text("${label}")`); await p.waitForTimeout(300); console.log(label, '→', await p.$eval('#xC', e => e.textContent)); }
  console.log('errors', errs);
  await b.close();
})();
