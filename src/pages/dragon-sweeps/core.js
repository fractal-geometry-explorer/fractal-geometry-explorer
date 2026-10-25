// CORE START
const DEG = 180 / Math.PI;
// ---- Peano's later square sweep and its unequal-leg cousin (Plates 66 and 67) ----
// Every interval carries a type: 0 = S (it owns the region on its side: a square, or a right trapezoid when the
// legs are unequal), 1 = R and 2 = Q (the two halves of an S one stage later). s = +1 when that region is on the
// left of the interval, -1 when on the right. S -> R Q, R -> S(-s) S(s), Q -> S(s) S(-s); in an S interval the
// generator is run backwards, so that its short leg comes first.
function sweep(phiDeg, n) {
  const a = phiDeg / DEG, ax = Math.cos(a) * Math.cos(a), ay = Math.cos(a) * Math.sin(a);
  let P = new Float64Array([0, 0, 1, 0]), T = new Uint8Array([0]), S = new Int8Array([1]);
  const apex = (i, P, T, S) => {
    const px = P[2 * i], py = P[2 * i + 1], dx = P[2 * i + 2] - px, dy = P[2 * i + 3] - py;
    let gx = ax, gy = ay * S[i];
    if (T[i] === 0) { gx = 1 - gx; }             // run backwards: 1 - conj(A), conj flips again for s
    return [px + dx * gx - dy * gy, py + dx * gy + dy * gx];
  };
  for (let k = 0; k < n; k++) {
    const m = T.length, P2 = new Float64Array(4 * m + 2), T2 = new Uint8Array(2 * m), S2 = new Int8Array(2 * m);
    for (let i = 0; i < m; i++) {
      const [cx, cy] = apex(i, P, T, S), s = S[i];
      P2[4 * i] = P[2 * i]; P2[4 * i + 1] = P[2 * i + 1]; P2[4 * i + 2] = cx; P2[4 * i + 3] = cy;
      if (T[i] === 0) { T2[2 * i] = 1; T2[2 * i + 1] = 2; S2[2 * i] = s; S2[2 * i + 1] = s; }
      else if (T[i] === 1) { S2[2 * i] = -s; S2[2 * i + 1] = s; }
      else { S2[2 * i] = s; S2[2 * i + 1] = -s; }
    }
    P2[4 * m] = P[2 * m]; P2[4 * m + 1] = P[2 * m + 1];
    P = P2; T = T2; S = S2;
  }
  const m = T.length, F = new Float64Array(2 * m);
  for (let i = 0; i < m; i++) { const [x, y] = apex(i, P, T, S); F[2 * i] = x; F[2 * i + 1] = y; }
  return { P, T, S, F, m, phi: phiDeg };
}
// the region owned by S interval i: the right trapezoid (0,0) (1,0) (1, cot φ) (0, tan φ) in the interval's frame
function ownedTrapezoid(d, i) {
  const a = d.phi / DEG, t = Math.tan(a), ct = 1 / t, P = d.P, s = d.S[i];
  const px = P[2 * i], py = P[2 * i + 1], dx = P[2 * i + 2] - px, dy = P[2 * i + 3] - py;
  const out = [];
  for (const [u, v0] of [[0, 0], [1, 0], [1, ct], [0, t]]) { const v = v0 * s; out.push(px + dx * u - dy * v, py + dy * u + dx * v); }
  return out;
}
// Strands pulled a little into their own regions so that retraced edges and touching corners come apart;
// an immediate backtrack becomes a narrow V with its tip on the grid point (as in the book's panels).
function processedSweep(d, delta) {
  const P = d.P, m = d.m, out = new Float64Array(2 * m + 2);
  const off = (i) => { const dx = P[2 * i + 2] - P[2 * i], dy = P[2 * i + 3] - P[2 * i + 1], s = d.S[i] * delta; return [-dy * s, dx * s]; };
  let o1 = off(0);
  out[0] = P[0] + o1[0]; out[1] = P[1] + o1[1];
  for (let i = 0; i + 1 < m; i++) {
    const o2 = off(i + 1), bx = P[2 * i + 2], by = P[2 * i + 3];
    const ux = bx - P[2 * i], uy = by - P[2 * i + 1], vx = P[2 * i + 4] - bx, vy = P[2 * i + 5] - by;
    const cr = ux * vy - uy * vx, dt = ux * vx + uy * vy, L = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let x = bx, y = by;
    if (Math.abs(cr) < 1e-9 * L) {
      if (dt > 0) { x += (o1[0] + o2[0]) / 2; y += (o1[1] + o2[1]) / 2; }
    } else { x += o1[0] + o2[0]; y += o1[1] + o2[1]; }
    out[2 * i + 2] = x; out[2 * i + 3] = y; o1 = o2;
  }
  out[2 * m] = P[2 * m] + o1[0]; out[2 * m + 1] = P[2 * m + 1] + o1[1];
  return out;
}
// Hilbert's curve, cell d of a 2^k × 2^k grid (the usual d2xy)
function hilbertXY(N, d) {
  let x = 0, y = 0, t = d;
  for (let s = 1; s < N; s *= 2) {
    const rx = 1 & (t >> 1), ry = 1 & (t ^ rx);
    if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const tmp = x; x = y; y = tmp; }
    x += s * rx; y += s * ry; t >>= 2;
  }
  return [x, y];
}

