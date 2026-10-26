// Chapter 25 checks: Brown trail hulls (Plates 242-243) and the walk's zeroset (Plate 241).
// Simulates the lattice walks the page will use and verifies the claimed statistics:
// boundary box dimension ~ 4/3, G-length vs G-area slope ~ D/2 = 2/3, zero-gap law Pr(U>u) ~ u^-1/2.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 4-neighbour walk via the book's diagonal coordinates: (X+Y) and (X-Y) each do +-1 per step.
// loop=true conditions each diagonal walk to return (shuffle of equal +1/-1), a uniform closed walk.
function walk(n, rnd, loop) {
  const du = new Int8Array(n), dv = new Int8Array(n);
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

// raster the trail, flood the exterior from the border, classify hull/gaps/boundary
function hull(X, Y) {
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  for (let i = 0; i < X.length; i++) { if (X[i] < x0) x0 = X[i]; if (X[i] > x1) x1 = X[i]; if (Y[i] < y0) y0 = Y[i]; if (Y[i] > y1) y1 = Y[i]; }
  const W = x1 - x0 + 3, H = y1 - y0 + 3;
  const g = new Uint8Array(W * H);                 // 0 empty, 1 trail, 2 exterior
  for (let i = 0; i < X.length; i++) g[(Y[i] - y0 + 1) * W + (X[i] - x0 + 1)] = 1;
  const q = new Int32Array(W * H); let qh = 0, qt = 0;
  const push = (k) => { if (!g[k]) { g[k] = 2; q[qt++] = k; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (qh < qt) {
    const k = q[qh++], x = k % W;
    if (x > 0) push(k - 1); if (x < W - 1) push(k + 1);
    if (k >= W) push(k - W); if (k < W * (H - 1)) push(k + W);
  }
  let trail = 0, gaps = 0, bound = 0;
  const isB = (k) => {
    const x = k % W;
    return (x > 0 && g[k - 1] === 2) || (x < W - 1 && g[k + 1] === 2) || (k >= W && g[k - W] === 2) || (k < W * (H - 1) && g[k + W] === 2);
  };
  const bpts = [];
  for (let k = 0; k < W * H; k++) {
    if (g[k] === 1) { trail++; if (isB(k)) { bound++; bpts.push(k); } }
    else if (g[k] === 0) gaps++;
  }
  return { g, W, H, trail, gaps, bound, bpts };
}

function boxCounts(h) {
  const { g, W, H, bpts } = h;
  const out = [];
  for (const G of [2, 4, 8, 16, 32, 64]) {
    const bw = Math.ceil(W / G), seenB = new Set(), seenH = new Set();
    for (const k of bpts) seenB.add(Math.floor((k % W) / G) + bw * Math.floor(k / W / G));
    for (let k = 0; k < W * H; k++) if (g[k] === 1 || g[k] === 0) seenH.add(Math.floor((k % W) / G) + bw * Math.floor(k / W / G));
    out.push({ G, nb: seenB.size, nh: seenH.size });
  }
  return out;
}

const fit = (xs, ys) => {
  const n = xs.length, sx = xs.reduce((a, b) => a + b, 0) / n, sy = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - sx) * (ys[i] - sy); den += (xs[i] - sx) ** 2; }
  return num / den;
};

const N = 200000;
for (const loop of [false, true]) {
  const rnd = mulberry32(loop ? 7 : 3);
  const { X, Y } = walk(N, rnd, loop);
  if (loop && (X[N] !== 0 || Y[N] !== 0)) throw new Error('bridge not closed');
  const t0 = Date.now();
  const h = hull(X, Y);
  const bc = boxCounts(h);
  const dimB = fit(bc.map((b) => -Math.log(b.G)), bc.map((b) => Math.log(b.nb)));
  const slope = fit(bc.map((b) => Math.log(b.nh)), bc.map((b) => Math.log(b.nb)));
  console.log(loop ? 'loop' : 'open', `raster ${h.W}x${h.H}`, `trail=${h.trail} gaps=${h.gaps} boundary=${h.bound}`,
    `boundary box-dim=${dimB.toFixed(3)} (expect ~1.33)`, `G-length vs G-area slope=${slope.toFixed(3)} (expect ~0.67)`, `${Date.now() - t0}ms`);
}

// zeroset of a 10,000-toss coin walk: count zeros, check gap law across 200 runs
let zeros1 = 0;
const gaps = [];
for (let run = 0; run < 200; run++) {
  const rnd = mulberry32(100 + run);
  let s = 0, last = 0;
  for (let i = 1; i <= 10000; i++) {
    s += rnd() < 0.5 ? 1 : -1;
    if (s === 0) { gaps.push(i - last); last = i; if (run === 0) zeros1++; }
  }
}
gaps.sort((a, b) => a - b);
const us = [4, 8, 16, 32, 64, 128, 256, 512], xs = [], ys = [];
for (const u of us) { const c = gaps.filter((gp) => gp > u).length / gaps.length; xs.push(Math.log(u)); ys.push(Math.log(c)); }
console.log(`zeros in run 0: ${zeros1}; gap-law slope=${fit(xs, ys).toFixed(3)} (expect ~-0.5)`);
