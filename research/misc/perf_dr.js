const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  await p.setContent('<canvas id="c" width="1200" height="960"></canvas>');
  await p.addScriptTag({ content: fs.readFileSync(process.argv[2] + '/code/dragon/core.js', 'utf8') + ';window.dragon=dragon;' });
  const r = await p.evaluate(() => {
    const out = [];
    const c = document.getElementById('c').getContext('2d');
    for (const n of [14, 16, 18]) {
      const P = dragon(new Array(20).fill(1), n, 1, 0, 0, 0), m = P.length / 2 - 1;
      for (const size of [2048, 8192, 32768]) {
        for (const stroke of [0, 1]) {
          const paths = []; let pp = null;
          for (let i = 0; i < m; i++) {
            if (i % size === 0) { pp = new Path2D(); paths.push(pp); }
            const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3], hx = (bx - ax) / 2, hy = (by - ay) / 2, mx = ax + hx, my = ay + hy;
            pp.moveTo(ax, ay); pp.lineTo(mx - hy, my + hx); pp.lineTo(bx, by); pp.lineTo(mx + hy, my - hx); pp.closePath();
          }
          c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#eee'; c.fillRect(0, 0, 1200, 960);
          c.setTransform(700, 0, 0, -700, 400, 500); c.fillStyle = '#111'; c.strokeStyle = '#111'; c.lineWidth = 0.8 / 700;
          const t0 = performance.now();
          for (const q of paths) { c.fill(q); if (stroke) c.stroke(q); }
          c.getImageData(0, 0, 1, 1);
          out.push(`n${n} size${size} stroke${stroke}: ${Math.round(performance.now() - t0)} ms`);
        }
      }
    }
    return out;
  });
  console.log(r.join('\n'));
  await b.close();
})();
