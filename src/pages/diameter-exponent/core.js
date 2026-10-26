// Chapter 17: trees with thick stems. Geometry for the three figures:
// the diameter-exponent diagram, the recursive bronchi (Plates 164-165)
// and the triangle-thickened umbrella trees (Plate 163).

// ---------- recursive bronchi (Plates 164 and 165) ----------
// A branch is a rectangle: length ell, width c·ell, pointing along an axis.
// At its far end two daughters leave at right angles, lengths r1·ell (the
// "long" side s1) and r2·ell. Their centre lines sit back from the end face:
// the short daughter by half its width, the long daughter by its full width,
// so the parent's tip shows past the crossing, as in the plates. The long
// daughter's subtree flips which side its own long daughter takes; the short
// daughter keeps its parent's side. All of this was read off the scans
// (see DECISIONS.md).
function bronchiRects(p) {
  // p: { r1, r2, c, q, qR, o1, o2, stages, dir0, chir1, chir2, up }
  const rects = [];
  const o1 = p.o1 === undefined ? 1 : p.o1, o2 = p.o2 === undefined ? 0.5 : p.o2;
  const rec = (x, y, dx, dy, ell, chir, k, c, q) => {
    const w = c * ell;
    rects.push([x, y, dx, dy, ell, w]);
    if (k >= p.stages || ell < 1e-5) return;
    const ex = x + dx * ell, ey = y + dy * ell;
    // left of travel in y-up coordinates
    const lx = -dy, ly = dx;
    const s1 = chir > 0 ? [lx, ly] : [-lx, -ly];
    const s2 = chir > 0 ? [-lx, -ly] : [lx, ly];
    const cn = c * q;
    const w1 = cn * p.r1 * ell, w2 = cn * p.r2 * ell;
    rec(ex - dx * o1 * w1, ey - dy * o1 * w1, s1[0], s1[1], p.r1 * ell, -chir, k + 1, cn, q);
    rec(ex - dx * o2 * w2, ey - dy * o2 * w2, s2[0], s2[1], p.r2 * ell, chir, k + 1, cn, q);
  };
  const dir = p.up ? [0, 1] : [0, -1];
  if (p.split) {
    // Plate 164's composite: trunk drawn alone, the two halves with their own
    // width-decay factors q (left faster), both at the trunk's bud
    const [dx, dy] = dir;
    rects.push([0, 0, dx, dy, 1, p.cT || p.c]);
    const ex = dx, ey = dy;
    const lx = -dy, ly = dx; // left of travel
    const w1 = p.c * p.r1, w2 = p.c * p.r2;
    // west arm gets r1 (the long one), east arm r2, as fitted to Plate 164
    const west = p.up ? [lx, ly] : [-lx, -ly];
    const east = p.up ? [-lx, -ly] : [lx, ly];
    rec(ex - dx * o1 * w1, ey - dy * o1 * w1, west[0], west[1], p.r1, p.chir1, 1, p.c, p.q);
    rec(ex - dx * o2 * w2, ey - dy * o2 * w2, east[0], east[1], p.r2, p.chir2, 1, p.c, p.qR);
  } else {
    rec(0, 0, dir[0], dir[1], 1, p.chir1 === undefined ? -1 : p.chir1, 0, p.c, p.q === undefined ? 1 : p.q);
  }
  return rects;
}
function bronchiPaths(rects, minW) {
  return chunked(rects.length, (path, i) => {
    const [x, y, dx, dy, ell, w0] = rects[i];
    const w = Math.max(w0, minW || 0);
    const h = w / 2, px = -dy * h, py = dx * h;
    // extend half a width behind the start so joints show no gaps
    const ax = x - dx * h, ay = y - dy * h, bx = x + dx * ell, by = y + dy * ell;
    path.moveTo(ax - px, ay - py); path.lineTo(ax + px, ay + py);
    path.lineTo(bx + px, by + py); path.lineTo(bx - px, by - py);
  }, 1024);
}
function bronchiBBox(rects) {
  const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const [x, y, dx, dy, ell, w] of rects) {
    for (const [px, py] of [[x, y], [x + dx * ell, y + dy * ell]]) {
      bb.x0 = Math.min(bb.x0, px - w); bb.x1 = Math.max(bb.x1, px + w);
      bb.y0 = Math.min(bb.y0, py - w); bb.y1 = Math.max(bb.y1, py + w);
    }
  }
  return bb;
}

