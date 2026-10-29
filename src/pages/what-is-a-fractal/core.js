// Chapter 3 prints no plates, so every figure on this page is the page's own illustration of
// the chapter's text. The models: the chapter's four worked examples of D against D_T (a
// straight segment, the Cantor dust, the Koch curve, the trail of Brownian motion), and the
// ball of thread whose effective dimension crosses over as the resolution refines.

// seeded PRNG (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- the four example sets ----------
const LOG = Math.log;
// triadic Koch generator (chapter 6): four pieces of 1/3, none mirrored or reversed
const KOCH_GEN = genFromCodes([[0, 0], [1 / 3, 0], [1 / 2, Math.sqrt(3) / 6], [2 / 3, 0], [1, 0]], [0, 0, 0, 0]);
const kochCurve = (m) => curveOf(Array.from({ length: m }, () => KOCH_GEN));
// starts of the 2^m intervals of the stage-m triadic Cantor dust, each of length 3^−m
function cantorStarts(m) {
  let starts = new Float64Array(1), len = 1;
  for (let s = 0; s < m; s++) {
    const out = new Float64Array(starts.length * 2);
    for (let i = 0; i < starts.length; i++) { out[2 * i] = starts[i]; out[2 * i + 1] = starts[i] + (2 * len) / 3; }
    starts = out; len /= 3;
  }
  return starts;
}
// a Brownian trail: n Gaussian steps, scaled into a box 1 wide (y range kept in proportion)
function brownTrail(n, seed) {
  const rand = rng(seed), P = new Float64Array(2 * n + 2);
  let x = 0, y = 0;
  for (let i = 1; i <= n; i++) {
    const r = Math.sqrt(-2 * LOG(1 - rand())), a = 2 * Math.PI * rand();
    x += r * Math.cos(a); y += r * Math.sin(a);
    P[2 * i] = x; P[2 * i + 1] = y;
  }
  const bb = bbox(P), s = 1 / Math.max(1e-9, bb.x1 - bb.x0);
  for (let i = 0; i < P.length; i += 2) { P[i] = (P[i] - bb.x0) * s; P[i + 1] = (P[i + 1] - bb.y0) * s; }
  return P;
}

// ---------- effective dimension of the ball of thread ----------
// The chapter's stations, in log10 of the resolution in cm: seen far away the ball is a point
// (dimension 0); at 10 cm resolution a solid (3); at 10 mm a mess of threads (1); at 0.1 mm
// each thread is a column (3); at 0.01 mm columns dissolve into fibers (1); finer still, the
// ball is a finite crowd of atomlike pinpoints (0). The crossover midpoints and widths are this
// page's choice — the chapter insists the transitions are ill defined.
const BALL_ZONES = [
  { d: 0, at: 2.0, label: 'a point' },
  { d: 3, at: 1.0, label: 'a solid ball' },
  { d: 1, at: 0.0, label: 'threads' },
  { d: 3, at: -2.0, label: 'columns' },
  { d: 1, at: -3.0, label: 'fibers' },
  { d: 0, at: -7.0, label: 'pinpoints' },
];
const BALL_CROSS = [
  { at: 1.5, w: 0.12 },   // point -> ball, near the ball's 10 cm diameter
  { at: 0.5, w: 0.12 },   // ball -> threads
  { at: -1.0, w: 0.12 },  // threads -> columns, at the thread's 1 mm diameter
  { at: -2.5, w: 0.12 },  // columns -> fibers, at the fibers' 0.01 mm scale
  { at: -5.5, w: 0.4 },   // fibers -> pinpoints, somewhere past the molecules
];
const logistic = (t) => 1 / (1 + Math.exp(-t));
function effDim(x) {                             // x = log10(resolution in cm)
  let d = BALL_ZONES[0].d;
  for (let i = 0; i < BALL_CROSS.length; i++) d += (BALL_ZONES[i + 1].d - BALL_ZONES[i].d) * logistic((BALL_CROSS[i].at - x) / BALL_CROSS[i].w);
  return d;
}
function ballZone(x) {                           // the zone, or the crossing it sits in
  for (let i = 0; i < BALL_CROSS.length; i++) {
    const c = BALL_CROSS[i];
    if (Math.abs(x - c.at) < 2.2 * c.w) return { crossing: true, from: BALL_ZONES[i], to: BALL_ZONES[i + 1] };
    if (x > c.at) return { crossing: false, zone: BALL_ZONES[i] };
  }
  return { crossing: false, zone: BALL_ZONES[BALL_ZONES.length - 1] };
}
// a fractal coastline for contrast, on its own scale: between its outer and inner cutoffs the
// "transition" never ends — a whole zone with D ≈ 1.25 > D_T = 1
function coastDim(x) {
  return 0 + 1.25 * logistic((1.5 - x) / 0.25) - 0.25 * logistic((-4.5 - x) / 0.25);
}

