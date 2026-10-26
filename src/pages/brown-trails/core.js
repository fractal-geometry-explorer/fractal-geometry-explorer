// Chapter 25 core: seeded randomness, the coin-toss walk and its zeroset (Plate 241),
// midpoint-displacement curves from the Pólya sweep to the Brown trail (pages 233–234),
// and lattice Brown trails with their hulls, gaps and boundaries (Plates 242–243).
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lsFit = (xs, ys) => {
  const n = xs.length;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i] / n; sy += ys[i] / n; }
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - sx) * (ys[i] - sy); den += (xs[i] - sx) ** 2; }
  return num / den;
};

// ---------- Plate 241: Henry's cumulative winnings over n tosses ----------
function coinWalk(n, seed) {
  const rnd = mulberry32(seed), S = new Int32Array(n + 1);
  for (let i = 1; i <= n; i++) S[i] = S[i - 1] + (rnd() < 0.5 ? 1 : -1);
  const zeros = [];
  for (let i = 2; i <= n; i += 2) if (S[i] === 0) zeros.push(i);
  return { S, zeros };
}
// tail exponent of the gaps between zeros, Pr(U > u), aggregated over many games (expect ~ -1/2)
function zeroGapSlope(runs, n) {
  const gaps = [];
  for (let run = 0; run < runs; run++) {
    const { zeros } = coinWalk(n, 90000 + run);
    let last = 0;
    for (const z of zeros) { gaps.push(z - last); last = z; }
  }
  const xs = [], ys = [];
  for (const u of [4, 8, 16, 32, 64, 128, 256, 512]) {
    let c = 0;
    for (const g of gaps) if (g > u) c++;
    if (c > 0) { xs.push(Math.log(u)); ys.push(Math.log(c / gaps.length)); }
  }
  return lsFit(xs, ys);
}

// ---------- pages 233–234: midpoint displacement, from Pólya to Brown ----------
// Each stage halves the time span Δt of every side and displaces its midpoint so that
// E|ΔM|² = Δt/4, which keeps the (mean) Pythagorean identity |ΔP|² = |Δ₁P|² + |Δ₂P|².
// rule: 'polya' the side set by the parity of i + k (i the side's place along the curve): this
// reproduces the Pólya sweep of Plate 64 exactly (checked against genFromCodes([1,3]) to stage
// 10) · 'flip' random side · 'iso' random direction, fixed length · 'gauss' isotropic Gaussian
// (the Brown trail's rule).
function midpointCurve(stages, rule, seed) {
  const rnd = mulberry32(seed);
  let P = new Float64Array([0, 0, 1, 0]);
  let g1 = null;        // Box–Muller spare
  const gauss = () => {
    if (g1 !== null) { const v = g1; g1 = null; return v; }
    const r = Math.sqrt(-2 * Math.log(1 - rnd())), a = 2 * Math.PI * rnd();
    g1 = r * Math.sin(a);
    return r * Math.cos(a);
  };
  for (let k = 0; k < stages; k++) {
    const m = P.length / 2 - 1, dt = Math.pow(2, -k), h = Math.sqrt(dt) / 2, out = new Float64Array(4 * m + 2);
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3];
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      let dx = 0, dy = 0;
      if (rule === 'polya' || rule === 'flip') {
        const L = Math.hypot(bx - ax, by - ay) || 1, side = rule === 'polya' ? ((i + k) % 2 ? -1 : 1) : (rnd() < 0.5 ? 1 : -1);
        dx = (-(by - ay) / L) * h * side; dy = ((bx - ax) / L) * h * side;
      } else if (rule === 'iso') {
        const a = 2 * Math.PI * rnd();
        dx = h * Math.cos(a); dy = h * Math.sin(a);
      } else {
        const s = Math.sqrt(dt / 8);
        dx = s * gauss(); dy = s * gauss();
      }
      out[4 * i] = ax; out[4 * i + 1] = ay; out[4 * i + 2] = mx + dx; out[4 * i + 3] = my + dy;
    }
    out[4 * m] = P[2 * m]; out[4 * m + 1] = P[2 * m + 1];
    P = out;
  }
  return P;
}
// how close the last split is to the Pythagorean identity, averaged over parents (1 exactly for transversal rules)
function pythagRatio(P) {
  const pairs = (P.length / 2 - 1) / 2;
  let num = 0, den = 0;
  for (let i = 0; i < pairs; i++) {
    const ax = P[4 * i], ay = P[4 * i + 1], mx = P[4 * i + 2], my = P[4 * i + 3], bx = P[4 * i + 4], by = P[4 * i + 5];
    num += (mx - ax) ** 2 + (my - ay) ** 2 + (bx - mx) ** 2 + (by - my) ** 2;
    den += (bx - ax) ** 2 + (by - ay) ** 2;
  }
  return num / den;
}
// how many of the teragon's vertices repeat an earlier one (plane-filling sweeps touch tidily;
// the randomized teragons self-intersect after few steps, and the limit trail does so ceaselessly)
function repeatedVertices(P) {
  const seen = new Set();
  let rep = 0;
  for (let i = 0; i < P.length; i += 2) {
    const k = Math.round(P[i] * 1e9) + ':' + Math.round(P[i + 1] * 1e9);
    if (seen.has(k)) rep++; else seen.add(k);
  }
  return rep;
}

