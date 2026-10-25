const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const core = s.slice(s.indexOf('// CORE START'), s.indexOf('// CORE END'));
eval(core.replace(/^(const|let) /gm, 'var ') + ';globalThis.cesaroTime=cesaroTime;');
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
function hilbertIndex(x, y, order = 16) {
  const n = 1 << order; let X = Math.min(n - 1, Math.floor(x * n)), Y = Math.min(n - 1, Math.floor(y * n)), d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (X & s) > 0 ? 1 : 0, ry = (Y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { X = s - 1 - X; Y = s - 1 - Y; } const t = X; X = Y; Y = t; }
  }
  return d;
}
const dist = (P, i, j) => Math.hypot(P[2 * i] - P[2 * j], P[2 * i + 1] - P[2 * j + 1]);
const tourLen = (P, T) => { let L = 0; for (let i = 0; i < T.length; i++) L += dist(P, T[i], T[(i + 1) % T.length]); return L; };
// neighbour lists by grid
function neighbours(P, n, K) {
  const g = Math.ceil(Math.sqrt(n / 2)), cells = new Map();
  for (let i = 0; i < n; i++) { const k = Math.min(g - 1, Math.floor(P[2 * i] * g)) * g + Math.min(g - 1, Math.floor(P[2 * i + 1] * g)); (cells.get(k) || cells.set(k, []).get(k)).push(i); }
  const NB = [];
  for (let i = 0; i < n; i++) {
    const cx = Math.min(g - 1, Math.floor(P[2 * i] * g)), cy = Math.min(g - 1, Math.floor(P[2 * i + 1] * g)); let cand = [];
    for (let r = 1; cand.length < K + 1 && r < g + 2; r++) { cand = []; for (let a = cx - r; a <= cx + r; a++) for (let b = cy - r; b <= cy + r; b++) { const c = cells.get(a * g + b); if (a >= 0 && b >= 0 && a < g && b < g && c) cand.push(...c); } }
    cand = cand.filter((j) => j !== i).sort((a, b) => dist(P, i, a) - dist(P, i, b)).slice(0, K); NB.push(cand);
  }
  return NB;
}
// 2-opt + Or-opt with neighbour lists (array tour with position index); repeat until no improvement
function improve(P, T0, NB) {
  const n = T0.length, T = T0.slice(), pos = new Int32Array(n);
  const setPos = () => { for (let i = 0; i < n; i++) pos[T[i]] = i; };
  const rev = (i, j) => { while (i < j) { const t = T[i]; T[i] = T[j]; T[j] = t; pos[T[i]] = i; pos[T[j]] = j; i++; j--; } };
  setPos();
  let improved = true, rounds = 0;
  while (improved && rounds < 60) {
    improved = false; rounds++;
    for (let i = 0; i < n; i++) {
      // 2-opt: edge (a, an) with (c, cn), c a neighbour of a
      const a = T[i], an = T[(i + 1) % n];
      for (const c of NB[a]) {
        const j = pos[c], cn = T[(j + 1) % n];
        if (c === an || cn === a) continue;
        const d = dist(P, a, c) + dist(P, an, cn) - dist(P, a, an) - dist(P, c, cn);
        if (d < -1e-12) { let x = (i + 1) % n, y = j; if (x > y) { const lo = (j + 1) % n, hi = i; if (lo <= hi) rev(lo, hi); } else rev(x, y); improved = true; break; }
      }
    }
    // Or-opt: move segments of length 1..3 next to a neighbour
    for (let L = 1; L <= 3; L++) for (let i = 0; i < n; i++) {
      const s0 = i, s1 = (i + L - 1) % n, prev = T[(s0 - 1 + n) % n], next = T[(s1 + 1) % n], A = T[s0], B = T[s1];
      if (L >= n - 2) continue;
      const removeGain = dist(P, prev, A) + dist(P, B, next) - dist(P, prev, next);
      for (const c of NB[A]) {
        const pc = pos[c]; let inSeg = false; for (let k = 0; k < L; k++) if (T[(s0 + k) % n] === c) inSeg = true;
        if (inSeg) continue;
        const cn = T[(pc + 1) % n]; let segHit = false; for (let k = 0; k < L; k++) if (T[(s0 + k) % n] === cn) segHit = true;
        if (segHit) continue;
        // insert reversed or not between c and cn
        const add1 = dist(P, c, A) + dist(P, B, cn) - dist(P, c, cn), add2 = dist(P, c, B) + dist(P, A, cn) - dist(P, c, cn);
        const add = Math.min(add1, add2);
        if (add - removeGain < -1e-12) {
          const seg = []; for (let k = 0; k < L; k++) seg.push(T[(s0 + k) % n]);
          if (add2 < add1) seg.reverse();
          const rest = []; for (let k = 0; k < n; k++) { const v = T[(s1 + 1 + k) % n]; if (k < n - L) rest.push(v); }
          const out = []; for (const v of rest) { out.push(v); if (v === c) out.push(...seg); }
          for (let k = 0; k < n; k++) T[k] = out[k]; setPos(); improved = true; break;
        }
      }
    }
  }
  return T;
}
function experiment(name, P, n) {
  const ids = [...Array(n).keys()];
  const ces = ids.slice().sort((a, b) => cesaroTime([P[2 * a], P[2 * a + 1]]) - cesaroTime([P[2 * b], P[2 * b + 1]]));
  const hil = ids.slice().sort((a, b) => hilbertIndex(P[2 * a], P[2 * a + 1]) - hilbertIndex(P[2 * b], P[2 * b + 1]));
  const NB = neighbours(P, n, 10);
  const best = improve(P, improve(P, hil, NB), NB);
  const ref = tourLen(P, best);
  const Lc = tourLen(P, ces), Lh = tourLen(P, hil);
  const cesImp = tourLen(P, improve(P, ces, NB));
  console.log(`${name.padEnd(26)} n=${String(n).padStart(5)} | reference ${ref.toFixed(2)} (${(ref / Math.sqrt(n)).toFixed(3)}·√n) | Cesàro order +${((Lc / ref - 1) * 100).toFixed(1)}% | Hilbert order +${((Lh / ref - 1) * 100).toFixed(1)}% | Cesàro then local search +${((cesImp / ref - 1) * 100).toFixed(1)}%`);
}
for (const n of [100, 1000, 5000]) {
  for (let rep = 0; rep < (n === 5000 ? 1 : 3); rep++) {
    const P = new Float64Array(2 * n); for (let i = 0; i < 2 * n; i++) P[i] = rnd();
    experiment(`uniform random #${rep + 1}`, P, n);
  }
}
for (const n of [1000]) {
  const P = new Float64Array(2 * n), C = []; for (let k = 0; k < 12; k++) C.push([0.1 + 0.8 * rnd(), 0.1 + 0.8 * rnd()]);
  for (let i = 0; i < n; i++) { const c = C[i % 12]; P[2 * i] = Math.min(0.9999, Math.max(0, c[0] + 0.03 * gauss())); P[2 * i + 1] = Math.min(0.9999, Math.max(0, c[1] + 0.03 * gauss())); }
  experiment('12 clusters', P, n);
}
