(() => {

  // ====================== pages 232–239: Peano made random ======================
  const stB = { rule: 'polya', n: 8, seed: 11 };
  let cacheB = { key: '' };
  function dataB() {
    const key = `${stB.rule}|${stB.n}|${stB.seed}`;
    if (cacheB.key === key) return cacheB;
    const P = midpointCurve(stB.n, stB.rule, stB.seed);
    return (cacheB = { key, P, path: polyPath(P, false), box: bbox(P), ratio: pythagRatio(P), rep: repeatedVertices(P) });
  }
  const zB = zoomable('wB', 'cB', (f) => {
    // the nonrandom sweep keeps one frame; the random curves get the frame their sample needs
    if (stB.rule === 'polya') return fitBox(f, { x0: -0.05, x1: 1.05, y0: -0.08, y1: 1.0 }, 0.03);
    const b = dataB().box;
    return fitBox(f, { x0: Math.min(b.x0, -0.05), x1: Math.max(b.x1, 1.05), y0: Math.min(b.y0, -0.08), y1: Math.max(b.y1, 0.6) }, 0.04);
  }, (f, v) => {
    const c = f.ctx, D = dataB();
    paper(f, PRINT.paper); toWorld(f, v);
    const Lmin = Math.pow(Math.SQRT1_2, stB.n) * v.s;
    c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineCap = 'round';
    c.lineWidth = Math.max(0.5, Math.min(2.2, Lmin * 0.18)) / v.s;
    c.stroke(D.path);
    toScreen(f);
    dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  const MODES_B = { polya: 'Pólya sweep', flip: 'Flip-flop', iso: 'Isotropic', gauss: 'Gaussian (Brown)' };
  const INFO_B = {
    polya: 'The nonrandom reference: every midpoint goes left or right by a fixed parity rule, and the teragons sweep the right triangle on [0, 1]. The identity |ΔP|² = |Δ₁P|² + |Δ₂P|² holds exactly, side by side.',
    flip: 'First departure: each midpoint goes left or right by a fair coin — a "random flip-flop curve". The displacement is still transversal and of fixed length, so the identity still holds exactly.',
    iso: 'Second departure: the direction is read off a spun circle, so the displacements are isotropic. The identity now holds in the mean: increments over the two half-spans are statistically orthogonal.',
    gauss: 'Final form: the displacement is an isotropic Gaussian with ⟨|ΔM|²⟩ = Δt/4, and the initiator, too, would be randomized. The limit of this rule is the Brown trail B(t), of dimension exactly 2.',
  };
  function setB(refit) {
    const D = dataB(), m = D.P.length / 2 - 1;
    markMB(stB.rule); markSB(stB.n);
    $('cBt').textContent = MODES_B[stB.rule];
    $('infoB').innerHTML = INFO_B[stB.rule];
    $('sBv').textContent = `stage ${stB.n}`; $('cBs').textContent = stB.n; $('cBn').textContent = `${fmt(m)} piece${m > 1 ? 's' : ''}`;
    $('rBa').textContent = fmt(m);
    $('rBb').textContent = D.ratio.toFixed(3);
    $('rBc').textContent = D.rep === 0 ? 'none' : `${fmt(D.rep)} of ${fmt(m + 1)}`;
    $('seedBv').textContent = stB.rule === 'polya' ? 'nonrandom' : `seed ${stB.seed}`;
    $('againB').disabled = stB.rule === 'polya';
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Midpoint rule: ${MODES_B[k]}`, (k) => { stB.rule = k; setB(true); });
  const markSB = stepButtons($('sB'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14], String, (n) => `Stage ${n}`, (n) => { stB.n = n; setB(true); });
  $('againB').addEventListener('click', () => { stB.seed++; setB(true); });
  {
    const P1 = midpointCurve(1, 'polya', 1), P2 = midpointCurve(2, 'polya', 1);
    const shift = (P, dx) => Array.from({ length: P.length / 2 }, (_, i) => [P[2 * i] + dx, P[2 * i + 1]]);
    $('miniMD').innerHTML = `<polyline points="${svgPts(shift(P1, 0))}" fill="none" stroke="currentColor" stroke-width="0.02" stroke-linejoin="round"/>` +
      `<polyline points="${svgPts(shift(P2, 1.24))}" fill="none" stroke="currentColor" stroke-width="0.02" stroke-linejoin="round"/>` +
      `<g fill="currentColor"><circle cx="0" cy="0" r="0.03"/><circle cx="1" cy="0" r="0.03"/><circle cx="0.5" cy="-0.5" r="0.018"/>` +
      `<circle cx="1.24" cy="0" r="0.03"/><circle cx="2.24" cy="0" r="0.03"/></g>`;
  }

  // ====================== Plate 241: the coin-toss walk and its zeroset ======================
  const N_TOSS = 10000, SAMPLE = 20;
  const stA = { seed: 2, zeros: false };
  let cacheA = { key: '' }, gapSlopeMemo = null;
  function dataA() {
    const key = String(stA.seed);
    if (cacheA.key === key) return cacheA;
    const { S, zeros } = coinWalk(N_TOSS, stA.seed);
    let m1 = 1, m2 = 1;
    for (let i = 0; i <= 550; i++) m1 = Math.max(m1, Math.abs(S[i]));
    for (let i = 0; i <= N_TOSS; i++) m2 = Math.max(m2, Math.abs(S[i]));
    let longest = 0, last = 0;
    for (const z of zeros) { longest = Math.max(longest, z - last); last = z; }
    return (cacheA = { key, S, zeros, m1, m2, longest });
  }
  // three panels in the plate's arrangement: the start toss by toss, then the whole record
  // with time compressed tenfold and heights by √10 (the walk's self-affine ratio)
  const PANELS = [
    { t0: 0, t1: 550, x0: 4, x1: 96, axis: 62, step: 1, ticks: [100, 200, 300, 400, 500], aff: 1 },
    { t0: 0, t1: 6000, x0: 2, x1: 98, axis: 36, step: SAMPLE, ticks: [500, 1000, 2000, 3000, 4000, 5000, 6000], aff: Math.sqrt(10) },
    { t0: 6000, t1: 10000, x0: 2, x1: 66, axis: 12, step: SAMPLE, ticks: [6000, 7000, 8000, 9000, 10000], aff: Math.sqrt(10) },
  ];
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, { x0: 0, x1: 100, y0: 2, y1: 74 }, 0.02), (f, v) => {
    const c = f.ctx, D = dataA();
    const k = Math.min(1.1, 9 / D.m1, (9 * Math.sqrt(10)) / D.m2);   // world units per penny, top panel
    paper(f, PRINT.paper); toWorld(f, v);
    const r = 0.33;
    for (const p of PANELS) {
      const px = (t) => p.x0 + ((t - p.t0) / (p.t1 - p.t0)) * (p.x1 - p.x0), ky = k / p.aff;
      c.strokeStyle = PRINT.ink; c.lineWidth = 1 / v.s;
      c.beginPath(); c.moveTo(p.x0 - 0.5, p.axis); c.lineTo(p.x1 + 0.5, p.axis);
      for (const t of p.ticks) { c.moveTo(px(t), p.axis); c.lineTo(px(t), p.axis - 0.8); }
      c.stroke();
      c.fillStyle = PRINT.ink; c.beginPath();
      for (let t = p.t0; t <= p.t1; t += p.step) { const x = px(t), y = p.axis + D.S[t] * ky; c.moveTo(x + r, y); c.arc(x, y, r, 0, 2 * Math.PI); }
      c.fill();
      if (stA.zeros) {
        c.strokeStyle = PRINT.red; c.lineWidth = 1.6 / v.s; c.beginPath();
        for (const z of D.zeros) if (z >= p.t0 && z <= p.t1) { const x = px(z); c.moveTo(x, p.axis - 1.6); c.lineTo(x, p.axis - 0.2); }
        c.stroke();
      }
    }
    // tick labels, in screen space so they stay crisp
    toScreen(f);
    c.fillStyle = PRINT.muted; c.font = '500 11px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
    for (const p of PANELS) for (const t of p.ticks) {
      const x = p.x0 + ((t - p.t0) / (p.t1 - p.t0)) * (p.x1 - p.x0);
      c.fillText(t.toLocaleString('en-US'), v.ox + x * v.s, v.oy - (p.axis - 1.3) * v.s);
    }
  });
  function setA() {
    const D = dataA();
    $('zerosA').checked = stA.zeros;
    $('seedAv').textContent = `seed ${stA.seed}`;
    $('rAa').textContent = fmt(D.zeros.length);
    $('rAb').textContent = `${fmt(D.longest)} tosses`;
    $('rAc').textContent = `${D.S[N_TOSS] > 0 ? '+' : ''}${fmt(D.S[N_TOSS])}`;
    if (gapSlopeMemo === null) gapSlopeMemo = zeroGapSlope(200, N_TOSS);
    $('rAd').textContent = gapSlopeMemo.toFixed(2);
    zA.schedule();
  }
  $('zerosA').addEventListener('change', (e) => { stA.zeros = e.target.checked; setA(); });
  $('plate241').addEventListener('click', () => { stA.seed++; setA(); });

  // ====================== Plates 242–243: Brown hulls, open trail and loop ======================
  const STEP_CHOICES = [25000, 50000, 100000, 200000, 400000];
  function latticeSection(ids, loop, defaults) {
    const st = { steps: defaults.steps, seed: defaults.seed, mode: defaults.mode };
    let cache = { key: '' };
    function data() {
      const key = `${st.steps}|${st.seed}`;
      if (cache.key === key) return cache;
      const { X, Y } = latticeWalk(st.steps, st.seed, loop);
      const h = hullData(X, Y);
      return (cache = { key, h, stats: boxStats(h), imgs: {}, start: [X[0] + h.sx, Y[0] + h.sy] });
    }
    const img = (D) => (D.imgs[st.mode] ||= rasterCanvas(D.h, st.mode));
    const z = zoomable(ids.w, ids.c, (f) => {
      const { W, H } = data().h, m = Math.max(W, H) * 0.02;
      return fitBox(f, { x0: -m, x1: Math.max(W, H) + m, y0: -m, y1: Math.max(W, H) + m }, 0.01);
    }, (f, v) => {
      const c = f.ctx, D = data(), { W, H } = D.h, pad = (Math.max(W, H) - W) / 2, padY = (Math.max(W, H) - H) / 2;
      paper(f, PRINT.paper);
      c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      c.imageSmoothingEnabled = v.s < 1;          // crisp raster cells once zoomed past 1 cell per pixel
      c.drawImage(img(D), v.ox + pad * v.s, v.oy - (H + padY) * v.s, W * v.s, H * v.s);
      if (st.mode !== 'hull') dot(c, v, D.start[0] + pad, (H + padY) - D.start[1], 3.5);
    });
    function set(refit) {
      const D = data();
      mark.mode(st.mode); mark.steps(st.steps);
      $(ids.title).textContent = ids.names[st.mode];
      $(ids.info).innerHTML = ids.infos[st.mode];
      $(ids.count).textContent = `${fmt(st.steps)} steps`;
      $(ids.raster).textContent = `raster ${fmt(D.h.W)} × ${fmt(D.h.H)}`;
      $(ids.seedv).textContent = `seed ${st.seed}`;
      $(ids.r1).textContent = fmt(D.h.trail);
      $(ids.r2).textContent = fmt(D.h.gaps);
      if (ids.r3kind === 'bound') $(ids.r3).textContent = fmt(D.h.bound);
      else $(ids.r3).textContent = `≈ ${D.stats.dimB.toFixed(2)}`;
      $(ids.r4).textContent = ids.r4kind === 'dim' ? `≈ ${D.stats.dimB.toFixed(2)}` : `≈ ${D.stats.slopeLA.toFixed(2)}`;
      if (refit) z.refit(); else z.schedule();
    }
    const mark = {
      mode: stepButtons($(ids.m), Object.keys(ids.names), (k) => ids.modeLabels[k], (k) => `Show: ${ids.modeLabels[k]}`, (k) => { st.mode = k; set(false); }),
      steps: stepButtons($(ids.s), STEP_CHOICES, (n) => (n >= 1000 ? `${n / 1000}k` : String(n)), (n) => `${fmt(n)} steps`, (n) => { st.steps = n; set(true); }),
    };
    $(ids.again).addEventListener('click', () => { st.seed++; set(true); });
    $(ids.plate).addEventListener('click', () => { Object.assign(st, defaults); set(true); });
    set(true);
    return { st, set };
  }

  latticeSection({
    w: 'wC', c: 'cC', title: 'cCt', info: 'infoC', count: 'cCn', raster: 'cCr', m: 'mC', s: 'sC',
    again: 'againC', plate: 'plate242', seedv: 'seedCv', r1: 'rCa', r2: 'rCb', r3: 'rCc', r3kind: 'bound', r4: 'rCd', r4kind: 'dim',
    names: { hull: 'Brown hull', net: 'Trail and gaps', boundary: 'Boundary alone' },
    modeLabels: { hull: 'Hull, as printed', net: 'Trail and gaps', boundary: 'Boundary alone' },
    infos: {
      hull: '<b>Plate 242.</b> The hull of a nonlooping Brown trail: the trail with its gaps filled in, a solid silhouette whose crinkled edge is the self-avoiding Brownian motion.',
      net: 'The same sample before filling: the trail in black is a fractal net, and the gray lakes inside it are the Brown gaps. The red dot marks the trail\'s point of departure.',
      boundary: 'Only the cells of the trail that touch the exterior: the hull\'s boundary, conjectured here (and proved in 2001) to have dimension 4/3.',
    },
  }, false, { steps: 200000, seed: 3, mode: 'hull' });

  latticeSection({
    w: 'wD', c: 'cD', title: 'cDt', info: 'infoD', count: 'cDn', raster: 'cDr', m: 'mD', s: 'sD',
    again: 'againD', plate: 'plate243', seedv: 'seedDv', r1: 'rDa', r2: 'rDb', r3: 'rDc', r3kind: 'dim', r4: 'rDd', r4kind: 'slope',
    names: { net: 'Brown loop', hull: 'Brown island', boundary: 'Self-avoiding boundary' },
    modeLabels: { net: 'Loop, as printed', hull: 'The island', boundary: 'Boundary alone' },
    infos: {
      net: '<b>Plate 243.</b> The loop in black; the maximal open domains it never visits in gray — tremas bounded by fractals, which make the loop a net. The red dot is the departure the walk returns to.',
      hull: 'Filling the gray tremas gives the Brown hull, or Brown island: the loop plus its whole interior.',
      boundary: 'The island\'s coastline alone: self-avoiding Brownian motion, dimension 4/3, the same dimension Mandelbrot had inferred for the self-avoiding random walk.',
    },
  }, true, { steps: 200000, seed: 7, mode: 'net' });

  setB(true); setA();
})();
