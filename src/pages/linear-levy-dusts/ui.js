(() => {
  const pow = Math.pow;
  const pct = (x) => `${(100 * x).toFixed(1)}%`;

  // ====================== Interval tremas: the concept ======================
  const stA = { mode: 'cascade', Dt: Math.log(2) / Math.log(3), seed: 11 };
  const ROWS_A = 8, PITCH = 0.08, BAR_T = 0.035;
  function drawIntervals(c, ints, y, t) {
    for (let i = 0; i < ints.length; i += 2) c.fillRect(ints[i], y - t, ints[i + 1] - ints[i], t);
  }
  const zA = zoomable('wA', 'cA', (f) => {
    const h = stA.mode === 'cascade' ? PITCH * ROWS_A + BAR_T : 1.3 * PITCH * 11.6 + BAR_T;
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: -(h + 0.03), y1: stA.mode === 'cascade' ? 0.03 : 0.1 }, 0.03);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    c.fillStyle = PRINT.ink;
    const L = lineLayout(stA.Dt);
    if (stA.mode === 'cascade') {
      for (let n = 0; n <= ROWS_A; n++) drawIntervals(c, lineSurvivors(stA.Dt, n ? pow(3, n - 1) : 0, stA.seed, L), -PITCH * n, BAR_T);
    } else {
      const D = Math.max(stA.Dt, 0.01), r = pow(2, -1 / D);
      const stages = Math.max(0, Math.min(5, Math.floor(Math.log(2e5 / L.kap) / Math.log(1 / r))));
      for (let n = 0; n <= stages; n++) {
        const P = Math.min(2e5, Math.max(1, Math.round(L.kap / pow(r, n))));
        drawIntervals(c, lineSurvivors(stA.Dt, P, stA.seed, L), -1.3 * PITCH * n, BAR_T);
        drawIntervals(c, cantorIntervals(D, n), -1.3 * PITCH * (n + 6.6), BAR_T);
      }
      toScreen(f);
      c.fillStyle = PRINT.muted; c.font = '600 12px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText('Lévy: random tremas', v.ox, v.oy - (BAR_T + 0.025) * v.s);
      c.fillText('Cantor: the same D, on a grid', v.ox, v.oy + (1.3 * PITCH * 6.6 - BAR_T - 0.025) * v.s);
      toWorld(f, v);
    }
    toScreen(f);
  });
  const MODES_A = { cascade: 'Falling threshold', compare: 'Lévy against Cantor' };
  const INFO_A = {
    cascade: 'The top row is the untouched interval. Each row below keeps the tremas longer than its threshold ε, and ε falls by 3 per row — the second row holds only the sample\'s single longest trema. Watch a surviving stretch: its bounding gaps widen, new gaps open inside it, and sometimes it is erased whole. That is the birth-and-death process of the text, and the reason Lévy errors come in unforced clusters.',
    compare: 'The same dimension twice. Above, the random trema cascade; below, the Cantor dust with N = 2 and r = 2^(−1/D), stage by stage. The Cantor dust repeats on a grid with a privileged origin; the Lévy dust is statistically the same from every one of its points — the property the chapter is after.',
  };
  function setA(refit) {
    markMA(stA.mode);
    const Dt = stA.Dt, L = lineLayout(Dt), P = pow(3, ROWS_A - 1);
    const sv = lineSurvivors(Dt, P, stA.seed, L);
    let len = 0, longest = 0;
    for (let i = 0; i < sv.length; i += 2) { const l = sv[i + 1] - sv[i]; len += l; if (l > longest) longest = l; }
    $('DAv').textContent = `Dt = ${Dt.toFixed(3)}`;
    $('seedAv').textContent = `seed ${stA.seed}`;
    $('cAt').textContent = MODES_A[stA.mode];
    $('cAn').textContent = stA.mode === 'cascade' ? `the bare interval, then ε falling by 3 per row` : `D = ${Math.max(Dt, 0).toFixed(3)}`;
    $('infoA').innerHTML = INFO_A[stA.mode] + (Dt <= 0 ? ' With Dt ≤ 0 every family line dies: as ε falls the tremas almost surely cover every point, and the rows empty out.' : '');
    $('dimA').innerHTML = `tremas longer than u, per unit length: (1 − D<sub>t</sub>)/u = ${(1 - Dt).toFixed(3)}/u · survivors: a Lévy dust of D = max(D<sub>t</sub>, 0) = ${Math.max(Dt, 0).toFixed(3)}`;
    $('rAa').textContent = Math.max(Dt, 0).toFixed(4);
    $('rAb').textContent = fmt(P);
    $('rAc').textContent = `${pct(len)} → 0`;
    $('rAd').textContent = sv.length ? longest.toFixed(4) : 'none — all covered';
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  $('DAs').addEventListener('input', (e) => { stA.Dt = +e.target.value; setA(false); });
  $('seedA').addEventListener('click', () => { stA.seed = 1 + ((Math.random() * 9999) | 0); setA(false); });
  $('presetA').addEventListener('click', () => { Object.assign(stA, { Dt: Math.log(2) / Math.log(3), mode: 'cascade' }); $('DAs').value = stA.Dt; setA(true); });
  $('presetA2').addEventListener('click', () => { Object.assign(stA, { Dt: 0.5, mode: 'cascade' }); $('DAs').value = 0.5; setA(true); });

  // ====================== Plate 285: random streets ======================
  const stB = { D: 1.94, seed: 8, cut: false, y0: 0.5, coarse: false };
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, { x0: -0.01, x1: W285 + 0.01, y0: stB.cut ? -0.13 : -0.01, y1: 1.01 }, 0.02), (f, v) => {
    const c = f.ctx, L = streetLayout(stB.D);
    const wmin = (stB.coarse ? 1.7 : 0.55) / v.s, P = Math.min(stB.coarse ? 2e4 : 2e5, Math.max(1, Math.floor(L.kap / wmin)));
    const S = streets(stB.D, P, stB.seed, L);
    paper(f, PRINT.paper); toWorld(f, v);
    c.save();
    c.beginPath(); c.rect(0, 0, W285, 1); c.clip();
    c.fillStyle = '#f4f3ee'; c.fillRect(0, 0, W285, 1);
    c.fillStyle = PRINT.ink;
    const cx = W285 / 2, cy = 0.5, R = L.range;
    let path = new Path2D(), n = 0;
    for (let o = 0; o < S.length; o += 4) {
      const nx = S[o], ny = S[o + 1], t = S[o + 2], h = S[o + 3] / 2;
      const px = cx + nx * t, py = cy + ny * t, dx = -ny, dy = nx;
      path.moveTo(px + dx * R + nx * h, py + dy * R + ny * h);
      path.lineTo(px - dx * R + nx * h, py - dy * R + ny * h);
      path.lineTo(px - dx * R - nx * h, py - dy * R - ny * h);
      path.lineTo(px + dx * R - nx * h, py + dy * R - ny * h);
      if (++n === 2048) { c.fill(path); path = new Path2D(); n = 0; }
    }
    if (n) c.fill(path);
    c.restore();
    if (stB.cut) {
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6 / v.s; c.setLineDash([6 / v.s, 4 / v.s]);
      c.beginPath(); c.moveTo(-0.01, stB.y0); c.lineTo(W285 + 0.01, stB.y0); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.ink;
      drawIntervals(c, streetSection(S, stB.y0), -0.06, BAR_T);
    }
    toScreen(f);
    $('rBa').textContent = fmt(P);
    $('rBc').textContent = `${pct(whiteShare(stB.D, P))} → 0`;
  });
  function setB(refit) {
    const D = stB.D, L = streetLayout(D);
    $('DBv').textContent = `D = ${D.toFixed(3)}`;
    $('seedBv').textContent = `seed ${stB.seed}`;
    $('cutBwrap').hidden = !stB.cut;
    $('cutBv').textContent = `y = ${stB.y0.toFixed(3)}`;
    $('cBt').textContent = 'The streets';
    $('cBn').textContent = `D = ${D.toFixed(3)} · seed ${stB.seed}`;
    $('dimB').innerHTML = `straight strips, isotropic, widths with Nr(W &gt; w) ∝ 1/w · blocks of houses: D = ${D.toFixed(3)} · any line cuts them in a Lévy dust of D − 1 = ${(D - 1).toFixed(3)}`;
    $('infoB').innerHTML = stB.cut
      ? 'The red line plays the base of the Koch curve: the bar below it keeps the stretches of the line no street covers. Those stretches are exactly an interval-trema construction — each street cuts the line in an interval, and the widths\' 1/w law becomes the lengths\' 1/u law — so the surviving dust is a linear Lévy dust of dimension D − 1.'
      : 'The streets are infinite strips: direction uniform, offset uniform, the p-th widest of width κ/p. Each one you see continues beyond the frame — the window is cut from a larger plane. Zoom in: thinner streets keep appearing, and any white block keeps being subdivided forever.';
    $('rBb').textContent = L.kap.toFixed(3);
    $('rBd').textContent = (D - 1).toFixed(3);
    if (refit) zB.refit(); else zB.schedule();
  }
  // a coarse pass while the control moves, the full pass once it settles (DECISIONS: heavy sliders)
  let settleB = 0;
  function nudgeB() {
    stB.coarse = true; setB(false);
    clearTimeout(settleB); settleB = setTimeout(() => { stB.coarse = false; setB(false); }, 180);
  }
  $('DBs').addEventListener('input', (e) => { stB.D = +e.target.value; nudgeB(); });
  $('seedB').addEventListener('click', () => { stB.seed = 1 + ((Math.random() * 9999) | 0); nudgeB(); });
  $('cutB').addEventListener('change', (e) => { stB.cut = e.target.checked; setB(true); });
  $('cutBs').addEventListener('input', (e) => { stB.y0 = +e.target.value; setB(false); });
  $('plate285').addEventListener('click', () => { Object.assign(stB, { D: 1.94, seed: 8, cut: false }); $('DBs').value = 1.94; $('cutB').checked = false; setB(true); });

  // ====================== Plates 286–287: Lévy staircases ======================
  const stC = { mode: 'printed', D: Math.log(2) / Math.log(3), seed: 56, dy: 1 / 500 };
  let cacheC = { key: '' };
  function stairC() {
    const key = `${stC.D}|${stC.seed}|${stC.dy}`;
    if (cacheC.key !== key) cacheC = { key, val: levyStair(stC.D, Math.round(1 / stC.dy), stC.seed) };
    return cacheC.val;
  }
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, { x0: -0.03, x1: 1.03, y0: stC.mode === 'dust' ? -0.14 : -0.03, y1: 1.03 }, 0.03), (f, v) => {
    const c = f.ctx, { X } = stairC(), steps = X.length - 1, dy = 1 / steps;
    paper(f, PRINT.paper); toWorld(f, v);
    const p = new Path2D();
    p.moveTo(0, 0);
    for (let i = 1; i <= steps; i++) { p.lineTo(X[i], (i - 1) * dy); p.lineTo(X[i], i * dy); }
    if (stC.mode === 'printed') {
      p.lineTo(1, 0);
      c.fillStyle = PRINT.ink; c.fill(p);
    } else {
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.6 / v.s; c.lineJoin = 'round'; c.stroke(p);
      c.fillStyle = PRINT.ink;
      const tick = Math.max(0.0008, 0.75 / v.s);
      for (let i = 1; i <= steps; i++) c.fillRect(X[i] - tick / 2, -0.095, tick, BAR_T);
    }
    toScreen(f);
    if (stC.mode === 'dust') { dot(c, v, 0, 0); dot(c, v, 1, 1); }
  });
  const MODES_C = { printed: 'As printed', dust: 'The staircase and its dust' };
  function setC(refit) {
    markMC(stC.mode); markDY(stC.dy);
    const { X, big } = stairC(), steps = X.length - 1;
    $('DCv').textContent = `D = ${stC.D.toFixed(4)}`;
    $('seedCv').textContent = `seed ${stC.seed}`;
    $('cCt').textContent = MODES_C[stC.mode];
    $('cCn').textContent = `D = ${stC.D.toFixed(4)} · Δy = 1/${steps} · seed ${stC.seed}`;
    $('infoC').innerHTML = (stC.mode === 'dust'
      ? 'The bar below collects the risers\' abscissas — where the staircase actually climbs. They pile into clusters with gaps at every scale: a linear Lévy dust of dimension D, of which the staircase is the mass distribution M(R). '
      : 'The region under the staircase, filled with ink as the book prints it. ')
      + (stC.D < 0.45 ? 'At small D a handful of giant jumps carry nearly all the width — the "overwhelming clustering" the caption describes.'
        : stC.D > 0.8 ? 'At D near 1 the jumps even out and the staircase hugs the diagonal, yet it still climbs only on a set of measure zero.'
        : 'Lower D for fewer, wilder treads; raise it toward 1 and the staircase hugs the diagonal.');
    $('rCa').textContent = fmt(steps);
    $('rCb').textContent = pct(big);
    $('rCd').textContent = stC.D.toFixed(4);
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(true); });
  const markDY = stepButtons($('dyC'), [1 / 100, 1 / 500, 1 / 2500], (d) => `1/${Math.round(1 / d)}`, (d) => `Ordinate step 1/${Math.round(1 / d)}`, (d) => { stC.dy = d; setC(false); });
  $('DCs').addEventListener('input', (e) => { stC.D = +e.target.value; setC(false); });
  $('seedC').addEventListener('click', () => { stC.seed = 1 + ((Math.random() * 9999) | 0); setC(false); });
  const presetC = (D, seed) => { Object.assign(stC, { D, seed, dy: 1 / 500, mode: 'printed' }); $('DCs').value = D; setC(true); };
  $('plate287').addEventListener('click', () => presetC(0.6309, 56));
  $('plate286t').addEventListener('click', () => presetC(0.9, 2));
  $('plate286b').addEventListener('click', () => presetC(0.3, 21));

  setA(true); setB(true); setC(true);
})();
