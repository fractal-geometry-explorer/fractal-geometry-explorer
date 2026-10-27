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
  // The reconstruction's fitted values (DECISIONS.md, chapter 26): about 150 cells across the
  // picture, round tremas by the rank law with C = 0.1, a plain at 0.08 of the eye's height with
  // spikes up to 0.24, heights skewed by u^9, and a view half-angle of atan(0.31) = 17 degrees.
  const BUG = { cells: 150, C: 0.1, plain: 0.08, top: 0.24, k: 9, G: 0.31, seed: 9 };
  const stD = { mode: 'bug', top: BUG.top, seed: BUG.seed, draft: false };
  let relD = { key: '' }, tabD = { key: '' }, imgD = { key: '' };
  function reliefOf() {
    const key = `${stD.seed}|${stD.top}`;
    if (relD.key !== key) relD = { key, R: bugRelief(stD.seed, { ...BUG, top: stD.top }) };
    return relD.R;
  }
  function tableOf() {                            // a coarse table while a slider moves, the full one after
    const R = reliefOf(), key = `${relD.key}|${stD.draft}`;
    if (tabD.key !== key) tabD = { key, T: stD.draft ? bugTable(R, Math.SQRT2, 1024, 420, 560) : bugTable(R, Math.SQRT2, 3072, 1200, 1600) };
    return tabD.T;
  }
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, { x0: -1, x1: 1, y0: -1, y1: 1 }, 0.01), (f, v) => {
    const c = f.ctx, R = reliefOf();
    if (stD.mode === 'order') {
      paper(f, PRINT.paper); toWorld(f, v);
      c.save();
      c.beginPath(); c.rect(-1, -1, 2, 2); c.clip();
      c.fillStyle = PRINT.ink;
      const rmin = 0.35 / v.s;                    // tremas under a third of a pixel would not print
      for (const [x, y, r] of R.tremas) {
        if (r < rmin) break;
        if (x + r < -1 || x - r > 1 || y + r < -1 || y - r > 1) continue;
        c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
      }
      c.restore();
      toScreen(f);
    } else {
      const W = f.canvas.width, H = f.canvas.height, T = tableOf();
      const key = `${tabD.key}|${W}|${H}|${v.s}|${v.ox}|${v.oy}`;
      if (imgD.key !== key) {
        const img = c.createImageData(W, H), d = img.data, PP = [236, 235, 230], IN = [21, 21, 21];
        const G2 = BUG.G * BUG.G, near = 1 - stD.top, far = Math.sqrt(1 + 2 * G2), near01 = new Float32Array(W * H);
        for (let j = 0; j < H; j++) {
          const wy = Math.max(-1, Math.min(1, (v.oy - (j + 0.5) / f.dpr) / v.s));
          for (let i = 0; i < W; i++) {
            // nearness: the distance from the eye to the surface seen at (wx, wy), from the
            // farthest floor (0) to the tallest spike under the eye (1); outside the frame the
            // edge value is carried on so the softening below leaves no rim
            const wx = Math.max(-1, Math.min(1, ((i + 0.5) / f.dpr - v.ox) / v.s));
            const z = bugSeen(T, wx, wy), dist = (1 - z) * Math.sqrt(1 + G2 * (wx * wx + wy * wy));
            near01[j * W + i] = (far - dist) / (far - near);
          }
        }
        // soften like the print: about 0.006 half-widths (3 px of the scanned plate), never more
        // than at the plate's own size, so zooming in shows the relief's detail; the tone curve
        // was fitted on the softened nearness, so it comes after
        soften(near01, W, H, 0.006 * Math.min(v.s, v.fit || v.s) * f.dpr);
        for (let j = 0; j < H; j++) {
          const wy = (v.oy - (j + 0.5) / f.dpr) / v.s, inY = wy >= -1 && wy <= 1;
          for (let i = 0; i < W; i++) {
            const wx = ((i + 0.5) / f.dpr - v.ox) / v.s, o = 4 * (j * W + i);
            const g = inY && wx >= -1 && wx <= 1 ? bugGrey(near01[j * W + i]) : 1;
            d[o] = IN[0] + (PP[0] - IN[0]) * g; d[o + 1] = IN[1] + (PP[1] - IN[1]) * g; d[o + 2] = IN[2] + (PP[2] - IN[2]) * g; d[o + 3] = 255;
          }
        }
        imgD = { key, img };
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.putImageData(imgD.img, 0, 0);
      toScreen(f);
    }
    if ($('revealD').checked) drawReveal(c, v, R);
  }, { maxZoom: 12 });
  // a Gaussian blur of standard deviation sigma pixels, as three box blurs whose radii add up to
  // its variance (a pass of radius r adds r(r + 1)/3); edges held
  function soften(a, W, H, sigma) {
    const v = sigma * sigma, lo = Math.floor(Math.sqrt(v + 0.25) - 0.5), hi = lo + 1;
    const nHi = Math.max(0, Math.min(3, Math.round((3 * v - 3 * lo * (lo + 1)) / (hi * (hi + 1) - lo * (lo + 1)))));
    const b = new Float32Array(a.length);
    const pass = (src, dst, n, m, step, line, r) => {
      const k = 1 / (2 * r + 1);
      for (let l = 0; l < m; l++) {
        const o = l * line;
        let sum = src[o] * (r + 1);
        for (let i = 1; i <= r; i++) sum += src[o + Math.min(n - 1, i) * step];
        for (let i = 0; i < n; i++) {
          dst[o + i * step] = sum * k;
          sum += src[o + Math.min(n - 1, i + r + 1) * step] - src[o + Math.max(0, i - r) * step];
        }
      }
    };
    for (let t = 0; t < 3; t++) {
      const r = t < nHi ? hi : lo;
      if (r > 0) { pass(a, b, W, H, 1, W, r); pass(b, a, H, W, W, 1, r); }
    }
  }
  // the largest tremas' floors: in the view from above the floor (height 0) shows at its own place,
  // so these circles are the flat picture's circles too
  function drawReveal(c, v, R) {
    c.save();
    c.beginPath(); c.rect(v.ox - v.s, v.oy - v.s, 2 * v.s, 2 * v.s); c.clip();
    c.strokeStyle = PRINT.red; c.lineWidth = 1.4;
    let n = 0;
    for (const [x, y, r] of R.tremas) {
      if (x + r < -1 || x - r > 1 || y + r < -1 || y - r > 1) continue;
      c.beginPath(); c.arc(v.ox + x * v.s, v.oy - y * v.s, r * v.s, 0, 2 * Math.PI); c.stroke();
      if (++n >= 24) break;
    }
    c.restore();
  }
  const MODES_D = { order: 'The strict order', bug: 'The bug, reconstructed' };
  const INFO_D = {
    order: 'What the program was meant to draw: random round tremas, flat and in two tones — the design whose corrected output became Plates 306 to 309. Disc p has area proportional to 1/p, so holes come at every size; here they are black, as in Plates 308–309.',
    bug: 'The same tremas as pits in a plain studded with random spikes, seen from close above. Perspective lays each spike over, away from the point under the eye, and nearer surfaces print lighter. The pits keep their place and shape: outline them to compare with the strict order.',
  };
  const topLabel = () => (stD.top <= BUG.plain + 1e-9 ? 'none: a flat plain' : `${stD.top.toFixed(2)} of the eye's height`);
  function setD(refit) {
    markMD(stD.mode);
    const R = reliefOf();
    $('cDt').textContent = MODES_D[stD.mode];
    $('cDn').textContent = `${fmt(R.tremas.length)} tremas · seed ${stD.seed}`;
    $('infoD').innerHTML = INFO_D[stD.mode];
    $('topDv').textContent = topLabel();
    $('topD').value = stD.top;
    $('rDa').textContent = fmt(R.tremas.length);
    $('rDb').textContent = `${Math.round(100 * R.pits)}%`;
    $('rDc').textContent = stD.top <= BUG.plain + 1e-9 ? 'none' : `${stD.top.toFixed(2)} × eye`;
    if (refit) zD.refit(); else zD.schedule();
  }
  const markMD = stepButtons($('mD'), Object.keys(MODES_D), (k) => MODES_D[k], (k) => `Show: ${MODES_D[k]}`, (k) => { stD.mode = k; setD(false); });
  $('topD').addEventListener('input', (e) => { stD.top = +e.target.value; stD.draft = true; if (stD.mode !== 'bug') stD.mode = 'bug'; setD(false); });
  $('topD').addEventListener('change', () => { stD.draft = false; setD(false); });
  $('revealD').addEventListener('change', () => zD.schedule());
  $('seedD').addEventListener('click', () => { stD.seed = (stD.seed * 48271 + 5) % 100000; setD(false); });
  $('presetD').addEventListener('click', () => {
    Object.assign(stD, { mode: 'bug', top: BUG.top, seed: BUG.seed, draft: false });
    $('revealD').checked = false; setD(true);
  });

  setA(true); setB(true); setC(true); setD(true);
})();
