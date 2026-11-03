// Chapter 15 ("Surfaces with Positive Volume, and Flesh") prints no plates, so everything on this
// page computes the chapter's constructions: Cantor dusts whose trema ratios shrink fast enough to
// leave positive measure, the drifting formal dimension D_k, a curve of positive area by wedge
// removal, and the arteries-and-veins section of flesh.

// trema ratios: lambda_k = l1 * q^(k-1). Sum finite exactly when q < 1, and then the remaining
// measure prod(1 - lambda_k) stays positive. q = 1 is Cantor's constant-ratio case, measure 0.
const lam = (l1, q, k) => Math.min(0.95, l1 * Math.pow(q, k - 1));
// remaining fraction after K stages (per-stage factor 1 - lambda_k, in any dimension: the plane
// construction removes a cross of relative area lambda_k, so the same product applies)
function remaining(l1, q, K) {
  let p = 1;
  for (let k = 1; k <= K; k++) p *= 1 - lam(l1, q, k);
  return p;
}
// the limit (converged numerically; past lambda_k < 1e-12 the factors are 1 to double precision)
function remainingLimit(l1, q) {
  let p = 1;
  for (let k = 1; k <= 4000; k++) {
    const l = lam(l1, q, k);
    if (l < 1e-13) break;
    p *= 1 - l;
  }
  return q >= 1 ? 0 : p;
}
// the linear dust's intervals after K stages: each stage bisects every interval by a centred
// trema of ratio lambda_k, leaving two pieces of ratio r_k = (1 - lambda_k)/2 each
function fatDustIntervals(l1, q, K) {
  let cur = [[0, 1]];
  for (let k = 1; k <= K; k++) {
    const l = lam(l1, q, k), next = [];
    for (const [a, b] of cur) {
      const w = (b - a) * (1 - l) / 2;
      next.push([a, a + w], [b - w, b]);
    }
    cur = next;
  }
  return cur;
}
const formalDim = (l1, q, k) => Math.log(2) / Math.log(2 / (1 - lam(l1, q, k)));

// ---- a curve of positive area, by wedge removal (Knopp's scheme) ----
// A stage-k triangle carries the curve from e to x past the apex v. Remove the wedge (p, v, q),
// where p and q sit on e-x around its midpoint with |pq| = lambda_k |ex|; the children
// (e, p-as-apex, exit v) and (v, q-as-apex, exit x) partition the rest, so the area multiplies
// by exactly 1 - lambda_k per stage. lambda_k -> 0 fast enough leaves a curve of positive area.
function knoppTriangles(l1, q, K) {
  // triangle = [ex, ey, vx, vy, xx, xy]: entry, apex, exit
  let cur = [[0, 0, 0.5, 0.75, 1, 0]];
  for (let k = 1; k <= K; k++) {
    const l = lam(l1, q, k), next = [];
    for (const [ex, ey, vx, vy, xx, xy] of cur) {
      const mx = (ex + xx) / 2, my = (ey + xy) / 2, dx = (xx - ex) / 2, dy = (xy - ey) / 2;
      const px = mx - l * dx, py = my - l * dy, qx = mx + l * dx, qy = my + l * dy;
      next.push([ex, ey, px, py, vx, vy], [vx, vy, qx, qy, xx, xy]);
    }
    cur = next;
  }
  return cur;
}

// ---- the plane dust and the flesh section: cut a cross from every square ----
// A square of side s loses a centred cross of width u_k * s (relative area lambda_k = 1 - (1-u_k)^2),
// leaving four corner squares of side s(1 - u_k)/2. Stages alternate artery and vein.
const crossWidth = (l1, q, k) => 1 - Math.sqrt(1 - lam(l1, q, k));
// returns { squares: [x, y, s] at depth K, crosses: [x, y, s, u, k] one per cut square }
function crossDust(l1, q, K) {
  let cur = [[0, 0, 1]];
  const crosses = [];
  for (let k = 1; k <= K; k++) {
    const u = crossWidth(l1, q, k), next = [];
    for (const [x, y, s] of cur) {
      crosses.push([x, y, s, u, k]);
      const w = s * (1 - u) / 2, g = s - w;
      next.push([x, y, w], [x + g, y, w], [x, y + g, w], [x + g, y + g, w]);
    }
    cur = next;
  }
  return { squares: cur, crosses };
}

// ---- a small chart in screen space (same conventions as the site's other chart pages) ----
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
