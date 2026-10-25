const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await (await p.$('#twin')).scrollIntoViewIfNeeded();
  const out = async (name) => { await p.waitForTimeout(350); console.log(name, '|', (await p.$eval('#addrD', e => e.innerText)).replace(/\n/g, ' / ')); };
  for (const [i, name] of [[1, 'ex_0(1)'], [2, 'ex_1'], [3, 'ex_0.0(001)'], [4, 'ex_000001'], [5, 'ex_corner'], [6, 'ex_11.1']]) {
    await p.click(`#numEx button:nth-child(${i})`); await out(name);
    await (await p.$('#twin > .plate-body')).screenshot({ path: `fgn/num_${i}.png` });
  }
  await p.fill('#numIn', '0.111…'); await p.press('#numIn', 'Enter'); await out('ellipsis');
  await p.fill('#numIn', '12.3'); await p.press('#numIn', 'Enter'); await out('bad');
  await p.fill('#numIn', '1110.(100)'); await p.press('#numIn', 'Enter'); await out('corner2');
  await p.click('#mD button:nth-child(2)'); await p.click('#numEx button:nth-child(3)'); await out('replicas+num');
  await (await p.$('#wD')).screenshot({ path: 'fgn/num_rep.png' });
  const box = await (await p.$('#wD')).boundingBox();
  await p.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.45); await out('click');
  await (await p.$('#wD')).screenshot({ path: 'fgn/num_click.png' });
  await p.mouse.click(box.x + box.width * 0.95, box.y + box.height * 0.1); await out('click outside');
  await p.fill('#numIn', ''); await p.press('#numIn', 'Enter'); await out('empty');
  console.log('errors', errs);
  await b.close();
})();
