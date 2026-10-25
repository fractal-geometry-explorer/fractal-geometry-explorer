// Smoke test for every built page: no script errors, no horizontal scroll at phone width, and each
// canvas actually draws something. Run after `python3 tools/build.py`:
//   node tests/smoke.cjs   (needs Playwright: `npm i -D playwright`, or a global install with NODE_PATH=$(npm root -g))
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = JSON.parse(readFileSync(path.join(root, 'src/pages.json'), 'utf8')).pages;
(async () => {
const browser = await chromium.launch();
let failed = 0;
for (const p of pages) {
  const url = 'file://' + path.join(root, 'site', `${p.slug}.html`);
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const uniform = (c) => {
        if (!c.width || !c.height) return { blank: true, clear: false };
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        for (let i = 4; i < d.length; i += 4 * 97) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2] || d[i + 3] !== d[3]) return { blank: false };
        return { blank: true, clear: d[3] === 0 };
      };
      // a fully transparent canvas stacked on a drawn sibling is an overlay waiting for input, not a failure
      const blank = [...document.querySelectorAll('canvas')].filter((c) => {
        const u = uniform(c);
        if (!u.blank) return false;
        if (u.clear) return ![...c.parentElement.querySelectorAll(':scope > canvas')].some((o) => o !== c && !uniform(o).blank);
        return true;
      }).length;
      return { overflow: de.scrollWidth - de.clientWidth, canvases: document.querySelectorAll('canvas').length, blank };
    });
    const ok = !errors.length && r.overflow <= 1 && r.blank === 0;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${p.slug} @${vp.width}px  canvases=${r.canvases} blank=${r.blank} overflow=${r.overflow}${errors.length ? '  errors: ' + errors.join(' | ') : ''}`);
    await page.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
})();