// ---------- the wound ball ----------
// A ball of 10 cm diameter (R = 5) wound from a 1 mm thread: great-circle wraps on two outer
// layers, the winding axis drifting wrap to wrap, which is how a yarn ball covers its sphere.
// Only the front hemisphere is kept (the ball is opaque); segments are depth-sorted into a few
// z bands per tone, each a Path2D, so one render is a few hundred strokes, not tens of thousands.
const BALL_R = 5, THREAD_W = 0.1, SEG_N = 160, TONE_N = 5, BAND_N = 14;
function windBall(seed) {
  const rand = rng(seed), layers = [{ r: BALL_R - 0.05, n: 150 }, { r: BALL_R - 0.16, n: 110 }];
  const segs = [];                               // [x1, y1, x2, y2, z, tone]
  for (const { r, n } of layers) {
    // axis drifts on the sphere: a slow seeded walk, so neighbouring wraps lie side by side
    let th = rand() * Math.PI, ph = rand() * 2 * Math.PI;
    for (let wgt = 0; wgt < n; wgt++) {
      th += (rand() - 0.5) * 0.5; ph += 0.9 + (rand() - 0.5) * 0.8;
      const ax = Math.sin(th) * Math.cos(ph), ay = Math.sin(th) * Math.sin(ph), az = Math.cos(th);
      // u, v span the wrap's plane
      let ux = -ay, uy = ax;
      const uz = 0, ul = Math.hypot(ux, uy);
      if (ul < 1e-6) { ux = 1; uy = 0; } else { ux /= ul; uy /= ul; }
      const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
      const tone = Math.floor(rand() * TONE_N), a0 = rand() * 2 * Math.PI;
      let px = 0, py = 0, pz = 0;
      for (let j = 0; j <= SEG_N; j++) {
        const a = a0 + (2 * Math.PI * j) / SEG_N, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
        const x = ca * ux + sa * vx, y = ca * uy + sa * vy, z = ca * uz + sa * vz;
        if (j && (z > 0 || pz > 0)) segs.push([px, py, x, y, (z + pz) / 2, tone]);
        px = x; py = y; pz = z;
      }
    }
  }
  segs.sort((a, b) => a[4] - b[4]);
  const top = segs[segs.length - 1];             // the front-most stitch: deep close-ups centre here
  const anchor = [(top[0] + top[2]) / 2, (top[1] + top[3]) / 2];
  // z bands, far to near, one chunked path per (band, tone)
  const bands = [];
  for (let b = 0; b < BAND_N; b++) {
    const lo = Math.floor((segs.length * b) / BAND_N), hi = Math.floor((segs.length * (b + 1)) / BAND_N);
    const paths = Array.from({ length: TONE_N }, () => new Path2D());
    let zSum = 0;
    for (let i = lo; i < hi; i++) { const s = segs[i]; paths[s[5]].moveTo(s[0], s[1]); paths[s[5]].lineTo(s[2], s[3]); zSum += s[4]; }
    bands.push({ paths, z: hi > lo ? zSum / (hi - lo) : 0 });
  }
  return { segs, bands, anchor };
}
