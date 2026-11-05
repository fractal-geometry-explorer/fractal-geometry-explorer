// Capture a thumbnail for every page from its own first drawn figure, for the index.
// Run after `python3 tools/build.py`:  node tools/thumbs.cjs [slug ...]
// Writes src/thumbs/<slug>.webp (committed; the build copies them to site/thumbs/).
// Needs Playwright and Pillow (both preinstalled in Claude's cloud sessions).
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const { readFileSync, mkdirSync, rmSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'src', 'thumbs');
mkdirSync(outDir, { recursive: true });
const all = JSON.parse(readFileSync(path.join(root, 'src/pages.json'), 'utf8')).pages;
const only = process.argv.slice(2);
const pages = only.length ? all.filter((p) => only.includes(p.slug)) : all;

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  for (const p of pages) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + path.join(root, 'site', `${p.slug}.html`));
    await page.waitForTimeout(2200);
    // zoom buttons, sliders and readout strips sit on top of the canvases; keep them out of the shot
    await page.addStyleTag({ content: 'figure .view-tools, figure button, figure input, figure .hud, figure figcaption { visibility: hidden !important; }' });
    // the first figure whose canvas (or svg/img) has actually drawn something
    const box = await page.evaluate(() => {
      const drawn = (c) => {
        try {
          if (!c.width || !c.height) return false;
          const ctx = c.getContext('2d');
          if (!ctx) return c.toDataURL().length > 2000; // webgl: a non-trivial frame
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          for (let i = 4; i < d.length; i += 4 * 97)
            if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2] || d[i + 3] !== d[3]) return true;
          return false;
        } catch { return true; }
      };
      const figs = [...document.querySelectorAll('figure')];
      for (const f of figs) {
        const r = f.getBoundingClientRect();
        if (r.width < 120 || r.height < 90) continue;
        const cs = [...f.querySelectorAll('canvas')];
        const ok = cs.length ? cs.some(drawn) : !!f.querySelector('svg, img');
        if (!ok) continue;
        // crop to the drawn canvas itself, not the figure, to leave out toolbars and readout strips
        const target = cs.find(drawn) || f;
        target.scrollIntoView({ block: 'center' });
        const b = target.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      }
      return null;
    });
    if (!box) {
      console.log(`FAIL ${p.slug}  no drawn figure${errors.length ? '  errors: ' + errors.join(' | ') : ''}`);
      failed++; await page.close(); continue;
    }
    // crop to 8:5 around the figure's centre so every thumbnail shelves alike
    const AR = 8 / 5;
    let { x, y, width: w, height: h } = box;
    if (w / h > AR) { const nw = h * AR; x += (w - nw) / 2; w = nw; }
    else { const nh = w / AR; y += (h - nh) / 2; h = nh; }
    const clip = { x: Math.max(0, x), y: Math.max(0, y), width: w, height: h };
    const png = path.join(outDir, `${p.slug}.png`);
    await page.screenshot({ path: png, clip });
    execFileSync('python3', ['-c',
      'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "WEBP", quality=82, method=6)',
      png, path.join(outDir, `${p.slug}.webp`)]);
    rmSync(png);
    console.log(`ok   ${p.slug}  ${Math.round(w)}x${Math.round(h)}`);
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
