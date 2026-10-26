// Chapter 33 geometry: random disc tremas. The caption's rule for Plates 306-309: trema
// centers are thrown uniformly at random on the plane, and the trema of rank p (the p-th
// largest) is a disc of area K(2-D)/p. Writing C = 2 - D and tying K to the sampled area A
// by K = C·A/2, this is exactly the text's Poisson model, Nr(area > a) = (C/2a) per unit
// area: in a region of area A the expected number of tremas larger than a is C·A/(2a), so
// the rank-p area is C·A/(2p). What the tremas fail to cover is a fractal of dimension
// D = 2 - C, of zero area, empty once C reaches 2.
const TAU = 2 * Math.PI, EULER = 0.5772156649015329;
const PLATE_W = 7 / 6;      // the printed plates' width/height ratio, measured from the scan

// one uniform [0,1) per (stream, rank): a splitmix-style integer hash, so disc p's center
// never depends on C or on the cutoff - "keep the seed invariant and vary C" (p. 303)
function hash01(stream, p) {
  let h = (stream ^ Math.imul(p, 0x9e3779b9)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x21f0aaad);
  h ^= h >>> 15; h = Math.imul(h, 0x735a2d97);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// centers are sampled in the window [0, PLATE_W] x [0, 1] grown by a margin m on every side,
// so tremas centered off the page still bite into it (the book's own figures are windows cut
// from a larger simulation - their biggest discs run off the edges). The margin should be the
// largest trema's radius r_1 = sqrt(C·A/2π), but A grows with m, so iterate; the fixed point
// is capped at 1, which only ever trims discs that would cover the whole window anyway.
function tremaLayout(C) {
  let m = 0.1;
  for (let i = 0; i < 40; i++) {
    const A = (PLATE_W + 2 * m) * (1 + 2 * m);
    m = Math.min(1, Math.sqrt((C * A) / TAU));
  }
  const A = (PLATE_W + 2 * m) * (1 + 2 * m);
  return { m, A, k: (C * A) / TAU };          // rank-p radius: r_p = sqrt(k / p)
}

// how many tremas exist down to radius rmin, and the share of the window they are expected
// to leave uncovered: each trema independently misses a given point with probability
// 1 - a_p/A, so the survival is ~ exp(-Σ a_p/A) = exp(-(C/2)·H_P), H_P the harmonic sum
const tremaCount = (k, rmin) => Math.max(1, Math.floor(k / (rmin * rmin)));
const uncovered = (C, P) => Math.exp((-C / 2) * (Math.log(P) + EULER));

// draw the window: the field in one ink, every trema that meets the view in the other.
// Discs below the cutoff (half a screen pixel; coarser while a control is moving) are left
// out - the model has infinitely many - and a cap on the ranks walked keeps deep zooms sane.
// With mark on, a per-pixel mask records which pixel centers fall inside some drawn trema,
// and the pixels missed by every trema are painted red: the surviving set, which blends
// away invisibly once it is thinner than the antialiasing.
function renderTremas(f, v, st, field, disc, coarse, mark) {
  const C = 2 - st.D, L = tremaLayout(C), c = f.ctx;
  const rmin = (coarse ? 1.7 : 0.55) / v.s;
  const P = Math.min(coarse ? 7e5 : 7e6, tremaCount(L.k, rmin));
  const x0 = Math.max(0, -v.ox / v.s), x1 = Math.min(PLATE_W, (f.w - v.ox) / v.s);
  const y1 = Math.min(1, v.oy / v.s), y0 = Math.max(0, (v.oy - f.h) / v.s);
  paper(f, PRINT.paper);
  toWorld(f, v);
  c.save();
  c.beginPath(); c.rect(0, 0, PLATE_W, 1); c.clip();
  c.fillStyle = field; c.fillRect(0, 0, PLATE_W, 1);
  c.fillStyle = disc;
  const W2 = PLATE_W + 2 * L.m, H2 = 1 + 2 * L.m, sx = 2 * st.seed + 1, sy = 2 * st.seed + 2;
  // the frame in whole screen pixels, for the survivors' mask
  const doMark = mark && !coarse;
  const mx0 = Math.max(0, Math.ceil(v.ox)), mx1 = Math.min(f.w, Math.floor(v.ox + PLATE_W * v.s));
  const my0 = Math.max(0, Math.ceil(v.oy - v.s)), my1 = Math.min(f.h, Math.floor(v.oy));
  const mw = Math.max(0, mx1 - mx0), mh = Math.max(0, my1 - my0);
  const mask = doMark && mw > 0 && mh > 0 ? new Uint8Array(mw * mh) : null;
  let path = new Path2D(), n = 0, drawn = 0;
  for (let p = 1; p <= P; p++) {
    const r = Math.sqrt(L.k / p);
    const x = hash01(sx, p) * W2 - L.m;
    if (x + r < x0 || x - r > x1) continue;
    const y = hash01(sy, p) * H2 - L.m;
    if (y + r < y0 || y - r > y1) continue;
    path.moveTo(x + r, y); path.arc(x, y, r, 0, TAU);
    drawn++;
    if (++n === 2048) { c.fill(path); path = new Path2D(); n = 0; }
    if (mask) {
      // mark every pixel whose center lies inside the disc
      const cx = v.ox + x * v.s - mx0 - 0.5, cy = v.oy - y * v.s - my0 - 0.5, rs = r * v.s;
      const i0 = Math.max(0, Math.ceil(cx - rs)), i1 = Math.min(mw - 1, Math.floor(cx + rs));
      for (let i = i0; i <= i1; i++) {
        const dy = Math.sqrt(Math.max(0, rs * rs - (i - cx) * (i - cx)));
        const j0 = Math.max(0, Math.ceil(cy - dy)), j1 = Math.min(mh - 1, Math.floor(cy + dy));
        for (let j = j0; j <= j1; j++) mask[j * mw + i] = 1;
      }
    }
  }
  if (n) c.fill(path);
  c.restore();
  toScreen(f);
  let missed = 0;
  if (mask) {
    c.fillStyle = PRINT.red;
    for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) if (!mask[j * mw + i]) { missed++; c.fillRect(mx0 + i - 0.25, my0 + j - 0.25, 1.5, 1.5); }
  }
  return { C, P, drawn, r1: Math.sqrt(L.k), missed, pixels: mask ? mw * mh : 0 };
}
