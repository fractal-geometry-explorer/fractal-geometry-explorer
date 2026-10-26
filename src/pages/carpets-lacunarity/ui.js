(() => {

  const pow = Math.pow, sup = (n) => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x) => { if (x >= 0.001) return x.toFixed(x >= 0.1 ? 3 : 4); const [m, e] = x.toExponential(1).split('e'); return `${m}·10⁻${sup(-e)}`; };

  // the generators as small figures: the 7×7 grid with its tremas left white
  function carpetMini(id, holes) {
    $(id).innerHTML = `<rect x="0" y="0" width="7" height="7" fill="currentColor"/>` +
      holes.map((h) => `<rect x="${h % 7}" y="${Math.floor(h / 7)}" width="1" height="1" fill="#ecebe6"/>`).join('');
  }
  function dustMini(id, cols) {
    $(id).innerHTML = `<line x1="0" y1="0" x2="1" y2="0" stroke="#8a8a84" stroke-width="0.012" stroke-dasharray="0.03 0.022"/>` +
      cols.map((c) => `<line x1="${(c / 7).toFixed(4)}" y1="0" x2="${((c + 1) / 7).toFixed(4)}" y2="0" stroke="currentColor" stroke-width="0.055"/>`).join('') +
      `<g fill="currentColor">${cols.flatMap((c) => [c / 7, (c + 1) / 7]).map((x) => `<circle cx="${x.toFixed(4)}" cy="0" r="0.026"/>`).join('')}</g>`;
  }

  // ====================== Plate 318: the two carpets ======================
  // Each carpet draws from cached exact-occupancy images (stages 1–3, up to 343×343 px, one
  // image pixel per cell). Zoomed-in views upscale them with smoothing off, so every cell is a
  // crisp square; views past the cache's resolution recurse into the 40 kept cells first; and
  // detail finer than a pixel dims the ink by its area share (40/49 per missing stage) instead
  // of being drawn, so deep stages keep the printed density without millions of rectangles.
  const SIDES = {
    L: { mask: keepMask(HOLES_L), cache: {} },
    R: { mask: keepMask(HOLES_R), cache: {} },
  };
  for (const side of Object.values(SIDES)) {
    for (let k = 1; k <= 3; k++) {
      const n = pow(7, k), g = occupancy(side.mask, k);
      const cv = document.createElement('canvas');
      cv.width = cv.height = n;
      const cx = cv.getContext('2d'), img = cx.createImageData(n, n);
      for (let i = 0; i < n * n; i++) if (g[i]) { const o = 4 * i; img.data[o] = 21; img.data[o + 1] = 21; img.data[o + 2] = 21; img.data[o + 3] = 255; }
      cx.putImageData(img, 0, 0);
      side.cache[k] = cv;
    }
  }
  function drawCarpet(c, f, v, side, s, x0, y0, size, alpha = 1) {
    const X = v.ox + x0 * v.s, Y = v.oy - (y0 + size) * v.s, W = size * v.s;
    if (X > f.w || Y > f.h || X + W < 0 || Y + W < 0 || alpha < 0.004) return;
    c.fillStyle = PRINT.ink;
    if (s === 0) { c.globalAlpha = alpha; c.fillRect(X, Y, W, W); c.globalAlpha = 1; return; }
    const wpx = W * f.dpr;
    if (wpx < 1.6) { c.globalAlpha = alpha * pow(40 / 49, s); c.fillRect(X, Y, W, W); c.globalAlpha = 1; return; }
    if (s > 3 && wpx > 343) {
      const sub = size / 7;
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        if (side.mask[i * 7 + j]) drawCarpet(c, f, v, side, s - 1, x0 + j * sub, y0 + (6 - i) * sub, sub, alpha);
      }
      return;
    }
    const k = Math.max(1, Math.min(3, Math.min(s, Math.ceil(Math.log(Math.max(wpx, 7)) / Math.log(7)))));
    const img = side.cache[k];
    c.imageSmoothingEnabled = wpx < img.width;
    c.globalAlpha = alpha * pow(40 / 49, s - k);
    c.drawImage(img, X, Y, W, W);
    c.globalAlpha = 1; c.imageSmoothingEnabled = true;
  }
  const GAPX = 0.15;
  const stA = { mode: 'both', n: 2 };
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'left' || stA.mode === 'right') return fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.02, y1: 1.02 }, 0.02);
    return fitBox(f, { x0: -0.02, x1: 2.02 + GAPX, y0: -0.02, y1: 1.02 }, 0.02);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    if (stA.mode !== 'right') drawCarpet(c, f, v, SIDES.L, stA.n, 0, 0, 1);
    if (stA.mode !== 'left') drawCarpet(c, f, v, SIDES.R, stA.n, stA.mode === 'both' ? 1 + GAPX : 0, 0, 1);
  });
  const MODES_A = { both: 'Both, as printed', left: 'Left carpet', right: 'Right carpet' };
  const INFO_A = {
    both: 'Left, the tremas of each cell collapse into one 3×3 hole: big gaps at every scale, high lacunarity. Right, the same nine tremas are dealt out singly between the kept cells: the holes stay small, low lacunarity. Same b, same N, same D.',
    left: 'The lacunar carpet. The central hole of side 3/7 repeats in every kept cell, so the biggest gap at stage n has side 3·7⁻ⁿ⁺¹/7 — gaps "tend to be large" in exactly Mandelbrot\'s sense.',
    right: 'The spread-out carpet. No hole is ever wider than 7⁻ⁿ, and ink is never far away: the mass is dealt out almost evenly, the way the sky\'s galaxies look — fairly homogeneous except on fine scales.',
  };
  function setA(refit) {
    markMA(stA.mode); markSA(stA.n);
    const n = stA.n;
    $('cAt').textContent = MODES_A[stA.mode];
    $('cAn').textContent = n === 2 && stA.mode === 'both' ? 'stage 2, as the plate prints them' : `stage ${n}`;
    $('sAv').textContent = `stage ${n}`;
    $('infoA').innerHTML = INFO_A[stA.mode];
    $('rAa').textContent = fmt(pow(40, n));
    $('rAb').textContent = `7⁻${sup(n)} ≈ ${sci(pow(7, -n))}`;
    $('rAc').textContent = `(40/49)${sup(n)} ≈ ${pow(40 / 49, n).toFixed(3)}`;
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Draw: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markSA = stepButtons($('sA'), [0, 1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { stA.n = n; setA(false); });
  $('preset318').addEventListener('click', () => { Object.assign(stA, { mode: 'both', n: 2 }); setA(true); });
  carpetMini('miniAL', HOLES_L);
  carpetMini('miniAR', HOLES_R);

  // ====================== the mid-line dusts ======================
  const BAR_T = 0.035, PITCH = 0.08, BGAP = 0.22;
  const stB = { n: 5, win: false, t: 0.30, w: 2 / 7 };
  const blockH = () => stB.n * PITCH + BAR_T;
  const barsPath = (cols, n) => chunked(n + 1, (p, k) => {
    const { starts, len } = dustStarts(cols, k);
    for (const a of starts) p.rect(a, -(PITCH * k + BAR_T), len, BAR_T);
  }, 1);
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, { x0: -0.02, x1: 1.02, y0: -(2 * blockH() + BGAP + 0.02), y1: 0.09 }, 0.03), (f, v) => {
    const c = f.ctx, h = blockH();
    paper(f, PRINT.paper); toWorld(f, v);
    if (stB.win) {
      c.fillStyle = 'rgba(47,95,158,0.16)';
      c.fillRect(stB.t, -(2 * h + BGAP + 0.01), stB.w, 2 * h + BGAP + 0.065);
      c.strokeStyle = PRINT.accent; c.lineWidth = 1.2 / v.s;
      c.strokeRect(stB.t, -(2 * h + BGAP + 0.01), stB.w, 2 * h + BGAP + 0.065);
    }
    c.fillStyle = PRINT.ink;
    for (const p of barsPath(COLS_L, stB.n)) c.fill(p);
    toWorld(f, v); c.translate(0, -(h + BGAP));
    for (const p of barsPath(COLS_R, stB.n)) c.fill(p);
    toScreen(f);
    c.fillStyle = PRINT.muted; c.font = '600 12px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText('left carpet’s mid line · clumped', v.ox, v.oy - 0.02 * v.s);
    c.fillText('right carpet’s mid line · spread out', v.ox, v.oy + (h + BGAP - 0.02) * v.s);
  }, { onTap: (wx) => { if (stB.win && wx > -0.1 && wx < 1.1) { stB.t = Math.max(0, Math.min(1 - stB.w, wx - stB.w / 2)); $('tBs').value = stB.t / (1 - stB.w); setB(false); } } });
  function setB(refit) {
    markSB(stB.n); markWB(stB.w);
    $('winWrap').hidden = !stB.win;
    $('cBn').textContent = `stages 0 to ${stB.n} · N = 4, r = 1/7, D ≈ ${D_DUST.toFixed(4)}`;
    if (stB.win) {
      stB.t = Math.min(stB.t, 1 - stB.w);
      const mL = windowMass(stB.t, stB.w, COLS_L), mR = windowMass(stB.t, stB.w, COLS_R);
      $('tBv').textContent = `[${stB.t.toFixed(3)}, ${(stB.t + stB.w).toFixed(3)}]`;
      $('rBa').textContent = mL.toFixed(4);
      $('rBb').textContent = mR.toFixed(4);
      $('infoB').innerHTML = 'Slide the window (or tap the figure). On the clumped dust the mass swings from 0 over the big gap up to 1/2 on a clump; on the spread-out dust it hugs its average. Same window, same D — the texture is what differs.';
    } else {
      $('rBa').textContent = $('rBb').textContent = '—';
      $('infoB').innerHTML = 'Both dusts keep N = 4 pieces of r = 1/7 at every stage, so both have D = log 4/log 7. The clumped one leaves one central gap of 3/7; the spread-out one, three gaps of 1/7. Turn on the window to weigh them.';
    }
    $('rBc').textContent = D_DUST.toFixed(4);
    if (refit) zB.refit(); else zB.schedule();
  }
  const markSB = stepButtons($('sB'), [1, 2, 3, 4, 5, 6], String, (n) => `Stage ${n}`, (n) => { stB.n = n; setB(true); });
  const markWB = stepButtons($('wB2'), [2 / 7, 1 / 7, 2 / 49], (w) => ({ [2 / 7]: '2/7', [1 / 7]: '1/7', [2 / 49]: '2/49' }[w]), (w) => `Window width ${w}`, (w) => { stB.w = w; setB(false); });
  $('winB').addEventListener('change', (e) => { stB.win = e.target.checked; setB(false); });
  $('tBs').addEventListener('input', (e) => { stB.t = (+e.target.value) * (1 - stB.w); setB(false); });
  dustMini('miniBL', COLS_L);
  dustMini('miniBR', COLS_R);

  // ====================== measuring lacunarity ======================
  const stC = { mode: 'gaps', w: 2 / 7 };
  const J = 7;
  const STEPS_L = gapSteps(COLS_L, J), STEPS_R = gapSteps(COLS_R, J);
  const F_L = gapPrefactor(STEPS_L), F_R = gapPrefactor(STEPS_R);
  const histCache = {};
  const hist = (w) => histCache[w] || (histCache[w] = { L: massSamples(COLS_L, w), R: massSamples(COLS_R, w) });
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const ml = 56, mr = 14, mt = 14, mb = 36, iw = f.w - ml - mr, ih = f.h - mt - mb;
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, mt, iw, ih);
    c.font = '500 10.5px "IBM Plex Mono", monospace';
    if (stC.mode === 'gaps') {
      const lx0 = Math.log10(STEPS_R[STEPS_R.length - 1].len) - 0.2, lx1 = Math.log10(3 / 7) + 0.4;
      const ly0 = Math.log10(0.8), ly1 = Math.log10(STEPS_R[STEPS_R.length - 1].above) + 0.25;
      const X = (u) => ml + ((Math.log10(u) - lx0) / (lx1 - lx0)) * iw;
      const Y = (n) => mt + ih - ((Math.log10(n) - ly0) / (ly1 - ly0)) * ih;
      c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let e = Math.ceil(lx0); e <= Math.floor(lx1); e++) {
        const x = ml + ((e - lx0) / (lx1 - lx0)) * iw;
        c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(x, mt); c.lineTo(x, mt + ih); c.stroke();
        c.fillText(`10${e < 0 ? '⁻' : ''}${'⁰¹²³⁴⁵⁶⁷⁸⁹'[Math.abs(e)]}`, x, mt + ih + 6);
      }
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let e = 0; e <= Math.floor(ly1); e++) {
        const y = mt + ih - ((e - ly0) / (ly1 - ly0)) * ih;
        c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(ml, y); c.lineTo(ml + iw, y); c.stroke();
        c.fillText(`10${'⁰¹²³⁴⁵⁶⁷⁸⁹'[e]}`, ml - 6, y);
      }
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText('gap length u', ml + iw / 2, f.h - 15);
      c.save(); c.translate(14, mt + ih / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText('Nr(U > u)', 0, 0); c.restore();
      for (const [steps, F, color] of [[STEPS_L, F_L, PRINT.red], [STEPS_R, F_R, PRINT.accent]]) {
        c.strokeStyle = color; c.lineWidth = 1.3; c.setLineDash([6, 4]); c.beginPath();
        const uA = pow(10, lx1), uB = steps[steps.length - 1].len * 0.5;
        c.moveTo(X(uA), Y(Math.max(0.8, F * pow(uA, -D_DUST))));
        c.lineTo(X(uB), Y(Math.min(pow(10, ly1), F * pow(uB, -D_DUST))));
        c.stroke(); c.setLineDash([]);
        c.lineWidth = 2; c.beginPath();
        c.moveTo(X(steps[0].len * 2.2), Y(0.8));
        for (const g of steps) { c.lineTo(X(g.len), Y(Math.max(0.8, g.below))); c.lineTo(X(g.len), Y(g.above)); }
        c.lineTo(X(steps[steps.length - 1].len * 0.5), Y(steps[steps.length - 1].above));
        c.stroke();
      }
      c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.red; c.fillText(`clumped · F ≈ ${F_L.toFixed(3)}`, ml + 10, mt + 8);
      c.fillStyle = PRINT.accent; c.fillText(`spread out · F ≈ ${F_R.toFixed(3)}`, ml + 10, mt + 22);
      c.fillStyle = PRINT.muted; c.fillText(`slope −D = −${D_DUST.toFixed(4)}`, ml + 10, mt + 36);
    } else {
      const H = hist(stC.w), BINS = 36, xmax = Math.max(...H.L.vals, ...H.R.vals) * 1.08;
      const binsOf = (vals) => { const b = new Float64Array(BINS); for (const vv of vals) b[Math.min(BINS - 1, Math.floor((vv / xmax) * BINS))]++; for (let i = 0; i < BINS; i++) b[i] /= vals.length; return b; };
      const bL = binsOf(H.L.vals), bR = binsOf(H.R.vals);
      const ymax = Math.max(...bL, ...bR) * 1.15;
      const X = (u) => ml + (u / xmax) * iw, Y = (p) => mt + ih - (p / ymax) * ih;
      c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let k = 0; k <= 5; k++) {
        const u = (k / 5) * xmax, x = X(u);
        c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(x, mt); c.lineTo(x, mt + ih); c.stroke();
        c.fillText(u.toFixed(2), x, mt + ih + 6);
      }
      c.fillText('mass W found in the window', ml + iw / 2, f.h - 15);
      c.save(); c.translate(14, mt + ih / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText('share of windows', 0, 0); c.restore();
      for (const [b, mean, color, fill] of [[bL, H.L.mean, PRINT.red, 'rgba(194,69,45,0.30)'], [bR, H.R.mean, PRINT.accent, 'rgba(47,95,158,0.30)']]) {
        c.fillStyle = fill; c.strokeStyle = color; c.lineWidth = 1.5; c.beginPath();
        c.moveTo(X(0), Y(0));
        for (let i = 0; i < BINS; i++) { c.lineTo(X((i / BINS) * xmax), Y(b[i])); c.lineTo(X(((i + 1) / BINS) * xmax), Y(b[i])); }
        c.lineTo(X(xmax), Y(0)); c.closePath(); c.fill(); c.stroke();
        c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(mean), mt); c.lineTo(X(mean), mt + ih); c.stroke(); c.setLineDash([]);
      }
      c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.red; c.fillText('clumped', ml + 10, mt + 8);
      c.fillStyle = PRINT.accent; c.fillText('spread out', ml + 10, mt + 22);
      c.fillStyle = PRINT.muted; c.fillText('dashed: the mean ⟨W⟩', ml + 10, mt + 36);
    }
  });
  const MODES_C = { gaps: 'The gap census and F', spread: 'The spread of the mass' };
  const INFO_C = {
    gaps: 'Count the gaps longer than u, on log paper. Both censuses step along a line of slope −D, but the clumped dust’s stairs slide toward 4:30 o’clock: collapsing many gaps into one bigger one lowers the prefactor F. As lacunarity goes up, any sensibly defined prefactor goes down — so F measures it.',
    spread: 'Weigh the mass W in every window that hits the dust. The clumped dust’s masses spread from near 0 to 1/2; the spread-out dust’s crowd their mean. The chapter’s second moment ⟨(W/⟨W⟩−1)²⟩ — small when lacunarity is low, large when it is high — turns that spread into one number.',
  };
  function setC(refit) {
    markMC(stC.mode); markWC(stC.w);
    $('wCwrap').hidden = stC.mode !== 'spread';
    $('cCt').textContent = MODES_C[stC.mode];
    $('infoC').innerHTML = INFO_C[stC.mode];
    if (stC.mode === 'gaps') {
      $('cCn').textContent = `generations 1 to ${J} of both dusts`;
      $('tCa').textContent = 'F, clumped'; $('rCa').textContent = F_L.toFixed(3);
      $('tCb').textContent = 'F, spread out'; $('rCb').textContent = F_R.toFixed(3);
      $('tCc').textContent = 'Slope'; $('rCc').textContent = `−D ≈ −${D_DUST.toFixed(3)}`;
      $('tCd').textContent = 'Gaps per stage'; $('rCd').textContent = '1 vs 3';
    } else {
      const H = hist(stC.w);
      $('cCn').textContent = `window width ${{ [2 / 7]: '2/7', [1 / 7]: '1/7', [2 / 49]: '2/49' }[stC.w]}, windows that hit the dust`;
      $('tCa').textContent = '⟨(W/⟨W⟩−1)²⟩, clumped'; $('rCa').textContent = H.L.l2.toFixed(3);
      $('tCb').textContent = '⟨(W/⟨W⟩−1)²⟩, spread'; $('rCb').textContent = H.R.l2.toFixed(3);
      $('tCc').textContent = '⟨W⟩, clumped'; $('rCc').textContent = H.L.mean.toFixed(3);
      $('tCd').textContent = '⟨W⟩, spread'; $('rCd').textContent = H.R.mean.toFixed(3);
    }
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(true); });
  const markWC = stepButtons($('wC2'), [2 / 7, 1 / 7, 2 / 49], (w) => ({ [2 / 7]: '2/7', [1 / 7]: '1/7', [2 / 49]: '2/49' }[w]), (w) => `Window width ${w}`, (w) => { stC.w = w; setC(false); });

  setA(true); setB(true); setC(true);
})();
