// Chapter 26 core: seeded randomness, midpoint-displacement curves in the plane and on the line,
// Poisson strata, a segment-crossing counter, and Plate 246 reconstructed as a forest of posts on a
// trema plain, seen from straight above.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gaussOf = (rnd) => () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

// ---- the plane curve B*_H(t): midpoint displacement on a time grid ----
// At stage k every side (nominally of length 2^(-k/D)) is bent at its middle; the displacement's
// mean square length is the book's 2^(-2(k+1)/D) - 2^(-2(k/D+1)). Rules: 'random' (isotropic
// Gaussian, the book's randomization), 'alt' (perpendicular, side alternating by stage: at
// D = log 4/log 3 this is the Koch snowflake curve in base N = 2), 'same' (always the same side:
// at D = 2, the Levy C curve).
function planeCurve(D, rule, n, seed) {
  const g = gaussOf(mulberry32(seed));
  let P = new Float64Array([0, 0, 1, 0]);
  for (let k = 0; k < n; k++) {
    // the book's 2^(-2(k+1)/D) - 2^(-2(k/D+1)); the second term is 2^(-2k/D)/4
    const sig2 = Math.pow(2, (-2 * (k + 1)) / D) - Math.pow(2, (-2 * k) / D) / 4;
    const m = P.length / 2 - 1, Q = new Float64Array(2 * (2 * m) + 2);
    const side = rule === 'alt' ? (k % 2 === 0 ? 1 : -1) : 1;
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3];
      let mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (rule === 'random') {
        const s = Math.sqrt(sig2 / 2);
        mx += s * g(); my += s * g();
      } else {
        const L = Math.hypot(bx - ax, by - ay) || 1, d = Math.sqrt(Math.max(0, sig2)) * side;
        mx += (-(by - ay) / L) * d; my += ((bx - ax) / L) * d;
      }
      Q[4 * i] = ax; Q[4 * i + 1] = ay; Q[4 * i + 2] = mx; Q[4 * i + 3] = my;
    }
    Q[Q.length - 2] = P[P.length - 2]; Q[Q.length - 1] = P[P.length - 1];
    P = Q;
  }
  return P;
}

// ---- the line-to-line function X(t): midpoint displacement with exponent H ----
// Values on the grid j/2^n. Refining an interval of length 2^(-k), the midpoint gets the average
// of the ends plus a Gaussian of variance 2^(-2Hk) (2^(-2H) - 1/4), so that over every dyadic
// interval <dX^2> = dt^(2H) exactly. Returns the final values and, if wanted, the teragon of
// every stage interpolated onto the final grid (for the layers view).
function lineCurve(H, n, seed, keepStages) {
  const g = gaussOf(mulberry32(seed)), N = 1 << n, X = new Float64Array(N + 1);
  X[0] = 0; X[N] = g();
  const stages = [];
  const snapshot = () => {
    const S = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) S[i] = X[i];
    return S;
  };
  const interp = (step) => {              // fill between the known points at spacing `step`
    for (let a = 0; a < N; a += step) for (let j = 1; j < step; j++) X[a + j] = X[a] + ((X[a + step] - X[a]) * j) / step;
  };
  if (keepStages) { interp(N); stages.push(snapshot()); }
  for (let k = 0; k < n; k++) {
    const s = Math.sqrt(Math.pow(2, -2 * H * k) * (Math.pow(2, -2 * H) - 0.25)), step = N >> k;
    for (let a = 0; a < N; a += step) X[a + step / 2] = (X[a] + X[a + step]) / 2 + s * g();
    if (keepStages) { interp(step / 2); stages.push(snapshot()); }
  }
  if (!keepStages) interp(1);
  return keepStages ? { X, stages } : { X };
}

// Measured nonstationarity: the mean square increment over windows of length dt = 2^(-m), when the
// window is dyadic (h dt to (h+1) dt) and when it is slid by half a step. Averaged over windows
// and over `trials` fresh curves.
function slidWindows(H, m, trials, seed0) {
  const n = m + 1, N = 1 << n;
  let dy = 0, sl = 0, cd = 0, cs = 0;
  for (let t = 0; t < trials; t++) {
    const { X } = lineCurve(H, n, seed0 + 7919 * t);
    for (let h = 0; h < (1 << m); h++) {
      const d = X[(h + 1) * 2] - X[h * 2];
      dy += d * d; cd++;
      if (h) { const e = X[h * 2 + 1] - X[h * 2 - 1]; sl += e * e; cs++; }
    }
  }
  return { dyadic: dy / cd, slid: sl / cs };
}