// ---------- umbrella trees with triangular stems (Plate 163) ----------
// The largest branch ratio r that keeps the stick tree with inter-branch
// angle θ self-avoiding, computed offline by bisection on segment crossings
// over the whole tree to stage 10 (see DECISIONS.md). Grid over θ in degrees.
const RCRIT_TABLE = { th0: 15, dth: 5, r: [
  0.5064, 0.5094, 0.5134, 0.5184, 0.5235, 0.5284, 0.5348, 0.5405, 0.5470, 0.5548,
  0.5596, 0.5653, 0.5716, 0.5787, 0.5865, 0.5952, 0.5987, 0.6025, 0.6065, 0.6109,
  0.6155, 0.6204,
] };
function rCrit(theta) {
  const t = RCRIT_TABLE, d = theta * 180 / Math.PI;
  const i = Math.max(0, Math.min(t.r.length - 2, Math.floor((d - t.th0) / t.dth)));
  const f = Math.max(0, Math.min(1, (d - (t.th0 + i * t.dth)) / t.dth));
  return t.r[i] + (t.r[i + 1] - t.r[i]) * f;
}
// The umbrella tree is a V: two sticks of length 1 from the root, the angle θ
// between them, and from then on every stick forks into two daughters at the
// same angle θ, their lengths scaled by r (the first forks by h·r — the plates
// shrink the first canopy level a little; see DECISIONS.md). Each stick
// carries an isosceles triangle on EACH side, with the stick as a side and
// angles θ/2 at the root, π−θ at the tip. Around every fork the six corners
// then sum to exactly 360°, which is why the printed figures are solid.
// `trim` pulls one of the two triangles slightly off its stick, the plate's
// "trimmed slightly on one side".
function umbrella(r, th, h, stages, trim) {
  const sticks = [], tris = [];
  const ct = Math.cos(th / 2), st = Math.sin(th / 2);
  const dart = (ax, ay, dx, dy, ell) => {
    const bx = ax + dx * ell, by = ay + dy * ell;
    for (const side of [1, -1]) {
      const rx = dx * ct - side * dy * st, ry = dy * ct + side * dx * st;
      const cx = ax + 2 * ell * ct * rx, cy = ay + 2 * ell * ct * ry;
      if (trim && side === -1) {
        const e = 0.045 * ell, nx = dy * e, ny = -dx * e; // shift off the stick
        tris.push(ax + nx, ay + ny, bx + nx, by + ny, cx, cy);
      } else tris.push(ax, ay, bx, by, cx, cy);
    }
  };
  const rec = (ax, ay, dx, dy, ell, k) => {
    sticks.push(ax, ay, ax + dx * ell, ay + dy * ell);
    dart(ax, ay, dx, dy, ell);
    if (k >= stages || ell < 6e-4) return;
    const bx = ax + dx * ell, by = ay + dy * ell;
    for (const s of [1, -1]) {
      const ndx = dx * ct - s * dy * st, ndy = dy * ct + s * dx * st;
      rec(bx, by, ndx, ndy, ell * r, k + 1);
    }
  };
  for (const s of [1, -1]) {
    const dx = -s * st, dy = ct; // the V's legs at ±θ/2 from vertical
    sticks.push(0, 0, dx, dy);
    dart(0, 0, dx, dy, 1);
    for (const s2 of [1, -1]) {
      const ndx = dx * ct - s2 * dy * st, ndy = dy * ct + s2 * dx * st;
      rec(dx, dy, ndx, ndy, h * r, 1);
    }
  }
  return { sticks, tris, theta: th, r };
}
function triPaths(tris) {
  return chunked(tris.length / 6, (p, i) => {
    const t = tris, j = 6 * i;
    p.moveTo(t[j], t[j + 1]); p.lineTo(t[j + 2], t[j + 3]); p.lineTo(t[j + 4], t[j + 5]);
  }, 2048);
}

// ---------- the diameter-exponent diagram ----------
// A schematic vessel tree: symmetric bifurcation, daughter diameter
// d·2^(−1/Δ), daughter length ∝ diameter, a fixed spread. Purely a diagram.
function vesselTree(delta, stages) {
  const k = Math.pow(2, -1 / delta);
  const segs = [];
  const rec = (x, y, ang, ell, d, n) => {
    const bx = x + ell * Math.sin(ang), by = y + ell * Math.cos(ang);
    segs.push([x, y, bx, by, d]);
    if (n >= stages) return;
    const spread = 0.38 + 0.1 * Math.sin(n * 2.4);
    rec(bx, by, ang + spread, ell * k, d * k, n + 1);
    rec(bx, by, ang - spread * 0.92, ell * k, d * k, n + 1);
  };
  rec(0, 0, 0, 1, 0.14, 0);
  return segs;
}
