const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: {width:1280,height:900}, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  for (const id of ['p42','p43','p44','p45']) { const el = await p.$('#'+id); await el.screenshot({ path: `../fgn/kp_${id}.png` }); }
  // tangent slider at a few positions
  const angles = [];
  for (const v of [0, 74, 200, 274, 500, 800]) {
    await p.$eval('#tan', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); }, v);
    await p.waitForTimeout(1500); angles.push(v/200 + ': ' + await p.$eval('#tana', e => e.textContent) + ' ' + await p.$eval('#tanv', e => e.textContent));
  }
  console.log('tangent', angles.join(' | '));
  await p.$eval('#tan', (el) => { el.value = 274; el.dispatchEvent(new Event('input', {bubbles:true})); });
  await (await p.$('#p42 .sub')).screenshot({ path: '../fgn/kp_tan.png' });
  // plate 44: depth 2, click a piece, wait for the animation
  await p.click('#k44 button:nth-child(2)');
  await (await p.$('#ss')).scrollIntoViewIfNeeded();
  const pt = await p.evaluate(() => { const g = document.querySelectorAll('#ss .pc')[5], path = g.querySelector('.hit'); const L = path.getTotalLength(), q = path.getPointAtLength(L / 2), m = path.getScreenCTM(); return [q.x * m.a + q.y * m.c + m.e, q.x * m.b + q.y * m.d + m.f]; });
  await p.mouse.click(pt[0], pt[1]);
  await p.waitForTimeout(1200);
  console.log('plate 44 note:', await p.$eval('#n44', e => e.textContent));
  await (await p.$('#ss')).screenshot({ path: '../fgn/kp_p44_click.png' });
  // plate 45 timings
  for (const n of [5, 6]) {
    const ms = await p.evaluate(async (n) => { const t0 = performance.now(); document.querySelectorAll('#s45 button')[n-1].click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }, n);
    console.log('plate 45 stage', n, 'draw ms', Math.round(ms), 'caption', await p.$eval('#c45n', e => e.textContent));
  }
  await p.click('#s45 button:nth-child(4)'); await p.click('#mix45'); await p.waitForTimeout(400);
  console.log('S/F after mix:', await p.$$eval('#sf45 button', bs => bs.map(b => b.textContent + (b.disabled ? '(off)' : '')).join(' ')));
  await (await p.$('#w45')).screenshot({ path: '../fgn/kp_p45_mix.png' });
  await p.click('#allS45'); await p.check('#line45'); await p.click('#zin45'); await p.click('#zin45'); await p.waitForTimeout(500);
  await (await p.$('#w45')).screenshot({ path: '../fgn/kp_p45_zoom.png' });
  const p2 = await b.newPage({ viewport: {width:390,height:844}, colorScheme: 'dark' });
  p2.on('pageerror', e => errs.push('phone: '+e.message));
  await p2.goto('file://' + process.argv[2]); await p2.waitForTimeout(1500);
  await p2.screenshot({ path: '../fgn/kp_phone.png', fullPage: true });
  console.log('phone overflow', await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  console.log('errors', errs);
  await b.close();
})();
