// Shared geometry library: similarity maps, decorated generators and their cascades, tree
// cascades, rounding arcs and the similarity-dimension solver. Conventions are in DECISIONS.md:
// a generator is a list of points on [0, 1] plus a code per interval (bit 0: mirror the copy,
// bit 1: place it from the interval's far end, which also reverses its traversal).
const R3 = Math.sqrt(3);
// ---- similarity maps z -> A·z + B or A·conj(z) + B, as [ar, ai, br, bi, m] ----
const C = {
  mul: (ar, ai, br, bi) => [ar * br - ai * bi, ar * bi + ai * br],
  comp(f, g) {                       // f∘g
    const [a1r, a1i, b1r, b1i, m1] = f, [a2r, a2i0, b2r, b2i0, m2] = g;
    const a2i = m1 ? -a2i0 : a2i0, b2i = m1 ? -b2i0 : b2i0;
    const [ar, ai] = C.mul(a1r, a1i, a2r, a2i), [tr, ti] = C.mul(a1r, a1i, b2r, b2i);
    return [ar, ai, tr + b1r, ti + b1i, m1 ^ m2];
  },
  app(f, x, y) { const [ar, ai, br, bi, m] = f, yy = m ? -y : y; return [ar * x - ai * yy + br, ar * yy + ai * x + bi]; },
};
const ID = [1, 0, 0, 0, 0];
// A decorated generator is a list of children [map, rev]: the curve on [0,1] is the concatenation of the curves
// map(curve), each run backwards when rev = 1. Built from the generator's points and per-interval codes
// (bit 0: mirror; bit 1: run the interval backwards, i.e. place the generator on it from its far end).
function genFromCodes(P, codes) {
  return codes.map((c, k) => {
    const rv = c >> 1, m = c & 1;
    const [ax, ay] = rv ? P[k + 1] : P[k], [bx, by] = rv ? P[k] : P[k + 1];
    return [[bx - ax, by - ay, ax, ay, m], rv];
  });
}
const MX = [-1, 0, 1, 0, 1];                    // z -> 1 − conj z: mirror in the line x = 1/2
const mirrorGen = (G) => G.slice().reverse().map(([f, r]) => [C.comp(MX, f), r ^ 1]);
function substituteLeg(G, leg, H) {
  const [f, r] = G[leg], sub = (r ? H.slice().reverse() : H).map(([g, s]) => [C.comp(f, g), r ^ s]);
  return G.slice(0, leg).concat(sub, G.slice(leg + 1));
}
const normaliseGen = (G) => G.map(([f, r]) => (r ? [C.comp(f, MX), 0] : [f, 0]));
// leaves of the cascade, in the order the curve runs through them: [map, rev]
function leaves(gens) {
  const out = [];
  const rec = (f, rev, d) => {
    if (d === gens.length) { out.push([f, rev]); return; }
    const kids = gens[d];
    if (rev) for (let k = kids.length - 1; k >= 0; k--) rec(C.comp(f, kids[k][0]), rev ^ kids[k][1], d + 1);
    else for (let k = 0; k < kids.length; k++) rec(C.comp(f, kids[k][0]), rev ^ kids[k][1], d + 1);
  };
  rec(ID, 0, 0);
  return out;
}
function curveOf(gens) {
  const L = leaves(gens), P = new Float64Array(2 * L.length + 2);
  P[0] = 0; P[1] = 0;
  L.forEach(([f, rev], i) => { const [x, y] = C.app(f, rev ? 0 : 1, 0); P[2 * i + 2] = x; P[2 * i + 3] = y; });
  return P;
}

// a 60° arc from a to b bulging to `side` (+1: left of a→b), sampled at n+1 points (a included, b excluded)
function arcPts(ax, ay, bx, by, side, n, out) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), mx = (ax + bx) / 2, my = (ay + by) / 2;
  const cx = mx + dy * side * (R3 / 2), cy = my - dx * side * (R3 / 2);       // centre on the other side
  const a0 = Math.atan2(ay - cy, ax - cx);
  let da = Math.atan2(by - cy, bx - cx) - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  for (let t = 0; t < n; t++) { const a = a0 + (da * t) / n; out.push(cx + L * Math.cos(a), cy + L * Math.sin(a)); }
}

// ---- tree cascades: every link is replaced by the tree generator placed on it ----
// links: [[px,py,qx,qy],...] in the generator's frame; codes as above (bit 0 mirror, bit 1 placed from the far
// end). `level` counts how many times a link's ancestry left the generator's main channel (`main` marks it).
function treeCascade(links, codes, main, n) {
  const G = links.map(([px, py, qx, qy], k) => {
    const c = codes[k], [ax, ay, bx, by] = c & 2 ? [qx, qy, px, py] : [px, py, qx, qy];
    return [bx - ax, by - ay, ax, ay, c & 1];
  });
  let maps = [[ID, 0]];
  for (let s = 0; s < n; s++) {
    const out = [];
    for (const [f, lv] of maps) for (let k = 0; k < G.length; k++) out.push([C.comp(f, G[k]), lv + (main[k] ? 0 : 1)]);
    maps = out;
  }
  return maps.map(([f, lv]) => [f[2], f[3], f[0] + f[2], f[1] + f[3], lv]);
}
// erase the streams near the sources: links on a chain from a source (an end point other than 0 and 1) up to the
// first junction
function clipSources(segs, rounds = 1) {
  let cur = segs;
  const q = (v) => Math.round(v * 1e7);
  for (let r = 0; r < rounds; r++) {
    const deg = new Map(), K = (x, y) => q(x) + ',' + q(y);
    for (const s of cur) for (const k of [K(s[0], s[1]), K(s[2], s[3])]) deg.set(k, (deg.get(k) || 0) + 1);
    const keep = (x, y) => (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) || (Math.abs(x - 1) < 1e-9 && Math.abs(y) < 1e-9);
    // walk each chain inward from a source
    const adj = new Map();
    cur.forEach((s, i) => { for (const k of [K(s[0], s[1]), K(s[2], s[3])]) { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(i); } });
    const dead = new Set();
    for (const [k, d] of deg) {
      if (d !== 1) continue;
      const [x, y] = k.split(',').map((v) => Number(v) / 1e7);
      if (keep(x, y)) continue;
      let at = k, prev = -1;
      for (let guard = 0; guard < 1e6; guard++) {
        const nxt = adj.get(at).filter((i) => i !== prev && !dead.has(i));
        if (nxt.length !== 1) break;
        const i = nxt[0]; dead.add(i); prev = i;
        const s = cur[i], k1 = K(s[0], s[1]), k2 = K(s[2], s[3]); at = k1 === at ? k2 : k1;
        const [x2, y2] = at.split(',').map((v) => Number(v) / 1e7);
        if (deg.get(at) !== 2 || keep(x2, y2)) break;
      }
    }
    cur = cur.filter((_, i) => !dead.has(i));
  }
  return cur;
}

// the dimension D: the unique real root of G(D) = Σ r_m^D = 1 (G is strictly decreasing)
function dimension(rs) {
  let lo = 0.01, hi = 8;
  for (let i = 0; i < 90; i++) { const mid = (lo + hi) / 2, g = rs.reduce((s, r) => s + Math.pow(r, mid), 0); if (g > 1) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
