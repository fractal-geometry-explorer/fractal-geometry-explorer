// Chapter 18 geometry: circle inversion, Descartes' theorem and Apollonian packing, orthogonal
// circles, clans of an inversion group, Poincaré chain stages, and Mandelbrot's osculating-disc
// construction of the limit set. Circles are {x, y, r}; regions add inside: true (the disc) or
// false (its complement).

// ---------- measured configurations (600 dpi fits, idealized to exact tangency) ----------
// The M = 4 Poincaré chain of page 173 and Plate 177. Fitted from the scan (rms 2.6 px at
// 600 dpi), then adjusted to exact tangency. y points up; the book's figure is y-down.
const CHAIN = [
  { x: -0.60637, y: 0.06853, r: 0.39348 },   // C1, left
  { x: 0.0, y: -0.45406, r: 0.40701 },       // C2, bottom
  { x: 0.60637, y: 0.06853, r: 0.39348 },    // C3, right
  { x: 0.0, y: 0.31700, r: 0.26182 },        // C4, top
];
// The five generating circles of Fricke & Klein's Figure 156 (Plate 179), fitted from the
// engraving reproduced at the top left of the plate (rms 0.6 px), idealized to exact tangency.
// C1 C2 C3 C4 form the Poincaré chain; C5 is tangent to C2 and C3 only.
const FRICKE = [
  { x: -0.82858, y: 0.70454, r: 0.9142 },    // C1, upper left
  { x: 0.61285, y: 0.37372, r: 0.5647 },     // C2, upper right
  { x: 0.0745, y: -0.09939, r: 0.152 },      // C3, small centre
  { x: -0.28587, y: -0.40322, r: 0.31935 },  // C4, lower left
  { x: 0.34431, y: -0.38855, r: 0.24349 },   // C5, lower right
];
// The three given circles of the packing construction on pages 169–170 (outer first).
const GIVEN = [
  { x: 0, y: 0, r: 1 },
  { x: -0.303551, y: -0.062967, r: 0.689987 },
  { x: 0.661882, y: -0.248305, r: 0.293075 },
];

// ---------- inversion ----------
// Inversion of a point in circle K.
function invPoint(K, x, y) {
  const dx = x - K.x, dy = y - K.y, s = (K.r * K.r) / (dx * dx + dy * dy);
  return [K.x + s * dx, K.y + s * dy];
}
// Radial flow carrying a point to its inversion in K as t runs 0 → 1: the point stays on its
// ray from K's centre while the angle a = atan(d/r) runs linearly to its mirror π/2 − a. This
// is a rotation of the Riemann sphere seen in the plane: t = 0 the identity, t = 1 the exact
// inversion. The path is symmetric under the inversion, so at t = ½ every point sits on K at
// once — the halftime pinch is genuine and chosen (see DECISIONS.md, "Animating a circle
// inversion"; the fractal-attractors page's Plate 199 buttons use the same path).
function flowPoint(K, x, y, t) {
  const dx = x - K.x, dy = y - K.y;
  const d = Math.hypot(dx, dy) || 1e-12;
  const a = Math.atan(d / K.r);
  let s = (K.r * Math.tan(a + t * (Math.PI / 2 - 2 * a))) / d;
  // a point near the centre flies toward infinity as t → 1; keep its coordinates finite
  if (!isFinite(s) || s * d > 1e4) s = 1e4 / d;
  return [K.x + s * dx, K.y + s * dy];
}
// Inversion of a circle that does not pass through K's centre. d2 > 0 keeps the circle's
// orientation (centre outside K's disc... sign only matters for regions, handled by caller).
function invCircle(K, c) {
  const dx = c.x - K.x, dy = c.y - K.y, d2 = dx * dx + dy * dy - c.r * c.r;
  const s = (K.r * K.r) / d2;
  return { x: K.x + s * dx, y: K.y + s * dy, r: Math.abs(s) * c.r };
}
// Inversion of a region (disc or complement). The image is a disc unless the region covers
// K's centre, which the constructions here avoid after the first step.
function invRegion(K, g) {
  const c = invCircle(K, g);
  const dx = g.x - K.x, dy = g.y - K.y, centreInG = dx * dx + dy * dy < g.r * g.r;
  // inside disc not covering centre -> disc; complement covering everything but centre -> disc
  return { x: c.x, y: c.y, r: c.r, inside: g.inside ? !centreInG : centreInG };
}

