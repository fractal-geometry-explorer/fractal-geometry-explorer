const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [file, tag] of [[process.argv[2], 'new'], [process.argv[3], 'old']]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await p.goto('file://' + file); await p.waitForTimeout(1500);
    await p.check('#d56'); await p.$eval('#e56', el => { el.value = 60; el.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(300);
    await (await p.$('#w56')).scrollIntoViewIfNeeded();
    const bx = await (await p.$('#w56')).boundingBox();
    for (let i = 0; i < 4; i++) { await p.mouse.dblclick(bx.x + bx.width * 0.62, bx.y + bx.height * 0.42); await p.waitForTimeout(350); }
    await p.waitForTimeout(500);
    await (await p.$('#c56')).screenshot({ path: `fgn/zf2_${tag}.png` });
    await p.close();
  }
  await b.close();
})();
