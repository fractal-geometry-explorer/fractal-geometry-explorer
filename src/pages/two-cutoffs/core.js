// Chapter 4 prints no plates. These figures illustrate its one geometric claim — a drawing of a
// fractal holds between an outer and an inner cutoff — on the triadic Koch curve of chapter 6,
// built from the shared rules (points on [0,1], all four pieces as drawn).
const KOCH_P = [[0, 0], [1 / 3, 0], [1 / 2, R3 / 6], [2 / 3, 0], [1, 0]];
const KOCH_GEN = genFromCodes(KOCH_P, [0, 0, 0, 0]);
const KOCH_D = Math.log(4) / Math.log(3);
const kochCache = [];
function koch(k) {
  return kochCache[k] || (kochCache[k] = curveOf(Array.from({ length: k }, () => KOCH_GEN)));
}
// an open polyline as chunked Path2D pieces, each continuing from the previous point
function strokeChunks(P, size = 4096) {
  const n = P.length / 2, out = [];
  let p = null;
  for (let i = 0; i < n; i++) {
    if (i % size === 0) {
      p = new Path2D(); out.push(p);
      p.moveTo(P[2 * (i ? i - 1 : 0)], P[2 * (i ? i - 1 : 0) + 1]);
      if (i) p.lineTo(P[2 * i], P[2 * i + 1]);
      continue;
    }
    p.lineTo(P[2 * i], P[2 * i + 1]);
  }
  return out;
}