// ---- randomly positioned strata: B_H-dagger(t) ----
// Stratum k is a broken line through Poisson instants, b^k of them per unit time on average, with
// independent Gaussian values of standard deviation b^(-Hk) (the amplitude is our choice; the book
// fixes only the rates). Sampled onto a grid of M+1 points over [0, 1].
function strata(H, b, K, seed, M) {
  const rnd = mulberry32(seed), g = gaussOf(rnd), layers = [], sum = new Float64Array(M + 1);
  for (let k = 0; k <= K; k++) {
    const lam = Math.pow(b, k), amp = Math.pow(b, -H * k), S = new Float64Array(M + 1);
    let t1 = Math.log(1 - rnd()) / lam, v1 = amp * g();          // first instant left of 0
    let t2 = t1 - Math.log(1 - rnd()) / lam, v2 = amp * g();
    for (let i = 0; i <= M; i++) {
      const t = i / M;
      while (t2 < t) { t1 = t2; v1 = v2; t2 = t1 - Math.log(1 - rnd()) / lam; v2 = amp * g(); }
      S[i] = v1 + ((v2 - v1) * (t - t1)) / (t2 - t1);
    }
    layers.push(S);
    for (let i = 0; i <= M; i++) sum[i] += S[i];
  }
  const s0 = sum[0];
  for (let i = 0; i <= M; i++) sum[i] -= s0;
  return { layers, sum };
}

