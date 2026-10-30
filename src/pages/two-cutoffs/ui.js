(() => {
  const pow = Math.pow;
  const sup = (n) => (n < 0 ? '⁻' : '') + String(Math.abs(n)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const small = (x) => {
    if (x >= 0.01) return x.toPrecision(3);
    const [m, e] = x.toExponential(1).split('e');
    return `${m}·10${sup(+e)}`;
  };
  const pct = (x) => `${(100 * x).toFixed(x >= 0.1 ? 0 : 2)}%`;

  const chunkCache = [];
  const chunksOf = (k) => chunkCache[k] || (chunkCache[k] = strokeChunks(koch(k)));
  const strokeAll = (c, k) => { for (const p of chunksOf(k)) c.stroke(p); };

  miniCurve('miniA', KOCH_P);

  // ====================== 1: strokes between the cutoffs ======================
  const stA = { k: 4, pen: 1.5 };
  // the scale ledger: a log axis of lengths, the drawing's range [ε, Ω] over the screen's [pixel, frame]
  function ledger(f, v, eps) {
    const c = f.ctx, H = 58, y0 = f.h - H;
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    c.fillStyle = 'rgba(236,235,230,0.94)'; c.fillRect(0, y0, f.w, H);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, y0 + 0.5); c.lineTo(f.w, y0 + 0.5); c.stroke();
    const lo = -7, hi = Math.log10(3);
    const X = (len) => 10 + ((Math.log10(Math.max(len, 1e-9)) - lo) / (hi - lo)) * (f.w - 20);
    c.font = '500 9.5px "IBM Plex Mono", monospace';
    c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let e = 0; e >= -7; e--) {
      const x = X(pow(10, e));
      c.fillRect(x - 0.5, y0 + 41, 1, 3);
      c.fillText(e === 0 ? '1' : '10' + sup(e), x, y0 + 46);
    }
    const frame = f.w / v.s, px = 1 / v.s;
    const bar = (a, b, y, col) => { const x0 = X(a), x1 = Math.max(X(b), x0 + 2); c.fillStyle = col; c.fillRect(x0, y, x1 - x0, 7); };
    bar(eps, 1, y0 + 12, PRINT.ink);                 // what the drawing carries
    bar(px, frame, y0 + 26, PRINT.gray);             // what the screen shows
    const oa = Math.max(eps, px), ob = Math.min(1, frame);
    if (ob > oa) { bar(oa, ob, y0 + 12, PRINT.accent); bar(oa, ob, y0 + 26, PRINT.accent); }
    c.fillStyle = PRINT.muted; c.textBaseline = 'alphabetic';
    c.fillText('ε', X(eps), y0 + 10); c.fillText('Ω', X(1), y0 + 10);
    c.textBaseline = 'top';
    c.fillText('pixel', Math.max(16, X(px)), y0 + 34); c.fillText('frame', Math.min(f.w - 18, X(frame)), y0 + 34);
  }
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.26, y1: 0.36 }, 0.03), (f, v) => {
    paper(f, PRINT.paper); toWorld(f, v);
    const c = f.ctx;
    c.strokeStyle = PRINT.ink; c.lineWidth = stA.pen / v.s; c.lineJoin = 'round'; c.lineCap = 'round';
    strokeAll(c, stA.k);
    ledger(f, v, pow(3, -stA.k));
    toScreen(f);
    infoA(f, v);
  });
  function infoA(f, v) {
    const eps = pow(3, -stA.k), px = 1 / v.s, frame = f.w / v.s;
    let t;
    if (frame < eps * 1.5 && stA.k > 0) t = 'You are beneath the inner cutoff: nothing left here but a straight stroke. Past ε the drawing is Euclid, exactly as the chapter warns.';
    else if (eps <= px) t = `The inner cutoff is below a screen pixel (ε ≈ ${small(eps)}, a pixel ≈ ${small(px)}): no deeper stage could change what you see. ${fmt(pow(4, stA.k))} strokes satisfy the eye.`;
    else t = `ε spans about ${fmt(Math.round(eps / px))} pixels: the strokes show, and the picture reads as a sketch of the curve rather than the curve.`;
    $('infoA').textContent = t;
  }
  function setA(refit) {
    markSA(stA.k);
    $('sAv').textContent = `stage ${stA.k}`;
    $('penAv').textContent = `${stA.pen} px`;
    $('cAn').textContent = `stage ${stA.k} · ${fmt(pow(4, stA.k))} strokes of length 3${sup(-stA.k)}`;
    $('rAa').textContent = fmt(pow(4, stA.k));
    $('rAb').textContent = stA.k ? `3${sup(-stA.k)} ≈ ${small(pow(3, -stA.k))}` : '1 (the initiator)';
    $('rAc').textContent = `${pow(4 / 3, stA.k).toPrecision(3)}× the base`;
    $('rAd').textContent = `${(stA.k * Math.log10(3)).toFixed(1)} decades`;
    if (refit) zA.refit(); else zA.schedule();
  }
  const markSA = stepButtons($('sA'), [0, 1, 2, 3, 4, 5, 6, 7, 8], String, (n) => `Stage ${n}`, (n) => { stA.k = n; setA(false); });
  $('penA').addEventListener('input', (e) => { stA.pen = +e.target.value; setA(false); });
  $('pA1').addEventListener('click', () => {
    const s = (zA.z.view && zA.z.view.s) || 700;
    stA.k = Math.min(8, Math.floor(Math.log(s) / Math.log(3)) + 1);
    setA(true);
  });
  $('pA2').addEventListener('click', () => { stA.k = 3; setA(true); });
  $('pA3').addEventListener('click', () => { stA.k = 0; setA(true); });

  // ====================== 2: to see is to believe, down to a pixel ======================
  const MODES_B = { a: 'Stage k', b: 'Stage k + 3', diff: 'Difference' };
  const stB = { k: 3, mode: 'diff' };
  let offA = null, offB = null, offD = null;
  // draw both stages at screen resolution in the current view and compare pixel by pixel;
  // when paint is true, the classified difference image replaces the canvas contents
  function computePair(f, v, k, paint) {
    const w = Math.max(1, Math.round(f.w)), h = Math.max(1, Math.round(f.h));
    offA = offA || document.createElement('canvas');
    offB = offB || document.createElement('canvas');
    const d = [];
    [[offA, k], [offB, k + 3]].forEach(([cv, s]) => {
      cv.width = w; cv.height = h;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.setTransform(v.s, 0, 0, -v.s, v.ox, v.oy);
      c.strokeStyle = '#000'; c.lineWidth = 1.25 / v.s; c.lineJoin = 'round'; c.lineCap = 'round';
      strokeAll(c, s);
      c.setTransform(1, 0, 0, 1, 0, 0);
      d.push(c.getImageData(0, 0, w, h).data);
    });
    const [d1, d2] = d;
    let only1 = 0, only2 = 0;
    const img = paint ? new ImageData(w, h) : null, px = paint ? img.data : null;
    for (let i = 0, n = w * h; i < n; i++) {
      const a = d1[4 * i] < 140, b = d2[4 * i] < 140;
      if (a !== b) { if (a) only1++; else only2++; }
      if (paint) {
        const j = 4 * i;
        let r = 236, g = 235, bl = 230;                       // paper
        if (a && b) { r = 154; g = 152; bl = 143; }           // both: gray
        else if (a) { r = 47; g = 95; bl = 158; }             // only stage k: accent blue
        else if (b) { r = 194; g = 69; bl = 45; }             // only stage k + 3: red
        px[j] = r; px[j + 1] = g; px[j + 2] = bl; px[j + 3] = 255;
      }
    }
    if (paint) {
      offD = offD || document.createElement('canvas');
      offD.width = w; offD.height = h;
      offD.getContext('2d').putImageData(img, 0, 0);
      const c = f.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.imageSmoothingEnabled = false;
      c.drawImage(offD, 0, 0, f.canvas.width, f.canvas.height);
      c.imageSmoothingEnabled = true;
    }
    return { only1, only2, total: w * h };
  }
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.1, y1: 0.4 }, 0.03), (f, v) => {
    const res = computePair(f, v, stB.k, stB.mode === 'diff');
    if (stB.mode !== 'diff') {
      paper(f, PRINT.paper); toWorld(f, v);
      const c = f.ctx;
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.25 / v.s; c.lineJoin = 'round'; c.lineCap = 'round';
      strokeAll(c, stB.mode === 'a' ? stB.k : stB.k + 3);
    }
    toScreen(f);
    readB(res, f, v);
  });
  function readB(res, f, v) {
    const eps = pow(3, -stB.k), px = 1 / v.s, diff = res.only1 + res.only2;
    $('cBn').textContent = `stage ${stB.k} against stage ${stB.k + 3} · ${fmt(diff)} pixels differ in this view`;
    $('rBa').textContent = `3${sup(-stB.k)} ≈ ${small(eps)}`;
    $('rBb').textContent = `3${sup(-(stB.k + 3))} ≈ ${small(eps / 27)}`;
    $('rBc').textContent = `${fmt(diff)} (${pct(diff / res.total)})`;
    $('rBd').textContent = `${small(px)} of the base`;
    $('infoB').textContent = eps <= px
      ? `Stage ${stB.k}'s inner cutoff is already below a pixel in this view: three stages deeper changes ${pct(diff / res.total)} of the pixels, and what lingers is antialiasing along shared edges. The picture is final.`
      : `Stage ${stB.k}'s shortest strokes span about ${fmt(Math.round(eps / px))} pixels each: the deeper drawing redraws them all, and the difference view lights up. Carry the stage higher, or zoom out, and the disagreement dies.`;
  }
  function setB() {
    markMB(stB.mode); markSB(stB.k);
    $('sBv').textContent = `stage ${stB.k}`;
    $('cBt').textContent = MODES_B[stB.mode];
    zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(); });
  const markSB = stepButtons($('sB'), [0, 1, 2, 3, 4, 5, 6], String, (n) => `Stage ${n}`, (n) => { stB.k = n; setB(); });

  setA(false);
  setB();
})();
