// Chapter 36 geometry: the spin automaton of the figure on page 329 (Pascal's triangle mod 2),
// the Sierpinski gasket it converges to, downsized random walks, the self-avoiding walk by the
// pivot algorithm, and a Leopold & Langbein style river network grown from loop-erased walks.
//
// The printed figure's grid, measured from the scan at 600 dpi: with u the half-column spacing
// (symbols within a row sit every 2u), the row pitch is 1.664u; the plus glyph is 0.80u wide and
// 0.78u tall, the minus 0.70u wide with a 0.10u stroke.
const SPIN_PITCH = 1.664, PLUS_W = 0.80, PLUS_H = 0.78, MINUS_W = 0.70, GLYPH_T = 0.105;

// S(t, n) = +1 iff S(t−1, n−1) ≠ S(t−1, n+1): the set of +1 spins evolves by symmetric
// difference of its two shifts. Rows as sets of positions n (parity of n equals parity of t).
function spinRows(T) {
  const rows = [new Set([0])];
  for (let t = 1; t < T; t++) {
    const prev = rows[t - 1], next = new Set();
    for (const n of prev) for (const m of [n - 1, n + 1]) { if (next.has(m)) next.delete(m); else next.add(m); }
    rows.push(next);
  }
  return rows;
}
const popcount = (t) => { let c = 0; while (t) { c += t & 1; t >>= 1; } return c; };

// the gasket the downsized automaton converges to, as triangles at a given depth, in the
// automaton's frame: apex (0, 0), base corners (−1, −1) and (1, −1) (t drawn downward as −y)
function gasketTris(depth) {
  const out = [];
  (function rec(ax, ay, bx, by, cx, cy, d) {
    if (!d) { out.push([ax, ay, bx, by, cx, cy]); return; }
    const ab = [(ax + bx) / 2, (ay + by) / 2], ac = [(ax + cx) / 2, (ay + cy) / 2], bc = [(bx + cx) / 2, (by + cy) / 2];
    rec(ax, ay, ab[0], ab[1], ac[0], ac[1], d - 1);
    rec(ab[0], ab[1], bx, by, bc[0], bc[1], d - 1);
    rec(ac[0], ac[1], bc[0], bc[1], cx, cy, d - 1);
  })(0, 0, -1, -1, 1, -1, depth);
  return out;
}

// ---- seeded randomness (mulberry32), so every random figure can be reproduced ----
function rng32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a random walk on the square lattice, downsized to approximate Brownian motion on [0, 1]:
// 4^k steps of length 2^−k. Returns the trail as a polyline.
function downsizedWalk(k, seed) {
  const N = Math.pow(4, k), h = Math.pow(2, -k), rnd = rng32(seed), P = new Float64Array(2 * N + 2);
  let x = 0, y = 0;
  for (let i = 1; i <= N; i++) {
    const d = Math.floor(rnd() * 4);
    x += [h, -h, 0, 0][d]; y += [0, 0, h, -h][d];
    P[2 * i] = x; P[2 * i + 1] = y;
  }
  return P;
}

// how far the curve P strays from the curve Q: max over P's vertices of the distance to Q's
// segments (one-sided Hausdorff distance, enough to show settling against wandering)
function strayFrom(P, Q, sample = 512) {
  const m = Q.length / 2 - 1;
  let worst = 0;
  // an odd step, so the samples don't land only on the previous stage's own vertices
  // (a Koch stage keeps every 4th vertex from the stage before)
  const step = Math.max(1, Math.floor(P.length / 2 / sample)) | 1;
  for (let i = 0; i < P.length / 2; i += step) {
    const x = P[2 * i], y = P[2 * i + 1];
    let best = Infinity;
    for (let j = 0; j < m; j++) {
      const ax = Q[2 * j], ay = Q[2 * j + 1], bx = Q[2 * j + 2], by = Q[2 * j + 3];
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const t = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
      const ex = x - ax - t * dx, ey = y - ay - t * dy, d2 = ex * ex + ey * ey;
      if (d2 < best) best = d2;
    }
    worst = Math.max(worst, best);
  }
  return Math.sqrt(worst);
}

