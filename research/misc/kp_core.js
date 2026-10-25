// CORE START
const S3 = Math.sqrt(3);
// Koch island on the unit triangle, counterclockwise, peninsulas pointing outward (to the right of travel)
const TRI = [0, 0, 1, 0, 0.5, S3 / 2];
const kochCache = {};
function kochPoly(n) {
  if (kochCache[n]) return kochCache[n];
  let P = Float64Array.from(TRI);
  for (let k = 0; k < n; k++) {
    const m = P.length / 2, Q = new Float64Array(m * 8);
    let w = 0;
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, bx = P[j], by = P[j + 1];
      const vx = (bx - ax) / 3, vy = (by - ay) / 3;
      const px = ax + vx + (0.5 * vx + (S3 / 2) * vy), py = ay + vy + (-(S3 / 2) * vx + 0.5 * vy);
      Q[w++] = ax; Q[w++] = ay; Q[w++] = ax + vx; Q[w++] = ay + vy; Q[w++] = px; Q[w++] = py; Q[w++] = ax + 2 * vx; Q[w++] = ay + 2 * vy;
    }
    P = Q;
  }
  return (kochCache[n] = P);
}
// Cesàro's outer teragon: every side of the inner one gets an outward tent with legs 1/√3 as long (120° at the apex)
function tentOut(P) {
  const m = P.length / 2, Q = new Float64Array(m * 4);
  let w = 0;
  for (let i = 0; i < m; i++) {
    const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, bx = P[j], by = P[j + 1];
    Q[w++] = ax; Q[w++] = ay;
    Q[w++] = (ax + bx) / 2 + (by - ay) * S3 / 6; Q[w++] = (ay + by) / 2 - (bx - ax) * S3 / 6;
  }
  return Q;
}
function tentIn(P) {
  const m = P.length / 2, Q = new Float64Array(m * 4);
  let w = 0;
  for (let i = 0; i < m; i++) {
    const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, bx = P[j], by = P[j + 1];
    Q[w++] = ax; Q[w++] = ay;
    Q[w++] = (ax + bx) / 2 - (by - ay) * S3 / 6; Q[w++] = (ay + by) / 2 + (bx - ax) * S3 / 6;
  }
  return Q;
}
function shoelace(P) {
  let s = 0;
  const m = P.length / 2;
  for (let i = 0; i < m; i++) { const j = ((i + 1) % m) * 2; s += P[2 * i] * P[j + 1] - P[j] * P[2 * i + 1]; }
  return s / 2;
}
// a point on the Koch curve over [0,1] (peninsulas below), from the base-4 digits of t
function kochPoint(t) {
  const d = [];
  let x = Math.min(Math.max(t, 0), 1);
  for (let k = 0; k < 26; k++) { x *= 4; let q = Math.floor(x); if (q > 3) q = 3; d.push(q); x -= q; }
  let zx = 0, zy = 0;
  const c = 0.5, s = S3 / 2;
  for (let k = d.length - 1; k >= 0; k--) {
    const ux = zx / 3, uy = zy / 3;
    switch (d[k]) {
      case 0: zx = ux; zy = uy; break;
      case 1: zx = 1 / 3 + (c * ux + s * uy); zy = -s * ux + c * uy; break;          // rotate −60°
      case 2: zx = 0.5 + (c * ux - s * uy); zy = -S3 / 6 + (s * ux + c * uy); break;  // rotate +60°
      default: zx = 2 / 3 + ux; zy = uy;
    }
  }
  return [zx, zy];
}
// The snowflake sweep (Plates 68–69): six steps of 1/3 and one of 1/√3, with each step's copy laid down as decoded
// from the book's second-stage drawing. Orientation codes: 0 as drawn, 1 mirrored, 2 reversed, 3 reversed and mirrored.
const SW_G = [[0, 0], [1 / 6, S3 / 6], [1 / 3, S3 / 3], [2 / 3, S3 / 3], [5 / 6, S3 / 6], [1 / 3, 0], [2 / 3, 0], [1, 0]];
const SW_O = [1, 3, 3, 3, 2, 1, 3];
function sweepSegments(depth, seq) {
  const N = Math.pow(7, depth), A = new Float64Array(N * 4), C = new Uint8Array(N), R = new Uint8Array(N);
  let w = 0;
  const rec = (ax, ay, bx, by, c, rev, d) => {
    if (d === depth) { A[4 * w] = ax; A[4 * w + 1] = ay; A[4 * w + 2] = bx; A[4 * w + 3] = by; C[w] = c; R[w] = rev; w++; return; }
    const F = seq[d] === 1, dx = bx - ax, dy = by - ay, kids = [];
    for (let i = 0; i < 7; i++) {
      const o = SW_O[i];
      let a = SW_G[i], b = SW_G[i + 1];
      if (o >= 2) { const t = a; a = b; b = t; }
      let cc = o & 1, rr = o >= 2 ? 1 : 0;
      if (F) { a = [1 - a[0], a[1]]; b = [1 - b[0], b[1]]; cc ^= 1; rr ^= 1; }     // mirror in the line x = 1/2
      const ay2 = c ? -a[1] : a[1], by2 = c ? -b[1] : b[1];
      kids.push([ax + dx * a[0] - dy * ay2, ay + dx * ay2 + dy * a[0], ax + dx * b[0] - dy * by2, ay + dx * by2 + dy * b[0], c ^ cc, rev ^ rr]);
    }
    if (rev ^ (F ? 1 : 0)) kids.reverse();
    for (const k of kids) rec(k[0], k[1], k[2], k[3], k[4], k[5], d + 1);
  };
  rec(0, 0, 1, 0, 0, 0, 0);
  return { A, C, R, n: w };
}

module.exports={kochPoly,tentOut,tentIn,shoelace,kochPoint,sweepSegments};