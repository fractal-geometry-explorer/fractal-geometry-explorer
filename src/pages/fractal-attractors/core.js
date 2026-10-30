// Chapter 20 core: attraction to fractals.
// Three engines: the bifurcation tree of x -> lam x (1-x), whose attractor at the Feigenbaum
// point is a dust (pages 194-195); inverse iteration onto the San Marco dragon (Plate 198);
// and the Pharaoh's Breastplate as the limit set of four inversions (Plate 199). The book
// states no construction for the breastplate, so its four inversions are a reconstruction
// fitted to the scan -- the derivation and the fit numbers are in DECISIONS.md.

const seeded = (s) => () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Feigenbaum constants and the accumulation point of x -> lam x (1-x)
const LAM_INF = 3.569945672;
const F_DELTA = 4.669201609;  // parameter-direction ratio
const F_ALPHA = 2.502907875;  // state-direction ratio; 1/alpha ~ 0.3995 is the caption's ratio

// ---------- the bifurcation tree ----------
// World coordinates are the unit square; win maps it to a (lam, x) window. Each column iterates
// its lam past a transient, then deposits the orbit; dense bands print darker, like plotted ink.
function rasterBif(img, v, win, flip) {
  const W = img.width, H = img.height, d = img.data;
  const lw = win.l1 - win.l0;
  const warm = 1500 + Math.min(20000, Math.round(400 / Math.max(1e-9, lw)));
  const N = Math.min(12000, 3000 + 10 * H);
  const counts = new Float32Array(H);
  const PAPER = [236, 235, 230], INK = [21, 21, 21];
  for (let i = 0; i < W; i++) {
    const wx = ((i + 0.5) - v.ox) / v.s;
    const lam = win.l0 + lw * wx;
    counts.fill(0);
    let any = false;
    if (lam > 0 && lam <= 4 && wx > -0.02 && wx < 1.02) {
      let x = 0.5;
      for (let k = 0; k < warm; k++) x = lam * x * (1 - x);
      for (let k = 0; k < N; k++) {
        x = lam * x * (1 - x);
        const xx = flip ? 1 - x : x;
        const wy = (xx - win.x0) / (win.x1 - win.x0);
        const j = Math.floor(v.oy - wy * v.s);
        if (j >= 0 && j < H) { counts[j]++; any = true; }
      }
    }
    const gain = 220 / N; // a tight cycle saturates, a chaotic band prints mid-gray
    for (let j = 0; j < H; j++) {
      const t = any && counts[j] ? Math.min(1, 0.25 + counts[j] * gain) : 0;
      const o = (j * W + i) * 4;
      d[o] = PAPER[0] + (INK[0] - PAPER[0]) * t;
      d[o + 1] = PAPER[1] + (INK[1] - PAPER[1]) * t;
      d[o + 2] = PAPER[2] + (INK[2] - PAPER[2]) * t;
      d[o + 3] = 255;
    }
  }
}

// What the orbit of 1/2 settles to at this lam: a period, or a positive Lyapunov exponent
function orbitInfo(lam) {
  let x = 0.5;
  for (let i = 0; i < 6000; i++) { x = lam * x * (1 - x); if (!isFinite(x) || x < -1) return { esc: true }; }
  if (x < 0 || x > 1) return { esc: true };
  const M = 1024, buf = new Float64Array(M);
  let ly = 0;
  for (let i = 0; i < M; i++) {
    x = lam * x * (1 - x);
    buf[i] = x;
    ly += Math.log(Math.max(1e-300, Math.abs(lam * (1 - 2 * x))));
  }
  for (let p = 1; p <= 64; p++) {
    let ok = true;
    for (let n = M - 192; n < M - p; n++) if (Math.abs(buf[n + p] - buf[n]) > 3e-6) { ok = false; break; }
    if (ok) return { p, lyap: ly / M };
  }
  return { p: 0, lyap: ly / M };
}

