// CORE START
const KMAX = 18;                                  // finest construction: 2^18 = 262,144 steps (stage 9)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Mandelbrot pp. 234–235: random initiator of mean-square length 1, then isotropic Gaussian midpoint
// displacements whose mean square halves at each pass. Coarser stages are subsets of the same points.
function brownPath(seed) {
  const rnd = mulberry32(seed * 2654435761);
  let spare = null;
  const gauss = () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = rnd();
    const v = rnd(), r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  const N = 1 << KMAX, xs = new Float64Array(N + 1), ys = new Float64Array(N + 1);
  xs[N] = gauss() * Math.SQRT1_2; ys[N] = gauss() * Math.SQRT1_2;
  let step = N, dt = 1;
  while (step > 1) {
    const h = step >> 1, sd = Math.sqrt(dt / 8);     // per-coordinate sd of a bridge midpoint
    for (let i = 0; i < N; i += step) {
      xs[i + h] = (xs[i] + xs[i + step]) / 2 + gauss() * sd;
      ys[i + h] = (ys[i] + ys[i + step]) / 2 + gauss() * sd;
    }
    step = h; dt /= 2;
  }
  return { xs, ys };
}
const strideOf = (n) => 1 << (KMAX - 2 * n);      // stage n uses every (4^(9−n))th point: 4^n steps
// Band areas, measured by rasterizing a round-capped, round-joined stroke of width 2ε (exactly the union of discs)
// and summing its pixel coverage. Runs in a worker when it can; the same code runs on the page otherwise.
function makeMeasurer(createCanvas) {
  let P = null, paths = {}, bb = null;
  const cnv = createCanvas(), g = cnv.getContext('2d', { willReadFrequently: true });
  function setPath(xs, ys) {
    P = { xs, ys }; paths = {};
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < xs.length; i++) { const x = xs[i], y = ys[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    bb = { x0, x1, y0, y1 };
  }
  function path(n) {
    if (!paths[n]) {
      const st = strideOf(n), p = new Path2D();
      p.moveTo(P.xs[0], P.ys[0]);
      for (let i = st; i < P.xs.length; i += st) p.lineTo(P.xs[i], P.ys[i]);
      paths[n] = p;
    }
    return paths[n];
  }
  function setup(eps) {
    const bw = bb.x1 - bb.x0 + 2 * eps, bh = bb.y1 - bb.y0 + 2 * eps;
    let h = eps / 6;
    if (Math.max(bw, bh) / h > 2000) h = Math.max(bw, bh) / 2000;
    const W = Math.ceil(bw / h) + 2, H = Math.ceil(bh / h) + 2;
    cnv.width = W; cnv.height = H;
    return { h, W, H };
  }
  function render(n, eps, s) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s.W, s.H);
    g.setTransform(1 / s.h, 0, 0, -1 / s.h, (eps - bb.x0) / s.h + 1, (bb.y1 + eps) / s.h + 1);
    g.lineWidth = 2 * eps; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#000';
    g.stroke(path(n));
    return g.getImageData(0, 0, s.W, s.H).data;
  }
  return {
    setPath,
    area(n, eps) {
      const s = setup(eps), d = render(n, eps, s);
      let sum = 0;
      for (let i = 3; i < d.length; i += 4) sum += d[i];
      return (sum / 255) * s.h * s.h;
    },
    diff(n, m, eps) {
      const s = setup(eps), a = render(n, eps, s), b = render(m, eps, s);
      let sum = 0;
      for (let i = 3; i < a.length; i += 4) sum += Math.abs(a[i] - b[i]);
      return (sum / 255) * s.h * s.h;
    },
  };
}
// Wiener's law for the expected band area in these units (E|B(1)|² = 1): about π / ln(1 / 2ε²)
const lawArea = (e) => Math.PI / Math.log(1 / (2 * e * e));

module.exports={brownPath,strideOf,KMAX,lawArea};