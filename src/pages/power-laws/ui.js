(() => {
  const pow = Math.pow;
  const LET = 'abcdefghijklmnopqrstuvwxyz';
  const fx3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : '∞');

  // ====================== Expectation paradoxes (pages 341–343) ======================
  const stA = { mode: 'tail', D: 2, u0: 3, seed: 1, truth: 'hyperbolic' };
  const cacheA = {};
  function sampleA() {
    const key = `s|${stA.D.toFixed(2)}|${stA.seed}`;
    if (!cacheA[key]) {
      const rnd = mulberry32(stA.seed * 1000003 + Math.round(stA.D * 100));
      cacheA[key] = Float64Array.from({ length: 30000 }, () => paretoSample(rnd, stA.D));
    }
    return cacheA[key];
  }
  function bagsA() {
    const key = `b|${stA.truth}|${stA.seed}`;
    if (!cacheA[key]) {
      const rnd = mulberry32(stA.seed * 7919 + (stA.truth === 'hyperbolic' ? 1 : 2));
      cacheA[key] = Array.from({ length: 6 }, () => mixedDataset(rnd, stA.truth === 'hyperbolic', 8000, 1.7, 1));
    }
    return cacheA[key];
  }
  const fA = figure($('cA'), () => drawA());
  function drawA() {
    const f = fA, c = f.ctx, D = stA.D;
    paper(f, PRINT.paper); toScreen(f);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (stA.mode === 'tail') {
      const ch = chart(f, { x: { min: 1, max: 1e4, log: true, label: 'value u' }, y: { min: 1e-6, max: 1, log: true, label: 'Pr(U > u)' } });
      ch.clip();
      const u0 = stA.u0;
      c.strokeStyle = '#b9b7af'; c.lineWidth = 1; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(ch.X(u0), ch.Y(1e-6)); c.lineTo(ch.X(u0), ch.Y(1)); c.stroke(); c.setLineDash([]);
      c.strokeStyle = PRINT.ink; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ch.X(1), ch.Y(1)); c.lineTo(ch.X(1e4), ch.Y(pow(1e4, -D))); c.stroke();
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6; c.setLineDash([6, 4]);
      c.beginPath(); c.moveTo(ch.X(u0), ch.Y(1)); c.lineTo(ch.X(1e4), ch.Y(pow(1e4 / u0, -D))); c.stroke(); c.setLineDash([]);
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.ink; c.fillText('the whole law: slope -D', ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.red; c.fillText('given U > u0: the same law, rescaled', ch.ml + 10, ch.mt + 24);
    } else if (stA.mode === 'future') {
      const S = sampleA(), xmax = 10, slope = D > 1 ? 1 / (D - 1) : NaN;
      const dots = [];
      for (let u0 = 1; u0 <= xmax + 1e-9; u0 += 0.75) {
        const o = overshoot(S, u0);
        if (o.n > 30) dots.push([u0, o.mean]);
      }
      const ymax = Math.max(2, Number.isFinite(slope) ? slope * xmax * 1.2 : 0, ...dots.map((d) => d[1] * 1.2));
      const ch = chart(f, { x: { min: 0, max: xmax, log: false, label: 'the past: u0 already reached' }, y: { min: 0, max: ymax, log: false, label: 'expected future beyond u0' } });
      ch.clip();
      if (Number.isFinite(slope)) {
        c.strokeStyle = PRINT.red; c.lineWidth = 2;
        c.beginPath(); c.moveTo(ch.X(0), ch.Y(0)); c.lineTo(ch.X(xmax), ch.Y(slope * xmax)); c.stroke();
      }
      for (const [x, y] of dots) {
        c.beginPath(); c.arc(ch.X(x), ch.Y(y), 3.5, 0, 2 * Math.PI);
        c.fillStyle = PRINT.ink; c.fill(); c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke();
      }
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      if (D > 1) { c.fillStyle = PRINT.red; c.fillText(`expected future = past x ${(1 / (D - 1)).toFixed(2)}`, ch.ml + 10, ch.mt + 8); }
      else { c.fillStyle = PRINT.ink; c.fillText('D <= 1: the expectation is infinite -', ch.ml + 10, ch.mt + 8); c.fillText('the dots only grow with the sample', ch.ml + 10, ch.mt + 24); }
      c.fillStyle = PRINT.muted; c.fillText('dots: mean overshoot in a 30,000-draw sample', ch.ml + 10, ch.mt + (D > 1 ? 24 : 40));
    } else {
      const bags = bagsA();
      const ch = chart(f, { x: { min: 1e-2, max: 1e4, log: true, label: 'value u' }, y: { min: 1 / 8000, max: 1, log: true, label: 'share of the dataset above u' } });
      ch.clip();
      bags.forEach((s, j) => {
        const n = s.length;
        c.strokeStyle = CAT[2 + (j % 6)]; c.lineWidth = 1.5; c.beginPath();
        let started = false;
        for (let i = 0; i < n - 1; i += 8) {
          const x = ch.X(s[i]), y = ch.Y((n - i) / n);
          if (started) c.lineTo(x, y); else { c.moveTo(x, y); started = true; }
        }
        c.stroke();
      });
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.ink; c.fillText('six datasets, each through its own random filter', ch.ml + 10, ch.mt + 8);
    }
  }
  const MODES_A = { tail: 'The scaling tail', future: 'The paradox', mixed: 'A mixed bag of data' };
  const INFO_A = {
    tail: 'Condition on having passed u₀ (gray line) and the distribution ahead, Pr{U &gt; u | U &gt; u₀} = (u/u₀)⁻ᴰ, is the whole law over again, merely rescaled. On log paper the red tail is the black law slid along itself. Nothing learned by surviving changes the shape of what remains.',
    future: 'Lotka: the number of papers by one author is hyperbolic with D = 2, so "however long a person\'s past collected works, it will on the average continue for an equal additional amount" — whoever stops, stops in the middle of a promising career. In the Land of Ten Thousand Lakes (widths 1600·N<sup>−0.8</sup>, so D = 1.25) the expected far shore starts 5 miles off; after sailing m miles without landfall it sits 5m miles off. The dots\' scatter is the heavy tail itself at work on the sample mean.',
    mixed: 'Economic data are "an awfully mixed bag": a fixed true distribution seen through highly variable filters. A scaling truth with D &lt; 2 is robust — every filtered dataset repeats the same tail slope −D. For most other truths the filtered datasets answer with "chaotic" incompatible results; compare the lognormal.',
  };
  function setA(redraw = true) {
    markMA(stA.mode); markTA(stA.truth);
    $('u0g').hidden = stA.mode !== 'tail';
    $('tAg').hidden = stA.mode !== 'mixed';
    $('Dg').hidden = stA.mode === 'mixed';
    $('newA').hidden = stA.mode === 'tail';
    $('DvA').textContent = `D = ${stA.D.toFixed(2)}`;
    $('u0vA').textContent = `u₀ = ${stA.u0.toFixed(1)}`;
    $('cAt').textContent = MODES_A[stA.mode];
    $('cAn').textContent = stA.mode === 'tail' ? `D = ${stA.D.toFixed(2)}, conditioned on U > ${stA.u0.toFixed(1)}`
      : stA.mode === 'future' ? `D = ${stA.D.toFixed(2)} · sample seed ${stA.seed}`
      : `true distribution: ${stA.truth === 'hyperbolic' ? 'scaling, D = 1.7' : 'lognormal, σ = 1'} · seed ${stA.seed}`;
    let info = INFO_A[stA.mode];
    if (stA.mode === 'mixed') info += `<br>apparent tail slopes here: <b>${bagsA().map((s) => tailSlope(s).toFixed(2)).join('&ensp;')}</b>`;
    $('infoA').innerHTML = info;
    $('rAa').textContent = stA.D.toFixed(2);
    $('rAb').textContent = stA.D > 1 ? (stA.D / (stA.D - 1)).toFixed(3) : '∞ (D ≤ 1)';
    $('rAc').textContent = stA.D > 1 ? (1 / (stA.D - 1)).toFixed(3) : '∞ (D ≤ 1)';
    $('rAd').textContent = pow(2, 1 / stA.D).toFixed(3);
    if (redraw) drawA();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(); });
  const markTA = stepButtons($('tA'), ['hyperbolic', 'lognormal'], (k) => (k === 'hyperbolic' ? 'Scaling truth (D = 1.7)' : 'Lognormal truth'), (k) => `True distribution: ${k}`, (k) => { stA.truth = k; setA(); });
  $('DsA').addEventListener('input', (e) => { stA.D = +e.target.value; setA(); });
  $('u0sA').addEventListener('input', (e) => { stA.u0 = +e.target.value; setA(); });
  $('newA').addEventListener('click', () => { stA.seed++; setA(); });
  $('lindyA').addEventListener('click', () => { Object.assign(stA, { mode: 'future', D: 2 }); $('DsA').value = 2; setA(); });
  $('shoreA').addEventListener('click', () => { Object.assign(stA, { mode: 'future', D: 1.25 }); $('DsA').value = 1.25; setA(); });

  // ====================== Zipf's law (pages 344–347) ======================
  const stB = { mode: 'law', N: 2, r: 0.25, seed: 1 };
  const rMinB = () => 0.1 / stB.N, rMaxB = () => 0.98 / stB.N;
  const M_WORDS = 200000;
  const cacheB = {};
  function freqsB() {
    const key = `${stB.N}|${stB.r.toFixed(5)}|${stB.seed}`;
    if (!cacheB[key]) cacheB[key] = sampleWords(mulberry32(stB.seed * 2654435 + stB.N), stB.N, stB.r, M_WORDS);
    return cacheB[key];
  }
  const K_TREE = 7, LV = 0.16, FLOOR_B = -(K_TREE * LV + 0.1);
  const zB = zoomable('wB', 'cB', (f) => {
    if (stB.mode === 'tree') return fitBox(f, { x0: -0.15, x1: 1.02, y0: FLOOR_B - 0.02, y1: 0.05 }, 0.02);
    return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
  }, (f, v) => {
    const c = f.ctx, N = stB.N, r = stB.r;
    paper(f, PRINT.paper);
    if (stB.mode === 'tree') {
      toWorld(f, v);
      const stop = 1 - N * r, wx0 = -v.ox / v.s - 0.02, wx1 = (f.w - v.ox) / v.s + 0.02;
      (function rec(a, len, k) {
        if (a > wx1 || a + len < wx0) return;
        if (k >= K_TREE || len * v.s < 1.2) { c.fillStyle = '#b7b5ac'; c.fillRect(a, FLOOR_B, len, -k * LV - FLOOR_B); return; }
        const wl = stop * len;
        c.fillStyle = PRINT.ink; c.fillRect(a, FLOOR_B, wl, -k * LV - FLOOR_B);
        for (let i = 0; i < N; i++) rec(a + wl + i * r * len, r * len, k + 1);
      })(0, 1, 0);
      toScreen(f);
      c.font = '500 10.5px "IBM Plex Mono", monospace'; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillStyle = PRINT.muted;
      for (let k = 0; k <= K_TREE; k++) {
        const y = v.oy + k * LV * v.s;
        if (y < -10 || y > f.h + 10) continue;
        c.strokeStyle = 'rgba(21,21,21,0.14)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(v.ox, y); c.lineTo(v.ox + v.s, y); c.stroke();
        c.fillText(`k = ${k}`, v.ox - 8, y);
      }
      // word labels on the wider strips
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = PRINT.paper;
      c.font = '600 11px "IBM Plex Mono", monospace';
      (function lab(a, len, k, word) {
        if (k >= Math.min(K_TREE, 4) || len * v.s < 30) return;
        const wl = stop * len;
        if (wl * v.s > 34) c.fillText(word || 'space', v.ox + (a + wl / 2) * v.s, v.oy + k * LV * v.s + 6);
        for (let i = 0; i < N; i++) lab(a + wl + i * r * len, r * len, k + 1, word + LET[i]);
      })(0, 1, 0, '');
      return;
    }
    toScreen(f);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const { D, V } = zipfParams(N, r);
    if (stB.mode === 'law') {
      const levels = zipfLevels(N, r);
      const last = levels[levels.length - 1];
      const ch = chart(f, { x: { min: 1, max: last.hi * 1.4, log: true, label: 'rank ρ' }, y: { min: Math.max(1e-11, last.P / 3), max: 1, log: true, label: 'probability P' } });
      ch.clip();
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6; c.setLineDash([6, 4]); c.beginPath();
      for (let i = 0; i <= 160; i++) {
        const rho = pow(last.hi * 1.4, i / 160);
        const y = ch.Y(zipfLaw(N, r, rho));
        if (i) c.lineTo(ch.X(rho), y); else c.moveTo(ch.X(rho), y);
      }
      c.stroke(); c.setLineDash([]);
      c.strokeStyle = PRINT.ink; c.lineWidth = 2.2; c.beginPath();
      for (const l of levels) { c.moveTo(ch.X(l.lo), ch.Y(l.P)); c.lineTo(ch.X(Math.max(l.hi, l.lo * 1.0001)), ch.Y(l.P)); }
      c.stroke();
      c.strokeStyle = 'rgba(21,21,21,0.25)'; c.lineWidth = 1; c.beginPath();
      for (let i = 1; i < levels.length; i++) { c.moveTo(ch.X(levels[i].lo), ch.Y(levels[i - 1].P)); c.lineTo(ch.X(levels[i].lo), ch.Y(levels[i].P)); }
      c.stroke();
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.red; c.fillText(`the smooth law: slope -1/D = ${(-1 / D).toFixed(3)}`, ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.ink; c.fillText('the exact tree, level by level', ch.ml + 10, ch.mt + 24);
    } else {
      const fr = freqsB(), n = fr.length;
      const ch = chart(f, { x: { min: 1, max: n * 1.4, log: true, label: 'rank ρ' }, y: { min: 0.4 / M_WORDS, max: (fr[0] / M_WORDS) * 2.5, log: true, label: 'frequency in the sample' } });
      ch.clip();
      c.fillStyle = PRINT.ink;
      let nextX = -Infinity;
      for (let i = 0; i < n; i++) {
        const x = ch.X(i + 1);
        if (i >= 60 && x < nextX) continue;
        nextX = x + 2.5;
        c.beginPath(); c.arc(x, ch.Y(fr[i] / M_WORDS), 2, 0, 2 * Math.PI); c.fill();
      }
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6; c.setLineDash([6, 4]); c.beginPath();
      for (let i = 0; i <= 160; i++) {
        const rho = pow(n * 1.4, i / 160);
        const y = ch.Y(zipfLaw(N, r, rho));
        if (i) c.lineTo(ch.X(rho), y); else c.moveTo(ch.X(rho), y);
      }
      c.stroke(); c.setLineDash([]);
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.ink; c.fillText(`${fmt(M_WORDS)} words sampled, ${fmt(n)} distinct`, ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.red; c.fillText('the generalized Zipf law', ch.ml + 10, ch.mt + 24);
    }
  });
  const MODES_B = { law: 'The law', sample: 'A sampled text', tree: 'The lexicographic tree' };
  const INFO_B = {
    law: 'Every word of k letters has probability P₀rᵏ (P₀ = 1 − Nr for the bare space), so the ranks come in levels: one word of no letters, N of one letter, N² of two. The exact staircase hugs the smooth law P = F(ρ + V)<sup>−1/D</sup>, which drops out by averaging each level\'s rank bounds. ΣP = 1 exactly.',
    sample: 'A text actually generated from the model — independent letters, cut into words by the spaces — then ranked and counted. With all letters equally probable, each level shows as a plateau; unequal letters or Markov dependence (the book\'s "generalization") smooth them into the familiar straight line. The ragged rare-word tail is what counts from a real author look like.',
    tree: 'The tree as nested shares of [0, 1]. At each level a share 1 − Nr of every live branch ends in a space — a finished word, inked down to the floor — and N shares of r branch on. The words never cover the gray remainder: in the limit it is a Cantor-like dust of dimension exactly D. The book states this in base N + 1, which is the case r = 1/(N + 1).',
  };
  function setB(refit) {
    markMB(stB.mode); markNB(stB.N);
    const { D, V, P0, F } = zipfParams(stB.N, stB.r);
    $('newB').hidden = stB.mode !== 'sample';
    $('rsB').value = (stB.r - rMinB()) / (rMaxB() - rMinB());
    $('rvB').textContent = `r = ${stB.r.toFixed(4)} · space ${P0.toFixed(3)}`;
    $('cBt').textContent = MODES_B[stB.mode];
    $('cBn').textContent = `N = ${stB.N}, r = ${stB.r.toFixed(4)}` + (stB.mode === 'sample' ? ` · seed ${stB.seed}` : stB.mode === 'tree' ? ` · levels 0 to ${K_TREE}` : '');
    $('infoB').innerHTML = INFO_B[stB.mode];
    $('dimB').textContent = `P = F(ρ + V)^(−1/D) · D = log ${stB.N}/log(1/r) ≈ ${D.toFixed(4)} · V = 1/(N − 1) = ${V.toFixed(3)}`;
    $('rBa').textContent = D.toFixed(4);
    $('rBb').textContent = V.toFixed(4);
    $('rBc').textContent = F.toFixed(4);
    $('rBd').textContent = P0.toFixed(4);
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(true); });
  const markNB = stepButtons($('nB'), [2, 3, 4, 26], String, (N) => `${N} letters`, (N) => {
    stB.r = Math.min(Math.max(stB.r * stB.N / N, 0.1 / N), 0.98 / N); stB.N = N; setB(stB.mode === 'law' || stB.mode === 'sample');
  });
  $('rsB').addEventListener('input', (e) => { stB.r = rMinB() + (+e.target.value) * (rMaxB() - rMinB()); setB(false); });
  $('newB').addEventListener('click', () => { stB.seed++; setB(false); });
  $('engB').addEventListener('click', () => { Object.assign(stB, { N: 26, r: 0.82 / 26 }); setB(true); });
  $('twoB').addEventListener('click', () => { Object.assign(stB, { N: 2, r: 0.25 }); setB(true); });

  // ====================== The Pareto law for salaries (pages 347–348) ======================
  const stC = { mode: 'pyramid', N: 2, r: Math.SQRT1_2 };
  const K_C = { 2: 8, 3: 6, 5: 5, 10: 4 };
  const zC = zoomable('wC', 'cC', (f) => {
    if (stC.mode === 'pyramid') return fitBox(f, { x0: -0.06, x1: 1.06, y0: -1.03, y1: 0.06 }, 0.02);
    return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
  }, (f, v) => {
    const c = f.ctx, N = stC.N, r = stC.r, K = K_C[N], D = treeD(N, r);
    paper(f, PRINT.paper);
    if (stC.mode === 'pyramid') {
      toWorld(f, v);
      const dmax = pow(1 / r, K + 1);
      const dep = (d) => (d - 1) / (dmax - 1);        // inverse income, scaled to [0, 1]
      c.fillStyle = PRINT.ink;
      for (let k = 0; k <= K; k++) {
        const hw = 0.5 * pow(N, (k - K) / 2);
        const yT = -dep(pow(1 / r, k)), yB = -dep(pow(1 / r, k + 1));
        c.fillRect(0.5 - hw, yB, 2 * hw, yT - yB);
      }
      // the envelope: half-width grows like depth^(D/2) — straight sides exactly when D = 2
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6 / v.s; c.setLineDash([0.018, 0.012]);
      for (const sgn of [-1, 1]) {
        c.beginPath();
        for (let i = 0; i <= 120; i++) {
          const d = (i / 120) * dmax, hw = 0.5 * pow(d, D / 2) / pow(N, K / 2);
          const x = 0.5 + sgn * hw, y = -dep(d);
          if (i) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
      }
      c.setLineDash([]);
      toScreen(f);
      c.font = '500 10.5px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillStyle = PRINT.muted;
      let lastY = -Infinity;
      for (let k = 0; k <= K; k++) {
        const yT = v.oy + dep(pow(1 / r, k)) * v.s, yB = v.oy + dep(pow(1 / r, k + 1)) * v.s;
        const y = (yT + yB) / 2;
        if (yB - yT < 13 || y < lastY + 13) continue;
        lastY = y;
        const label = `${fmt(pow(N, k))} × pay ${pow(r, k).toFixed(k ? 3 : 0)}`;
        c.strokeStyle = PRINT.paper; c.lineWidth = 3; c.strokeText(label, 10, y);
        c.fillText(label, 10, y);
      }
    } else {
      toScreen(f);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const levels = salaryLevels(N, r, K), last = levels[levels.length - 1];
      const V = 1 / (N - 1), A = (V * (1 + N)) / 2;
      const ch = chart(f, { x: { min: last.U / 2, max: 2, log: true, label: 'income U' }, y: { min: 0.7, max: last.hi * 2, log: true, label: 'rank ρ' } });
      ch.clip();
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6; c.setLineDash([6, 4]); c.beginPath();
      let started = false;
      for (let i = 0; i <= 200; i++) {
        const U = pow(10, Math.log10(last.U / 2) + (i / 200) * (Math.log10(2) - Math.log10(last.U / 2)));
        const rho = -V + A * pow(U, -D);
        if (rho < 0.7) continue;
        if (started) c.lineTo(ch.X(U), ch.Y(rho)); else { c.moveTo(ch.X(U), ch.Y(rho)); started = true; }
      }
      c.stroke(); c.setLineDash([]);
      c.strokeStyle = 'rgba(21,21,21,0.25)'; c.lineWidth = 1; c.beginPath();
      for (let i = 1; i < levels.length; i++) { c.moveTo(ch.X(levels[i - 1].U), ch.Y(levels[i - 1].hi)); c.lineTo(ch.X(levels[i].U), ch.Y(levels[i].lo)); }
      c.stroke();
      c.strokeStyle = PRINT.ink; c.lineWidth = 2.5; c.beginPath();
      for (const l of levels) { c.moveTo(ch.X(l.U), ch.Y(l.lo)); c.lineTo(ch.X(l.U), ch.Y(Math.max(l.hi, l.lo * 1.0001))); }
      c.stroke();
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.red; c.fillText(`slope -D = ${(-D).toFixed(3)}`, ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.ink; c.fillText('each riser: one level of the hierarchy', ch.ml + 10, ch.mt + 24);
    }
  });
  const MODES_C = { pyramid: 'The pyramid', rank: 'Rank against income' };
  const INFO_C = {
    pyramid: 'Inverse income runs straight down; each level\'s floor area is its head count. The silhouette\'s half-width grows like depth<sup>D/2</sup> (dashed): straight sides — "an exact pyramid (base equal to the square of the height)" — exactly when D = 2. There a superior\'s income is the geometric mean of all their subordinates taken together and of each one taken separately.',
    rank: 'Each level is one riser: Nᵏ members of identical income rᵏ. The rank of an individual of income U is approximately ρ = −V + U⁻ᴰFᴰ — "the formalism used for Zipf\'s law applies without change" (Lydall 1959). The greater D, the gentler the slope and the lower the inequality.',
  };
  function setC(refit) {
    markMC(stC.mode); markNC(stC.N);
    const N = stC.N, r = stC.r, K = K_C[N], D = treeD(N, r);
    $('rsC').value = (r - 0.25) / (0.95 - 0.25);
    $('rvC').textContent = `r = ${r.toFixed(3)} · a raise of ${((1 / r - 1) * 100).toFixed(0)}% per level`;
    $('cCt').textContent = MODES_C[stC.mode];
    $('cCn').textContent = `N = ${N}, r = ${r.toFixed(3)} · ${K + 1} levels`;
    $('infoC').innerHTML = INFO_C[stC.mode];
    $('dimC').textContent = `level k: N^k members at pay r^k · D = log ${N}/log(1/r) ≈ ${D.toFixed(3)} · empirically D ≈ 2`;
    $('rCa').textContent = D.toFixed(3);
    $('rCb').textContent = fmt((pow(N, K + 1) - 1) / (N - 1));
    $('rCc').textContent = `${pow(1 / r, K).toFixed(1)}×`;
    $('rCd').textContent = `${(r * Math.sqrt(N)).toFixed(3)}${Math.abs(r * Math.sqrt(N) - 1) < 0.005 ? ' (D = 2)' : ''}`;
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(true); });
  const markNC = stepButtons($('nC'), [2, 3, 5, 10], String, (N) => `${N} subordinates`, (N) => { stC.N = N; setC(true); });
  $('rsC').addEventListener('input', (e) => { stC.r = 0.25 + (+e.target.value) * (0.95 - 0.25); setC(false); });
  $('d2C').addEventListener('click', () => { stC.r = 1 / Math.sqrt(stC.N); setC(true); });

  // the generator of the lexicographic tree, as a small figure
  function miniB() {
    const stop = 1 - stB.N * stB.r;
    let s = `<line x1="0" y1="0" x2="1" y2="0" stroke="#8a8a84" stroke-width="0.012" stroke-dasharray="0.03 0.022"/>`
      + `<rect x="0" y="-0.045" width="${stop.toFixed(4)}" height="0.09" fill="none" stroke="currentColor" stroke-width="0.014"/>`;
    for (let i = 0; i < Math.min(stB.N, 26); i++) {
      const a = stop + i * stB.r;
      s += `<line x1="${a.toFixed(4)}" y1="0" x2="${(a + stB.r).toFixed(4)}" y2="0" stroke="currentColor" stroke-width="0.055"/>`;
    }
    $('miniBsvg').innerHTML = s;
  }
  $('rsB').addEventListener('input', miniB);
  $('nB').addEventListener('click', miniB);
  $('engB').addEventListener('click', miniB);
  $('twoB').addEventListener('click', miniB);

  setA(false); setB(true); setC(true); miniB();
})();
