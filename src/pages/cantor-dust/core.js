// Chapter 8 geometry: generalized Cantor dusts, a coverage rasteriser for the curtains, and the
// Cantor function. Plate 80's layout is measured from the scan at 600 dpi: rows of constant
// thickness 0.035 of the bar's length, at the measured row spacing below (stage 0 sits a touch
// farther from stage 1 than the later pitch of 0.0796).
const BAR_T = 0.035;
const BAR_Y = [0, 0.0908, 0.1704, 0.2497, 0.3293, 0.4083, 0.4879, 0.5675];
const barTop = (k) => (k < BAR_Y.length ? BAR_Y[k] : BAR_Y[7] + 0.0796 * (k - 7));

// a dust generator: N pieces of ratio r on [0, 1], evenly spaced — the first starts at 0, the
// last ends at 1, and the N − 1 tremas between them are equal, of length (1 − N r)/(N − 1)
const pieceStarts = (N, r) => Array.from({ length: N }, (_, i) => (i * (1 - r)) / (N - 1));
function dustPieces(N, r, n) {                 // stage n: N^n pieces of length r^n
  let starts = [0], len = 1;
  for (let k = 0; k < n; k++) {
    const S = pieceStarts(N, r), out = new Float64Array(starts.length * N);
    let j = 0;
    for (const a of starts) for (const s of S) out[j++] = a + s * len;
    starts = out; len *= r;
  }
  return { starts, len };
}

// ink coverage of the limit dust on a row of pixels: buf[i] += the covered fraction of pixel i.
// wx0 is the world x at buf[0]'s left edge, px one pixel in world units. Pieces outside the
// window are pruned, pieces under a pixel are deposited, so the cost is O(pixels) per row.
// A sub-pixel piece is deposited with weight (len/px)^(D−1) · its geometric overlap, i.e. total
// mass (len/px)^D: the one weight for which a piece deposits exactly what its N children would
// (N r^D = 1), so nothing jumps where the recursion bottoms out, and thin cords dim the way the
// dust's D-dimensional density says, not the way an interval's length does.
function coverDust(buf, N, r, wx0, px, a, len, depth, expo = 0) {
  if (a + len <= wx0 || a >= wx0 + buf.length * px) return;
  if (len <= px || depth <= 0) {
    const w = expo && len < px ? Math.pow(len / px, expo) : 1;
    const i0 = Math.max(0, Math.floor((a - wx0) / px)), i1 = Math.min(buf.length - 1, Math.floor((a + len - wx0) / px));
    for (let i = i0; i <= i1; i++) {
      const lo = Math.max(a, wx0 + i * px), hi = Math.min(a + len, wx0 + (i + 1) * px);
      if (hi > lo) buf[i] += ((hi - lo) / px) * w;
    }
    return;
  }
  const g = ((1 - r) / (N - 1)) * len;
  for (let i = 0; i < N; i++) coverDust(buf, N, r, wx0, px, a + i * g, len * r, depth - 1, expo);
}

// the Cantor function M(R): the mass of the bar between 0 and R
function cantorF(x) {
  let y = 0, p = 1;
  for (let i = 0; i < 48; i++) {
    if (x <= 0) return y;
    if (x >= 1) return y + p;
    if (x < 1 / 3) { x *= 3; p /= 2; }
    else if (x > 2 / 3) { x = 3 * x - 2; y += p / 2; p /= 2; }
    else return y + p / 2;
  }
  return y;
}
// a position where the staircase reaches height t (the right end of t's tread; the left end is
// 1 − cantorInv(1 − t), by the staircase's symmetry)
function cantorInv(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let x = 0, q = 1 / 3;
  for (let i = 0; i < 40; i++) {
    t *= 2;
    if (t >= 1) { x += 2 * q; t -= 1; }
    if (t <= 0) return x;
    q /= 3;
  }
  return x;
}

// the stage-n staircase as a polyline from (0,0) to (1,1): diagonals over the pieces, treads
// over the tremas. Its length is 1 − (2/3)^n + sqrt(1 + (4/9)^n) → 2.
function staircase(n) {
  const pts = [0, 0];
  (function rec(a, b, ya, yb, d) {
    if (!d) { pts.push(b, yb); return; }
    const w = (b - a) / 3, ym = (ya + yb) / 2;
    rec(a, a + w, ya, ym, d - 1);
    pts.push(a + 2 * w, ym);
    rec(a + 2 * w, b, ym, yb, d - 1);
  })(0, 1, 0, 1, n);
  return new Float64Array(pts);
}
const stairLen = (n) => 1 - Math.pow(2 / 3, n) + Math.sqrt(1 + Math.pow(4 / 9, n));
const polyLen = (P) => { let L = 0; for (let i = 2; i < P.length; i += 2) L += Math.hypot(P[i] - P[i - 2], P[i + 1] - P[i - 1]); return L; };

// gap counts: generation j has (N − 1)·N^(j−1) tremas of length lam·r^(j−1), lam = (1 − N r)/(N − 1),
// so Nr(U > u) climbs from N^(j−1) − 1 to N^j − 1 as u drops past lam·r^(j−1)
function gapGenerations(N, r, J) {
  const lam = (1 - N * r) / (N - 1), out = [];
  for (let j = 1; j <= J; j++) out.push({ len: lam * Math.pow(r, j - 1), below: Math.pow(N, j - 1) - 1, above: Math.pow(N, j) - 1 });
  return out;
}
const dustDim = (N, r) => Math.log(N) / Math.log(1 / r);
