// Chapter 9 geometry: Fournier aggregates. An aggregate of order k is a sphere of radius rho^k
// (the order-0 ball has radius 1) holding copies of the aggregate of order k − 1. Their centres
// sit at the aggregate's centre and at distance d = R − R/rho from it — the distance at which a
// copy touches the enclosing sphere. In the plane the four outer copies go to the diagonal
// corners (±e, ±e), e = d/√2, as the plates print them; in space the octahedron adds two more
// copies on the axis through the centre, which project onto the centre.
const SQ2 = Math.SQRT2;
const FLAT_OFF = [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// the 5^orders dot centres of a flat aggregate of the given order, as [x0, y0, x1, y1, ...]
function quincunx(orders, rho) {
  let pts = new Float64Array([0, 0]);
  for (let j = 1; j <= orders; j++) {
    const e = (Math.pow(rho, j) - Math.pow(rho, j - 1)) / SQ2;
    const out = new Float64Array(pts.length * 5);
    let o = 0;
    for (let i = 0; i < pts.length; i += 2)
      for (const [sx, sy] of FLAT_OFF) { out[o++] = pts[i] + sx * e; out[o++] = pts[i + 1] + sy * e; }
    pts = out;
  }
  return pts;
}

// the 7^orders ball centres of the octahedral aggregate, as [x0, y0, z0, x1, ...]
function octahedral(orders, rho) {
  let pts = new Float64Array([0, 0, 0]);
  for (let j = 1; j <= orders; j++) {
    const d = Math.pow(rho, j) - Math.pow(rho, j - 1), e = d / SQ2;
    const offs = [[0, 0, 0], [e, e, 0], [e, -e, 0], [-e, e, 0], [-e, -e, 0], [0, 0, d], [0, 0, -d]];
    const out = new Float64Array(pts.length * 7);
    let o = 0;
    for (let i = 0; i < pts.length; i += 3)
      for (const [sx, sy, sz] of offs) { out[o++] = pts[i] + sx; out[o++] = pts[i + 1] + sy; out[o++] = pts[i + 2] + sz; }
    pts = out;
  }
  return pts;
}

// draw the flat aggregate into view v, pruning subtrees outside the screen. Finite mode stops at
// the order-0 balls, drawn to scale but never smaller than minPx (the plates' pen does the same).
// Endless mode instead keeps subdividing any ball big enough on screen into the five balls of the
// next order down (the book's interpolation to orders −1, −2, …), so zooming never ends.
function drawFlat(c, v, w, h, rho, orders, endless, minPx) {
  const splitPx = 2.6;                           // a ball bigger than this splits (endless mode)
  let dots = 0;
  (function rec(x, y, R, order) {
    const sx = v.ox + x * v.s, sy = v.oy - y * v.s, sr = R * v.s;
    if (sx + sr < 0 || sx - sr > w || sy + sr < 0 || sy - sr > h) return;
    const leaf = endless ? sr <= splitPx || order <= -40 : order <= 0;
    if (leaf) {
      const r = Math.max(sr * (endless ? 0.5 : 1), minPx);
      if (r > 2) { c.beginPath(); c.arc(sx, sy, r, 0, 2 * Math.PI); c.fill(); }
      else c.fillRect(sx - r, sy - r, 2 * r, 2 * r);
      dots++;
      return;
    }
    const Rs = R / rho, e = (R - Rs) / SQ2;
    for (const [ox, oy] of FLAT_OFF) rec(x + ox * e, y + oy * e, Rs, order - 1);
  })(0, 0, Math.pow(rho, orders), orders);
  return dots;
}

// sorted distances from the central ball to every ball of the aggregate (its own centre included,
// at distance 0), so that M(R) = how many entries are ≤ R
function massRadii(pts, dim) {
  const n = pts.length / dim, out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = pts[i * dim], y = pts[i * dim + 1], z = dim === 3 ? pts[i * dim + 2] : 0;
    out[i] = Math.hypot(x, y, z);
  }
  out.sort();
  return out;
}

// directions from the central ball to every other ball, as a covered/empty histogram of the
// full circle: bins[b] = true when some ball lies within that bin of directions
function skyBins(pts, nbins) {
  const bins = new Uint8Array(nbins);
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i], y = pts[i + 1];
    if (x === 0 && y === 0) continue;
    const a = Math.atan2(y, x);
    bins[((Math.round((a / (2 * Math.PI)) * nbins) % nbins) + nbins) % nbins] = 1;
  }
  return bins;
}

// deterministic uniform scatter for the comparison sky (mulberry32)
function uniformDisc(n, radius, seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    const r = radius * Math.sqrt(rnd()), a = 2 * Math.PI * rnd();
    out[2 * i] = r * Math.cos(a); out[2 * i + 1] = r * Math.sin(a);
  }
  return out;
}
