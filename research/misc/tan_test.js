const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await (await p.$('#ctan')).scrollIntoViewIfNeeded();
  const set = (v) => p.$eval('#tan', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  // filmstrip across one ×3 cycle and the next
  for (const v of [0, 50, 100, 150, 200, 400]) {
    await set(v); await p.waitForTimeout(900);
    await (await p.$('#ctan')).screenshot({ path: `../fgn/tan_${v}.png` });
    console.log(v / 200, await p.$eval('#tana', e => e.textContent), await p.$eval('#tanv', e => e.textContent));
  }
  // a track click from 0 to 4: count frames and measure draw cost
  await set(0); await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    const el = document.getElementById('tan'), us = [], t0 = performance.now(); let worst = 0, prev = t0;
    el.value = 800; el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((res) => { const f = (now) => { worst = Math.max(worst, now - prev); prev = now; us.push(document.getElementById('tana').textContent); if (now - t0 < 3500) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    return { frames: us.length, worstFrameGap: Math.round(worst), final: us[us.length - 1] };
  });
  console.log('glide', JSON.stringify(r));
  // pure draw cost at a few zooms
  const cost = await p.evaluate(() => { const c = document.getElementById('ctan'); return 0; });
  console.log('errors', errs);
  await b.close();
})();