// ---- the self-avoiding walk, sampled by the pivot algorithm ----
// Start from a straight rod; repeatedly pick a pivot site and a random lattice symmetry, apply
// it to the walk's shorter arm, and accept when the result is self-avoiding. The seven
// non-identity symmetries of the square lattice, as [m0, m1, m2, m3]:
const LATTICE_SYM = [[0, -1, 1, 0], [0, 1, -1, 0], [-1, 0, 0, -1], [1, 0, 0, -1], [-1, 0, 0, 1], [0, -1, -1, 0], [0, 1, 1, 0]];
function sarwStart(n) {
  const X = new Int32Array(n + 1), Y = new Int32Array(n + 1);
  for (let i = 0; i <= n; i++) X[i] = i;
  return { X, Y, n };
}
function sarwPivot(w, attempts, rnd) {
  const { X, Y, n } = w, key = (x, y) => (x + 32768) * 65536 + (y + 32768);
  let accepted = 0;
  for (let a = 0; a < attempts; a++) {
    const p = 1 + Math.floor(rnd() * (n - 1));
    const [m0, m1, m2, m3] = LATTICE_SYM[Math.floor(rnd() * 7)];
    const px = X[p], py = Y[p], occ = new Set(), nx = [], ny = [];
    const tail = n - p <= p;                     // transform the shorter arm
    const i0 = tail ? p + 1 : p - 1, di = tail ? 1 : -1, iEnd = tail ? n + 1 : -1;
    for (let i = tail ? 0 : p; i !== (tail ? p + 1 : n + 1); i++) occ.add(key(X[i], Y[i]));
    let ok = true;
    for (let i = i0; i !== iEnd; i += di) {
      const dx = X[i] - px, dy = Y[i] - py;
      const tx = px + m0 * dx + m1 * dy, ty = py + m2 * dx + m3 * dy, k = key(tx, ty);
      if (occ.has(k)) { ok = false; break; }
      occ.add(k); nx.push(tx); ny.push(ty);
    }
    if (ok) { for (let i = i0, j = 0; i !== iEnd; i += di, j++) { X[i] = nx[j]; Y[i] = ny[j]; } accepted++; }
  }
  return accepted;
}
const sarwR = (w) => Math.hypot(w.X[w.n] - w.X[0], w.Y[w.n] - w.Y[0]);

// ---- a river network in the spirit of Leopold & Langbein 1962 ----
// Sources are picked at random; each stream is a random walk into adjacent squares that ends by
// leaving the grid or joining an earlier stream. The book's walks are self-avoiding, with
// "various rather arbitrary decisions" against loops and snags; here a loop is simply erased as
// it closes (a loop-erased walk), the one rule that never snags. parent[i] is the cell the water
// of cell i flows into (−1: off the grid).
function riverNetwork(G, seed) {
  const rnd = rng32(seed), parent = new Int32Array(G * G).fill(-2), exit = new Int8Array(G * G).fill(-1);
  const order = Array.from({ length: G * G }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (const s of order) {
    if (parent[s] !== -2) continue;
    const path = [s], at = new Map([[s, 0]]);
    let x = s % G, y = (s / G) | 0;
    for (;;) {
      const d = Math.floor(rnd() * 4), nx = x + [1, -1, 0, 0][d], ny = y + [0, 0, 1, -1][d];
      if (nx < 0 || ny < 0 || nx >= G || ny >= G) {       // leaves the grid: an outlet
        for (let i = 0; i < path.length; i++) parent[path[i]] = i + 1 < path.length ? path[i + 1] : -1;
        exit[path[path.length - 1]] = d;
        break;
      }
      const c = ny * G + nx;
      if (parent[c] !== -2) {                             // joins an earlier stream
        for (let i = 0; i < path.length; i++) parent[path[i]] = i + 1 < path.length ? path[i + 1] : c;
        break;
      }
      if (at.has(c)) {                                    // the walk closed a loop: erase it
        const cut = at.get(c);
        for (let i = cut + 1; i < path.length; i++) at.delete(path[i]);
        path.length = cut + 1;
      } else { path.push(c); at.set(c, path.length - 1); }
      x = c % G; y = (c / G) | 0;
    }
  }
  // drainage area and longest upstream stream length of every cell, leaves up
  const area = new Float64Array(G * G).fill(1), len = new Float64Array(G * G);
  const kids = Array.from({ length: G * G }, () => []), roots = [];
  for (let i = 0; i < G * G; i++) { if (parent[i] >= 0) kids[parent[i]].push(i); else roots.push(i); }
  const post = [], stack = [...roots];
  while (stack.length) { const v = stack.pop(); post.push(v); for (const k of kids[v]) stack.push(k); }
  for (let i = post.length - 1; i >= 0; i--) {
    const v = post[i];
    for (const k of kids[v]) { area[v] += area[k]; len[v] = Math.max(len[v], len[k]); }
    len[v] += 1;
  }
  return { G, parent, exit, area, len, roots };
}
// Hack's relation fitted over the network's cells: slope of log(length) against log(area)
function hackFit(net, minArea = 8) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
  for (let i = 0; i < net.area.length; i++) {
    if (net.area[i] < minArea) continue;
    const u = Math.log(net.area[i]), v = Math.log(net.len[i]);
    sx += u; sy += v; sxx += u * u; sxy += u * v; m++;
  }
  return { slope: (m * sxy - sx * sy) / (m * sxx - sx * sx), cells: m };
}
// the longest river: from the cell of greatest upstream length at an outlet, follow max-length
// children upstream
function longestRiver(net) {
  const { parent, len } = net;
  const children = net._kids || (net._kids = (() => {
    const k = Array.from({ length: parent.length }, () => []);
    for (let i = 0; i < parent.length; i++) if (parent[i] >= 0) k[parent[i]].push(i);
    return k;
  })());
  let best = -1;
  for (const r of net.roots) if (best < 0 || len[r] > len[best]) best = r;
  const path = [];
  let v = best;
  for (;;) {
    path.push(v);
    const up = children[v];
    if (!up.length) break;
    v = up.reduce((a, b) => (len[a] >= len[b] ? a : b));
  }
  return path.reverse();                                  // source first, outlet last
}
