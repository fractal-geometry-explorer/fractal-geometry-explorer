const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  const shot = async (sel, name) => { await p.waitForTimeout(350); await (await p.$(sel)).screenshot({ path: `fgn/ds2_${name}.png` }); };
  const timed = async (fn) => { const t0 = Date.now(); await fn(); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); return Date.now() - t0; };
  // square sweep
  await (await p.$('#sq')).scrollIntoViewIfNeeded();
  await p.click('#sA button:nth-child(7)'); await p.check('#ownA'); await p.check('#hilA'); await shot('#wA', 'sq6');
  await p.click('#sA button:nth-child(13)'); await shot('#wA', 'sq12');
  console.log('A info:', await p.$eval('#infoA', e => e.textContent));
  await p.click('#sA button:nth-child(6)'); await shot('#wA', 'sq5');
  // plate 67
  await (await p.$('#p67')).scrollIntoViewIfNeeded();
  await p.check('#ownB'); await p.click('#sB button:nth-child(8)'); await shot('#wB', 'p67own8');
  await p.uncheck('#ownB');
  await p.$eval('#phB', e => { e.value = '700'; e.dispatchEvent(new Event('input')); }); await p.click('#sB button:nth-child(10)'); await shot('#wB', 'p67_70');
  await p.click('#sq45'); await shot('#wB', 'p67_45');
  let t = await timed(() => p.click('#sB button:nth-child(16)')); console.log('B stage16 ms', t);
  await p.click('#plate67'); await shot('#wB', 'p67print');
  // dragon
  await (await p.$('#dragon')).scrollIntoViewIfNeeded();
  t = await timed(() => p.click('#sC button:nth-child(19)')); console.log('C stage18 fill ms', t);
  await p.click('#mC button:nth-child(1)'); await p.click('#sC button:nth-child(7)'); await p.check('#ghostC'); await shot('#wC', 'curve6');
  await p.uncheck('#ghostC'); await p.click('#mC button:nth-child(3)'); await p.click('#sC button:nth-child(15)'); await shot('#wC', 'along14');
  await p.click('#mC button:nth-child(4)'); await p.click('#kC button:nth-child(3)'); await shot('#wC', 'copies8');
  await p.click('#preC button:nth-child(2)'); await p.click('#mC button:nth-child(2)'); await shot('#wC', 'polya');
  console.log('C:', await p.$eval('#cCt', e => e.textContent), '|', await p.$eval('#seqNote', e => e.textContent).catch(() => ''));
  await p.click('#preC button:nth-child(3)'); await shot('#wC', 'random');
  console.log('C random:', await p.$eval('#cCt', e => e.textContent), await p.$eval('#rCc', e => e.textContent));
  // twin
  await (await p.$('#twin')).scrollIntoViewIfNeeded();
  await shot('#wD', 'halves');
  await p.click('#mD button:nth-child(2)'); await shot('#wD', 'rep2');
  const box = await (await p.$('#wD')).boundingBox();
  await p.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.5); await shot('#wD', 'rep2pick');
  console.log('addr:', await p.$eval('#addrD', e => e.textContent));
  t = await timed(() => p.click('#kD button:nth-child(5)')); console.log('rep32 ms', t); await shot('#wD', 'rep32');
  await p.click('#mD button:nth-child(3)'); await shot('#wD', 'skin');
  await p.click('#mD button:nth-child(4)'); await shot('#wD', 'river');
  console.log('river:', await p.$eval('#kDv', e => e.textContent));
  await (await p.$('#twin > .plate-body')).screenshot({ path: 'fgn/ds2_twinsec.png' });
  console.log('errors', errs);
  await b.close();
})();
