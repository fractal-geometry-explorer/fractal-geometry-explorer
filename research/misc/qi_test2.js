const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1800);
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await el.screenshot({ path: `fgn/qi_${name}.png` }); };
  for (const label of ['60°: D = 2', '64.4°: critical']) { await p.click(`#pC button:has-text("${label}")`); await p.waitForTimeout(400); console.log(label, '→', await p.$eval('#xC', e => e.textContent)); }
  await shot('#cC', 'crit644');
  // Plate 51 provinces
  await p.click('#d51 button:nth-child(2)'); await p.waitForTimeout(300);
  console.log('cells 16:', await p.evaluate(() => document.getElementById('i51').textContent));
  await shot('#c51', 'p51_16');
  const box = await (await p.$('#c51')).boundingBox();
  await p.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.38); await p.waitForTimeout(150);
  console.log('hover:', await p.$eval('#i51', e => e.textContent));
  await p.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.38); await p.waitForTimeout(700);
  await shot('#c51', 'p51_mid'); await p.waitForTimeout(1200);
  console.log('after expand:', await p.$eval('#i51', e => e.textContent));
  await p.click('#d51 button:nth-child(3)'); await p.waitForTimeout(400);
  await shot('#c51', 'p51_256');
  // Plate 54: N=98, zoom in
  await p.click('#q54 button:nth-child(2)'); await p.waitForTimeout(600);
  console.log('54 readouts', await p.$eval('#p54 dl', e => e.innerText.replace(/\n/g, ' ')));
  await shot('#c54', 'p54_98');
  await shot('#cS', 'strip98');
  await p.click('#s54 button:nth-child(4)');
  for (let i = 0; i < 4; i++) await p.click('#w54 [data-z="in"]');
  await p.waitForTimeout(800);
  await shot('#c54', 'p54_98zoom');
  const t = await p.evaluate(async () => { const t0 = performance.now(); document.querySelector('#w53 [data-z="fit"]').click(); document.querySelectorAll('#s53 button')[4].click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; });
  console.log('53 stage 4 draw ms', Math.round(t));
  const t2 = await p.evaluate(async () => { const t0 = performance.now(); document.querySelectorAll('#s51 button')[5].click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; });
  console.log('51 stage 5 (256 provinces) ms', Math.round(t2));
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  p2.on('pageerror', e => errs.push('phone: ' + e.message));
  await p2.goto('file://' + process.argv[2]); await p2.waitForTimeout(2000);
  console.log('phone overflow', await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await p2.screenshot({ path: 'fgn/qi_phone.png', fullPage: true });
  console.log('errors', errs);
  await b.close();
})();