// ---- proper crossings of a polyline (self-intersections of the teragon) ----
function crossings(P) {
  const m = P.length / 2 - 1;
  let cell = 0;
  for (let i = 0; i < m; i++) cell = Math.max(cell, Math.abs(P[2 * i + 2] - P[2 * i]), Math.abs(P[2 * i + 3] - P[2 * i + 1]));
  cell = cell || 1;
  const grid = new Map(), key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const boxes = [];
  for (let i = 0; i < m; i++) {
    const x0 = Math.min(P[2 * i], P[2 * i + 2]), x1 = Math.max(P[2 * i], P[2 * i + 2]);
    const y0 = Math.min(P[2 * i + 1], P[2 * i + 3]), y1 = Math.max(P[2 * i + 1], P[2 * i + 3]);
    boxes.push([x0, y0, x1, y1]);
    for (let cx = Math.floor(x0 / cell); cx <= Math.floor(x1 / cell); cx++)
      for (let cy = Math.floor(y0 / cell); cy <= Math.floor(y1 / cell); cy++) {
        const k = `${cx},${cy}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      }
  }
  const seen = new Set();
  let count = 0;
  const seg = (i) => [P[2 * i], P[2 * i + 1], P[2 * i + 2], P[2 * i + 3]];
  const cross = (a, b) => {
    const [ax, ay, bx, by] = seg(a), [cx2, cy2, dx, dy] = seg(b);
    const d1 = (bx - ax) * (cy2 - ay) - (by - ay) * (cx2 - ax), d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    const d3 = (dx - cx2) * (ay - cy2) - (dy - cy2) * (ax - cx2), d4 = (dx - cx2) * (by - cy2) - (dy - cy2) * (bx - cx2);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  for (const list of grid.values())
    for (let a = 0; a < list.length; a++)
      for (let b = a + 1; b < list.length; b++) {
        const i = list[a], j = list[b];
        if (Math.abs(i - j) < 2) continue;
        const id = i < j ? i * m + j : j * m + i;
        if (seen.has(id)) continue;
        const A = boxes[i], B = boxes[j];
        if (A[2] < B[0] || B[2] < A[0] || A[3] < B[1] || B[3] < A[1]) continue;
        seen.add(id);
        if (cross(i, j)) count++;
      }
  return count;
}

// ---- Plate 246 reconstructed: a forest of posts on a trema plain, seen from straight above ----
// Units: the eye stands 1 above the floor and looks straight down; ground lengths are measured so
// that the picture's half-width reaches 1 on the floor. The ground is a grid of `cells` cells
// across the picture, extended to 1.45 half-widths so the rays to the corners stay on it. Round
// tremas follow the rank law of Plates 306-309 (disc p has area C*A/(2p), down to half a cell) and
// are flat pits at height 0. Every other cell carries one thin square post, `w` cells wide, standing
// up to `jit` cells off its cell's centre, of height top * (1 - u^k), u uniform: most posts near the
// top, a few short. Between the posts the plain stands at `plain` and slopes down into each pit
// over `ramp` cells. Trema centres come first from the seed, then the heights, then the offsets,
// so changing the heights never moves a hole. At top = plain the posts are left out: only the pits.
function bugRelief(seed, { cells, C, plain, top, k, w, jit, ramp }) {
  const N = Math.ceil(1.45 * cells), cell = 2 / cells, L = (N * cell) / 2, A = 4 * L * L, rmin = cell / 2;
  const P = Math.floor((C * A) / (2 * Math.PI * rmin * rmin)), tremas = [];
  const rt = mulberry32(seed);
  for (let p = 1; p <= P; p++) tremas.push([L * (2 * rt() - 1), L * (2 * rt() - 1), Math.sqrt((C * A) / (2 * Math.PI * p))]);
  const rh = mulberry32(seed ^ 0x5bd1e995), h = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) h[i] = top > plain + 1e-9 ? top * (1 - Math.pow(rh(), k)) : 0;
  const rj = mulberry32(seed ^ 0x9e3779b9), dx = new Float32Array(N * N), dy = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { dx[i] = (2 * rj() - 1) * jit; dy[i] = (2 * rj() - 1) * jit; }
  const pit = new Uint8Array(N * N);
  for (const [x0, y0, r] of tremas) {
    const i0 = Math.max(0, Math.ceil((x0 - r + L) / cell - 0.5)), i1 = Math.min(N - 1, Math.floor((x0 + r + L) / cell - 0.5));
    const j0 = Math.max(0, Math.ceil((y0 - r + L) / cell - 0.5)), j1 = Math.min(N - 1, Math.floor((y0 + r + L) / cell - 0.5));
    for (let j = j0; j <= j1; j++) {
      const gy = (j + 0.5) * cell - L - y0;
      for (let i = i0; i <= i1; i++) {
        const gx = (i + 0.5) * cell - L - x0;
        if (gx * gx + gy * gy <= r * r) pit[j * N + i] = 1;
      }
    }
  }
  // the plain between the posts, by each cell's distance (centre to centre) from the nearest pit cell
  const plainH = new Float32Array(N * N), reach = Math.ceil(ramp);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const o = j * N + i;
      if (pit[o]) { h[o] = 0; continue; }
      let d2 = Infinity;
      for (let dj = -reach; dj <= reach; dj++)
        for (let di = -reach; di <= reach; di++) {
          const jj = j + dj, ii = i + di;
          if (jj >= 0 && ii >= 0 && jj < N && ii < N && pit[jj * N + ii] && di * di + dj * dj < d2) d2 = di * di + dj * dj;
        }
      plainH[o] = plain * Math.min(1, Math.sqrt(d2) / ramp);
    }
  const half = (N - cells) >> 1;                  // share of the picture's own cells that are pits
  let pits = 0;
  for (let j = half; j < half + cells; j++) for (let i = half; i < half + cells; i++) pits += pit[j * N + i];
  return { h, plainH, dx, dy, N, L, cell, w, top, tremas, pits: pits / (cells * cells), hit: -1 };
}
// What stands at ground point (x, y): the tallest post covering it, else the plain of its cell (0 in
// the pits and beyond the grid). Posts reach into the neighbouring cells, so nine cells are looked
// at. Returns the height and leaves the post's cell in R.hit (-1 when the plain or a floor is seen).
function bugGround(R, x, y) {
  const N = R.N, fx = (x + R.L) / R.cell, fy = (y + R.L) / R.cell, i = Math.floor(fx), j = Math.floor(fy);
  R.hit = -1;
  if (i < 0 || j < 0 || i >= N || j >= N) return 0;
  let z = R.plainH[j * N + i];
  const half = R.w / 2, h = R.h, dx = R.dx, dy = R.dy;
  for (let jj = Math.max(0, j - 1); jj <= Math.min(N - 1, j + 1); jj++)
    for (let ii = Math.max(0, i - 1); ii <= Math.min(N - 1, i + 1); ii++) {
      const o = jj * N + ii;
      if (h[o] > z && Math.abs(fx - ii - 0.5 - dx[o]) < half && Math.abs(fy - jj - 0.5 - dy[o]) < half) { z = h[o]; R.hit = o; }
    }
  return z;
}
// The view from straight above as a polar table: the nearness seen at NQ picture radii (0..qmax)
// on each of NT azimuths, where 0 is the farthest floor in the picture and 1 the top of the tallest
// post under the eye. A ground point at distance rho with height h shows at picture radius
// rho / (1 - h), so along an azimuth the ray to radius q stops at the first point where that ratio
// reaches q: a running maximum taken outward from the centre (nearer, taller things hide what is
// behind them). A post is painted in one grey, by the distance of its top from the eye, including
// its leaning side between samples (the painter's look of the plate); the plain and the pit floors
// are shaded by the distance of the point seen. G is the view half-angle's tangent.
function bugTable(R, G, qmax, NT, NQ, KS) {
  const Z = new Float32Array(NT * NQ), dr = qmax / (KS - 1), dq = qmax / (NQ - 1), G2 = G * G;
  const near = 1 - R.top, far = Math.sqrt(1 + 2 * G2), span = far - near, N = R.N;
  const postGrey = (o) => {
    const cx = ((o % N) + 0.5 + R.dx[o]) * R.cell - R.L, cy = (Math.floor(o / N) + 0.5 + R.dy[o]) * R.cell - R.L;
    return (far - (1 - R.h[o]) * Math.sqrt(1 + G2 * (cx * cx + cy * cy))) / span;
  };
  const floorGrey = (z, q) => (far - (1 - z) * Math.sqrt(1 + G2 * q * q)) / span;
  for (let t = 0; t < NT; t++) {
    const th = ((t + 0.5) * 2 * Math.PI) / NT, c = Math.cos(th), s = Math.sin(th), row = t * NQ;
    let qi = 0, hPrev = bugGround(R, 0, 0), oPrev = R.hit, qPrev = 0, M = 0;
    for (let k = 1; k < KS && qi < NQ; k++) {
      const rho = k * dr, h = bugGround(R, rho * c, rho * s), o = R.hit, q = rho / (1 - h);
      if (q > M) {
        const post = h >= hPrev ? o : oPrev, pg = post >= 0 ? postGrey(post) : 0;   // the taller of the two samples: at a wall, the post
        for (; qi < NQ && qi * dq <= q; qi++) {
          if (post >= 0) Z[row + qi] = pg;
          else {
            const qq = qi * dq, f = q > qPrev ? Math.min(1, Math.max(0, (qq - qPrev) / (q - qPrev))) : 1;
            Z[row + qi] = floorGrey(hPrev + f * (h - hPrev), qq);
          }
        }
        M = q;
      }
      hPrev = h; oPrev = o; qPrev = q;
    }
    for (; qi < NQ; qi++) Z[row + qi] = floorGrey(hPrev, qi * dq);
  }
  return { Z, NT, NQ, qmax };
}
// the nearness seen at picture point (x, y), bilinear in the table
function bugSeen(T, x, y) {
  const q = Math.min(T.NQ - 1.001, (Math.hypot(x, y) / T.qmax) * (T.NQ - 1));
  let a = Math.atan2(y, x); if (a < 0) a += 2 * Math.PI;
  const ft = (a / (2 * Math.PI)) * T.NT - 0.5, t0 = Math.floor(ft), at = ft - t0;
  const ta = ((t0 % T.NT) + T.NT) % T.NT, tb = (ta + 1) % T.NT, q0 = Math.floor(q), aq = q - q0, Z = T.Z;
  const za = Z[ta * T.NQ + q0] * (1 - aq) + Z[ta * T.NQ + q0 + 1] * aq, zb = Z[tb * T.NQ + q0] * (1 - aq) + Z[tb * T.NQ + q0 + 1] * aq;
  return za * (1 - at) + zb * at;
}
// Grey from nearness: t runs from the farthest floor in the picture (0) to the top of the tallest
// post under the eye (1). The curve maps t onto the printed plate's grey levels (0 = darkest ink,
// 1 = paper); it was fitted on the plate's tone distribution, so it is the plate's, not a free
// choice. Half the picture lies above t = 0.9, where the curve climbs steeply, so the knots are
// every 0.1 up to 0.8 and every 0.01 from there.
const BUG_TONE_LO = [0, 0.069, 0.088, 0.097, 0.097, 0.102, 0.102, 0.106, 0.125];
const BUG_TONE_HI = [0.125, 0.125, 0.13, 0.134, 0.139, 0.144, 0.153, 0.162, 0.181, 0.208, 0.25, 0.306, 0.37, 0.44, 0.523, 0.639, 0.722, 0.778, 0.819, 0.866, 1];
function bugGrey(t) {
  t = Math.min(1, Math.max(0, t));
  const K = t < 0.8 ? BUG_TONE_LO : BUG_TONE_HI, u = t < 0.8 ? t * 10 : (t - 0.8) * 100, i = Math.min(K.length - 2, Math.floor(u));
  return K[i] + (u - i) * (K[i + 1] - K[i]);
}
