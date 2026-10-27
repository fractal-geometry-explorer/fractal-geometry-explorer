(() => {

  // ---------- shared helpers for the dust figures ----------
  // grid-cell rendering, as the captions describe: "we lined the plane with a uniform grid and
  // marked the cells containing one or more stopovers". Writes straight into an ImageData so
  // millions of stopovers stay fast. Returns how many points fell inside the region.
  const idCache = { img: null };
  function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function dotPlot(f, v, pts, m, opts) {
    const W = f.canvas.width, H = f.canvas.height, dpr = f.dpr;
    const x0 = Math.max(0, Math.round((opts.x0 || 0) * dpr)), x1 = Math.min(W, Math.round((opts.x1 === undefined ? f.w : opts.x1) * dpr));
    const y0 = Math.max(0, Math.round((opts.y0 || 0) * dpr)), y1 = Math.min(H, Math.round((opts.y1 === undefined ? f.h : opts.y1) * dpr));
    if (!idCache.img || idCache.img.width !== W || idCache.img.height !== H) idCache.img = f.ctx.createImageData(W, H);
    const img = idCache.img, d = img.data, [br, bg_, bb] = hex(opts.bg), [ir, ig, ib] = hex(opts.ink);
    for (let y = y0; y < y1; y++) for (let x = x0, p = 4 * (y * W + x0); x < x1; x++, p += 4) { d[p] = br; d[p + 1] = bg_; d[p + 2] = bb; d[p + 3] = 255; }
    const cs = Math.max(1, Math.round(opts.cell * dpr)), sox = v.ox * dpr, soy = v.oy * dpr, ss = v.s * dpr, oyk = (opts.dy || 0) * dpr;
    let seen = 0;
    for (let i = 0; i < m; i++) {
      let px = sox + pts[2 * i] * ss, py = soy - pts[2 * i + 1] * ss + oyk;
      px = Math.floor(px / cs) * cs; py = Math.floor(py / cs) * cs;
      if (px < x0 || px + cs > x1 || py < y0 || py + cs > y1) continue;
      seen++;
      for (let yy = 0; yy < cs; yy++) { let p = 4 * ((py + yy) * W + px); for (let xx = 0; xx < cs; xx++, p += 4) { d[p] = ir; d[p + 1] = ig; d[p + 2] = ib; } }
    }
    f.ctx.putImageData(img, 0, 0, x0, y0, x1 - x0, y1 - y0);
    return seen;
  }
  // bounding box of a projected point set, subsampled
  function ptsBox(pts, m) {
    const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }, step = Math.max(1, Math.floor(m / 60000));
    for (let i = 0; i < m; i += step) { const x = pts[2 * i], y = pts[2 * i + 1]; if (x < bb.x0) bb.x0 = x; if (x > bb.x1) bb.x1 = x; if (y < bb.y0) bb.y0 = y; if (y > bb.y1) bb.y1 = y; }
    return bb;
  }
  // radius quantiles around the origin, for the mass–radius fit's window
  function radiusQ(pts, dims, m, lo, hi) {
    const step = Math.max(1, Math.floor(m / 20000)), rs = [];
    for (let i = 0; i < m; i += step) { let r2 = 0; for (let d = 0; d < dims; d++) { const v = pts[dims * i + d]; r2 += v * v; } if (r2 > 0) rs.push(Math.sqrt(r2)); }
    rs.sort((a, b) => a - b);
    return [rs[Math.floor(rs.length * lo)], rs[Math.floor(rs.length * hi)]];
  }

  // ====================== Plate 293: the bug, opus 2 ======================
  const stBug = { kind: 'mirror', leg: 0, n: 3 };
  let cacheBug = { key: '' };
  function bugGens() {
    const legs = stBug.leg === 0 ? [...Array(13).keys()] : [stBug.leg - 1];
    const S = stBug.kind === 'none' ? GEN_13BUG : buggyGen(GEN_13BUG, legs, stBug.kind !== 'reverse', stBug.kind !== 'mirror');
    const F = mirrorGen(S);
    return ['S', 'F', 'F', 'F'].slice(0, stBug.n).map((g) => (g === 'S' ? S : F));
  }
  function bugData() {
    const key = `${stBug.kind}|${stBug.leg}|${stBug.n}`;
    if (cacheBug.key === key) return cacheBug;
    const gens = bugGens(), L = leaves(gens);
    // the rounded sweep of Plate 69: every interval becomes a 60° arc bulging toward its own side
    const per = [6, 6, 4, 2][stBug.n - 1], out = [0, 0];
    for (const [fm, rev] of L) {
      let [ax, ay] = C.app(fm, 0, 0), [bx, by] = C.app(fm, 1, 0), side = fm[4] ? -1 : 1;
      if (rev) { [ax, ay, bx, by] = [bx, by, ax, ay]; side = -side; }
      arcPts(ax, ay, bx, by, side, per, out);
    }
    out.push(1, 0);
    // self-contact of the teragon: repeated vertices among the interval endpoints
    const seen = new Set();
    let touch = 0;
    for (const [fm, rev] of L) { const [x, y] = C.app(fm, rev ? 0 : 1, 0), k = Math.round(x * 1e7) + ',' + Math.round(y * 1e7); if (seen.has(k)) touch++; seen.add(k); }
    return (cacheBug = { key, n: L.length, pts: out, touch });
  }
  const zBug = zoomable('wBug', 'cBug', (f) => fitBox(f, { x0: -0.12, x1: 1.12, y0: -0.42, y1: 0.95 }, 0.03), (f, v) => {
    const D = bugData(), c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    const p = polyPath(D.pts, false);
    p.lineTo(1.04, -0.38); p.lineTo(-0.04, -0.38); p.closePath();
    c.fillStyle = PRINT.ink; c.fill(p);
    toScreen(f);
    $('bugRa').textContent = fmt(D.n);
    $('bugRb').textContent = stBug.kind === 'none' ? 'none' : D.touch ? fmt(D.touch) + ' touches' : 'none found';
    $('cBugT').textContent = stBug.kind === 'none' ? 'Snowflake sweep, no bug' : 'Snowflake sweep, bugged';
    $('cBugN').textContent = `stage ${stBug.n}`;
  });
  const KINDS = [['mirror', 'Mirror flipped'], ['reverse', 'Direction reversed'], ['both', 'Both']];
  const markBugK = stepButtons($('bugKind'), KINDS.map((k) => k[0]), (k) => KINDS.find((e) => e[0] === k)[1], (k) => `Bug: ${k}`, (k) => { stBug.kind = k; setBug(); });
  const markBugL = stepButtons($('bugLeg'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0], (l) => (l === 0 ? 'all' : String(l)), (l) => (l === 0 ? 'Every leg' : `Leg ${l}`), (l) => { stBug.leg = l; if (stBug.kind === 'none') stBug.kind = 'mirror'; setBug(); });
  const markBugS = stepButtons($('bugS'), [1, 2, 3, 4], String, (n) => `Stage ${n}`, (n) => { stBug.n = n; setBug(); });
  $('bugNone').addEventListener('click', () => { stBug.kind = 'none'; setBug(); });
  function setBug() {
    markBugK(stBug.kind); markBugL(stBug.leg); markBugS(stBug.n);
    $('bugLegV').textContent = stBug.kind === 'none' ? 'no bug' : stBug.leg === 0 ? 'every leg' : `leg ${stBug.leg}`;
    $('bugSV').textContent = `stage ${stBug.n}`;
    zBug.schedule();
  }

  // ====================== Plate 295: nonrandom subordination ======================
  const st295 = { n: 2, under: false };
  const z295 = zoomable('w295', 'c295', (f) => fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.3, y1: 0.3 }, 0.04), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    if (st295.under) { c.strokeStyle = '#b9b7ae'; c.lineWidth = 1 / v.s; c.lineJoin = 'round'; const u = p295Curve(Math.min(4, st295.n + 1)); c.stroke(polyPath(u, false)); }
    const segs = p295Segs(st295.n), m = segs.length / 4, len = Math.pow(1 / 16, st295.n);
    const lw = Math.max(1.2 / v.s, len * 0.45);
    c.strokeStyle = PRINT.ink; c.lineCap = 'round'; c.lineWidth = lw;
    const paths = chunked(m, (p, i) => { p.moveTo(segs[4 * i], segs[4 * i + 1]); p.lineTo(segs[4 * i + 2], segs[4 * i + 3]); }, 2048);
    for (const p of paths) c.stroke(p);
    toScreen(f);
    dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  const mark295 = stepButtons($('s295'), [1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => set295(n));
  function set295(n) {
    st295.n = n; mark295(n);
    $('s295v').textContent = `stage ${n}`; $('c295s').textContent = n;
    const m = Math.pow(16, n);
    $('c295n').textContent = `${fmt(m)} pieces`; $('r295a').textContent = fmt(m);
    z295.schedule();
  }
  $('under295').addEventListener('change', (e) => { st295.under = e.target.checked; z295.schedule(); });
  $('plate295').addEventListener('click', () => { st295.under = false; $('under295').checked = false; set295(2); z295.refit(); });
  // the generator mini: eight legs lightly, the sixteen kept pieces in ink
  (() => {
    let s = '';
    for (let k = 0; k < 8; k++) {
      const [ax, ay] = P295_GEN[k], [bx, by] = P295_GEN[k + 1];
      s += `<line x1="${ax}" y1="${-ay}" x2="${bx}" y2="${-by}" stroke="#b9b7ae" stroke-width="0.012" stroke-dasharray="0.02 0.016"/>`;
      const ex = (bx - ax) / 4, ey = (by - ay) / 4;
      s += `<line x1="${ax}" y1="${-ay}" x2="${ax + ex}" y2="${-(ay + ey)}" stroke="currentColor" stroke-width="0.035" stroke-linecap="round"/>`;
      s += `<line x1="${bx - ex}" y1="${-(by - ey)}" x2="${bx}" y2="${-by}" stroke="currentColor" stroke-width="0.035" stroke-linecap="round"/>`;
    }
    $('mini295').innerHTML = s;
  })();
  // the caption's gap law Nr(G ≥ u) ∝ u^(−1): fit the exponent on the stage-4 gaps
  (() => {
    const gaps = p295Gaps(4);
    let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
    for (let i = 4; i < gaps.length; i = Math.ceil(i * 1.5)) { const X = Math.log(gaps[i]), Y = Math.log(i + 1); sx += X; sy += Y; sxx += X * X; sxy += X * Y; m++; }
    const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx);
    $('r295b').textContent = `Nr ∝ u^${slope.toFixed(2)}`;
  })();

  // ====================== Plates 296–297: the Lévy flight ======================
  const stFl = { D: 1.26, n: 10000, seed: 21, mode: 'printed', proj: 'xy' };
  let flightCache = { key: '' };
  function flData() {
    const key = `${stFl.D}|${stFl.n}|${stFl.seed}`;
    if (flightCache.key === key) return flightCache;
    const fl = levyFlight(stFl.n, stFl.D, 3, stFl.seed);
    const [rLo, rHi] = radiusQ(fl.pts, 3, stFl.n, 0.1, 0.7);
    const measured = massDimension(fl.pts, 3, rLo, rHi);
    let longest = 0;
    for (const [a, b] of [[0, fl.half], [fl.half, stFl.n]]) for (let i = a + 1; i < b; i++) longest = Math.max(longest, Math.hypot(fl.pts[3 * i] - fl.pts[3 * i - 3], fl.pts[3 * i + 1] - fl.pts[3 * i - 2], fl.pts[3 * i + 2] - fl.pts[3 * i - 1]));
    return (flightCache = { key, fl, measured, longest, proj: {} });
  }
  function flProj() {
    const D = flData();
    if (D.proj[stFl.proj]) return D.proj[stFl.proj];
    const k = stFl.proj === 'xy' ? 1 : 2, pts = new Float32Array(2 * stFl.n);
    for (let i = 0; i < stFl.n; i++) { pts[2 * i] = D.fl.pts[3 * i]; pts[2 * i + 1] = D.fl.pts[3 * i + k]; }
    return (D.proj[stFl.proj] = { pts, bb: ptsBox(pts, stFl.n) });
  }
  const FL_GAP = 8;
  function flFit(f) {
    const { bb } = flProj(), ph = stFl.mode === 'printed' ? (f.h - FL_GAP) / 2 : f.h;
    return fitBox({ w: f.w, h: ph }, bb, 0.06);
  }
  function flTrail(f, v, dy, y0, y1) {
    const c = f.ctx, { pts } = flProj(), half = flData().fl.half;
    c.save(); toScreen(f); c.beginPath(); c.rect(0, y0, f.w, y1 - y0); c.clip();
    c.setTransform(f.dpr * v.s, 0, 0, -f.dpr * v.s, f.dpr * v.ox, f.dpr * (v.oy + dy));
    c.strokeStyle = PRINT.ink; c.lineWidth = 0.9 / v.s; c.lineJoin = 'round';
    for (const [a, b] of [[0, half], [half, stFl.n]]) {
      const paths = chunked(b - a - 1, (p, i) => { const j = a + i; p.moveTo(pts[2 * j], pts[2 * j + 1]); p.lineTo(pts[2 * j + 2], pts[2 * j + 3]); }, 4096);
      for (const p of paths) c.stroke(p);
    }
    c.restore(); toScreen(f);
  }
  const zFl = zoomable('wFl', 'cFl', flFit, (f, v) => {
    const c = f.ctx, { pts } = flProj();
    paper(f, PRINT.paper);
    if (stFl.mode === 'printed') {
      const ph = (f.h - FL_GAP) / 2;
      dotPlot(f, v, pts, stFl.n, { bg: PRINT.ink, ink: PRINT.paper, cell: 1.6, y0: ph + FL_GAP, y1: f.h, dy: ph + FL_GAP });
      c.fillStyle = PRINT.paper; c.fillRect(0, 0, f.canvas.width, Math.round((ph + FL_GAP / 2) * f.dpr));
      flTrail(f, v, 0, 0, ph);
      c.strokeStyle = PRINT.rule; c.lineWidth = 1;
      c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0); c.strokeRect(0.5, 0.5, f.w - 1, ph - 1); c.strokeRect(0.5, ph + FL_GAP + 0.5, f.w - 1, ph - 1.5);
    } else if (stFl.mode === 'trail') {
      flTrail(f, v, 0, 0, f.h);
    } else {
      dotPlot(f, v, pts, stFl.n, { bg: PRINT.ink, ink: PRINT.paper, cell: 1.6 });
    }
    toScreen(f);
    const D = flData();
    $('flRa').textContent = isNaN(D.measured) ? '—' : `≈ ${D.measured.toFixed(2)} (law D = ${stFl.D.toFixed(2)})`;
    $('flRb').textContent = `${(D.longest / Math.max(1e-9, Math.max(flProj().bb.x1 - flProj().bb.x0, flProj().bb.y1 - flProj().bb.y0)) * 100).toFixed(0)}% of the view`;
    $('flInfo').innerHTML = `seed <b>${stFl.seed}</b> · two flights of ${fmt(Math.ceil(stFl.n / 2))} stopovers from the origin · projection on the ${stFl.proj === 'xy' ? 'x–y' : 'x–z'} plane`;
    $('cFlN').textContent = `${fmt(stFl.n)} stopovers`;
    $('cFlT').textContent = stFl.mode === 'printed' ? 'Trail, and stopovers in negative' : stFl.mode === 'trail' ? 'Trail with its contrails' : 'Stopovers in negative';
  });
  const MODES = [['printed', 'Both, as printed'], ['trail', 'Trail'], ['dots', 'Stopovers']];
  const markFlM = stepButtons($('flMode'), MODES.map((m) => m[0]), (m) => MODES.find((e) => e[0] === m)[1], (m) => `Show ${m}`, (m) => { stFl.mode = m; setFl(true); });
  const markFlP = stepButtons($('flProj'), ['xy', 'xz'], (p) => (p === 'xy' ? 'x–y (Plate 296)' : 'x–z (Plate 297)'), (p) => `Projection ${p}`, (p) => { stFl.proj = p; setFl(true); });
  const markFlN = stepButtons($('flN'), [1000, 10000, 100000], (n) => fmt(n), (n) => `${n} stopovers`, (n) => { stFl.n = n; setFl(true); });
  $('flD').addEventListener('input', (e) => { stFl.D = +e.target.value / 100; setFl(false); });
  $('flSeed').addEventListener('click', () => { stFl.seed = 1 + Math.floor(Math.random() * 9999); setFl(true); });
  $('plate296').addEventListener('click', () => { Object.assign(stFl, { D: 1.26, n: 10000, seed: 21, mode: 'printed', proj: 'xy' }); setFl(true); });
  $('plate297').addEventListener('click', () => { Object.assign(stFl, { D: 1.26, n: 10000, seed: 21, mode: 'printed', proj: 'xz' }); setFl(true); });
  function setFl(refit) {
    markFlM(stFl.mode); markFlP(stFl.proj); markFlN(stFl.n);
    $('flD').value = Math.round(stFl.D * 100); $('flDv').textContent = `D = ${stFl.D.toFixed(2)}`;
    if (refit) zFl.refit(); else zFl.schedule();
  }

  // ====================== Plate 298: decrease of D by subordination ======================
  const ALPHA = Math.pow(2, -1 / 6), CAS_M = 1 << 20;
  const stCas = { k: 1, seed: 7, stair: true };
  let casCache = { seed: -1 };
  function casData() {
    if (casCache.seed !== stCas.seed) casCache = { seed: stCas.seed, cas: subordinationCascade(CAS_M, ALPHA, 7, stCas.seed), pts: {}, meas: {} };
    return casCache;
  }
  function casPts(k) {
    const Dc = casData();
    if (Dc.pts[k]) return Dc.pts[k];
    const idx = Dc.cas.idx[k], m = idx.length, pts = new Float32Array(2 * m);
    for (let i = 0; i < m; i++) { pts[2 * i] = Dc.cas.walk[2 * idx[i]]; pts[2 * i + 1] = Dc.cas.walk[2 * idx[i] + 1]; }
    const bb = ptsBox(pts, m);
    const [rLo, rHi] = radiusQ(pts, 2, m, 0.1, 0.7);
    Dc.meas[k] = massDimension(pts, 2, rLo, rHi);
    return (Dc.pts[k] = { pts, m, bb });
  }
  const zCas = zoomable('wCas', 'cCas', (f) => fitBox(f, casPts(stCas.k).bb, 0.07), (f, v) => {
    const { pts, m } = casPts(stCas.k), c = f.ctx;
    const seen = dotPlot(f, v, pts, m, { bg: PRINT.paper, ink: PRINT.ink, cell: 1.8 });
    if (stCas.stair) {
      // the Lévy staircase that decimated the previous dust into this one, filled, bottom right
      const S = casData().cas.stairs[stCas.k], N = S.length, prevN = stCas.k === 1 ? CAS_M : casData().cas.idx[stCas.k - 1].length;
      const X0 = f.w * 0.52, X1 = f.w * 0.99, Y0 = f.h * 0.99, Y1 = f.h * 0.64, step = Math.max(1, Math.floor(N / 1200));
      c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      c.beginPath(); c.moveTo(X0, Y0);
      for (let i = 0; i < N; i += step) { const x = X0 + ((X1 - X0) * i) / N, y = Y0 + ((Y1 - Y0) * S[i]) / prevN; c.lineTo(x, y); }
      c.lineTo(X1, Y1); c.lineTo(X1, Y0); c.closePath();
      c.fillStyle = PRINT.ink; c.fill();
    }
    toScreen(f);
    const Dval = 2 * Math.pow(ALPHA, stCas.k);
    $('casRa').textContent = `${fmt(m)} of ${fmt(CAS_M)}`;
    $('casRb').textContent = isNaN(casData().meas[stCas.k]) ? '—' : `≈ ${casData().meas[stCas.k].toFixed(2)} (theory ${Dval.toFixed(2)})`;
    $('casInfo').innerHTML = `seed <b>${stCas.seed}</b> · ${stCas.k} subordination${stCas.k > 1 ? 's' : ''} of a ${fmt(CAS_M)}-step Brown trail · ${seen === m ? 'all points in view' : fmt(seen) + ' points in view'}`;
    $('cCasN').textContent = `D = ${Dval.toFixed(2)}`;
  });
  const CAS_KS = [1, 2, 3, 4, 5, 6, 7];
  const markCas = stepButtons($('casS'), CAS_KS, (k) => (2 * Math.pow(ALPHA, k)).toFixed(2), (k) => `Dimension ${(2 * Math.pow(ALPHA, k)).toFixed(2)}`, (k) => setCas(k));
  function setCas(k) { stCas.k = k; markCas(k); $('casV').textContent = `D = ${(2 * Math.pow(ALPHA, k)).toFixed(2)}`; zCas.refit(); }
  $('casStair').addEventListener('change', (e) => { stCas.stair = e.target.checked; zCas.schedule(); });
  $('casSeed').addEventListener('click', () => { stCas.seed = 1 + Math.floor(Math.random() * 9999); casCache.seed = -1; setCas(stCas.k); });
  $('plate298').addEventListener('click', () => { stCas.seed = 7; stCas.stair = true; $('casStair').checked = true; casCache.seed = -1; setCas(1); });

  // ====================== Plate 299: zooming toward a Lévy dust ======================
  const stZm = { n: 2000000, seed: 12, view: 1 };
  let zmCache = { key: '' };
  function zmData() {
    const key = `${stZm.n}|${stZm.seed}`;
    if (zmCache.key === key) return zmCache;
    const fl = levyFlight(stZm.n, 1.26, 2, stZm.seed);
    const bb = ptsBox(fl.pts, stZm.n);
    const L1 = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 1.04;
    return (zmCache = { key, pts: fl.pts, L1 });
  }
  const zZm = zoomable('wZm', 'cZm', (f) => {
    const { L1 } = zmData(), L = L1 / Math.pow(3, stZm.view - 1), s = Math.min(f.w, f.h) / L;
    return { s, ox: f.w / 2, oy: f.h / 2 };
  }, (f, v) => {
    const { pts, L1 } = zmData(), c = f.ctx;
    const seen = dotPlot(f, v, pts, stZm.n, { bg: PRINT.paper, ink: PRINT.ink, cell: 1.8 });
    // the next window, divided by b = 3, centred like this one on the flight's origin
    const L = Math.min(f.w, f.h) / v.s / 3;
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    c.strokeStyle = PRINT.muted; c.lineWidth = 1.2;
    c.strokeRect(v.ox - (L / 2) * v.s, v.oy - (L / 2) * v.s, L * v.s, L * v.s);
    toScreen(f);
    const side = Math.min(f.w, f.h) / v.s;
    $('zmRa').textContent = fmt(seen);
    $('zmRb').textContent = `${(side / L1).toPrecision(2)} of the cluster`;
    $('zmInfo').innerHTML = `seed <b>${stZm.seed}</b> · ${fmt(stZm.n)} positions, D = 1.26 · the square is the next window`;
  });
  const markZm = stepButtons($('zmS'), [1, 2, 3, 4, 5, 6], String, (k) => `View ${k}`, (k) => setZm(k));
  const markZmN = stepButtons($('zmN'), [200000, 2000000, 8000000], (n) => fmt(n), (n) => `${n} positions`, (n) => { stZm.n = n; setZm(stZm.view); });
  function setZm(k) {
    stZm.view = k; markZm(k); markZmN(stZm.n);
    $('zmV').textContent = k === 1 ? 'view 1 · whole cluster' : `view ${k} · side ÷ ${Math.pow(3, k - 1)}`;
    $('cZmN').textContent = `view ${k} of 6`;
    zZm.refit();
  }
  $('zmSeed').addEventListener('click', () => { stZm.seed = 1 + Math.floor(Math.random() * 9999); setZm(stZm.view); });
  $('plate299').addEventListener('click', () => { stZm.seed = 12; stZm.n = 2000000; setZm(1); });

  // ====================== Plate 300: circumnavigation ======================
  const stNav = { seed: 5, az: 0 };
  let navCache = { seed: -1 };
  const NAV_N = 20000;
  function navData() {
    if (navCache.seed !== stNav.seed) {
      const fl = levyFlight(NAV_N, 1.3, 3, stNav.seed);
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < NAV_N; i++) { cx += fl.pts[3 * i]; cy += fl.pts[3 * i + 1]; cz += fl.pts[3 * i + 2]; }
      cx /= NAV_N; cy /= NAV_N; cz /= NAV_N;
      const [rLo, rHi] = radiusQ(fl.pts, 3, NAV_N, 0.1, 0.7);
      navCache = { seed: stNav.seed, fl, c: [cx, cy, cz], meas: massDimension(fl.pts, 3, rLo, rHi), proj: {} };
    }
    return navCache;
  }
  function navProj() {
    const D = navData(), key = Math.round(stNav.az * 10);
    if (D.proj[key]) return D.proj[key];
    const a = (stNav.az * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), [cx, cy, cz] = D.c;
    const pts = new Float32Array(2 * NAV_N);
    for (let i = 0; i < NAV_N; i++) { pts[2 * i] = (D.fl.pts[3 * i] - cx) * ca + (D.fl.pts[3 * i + 1] - cy) * sa; pts[2 * i + 1] = D.fl.pts[3 * i + 2] - cz; }
    D.proj = { [key]: { pts, bb: ptsBox(pts, NAV_N) } };                 // keep only the current angle
    return D.proj[key];
  }
  const zNav = zoomable('wNav', 'cNav', (f) => {
    // a fixed, angle-independent frame: the cluster turns inside it instead of refitting each frame
    const D = navData(), { pts } = navProj();
    let r = 0;
    for (let i = 0; i < NAV_N; i += 7) r = Math.max(r, Math.abs(pts[2 * i]), Math.abs(pts[2 * i + 1]));
    return fitBox(f, { x0: -r, x1: r, y0: -r, y1: r }, 0.04);
  }, (f, v) => {
    const { pts } = navProj();
    dotPlot(f, v, pts, NAV_N, { bg: PRINT.paper, ink: PRINT.ink, cell: 1.8 });
    toScreen(f);
    $('navRa').textContent = fmt(NAV_N);
    $('navRb').textContent = isNaN(navData().meas) ? '—' : `≈ ${navData().meas.toFixed(2)} (law D = 1.30)`;
    $('navInfo').innerHTML = `seed <b>${stNav.seed}</b> · azimuth ${Math.round(stNav.az)}° about the cluster's centre`;
  });
  const markNav = stepButtons($('navS'), [1, 2, 3, 4, 5, 6, 7], String, (k) => `View ${k} of the strip`, (k) => { stNav.az = ((k - 1) * 360) / 7; setNav(); markNav(k); $('cNavN').textContent = `view ${k} of 7`; });
  $('navA').addEventListener('input', (e) => { stNav.az = +e.target.value; markNav(null); $('cNavN').textContent = 'free view'; setNav(); });
  $('navSeed').addEventListener('click', () => { stNav.seed = 1 + Math.floor(Math.random() * 9999); setNav(); });
  $('plate300').addEventListener('click', () => { stNav.seed = 5; stNav.az = 0; markNav(1); $('cNavN').textContent = 'view 1 of 7'; setNav(); zNav.refit(); });
  function setNav() { $('navA').value = Math.round(stNav.az); $('navAv').textContent = `${Math.round(stNav.az)}°`; zNav.schedule(); }

  // initial state
  setBug(); set295(2); setFl(false); setCas(1); setZm(1); markNav(1);
})();