// ---- dragons: x[k] = 1 puts the k-th stage's first generator to the right of the teragon, 0 to the left ----
function dragon(xs, n, ax, ay, bx, by) {
  let P = new Float64Array([ax, ay, bx, by]);
  for (let k = 0; k < n; k++) {
    const m = P.length / 2 - 1, Q = new Float64Array(4 * m + 2), first = xs[k] ? 1 : -1;
    for (let i = 0; i < m; i++) {
      const px = P[2 * i], py = P[2 * i + 1], dx = P[2 * i + 2] - px, dy = P[2 * i + 3] - py;
      const r = (i % 2 === 0 ? first : -first);      // +1: right of the direction of travel
      Q[4 * i] = px; Q[4 * i + 1] = py;
      Q[4 * i + 2] = px + (dx + r * dy) / 2; Q[4 * i + 3] = py + (dy - r * dx) / 2;
    }
    Q[4 * m] = P[2 * m]; Q[4 * m + 1] = P[2 * m + 1];
    P = Q;
  }
  return P;
}

// ---- twindragon, in Knuth's base β = −1 + i: T = { Σ d_k β^−k : d_k ∈ {0, 1} } ----
// The page draws T in the frame where it is the union of the dragons on [0,1] and [1,0]: z = (w_y + 0.6, w_x + 0.2).
const TW = {
  toPage: (wx, wy) => [wy + 0.6, wx + 0.2],
  toT: (x, y) => [y - 0.2, x - 0.6],
  // the six corners where three tiles meet, in order around T
  corners: [[0.4, 0.2], [0.2, 0.6], [-0.6, 0.2], [-0.8, -0.4], [-0.6, -0.8], [0.2, -0.4]],
};
// the skin: a Koch curve on each side with the generator 0 → (¼,−¼) → (¾,¼) → 1, all pieces as drawn
const SKIN_G = [[0, 0], [0.25, -0.25], [0.75, 0.25], [1, 0]];
function skinCurve(ax, ay, bx, by, n, out) {
  if (n === 0) { out.push(bx, by); return; }
  const dx = bx - ax, dy = by - ay;
  let px = ax, py = ay;
  for (let k = 1; k < 4; k++) {
    const [u, v] = SKIN_G[k], qx = ax + dx * u - dy * v, qy = ay + dy * u + dx * v;
    skinCurve(px, py, qx, qy, n - 1, out); px = qx; py = qy;
  }
}
// address of a point, by Knuth's radix: round β^M·w to a Gaussian integer Z, expand Z in base β with digits
// {0, 1}; the digits below β^M are w's first fraction digits, those above its integer part (empty: w is in T)
function twinDigits(wx, wy, depth) {
  const M = Math.min(62, depth + 46);
  let x = wx, y = wy;
  for (let k = 0; k < M; k++) { const nx = -x - y, ny = x - y; x = nx; y = ny; }   // multiply by β = −1 + i
  let a = Math.round(x), b = Math.round(y);
  const e = [];
  for (let guard = 0; (a !== 0 || b !== 0) && guard < 200; guard++) {
    const d = ((a + b) % 2 + 2) % 2; e.push(d);
    const a1 = a - d; [a, b] = [(-a1 + b) / 2, (-a1 - b) / 2];               // (Z − d) / β
  }
  while (e.length < M) e.push(0);
  let s = '';
  for (let k = 1; k <= depth; k++) s += e[M - k];
  return { I: e.slice(M).reverse().join('').replace(/^0+/, ''), d: s };
}
// ---- exact numbers in base β = −1 + i: Gaussian rationals (a + b i)/q with BigInt parts ----
const GQ = {
  gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; },
  norm([a, b, q]) { if (q < 0n) { a = -a; b = -b; q = -q; } const g = GQ.gcd(GQ.gcd(a, b), q) || 1n; return [a / g, b / g, q / g]; },
  add(x, y) { return GQ.norm([x[0] * y[2] + y[0] * x[2], x[1] * y[2] + y[1] * x[2], x[2] * y[2]]); },
  sub(x, y) { return GQ.add(x, [-y[0], -y[1], y[2]]); },
  mul(x, y) { return GQ.norm([x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0], x[2] * y[2]]); },
  div(x, y) { const n = y[0] * y[0] + y[1] * y[1]; return GQ.norm([(x[0] * y[0] + x[1] * y[1]) * y[2], (x[1] * y[0] - x[0] * y[1]) * y[2], x[2] * n]); },
  num(x) { return [Number(x[0]) / Number(x[2]), Number(x[1]) / Number(x[2])]; },
};
const BETA = [-1n, 1n, 1n], BINV = [-1n, -1n, 2n], ONEQ = [1n, 0n, 1n], ZEROQ = [0n, 0n, 1n];
// "11.0(001)": integer digits, then fraction digits, with an optional repeating block in parentheses
function parseBase(str) {
  const s = str.replace(/\s+/g, '').replace(/,/g, '.');
  const m = /^([01]*)(?:\.([01]*)(?:\(([01]+)\))?)?$/.exec(s);
  if (!m || (!m[1] && m[2] === undefined)) return null;
  const I = m[1] || '', pre = m[2] || '', per = m[3] || '';
  let v = ZEROQ;
  for (const ch of I) v = GQ.add(GQ.mul(v, BETA), [BigInt(ch), 0n, 1n]);
  let p = ONEQ;
  for (const ch of pre) { p = GQ.mul(p, BINV); if (ch === '1') v = GQ.add(v, p); }
  if (per && /1/.test(per)) {
    let r = ONEQ, blk = ZEROQ;
    for (const ch of per) { r = GQ.mul(r, BINV); if (ch === '1') blk = GQ.add(blk, r); }
    v = GQ.add(v, GQ.div(GQ.mul(p, blk), GQ.sub(ONEQ, r)));
  }
  return { I, pre, per, value: v };
}
// a Gaussian integer's digits in base β (every Gaussian integer has exactly one finite expansion)
function intDigits(a, b) {
  let s = '';
  for (let guard = 0; (a !== 0n || b !== 0n) && guard < 400; guard++) {
    const d = (((a + b) % 2n) + 2n) % 2n; s = String(d) + s;
    const a1 = a - d; [a, b] = [(-a1 + b) / 2n, (-a1 - b) / 2n];
  }
  return s;
}
// Every expansion of the number w = (a + b i)/q. Try each integer part g whose tile T + g can hold w; the
// fraction f = w − g must then be 0.d₁d₂… with β·f − d₁ again a fraction, and so on forever. The states
// stay inside a disc around T and all have denominator q, so there are finitely many of them: keep the
// states from which an endless path exists, and read off each path once it starts to repeat.
function expansionsOf(w, maxStates = 60000) {
  const [wx, wy] = GQ.num(w), q = w[2], out = [];
  const R = 0.9 + 1e-9, cx = -0.2, cy = -0.1, inDisc = (A, B) => Math.hypot(Number(A) / Number(q) - cx, Number(B) / Number(q) - cy) <= R;
  for (let m = Math.floor(wx - cx - R); m <= Math.ceil(wx - cx + R); m++) {
    for (let n = Math.floor(wy - cy - R); n <= Math.ceil(wy - cy + R); n++) {
      const A0 = w[0] - BigInt(m) * q, B0 = w[1] - BigInt(n) * q;
      if (!inDisc(A0, B0)) continue;
      const key = (A, B) => A + ',' + B, succ = new Map(), queue = [[A0, B0]];
      succ.set(key(A0, B0), null);
      let overflow = false;
      for (let h = 0; h < queue.length; h++) {
        const [A, B] = queue[h], nx = [];
        for (const d of [0n, 1n]) {
          const A2 = -A - B - d * q, B2 = A - B;
          if (!inDisc(A2, B2)) continue;
          const k2 = key(A2, B2); nx.push([d, k2]);
          if (!succ.has(k2)) { succ.set(k2, null); queue.push([A2, B2]); }
        }
        succ.set(key(A, B), nx);
        if (succ.size > maxStates) { overflow = true; break; }
      }
      if (overflow) continue;
      // keep only states with an endless continuation
      const alive = new Set(succ.keys());
      for (let changed = true; changed;) {
        changed = false;
        for (const k of alive) if (!(succ.get(k) || []).some(([, k2]) => alive.has(k2))) { alive.delete(k); changed = true; }
      }
      const k0 = key(A0, B0);
      if (!alive.has(k0)) continue;
      const I = intDigits(BigInt(m), BigInt(n));
      const walk = (k, path, digits) => {
        if (out.length > 8) return;
        const at = path.indexOf(k);
        if (at >= 0) { out.push({ I, pre: digits.slice(0, at), per: digits.slice(at), m, n }); return; }
        for (const [d, k2] of succ.get(k)) if (alive.has(k2)) walk(k2, path.concat([k]), digits + d);
      };
      walk(k0, [], '');
    }
  }
  return out;
}
// tidy form: drop a repeating block of zeros, and the trailing zeros before it
function formatExpansion(e) {
  let pre = e.pre, per = e.per;
  if (/^0+$/.test(per)) { per = ''; pre = pre.replace(/0+$/, ''); }
  return (e.I || '0') + (pre || per ? '.' + pre + (per ? '(' + per + ')' : '') : '');
}
const expandFrac = (pre, per, n) => { let s = pre; while (s.length < n) s += per || '0'; return s.slice(0, n); };

