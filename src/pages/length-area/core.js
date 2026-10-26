// Chapter 12: length-area-volume relations. Data and geometry for the page.

// ---- Plate 115: Lovejoy's perimeter-area graph, digitised from the scan ----
// Each row is [log10(area in km²), log10(perimeter in km), kind], kind 0 = cloud (open circle),
// kind 1 = rain area (filled dot). 71 points were read off the 600 dpi scan; centres are good to
// about 2 px ≈ 0.006 of a decade. The printed fitted line is logP = 0.678·logA + 0.555.
const P115 = [
  [0.007, 0.616, 1], [0.302, 0.769, 1], [0.609, 1.015, 1], [0.705, 0.964, 1], [0.789, 1.213, 1], [0.913, 1.162, 1],
  [1.09, 1.306, 1], [1.385, 1.372, 1], [1.421, 1.66, 1], [1.613, 1.771, 0], [1.767, 1.837, 1], [1.896, 1.894, 0],
  [2.01, 1.996, 0], [2.08, 1.99, 0], [2.2, 2.11, 0], [2.218, 2.005, 1], [2.296, 2.143, 0], [2.35, 2.191, 0],
  [2.384, 2.26, 1], [2.477, 2.281, 0], [2.534, 2.251, 1], [2.573, 2.368, 0], [2.72, 2.482, 1], [2.913, 2.629, 0],
  [2.931, 2.557, 0], [3.009, 2.716, 0], [3.045, 2.521, 0], [3.081, 2.617, 1], [3.216, 2.677, 0], [3.223, 2.476, 0],
  [3.295, 2.788, 0], [3.346, 2.914, 0], [3.406, 2.785, 0], [3.556, 2.959, 0], [3.65, 3.118, 1], [3.662, 2.911, 0],
  [3.725, 3.046, 0], [3.764, 3.184, 0], [3.767, 3.31, 0], [3.83, 3.193, 0], [3.881, 3.217, 0], [3.947, 3.067, 0],
  [4.002, 3.352, 0], [4.056, 3.232, 0], [4.116, 3.07, 0], [4.236, 3.37, 0], [4.263, 3.535, 0], [4.498, 3.628, 0],
  [4.513, 3.556, 0], [4.546, 3.592, 0], [4.573, 3.466, 0], [4.573, 3.733, 0], [4.678, 3.586, 0], [4.729, 3.664, 0],
  [4.829, 3.802, 0], [4.919, 3.82, 0], [4.967, 3.967, 0], [4.976, 4.099, 0], [5.138, 3.877, 0], [5.165, 3.931, 0],
  [5.262, 4.09, 0], [5.301, 4.162, 0], [5.301, 4.327, 0], [5.355, 4.261, 0], [5.418, 4.174, 0], [5.466, 4.381, 0],
  [5.607, 4.486, 0], [5.716, 4.516, 0], [5.812, 4.402, 0], [5.872, 4.702, 0], [6.077, 4.903, 0]];
const PRINTED_LINE = { slope: 0.678, b: 0.555 };

function leastSquares(rows) {
  const n = rows.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of rows) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - slope * sx) / n;
  let ss = 0;
  for (const [x, y] of rows) { const r = y - (slope * x + b); ss += r * r; }
  return { slope, b, rms: Math.sqrt(ss / n), n };
}