// ---------- tangencies and orthogonal circles ----------
const tangentPoint = (a, b) => {
  const d = Math.hypot(b.x - a.x, b.y - a.y), t = a.r / d;
  return [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t];
};
// The circle orthogonal to three circles (the radical-centre construction). Returns null when
// the radical centre lies inside the circles, where no real orthogonal circle exists.
function orthoCircle(a, b, c) {
  const row = (k) => [2 * k.x, 2 * k.y, k.x * k.x + k.y * k.y - k.r * k.r];
  const [r1, r2, r3] = [row(a), row(b), row(c)];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const M = [[r1[0], r1[1], -1], [r2[0], r2[1], -1], [r3[0], r3[1], -1]];
  const D = det(M);
  const Mx = [[r1[2], r1[1], -1], [r2[2], r2[1], -1], [r3[2], r3[1], -1]];
  const My = [[r1[0], r1[2], -1], [r2[0], r2[2], -1], [r3[0], r3[2], -1]];
  const Mc = [[r1[0], r1[1], r1[2]], [r2[0], r2[1], r2[2]], [r3[0], r3[1], r3[2]]];
  const x = det(Mx) / D, y = det(My) / D, c0 = det(Mc) / D;
  const r2v = x * x + y * y - c0;
  return r2v > 0 ? { x, y, r: Math.sqrt(r2v) } : null;
}

// ---------- Descartes' theorem and Apollonian packing ----------
// Given three mutually tangent circles (signed curvature: negative when the others sit inside),
// the inner Apollonius circle. Complex Descartes formula; the "+" root is the new inscribed circle.
function descartes(a, ka, b, kb, c, kc) {
  const k = ka + kb + kc + 2 * Math.sqrt(Math.max(0, ka * kb + kb * kc + kc * ka));
  // complex: z k = za ka + zb kb + zc kc ± 2 sqrt(ka kb za zb + ...)
  const re = ka * kb * (a.x * b.x - a.y * b.y) + kb * kc * (b.x * c.x - b.y * c.y) + kc * ka * (c.x * a.x - c.y * a.y);
  const im = ka * kb * (a.x * b.y + a.y * b.x) + kb * kc * (b.x * c.y + b.y * c.x) + kc * ka * (c.x * a.y + c.y * a.x);
  const m = Math.sqrt(Math.hypot(re, im)), th = Math.atan2(im, re) / 2;
  const sx = m * Math.cos(th), sy = m * Math.sin(th);
  const zx = a.x * ka + b.x * kb + c.x * kc, zy = a.y * ka + b.y * kb + c.y * kc;
  for (const sgn of [1, -1]) {
    const x = (zx + sgn * 2 * sx) / k, y = (zy + sgn * 2 * sy) / k, r = 1 / k;
    // the right root is tangent to all three; check against a
    const want = ka < 0 || k < 0 ? Math.abs(Math.abs(1 / ka) - r) : 1 / ka + r;
    if (Math.abs(Math.hypot(x - a.x, y - a.y) - Math.abs(want)) < 1e-6 * (1 + Math.abs(want))) return { x, y, r, k };
  }
  // fall back to the smaller-error root
  const x = (zx + 2 * sx) / k, y = (zy + 2 * sy) / k;
  return { x, y, r: 1 / k, k };
}
// Apollonian packing of the curvilinear triangles of three mutually tangent circles, down to
// radius rmin (world units); view pruning via bb = {x0,x1,y0,y1} or null. Returns the circles
// added (not the three given). Each stack entry is [[circle, curvature] × 3, depth]. Every
// circle inscribed in a curvilinear triangle lies inside the bounding box of its three corners
// (the pairwise tangency points), so a triangle whose corner box misses the view is pruned.
function apollonianFill(triples, rmin, bb, cap = 60000) {
  const out = [];
  const stack = triples.slice().map((t) => (t.length === 3 ? [...t, 0] : t));
  const corners = (a, b, c) => [tangentPoint(a, b), tangentPoint(b, c), tangentPoint(a, c)];
  while (stack.length && out.length < cap) {
    const [A, B, C, depth] = stack.pop();
    if (bb) {
      const ps = corners(A[0], B[0], C[0]);
      const x0 = Math.min(ps[0][0], ps[1][0], ps[2][0]), x1 = Math.max(ps[0][0], ps[1][0], ps[2][0]);
      const y0 = Math.min(ps[0][1], ps[1][1], ps[2][1]), y1 = Math.max(ps[0][1], ps[1][1], ps[2][1]);
      if (x1 < bb.x0 || x0 > bb.x1 || y1 < bb.y0 || y0 > bb.y1) continue;
    }
    const n = descartes(A[0], A[1], B[0], B[1], C[0], C[1]);
    if (!n || !(n.r > 0)) continue;
    out.push({ x: n.x, y: n.y, r: n.r, g: depth });
    if (n.r < rmin) continue;
    const N = [{ x: n.x, y: n.y, r: n.r }, n.k];
    stack.push([A, B, N, depth + 1], [A, C, N, depth + 1], [B, C, N, depth + 1]);
  }
  return out;
}

