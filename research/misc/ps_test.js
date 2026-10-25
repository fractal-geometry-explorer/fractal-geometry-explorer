const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  const t0 = Date.now();
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(2000);
  console.log('load ms', Date.now() - t0, errs);
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await el.screenshot({ path: `fgn/ps_${name}.png` }); };
  await shot('#p63 > .plate-body', 'p63');
  await shot('#flipper', 'flip');
  console.log('63', await p.$eval('#p63 dl', e => e.innerText.replace(/\n/g, ' ')), '|', await p.$eval('#flipInfo', e => e.textContent));
  for (const n of [1, 3, 4]) { await p.click(`#s63 button:nth-child(${n + 1})`); await p.waitForTimeout(250); await shot('#c63', `c63_${n}`); console.log('stage', n, await p.$eval('#r63d', e => e.textContent)); }
  // check isLand rule against the drawn sharp stage-4 island (canvas pixel test)
  await p.uncheck('#cut63'); await p.waitForTimeout(300);
  const agree = await p.evaluate(() => {
    const cv = document.getElementById('c63'), ctx = cv.getContext('2d'), r = cv.getBoundingClientRect();
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let ok = 0, tot = 0;
    // reconstruct the view the same way the page does
    const w = r.width, h = r.height, s = Math.min(w / (2 * 1.06), h / (2 * 1.06)), ox = w / 2 - 0.5 * s, oy = h / 2 + 0.5 * s, dpr = cv.width / w;
    for (let k = 0; k < 4000; k++) {
      const x = -0.5 + 2 * Math.random(), y = -0.5 + 2 * Math.random();
      const N = 81, fx = x * N - Math.floor(x * N), fy = y * N - Math.floor(y * N);
      if (fx < 0.2 || fx > 0.8 || fy < 0.2 || fy > 0.8) continue;   // stay away from cell edges
      const px = Math.round((ox + x * s) * dpr), py = Math.round((oy - y * s) * dpr), i = 4 * (py * cv.width + px);
      const dark = d[i] < 100; tot++;
      if (dark === isLandAt(x, y, 4)) ok++;
    }
    return [ok, tot];
  });
  console.log('stage-4 land rule vs drawn island:', agree);
  await p.check('#cut63'); await p.click('#s63 button:nth-child(3)');
  await shot('#sweep > .plate-body', 'sweep');
  await p.click('#sS button:nth-child(4)'); await p.waitForTimeout(300); await shot('#cS', 'sweep4');
  const tm = await p.evaluate(async () => { const t0 = performance.now(); document.querySelectorAll('#sS button')[4].click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; });
  console.log('sweep stage 5 ms', Math.round(tm));
  await p.click('#sS button:nth-child(3)'); await p.click('#traceS'); await p.waitForTimeout(4000); await shot('#cS', 'trace'); console.log('trace', await p.$eval('#traceInfo', e => e.textContent)); await p.click('#traceS');
  await shot('#p64 > .plate-body', 'p64');
  for (const [rule, name] of [[2, 'cesaro'], [3, 'p64'], [4, 'square']]) {
    await p.click(`#rT button:nth-child(${rule})`); await p.waitForTimeout(400);
    await shot('#cT', name); console.log(name, await p.$eval('#p64 dl', e => e.innerText.replace(/\n/g, ' ')), '|', await p.$eval('#p64dim', e => e.textContent));
  }
  await p.click('#preT button:nth-child(2)'); await p.check('#fillT'); await p.click('#sT button:nth-child(9)'); await p.waitForTimeout(500); await shot('#cT', 'square95'); await p.uncheck('#fillT');
  await p.click('#rT button:nth-child(2)'); await p.click('#sT button:nth-child(2)'); await p.waitForTimeout(300); await shot('#cT', 'ces2_95');
  await p.click('#sT button:nth-child(3)'); await p.waitForTimeout(300); await shot('#cT', 'ces3_95');
  await p.click('#preT button:nth-child(3)'); await p.click('#sT button:nth-child(8)'); await p.waitForTimeout(300); await shot('#cT', 'ces120'); console.log('120', await p.$eval('#rTb', e => e.textContent));
  const t16 = await p.evaluate(async () => { const t0 = performance.now(); document.querySelectorAll('#preT button')[0].click(); document.querySelectorAll('#rT button')[0].click(); document.querySelectorAll('#sT button')[10].click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; });
  console.log('polya stage 16 ms', Math.round(t16), await p.$eval('#rTd', e => e.textContent));
  await shot('#eff > .plate-body', 'eff');
  console.log('K', await p.$eval('#eff dl', e => e.innerText.replace(/\n/g, ' ')));
  for (let i = 0; i < 5; i++) await p.click('#addK');
  console.log('K60', await p.$eval('#eff dl', e => e.innerText.replace(/\n/g, ' ')));
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  p2.on('pageerror', e => errs.push('phone: ' + e.message));
  await p2.goto('file://' + process.argv[2]); await p2.waitForTimeout(2000);
  console.log('phone overflow', await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await p2.screenshot({ path: 'fgn/ps_phone.png', fullPage: true });
  console.log('errors', errs);
  await b.close();
})();