// ---------- Plate 198: the San Marco dragon by inverse iteration ----------
// x -> 3x(1-x) has two inverses, z = 1/2 +- sqrt(1/4 - z/3); a pseudo-random determining index
// picks one at each step, and the orbit is attracted onto the dragon (the book's own algorithm).
function marcoPoints(n, seed) {
  const rng = seeded(seed);
  const P = new Float64Array(2 * n);
  let zr = 0.3, zi = 0.2;
  for (let i = -20; i < n; i++) {
    const wr = 0.25 - zr / 3, wi = -zi / 3;          // 1/4 - z/3
    const m = Math.hypot(wr, wi);
    let sr = Math.sqrt(Math.max(0, (m + wr) / 2));   // principal sqrt
    let si = Math.sqrt(Math.max(0, (m - wr) / 2));
    if (wi < 0) si = -si;
    const sgn = rng() < 0.5 ? 1 : -1;
    zr = 0.5 + sgn * sr; zi = sgn * si;
    if (i >= 0) { P[2 * i] = zr; P[2 * i + 1] = zi; }
  }
  return P;
}

// Light backdrop: the filled self-squared set of lam = 3, the shape the dots are the skin of
function rasterMarcoSet(img, v, shade = 0.14) {
  const W = img.width, H = img.height, d = img.data;
  const PAPER = [236, 235, 230], INK = [21, 21, 21];
  for (let j = 0; j < H; j++) {
    const wy = (v.oy - (j + 0.5)) / v.s;
    for (let i = 0; i < W; i++) {
      const wx = ((i + 0.5) - v.ox) / v.s;
      let zr = wx, zi = wy, inside = true;
      for (let k = 0; k < 360; k++) {
        const ar = 1 - zr, ai = -zi;
        const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;
        zr = 3 * mr; zi = 3 * mi;
        if (zr * zr + zi * zi > 100) { inside = false; break; }
      }
      const t = inside ? shade : 0;
      const o = (j * W + i) * 4;
      d[o] = PAPER[0] + (INK[0] - PAPER[0]) * t;
      d[o + 1] = PAPER[1] + (INK[1] - PAPER[1]) * t;
      d[o + 2] = PAPER[2] + (INK[2] - PAPER[2]) * t;
      d[o + 3] = 255;
    }
  }
}

// Stamp orbit points into an ImageData as the plates' printed dots: a full-strength pixel
// with soft shoulders, near the heft of the book's plotter dots
function stampDots(img, v, P, count, strength = 0.85) {
  const W = img.width, H = img.height, d = img.data;
  const ink = (o, s) => {
    d[o] += (21 - d[o]) * s;
    d[o + 1] += (21 - d[o + 1]) * s;
    d[o + 2] += (21 - d[o + 2]) * s;
  };
  for (let i = 0; i < count; i++) {
    const px = v.ox + P[2 * i] * v.s, py = v.oy - P[2 * i + 1] * v.s;
    if (px < 1 || py < 1) continue;
    const xi = px | 0, yi = py | 0;
    if (xi >= W - 1 || yi >= H - 1) continue;
    const o = (yi * W + xi) * 4;
    ink(o, strength);
    ink(o + 4, strength * 0.35); ink(o - 4, strength * 0.35);
    ink(o + 4 * W, strength * 0.35); ink(o - 4 * W, strength * 0.35);
  }
}