// ---------- clans: the net sorted by which circle it descends from ----------
// BFS over reduced words of the inversions in gens, applied to each seed circle. Each image is
// kept as {x, y, r, clan, depth}. rminOf(circle) returning false stops the recursion.
function clanCircles(gens, seeds, rmin, bb, cap = 80000) {
  const out = [];
  const queue = [];
  seeds.forEach((s, i) => { out.push({ x: s.x, y: s.y, r: s.r, clan: i, depth: 0 }); queue.push([s, -1, i, 0]); });
  let qi = 0;
  while (qi < queue.length && out.length < cap) {
    const [c, last, clan, depth] = queue[qi++];
    for (let m = 0; m < gens.length; m++) {
      if (m === last) continue;
      const K = gens[m];
      // skip when the inversion fixes the seed (orthogonal circle): image equals preimage
      const dx = c.x - K.x, dy = c.y - K.y, d2 = dx * dx + dy * dy - c.r * c.r;
      if (Math.abs(d2 - K.r * K.r) < 1e-12) continue;
      const im = invCircle(K, c);
      out.push({ x: im.x, y: im.y, r: im.r, clan, depth: depth + 1 });
      if (im.r > rmin && (!bb || !(im.x + im.r < bb.x0 || im.x - im.r > bb.x1 || im.y + im.r < bb.y0 || im.y - im.r > bb.y1)))
        queue.push([im, m, clan, depth + 1]);
    }
  }
  return out;
}

// ---------- Poincaré chain stages ----------
// Stage s of Poincaré's construction: every reduced word of length s in the inversions,
// applied to the generating circles. Stage 1 is the 12 links σi(Cj), i ≠ j.
function chainStage(gens, s) {
  let links = gens.map((c, j) => ({ x: c.x, y: c.y, r: c.r, last: j }));
  for (let k = 0; k < s; k++) {
    const next = [];
    for (const L of links) for (let m = 0; m < gens.length; m++) {
      if (m === L.last) continue;
      const im = invCircle(gens[m], L);
      next.push({ x: im.x, y: im.y, r: im.r, last: m });
    }
    links = next;
  }
  return links;
}