// ---- island coastlines, as teragons on closed initiators ----
// Triadic Koch island: 4 pieces of 1/3, D = log 4/log 3. Quadric island of Plate 51: 8 pieces of 1/4
// on the square lattice, D = 3/2. Both from the shared cascade; the circle is the standard shape.
const KOCH_GEN = genFromCodes([[0, 0], [1 / 3, 0], [1 / 2, R3 / 6], [2 / 3, 0], [1, 0]], [0, 0, 0, 0]);
const QUAD_GEN = genFromCodes([[0, 0], [1 / 4, 0], [1 / 4, 1 / 4], [1 / 2, 1 / 4], [1 / 2, 0], [1 / 2, -1 / 4], [3 / 4, -1 / 4], [3 / 4, 0], [1, 0]], [0, 0, 0, 0, 0, 0, 0, 0]);
const SHAPES = {
  koch: { name: 'Koch island', D: Math.log(4) / Math.log(3), r: 1 / 3, maxN: 7, gen: KOCH_GEN,
    // clockwise, so the bumps (left of each side) point outward
    sides: [[0, 0], [0.5, R3 / 2], [1, 0]] },
  quad: { name: 'Quadric island', D: 1.5, r: 1 / 4, maxN: 6, gen: QUAD_GEN,
    sides: [[0, 0], [0, 1], [1, 1], [1, 0]] },
  circle: { name: 'Circle', D: 1, r: 1, maxN: 0, gen: null, sides: null },
};
// closed teragon of a shape at linear scale s (base of side = s), as a Float64Array of x,y
const teragonCache = {};
function islandTeragon(shape, n) {
  const key = `${shape}|${n}`;
  if (teragonCache[key]) return teragonCache[key];
  let P;
  if (shape === 'circle') {
    const m = 720;
    P = new Float64Array(2 * m);
    for (let i = 0; i < m; i++) { const a = (2 * Math.PI * i) / m; P[2 * i] = 0.5 + 0.5 * Math.cos(a); P[2 * i + 1] = R3 / 6 + 0.5 * Math.sin(a); }
  } else {
    const S = SHAPES[shape], side = curveOf(Array.from({ length: n }, () => S.gen)), m = side.length / 2 - 1, V = S.sides;
    P = new Float64Array(2 * m * V.length);
    for (let v = 0; v < V.length; v++) {
      const [ax, ay] = V[v], [bx, by] = V[(v + 1) % V.length], ur = bx - ax, ui = by - ay;
      for (let i = 0; i < m; i++) {
        const x = side[2 * i], y = side[2 * i + 1];
        P[2 * (v * m + i)] = ax + ur * x - ui * y;
        P[2 * (v * m + i) + 1] = ay + ui * x + ur * y;
      }
    }
  }
  return (teragonCache[key] = P);
}
function shoelace(P) {
  let a = 0;
  const n = P.length / 2;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += P[2 * i] * P[2 * j + 1] - P[2 * j] * P[2 * i + 1]; }
  return Math.abs(a) / 2;
}
// stage fine enough that the teragon's edges are far shorter than the yardstick
function stageFor(shape, scale, G) {
  const S = SHAPES[shape];
  if (shape === 'circle') return 0;
  let n = Math.ceil(Math.log((4 * scale) / G) / Math.log(1 / S.r));
  return Math.max(2, Math.min(S.maxN, n));
}

// ---- the divider walk: approximate a closed coastline by a polygon of side G ----
// From an anchor, march along the teragon to the first point at chord distance G, plant the next
// vertex there, and repeat until the walk returns to the start. The leftover closing chord counts
// as a fraction of a step. Returns the polygon (for drawing) and the fractional step count.
function dividerWalk(P, G, scale, ox, oy) {
  const n = P.length / 2, G2 = G * G;
  const X = (i) => P[2 * (i % n)] * scale + ox, Y = (i) => P[2 * (i % n) + 1] * scale + oy;
  let ax = X(0), ay = Y(0), i = 0;
  const poly = [ax, ay];
  let steps = 0, guard = 0;
  while (i < n && guard++ < 1e6) {
    // find the first segment ahead whose far end leaves the circle of radius G around the anchor
    let j = i, found = -1;
    while (j < n) {
      const dx = X(j + 1) - ax, dy = Y(j + 1) - ay;
      if (dx * dx + dy * dy >= G2) { found = j; break; }
      j++;
    }
    if (found < 0) break; // the rest of the coast stays within one yardstick of the anchor
    // solve |p(t) - a| = G on the segment
    const px = X(found), py = Y(found), qx = X(found + 1), qy = Y(found + 1);
    const ux = qx - px, uy = qy - py, wx = px - ax, wy = py - ay;
    const A = ux * ux + uy * uy, B = 2 * (ux * wx + uy * wy), Cc = wx * wx + wy * wy - G2;
    const disc = Math.max(0, B * B - 4 * A * Cc), t = A > 0 ? (-B + Math.sqrt(disc)) / (2 * A) : 1;
    ax = px + ux * Math.min(1, Math.max(0, t)); ay = py + uy * Math.min(1, Math.max(0, t));
    poly.push(ax, ay);
    steps++;
    i = found + (t >= 1 ? 1 : 0);
    if (found >= n - 1 && t >= 1) break;
  }
  // close back to the start
  const cx = X(0) - ax, cy = Y(0) - ay, leftover = Math.hypot(cx, cy) / G;
  poly.push(X(0), Y(0));
  return { poly, steps: steps + leftover };
}

