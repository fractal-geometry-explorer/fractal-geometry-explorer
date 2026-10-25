const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  await p.check('#d56'); await p.waitForTimeout(300);
  const w = await (await p.$('#w56')).boundingBox();
  // zoom toward the right flank of the big triangle, several steps, by Ctrl+wheel at a fixed point
  await (await p.$('#w56')).scrollIntoViewIfNeeded();
  const bx = await (await p.$('#w56')).boundingBox();
  for (let i = 0; i < 6; i++) { await p.mouse.move(bx.x + bx.width * 0.62, bx.y + bx.height * 0.45); await p.keyboard.down('Control'); await p.mouse.wheel(0, -300); await p.keyboard.up('Control'); await p.waitForTimeout(120); }
  await p.waitForTimeout(600);
  await (await p.$('#c56')).screenshot({ path: 'fgn/zf_56.png' });
  await p.$eval('#e56', el => { el.value = 25; el.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(600);
  await (await p.$('#c56')).screenshot({ path: 'fgn/zf_56coarse.png' });
  const p2 = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p2.on('pageerror', e => errs.push('qi: ' + e.message));
  await p2.goto('file://' + process.argv[3]); await p2.waitForTimeout(1500);
  await p2.click('#s53 button:nth-child(1)'); await (await p2.$('#w53')).scrollIntoViewIfNeeded();
  const b2 = await (await p2.$('#w53')).boundingBox();
  for (let i = 0; i < 6; i++) { await p2.mouse.move(b2.x + b2.width * 0.3, b2.y + b2.height * 0.3); await p2.keyboard.down('Control'); await p2.mouse.wheel(0, -300); await p2.keyboard.up('Control'); await p2.waitForTimeout(120); }
  await p2.waitForTimeout(600);
  await (await p2.$('#c53')).screenshot({ path: 'fgn/zf_53s0.png' });
  console.log('errors', errs);
  await b.close();
})();
