const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await (await p.$('#cL')).scrollIntoViewIfNeeded();
  // step u directly through the page's own slider with motion settled, and compare consecutive frames
  const res = await p.evaluate(async () => {
    const el = document.getElementById('uL'), cv = document.getElementById('cL'), ctx = cv.getContext('2d');
    const wait = () => new Promise(r => setTimeout(r, 0));
    const grab = () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data; const ink = new Uint8Array(d.length / 4); for (let i = 0; i < ink.length; i++) ink[i] = d[4 * i] < 80 ? 1 : 0; return ink; };
    const out = []; let prev = null;
    for (let v = 1800; v <= 2000; v += 2) {
      el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
      for (let k = 0; k < 90; k++) { await new Promise(r => requestAnimationFrame(r)); }
      const g = grab(); let land = 0, diff = 0;
      for (let i = 0; i < g.length; i++) { land += g[i]; if (prev && g[i] !== prev[i]) diff++; }
      out.push([v / 100, +(land / g.length).toFixed(3), prev ? +(diff / g.length).toFixed(3) : 0]);
      prev = g;
    }
    return out;
  });
  const spikes = res.filter(r => r[2] > 0.08);
  console.log('frames', res.length, 'land fraction range', Math.min(...res.map(r => r[1])), Math.max(...res.map(r => r[1])), 'max frame diff', Math.max(...res.map(r => r[2])));
  console.log('spikes (>8% pixels flipped):', JSON.stringify(spikes.slice(0, 15)));
  await b.close();
})();
