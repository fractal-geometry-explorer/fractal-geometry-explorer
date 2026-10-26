(() => {
  const pow = Math.pow, sup = (n) => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);

  // ====================== Figure, p. 329: the spin impurity ======================
  const PRINT_ROWS = 14, PRINT_WIN = 13;
  const stA = { mode: 'printed', T: 256, gasket: false };
  const cacheA = {};
  function glyphPaths(rows) {
    // the printed glyphs, on the measured grid: x = n, y = −t · SPIN_PITCH
    const plus = new Path2D(), minus = new Path2D();
    for (let t = 0; t < rows.length; t++) {
      const y = -t * SPIN_PITCH, row = rows[t];
      for (let n = -PRINT_WIN; n <= PRINT_WIN; n++) {
        if ((((n + t) % 2) + 2) % 2 !== 0) continue;
        if (row.has(n)) {
          plus.rect(n - PLUS_W / 2, y - GLYPH_T / 2, PLUS_W, GLYPH_T);
          plus.rect(n - GLYPH_T / 2, y - PLUS_H / 2, GLYPH_T, PLUS_H);
        } else minus.rect(n - MINUS_W / 2, y - GLYPH_T / 2, MINUS_W, GLYPH_T);
      }
    }
    return { plus, minus };
  }
  function dataA() {
    const key = stA.mode === 'printed' ? 'printed' : `grow${stA.T}`;
    if (cacheA[key]) return cacheA[key];
    let out;
    if (stA.mode === 'printed') out = glyphPaths(spinRows(PRINT_ROWS));
    else {
      const rows = spinRows(stA.T);
      let total = 0;
      const cells = chunked(rows.length, (p, t) => { for (const n of rows[t]) { p.rect(n - 1, -t - 0.5, 2, 1); total++; } }, 64);
      out = { cells, total, last: rows[rows.length - 1].size };
    }
    return (cacheA[key] = out);
  }
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'printed') return fitBox(f, { x0: -PRINT_WIN - 0.6, x1: PRINT_WIN + 0.6, y0: -(PRINT_ROWS - 1) * SPIN_PITCH - 0.6, y1: 0.6 }, 0.03);
    return fitBox(f, { x0: -stA.T, x1: stA.T, y0: -stA.T + 0.5, y1: 0.5 }, 0.03);
  }, (f, v) => {
    const c = f.ctx, D = dataA();
    paper(f, PRINT.paper); toWorld(f, v);
    c.fillStyle = PRINT.ink;
    if (stA.mode === 'printed') { c.fill(D.plus); c.fill(D.minus); }
    else {
      for (const p of D.cells) c.fill(p);
      if (stA.gasket) {
        c.strokeStyle = PRINT.red; c.lineWidth = 1.2 / v.s; c.lineJoin = 'round';
        const T = stA.T, tris = gasketTris(6);
        c.beginPath();
        for (const [ax, ay, bx, by, cx, cy] of tris) {
          c.moveTo(ax * T, ay * T); c.lineTo(bx * T, by * T); c.lineTo(cx * T, cy * T); c.closePath();
        }
        c.stroke();
      }
    }
    toScreen(f);
  });
  const MODES_A = { printed: 'As printed', grow: 'More steps' };
  const INFO_A = {
    printed: 'The book\'s own 14 rows, t = 0 at the top. Even rows carry 13 signs and odd rows 14 — the spins sit on even points at even times and odd points at odd times, so the columns interleave.',
    grow: 'Each + is now a cell. Run the rule longer and shrink the cells to keep the triangle in view — this is the downsizing of the chapter — and the gasket\'s holes open at every scale. The overlay is the true Sierpiński gasket, the limit this picture converges to.',
  };
  function setA(refit) {
    markMA(stA.mode);
    $('growA').hidden = stA.mode !== 'grow';
    $('infoA').innerHTML = INFO_A[stA.mode];
    if (stA.mode === 'printed') {
      $('cAt').textContent = 'As printed';
      $('cAn').textContent = '14 rows, t = 0 to 13';
      $('rAa').textContent = '14';
      $('rAb').textContent = '8';
      $('rAc').textContent = '57';
    } else {
      const D = dataA(), T = stA.T, k = Math.log2(T);
      markSA(T);
      $('sAv').textContent = `${fmt(T)} rows`;
      $('cAt').textContent = 'Downsized';
      $('cAn').textContent = `${fmt(T)} rows · cells 1/${fmt(T)} of the height`;
      $('rAa').textContent = fmt(T);
      $('rAb').textContent = `${fmt(D.last)} = 2${sup(popcount(T - 1))}`;
      $('rAc').textContent = Number.isInteger(k) ? `${fmt(D.total)} = 3${sup(k)}` : fmt(D.total);
    }
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Draw: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markSA = stepButtons($('sA'), [32, 64, 128, 256, 512, 1024], String, (T) => `${T} rows`, (T) => { stA.T = T; setA(true); });
  $('gasketA').addEventListener('change', (e) => { stA.gasket = e.target.checked; setA(false); });
  $('fig329').addEventListener('click', () => { stA.mode = 'printed'; setA(true); });
  // the rule, as three little before-and-after triplets
  (() => {
    const G = 0.1, sym = (x, y, p) => p
      ? `<rect x="${x - 0.28}" y="${y - G / 2}" width="0.56" height="${G}"/><rect x="${x - G / 2}" y="${y - 0.28}" width="${G}" height="0.56"/>`
      : `<rect x="${x - 0.25}" y="${y - G / 2}" width="0.5" height="${G}"/>`;
    const trip = (ox, a, b) => sym(ox + 0.5, 0.55, a) + sym(ox + 1.7, 0.55, b) +
      `<path d="M ${ox + 1.1} 1.15 l 0 0.7 m -0.14 -0.26 l 0.14 0.26 l 0.14 -0.26" fill="none" stroke="currentColor" stroke-width="0.07"/>` +
      sym(ox + 1.1, 2.45, a !== b);
    $('miniA').innerHTML = `<g fill="currentColor">${trip(0.2, 0, 0)}${trip(3.4, 1, 0)}${trip(6.6, 1, 1)}</g>`;
  })();

  // ====================== Two kinds of convergence ======================
  const KOCH = genFromCodes([[0, 0], [1 / 3, 0], [0.5, Math.sqrt(3) / 6], [2 / 3, 0], [1, 0]], [0, 0, 0, 0]);
  const stB = { k: 4, ghost: true, seed: 11 };
  const kochAt = (k) => (kochAt.c || (kochAt.c = {}))[k] || (kochAt.c[k] = k ? curveOf(Array(k).fill(KOCH)) : new Float64Array([0, 0, 1, 0]));
  const cacheB = {};
  function walkAt(k) {
    const key = `${stB.seed}|${k}`;
    return cacheB[key] || (cacheB[key] = downsizedWalk(k, stB.seed * 37 + k));
  }
  // the walk, placed in the scene: fitted into a unit box centred at (1.85, 0.14), the current
  // refinement's transform reused for its ghost so the two can be compared
  function placeB(P, bb) {
    const s = 0.94 / Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0, 1e-9);
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, out = new Float64Array(P.length);
    for (let i = 0; i < P.length; i += 2) { out[i] = 1.85 + (P[i] - cx) * s; out[i + 1] = 0.14 + (P[i + 1] - cy) * s; }
    return out;
  }
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, { x0: -0.03, x1: 2.38, y0: -0.42, y1: 0.7 }, 0.03), (f, v) => {
    const c = f.ctx, k = stB.k;
    paper(f, PRINT.paper); toWorld(f, v);
    const cur = walkAt(k), bb = bbox(cur);
    const W = placeB(cur, bb);
    if (stB.ghost) {
      c.strokeStyle = PRINT.red; c.lineWidth = 1.1 / v.s; c.lineJoin = 'round'; c.globalAlpha = 0.65;
      c.stroke(polyPath(kochAt(k - 1), false));
      c.stroke(polyPath(placeB(walkAt(k - 1), bb), false));
      c.globalAlpha = 1;
    }
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.4 / v.s; c.lineJoin = 'round';
    c.stroke(polyPath(kochAt(k), false));
    c.stroke(polyPath(W, false));
    toScreen(f);
    c.fillStyle = PRINT.muted; c.font = '600 11.5px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText(`Koch teragon, stage ${k}`, v.ox + 0.5 * v.s, v.oy + 0.38 * v.s);
    c.fillText(`random walk, 4${sup(k)} steps`, v.ox + 1.85 * v.s, v.oy + 0.38 * v.s);
  });
  function setB(refit) {
    markSB(stB.k);
    const k = stB.k;
    $('sBv').textContent = `k = ${k}`;
    $('cBn').textContent = `stage ${k} beside a walk of ${fmt(pow(4, k))} steps of length 1/${fmt(pow(2, k))}`;
    $('infoB').innerHTML = stB.ghost
      ? 'Step up the refinement and watch the ghosts: the teragon barely moves off its red shadow, while the walk abandons its shadow entirely — a fresh walk every time, as weak convergence demands.'
      : 'Step up the refinement: the teragon adds ever finer wiggles to the same curve, while the walk is drawn anew from scratch at every refinement.';
    $('rBa').textContent = strayFrom(kochAt(k), kochAt(k - 1)).toFixed(4);
    $('rBb').textContent = strayFrom(walkAt(k), walkAt(k - 1)).toFixed(3);
    $('rBc').textContent = fmt(pow(4, k));
    $('rBd').textContent = fmt(pow(4, k));
    if (refit) zB.refit(); else zB.schedule();
  }
  const markSB = stepButtons($('sB'), [1, 2, 3, 4, 5, 6, 7], String, (k) => `Refinement ${k}`, (k) => { stB.k = k; setB(false); });
  $('ghostB').addEventListener('change', (e) => { stB.ghost = e.target.checked; setB(false); });
  $('newB').addEventListener('click', () => { stB.seed = (stB.seed * 16807 + 3) % 2147483647; setB(false); });

  // ====================== The self-avoiding walk ======================
  const stC = { mode: 'walk', n: 500, seed: 5 };
  const SWEEPS_QUICK = 2, SWEEPS_FULL = 12;
  let walkC = null, pendingC = 0, chartC = null, chartJob = 0;
  function growWalkC() {
    const { n, seed } = stC, rnd = rng32(seed * 101 + n);
    walkC = sarwStart(n);
    sarwPivot(walkC, SWEEPS_QUICK * n, rnd);
    const job = ++pendingC;
    setTimeout(() => {
      if (job !== pendingC) return;
      sarwPivot(walkC, (SWEEPS_FULL - SWEEPS_QUICK) * n, rnd);
      setC(true);
    }, 30);
  }
  const CHART_NS = [48, 96, 192, 384, 768], CHART_M = 16;
  function growChartC() {
    const job = ++chartJob;
    chartC = { pts: [], fit: null, seed: stC.seed };
    const step = (i) => {
      if (job !== chartJob) return;
      if (i >= CHART_NS.length) {
        let sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (const [x, y] of chartC.pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
        const m = chartC.pts.length, slope = (m * sxy - sx * sy) / (m * sxx - sx * sx);
        chartC.fit = { slope, b: (sy - slope * sx) / m };
        setC(false);
        return;
      }
      const n = CHART_NS[i], rnd = rng32(stC.seed * 977 + n), w = sarwStart(n);
      sarwPivot(w, 15 * n, rnd);
      let s2 = 0;
      for (let m = 0; m < CHART_M; m++) { sarwPivot(w, 2 * n, rnd); const r = sarwR(w); s2 += r * r; }
      chartC.pts.push([Math.log(n), 0.5 * Math.log(s2 / CHART_M)]);
      setC(false);
      setTimeout(() => step(i + 1), 20);
    };
    step(0);
  }
  const zC = zoomable('wC', 'cC', (f) => {
    if (stC.mode === 'chart' || !walkC) return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
    const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (let i = 0; i <= walkC.n; i++) { bb.x0 = Math.min(bb.x0, walkC.X[i]); bb.x1 = Math.max(bb.x1, walkC.X[i]); bb.y0 = Math.min(bb.y0, walkC.Y[i]); bb.y1 = Math.max(bb.y1, walkC.Y[i]); }
    const padw = Math.max(2, (bb.x1 - bb.x0) * 0.04), padh = Math.max(2, (bb.y1 - bb.y0) * 0.04);
    return fitBox(f, { x0: bb.x0 - padw, x1: bb.x1 + padw, y0: bb.y0 - padh, y1: bb.y1 + padh }, 0.02);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    if (stC.mode === 'walk') {
      toWorld(f, v);
      const { X, Y, n } = walkC, p = new Path2D();
      p.moveTo(X[0], Y[0]);
      for (let i = 1; i <= n; i++) p.lineTo(X[i], Y[i]);
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(1.2 / v.s, 0.14); c.lineJoin = 'round'; c.stroke(p);
      toScreen(f);
      dot(c, v, X[0], Y[0], 4, PRINT.accent); dot(c, v, X[n], Y[n], 4, PRINT.red);
      c.strokeStyle = PRINT.muted; c.lineWidth = 1.2; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(v.ox + X[0] * v.s, v.oy - Y[0] * v.s); c.lineTo(v.ox + X[n] * v.s, v.oy - Y[n] * v.s); c.stroke(); c.setLineDash([]);
    } else {
      toScreen(f);
      const ml = 56, mr = 16, mt = 14, mb = 36, iw = f.w - ml - mr, ih = f.h - mt - mb;
      const lx0 = Math.log(36), lx1 = Math.log(1100), ly0 = Math.log(8), ly1 = Math.log(220);
      const X = (lx) => ml + ((lx - lx0) / (lx1 - lx0)) * iw, Y = (ly) => mt + ih - ((ly - ly0) / (ly1 - ly0)) * ih;
      c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, mt, iw, ih);
      c.fillStyle = PRINT.muted; c.font = '500 10.5px "IBM Plex Mono", monospace';
      c.textAlign = 'center'; c.textBaseline = 'top';
      for (const n of [48, 96, 192, 384, 768]) { const x = X(Math.log(n)); c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(x, mt); c.lineTo(x, mt + ih); c.stroke(); c.fillText(String(n), x, mt + ih + 6); }
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (const r of [10, 20, 50, 100, 200]) { const y = Y(Math.log(r)); c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(ml, y); c.lineTo(ml + iw, y); c.stroke(); c.fillText(String(r), ml - 6, y); }
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText('steps n', ml + iw / 2, f.h - 15);
      c.save(); c.translate(14, mt + ih / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText('RMS displacement R', 0, 0); c.restore();
      if (chartC) {
        // the reference slope 3/4 through the first point, dashed
        if (chartC.pts.length) {
          const [x0, y0] = chartC.pts[0];
          c.strokeStyle = PRINT.muted; c.lineWidth = 1.2; c.setLineDash([6, 4]);
          c.beginPath(); c.moveTo(X(lx0), Y(y0 + 0.75 * (lx0 - x0))); c.lineTo(X(lx1), Y(y0 + 0.75 * (lx1 - x0))); c.stroke(); c.setLineDash([]);
          c.fillStyle = PRINT.muted; c.textAlign = 'left'; c.textBaseline = 'bottom';
          c.fillText('slope 3/4', X(lx1) - 70, Y(y0 + 0.75 * (lx1 - x0)) - 4);
        }
        if (chartC.fit) {
          const { slope, b } = chartC.fit;
          c.strokeStyle = PRINT.red; c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(X(lx0), Y(b + slope * lx0)); c.lineTo(X(lx1), Y(b + slope * lx1)); c.stroke();
          c.fillStyle = PRINT.red; c.textAlign = 'left'; c.textBaseline = 'top';
          c.fillText(`fit: slope ${slope.toFixed(3)} → D ≈ ${(1 / slope).toFixed(2)}`, ml + 10, mt + 8);
        }
        for (const [lx, ly] of chartC.pts) { c.beginPath(); c.arc(X(lx), Y(ly), 4, 0, 2 * Math.PI); c.fillStyle = PRINT.ink; c.fill(); }
        if (!chartC.fit) { c.fillStyle = PRINT.muted; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('growing walks…', ml + 10, mt + 8); }
      }
    }
  });
  const MODES_C = { walk: 'One walk', chart: 'The scaling law' };
  const INFO_C = {
    walk: 'One self-avoiding walk, equilibrated by the pivot algorithm, from the blue end to the red. The dashed line is the end-to-end displacement R. Draw a few: the chain is swollen — R runs near n<sup>3/4</sup>, well above a random walk\'s n<sup>1/2</sup>.',
    chart: 'Sixteen walks at each length, their root-mean-square R on log paper. The points climb along slope 3/4 = 1/D: the walk fills the plane like a fractal of dimension 4/3.',
  };
  function setC(refit) {
    markMC(stC.mode); markNC(stC.n);
    $('nCwrap').hidden = stC.mode !== 'walk';
    $('cCt').textContent = MODES_C[stC.mode];
    $('infoC').innerHTML = INFO_C[stC.mode];
    if (stC.mode === 'walk') {
      const R = sarwR(walkC);
      $('cCn').textContent = `n = ${fmt(walkC.n)} steps on the square lattice`;
      $('rCa').textContent = fmt(walkC.n);
      $('rCb').textContent = R.toFixed(1);
      $('rCc').textContent = pow(walkC.n, 0.75).toFixed(1);
      $('rCd').textContent = '—';
    } else {
      $('cCn').textContent = `${CHART_M} walks at each of n = 48 … 768`;
      $('rCa').textContent = '48 … 768';
      $('rCb').textContent = $('rCc').textContent = '—';
      $('rCd').textContent = chartC && chartC.fit ? (1 / chartC.fit.slope).toFixed(2) + ' ≈ 4/3' : '…';
    }
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => {
    stC.mode = k;
    if (k === 'chart' && (!chartC || chartC.seed !== stC.seed)) growChartC();
    setC(true);
  });
  const markNC = stepButtons($('nC'), [100, 250, 500, 1000], String, (n) => `${n} steps`, (n) => { stC.n = n; growWalkC(); setC(true); });
  $('newC').addEventListener('click', () => {
    stC.seed = (stC.seed * 48271 + 7) % 2147483647;
    if (stC.mode === 'walk') { growWalkC(); setC(true); } else growChartC();
  });

  // ====================== Rivers ======================
  const stD = { G: 48, seed: 9, trace: true };
  let netD = null, hackD = null, longD = null;
  function growD() {
    netD = riverNetwork(stD.G, stD.seed * 13 + stD.G);
    hackD = hackFit(netD);
    longD = longestRiver(netD);
  }
  const widthOf = (net, a) => 0.055 + 0.8 * Math.sqrt(a * 2) / net.G;
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, { x0: -1, x1: stD.G, y0: -1, y1: stD.G }, 0.015), (f, v) => {
    const c = f.ctx, { G, parent, exit, area } = netD;
    paper(f, PRINT.paper); toWorld(f, v);
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = PRINT.ink;
    // segments bucketed by line width, widest buckets drawn last
    const NB = 10, buckets = Array.from({ length: NB }, () => new Path2D());
    const wMax = widthOf(netD, G * G / 2);
    for (let i = 0; i < G * G; i++) {
      const x = i % G, y = (i / G) | 0, w = widthOf(netD, area[i]);
      const b = buckets[Math.min(NB - 1, Math.floor((w / wMax) * NB))];
      b.moveTo(x, y);
      if (parent[i] >= 0) b.lineTo(parent[i] % G, (parent[i] / G) | 0);
      else { const d = exit[i] < 0 ? 0 : exit[i]; b.lineTo(x + [1, -1, 0, 0][d], y + [0, 0, 1, -1][d]); }
    }
    buckets.forEach((p, k) => { c.lineWidth = ((k + 0.5) / NB) * wMax; c.stroke(p); });
    if (stD.trace && longD.length > 1) {
      c.strokeStyle = PRINT.red; c.lineWidth = Math.max(0.22, 2 / v.s);
      c.beginPath();
      c.moveTo(longD[0] % G, (longD[0] / G) | 0);
      for (let i = 1; i < longD.length; i++) c.lineTo(longD[i] % G, (longD[i] / G) | 0);
      const o = longD[longD.length - 1];
      if (parent[o] === -1) { const d = exit[o] < 0 ? 0 : exit[o]; c.lineTo(o % G + [1, -1, 0, 0][d], ((o / G) | 0) + [0, 0, 1, -1][d]); }
      c.stroke();
    }
    toScreen(f);
  });
  function setD(refit) {
    markGD(stD.G);
    const { G } = netD;
    $('cDn').textContent = `${G} × ${G} squares · ${fmt(netD.roots.length)} outlets`;
    $('infoD').innerHTML = `Every one of the ${fmt(G * G)} squares drains, through the network, off the edge of the map. The longest river runs ${fmt(longD.length)} squares from its source to the edge${stD.trace ? ' (in red)' : ''}; thickness shows the drainage area each reach carries.`;
    $('rDa').textContent = hackD.slope.toFixed(3);
    $('rDb').textContent = (2 * hackD.slope).toFixed(2);
    $('rDd').textContent = `${fmt(longD.length)} squares`;
    if (refit) zD.refit(); else zD.schedule();
  }
  const markGD = stepButtons($('gD'), [32, 48, 64], (G) => `${G}²`, (G) => `Grid ${G} by ${G}`, (G) => { stD.G = G; growD(); setD(true); });
  $('missD').addEventListener('change', (e) => { stD.trace = e.target.checked; setD(false); });
  $('newD').addEventListener('click', () => { stD.seed = (stD.seed * 69621 + 1) % 2147483647; growD(); setD(false); });

  growWalkC(); growD();
  setA(true); setB(true); setC(true); setD(true);
})();
