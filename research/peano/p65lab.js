const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 520, height: 520 } });
  await p.goto('file://' + process.argv[2]);
  const jobs = JSON.parse(process.argv[3]);
  for (const [th, n, rule, mode, lam, name] of jobs) {
    const url = await p.evaluate(([th, n, rule, mode, lam]) => mode === 'four' ? window.render4(th, n, lam, rule.startsWith('in'), rule.split(':')[1]) : window.render(th, n, rule, mode, lam), [th, n, rule, mode, lam]);
    fs.writeFileSync(`/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/lab_${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
})();
