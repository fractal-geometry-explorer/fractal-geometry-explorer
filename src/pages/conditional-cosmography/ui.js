(() => {
  // depth chosen so the point count stays in the tens of thousands
  const depthFor = (N) => Math.max(3, Math.min(9, Math.floor(Math.log(40000) / Math.log(N))));

  // ====================== Peeking from a material point (pages 206-208) ======================
  const stA = { mode: 'dust', N: 4, seed: 2 };
  const cacheA = {};
  function dustA() {
    const K = depthFor(stA.N), key = `${stA.N}|${K}|${stA.seed}`;
    if (!cacheA[key]) cacheA[key] = randomCurds(stA.N, K, stA.seed);
    return { pts: cacheA[key], K };
  }
  const ORIGINS = 50;
  function curvesA() {
    const { pts } = dustA();
    const Rs = Float64Array.from({ length: 22 }, (_, i) => Math.pow(10, -2.2 + (i / 21) * 1.9));
    const mat = massCurve(pts, materialOrigins(pts, ORIGINS, stA.seed), Rs);
    const arb = massCurve(pts, arbitraryOrigins(ORIGINS, stA.seed), Rs);
    return { Rs, mat, arb };
  }
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'mass') return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.02, y1: 1.02 }, 0.02);
  }, (f, v) => {
    const c = f.ctx, D = Math.log(stA.N) / Math.log(3);
    paper(f, PRINT.paper);
    if (stA.mode === 'dust') {
      toWorld(f, v);
      const { pts, K } = dustA();
      const r = Math.max(0.5 / v.s, 0.35 * Math.pow(3, -K));
      c.fillStyle = PRINT.ink;
      for (let i = 0; i < pts.length; i += 2) c.fillRect(pts[i] - r, pts[i + 1] - r, 2 * r, 2 * r);
      // one arbitrary origin (blue) and one material origin (red), with equal balls
      const arb = arbitraryOrigins(1, stA.seed + 17)[0], mat = materialOrigins(pts, 1, stA.seed + 17)[0];
      toScreen(f);
      for (const [[ox, oy], col] of [[arb, PRINT.accent], [mat, PRINT.red]]) {
        const x = v.ox + ox * v.s, y = v.oy - oy * v.s;
        c.beginPath(); c.arc(x, y, 0.08 * v.s, 0, 2 * Math.PI);
        c.strokeStyle = col; c.lineWidth = 1.6; c.setLineDash([5, 4]); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.arc(x, y, 4, 0, 2 * Math.PI); c.fillStyle = col; c.fill();
        c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke();
      }
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.accent; c.fillText('an arbitrary origin', 12, 10);
      c.fillStyle = PRINT.red; c.fillText('a material origin', 12, 26);
    } else {
      toScreen(f);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const { Rs, mat, arb } = curvesA();
      const ymax = Math.max(...mat, 1);
      const ch = chart(f, { ml: 64, x: { min: Rs[0], max: Rs[Rs.length - 1], log: true, label: 'radius R' }, y: { min: 0.02, max: ymax * 2, log: true, label: 'mean points within R' } });
      ch.clip();
      // reference slope D through the last material point
      const xr = Rs[Rs.length - 4], yr = mat[Rs.length - 4];
      c.strokeStyle = '#b9b7af'; c.lineWidth = 1.4; c.setLineDash([5, 4]); c.beginPath();
      c.moveTo(ch.X(Rs[0]), ch.Y(yr * Math.pow(Rs[0] / xr, D)));
      c.lineTo(ch.X(Rs[Rs.length - 1]), ch.Y(yr * Math.pow(Rs[Rs.length - 1] / xr, D)));
      c.stroke(); c.setLineDash([]);
      const line = (vals, col, lw) => {
        c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
        let started = false;
        for (let i = 0; i < Rs.length; i++) {
          if (vals[i] <= 0.02) continue;
          const x = ch.X(Rs[i]), y = ch.Y(vals[i]);
          if (started) c.lineTo(x, y); else { c.moveTo(x, y); started = true; }
        }
        c.stroke();
      };
      line(mat, PRINT.red, 2.2);
      line(arb, PRINT.accent, 1.8);
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.red; c.fillText(`material origins: slope -> D = ${D.toFixed(3)} (dashed)`, ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.accent; c.fillText('arbitrary origins: empty until R reaches the dust', ch.ml + 10, ch.mt + 24);
    }
  });
  const MODES_A = { dust: 'The dust and two origins', mass: 'M(R) from each kind of origin' };
  function setA(refit) {
    markMA(stA.mode); markNA(stA.N);
    const D = Math.log(stA.N) / Math.log(3), { pts, K } = dustA();
    $('cAt').textContent = MODES_A[stA.mode];
    $('cAn').textContent = `N = ${stA.N}, D = ${D.toFixed(3)} · ${K} stages · seed ${stA.seed}`;
    $('infoA').innerHTML = stA.mode === 'dust'
      ? 'The dashed balls are the same size. The blue observer\'s is almost always empty — and emptier the deeper the cascade runs; the red observer, standing on matter, always has neighbours at every scale. Conditioning is just the decision to describe the universe from where matter actually is.'
      : 'Averaged over fifty origins of each kind. The red curve is straight with slope D on log paper — the conditional law the chapter builds on. The blue curve starts far below it: most arbitrary balls hold nothing, and the average is carried by lucky hits. Deepen the cascade and blue sinks without limit while red stands still.';
    const share = emptyShare(pts, arbitraryOrigins(400, stA.seed + 1), 0.1);
    // fitted slope over the straight middle of the material curve
    const { Rs, mat } = curvesA();
    let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
    for (let i = 4; i < Rs.length - 2; i++) {
      if (mat[i] <= 0) continue;
      const x = Math.log10(Rs[i]), y = Math.log10(mat[i]);
      sx += x; sy += y; sxx += x * x; sxy += x * y; m++;
    }
    $('rAa').textContent = `log ${stA.N}/log 3 = ${D.toFixed(4)}`;
    $('rAb').textContent = fmt(pts.length / 2);
    $('rAc').textContent = `${(100 * share).toFixed(0)}%`;
    $('rAd').textContent = m > 2 ? ((m * sxy - sx * sy) / (m * sxx - sx * sx)).toFixed(3) : '—';
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markNA = stepButtons($('nA'), [2, 3, 4, 5], String, (N) => `keep ${N} of 9`, (N) => { stA.N = N; setA(false); });
  $('galaxyA').addEventListener('click', () => { stA.N = 4; setA(false); });
  $('newA').addEventListener('click', () => { stA.seed++; setA(false); });

  // ====================== Stratified against scaling (pages 208-209) ======================
  const stB = { mode: 'set', set: 'fournier', seed: 2 };
  const RHO = 5, K_F = 5;
  const cacheB = {};
  function dustB() {
    if (stB.set === 'fournier') {
      if (!cacheB.f) cacheB.f = fournierDust(RHO, K_F);
      return cacheB.f;
    }
    const key = `c|${stB.seed}`;
    if (!cacheB[key]) cacheB[key] = randomCurds(3, 9, stB.seed);
    return cacheB[key];
  }
  const zB = zoomable('wB', 'cB', (f) => {
    if (stB.mode === 'mass') return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.02, y1: 1.02 }, 0.02);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    if (stB.mode === 'set') {
      toWorld(f, v);
      const pts = dustB();
      const r = stB.set === 'fournier' ? Math.max(0.8 / v.s, 0.004) : Math.max(0.5 / v.s, 0.35 * Math.pow(3, -9));
      c.fillStyle = PRINT.ink;
      if (stB.set === 'fournier') for (let i = 0; i < pts.length; i += 2) { c.beginPath(); c.arc(pts[i], pts[i + 1], r, 0, 2 * Math.PI); c.fill(); }
      else for (let i = 0; i < pts.length; i += 2) c.fillRect(pts[i] - r, pts[i + 1] - r, 2 * r, 2 * r);
      toScreen(f);
    } else {
      toScreen(f);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const Rs = Float64Array.from({ length: 48 }, (_, i) => Math.pow(10, -2.6 + (i / 47) * 2.4));
      const fpts = cacheB.f || (cacheB.f = fournierDust(RHO, K_F));
      const key = `c|${stB.seed}`;
      const curds = cacheB[key] || (cacheB[key] = randomCurds(3, 9, stB.seed));
      const mf = massCurve(fpts, [[0.5, 0.5]], Rs);
      const mc = massCurve(curds, materialOrigins(curds, 40, stB.seed), Rs);
      const ch = chart(f, { ml: 64, x: { min: Rs[0], max: Rs[Rs.length - 1], log: true, label: 'radius R' }, y: { min: 0.5, max: Math.max(...mf, ...mc) * 2, log: true, label: 'points within R' } });
      ch.clip();
      const line = (vals, col, lw) => {
        c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
        let started = false;
        for (let i = 0; i < Rs.length; i++) {
          if (vals[i] <= 0) continue;
          const x = ch.X(Rs[i]), y = ch.Y(vals[i]);
          if (started) c.lineTo(x, y); else { c.moveTo(x, y); started = true; }
        }
        c.stroke();
      };
      line(mf, PRINT.ink, 2.2);
      line(mc, PRINT.red, 1.8);
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.ink; c.fillText('Fournier from its centre: a staircase of strata', ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.red; c.fillText('random curds, material origins: straight, same D = 1', ch.ml + 10, ch.mt + 24);
    }
  });
  const MODES_B = { set: 'The set', mass: 'The mass curves' };
  function setB(refit) {
    markMB(stB.mode); markSetB(stB.set);
    $('setB').parentElement.hidden = stB.mode !== 'set';
    $('newB').hidden = stB.mode === 'set' && stB.set === 'fournier';
    $('cBt').textContent = MODES_B[stB.mode];
    $('cBn').textContent = stB.mode === 'mass' ? `ratio 1/${RHO} against N = 3 curds · seed ${stB.seed}`
      : stB.set === 'fournier' ? `Fournier quincunx, ratio 1/${RHO}, ${K_F} orders` : `random curds, N = 3 of 9, 9 stages · seed ${stB.seed}`;
    $('infoB').innerHTML = stB.mode === 'mass'
      ? 'Both sets have D = 1 in the plane. The staircase can only be slid along itself by factors of 5 — the strata are in the construction. The red curve has no preferred rungs: rescaled by any factor it remains statistically itself.'
      : stB.set === 'fournier'
        ? 'The hierarchy is designed in: aggregates of aggregates at the fixed ratio 1/5, and nothing between the levels. Astronomers\' discomfort is with exactly this designed-in discreteness.'
        : 'No two scales are tied by design, yet the eye sorts the dust into clusters and voids regardless — apparent hierarchy as a corollary of D < 2, the chapter\'s closing twist.';
    $('rBa').textContent = stB.mode === 'mass' ? '1 (both)' : stB.set === 'fournier' ? `log 5/log 5 = 1` : `log 3/log 3 = 1`;
    $('rBb').textContent = stB.set === 'fournier' && stB.mode !== 'mass' ? '5ᵏ only' : 'every r (statistically)';
    $('rBc').textContent = stB.mode === 'mass' ? 'flat, then ×5' : stB.set === 'fournier' ? 'flat, then ×5' : '∝ R';
    $('rBd').textContent = 'yes — either way';
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(true); });
  const markSetB = stepButtons($('setB'), ['fournier', 'curds'], (k) => (k === 'fournier' ? 'Fournier hierarchy' : 'Random curds'), (k) => `Matter: ${k}`, (k) => { stB.set = k; setB(false); });
  $('newB').addEventListener('click', () => { stB.seed++; delete cacheB[`c|${stB.seed - 1}`]; setB(false); });

  setA(true); setB(true);
})();
