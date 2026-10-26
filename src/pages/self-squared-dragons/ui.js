(() => {
  const sup = (n) => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const f2 = (x, k = 4) => Number(x.toFixed(k)).toString();
  const cplx = (re, im, k = 4) => `${f2(re, k)} ${im < 0 ? '−' : '+'} ${f2(Math.abs(im), k)}i`;
  const muOf = (lr, li) => MU(lr, li);

  // raster canvases: an ImageData at CSS resolution, cached while the view and mode hold
  function rasterFig(wrapId, canvasId, fitOf, key, make, overlay, opts = {}) {
    const cache = { key: '', cv: null };
    const z = zoomable(wrapId, canvasId, fitOf, (f, v) => {
      const W = Math.max(1, Math.round(f.w)), H = Math.max(1, Math.round(f.h));
      const k = `${key()}|${W}|${H}|${v.s.toFixed(4)}|${v.ox.toFixed(2)}|${v.oy.toFixed(2)}`;
      if (cache.key !== k) {
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const img = cv.getContext('2d').createImageData(W, H);
        make(img, v);
        cv.getContext('2d').putImageData(img, 0, 0);
        cache.key = k; cache.cv = cv;
      }
      const c = f.ctx;
      c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      c.imageSmoothingEnabled = true;
      c.drawImage(cache.cv, 0, 0, f.w, f.h);
      if (overlay) overlay(f, v);
      toScreen(f);
    }, opts);
    return z;
  }
  // how much deeper to iterate as the view dives
  const zoomIter = (base, v) => Math.min(3500, Math.round(base * (1 + 0.45 * Math.max(0, Math.log2(v.s / (v.fit || v.s))))));

  // ====================== Pages 180-182: the inverted V ======================
  const stV = { map: 'v', p: 1 / 3, x0: 0.74, steps: 20 };
  const fV = (x) => stV.map === 'v' ? (0.5 - Math.abs(x - 0.5)) / stV.p : stV.p * x * (1 - x);
  const zV = zoomable('wV', 'cV', (f) => fitBox(f, { x0: -0.1, x1: 1.1, y0: -0.52, y1: 1.6 }, 0.03), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    const lw = (w) => { c.lineWidth = w / v.s; };
    // unit square and diagonal
    c.strokeStyle = PRINT.rule; lw(1);
    c.strokeRect(0, 0, 1, 1);
    c.beginPath(); c.moveTo(-0.08, -0.08); c.lineTo(1.35, 1.35); c.stroke();
    // axis
    c.strokeStyle = PRINT.muted; lw(1.2);
    c.beginPath(); c.moveTo(-0.1, 0); c.lineTo(1.1, 0); c.stroke();
    // survival rows: the points whose first k iterates stay in [0, 1]
    const ROWS = 5, N = 1100;
    for (let k = 1; k <= ROWS; k++) {
      const y = -0.1 - 0.075 * k;
      c.strokeStyle = PRINT.ink; lw(5);
      c.beginPath();
      let run = false;
      for (let i = 0; i <= N; i++) {
        const x = i / N;
        let t = x, ok = true;
        for (let s = 0; s < k; s++) { t = fV(t); if (t < 0 || t > 1) { ok = false; break; } }
        if (ok && !run) { c.moveTo(x, y); run = true; }
        else if (!ok && run) { c.lineTo((i - 0.5) / N, y); run = false; }
      }
      if (run) c.lineTo(1, y);
      c.stroke();
    }
    // the graph, clipped just under the axis so it stays off the survival rows
    c.strokeStyle = PRINT.accent; lw(2.2);
    c.beginPath();
    let pen = false;
    for (let i = 0; i <= 320; i++) {
      const x = -0.08 + 1.26 * i / 320, y = fV(x);
      if (y < -0.07) { pen = false; continue; }
      if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
    }
    c.stroke();
    // cobweb
    let x = stV.x0, y = 0;
    c.strokeStyle = PRINT.red; lw(1.5);
    c.beginPath(); c.moveTo(x, 0);
    for (let s = 0; s < stV.steps; s++) {
      const fx = fV(x);
      c.lineTo(x, fx);
      if (fx < -0.5 || fx > 1.62) { y = fx; break; }
      c.lineTo(fx, fx);
      x = fx; y = fx;
      if (x < -0.5) break;
    }
    c.stroke();
    dot(c, { ox: v.ox, oy: v.oy, s: v.s }, stV.x0, 0, 4, PRINT.red);
    toScreen(f);
  }, { onTap: (wx) => { if (wx >= 0 && wx <= 1) { stV.x0 = wx; $('xVs').value = wx; setV(false); } } });

  const MODES_V = { v: 'Inverted V', q: 'Squaring λx(1−x)' };
  function setV(refit) {
    markMV(stV.map); markSV(stV.steps);
    const isV = stV.map === 'v';
    $('pVl').textContent = isV ? 'Ratio r' : 'λ';
    $('pVs').min = isV ? 0.18 : 1; $('pVs').max = isV ? 0.5 : 4.6; $('pVs').value = stV.p;
    $('pVv').textContent = isV ? (Math.abs(stV.p - 1 / 3) < 0.002 ? '1/3' : f2(stV.p, 3)) : f2(stV.p, 3);
    $('xVv').textContent = f2(stV.x0, 3);
    $('sVv').textContent = String(stV.steps);
    $('dimV').textContent = isV
      ? 'f(x) = {½ − |x − ½|} / r · the largest bounded invariant set is a Cantor dust'
      : 'f(x) = λx(1−x), the squaring generator · for λ > 4 the invariant set is the Fatou dust of Plate 192';
    $('cVt').textContent = MODES_V[stV.map];
    $('cVn').textContent = isV ? `r = ${$('pVv').textContent}: peak ${f2(0.5 / stV.p, 3)}` : `λ = ${f2(stV.p, 3)}: peak ${f2(stV.p / 4, 3)}`;
    // fate of x0
    let x = stV.x0, leave = 0, fate = 'stays in [0, 1]';
    for (let s = 1; s <= 4000; s++) { x = fV(x); if ((x < 0 || x > 1) && !leave) leave = s; if (x < -1e100) break; }
    if (leave) fate = 'runs to −∞';
    $('rVa').textContent = fate;
    $('rVb').textContent = leave ? String(leave) : 'never (within 4000)';
    const D = isV ? Math.log(2) / Math.log(1 / stV.p) : (stV.p > 4 ? Math.log(2) / Math.log(stV.p) : 1);
    $('rVc').textContent = isV ? f2(D, 4) : (stV.p > 4 ? `≈ ${f2(D, 4)}` : '— (not a dust)');
    $('rVd').textContent = isV ? f2(0.5 / stV.p, 4) : f2(stV.p / 4, 4);
    $('infoV').innerHTML = leave
      ? `x₀ = ${f2(stV.x0, 3)} stays ${leave - 1} step${leave === 2 ? '' : 's'} before leaving [0, 1]; from there every iterate falls below 0 and the orbit "proceeds directly to −∞".`
      : `x₀ = ${f2(stV.x0, 3)} never leaves [0, 1]: it belongs to the invariant set. The rows under the graph are the survivors of 1 to 5 steps — the construction stages of the dust.`;
    if (refit) zV.refit(); else zV.schedule();
  }
  const markMV = stepButtons($('mV'), Object.keys(MODES_V), (k) => MODES_V[k], (k) => MODES_V[k], (k) => {
    stV.map = k; stV.p = k === 'v' ? 1 / 3 : 4.2; setV(true);
  });
  const markSV = stepButtons($('sV'), [5, 10, 20, 40], String, (n) => `${n} iterations`, (n) => { stV.steps = n; setV(false); });
  $('pVs').addEventListener('input', () => { stV.p = +$('pVs').value; setV(false); });
  $('xVs').addEventListener('input', () => { stV.x0 = +$('xVs').value; setV(false); });
  $('presetV').addEventListener('click', () => { Object.assign(stV, { map: 'v', p: 1 / 3, x0: 0.74, steps: 20 }); setV(true); });
  $('presetV2').addEventListener('click', () => { Object.assign(stV, { map: 'v', p: 1 / 3, x0: 0.25, steps: 20 }); setV(false); });

  // ====================== Plate 185: real lambda ======================
  const LAMS_185 = [1, 1.5, 2, 2.5, 3];
  const stE = { mode: 'overlay', lam: 3, turn: false };
  let cycE = null;
  const zE = rasterFig('wE', 'cE', (f) => {
    if (stE.mode === 'single' && stE.turn) return fitBox(f, { x0: -0.45, x1: 1.45, y0: -0.95, y1: 0.95 }, 0.02);
    return fitBox(f, { x0: -0.85, x1: 1.85, y0: -1.35, y1: 1.35 }, 0.02);
  }, () => `${stE.mode}|${stE.lam}|${stE.turn}`, (img, v) => {
    if (stE.mode === 'overlay') rasterOverlay(img, v, LAMS_185, zoomIter(200, v));
    else rasterJulia(img, v, 1, [stE.lam, 0], { itmax: zoomIter(300, v), mode: 'fill', turn: stE.turn, cyc: cycE });
  });
  function setE(refit) {
    markME(stE.mode);
    $('lEwrap').hidden = stE.mode !== 'single';
    $('lEv').textContent = f2(stE.lam, 7);
    if (stE.mode === 'overlay') {
      $('cEt').textContent = 'As printed, left';
      $('cEn').textContent = 'five domains superposed, λ = 1, 1.5, 2, 2.5, 3';
      $('rEa').textContent = '1 … 3';
      $('rEb').textContent = '−¼ … ¾';
      $('rEc').textContent = 'bounded for all five';
      $('infoE').innerHTML = 'Darker gray = one more of the five domains contains the point. They nest: the λ = 1 scallop holds them all, and the black centre — common to all five — spans [0, 1].';
    } else {
      cycE = cycleOf(stE.lam, 0);
      const [mr, mi] = muOf(stE.lam, 0);
      $('cEt').textContent = stE.turn ? 'As printed, right' : 'One λ';
      $('cEn').textContent = `λ = ${f2(stE.lam, 7)}${stE.turn ? ', turned 90° as in the book' : ''}`;
      $('rEa').textContent = f2(stE.lam, 7);
      $('rEb').textContent = f2(mr, 5);
      $('rEc').textContent = cycE ? (cycE.p === 1 ? 'settles to a point' : `settles to a ${cycE.p}-cycle`) : 'no attracting cycle';
      $('infoE').innerHTML = stE.lam === 2 ? 'λ = 2: the one perfectly smooth case — the domain is the exact circle |z − ½| = ½, the drape\'s "belt" in Plate 187.'
        : Math.abs(stE.lam - 3.2360679774997896) < 1e-6 ? 'The nuclear λ of the period-2 atom: the critical point ½ is itself on the 2-cycle, ½ → λ/4 ≈ 0.809 → ½. The book prints 3.3260680 — two digits transposed.'
        : stE.lam === 3 ? 'λ = 3: the San Marco dragon, at the bond where the period-1 atom meets the period-2 atom. The basilica, its reflection, and infinitely many smaller domes.'
        : `The maximal bounded self-squared domain for λ = ${f2(stE.lam, 4)}. Drag the slider: the shape deforms continuously with λ.`;
    }
    $('rEd').textContent = stE.mode === 'single' ? `0 and ${f2(1 - 1 / stE.lam, 4)}` : '0 and 1 − 1/λ';
    if (refit) zE.refit(); else zE.schedule();
  }
  const markME = stepButtons($('mE'), ['overlay', 'single'], (k) => (k === 'overlay' ? 'Five λ superposed' : 'One λ'), (k) => k, (k) => { stE.mode = k; stE.turn = false; setE(true); });
  $('lEs').addEventListener('input', () => { stE.lam = +$('lEs').value; stE.mode = 'single'; stE.turn = false; markME('single'); $('lEwrap').hidden = false; setE(false); });
  $('plate185L').addEventListener('click', () => { Object.assign(stE, { mode: 'overlay', turn: false }); setE(true); });
  $('plate185R').addEventListener('click', () => { Object.assign(stE, { mode: 'single', lam: 1 + Math.sqrt(5), turn: true }); $('lEs').value = stE.lam; setE(true); });
  $('sanmarco').addEventListener('click', () => { Object.assign(stE, { mode: 'single', lam: 3, turn: false }); $('lEs').value = 3; setE(true); });

  // ====================== Plate 187: the drape ======================
  const stD = { cutLam: 2, mark: false };
  const TILT = 0.52, YS = 1.0;
  let drape = null; // { slices: [{lam, prof}], x0, x1 }
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, { x0: -0.8, x1: 1.8, y0: -0.75, y1: 3.2 }, 0.02), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    c.lineJoin = 'round';
    if (!drape) {
      c.strokeStyle = PRINT.rule; c.lineWidth = 1.2 / v.s;
      c.strokeRect(-0.72, -0.62, 2.44, 3.76);
      toScreen(f);
      c.fillStyle = PRINT.muted; c.font = '600 13px "Schibsted Grotesk", sans-serif'; c.textAlign = 'center';
      c.fillText('computing the sections…', f.w / 2, f.h / 2);
      return;
    }
    const S = drape.slices, X0 = drape.x0, X1 = drape.x1, cols = S[0].prof.length;
    const xAt = (ci) => X0 + (X1 - X0) * ci / (cols - 1);
    for (let si = S.length - 1; si >= 0; si--) {
      const { lam, prof } = S[si], Y = (lam - 1) * YS;
      // closed outline per run of non-empty columns: back edge out, front edge home
      let runs = [];
      let a = -1;
      for (let ci = 0; ci < cols; ci++) {
        if (prof[ci] >= 0 && a < 0) a = ci;
        if ((prof[ci] < 0 || ci === cols - 1) && a >= 0) { runs.push([a, prof[ci] < 0 ? ci - 1 : ci]); a = -1; }
      }
      c.beginPath();
      for (const [a0, b0] of runs) {
        for (let ci = a0; ci <= b0; ci++) { const y = Y + TILT * prof[ci]; if (ci === a0) c.moveTo(xAt(ci), y); else c.lineTo(xAt(ci), y); }
        for (let ci = b0; ci >= a0; ci--) c.lineTo(xAt(ci), Y - TILT * prof[ci]);
        c.closePath();
      }
      c.fillStyle = PRINT.paper; c.fill();
      c.strokeStyle = 'rgba(21,21,21,0.62)'; c.lineWidth = 1.05 / v.s; c.stroke();
    }
    if (stD.mark) {
      // the section nearest the slider's lambda, in red
      let best = 0;
      for (let si = 0; si < S.length; si++) if (Math.abs(S[si].lam - stD.cutLam) < Math.abs(S[best].lam - stD.cutLam)) best = si;
      const { lam, prof } = S[best], Y = (lam - 1) * YS;
      c.beginPath();
      let pen = false;
      for (let ci = 0; ci < prof.length; ci++) {
        if (prof[ci] < 0) { pen = false; continue; }
        const y = Y - TILT * prof[ci];
        if (!pen) { c.moveTo(xAt(ci), y); pen = true; } else c.lineTo(xAt(ci), y);
      }
      c.strokeStyle = PRINT.red; c.lineWidth = 2 / v.s; c.stroke();
    }
    toScreen(f);
  });
  function computeDrape() {
    // in slabs, so the page stays responsive and the figure fills in as it computes
    const SL = 120, COLS = 240;
    const all = { slices: [], x0: -0.72, x1: 1.72 };
    let i = 0;
    const slab = () => {
      const t0 = performance.now();
      while (i < SL && performance.now() - t0 < 36) {
        const lam = 1 + 3 * i / (SL - 1);
        all.slices.push(drapeProfiles([lam], COLS, all.x0, all.x1)[0]);
        i++;
      }
      drape = all;
      zD.schedule();
      if (i < SL) setTimeout(slab, 0);
      else setD(false);
    };
    setTimeout(slab, 0);
  }
  function setD(refit) {
    const lam = stD.cutLam, [mr] = muOf(lam, 0), cyc = cycleOf(lam, 0);
    $('lDv').textContent = f2(lam, 3);
    $('rDa').textContent = f2(lam, 3);
    $('rDb').textContent = f2(mr, 4);
    if (drape && drape.slices.length) {
      let best = 0;
      for (let si = 0; si < drape.slices.length; si++) if (Math.abs(drape.slices[si].lam - lam) < Math.abs(drape.slices[best].lam - lam)) best = si;
      const prof = drape.slices[best].prof;
      let lo = Infinity, hi = -Infinity;
      for (let ci = 0; ci < prof.length; ci++) if (prof[ci] >= 0) { const x = drape.x0 + (drape.x1 - drape.x0) * ci / (prof.length - 1); lo = Math.min(lo, x); hi = Math.max(hi, x); }
      $('rDc').textContent = hi > lo ? f2(hi - lo, 3) : '—';
    } else $('rDc').textContent = '…';
    $('rDd').textContent = Math.abs(lam - 2) < 0.004 ? 'circle (the belt)' : cyc ? (cyc.p === 1 ? 'one attracting point' : `attracting ${cyc.p}-cycle`) : 'no attracting cycle';
    $('infoD').innerHTML = lam < 2 ? 'Below the belt the pleats press <b>in</b>: the scallops of λ near 1 point inward.'
      : lam > 2 ? 'Above the belt the pleats press <b>out</b>, and past λ = 3 the sections sprout the buds of period doubling.'
      : 'The belt: at λ = 2 the drape\'s section is a perfect circle.';
    zD.schedule();
    if (refit) zD.refit();
  }
  $('lDs').addEventListener('input', () => { stD.cutLam = +$('lDs').value; stD.mark = true; $('cutD').checked = true; setD(false); });
  $('cutD').addEventListener('change', () => { stD.mark = $('cutD').checked; zD.schedule(); });
  $('plate187').addEventListener('click', () => { stD.cutLam = 2; stD.mark = false; $('cutD').checked = false; $('lDs').value = 2; setD(true); });
  computeDrape();

  // ====================== Plates 188-189: the separators ======================
  const VIEWS_M = {
    mu:   { bb: { x0: -0.7, x1: 2.3, y0: -1.1, y1: 1.1 }, itmax: 380, band: false, kind: 'mu' },
    lam:  { bb: { x0: -1.45, x1: 3.45, y0: -1.8, y1: 1.8 }, itmax: 380, band: false, kind: 'lam' },
    inv:  { bb: { x0: 0.15, x1: 2.65, y0: -0.45, y1: 0.45 }, itmax: 1500, band: false, kind: 'inv' },
    lem:  { bb: { x0: 2.22, x1: 2.88, y0: 0.62, y1: 1.26 }, itmax: 220, band: true, kind: 'lam' },
    tree: { bb: { x0: 0.995, x1: 1.009, y0: 0.0558, y1: 0.0698 }, itmax: 2500, band: false, kind: 'lam' },
  };
  const stM = { mode: 'mu', tap: null };
  const zM = rasterFig('wM', 'cM', (f) => fitBox(f, VIEWS_M[stM.mode].bb, 0.02), () => stM.mode, (img, v) => {
    const V = VIEWS_M[stM.mode];
    rasterParam(img, v, V.kind, { itmax: zoomIter(V.itmax, v), band: V.band, discs: true });
  }, (f, v) => {
    if (stM.tap && stM.mode !== 'inv') {
      const [wx, wy] = stM.tap.world;
      dot(f.ctx, v, wx, wy, 4.5, PRINT.red);
    }
  }, { maxZoom: 500000, onTap: (wx, wy) => {
    let lr, li;
    if (stM.mode === 'mu') { // tapped a mu; give the lambda on the Re >= 1 side
      const sr = 1 + 4 * wx, si = 4 * wy, m = Math.hypot(sr, si), a = Math.atan2(si, sr) / 2, rt = Math.sqrt(m);
      lr = 1 + rt * Math.cos(a); li = rt * Math.sin(a);
    } else if (stM.mode === 'inv') {
      const ar = wy + 0.5 - 1, ai = wx, dn = ar * ar + ai * ai;
      if (dn < 1e-12) return;
      lr = 1 + ar / dn; li = -ai / dn;
    } else { lr = wx; li = wy; }
    stM.tap = { lam: [lr, li], world: stM.mode === 'mu' ? [wx, wy] : stM.mode === 'inv' ? null : [wx, wy] };
    if (stM.mode === 'inv') stM.tap.world = [wx, wy];
    setM(false);
  } });
  const MODES_M = { mu: 'μ-map', lam: 'λ-map', inv: 'Inverted λ-map', lem: 'Lemniscates', tree: '100-fold tree' };
  const CAPS_M = {
    mu: ['μ-map', 'bottom Plate 188 — the Mandelbrot set, for z → z²−μ'],
    lam: ['λ-map', 'top Plate 189 — the corona and its two empty discs'],
    inv: ['Inverted λ-map', 'top Plate 188 — the sprouts strung along a line by λ → 1 + 1/(λ−1)'],
    lem: ['Lemniscates', 'bottom-left Plate 189 — near the 3-bond λ = 2 − exp(−2πi/3)'],
    tree: ['100-fold tree', 'bottom-right Plate 189 — the channel near λ = 2 − exp(−2πi/100)'],
  };
  const INFO_M = {
    mu: 'The μ in the black area are those whose critical orbit (from z₀ = 0) fails to escape. The large cusp is μ = −¼; the right-most point is μ = 2. Zoom anywhere: the view recomputes, and the island molecules are "shaped like the whole μ-map, except for a nonlinear distortion".',
    lam: 'Black: the orbit of z₀ = ½ stays bounded, less the two empty discs |λ| ≤ 1 and |λ−2| ≤ 1 where it settles to a fixed point. The corona splits into sprouts rooted at the receptor bonds λ = exp(2πim/n) and 2 − exp(2πim/n); the map is symmetric about Re λ = 1.',
    inv: 'The λ-map inverted about λ = 1. Both circles of bonds become straight lines, and "corresponding points" of the sprouts line up — the book offers this as confirmation that the perceived circles through sprout roots are true circles.',
    lem: 'The gray steps are the domains |f<sub>n</sub>(½)| &lt; R for growing n: algebraic curves called lemniscates, whose limit is the separator S. The black period-3 sprout hangs at the bond 2 − exp(−2πi/3).',
    tree: 'Deep in the channel between the two discs, near the bond of order 100: the white strip is where the critical orbit still escapes — after thousands of iterations — and the dusty chains along its walls are hundred-fold trees of sprouts and islands. (This view iterates deepest, so it takes a few seconds.) The book notes it "shares striking features with the z-map in Plate 191".',
  };
  function setM(refit) {
    markMM(stM.mode);
    $('cMt').textContent = CAPS_M[stM.mode][0];
    $('cMn').textContent = CAPS_M[stM.mode][1];
    $('infoM').innerHTML = INFO_M[stM.mode];
    if (stM.tap) {
      const [lr, li] = stM.tap.lam, [mr, mi] = muOf(lr, li);
      const cyc = cycleOf(lr, li);
      $('rMa').textContent = cplx(lr, li, 5);
      $('rMb').textContent = cplx(mr, mi, 5);
      $('rMc').textContent = cyc ? 'bounded' : 'escapes';
      $('rMd').textContent = cyc ? String(cyc.p) : '—';
      $('toLab').disabled = false;
    }
    miniMapM();
    if (refit) zM.refit(); else zM.schedule();
  }
  function miniMapM() {
    const dotM = stM.tap ? `<circle cx="${stM.tap.lam[0].toFixed(3)}" cy="${(-stM.tap.lam[1]).toFixed(3)}" r="0.07" fill="#c2452d"/>` : '';
    $('miniM').innerHTML =
      `<line x1="-1.3" y1="0" x2="3.3" y2="0" stroke="#8a8a84" stroke-width="0.016" stroke-dasharray="0.05 0.04"/>` +
      `<circle cx="0" cy="0" r="1" fill="none" stroke="currentColor" stroke-width="0.03"/>` +
      `<circle cx="2" cy="0" r="1" fill="none" stroke="currentColor" stroke-width="0.03"/>` +
      `<g fill="currentColor">${[0, 1, 2, 3].map((x) => `<circle cx="${x}" cy="0" r="0.045"/>`).join('')}</g>` +
      `<g font-size="0.26" fill="currentColor" font-family="IBM Plex Mono, monospace" text-anchor="middle">` +
      `<text x="0" y="0.42">0</text><text x="1" y="0.42">1</text><text x="2" y="0.42">2</text><text x="3" y="0.42">3</text></g>` + dotM;
  }
  const markMM = stepButtons($('mM'), Object.keys(MODES_M), (k) => MODES_M[k], (k) => MODES_M[k], (k) => { stM.mode = k; setM(true); });
  $('plate188').addEventListener('click', () => { stM.mode = 'mu'; setM(true); });
  $('plate189').addEventListener('click', () => { stM.mode = 'lam'; setM(true); });

  // ====================== Plates 190-191: the dragon lab ======================
  const PRESETS_L = {
    p191: { lam: [0.969284, 0.24774506], line: false, itmax: 450, n: 25, s: 0.98, w: 0.125, bb: { x0: -0.5, x1: 1.5, y0: -1.05, y1: 1.05 },
      t: ['Plate 191', 'the "Peano" dragon: n = 25 heads around every articulation'],
      i: 'Twenty-five heads around every articulation point, and whorls all the way down. As n grows these dragons strain toward the hermit-dragon that would fill a λ = 1 scallop to the brim.' },
    starved: { lam: [0.83309563, 0.60035559], line: true, itmax: 700, n: 10, s: 1, w: 0, bb: { x0: -0.55, x1: 1.55, y0: -0.8, y1: 0.8 },
      cyc: 'none: the doubling limit', dim: '1 (skeletal curve)',
      t: ['Plate 190, top left', 'a starved dragon: the period-doubling limit in the 1/10 sprout'],
      i: 'Infinitely many bifurcations and no flesh left: at the period-doubling limit point of the sprout the dragon "collapses into a skeletal branched curve" — topological dimension 1.' },
    twist: { lam: [0.52345446, 0.86392232], line: true, itmax: 700, n: 6, s: 1, w: 1 / 7, bb: { x0: -0.7, x1: 1.7, y0: -0.9, y1: 0.9 },
      cyc: 'neutral (parabolic bond)', dim: '2, pinched at every joint',
      t: ['Plate 190, top right', 'a dragon with a twist: at the 1/7 subsprout of the 1/6 sprout'],
      i: 'Lean λ toward a subsprout of order 4 to 10 and every articulation picks up a spiral twist — "one subsprout yields a leftward, the other a rightward, twist."' },
    sigma: { lam: [0.99820131, 0.06156126], line: true, itmax: 2200, n: null, s: null, w: null, bb: { x0: -0.75, x1: 1.75, y0: -1.15, y1: 1.15 },
      t: ['Plate 190, bottom', 'a σ-dragon: λ in an offshore island (period 102) near λ = 1'],
      i: 'λ sits in an island molecule, not on the continent: the dragon is still connected, but its flesh gathers in scattered beads strung on near-invisible dust — a σ-dragon. "The σ introduces no new loop."' },
  };
  const stL = { lam: PRESETS_L.p191.lam.slice(), line: false, itmax: 450, n: 25, s: 0.98, w: 0.125, bb: PRESETS_L.p191.bb, preset: 'p191' };
  let cycL = cycleOf(stL.lam[0], stL.lam[1]);
  const zL = rasterFig('wL', 'cL', (f) => fitBox(f, stL.bb, 0.02), () => `${stL.lam[0]},${stL.lam[1]}|${stL.line}|${stL.itmax}`, (img, v) => {
    rasterJulia(img, v, 1, stL.lam, { itmax: zoomIter(stL.itmax, v), mode: stL.line ? 'line' : 'fill', cyc: cycL });
  }, null, { maxZoom: 20000 });
  const FRACS = [[0, '0'], [1 / 12, '1/12'], [1 / 10, '1/10'], [1 / 8, '1/8'], [1 / 7, '1/7'], [1 / 6, '1/6'], [1 / 5, '1/5'], [1 / 4, '1/4']];
  const fracName = (w) => { let best = FRACS[0]; for (const q of FRACS) if (Math.abs(q[0] - w) < Math.abs(best[0] - w)) best = q; return Math.abs(best[0] - w) < 0.004 ? best[1] : f2(w, 3); };
  function solveL() {
    const [gr, gi] = sproutGuess(stL.n, 1);
    const [nr, ni] = nucleus(stL.n, gr, gi);
    const s = Math.min(stL.s, 0.995), th = 2 * Math.PI * stL.w;
    const [lr, li] = lamForSigma(stL.n, s * Math.cos(th), s * Math.sin(th), nr, ni);
    if (!isFinite(lr) || !isFinite(li) || Math.hypot(lr - nr, li - ni) > 0.6) {
      $('infoL').innerHTML = 'The multiplier equation did not settle for these controls — showing the sprout\'s nucleus instead.';
      return [nr, ni];
    }
    return [lr, li];
  }
  function setL(refit, solved) {
    const P = stL.preset && PRESETS_L[stL.preset];
    markPL(stL.preset || '—');
    markNL(stL.n);
    $('nLv').textContent = String(stL.n ?? '—');
    $('hLv').textContent = stL.s === null ? '—' : f2(stL.s, 3);
    $('tLv').textContent = stL.w === null ? '—' : fracName(stL.w);
    $('skinL').checked = stL.line;
    cycL = cycleOf(stL.lam[0], stL.lam[1]);
    const [mr, mi] = muOf(stL.lam[0], stL.lam[1]);
    $('rLa').textContent = cplx(stL.lam[0], stL.lam[1], 6);
    $('rLb').textContent = cplx(mr, mi, 6);
    $('rLc').textContent = (P && P.cyc) || (cycL ? `attracting, period ${cycL.p}` : 'none attracting');
    $('rLd').textContent = (P && P.dim) || (cycL ? (stL.line ? '2, drawn as its skin' : '2 (has flesh)') : '≤ 1, or thin parabolic flesh');
    if (P) { $('cLt').textContent = P.t[0]; $('cLn').textContent = P.t[1]; $('infoL').innerHTML = P.i; }
    else {
      $('cLt').textContent = 'Dragon lab';
      $('cLn').textContent = `λ = ${cplx(stL.lam[0], stL.lam[1], 5)}`;
      if (!solved) $('infoL').innerHTML = cycL
        ? `λ sits in a period-${cycL.p} atom: the dragon has flesh. Nudge heft toward 1 or twist toward a fraction m/n to crumple the skin.`
        : 'No attracting cycle here: λ is on or outside the separator, and what remains of the dragon is skeleton or dust.';
    }
    if (refit) zL.refit(); else zL.schedule();
  }
  const PL_KEYS = { starved: '190 starved', twist: '190 twist', sigma: '190 σ', p191: '191' };
  const markPL = stepButtons($('pL'), Object.keys(PL_KEYS), (k) => PL_KEYS[k], (k) => `Preset ${PL_KEYS[k]}`, (k) => {
    const P = PRESETS_L[k];
    Object.assign(stL, { lam: P.lam.slice(), line: P.line, itmax: P.itmax, n: P.n ?? stL.n, s: P.s ?? stL.s, w: P.w ?? stL.w, bb: P.bb, preset: k });
    if (P.s !== null) { $('hLs').value = P.s === 1 ? 0.995 : P.s; }
    if (P.w !== null) $('tLs').value = P.w;
    setL(true);
  });
  const markNL = stepButtons($('nL'), [3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 25, 32], String, (n) => `n = ${n}`, (n) => {
    stL.n = n; stL.preset = null; stL.s = +$('hLs').value; stL.w = +$('tLs').value;
    stL.lam = solveL(); stL.itmax = 500; stL.bb = { x0: -0.7, x1: 1.7, y0: -0.95, y1: 0.95 };
    setL(true, true);
  });
  let lagL = 0;
  const solveFromSliders = () => {
    clearTimeout(lagL);
    lagL = setTimeout(() => {
      stL.preset = null; stL.s = +$('hLs').value; stL.w = +$('tLs').value;
      stL.lam = solveL(); stL.itmax = 500;
      setL(false, true);
    }, 120);
  };
  $('hLs').addEventListener('input', solveFromSliders);
  $('tLs').addEventListener('input', solveFromSliders);
  $('skinL').addEventListener('change', () => { stL.line = $('skinL').checked; stL.preset = null; setL(false); });
  $('toLab').addEventListener('click', () => {
    if (!stM.tap) return;
    stL.lam = stM.tap.lam.slice(); stL.preset = null; stL.itmax = 800;
    const cyc = cycleOf(stL.lam[0], stL.lam[1]);
    stL.line = !cyc;
    stL.bb = { x0: -0.7, x1: 1.7, y0: -0.95, y1: 0.95 };
    setL(true);
    document.getElementById('p190').scrollIntoView({ behavior: 'smooth' });
  });

  // ====================== Plate 192: Fatou dusts ======================
  const stF = { k: 5, par: false, row: false, rowY: -0.6 };
  const zF = rasterFig('wF', 'cF', (f) => fitBox(f, { x0: -0.04, x1: 1.04, y0: -1.03, y1: 0.015 }, 0.015), () => `fatou|${stF.k}`, (img, v) => {
    rasterFatou(img, v, stF.k);
  }, (f, v) => {
    const c = f.ctx;
    toWorld(f, v);
    if (stF.par) {
      c.beginPath();
      for (let i = 0; i <= 300; i++) {
        const y = -1 + i / 300 * 0.985, lam = -4 / y, h = Math.sqrt(Math.max(0, 0.25 - 1 / lam));
        const x1 = 0.5 - h;
        if (i === 0) c.moveTo(x1, y); else c.lineTo(x1, y);
      }
      for (let i = 300; i >= 0; i--) {
        const y = -1 + i / 300 * 0.985, lam = -4 / y, h = Math.sqrt(Math.max(0, 0.25 - 1 / lam));
        c.lineTo(0.5 + h, y);
      }
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6 / v.s; c.setLineDash([0.02, 0.014]); c.stroke(); c.setLineDash([]);
    }
    if (stF.row) {
      c.strokeStyle = PRINT.accent; c.lineWidth = 1.8 / v.s;
      c.beginPath(); c.moveTo(-0.03, stF.rowY); c.lineTo(1.03, stF.rowY); c.stroke();
    }
    toScreen(f);
  }, { onTap: (wx, wy) => { if (wy <= -0.02 && wy >= -1) { stF.rowY = wy; stF.row = true; $('rowF').checked = true; $('rowFwrap').hidden = false; $('rowFs').value = wy; setF(false); } } });
  function setF(refit) {
    markKF(stF.k);
    $('kFv').textContent = String(stF.k);
    $('cFt').textContent = stF.k === 5 ? 'As printed' : 'Deeper than the print';
    $('cFn').textContent = `tremas of order 1 to ${stF.k}`;
    $('rowFwrap').hidden = !stF.row;
    if (stF.row) {
      const lam = -4 / stF.rowY, h = Math.sqrt(Math.max(0, 0.25 - 1 / lam));
      $('rowFv').textContent = f2(stF.rowY, 3);
      $('rFa').textContent = f2(lam, 3);
      $('rFb').textContent = `${f2(0.5 - h, 4)}, ${f2(0.5 + h, 4)}`;
      // box-count estimate over the deep stage, and the surviving length at stage k
      const N = 8192;
      let surv = 0, deep = 0;
      for (let i = 0; i < N; i++) {
        const x0 = (i + 0.5) / N;
        let x = x0, ok = true;
        for (let s = 0; s < stF.k; s++) { x = lam * x * (1 - x); if (x < 0 || x > 1) { ok = false; break; } }
        if (ok) surv++;
        x = x0; ok = true;
        for (let s = 0; s < 24; s++) { x = lam * x * (1 - x); if (x < 0 || x > 1) { ok = false; break; } }
        if (ok) deep++;
      }
      $('rFc').textContent = deep > 1 ? `≈ ${f2(Math.log(deep) / Math.log(N), 3)}` : '→ 0';
      $('rFd').textContent = `${f2(surv / N, 4)} at stage ${stF.k}`;
      $('infoF').innerHTML = lam < 4.5
        ? 'Just above λ = 4 the mid trema is a sliver and the dust is almost the whole of [0, 1]; its dimension falls from 1 as λ grows.'
        : 'The larger λ, the wider every trema: the dust thins toward the two ends of [0, 1], and D falls toward 0.';
    } else {
      $('rFa').textContent = '—'; $('rFb').textContent = '—'; $('rFc').textContent = '—'; $('rFd').textContent = '—';
      $('infoF').innerHTML = 'Each row is one Fatou dust, sliced at stage ' + stF.k + '. Tap a row to read its λ, its mid trema and a dimension estimate.';
    }
    if (refit) zF.refit(); else zF.schedule();
  }
  const markKF = stepButtons($('kF'), [1, 2, 3, 4, 5, 6, 7, 8], String, (k) => `order ${k}`, (k) => { stF.k = k; setF(false); });
  $('parF').addEventListener('change', () => { stF.par = $('parF').checked; zF.schedule(); });
  $('rowF').addEventListener('change', () => { stF.row = $('rowF').checked; $('rowFwrap').hidden = !stF.row; setF(false); });
  $('rowFs').addEventListener('input', () => { stF.rowY = +$('rowFs').value; setF(false); });
  $('plate192').addEventListener('click', () => { Object.assign(stF, { k: 5, par: false, row: false }); $('parF').checked = false; $('rowF').checked = false; setF(true); });

  // ---------- first paint ----------
  setV(false); setE(false); setM(false); setL(false); setF(false); setD(false);
})();
