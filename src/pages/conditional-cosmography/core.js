// Chapter 22 ("Conditional Stationarity and Cosmographic Principles") prints no plates, so this
// page computes the chapter's argument: a random fractal dust seen from an arbitrary origin
// against the same dust seen from one of its own points (the conditional cosmographic principle),
// and the stratification of nonrandom cascades against the every-ratio scaling of random ones.

// deterministic RNG, so the "random" figures draw the same until reseeded
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// a seeded hash per cell, so the cascade is stable while parameters move
function cellHash(seed, depth, ix, iy) {
  let h = (seed ^ (depth * 0x9e3779b9) ^ Math.imul(ix, 0x85ebca6b) ^ Math.imul(iy, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// ---- random curdling on base b = 3: every cell keeps N of its 9 ninths, D = log N / log 3 ----
// Returns the kept depth-K cells as centre points in [0,1]^2 (each of equal mass).
function randomCurds(N, K, seed) {
  const out = [];
  const rec = (x, y, s, depth, ix, iy) => {
    if (depth === K) { out.push(x + s / 2, y + s / 2); return; }
    // choose N of the 9 subcells by a seeded partial Fisher-Yates on this cell's own stream
    const rnd = mulberry32(cellHash(seed, depth, ix, iy));
    const slots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = 0; i < N; i++) {
      const j = i + Math.floor(rnd() * (9 - i));
      const t = slots[i]; slots[i] = slots[j]; slots[j] = t;
      const cx = slots[i] % 3, cy = (slots[i] - cx) / 3;
      rec(x + (cx * s) / 3, y + (cy * s) / 3, s / 3, depth + 1, ix * 3 + cx, iy * 3 + cy);
    }
  };
  rec(0, 0, 1, 0, 0, 0);
  return Float64Array.from(out);
}

// ---- the Fournier quincunx (chapter 9): 5 dots, one central and four on the diagonals at
// distance d = (1 - 1/rho) from the centre, repeated to depth K at ratio 1/rho ----
function fournierDust(rho, K) {
  let pts = [[0.5, 0.5]];
  const d = 0.5 * (1 - 1 / rho);
  for (let k = 0; k < K; k++) {
    const next = [];
    const u = Math.SQRT1_2 * d * Math.pow(1 / rho, k);
    for (const [x, y] of pts) next.push([x, y], [x + u, y + u], [x - u, y + u], [x + u, y - u], [x - u, y - u]);
    pts = next;
  }
  const out = new Float64Array(2 * pts.length);
  pts.forEach(([x, y], i) => { out[2 * i] = x; out[2 * i + 1] = y; });
  return out;
}

// mass within distance R of the origin (counts points; all points carry equal mass)
function massWithin(pts, ox, oy, R) {
  const R2 = R * R;
  let n = 0;
  for (let i = 0; i < pts.length; i += 2) {
    const dx = pts[i] - ox, dy = pts[i + 1] - oy;
    if (dx * dx + dy * dy <= R2) n++;
  }
  return n;
}
// M(R) sampled at logarithmic radii from a set of origins; returns the mean count per origin
function massCurve(pts, origins, Rs) {
  const out = new Float64Array(Rs.length);
  for (const [ox, oy] of origins) for (let i = 0; i < Rs.length; i++) out[i] += massWithin(pts, ox, oy, Rs[i]);
  for (let i = 0; i < Rs.length; i++) out[i] /= origins.length;
  return out;
}
// origins: material points are dust points themselves; arbitrary points are uniform in the square
function materialOrigins(pts, count, seed) {
  const rnd = mulberry32(seed * 31337 + 5), out = [];
  const n = pts.length / 2;
  for (let i = 0; i < count; i++) { const j = Math.floor(rnd() * n); out.push([pts[2 * j], pts[2 * j + 1]]); }
  return out;
}
function arbitraryOrigins(count, seed) {
  const rnd = mulberry32(seed * 31337 + 6), out = [];
  for (let i = 0; i < count; i++) out.push([0.05 + 0.9 * rnd(), 0.05 + 0.9 * rnd()]);
  return out;
}
// share of arbitrary origins whose ball of radius R is empty
function emptyShare(pts, origins, R) {
  let e = 0;
  for (const [ox, oy] of origins) if (massWithin(pts, ox, oy, R) === 0) e++;
  return e / origins.length;
}

// ---- a small chart in screen space ----
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const supNum = (n) => String(n).replace(/\d/g, (d) => SUPS[+d]);
const decadeLabel = (e) => `10${e < 0 ? '⁻' : ''}${supNum(Math.abs(e))}`;
function chart(f, o) {
  const c = f.ctx, ml = o.ml ?? 58, mr = o.mr ?? 16, mt = o.mt ?? 14, mb = o.mb ?? 36;
  const iw = Math.max(1, f.w - ml - mr), ih = Math.max(1, f.h - mt - mb);
  const tx = (u) => (o.x.log ? Math.log10(u) : u), ty = (v) => (o.y.log ? Math.log10(v) : v);
  const x0 = tx(o.x.min), x1 = tx(o.x.max), y0 = ty(o.y.min), y1 = ty(o.y.max);
  const X = (u) => ml + ((tx(u) - x0) / (x1 - x0)) * iw;
  const Y = (v) => mt + ih - ((ty(v) - y0) / (y1 - y0)) * ih;
  c.font = '500 10.5px "IBM Plex Mono", monospace';
  const grid = (t0, t1, log, vert) => {
    const ticks = [];
    if (log) {
      const step = t1 - t0 > 9 ? 2 : 1;
      for (let e = Math.ceil(t0 - 1e-9); e <= Math.floor(t1 + 1e-9); e++) if (e % step === 0) ticks.push([e, decadeLabel(e)]);
    } else {
      const span = t1 - t0, step = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100].find((s) => span / s <= 8) || 1000;
      for (let v = Math.ceil(t0 / step) * step; v <= t1 + 1e-9; v += step) ticks.push([v, String(Math.round(v * 100) / 100)]);
    }
    for (const [v, label] of ticks) {
      const p = (v - t0) / (t1 - t0);
      c.strokeStyle = '#dddbd2'; c.lineWidth = 1; c.beginPath();
      if (vert) {
        const x = ml + p * iw;
        c.moveTo(x, mt); c.lineTo(x, mt + ih); c.stroke();
        c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(label, x, mt + ih + 6);
      } else {
        const y = mt + ih - p * ih;
        c.moveTo(ml, y); c.lineTo(ml + iw, y); c.stroke();
        c.fillStyle = PRINT.muted; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(label, ml - 6, y);
      }
    }
  };
  grid(x0, x1, o.x.log, true);
  grid(y0, y1, o.y.log, false);
  c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, mt, iw, ih);
  c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(o.x.label, ml + iw / 2, f.h - 16);
  c.save(); c.translate(15, mt + ih / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText(o.y.label, 0, 0); c.restore();
  return { X, Y, ml, mr, mt, mb, iw, ih,
    clip: () => { c.save(); c.beginPath(); c.rect(ml, mt, iw, ih); c.clip(); },
    unclip: () => c.restore() };
}
