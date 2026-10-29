(() => {
  const sup = (n) => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x) => { if (x >= 0.001) return x.toFixed(x >= 0.1 ? 3 : 4); const [m, e] = x.toExponential(1).split('e'); return `${m}·10⁻${sup(-e)}`; };

  // ====================== Plate 323: diamond tremas and lacunarity ======================
  const SQ = 0.75, NDL = 0.02;                            // the two printed panels' aspects (fitted)
  const stA = { mode: 'both', w: SQ, D: 1.5, seed: 2 };
  const cacheA = new Map();
  function setA323(w) {
    const key = `${stA.D}|${w}|${stA.seed}`;
    if (!cacheA.has(key)) {
      if (cacheA.size > 6) cacheA.clear();
      const T = tremas323(stA.D, w, stA.seed);
      cacheA.set(key, { T, paths: diamondPaths(T), stats: analyse323(T) });
    }
    return cacheA.get(key);
  }
  const panelsA = () => (stA.mode === 'both' ? [[0, setA323(SQ)], [1.07, setA323(NDL)]] : [[0, setA323(stA.w)]]);
  // the white (uncovered) share, measured exactly by Monte Carlo against the diamonds — a raster
  // thickens sub-pixel needles and would understate it
  function whiteMC(T, n = 20000) {
    const N = T.length / 5, G = 50;
    const co = new Float64Array(N), si = new Float64Array(N);
    const cells = Array.from({ length: G * G }, () => []);
    for (let i = 0; i < N; i++) {
      const h1 = T[5 * i + 2], h2 = T[5 * i + 3], c = Math.cos(T[5 * i + 4]), s = Math.sin(T[5 * i + 4]);
      co[i] = c; si[i] = s;
      const ex = Math.abs(h1 * c) + Math.abs(h2 * s), ey = Math.abs(h1 * s) + Math.abs(h2 * c);
      const x0 = Math.max(0, Math.floor((T[5 * i] - ex) * G)), x1 = Math.min(G - 1, Math.floor((T[5 * i] + ex) * G));
      const y0 = Math.max(0, Math.floor((T[5 * i + 1] - ey) * G)), y1 = Math.min(G - 1, Math.floor((T[5 * i + 1] + ey) * G));
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) cells[gy * G + gx].push(i);
    }
    const rnd = mulberry(987654321);
    let w = 0;
    for (let k = 0; k < n; k++) {
      const x = rnd(), y = rnd(), lst = cells[Math.min(G - 1, (y * G) | 0) * G + Math.min(G - 1, (x * G) | 0)];
      let hit = false;
      for (const i of lst) {
        const dx = x - T[5 * i], dy = y - T[5 * i + 1];
        if (Math.abs(dx * co[i] + dy * si[i]) / T[5 * i + 2] + Math.abs(dy * co[i] - dx * si[i]) / T[5 * i + 3] <= 1) { hit = true; break; }
      }
      if (!hit) w++;
    }
    return w / n;
  }
  // texture, measured on a small offscreen raster: lacunarity of the white mass in boxes of
  // side 1/8, and the white components
  function analyse323(T) {
    const res = 256, off = document.createElement('canvas');
    off.width = off.height = res;
    const g = off.getContext('2d', { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, res, res);
    g.setTransform(res, 0, 0, res, 0, 0); g.fillStyle = '#000';
    for (const p of diamondPaths(T)) g.fill(p);
    const d = g.getImageData(0, 0, res, res).data, W = new Uint8Array(res * res);
    let white = 0;
    for (let i = 0; i < res * res; i++) if (d[4 * i] > 127) { W[i] = 1; white++; }
    const I = new Float64Array((res + 1) * (res + 1));
    for (let y = 0; y < res; y++) { let row = 0; for (let x = 0; x < res; x++) { row += W[y * res + x]; I[(y + 1) * (res + 1) + x + 1] = I[y * (res + 1) + x + 1] + row; } }
    const B = 32, st = 4;
    let s1 = 0, s2 = 0, n = 0;
    for (let y = 0; y + B <= res; y += st) for (let x = 0; x + B <= res; x += st) {
      const M = I[(y + B) * (res + 1) + x + B] - I[y * (res + 1) + x + B] - I[(y + B) * (res + 1) + x] + I[y * (res + 1) + x];
      s1 += M; s2 += M * M; n++;
    }
    const mean = s1 / n, lam = mean > 0 ? s2 / n / (mean * mean) : NaN;
    const lbl = new Int32Array(res * res), stack = new Int32Array(res * res);
    let comps = 0, largest = 0;
    for (let i = 0; i < res * res; i++) {
      if (!W[i] || lbl[i]) continue;
      comps++;
      let sz = 0, sp = 0;
      stack[sp++] = i; lbl[i] = comps;
      while (sp) {
        const j = stack[--sp], x = j % res;
        sz++;
        if (x > 0 && W[j - 1] && !lbl[j - 1]) { lbl[j - 1] = comps; stack[sp++] = j - 1; }
        if (x < res - 1 && W[j + 1] && !lbl[j + 1]) { lbl[j + 1] = comps; stack[sp++] = j + 1; }
        if (j >= res && W[j - res] && !lbl[j - res]) { lbl[j - res] = comps; stack[sp++] = j - res; }
        if (j < res * (res - 1) && W[j + res] && !lbl[j + res]) { lbl[j + res] = comps; stack[sp++] = j + res; }
      }
      if (sz > largest) largest = sz;
    }
    return { white: whiteMC(T), lam, comps, largest: white ? largest / white : 0 };
  }
  const zA = zoomable('wA', 'cA', (f) => (stA.mode === 'both'
    ? fitBox(f, { x0: -0.015, x1: 2.085, y0: -0.015, y1: 1.015 }, 0.012)
    : fitBox(f, { x0: -0.015, x1: 1.015, y0: -0.015, y1: 1.015 }, 0.012)), (f, v) => {
    paper(f, PRINT.paper); toWorld(f, v);
    const c = f.ctx;
    for (const [ox, set] of panelsA()) {
      c.save();
      c.beginPath(); c.rect(ox, 0, 1, 1); c.clip();
      c.translate(ox, 0);
      c.fillStyle = PRINT.ink;
      for (const p of set.paths) c.fill(p);
      c.restore();
    }
    for (const [ox] of panelsA()) { c.strokeStyle = PRINT.ink; c.lineWidth = 1.2 / v.s; c.strokeRect(ox, 0, 1, 1); }
    toScreen(f);
  });
  const MODES_A = { sq: 'Nearly a square', ndl: 'Sharp needle', both: 'Both, as printed' };
  const wSlider = $('wA323');
  const wTo = (t) => NDL * Math.pow(SQ / NDL, t);          // log scale from needle to square
  const pairFmt = (fn) => (stA.mode === 'both' ? `${fn(setA323(SQ).stats)} · ${fn(setA323(NDL).stats)}` : fn(setA323(stA.w).stats));
  let timerA = 0;
  function setA(refit, lazy) {
    markMA(stA.mode === 'both' ? 'both' : Math.abs(stA.w - SQ) < 1e-9 ? 'sq' : Math.abs(stA.w - NDL) < 1e-9 ? 'ndl' : '');
    $('wrapA').classList.toggle('r-two', stA.mode === 'both');
    $('wrapA').classList.toggle('r-sq', stA.mode !== 'both');
    $('wA323w').hidden = stA.mode === 'both';
    wSlider.value = Math.log(stA.w / NDL) / Math.log(SQ / NDL);
    $('wAv').textContent = `short diagonal = ${stA.w.toFixed(stA.w < 0.1 ? 3 : 2)} of the long one`;
    $('dAv').textContent = `D = ${stA.D.toFixed(2)}`;
    $('dA323').value = stA.D;
    $('seedAv').textContent = `seed ${stA.seed}`;
    clearTimeout(timerA);
    const apply = () => {
      $('cAt').textContent = stA.mode === 'both' ? 'Both panels' : stA.w > 0.3 ? 'Blunt diamonds' : 'Needle diamonds';
      $('cAn').textContent = stA.mode === 'both'
        ? `${fmt(setA323(SQ).T.length / 5)} + ${fmt(setA323(NDL).T.length / 5)} tremas`
        : `${fmt(setA323(stA.w).T.length / 5)} tremas`;
      $('rAa').textContent = pairFmt((s) => s.white.toFixed(3));
      $('rAb').textContent = whiteExpected323(stA.D).toFixed(3);
      $('rAc').textContent = pairFmt((s) => (Number.isNaN(s.lam) ? '—' : s.lam.toFixed(2)));
      $('rAd').innerHTML = pairFmt((s) => `${fmt(s.comps)} <small>top ${(100 * s.largest).toFixed(0)}%</small>`);
      if (refit) zA.refit(); else zA.schedule();
    };
    if (lazy) timerA = setTimeout(apply, 150); else apply();
  }
  const markMA = stepButtons($('mA'), ['sq', 'ndl', 'both'], (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => {
    const was = stA.mode;
    stA.mode = k === 'both' ? 'both' : 'single';
    if (k !== 'both') stA.w = k === 'sq' ? SQ : NDL;
    setA(was !== stA.mode);
  });
  wSlider.addEventListener('input', (e) => { stA.w = wTo(+e.target.value); setA(false, true); });
  $('dA323').addEventListener('input', (e) => { stA.D = +e.target.value; setA(false, true); });
  $('seedA').addEventListener('click', () => { stA.seed = 1 + ((Math.random() * 9999) | 0); setA(false); });
  $('plate323').addEventListener('click', () => { Object.assign(stA, { mode: 'both', D: 1.5, seed: 2 }); setA(true); });
  // the two generators as small figures, at a common area
  (() => {
    const dia = (w, dx) => { const p = Math.sqrt(0.16 / w), q = w * p; return `<polygon points="${dx + p / 2},0 ${dx},${-q / 2} ${dx - p / 2},0 ${dx},${q / 2}" fill="currentColor"/>`; };
    $('miniGen').innerHTML = dia(SQ, 0.3) + dia(NDL, 1.6);
  })();

  // ====================== Plate 325: the trema dust on the sky ======================
  const stB = { view: 'north', shape: 'pancake', D: 1.23, seed: 7, jitter: true };
  const FLAT = { pancake: 0.3, needle: 0.4, sphere: 0.5 };
  const R2 = 600, SHELLS = 5;
  let jobB = null, ptsB = [];                              // projected dots per shell bucket
  const latticeCount = () => ((4 * Math.PI) / 24) * (R2 ** 3 - (R2 / 1.5) ** 3);
  const zB = zoomable('wB', 'cB', (f) => (stB.view === 'north'
    ? fitBox(f, { x0: -0.83, x1: 0.83, y0: -0.035, y1: 1.45 }, 0.02)
    : fitBox(f, { x0: -0.83, x1: 0.83, y0: -1.45, y1: 0.035 }, 0.02)), (f, v) => {
    paper(f, PRINT.paper); toScreen(f);
    const c = f.ctx;
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.1; c.beginPath();
    ogiveOutline(stB.view === 'south').forEach(([X, Y], i) => { const sx = v.ox + X * v.s, sy = v.oy - Y * v.s; if (i) c.lineTo(sx, sy); else c.moveTo(sx, sy); });
    c.closePath(); c.stroke();
    for (let b = 0; b < SHELLS; b++) {
      const P = ptsB[b];
      if (!P || !P.length) continue;
      c.fillStyle = `rgba(21,21,21,${(0.95 - (0.6 * b) / (SHELLS - 1)).toFixed(2)})`;
      for (let i = 0; i < P.length; i += 2) c.fillRect(v.ox + P[i] * v.s - 1.1, v.oy - P[i + 1] * v.s - 1.1, 2.2, 2.2);
    }
  });
  function finishB(job) {
    const n = job.dots.length;
    $('infoB').innerHTML = n
      ? `Done: <b>${fmt(n)}</b> of the shell's ≈ ${fmt(Math.round(latticeCount()))} octant lattice points escaped every trema and are plotted, nearer shells darker.`
      : 'No lattice point of the shell escaped the tremas for this seed — an empty sky. Try another seed.';
    $('rBa').textContent = fmt(n);
    $('rBb').textContent = sci(n / latticeCount());
    $('rBc').textContent = sci(survival325(stB.D));
    $('rBd').textContent = fmt(job.originTries + 1);
  }
  function startB(refit) {
    if (jobB) jobB.cancel = true;
    const my = { cancel: false };
    jobB = my;
    ptsB = Array.from({ length: SHELLS }, () => []);
    $('infoB').textContent = 'Removing tremas and sorting the shell\'s lattice points…';
    $('rBa').textContent = $('rBb').textContent = $('rBd').textContent = '—';
    $('rBc').textContent = sci(survival325(stB.D));
    if (refit) zB.refit(); else zB.schedule();
    // the origin search and the first blocks run after the controls have painted
    setTimeout(() => {
      if (my.cancel) return;
      const run = dust325Start({ D: stB.D, shape: stB.shape, f: FLAT[stB.shape], seed: stB.seed, R2, south: stB.view === 'south', jitter: stB.jitter });
      let seen = 0;
      const south = stB.view === 'south';
      const step = () => {
        if (my.cancel) return;
        const t0 = performance.now();
        while (!run.done && performance.now() - t0 < 28) run.next();
        for (; seen < run.dots.length; seen++) {
          const [x, y, z] = run.dots[seen];
          const [X, Y, r] = projectDot(x, y, z, south);
          let b = Math.floor((SHELLS * (r - run.R1)) / (R2 - run.R1));
          if (b < 0) b = 0; else if (b >= SHELLS) b = SHELLS - 1;
          ptsB[b].push(X, Y);
        }
        zB.schedule();
        if (!run.done) { $('infoB').textContent = `Sorting the shell's lattice points… ${fmt(run.dots.length)} kept so far`; requestAnimationFrame(step); } else finishB(run);
      };
      step();
    }, 30);
  }
  const VIEWS = { north: 'Octant x, y, z > 0 (as printed)', south: 'The antipodal octant' };
  const SHAPES = { pancake: 'Flattened', needle: 'Needle-like', sphere: 'Spheres, to compare' };
  let timerB = 0;
  function setB(refit, lazy) {
    markVB(stB.view); markSB(stB.shape);
    $('dBv').textContent = `D = ${stB.D.toFixed(2)}`;
    $('dB325').value = stB.D;
    $('seedBv').textContent = `seed ${stB.seed}`;
    $('cBt').textContent = stB.view === 'north' ? 'One octant of the sky' : 'The antipodal octant';
    $('cBn').textContent = `${SHAPES[stB.shape].toLowerCase().replace(', to compare', '')} tremas · D = ${stB.D.toFixed(2)}`;
    clearTimeout(timerB);
    if (lazy) timerB = setTimeout(() => startB(refit), 220); else startB(refit);
  }
  const markVB = stepButtons($('vB'), Object.keys(VIEWS), (k) => VIEWS[k], (k) => `Show: ${VIEWS[k]}`, (k) => { stB.view = k; setB(true); });
  const markSB = stepButtons($('sB'), Object.keys(SHAPES), (k) => SHAPES[k], (k) => `Tremas: ${SHAPES[k]}`, (k) => { stB.shape = k; setB(false); });
  $('dB325').addEventListener('input', (e) => { stB.D = +e.target.value; $('dBv').textContent = `D = ${stB.D.toFixed(2)}`; setB(false, true); });
  $('jitB').addEventListener('change', (e) => { stB.jitter = e.target.checked; setB(false); });
  $('seedB').addEventListener('click', () => { stB.seed = 1 + ((Math.random() * 9999) | 0); setB(false); });
  $('plate325').addEventListener('click', () => { Object.assign(stB, { view: 'north', shape: 'pancake', D: 1.23, seed: 7, jitter: true }); $('jitB').checked = true; setB(true); });
  // the whole Hammer sky, with the octant's "gothic ogive window" marked, as on page 324
  (() => {
    const path = (pts) => pts.map(([X, Y], i) => `${i ? 'L' : 'M'}${X.toFixed(3)},${(-Y).toFixed(3)}`).join('');
    let g = '';
    for (let lam = -180; lam <= 180; lam += 45) g += `<path d="${path(Array.from({ length: 49 }, (_, i) => hammer(((i / 48) * Math.PI) - Math.PI / 2, (lam * Math.PI) / 180)))}" fill="none" stroke="currentColor" stroke-width="0.016" opacity="0.35"/>`;
    for (let phi = -60; phi <= 60; phi += 30) g += `<path d="${path(Array.from({ length: 49 }, (_, i) => hammer((phi * Math.PI) / 180, ((i / 48) * 2 - 1) * Math.PI)))}" fill="none" stroke="currentColor" stroke-width="0.016" opacity="0.35"/>`;
    g += `<path d="${path(ogiveOutline(false))}Z" fill="currentColor" opacity="0.8"/>`;
    $('miniSky').innerHTML = g;
  })();

  setA(true);
  setB(true);
})();
