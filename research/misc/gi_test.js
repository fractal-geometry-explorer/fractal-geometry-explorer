const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  const t0 = Date.now();
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  console.log('load+settle ms', Date.now() - t0);
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await el.screenshot({ path: `fgn/gi_${name}.png` }); };
  await shot('#p46 > .plate-body', 'p46');
  await p.check('#gain46'); await p.click('#s46 button:nth-child(2)'); await p.waitForTimeout(200);
  console.log('46 stage1:', await p.$eval('#r46d', e => e.textContent), '|', await p.$eval('#r46e', e => e.textContent));
  await shot('#c46', 'p46_gain1');
  await p.click('#s46 button:nth-child(4)'); await p.waitForTimeout(200);
  console.log('46 stage3:', await p.$eval('#r46b', e => e.textContent), '|', await p.$eval('#r46e', e => e.textContent));
  await p.uncheck('#gain46');
  // tiling
  await p.click('#dT button:nth-child(3)'); await p.waitForTimeout(150);
  const box = await (await p.$('#cT')).boundingBox();
  await p.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.36); await p.waitForTimeout(150);
  console.log('tile hover:', await p.$eval('#infoT', e => e.textContent));
  await shot('#tiling .plate-body', 'tile49');
  await p.$eval('#exT', el => { el.value = 60; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.check('#tileT'); await p.waitForTimeout(900);
  await shot('#cT', 'tile_ex');
  await p.$eval('#exT', el => { el.value = 0; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.click('#dT button:nth-child(2)'); await p.waitForTimeout(300);
  await shot('#cT', 'tile_tiles');
  // loxodromic
  const set = (v) => p.$eval('#uL', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  const out = [];
  for (const v of [0, 50, 100, 500, 1000, 1884, 2000]) { await set(v); await p.waitForTimeout(v > 1000 ? 4200 : 2600); out.push(`${v / 100}: ${await p.$eval('#aLv', e => e.textContent)} ${await p.$eval('#uLv', e => e.textContent)}`); if (v === 500 || v === 2000) await shot('#lox .plate-body', 'lox_' + v); }
  console.log('lox out |', out.join(' | '));
  const tms = await p.evaluate(() => { const t = performance.now(); for (let i = 0; i < 5; i++) document.getElementById('cL').dispatchEvent(new Event('noop')); return 0; });
  await p.click('#sideL button:nth-child(2)'); await set(1000); await p.waitForTimeout(3500);
  console.log('lox in 10:', await p.$eval('#aLv', e => e.textContent), await p.$eval('#uLv', e => e.textContent));
  await shot('#cL', 'lox_in10');
  await p.check('#rotL'); await p.waitForTimeout(200); await shot('#cL', 'lox_fixed');
  // frame cost of the lox canvas at deep zoom
  const ms = await p.evaluate(async () => { const el = document.getElementById('uL'); const t = performance.now(); let n = 0; for (const v of [1500, 1510, 1520, 1530, 1540]) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 120)); n++; } return (performance.now() - t) / n; });
  // plate 47
  await shot('#p47 > .plate-body', 'p47');
  for (const m of [5, 6]) {
    const t = await p.evaluate(async (m) => { const t0 = performance.now(); document.querySelectorAll('#s47 button')[m - 3].click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }, m);
    console.log('47 stage', m, 'ms', Math.round(t));
  }
  await p.click('#s47 button:nth-child(3)');
  await p.click('#h47 button:nth-child(3)'); await p.waitForTimeout(300); await shot('#c47', 'p47_both');
  await p.click('#h47 button:nth-child(1)');
  await p.click('#trace47'); await p.waitForTimeout(4000);
  console.log('trace:', await p.$eval('#info47', e => e.textContent));
  await shot('#c47', 'p47_trace');
  await p.click('#trace47');
  await p.check('#wrap47'); await p.click('#zin47'); await p.click('#zin47'); await p.click('#zin47'); await p.waitForTimeout(500);
  await shot('#c47', 'p47_zoom');
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  p2.on('pageerror', e => errs.push('phone: ' + e.message));
  await p2.goto('file://' + process.argv[2]); await p2.waitForTimeout(1800);
  await p2.screenshot({ path: 'fgn/gi_phone.png', fullPage: true });
  console.log('phone overflow', await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  console.log('errors', errs);
  await b.close();
})();