// ---------- Plate 199: the Pharaoh's Breastplate ----------
// The limit set lives in the crescent between two tangent circles: the outer circle (center 0,
// radius 1, tangency point T at (0,1)) and the inner circle of radius q. Sending T to infinity
// turns the crescent into a strip, where the four inversions have exact coordinates: circles of
// radius 1/sqrt(2) centered at (0,0) and (0,1) on the strip's edges, and mirror lines at u = 0
// and u = 1/(2 sqrt 2). Mapped back to the plane they are the four inversions below. Every
// tangency in the figure forces the strip numbers; only q is free, and it is fitted to the scan.
function breastFrame(q) {
  const b = q / (1 - q), al = 2 * b, R = Math.SQRT1_2;
  // image of the strip circle |w - (cr + i ci)| = r under w -> i + al/(w + i b)
  const mapC = (cr, ci, r) => {
    const ar = cr, ai = ci + b, s = ar * ar + ai * ai - r * r;
    return { x: al * ar / s, y: 1 - al * ai / s, r: Math.abs(al * r / s) };
  };
  const p2 = 1 / (2 * Math.SQRT2); // the mirrors sit at u = +-p2, half a period either side of 0
  return {
    q,
    outer: { x: 0, y: 0, r: 1 },
    inner: { x: 0, y: 1 - q, r: q },
    KA: mapC(0, 0, R),              // orthogonal to the outer circle
    KB: mapC(0, 1, R),              // orthogonal to the inner circle
    // the mirrors u = -p2 and u = +p2 map to this pair of circles through T; this symmetric
    // generating set mixes into the horns far better than a mirror at u = 0 does (same group
    // up to the limit set: checked to sub-pixel agreement, see DECISIONS.md)
    KC: { x: -al / (2 * p2), y: 1, r: al / (2 * p2) },
    KD: { x: al / (2 * p2), y: 1, r: al / (2 * p2) },
  };
}

const invertPt = (p, C) => {
  const dx = p[0] - C.x, dy = p[1] - C.y, k = C.r * C.r / (dx * dx + dy * dy);
  p[0] = C.x + k * dx; p[1] = C.y + k * dy;
};

// the book's algorithm: a pseudo-random determining index chosen among the 4 inversions
function breastPoints(n, seed, q) {
  const F = breastFrame(q), rng = seeded(seed);
  const P = new Float64Array(2 * n), p = [0.2, -0.4];
  for (let i = -20; i < n; i++) {
    const k = (rng() * 4) | 0;
    if (k === 0) invertPt(p, F.KA);
    else if (k === 1) invertPt(p, F.KB);
    else if (k === 2) invertPt(p, F.KC);
    else invertPt(p, F.KD);
    if (i >= 0) { P[2 * i] = p[0]; P[2 * i + 1] = p[1]; }
  }
  return P;
}

// image of the circle (c, r) under inversion in (C, R): the limit set drawn as actual circles
function invertCircle(c, C) {
  const dx = c.x - C.x, dy = c.y - C.y;
  const d2 = dx * dx + dy * dy - c.r * c.r;
  const s = C.r * C.r / d2;
  return { x: C.x + s * dx, y: C.y + s * dy, r: Math.abs(s) * c.r };
}

// breadth-first orbit of the two boundary circles under the four inversions, down to minR
function breastCircles(q, minR, cap = 30000) {
  const F = breastFrame(q);
  const out = [], seen = new Set();
  const key = (c) => `${Math.round(c.x * 2e5)},${Math.round(c.y * 2e5)},${Math.round(c.r * 2e5)}`;
  const push = (c) => {
    if (c.r < minR || !isFinite(c.r)) return;
    const k = key(c);
    if (seen.has(k)) return;
    seen.add(k); out.push(c);
  };
  push(F.outer); push(F.inner);
  for (let head = 0; head < out.length && out.length < cap; head++) {
    const c = out[head];
    push(invertCircle(c, F.KA));
    push(invertCircle(c, F.KB));
    push({ x: -c.x, y: c.y, r: c.r });
    push(invertCircle(c, F.KD));
  }
  return out;
}

// exponent e in N(radius > rho) ~ rho^-e, fitted over the middle decades of the enumeration
function packingExponent(circles) {
  const rs = circles.map((c) => c.r).sort((a, b) => b - a);
  if (rs.length < 200) return NaN;
  const rMax = rs[2] * 0.5, rMin = Math.max(rs[rs.length - 1] * 2, rMax / 300);
  const xs = [], ys = [];
  for (let k = 0; k < 12; k++) {
    const rho = rMax * Math.pow(rMin / rMax, k / 11);
    let n = 0;
    while (n < rs.length && rs[n] > rho) n++;
    xs.push(Math.log(rho)); ys.push(Math.log(n));
  }
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return -num / den;
}
