const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1800);
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await el.screenshot({ path: `fgn/up3_${name}.png` }); };
  const timeIt = async (fn) => p.evaluate(async (src) => { const t0 = performance.now(); eval(src); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t0); }, fn);
  console.log('56 colour on ms', await timeIt("document.getElementById('d56').click()"));
  await shot('#c56', 'c56'); console.log('56 key', await p.$eval('#k56', e => e.innerText.replace(/\n/g, ' ')));
  await p.$eval('#e56', el => { el.value = 30; el.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(400); await shot('#c56', 'c56coarse');
  console.log('57 colour on ms', await timeIt("document.getElementById('d57').click()"));
  await shot('#c57', 'c57'); console.log('57 key', await p.$eval('#k57', e => e.innerText.replace(/\n/g, ' ')));
  await p.$eval('#e57', el => { el.value = 35; el.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(400); await shot('#c57', 'c57coarse');
  await p.uncheck('#even57'); await p.waitForTimeout(400); await shot('#c57', 'c57mixed');
  console.log('errors', errs);
  await b.close();
})();