// ---------- Plates 242–243: lattice Brown trails, hulls and gaps ----------
// The book's downsized lattice walk: (X+Y)/√2 and (X−Y)/√2 each move ±1 per step, so P(t)
// steps to a 4-neighbour. loop = true deals each diagonal walk an equal number of +1 and −1
// steps, shuffled — a uniformly random Brown loop, back at its start after n steps.
function latticeWalk(n, seed, loop) {
  const rnd = mulberry32(seed), du = new Int8Array(n), dv = new Int8Array(n);
  if (loop) {
    for (let i = 0; i < n; i++) { du[i] = i < n / 2 ? 1 : -1; dv[i] = i < n / 2 ? 1 : -1; }
    for (const a of [du, dv]) for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
  } else {
    for (let i = 0; i < n; i++) { du[i] = rnd() < 0.5 ? 1 : -1; dv[i] = rnd() < 0.5 ? 1 : -1; }
  }
  const X = new Int32Array(n + 1), Y = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) { X[i + 1] = X[i] + ((du[i] + dv[i]) >> 1); Y[i + 1] = Y[i] + ((du[i] - dv[i]) >> 1); }
  return { X, Y };
}
// raster the trail on its bounding grid, flood the exterior in from the border, and classify
// every cell: 1 trail, 2 exterior, 0 a gap the trail never visits. Boundary cells are trail
// cells with an exterior 4-neighbour — the self-avoiding Brownian motion.
function hullData(X, Y) {
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  for (let i = 0; i < X.length; i++) {
    if (X[i] < x0) x0 = X[i]; else if (X[i] > x1) x1 = X[i];
    if (Y[i] < y0) y0 = Y[i]; else if (Y[i] > y1) y1 = Y[i];
  }
  const W = x1 - x0 + 3, H = y1 - y0 + 3, g = new Uint8Array(W * H);
  for (let i = 0; i < X.length; i++) g[(Y[i] - y0 + 1) * W + (X[i] - x0 + 1)] = 1;
  const q = new Int32Array(W * H);
  let qt = 0;
  const push = (k) => { if (!g[k]) { g[k] = 2; q[qt++] = k; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  for (let qh = 0; qh < qt; qh++) {
    const k = q[qh], x = k % W;
    if (x > 0) push(k - 1);
    if (x < W - 1) push(k + 1);
    if (k >= W) push(k - W);
    if (k < W * (H - 1)) push(k + W);
  }
  let trail = 0, gaps = 0;
  const bnd = new Uint8Array(W * H);
  let bound = 0;
  for (let k = 0; k < W * H; k++) {
    if (g[k] === 1) {
      trail++;
      const x = k % W;
      if ((x > 0 && g[k - 1] === 2) || (x < W - 1 && g[k + 1] === 2) || (k >= W && g[k - W] === 2) || (k < W * (H - 1) && g[k + W] === 2)) { bnd[k] = 1; bound++; }
    } else if (g[k] === 0) gaps++;
  }
  return { g, bnd, W, H, sx: 1 - x0, sy: 1 - y0, trail, gaps, bound };
}
// box counts over the raster: boxes of side G hit by the hull (G-area) and by its boundary
// (G-length). Gives the boundary's box dimension and the book's length–area slope D/2.
function boxStats(h) {
  const { g, bnd, W, H } = h, xs = [], yb = [], yh = [];
  for (const G of [2, 4, 8, 16, 32, 64]) {
    const bw = Math.ceil(W / G), bh = Math.ceil(H / G);
    const hitB = new Uint8Array(bw * bh), hitH = new Uint8Array(bw * bh);
    for (let y = 0; y < H; y++) {
      const row = Math.floor(y / G) * bw;
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (g[k] !== 2) hitH[row + Math.floor(x / G)] = 1;
        if (bnd[k]) hitB[row + Math.floor(x / G)] = 1;
      }
    }
    let nb = 0, nh = 0;
    for (let i = 0; i < bw * bh; i++) { nb += hitB[i]; nh += hitH[i]; }
    xs.push(Math.log(G)); yb.push(Math.log(nb)); yh.push(Math.log(nh));
  }
  return { dimB: -lsFit(xs, yb), slopeLA: lsFit(yh, yb) };
}
// the raster as a canvas, one cell per pixel: 'hull' fills gaps black with the trail,
// 'net' keeps the gaps gray as in Plate 243, 'boundary' draws only the outer boundary
function rasterCanvas(h, mode) {
  const { g, bnd, W, H } = h, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  const ink = [21, 21, 21], gray = [143, 142, 136], paper = [236, 235, 230];
  for (let k = 0; k < W * H; k++) {
    let c = paper;
    if (mode === 'boundary') { if (bnd[k]) c = ink; }
    else if (g[k] === 1) c = ink;
    else if (g[k] === 0) c = mode === 'hull' ? ink : gray;
    d[4 * k] = c[0]; d[4 * k + 1] = c[1]; d[4 * k + 2] = c[2]; d[4 * k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
