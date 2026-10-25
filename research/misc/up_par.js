const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const page = fs.readFileSync(process.argv[2], 'utf8');
  const par = fs.readFileSync(process.argv[3], 'utf8');
  for (const parity of [-1, 0, 1]) {
    const js = par.replace("renderLand(f, v, st57.G, epsOf(st57.e, 0.0025), st57.depth, ['k57a', 'k57b'])", `renderLand(f, v, st57.G, epsOf(st57.e, 0.0025), st57.depth, ['k57a', 'k57b'], ${parity})`)
      .replace("function renderLand(f, v, G, eps, byDepth, keyIds) {\n    const c = f.ctx, cv = buildCurve(G, eps, v, f, 0.6);", "function renderLand(f, v, G, eps, byDepth, keyIds, parity = -1) {\n    const c = f.ctx, cv = buildCurve(G, eps, v, f, 0.6, parity);");
    const html = page.replace(/<script>[\s\S]*<\/script>/, () => '<script>' + js + '</script>');
    fs.writeFileSync('/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/preview_par.html', html);
    await p.goto('file:///tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/preview_par.html'); await p.waitForTimeout(1500);
    for (const v of [70, 85]) {
      await p.$eval('#e57', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v); await p.waitForTimeout(500);
      const el = await p.$('#c57'); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `fgn/par_${parity}_${v}.png` });
    }
  }
  await b.close();
})();
