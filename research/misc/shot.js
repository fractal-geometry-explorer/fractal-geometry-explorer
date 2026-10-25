const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [name, vp, scheme] of [['desk', {width:1280,height:1000}, 'light'], ['phone', {width:400,height:860}, 'dark']]) {
    const p = await b.newPage({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 1 });
    p.on('console', m => { if (m.type()==='error') errs.push(name+': '+m.text()); });
    p.on('pageerror', e => errs.push(name+': '+e.message));
    await p.goto('file://' + process.argv[2]);
    await p.waitForTimeout(800);
    await p.screenshot({ path: `../fgn/shot_${name}.png`, fullPage: true });
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(name, 'horizontal overflow px:', ow);
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