// ---- a log-log chart frame drawn in screen space; returns logx,logy -> pixels ----
function chartFrame(f, spec) {
  const c = f.ctx;
  paper(f, PRINT.paper); toScreen(f);
  const L = spec.left || 46, Rm = 12, T = 12, Bm = 34;
  const w = f.w - L - Rm, h = f.h - T - Bm;
  const X = (lx) => L + ((lx - spec.x0) / (spec.x1 - spec.x0)) * w;
  const Y = (ly) => T + h - ((ly - spec.y0) / (spec.y1 - spec.y0)) * h;
  c.strokeStyle = PRINT.ink; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(L, T); c.lineTo(L, T + h); c.lineTo(L + w, T + h); c.stroke();
  c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
  const pow = (e) => (e === 0 ? '1' : e === 1 ? '10' : `10${String(e).replace(/-?\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d] || '⁻')}`);
  for (let e = Math.ceil(spec.x0); e <= Math.floor(spec.x1); e++) {
    const x = X(e);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.beginPath(); c.moveTo(x, T); c.lineTo(x, T + h); c.stroke();
    c.strokeStyle = PRINT.ink; c.beginPath(); c.moveTo(x, T + h); c.lineTo(x, T + h + 4); c.stroke();
    c.font = '11px "IBM Plex Mono", monospace'; c.fillText(pow(e), x, T + h + 7);
  }
  c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let e = Math.ceil(spec.y0); e <= Math.floor(spec.y1); e++) {
    const y = Y(e);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.beginPath(); c.moveTo(L, y); c.lineTo(L + w, y); c.stroke();
    c.strokeStyle = PRINT.ink; c.beginPath(); c.moveTo(L - 4, y); c.lineTo(L, y); c.stroke();
    c.font = '11px "IBM Plex Mono", monospace'; c.fillText(pow(e), L - 7, y);
  }
  c.fillStyle = PRINT.ink; c.font = '600 11px "Schibsted Grotesk", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText(spec.xlabel, L + w / 2, f.h - 6);
  c.save(); c.translate(12, T + h / 2); c.rotate(-Math.PI / 2); c.fillText(spec.ylabel, 0, 0); c.restore();
  return { X, Y, L, T, w, h,
    line(slope, b, color, dash) {
      c.save(); c.beginPath(); c.rect(L, T, w, h); c.clip();
      c.strokeStyle = color; c.lineWidth = 1.4; if (dash) c.setLineDash(dash);
      c.beginPath(); c.moveTo(X(spec.x0), Y(slope * spec.x0 + b)); c.lineTo(X(spec.x1), Y(slope * spec.x1 + b)); c.stroke();
      c.restore();
    },
    cloud(lx, ly, r = 4) { c.beginPath(); c.arc(X(lx), Y(ly), r, 0, 2 * Math.PI); c.fillStyle = PRINT.paper; c.fill(); c.strokeStyle = PRINT.ink; c.lineWidth = 1.3; c.stroke(); },
    rain(lx, ly, r = 4) { c.beginPath(); c.arc(X(lx), Y(ly), r, 0, 2 * Math.PI); c.fillStyle = PRINT.ink; c.fill(); },
  };
}

// ---- the folded cortex of the brain-folds cartoon ----
// A circle of radius R with radial wiggles r(φ) = R0 + a·sin(kφ), where k is chosen so the curve's
// length is close to the target L. A cartoon of folding, not a fractal construction.
function cortexCurve(R, L) {
  const a = Math.min(0.24 * R, 0.13);
  const R0 = R - a - 0.02;
  const len = (k) => {
    let s = 0;
    const m = Math.max(720, 16 * k);
    let x0 = R0, y0 = 0;
    for (let i = 1; i <= m; i++) {
      const t = (2 * Math.PI * i) / m, r = R0 + a * Math.sin(k * t);
      const x = r * Math.cos(t), y = r * Math.sin(t);
      s += Math.hypot(x - x0, y - y0); x0 = x; y0 = y;
    }
    return s;
  };
  let lo = 0, hi = 400;
  if (len(0) >= L) hi = 0;
  for (let it = 0; it < 24 && hi - lo > 0.5; it++) { const mid = (lo + hi) / 2; if (len(mid) < L) lo = mid; else hi = mid; }
  const k = Math.round((lo + hi) / 2);
  const m = Math.max(720, 16 * k), pts = new Float64Array(2 * m);
  for (let i = 0; i < m; i++) {
    const t = (2 * Math.PI * i) / m, r = R0 + a * Math.sin(k * t);
    pts[2 * i] = r * Math.cos(t); pts[2 * i + 1] = r * Math.sin(t);
  }
  let s = 0;
  for (let i = 0; i < m; i++) { const j = (i + 1) % m; s += Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]); }
  return { pts, k, length: s, a };
}
