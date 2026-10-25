const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  await p.click('#rT button:nth-child(3)');
  const set = (id, v) => p.$eval(id, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  const cases = [[600, 1100], [700, 1800], [650, 1300], [700, 1700], [200, 1600], [700, 900]];
  for (const [ph, th] of cases) {
    await set('#phT', ph); await set('#thT', th); await p.waitForTimeout(600);
    await (await p.$('#cT')).screenshot({ path: `fgn/bug_${ph}_${th}.png` });
    console.log(ph / 10, th / 10, '→', await p.$eval('#thTv', e => e.textContent), await p.$eval('#p64dim', e => e.textContent), '|', await p.$eval('#p64 dl', e => e.innerText.replace(/\n/g, ' ')));
  }
  console.log('errors', errs);
  await b.close();
})();