// ---------- Mandelbrot's osculating-disc construction ----------
// For generating circles gens (mutually tangent in a known pattern), compute the Γ circles of
// every triplet, keep those with a tangency-point-free side (they osculate L), and sort the
// discs into the interior and exterior of L. Returns { in: [regions], out: [regions] }.
function osculatingSeeds(gens, tangPairs) {
  const gammas = tangPairs.map(([i, j]) => ({ p: tangentPoint(gens[i], gens[j]), i, j }));
  const seedsIn = [], seedsOut = [];
  const n = gens.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const G = orthoCircle(gens[i], gens[j], gens[k]);
    if (!G) continue;
    const tri = [i, j, k];
    let strictlyIn = 0, strictlyOut = 0;
    for (const g of gammas) {
      if (tri.includes(g.i) && tri.includes(g.j)) continue; // lies on Γ
      const d = Math.hypot(g.p[0] - G.x, g.p[1] - G.y);
      if (d < G.r * (1 - 1e-9)) strictlyIn++; else if (d > G.r * (1 + 1e-9)) strictlyOut++;
    }
    if (strictlyIn && strictlyOut) continue;            // Γ intersects L: not needed
    if (strictlyIn) seedsOut.push({ x: G.x, y: G.y, r: G.r, inside: false, omit: tri });
    else seedsIn.push({ x: G.x, y: G.y, r: G.r, inside: true, omit: tri });
  }
  return { seedsIn, seedsOut };
}
// The clan of an osculating seed: its images under all reduced words. A seed's Γ is orthogonal
// to its triplet, so the only words that move it start with an inversion outside the triplet.
function osculatingClan(gens, seed, rmin, bb, cap = 60000) {
  const out = [seed];
  const queue = [];
  for (let m = 0; m < gens.length; m++) if (!seed.omit.includes(m)) queue.push([seed, m]);
  let qi = 0;
  while (qi < queue.length && out.length < cap) {
    const [g, m] = queue[qi++];
    const im = invRegion(gens[m], g);
    out.push(im);
    if (im.r > rmin && (!bb || !(im.x + im.r < bb.x0 || im.x - im.r > bb.x1 || im.y + im.r < bb.y0 || im.y - im.r > bb.y1)))
      for (let k = 0; k < gens.length; k++) if (k !== m) queue.push([im, k]);
  }
  return out;
}

// ---------- covering a chain's limit set by discs (used for Plate 179) ----------
// σθ,m = (rotation by θ about Cm's centre) ∘ (inversion in Cm); at θ = 0 this is plain
// inversion, and the covering-by-discs drawing is the same as for the sections above.
function twistCircle(K, th, c) {
  const im = invCircle(K, c);
  const co = Math.cos(th), si = Math.sin(th), dx = im.x - K.x, dy = im.y - K.y;
  return { x: K.x + co * dx - si * dy, y: K.y + si * dx + co * dy, r: im.r };
}
// Every disc smaller than rmax is drawn (so the thread stays contiguous), and the recursion
// refines until rmin, so terminal discs add the fine detail.
function twistedLimit(gens, th, rmin, rmax, bb, cap = 150000) {
  const out = [];
  const queue = gens.map((c, j) => [c, j]);
  let qi = 0;
  while (qi < queue.length && out.length < cap) {
    const [c, last] = queue[qi++];
    for (let m = 0; m < gens.length; m++) {
      if (m === last) continue;
      const im = twistCircle(gens[m], th, c);
      if (im.r <= rmax) out.push(im);
      if (im.r <= rmin) continue;
      if (bb && (im.x + im.r < bb.x0 || im.x - im.r > bb.x1 || im.y + im.r < bb.y0 || im.y - im.r > bb.y1)) continue;
      queue.push([im, m]);
    }
  }
  return out;
}

