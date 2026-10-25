const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  // ---- tiling: click a ring province at 7, record frames
  await (await p.$('#cT')).scrollIntoViewIfNeeded();
  const box = await (await p.$('#cT')).boundingBox();
  const rec = async (name, clickX, clickY) => {
    const frames = await p.evaluate(async ([x, y, W, H]) => {
      const cv = document.getElementById('cT'), ctx = cv.getContext('2d');
      const before = ctx.getImageData(0, 0, cv.width, cv.height).data.slice();
      const opts = { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse' };
      cv.dispatchEvent(new PointerEvent('pointerdown', opts)); cv.dispatchEvent(new PointerEvent('pointerup', opts));
      const shots = [], t0 = performance.now(); let last = null, n = 0;
      await new Promise((res) => { const f = () => { n++; const t = performance.now() - t0; if ([350, 800, 1250].some(m => Math.abs(t - m) < 9 && !shots.find(s => s.m === m))) shots.push({ m: [350, 800, 1250].find(m => Math.abs(t - m) < 9), url: cv.toDataURL() }); last = ctx.getImageData(0, 0, cv.width, cv.height).data.slice(); if (t < 2100) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      const after = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let diffBA = 0; for (let i = 0; i < after.length; i += 4) if (Math.abs(after[i] - before[i]) > 24) diffBA++;
      return { n, shots, diffBA: diffBA / (after.length / 4), info: document.getElementById('infoT').textContent };
    }, [box.x + clickX * box.width, box.y + clickY * box.height]);
    console.log(name, 'frames', frames.n, 'final vs start pixels changed', frames.diffBA.toFixed(4), '|', frames.info);
    const fs = require('fs');
    frames.shots.forEach((s, i) => fs.writeFileSync(`fgn/gi_exp_${name}_${i}.png`, Buffer.from(s.url.split(',')[1], 'base64')));
  };
  await rec('d1', 0.72, 0.38);
  await p.click('#dT button:nth-child(3)'); await p.waitForTimeout(200);
  await rec('d2', 0.5, 0.5);
  await p.check('#tileT'); await p.waitForTimeout(900);
  await rec('d2tile', 0.42, 0.45);
  await p.uncheck('#tileT'); await p.waitForTimeout(900);
  await p.$eval('#exT', el => { el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await rec('d2ex', 0.5, 0.5);
  await p.$eval('#exT', el => { el.value = 0; el.dispatchEvent(new Event('input', { bubbles: true })); });
  // keyboard
  await p.focus('#cT'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  console.log('key hover:', await p.$eval('#infoT', e => e.textContent));
  // ---- lox: slider jump capped, play, deep frames
  await (await p.$('#cL')).scrollIntoViewIfNeeded();
  const t = await p.evaluate(async () => { const el = document.getElementById('uL'); el.value = 2000; el.dispatchEvent(new Event('input', { bubbles: true })); const t0 = performance.now(); while (!/e-9/.test(document.getElementById('uLv').textContent) || !/382/.test(document.getElementById('aLv').textContent)) { await new Promise(r => setTimeout(r, 50)); if (performance.now() - t0 > 30000) break; } return performance.now() - t0; });
  console.log('lox 0→20 catch-up s', (t / 1000).toFixed(1), await p.$eval('#aLv', e => e.textContent));
  await (await p.$('#lox .plate-body')).screenshot({ path: 'fgn/gi_lox2_end.png' });
  await p.click('#playL'); await p.waitForTimeout(3000);
  console.log('play after 3s:', await p.$eval('#aLv', e => e.textContent), await p.$eval('#uL', e => e.value), await p.$eval('#playL', e => e.textContent));
  await (await p.$('#cL')).screenshot({ path: 'fgn/gi_lox2_play.png' });
  await p.click('#playL');
  await p.click('#sideL button:nth-child(2)');
  await p.$eval('#uL', el => { el.value = 700; el.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(6000);
  await (await p.$('#cL')).screenshot({ path: 'fgn/gi_lox2_in7.png' });
  console.log('errors', errs);
  await b.close();
})();
