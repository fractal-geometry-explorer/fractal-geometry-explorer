(() => {
  const pow = Math.pow;
  const LOG43 = Math.log(4) / Math.log(3);

  // ====================== Random Koch curves with a time grid ======================
  const stA = { D: 1.5, rule: 'random', n: 10, seed: 11 };
  let curveA = null, crossA = null;
  function dataA() {
    if (!curveA) {
      curveA = planeCurve(stA.D, stA.rule, stA.n, stA.seed);
      crossA = stA.n <= 12 ? crossings(curveA) : null;
    }
    return curveA;
  }
  const dirty = () => { curveA = null; };
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, bbox(dataA()), 0.06), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.1 / (v.s * 1); c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke(polyPath(dataA(), false));
    toScreen(f);
    const P = dataA();
    dot(c, v, P[0], P[1]); dot(c, v, P[P.length - 2], P[P.length - 1], 4, PRINT.accent);
  });
  const RULES_A = { random: "At random (the book's rule)", alt: 'Left, right, left, … ', same: 'Always the same side' };
  const INFO_A = {
    random: 'Every midpoint jumps in a direction "random and isotropic, independently of anything that came before", by a Gaussian length. The red dot is t = 0, the blue one t = 1. New stages only bend — no point once placed ever moves again.',
    alt: 'The deterministic check: bend every side the same way within a stage and alternate stages. At D = log 4/log 3 this is exactly the Koch snowflake curve, met in base N = 2 — the teragons of stages 2, 4, 6 are the familiar ones.',
    same: 'Bending every stage toward the same side gives the other classical case: at D = 2 this is Lévy\'s C curve, a plane-filling cousin the book meets in chapter 19 terms.',
  };
  function setA(refit) {
    markMA(stA.rule); markSA(stA.n);
    const D = stA.D, H = 1 / D, d = Math.sqrt(pow(2, -2 / D) - 0.25);
    $('dAv').textContent = `D = ${D.toFixed(4)}`;
    $('sAv').textContent = `stage ${stA.n}`;
    $('cAt').textContent = stA.rule === 'random' ? 'Randomized' : 'Deterministic';
    $('cAn').textContent = `D = ${D.toFixed(4)} · ${fmt(pow(2, stA.n))} sides · seed ${stA.seed}`;
    $('infoA').innerHTML = INFO_A[stA.rule];
    $('miniAfx').textContent = `N = 2, r = 2^(−1/${D.toFixed(2)}) = ${pow(2, -1 / D).toFixed(4)}`;
    miniCurve('miniA', [[0, 0], [0.5, d], [1, 0]]);
    dataA();
    $('rAa').textContent = H.toFixed(4);
    $('rAb').textContent = fmt(pow(2, stA.n));
    $('rAc').innerHTML = `Δt<sup>${(2 * H).toFixed(3)}</sup>`;
    $('rAd').textContent = stA.rule === 'random' ? (crossA === null ? 'not counted' : fmt(crossA)) : fmt(crossA || 0);
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(RULES_A), (k) => RULES_A[k], (k) => `Rule: ${RULES_A[k]}`, (k) => { stA.rule = k; dirty(); setA(true); });
  const markSA = stepButtons($('sA'), [4, 5, 6, 7, 8, 9, 10, 11, 12, 13], String, (n) => `Stage ${n}`, (n) => { stA.n = n; dirty(); setA(true); });
  $('dAs').addEventListener('input', (e) => { stA.D = +e.target.value; dirty(); setA(true); });
  $('preBrown').addEventListener('click', () => { Object.assign(stA, { D: 2, rule: 'random', n: 11 }); $('dAs').value = 2; dirty(); setA(true); });
  $('preKoch').addEventListener('click', () => { Object.assign(stA, { D: LOG43, rule: 'alt', n: 8 }); $('dAs').value = LOG43; dirty(); setA(true); });
  $('seedA').addEventListener('click', () => { stA.seed = (stA.seed * 48271 + 11) % 100000; dirty(); setA(true); });

  // ====================== Nonstationary increments: the creases ======================
  const stB = { H: 0.85, mode: 'function', seed: 5 };
  const N_B = 12, N_LAYERS = 8;
  let lineB = null, layersB = null, varB = null;
  function dataB() {
    if (stB.mode === 'layers') {
      if (!layersB) layersB = lineCurve(stB.H, N_LAYERS, stB.seed, true);
      return layersB;
    }
    if (!lineB) lineB = lineCurve(stB.H, stB.mode === 'stages' ? N_LAYERS : N_B, stB.seed, stB.mode === 'stages');
    return lineB;
  }
  const dirtyB = () => { lineB = null; layersB = null; varB = null; };
  const tracePath = (X, y0 = 0, sy = 1) => {
    const p = new Path2D(), N = X.length - 1;
    p.moveTo(0, y0 + sy * X[0]);
    for (let i = 1; i <= N; i++) p.lineTo(i / N, y0 + sy * X[i]);
    return p;
  };
  const maxAbs = (X) => X.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  // traces are drawn into a wide world box (x in [0,1], y pre-scaled) so they fill the 16:9 canvas
  const PITCH = 0.1;
  const zB = zoomable('wB', 'cB', (f) => {
    if (stB.mode === 'layers') return fitBox(f, { x0: -0.01, x1: 1.01, y0: -PITCH * 5 - 0.07, y1: 0.07 }, 0.03);
    return fitBox(f, { x0: -0.01, x1: 1.01, y0: -0.3, y1: 0.3 }, 0.03);
  }, (f, v) => {
    const c = f.ctx, d = dataB();
    paper(f, PRINT.paper); toWorld(f, v);
    const lw = (w) => { c.lineWidth = w / v.s; };
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (stB.mode === 'function') {
      const sy = 0.26 / Math.max(1e-9, maxAbs(d.X));
      if ($('markBd').checked) {
        c.strokeStyle = PRINT.red; c.setLineDash([4 / v.s, 4 / v.s]);
        for (let k = 1; k <= 4; k++) for (let h = 1; h < (1 << k); h += 2) {
          lw(k === 1 ? 1.4 : 0.7);
          const t = h / (1 << k);
          c.beginPath(); c.moveTo(t, -0.29); c.lineTo(t, 0.29); c.stroke();
        }
        c.setLineDash([]);
      }
      c.strokeStyle = PRINT.rule; lw(0.8); c.beginPath(); c.moveTo(0, 0); c.lineTo(1, 0); c.stroke();
      c.strokeStyle = PRINT.ink; lw(1.3); c.stroke(tracePath(d.X, 0, sy));
    } else if (stB.mode === 'stages') {
      const sy = 0.26 / Math.max(1e-9, maxAbs(d.stages[6]));
      for (let k = 1; k <= 6; k++) {
        c.strokeStyle = ramp((k - 1) / 5, 0.9); lw(k === 6 ? 1.6 : 1);
        c.stroke(tracePath(d.stages[k], 0, sy));
      }
    } else {
      c.strokeStyle = PRINT.rule; lw(0.7);
      for (let k = 1; k <= 6; k++) { c.beginPath(); c.moveTo(0, -PITCH * (k - 1)); c.lineTo(1, -PITCH * (k - 1)); c.stroke(); }
      for (let k = 1; k <= 6; k++) {
        const L = sub(d.stages[k], d.stages[k - 1]), sy = 0.042 / Math.max(1e-9, maxAbs(L));
        c.strokeStyle = PRINT.ink; lw(1.1); c.stroke(tracePath(L, -PITCH * (k - 1), sy));
        c.fillStyle = PRINT.red;
        for (let h = 0; h <= (1 << (k - 1)); h++) {
          const t = h / (1 << (k - 1));
          c.beginPath(); c.arc(t, -PITCH * (k - 1), 2.2 / v.s, 0, 2 * Math.PI); c.fill();
        }
      }
    }
    toScreen(f);
    if (stB.mode === 'layers') {
      c.fillStyle = PRINT.muted; c.font = '500 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'bottom';
      for (let k = 1; k <= 6; k++) c.fillText(`k = ${k}`, v.ox + 4, v.oy + (PITCH * (k - 1) - 0.012) * v.s);
    }
  });
  function sub(A, B) { const O = new Float64Array(A.length); for (let i = 0; i < A.length; i++) O[i] = A[i] - B[i]; return O; }
  const MODES_B = { function: 'The function', stages: 'Stage by stage', layers: 'The layers' };
  const INFO_B = {
    function: 'One sample of X(t). The dashed red lines stand on the first dyadic points: with H near 1 the function visibly changes character as it crosses the big ones — those are the creases, and refining further never smooths them.',
    stages: 'The teragons of stages 1 to 6, light to dark: each stage keeps every point of the one before and bends the middles. The first bends are the largest, which is why the earliest dyadic points dominate the final shape.',
    layers: 'Each row is what one stage adds: a chain of random tents, rescaled to a common height (the true amplitudes shrink by 2⁻ᴴ per row). Row k vanishes at all multiples of 2⁻ᵏ⁺¹ (red dots) — a periodic zeroset that contains the row above\'s, so every stage is "in synchrony with all the following ones". That hierarchy is what stationarity forbids.',
  };
  function measureB() {
    if (!varB) varB = slidWindows(stB.H, 5, 4000, 1000 + Math.round(stB.H * 1e4));
    return varB;
  }
  function setB(refit) {
    markMB(stB.mode);
    $('hBv').textContent = `H = ${stB.H.toFixed(2)}`;
    $('cBt').textContent = MODES_B[stB.mode];
    $('cBn').textContent = `H = ${stB.H.toFixed(2)} · D = 1/H = ${(1 / stB.H).toFixed(3)} · seed ${stB.seed}`;
    $('infoB').innerHTML = INFO_B[stB.mode];
    const m = measureB(), th = pow(1 / 32, 2 * stB.H), bound = pow(2, 1 - 2 * stB.H);
    const sci2 = (x) => x.toExponential(2).replace('e-', '·10⁻').replace(/⁻(\d+)/, (_, e) => '⁻' + String(e).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]));
    $('rBa').innerHTML = `${sci2(m.dyadic)} <small>(theory ${sci2(th)})</small>`;
    $('rBb').textContent = sci2(m.slid);
    $('rBc').textContent = (m.slid / m.dyadic).toFixed(3);
    $('rBd').textContent = `${bound.toFixed(3)} × dyadic`;
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; lineB = null; setB(true); });
  $('hBs').addEventListener('input', (e) => { stB.H = +e.target.value; dirtyB(); setB(true); });
  $('markBd').addEventListener('change', () => zB.schedule());
  $('preCrease').addEventListener('click', () => { stB.H = 0.85; stB.mode = 'function'; $('hBs').value = 0.85; $('markBd').checked = true; dirtyB(); setB(true); });
  $('preHalf').addEventListener('click', () => { stB.H = 0.5; stB.mode = 'function'; $('hBs').value = 0.5; dirtyB(); setB(true); });
  $('seedB').addEventListener('click', () => { stB.seed = (stB.seed * 48271 + 7) % 100000; lineB = null; layersB = null; setB(true); });

  // ====================== Randomly positioned strata ======================
  const stC = { b: 2, H: 0.75, mode: 'strata', seed: 9 };
  const M_C = 2048;
  let dataC_ = null;
  const KofC = () => Math.min(24, Math.max(6, Math.floor(Math.log(1200) / Math.log(stC.b))));
  function dataC() {
    if (!dataC_) dataC_ = strata(stC.H, stC.b, KofC(), stC.seed, M_C);
    return dataC_;
  }
  const dirtyC = () => { dataC_ = null; };
  const zC = zoomable('wC', 'cC', (f) => {
    if (stC.mode === 'sum') return fitBox(f, { x0: -0.01, x1: 1.01, y0: -0.3, y1: 0.3 }, 0.03);
    return fitBox(f, { x0: -0.01, x1: 1.01, y0: -PITCH * 6 - 0.07, y1: 0.07 }, 0.03);
  }, (f, v) => {
    const c = f.ctx, d = dataC();
    paper(f, PRINT.paper); toWorld(f, v);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (stC.mode === 'sum') {
      const sy = 0.26 / Math.max(1e-9, maxAbs(d.sum));
      c.strokeStyle = PRINT.rule; c.lineWidth = 0.8 / v.s; c.beginPath(); c.moveTo(0, 0); c.lineTo(1, 0); c.stroke();
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.3 / v.s; c.stroke(tracePath(d.sum, 0, sy));
    } else {
      for (let k = 0; k <= 6 && k < d.layers.length; k++) {
        const sy = 0.045 / Math.max(1e-9, maxAbs(d.layers[k]));
        c.strokeStyle = PRINT.rule; c.lineWidth = 0.7 / v.s;
        c.beginPath(); c.moveTo(0, -PITCH * k); c.lineTo(1, -PITCH * k); c.stroke();
        c.strokeStyle = PRINT.ink; c.lineWidth = 1.1 / v.s; c.stroke(tracePath(d.layers[k], -PITCH * k, sy));
      }
    }
    toScreen(f);
    if (stC.mode === 'strata') {
      c.fillStyle = PRINT.muted; c.font = '500 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'bottom';
      for (let k = 0; k <= 6 && k < dataC().layers.length; k++) c.fillText(`k = ${k} · ~${fmt(Math.round(pow(stC.b, k)))}/unit`, v.ox + 4, v.oy + (PITCH * k - 0.014) * v.s);
    }
  });
  const MODES_C = { strata: 'The strata', sum: 'The sum B†' };
  const INFO_C = {
    strata: 'Strata 0 to 6, each rescaled to a common height (the true amplitudes shrink by b⁻ᴴ per row). Each one interpolates independent values at its own Poisson instants, denser by a factor b every row. No two rows share a grid, so nothing is synchronized.',
    sum: 'All the strata added up. Compare with the midpoint-displacement function above at the same H: the roughness is alike, but no instant is a crease — slide a window anywhere and the statistics are the same. The price is self-similarity only by ratios b⁻ᵏ.',
  };
  function setC(refit) {
    markMC(stC.mode); markBC(stC.b);
    $('hCv').textContent = `H = ${stC.H.toFixed(2)}`;
    $('cCt').textContent = MODES_C[stC.mode];
    $('cCn').textContent = `b = ${stC.b} · H = ${stC.H.toFixed(2)} · seed ${stC.seed}`;
    $('infoC').innerHTML = INFO_C[stC.mode];
    $('rCa').textContent = fmt(KofC() + 1);
    $('rCb').textContent = `~${fmt(Math.round(pow(stC.b, KofC())))}`;
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(true); });
  const markBC = stepButtons($('bC'), [1.3, 1.5, 2, 3], (b) => `b = ${b}`, (b) => `Base ${b}`, (b) => { stC.b = b; dirtyC(); setC(true); });
  $('hCs').addEventListener('input', (e) => { stC.H = +e.target.value; dirtyC(); setC(false); });
  $('seedC').addEventListener('click', () => { stC.seed = (stC.seed * 48271 + 3) % 100000; dirtyC(); setC(false); });

  // ====================== Plate 246: the computer bug ======================
  const stD = { mode: 'order', seed: 2 };
  let fieldD = null, srcD = null;                 // the trema field and its rastered picture
  const SRC_N = 1024;                             // source raster covers [0, 1] x [0, 1]
  function fieldOf() {
    if (!fieldD) { fieldD = tremaField(stD.seed); srcD = null; }
    return fieldD;
  }
  function sourceOf() {
    if (!srcD) {
      const cv = document.createElement('canvas');
      cv.width = SRC_N; cv.height = SRC_N;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#000'; g.fillRect(0, 0, SRC_N, SRC_N);
      g.fillStyle = '#fff';
      for (const [cx, cy, r] of fieldOf()) {
        g.beginPath(); g.arc(cx * SRC_N, cy * SRC_N, r * SRC_N, 0, 2 * Math.PI); g.fill();
      }
      srcD = g.getImageData(0, 0, SRC_N, SRC_N).data;
    }
    return srcD;
  }
  const srcAt = (src, x, y) => {
    if (x < 0 || x >= 1 || y < 0 || y >= 1) return 0;
    return src[((y * SRC_N | 0) * SRC_N + (x * SRC_N | 0)) * 4] / 255;
  };
  let imgD = { key: '', img: null };
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.02, y1: 1.02 }, 0.02), (f, v) => {
    const c = f.ctx;
    if (stD.mode === 'order') {
      paper(f, PRINT.paper); toWorld(f, v);
      c.save();
      c.beginPath(); c.rect(0, 0, 1, 1); c.clip();
      c.fillStyle = PRINT.ink; c.fillRect(0, 0, 1, 1);
      c.fillStyle = PRINT.paper;
      for (const [cx, cy, r] of fieldOf()) { c.beginPath(); c.arc(cx, cy, r, 0, 2 * Math.PI); c.fill(); }
      c.restore();
      toScreen(f);
      if ($('revealD').checked) drawReveal(c, v, false);
    } else {
      const W = f.canvas.width, H = f.canvas.height, src = sourceOf();
      const key = `${stD.seed}|${W}|${H}|${v.s}|${v.ox}|${v.oy}`;
      if (imgD.key !== key) {
        const img = c.createImageData(W, H), d = img.data;
        const PP = [236, 235, 230], STEPS = 32;
        for (let j = 0; j < H; j++) {
          const wy = (v.oy - (j + 0.5) / f.dpr) / v.s, base = j * W * 4;
          for (let i = 0; i < W; i++) {
            const wx = (((i + 0.5) / f.dpr) - v.ox) / v.s, o = base + 4 * i;
            if (wx < 0 || wx > 1 || wy < 0 || wy > 1) { d[o] = PP[0]; d[o + 1] = PP[1]; d[o + 2] = PP[2]; d[o + 3] = 255; continue; }
            // the lagging pen: what should print here is what the ray from the
            // centre carried a few cells back, fading as the lag grows
            const dx = wx - 0.5, dy = wy - 0.5, rr = Math.hypot(dx, dy) || 1e-9;
            const ux = dx / rr, uy = dy / rr, step = 0.0045 * (0.35 + 1.8 * rr);
            let val = 0;
            for (let t = 0; t < STEPS; t++) {
              const s = srcAt(src, wx - ux * step * t, wy - uy * step * t) * (1 - t / STEPS);
              if (s > val) val = s;
              if (val >= 1) break;
            }
            d[o] = 21 + (PP[0] - 21) * val; d[o + 1] = 21 + (PP[1] - 21) * val; d[o + 2] = 21 + (PP[2] - 21) * val; d[o + 3] = 255;
          }
        }
        imgD = { key, img };
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.putImageData(imgD.img, 0, 0);
      toScreen(f);
      if ($('revealD').checked) drawReveal(c, v);
    }
  });
  function drawReveal(c, v) {
    const F = fieldOf().slice().sort((a, b) => b[2] - a[2]).slice(0, 28);
    c.strokeStyle = PRINT.red; c.lineWidth = 1.4;
    for (const [cx, cy, rr] of F) {
      c.beginPath(); c.arc(v.ox + cx * v.s, v.oy - cy * v.s, rr * v.s, 0, 2 * Math.PI); c.stroke();
    }
  }
  const MODES_D = { order: 'The strict order', bug: 'Our own bug' };
  const INFO_D = {
    order: 'What the program was meant to draw: a plane with random round tremas cut out, white on black — the design whose corrected output became Plates 306 to 309. Radii follow the scaling law Nr(> u) ∝ u⁻², so holes come at every size.',
    bug: 'The same picture, with one deliberate mistake of ours: the picture is retraced ray by ray from the centre, and the pen lags a few cells behind — every white stretch bleeds outward and fades. Neat circles become a radial burst, the strict order is hidden. Turn on "reveal the hidden order" to see the circles that are still underneath.',
  };
  function setD(refit) {
    markMD(stD.mode);
    $('cDt').textContent = MODES_D[stD.mode];
    $('cDn').textContent = `${fmt(fieldOf().length)} tremas · seed ${stD.seed}`;
    $('infoD').innerHTML = INFO_D[stD.mode];
    $('rDa').textContent = fmt(fieldOf().length);
    if (refit) zD.refit(); else zD.schedule();
  }
  const markMD = stepButtons($('mD'), Object.keys(MODES_D), (k) => MODES_D[k], (k) => `Show: ${MODES_D[k]}`, (k) => { stD.mode = k; imgD.key = ''; setD(true); });
  $('revealD').addEventListener('change', () => zD.schedule());
  $('seedD').addEventListener('click', () => { stD.seed = (stD.seed * 48271 + 5) % 100000; fieldD = null; imgD.key = ''; setD(false); });

  setA(true); setB(true); setC(true); setD(true);
})();