// ---------- Plate 178: the identified self-homographic group ----------
// Plate 178 is the limit set of a once-punctured-torus Kleinian group in Maskit's
// normalization — generators a = [[−iμ, −i], [−i, 0]] and b = z + 2 — identified from the
// scan at μ = −0.048 + 1.894i, about ±0.005 in each part (DECISIONS.md, "Plate 178").
// M178 holds the group conjugated into the plate's own frame, where the outer circle is the
// unit circle: the generators, their inverses, the elliptic involution e (a half-turn that
// swaps a with a⁻¹ and b with b⁻¹), and the fixed points of the three cyclic rotations of
// the commutator, which lie on the limit set and are the reference points of the recursion.
// A 2×2 complex matrix is stored flat as [ar, ai, br, bi, cr, ci, dr, di], det = 1.
const M178 = {
  a: [2.9214284042, 1.9479801089, 1.9346142348, -0.0583438186, -0.0375345626, -3.9047866630, -1.0274284042, -1.8999801089],
  b: [1, -1.0134093461, -0.0008112307, -1.0134090214, -0.0008112307, 1.0134090214, 1, 1.0134093461],
  ai: [-1.0274284042, -1.8999801089, -1.9346142348, 0.0583438186, 0.0375345626, 3.9047866630, 2.9214284042, 1.9479801089],
  bi: [1, 1.0134093461, 0.0008112307, 1.0134090214, 0.0008112307, -1.0134090214, 1, -1.0134093461],
  e: [0.9939269766, 0.9596986507, 0.9938943971, -0.0410969715, -0.9923579261, -1.9604936580, -0.9939269766, -0.9596986507],
  refs: [-0.3828237149, 0.2052316989, -0.6661076400, 0.3429536596, -0.0172817852, 0.9998506588],
};
function matMulC(m, n) {
  const o = new Float64Array(8);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    let re = 0, im = 0;
    for (let k = 0; k < 2; k++) {
      const a = m[4 * i + 2 * k], b = m[4 * i + 2 * k + 1], c = n[4 * k + 2 * j], d = n[4 * k + 2 * j + 1];
      re += a * c - b * d; im += a * d + b * c;
    }
    o[4 * i + 2 * j] = re; o[4 * i + 2 * j + 1] = im;
  }
  return o;
}
function mobiusC(m, x, y, out) {
  const nr = m[0] * x - m[1] * y + m[2], ni = m[0] * y + m[1] * x + m[3];
  const dr = m[4] * x - m[5] * y + m[6], di = m[4] * y + m[5] * x + m[7];
  const q = 1 / (dr * dr + di * di);
  out[0] = (nr * dr + ni * di) * q; out[1] = (ni * dr - nr * di) * q;
}
// Depth-first over reduced words in a, b, a⁻¹, b⁻¹. A word is a leaf when it has squeezed
// the three reference points within eps of each other — its piece of the limit set is
// smaller than eps — or at maxdepth, which is what ends the runs of b: a parabolic never
// contracts the neighbourhood of its own fixed point. With eps = 0 the recursion is a pure
// fixed word-length cutoff, which is the pruning of the printed plate (see the page note).
// Emits [x0,y0,x1,y1,…].
function maskitPoints(eps, maxdepth, bb, cap = 400000) {
  const G = [M178.a, M178.b, M178.ai, M178.bi], INV = [2, 3, 0, 1], R = M178.refs;
  const out = [];
  const mats = [Float64Array.from([1, 0, 0, 0, 0, 0, 1, 0])], lasts = [-1], deps = [0];
  const p = [0, 0], q = [0, 0], r = [0, 0];
  while (mats.length && out.length < cap * 2) {
    const T = mats.pop(), last = lasts.pop(), d = deps.pop();
    mobiusC(T, R[0], R[1], p); mobiusC(T, R[2], R[3], q); mobiusC(T, R[4], R[5], r);
    const spread = Math.hypot(p[0] - q[0], p[1] - q[1]) + Math.hypot(q[0] - r[0], q[1] - r[1]);
    if (!isFinite(spread)) continue;
    if (spread < eps || d >= maxdepth) { out.push(p[0], p[1], q[0], q[1]); continue; }
    if (bb) {
      const pad = spread * 3;
      if (Math.max(p[0], q[0], r[0]) + pad < bb.x0 || Math.min(p[0], q[0], r[0]) - pad > bb.x1 ||
          Math.max(p[1], q[1], r[1]) + pad < bb.y0 || Math.min(p[1], q[1], r[1]) - pad > bb.y1) continue;
    }
    for (let gi = 0; gi < 4; gi++) {
      if (gi === INV[last]) continue;
      mats.push(matMulC(T, G[gi])); lasts.push(gi); deps.push(d + 1);
    }
  }
  return out;
}
// One-parameter flow M^t of a det-1 Möbius matrix: identity at t = 0, the map itself at
// t = 1, moving along its one-parameter subgroup — a spiral for loxodromic a, a slide for
// parabolic b, a turn for the elliptic involution. Returns a function t → flat matrix.
function mobiusFlow(mIn) {
  const trR = mIn[0] + mIn[6], trI = mIn[1] + mIn[7];
  const m = trR < 0 ? mIn.map((v) => -v) : mIn.slice();      // −M is the same Möbius map
  const tr = [Math.abs(trR), trR < 0 ? -trI : trI];
  if (Math.hypot(tr[0] - 2, tr[1]) < 1e-7) {
    return (t) => [1 + t * (m[0] - 1), t * m[1], t * m[2], t * m[3], t * m[4], t * m[5], 1 + t * (m[6] - 1), t * m[7]];
  }
  const cmul = (u, v) => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]];
  const cdiv = (u, v) => { const q2 = v[0] * v[0] + v[1] * v[1]; return [(u[0] * v[0] + u[1] * v[1]) / q2, (u[1] * v[0] - u[0] * v[1]) / q2]; };
  const csqrt = (u) => { const s = Math.sqrt(Math.hypot(u[0], u[1])), a2 = Math.atan2(u[1], u[0]) / 2; return [s * Math.cos(a2), s * Math.sin(a2)]; };
  const disc = csqrt([tr[0] * tr[0] - tr[1] * tr[1] - 4, 2 * tr[0] * tr[1]]);
  const lam = [(tr[0] + disc[0]) / 2, (tr[1] + disc[1]) / 2];
  const ilam = cdiv([1, 0], lam);
  const A = [m[0], m[1]], B = [m[2], m[3]], C2 = [m[4], m[5]], D = [m[6], m[7]];
  const byB = Math.hypot(B[0], B[1]) > Math.hypot(C2[0], C2[1]);
  const v1 = byB ? [B, [lam[0] - A[0], lam[1] - A[1]]] : [[lam[0] - D[0], lam[1] - D[1]], C2];
  const v2 = byB ? [B, [ilam[0] - A[0], ilam[1] - A[1]]] : [[ilam[0] - D[0], ilam[1] - D[1]], C2];
  const P = [v1[0][0], v1[0][1], v2[0][0], v2[0][1], v1[1][0], v1[1][1], v2[1][0], v2[1][1]];
  const det = [P[0] * P[6] - P[1] * P[7] - (P[2] * P[4] - P[3] * P[5]), P[0] * P[7] + P[1] * P[6] - (P[2] * P[5] + P[3] * P[4])];
  const inv2 = cdiv([1, 0], det);
  const Pi0 = cmul([P[6], P[7]], inv2), Pi1 = cmul([-P[2], -P[3]], inv2), Pi2 = cmul([-P[4], -P[5]], inv2), Pi3 = cmul([P[0], P[1]], inv2);
  const Pi = [Pi0[0], Pi0[1], Pi1[0], Pi1[1], Pi2[0], Pi2[1], Pi3[0], Pi3[1]];
  const logr = Math.log(Math.hypot(lam[0], lam[1])), arg = Math.atan2(lam[1], lam[0]);
  return (t) => {
    const er = Math.exp(t * logr), e = [er * Math.cos(t * arg), er * Math.sin(t * arg)];
    const ei = cdiv([1, 0], e);
    const Dg = [e[0], e[1], 0, 0, 0, 0, ei[0], ei[1]];
    return matMulC(matMulC(P, Dg), Pi);
  };
}

// ---------- self-checks (console only) ----------
(function check() {
  const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) - (a.r + b.r);
  [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([i, j]) => console.assert(Math.abs(gap(CHAIN[i], CHAIN[j])) < 1e-4, 'chain tangency', i, j));
  [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [2, 4]].forEach(([i, j]) => console.assert(Math.abs(gap(FRICKE[i], FRICKE[j])) < 1e-4, 'fricke tangency', i, j));
  const o = orthoCircle(CHAIN[0], CHAIN[1], CHAIN[2]);
  const orth = (G, K) => Math.abs((G.x - K.x) ** 2 + (G.y - K.y) ** 2 - G.r * G.r - K.r * K.r);
  console.assert(o && orth(o, CHAIN[0]) < 1e-9, 'orthocircle');
})();
