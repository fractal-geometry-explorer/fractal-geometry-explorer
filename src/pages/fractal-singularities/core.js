// Chapter 11 prints no plates, so every figure on this page is the page's own illustration of
// the chapter's text. The models: functions singular on a point set and on a Cantor dust (the
// "list of elementary singularities" of p. 106), the zoom test behind the symmetry-preservation
// argument, Chorin's D ≈ 2.5 checked against chapter 10's B = (3 − D)/3, and a dissipation
// record whose singular times form a dust bounded by Scheffer's theorem (dimension ≤ 1/2).

// exact distance from x to the two-piece Cantor dust C(r) ⊂ [0, 1] (pieces [0, r] and [1 − r, 1],
// dimension D = log 2 / log (1/r)). Descend into whichever piece holds x; in a gap, the nearest
// dust points are the gap's edges, which belong to the dust.
function distDust(x, r) {
  if (x <= 0) return -x;
  if (x >= 1) return x - 1;
  let scale = 1;
  for (let i = 0; i < 80 && scale > 1e-18; i++) {
    if (x <= r) { x /= r; scale *= r; }
    else if (x >= 1 - r) { x = (x - (1 - r)) / r; scale *= r; }
    else return scale * Math.min(x - r, 1 - r - x);
  }
  return 0;
}
// the ratio that gives a two-piece dust its dimension: D = log 2 / log (1/r) so r = 2^(−1/D)
const ratioOf = (D) => Math.pow(2, -1 / D);

// the visible pieces of C(r), subdivided until no wider than px, culled to [vx0, vx1];
// returns a flat list x0, w, x0, w, ...
function dustPieces(r, px, vx0, vx1) {
  const out = [];
  const rec = (a, w) => {
    if (a > vx1 || a + w < vx0) return;
    if (w <= px) { out.push(a, w); return; }
    rec(a, w * r); rec(a + w * (1 - r), w * r);
  };
  rec(0, 1);
  return out;
}

// the plane dust C(1/3) × C(1/3) (D = log 4 / log 3 ≈ 1.2619) as squares subdivided until no
// wider than px, culled to the view. The point (1/4, 1/4) lies in the dust (1/4 = 0.020202...
// in base 3), so a zoom kept centred there repeats exactly with a factor-9 period.
const DUST2_D = Math.log(4) / Math.log(3);
function dustSquares(px, vx0, vx1, vy0, vy1, cb) {
  const rec = (x, y, w) => {
    if (x > vx1 || x + w < vx0 || y > vy1 || y + w < vy0) return;
    if (w <= px) { cb(x, y, w); return; }
    const t = w / 3, o = w - t;
    rec(x, y, t); rec(x + o, y, t); rec(x, y + o, t); rec(x + o, y + o, t);
  };
  rec(0, 0, 1);
}

// the calculus student's rational function (p. 106): three poles and a zero, smooth elsewhere
const POLES = [-0.62, 0.08, 0.66], ZERO = 0.3;
const fRational = (x) => (x - ZERO) / ((x - POLES[0]) * (x - POLES[1]) * (x - POLES[2]));

// chapter 10's spectrum correction, which Chorin's B = 0.17 ± 0.03 is checked against:
// fractally homogeneous turbulence has B = (3 − D)/3, so D = 2.5 gives exactly 1/6
const specB = (D) => (3 - D) / 3;