// The river tree. Run the twindragon's closed curve (the dragons on [0,1] and back on [1,0]) at stage n and round
// its corners. At each grid point it visits twice, the two turns cut off two opposite corners, and the other two
// grid squares meet through the point. The squares inside the curve, joined that way, form a tree: the river.
function riverTree(n) {
  const xs = new Array(n).fill(1);
  const A = dragon(xs, n, 0, 0, 1, 0), B = dragon(xs, n, 1, 0, 0, 0);
  const m = A.length / 2 - 1, L = 2 * m;                 // closed curve with L steps
  const ux = A[2] - A[0], uy = A[3] - A[1], u2 = ux * ux + uy * uy;
  const G = new Int32Array(2 * L);
  for (let i = 0; i < L; i++) {
    const x = i <= m ? A[2 * i] : B[2 * (i - m)], y = i <= m ? A[2 * i + 1] : B[2 * (i - m) + 1];
    G[2 * i] = Math.round((x * ux + y * uy) / u2); G[2 * i + 1] = Math.round((y * ux - x * uy) / u2);
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < L; i++) { x0 = Math.min(x0, G[2 * i]); x1 = Math.max(x1, G[2 * i]); y0 = Math.min(y0, G[2 * i + 1]); y1 = Math.max(y1, G[2 * i + 1]); }
  const W = x1 - x0 + 2, H = y1 - y0 + 2, gx = (i) => G[2 * (i % L)] - x0 + 1, gy = (i) => G[2 * (i % L) + 1] - y0 + 1;
  // winding number of each grid square (i, j) = [i, i+1] × [j, j+1]
  const wind = new Int32Array(W * H);
  for (let i = 0; i < L; i++) {
    const ax = gx(i), ay = gy(i), bx = gx(i + 1), by = gy(i + 1);
    if (ax === bx) { const j = Math.min(ay, by), s = by > ay ? 1 : -1; wind[j * W + ax] += s; }
  }
  for (let j = 0; j < H; j++) for (let i = 1; i < W; i++) wind[j * W + i] += wind[j * W + i - 1];
  const inside = (i, j) => i >= 0 && j >= 0 && i < W && j < H && wind[j * W + i] !== 0;
  // turns at each grid point: the quadrant each pass cuts off
  const cuts = new Map();
  for (let i = 0; i < L; i++) {
    const vx = gx(i + 1), vy = gy(i + 1);
    const qx = (gx(i) - vx) + (gx(i + 2) - vx), qy = (gy(i) - vy) + (gy(i + 2) - vy);   // −e_in + e_out
    const k = vy * (W + 1) + vx;
    if (!cuts.has(k)) cuts.set(k, []);
    cuts.get(k).push(qx, qy);
  }
  const adj = new Map(), cell = (vx, vy, dx, dy) => [vx + (dx > 0 ? 0 : -1), vy + (dy > 0 ? 0 : -1)];
  const link = (a, b) => {
    if (!inside(a[0], a[1]) || !inside(b[0], b[1])) return;
    const ka = a[1] * W + a[0], kb = b[1] * W + b[0];
    if (!adj.has(ka)) adj.set(ka, new Set()); if (!adj.has(kb)) adj.set(kb, new Set());
    adj.get(ka).add(kb); adj.get(kb).add(ka);
  };
  for (const [k, c] of cuts) {
    if (c.length !== 4) continue;
    const vx = k % (W + 1), vy = Math.floor(k / (W + 1));
    const free = [[1, 1], [-1, 1], [-1, -1], [1, -1]].filter(([dx, dy]) => !((c[0] === dx && c[1] === dy) || (c[2] === dx && c[3] === dy)));
    if (free.length === 2) link(cell(vx, vy, ...free[0]), cell(vx, vy, ...free[1]));
  }
  // back to the plane: square (i, j) has its centre at origin + (i − 1 + x0 + ½)·u + (j − 1 + y0 + ½)·u⊥
  const toXY = (key) => { const i = key % W, j = Math.floor(key / W), a = i - 1 + x0 + 0.5, b = j - 1 + y0 + 0.5; return [a * ux - b * uy, a * uy + b * ux]; };
  return { adj, toXY, nodes: adj.size };
}
// erase the streams near the sources: strip the tree's leaves, `times` times over
function pruneTree(adj, times) {
  const g = new Map([...adj].map(([k, s]) => [k, new Set(s)]));
  for (let t = 0; t < times; t++) {
    const leaves = [...g].filter(([, s]) => s.size <= 1).map(([k]) => k);
    for (const k of leaves) { for (const o of g.get(k)) g.get(o).delete(k); g.delete(k); }
  }
  return g;
}
// CORE END
