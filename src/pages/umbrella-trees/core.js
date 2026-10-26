// Plate 155: fractal umbrella trees. A tree is two branch systems from a bare apex:
// each segment carries two children at the same inter-branch angle THETA, lengths
// scaled by a fixed r. The plate's five trees use round angles with r set exactly at
// the self-contact threshold (see DECISIONS.md). The threshold is computed here, not
// hardcoded: a tree first touches itself where its extremal branch tip reaches the
// axis of symmetry between two sibling subtrees, and that sup is found by value
// iteration over the branch direction.
const DEG = Math.PI / 180;
const LN2 = Math.LN2;
const dimOf = (r) => LN2 / Math.log(1 / r);

// ---- segments of the V-tree ----
// apex (x0,y0), axis direction phi (radians, y up), first branches of length L at
// phi ± theta/2; children at parent direction ± theta/2, length × r.
function treeSegs(theta, r, L, x0, y0, phi, depth) {
  const segs = [];
  const stack = [[x0, y0, phi - theta / 2, L, 1], [x0, y0, phi + theta / 2, L, 1]];
  while (stack.length) {
    const [x, y, a, l, d] = stack.pop();
    const x1 = x + l * Math.cos(a), y1 = y + l * Math.sin(a);
    segs.push([x, y, x1, y1, d]);
    if (d < depth) {
      stack.push([x1, y1, a - theta / 2, l * r, d + 1]);
      stack.push([x1, y1, a + theta / 2, l * r, d + 1]);
    }
  }
  return segs;
}
// branch tips only: the endpoints at the deepest level
function treeTips(theta, r, L, x0, y0, phi, depth) {
  const tips = new Float64Array(2 << depth);     // 2^depth points × 2 coords
  let k = 0;
  const rec = (x, y, a, l, d) => {
    const x1 = x + l * Math.cos(a), y1 = y + l * Math.sin(a);
    if (d === depth) { tips[k++] = x1; tips[k++] = y1; return; }
    rec(x1, y1, a - theta / 2, l * r, d + 1);
    rec(x1, y1, a + theta / 2, l * r, d + 1);
  };
  rec(x0, y0, phi - theta / 2, L, 1);
  rec(x0, y0, phi + theta / 2, L, 1);
  return tips;
}

// ---- the self-contact threshold ----
// Work in the frame of one node: the axis along +x, the subtree whose first branch
// leaves at −theta/2 (the negative-y side). Self-avoidance fails as soon as some
// point of that subtree crosses y = 0, because the sibling subtree is its mirror
// image there (and every ancestor stem lies on such an axis). g(α) is the sup of the
// y-gain of a unit subtree whose first branch leaves at angle α-ish choices; value
// iteration converges since every further level is scaled by r < 1.
const CRIT_N = 512;
function supAxis(r, theta, g) {
  const h = theta / 2, n = CRIT_N, tau = 2 * Math.PI;
  const sinT = new Float64Array(n);
  for (let i = 0; i < n; i++) sinT[i] = Math.sin((i / n) * tau);
  const at = (f, a) => {
    let x = (a % tau) / tau * n; if (x < 0) x += n;
    const i0 = Math.floor(x) % n, i1 = (i0 + 1) % n, t = x - Math.floor(x);
    return f[i0] * (1 - t) + f[i1] * t;
  };
  const tmp = new Float64Array(n);
  const hi = (h / tau) * n;                       // grid offset of ± theta/2
  for (let it = 0; it < 220; it++) {
    let dmax = 0;
    for (let i = 0; i < n; i++) {
      let best = -Infinity;
      for (const s of [-hi, hi]) {
        let x = (i + s) % n; if (x < 0) x += n;
        const i0 = Math.floor(x) % n, i1 = (i0 + 1) % n, t = x - Math.floor(x);
        const sv = sinT[i0] * (1 - t) + sinT[i1] * t;
        const gv = g[i0] * (1 - t) + g[i1] * t;
        const v = sv + Math.max(0, r * gv);
        if (v > best) best = v;
      }
      tmp[i] = best;
      const d = Math.abs(best - g[i]);
      if (d > dmax) dmax = d;
    }
    g.set(tmp);
    if (dmax < 1e-10) break;
  }
  return Math.sin(-h) + Math.max(0, r * at(g, -h));
}
// r at the threshold for a given inter-branch angle, warm-startable
const critCache = new Map();
function rCrit(thetaDeg) {
  const key = Math.round(thetaDeg * 20);
  if (critCache.has(key)) return critCache.get(key);
  const th = key / 20 * DEG;
  const g = new Float64Array(CRIT_N);
  let lo = 0.36, hi = 0.78;
  // seed from the nearest cached angle to shrink the bracket
  let near = null, nd = Infinity;
  for (const [k, v] of critCache) { const d = Math.abs(k - key); if (d < nd) { nd = d; near = v; } }
  if (near !== null && nd <= 100) { lo = Math.max(0.36, near - 0.004 * (nd / 20) - 0.004); hi = Math.min(0.78, near + 0.004 * (nd / 20) + 0.004); }
  if (supAxis(lo, th, g) > 0 || supAxis(hi, th, g.fill(0)) < 0) { lo = 0.36; hi = 0.78; }
  g.fill(0);
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (supAxis(mid, th, g) > 0) hi = mid; else lo = mid;
  }
  const r = (lo + hi) / 2;
  critCache.set(key, r);
  return r;
}

// ---- Plate 155 as printed ----
// Apex positions and sizes fitted to the 600 dpi scan (page coords / 4379, y up);
// angles and r are exact. depth is the printed recursion depth, read off the scan.
const PAGE_H = 5105 / 4379;
const PLATE = [
  { id: 'p20', theta: 20, x: 0.12576, y: 0.85910, L: 0.12992, phi: 90 * DEG, depth: 10, label: 'top left' },
  { id: 'p36', theta: 36, x: 0.37308, y: 0.77609, L: 0.13364, phi: 90 * DEG, depth: 10, label: 'top middle' },
  { id: 'p60', theta: 60, x: 0.73841, y: 0.65407, L: 0.14150, phi: 90 * DEG, depth: 9, label: 'top right' },
  { id: 'p150', theta: 150, x: 0.20059, y: 0.36527, L: 0.14346, phi: 0, depth: 9, label: 'bottom left' },
  { id: 'p200', theta: 200, x: 0.73489, y: 0.32688, L: 0.16766, phi: 0, depth: 11, label: 'bottom right' },
];
