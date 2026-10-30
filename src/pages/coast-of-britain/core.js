// Chapter 5: how long is the coast of Britain? Data and geometry for the page.

// ---- Plate 33: Richardson's length measurements, digitised from the scan ----
// Each series is a list of [log10(yardstick in km), log10(total length in km)]. The 29 ring
// markers and 10 circle dots were located on the 600 dpi scan by the centroid of each marker's
// interior, and the axes calibrated from the grid rules (each rule fitted with its own tilt;
// the printed grid's row pitch is uneven by about 5%, so values are interpolated rule to rule).
// Centres are good to about 0.005 of a decade.
const P33 = {
  australia: { label: 'Australian coast', pts: [[1.992, 4.129], [2.388, 4.096], [2.687, 4.060], [3.010, 4.022]],
    printed: { slope: -0.1285, b: 4.3968, x1: 1.93, x2: 3.37 } },
  circle: { label: 'Circle', pts: [[1.041, 3.979], [2.042, 3.975], [2.435, 3.974], [2.746, 3.976], [3.027, 3.968], [3.200, 3.957], [3.271, 3.942], [3.309, 3.957], [3.350, 3.931], [3.439, 3.895], [3.500, 3.774]],
    printed: null },
  safrica: { label: 'South African coast', pts: [[2.010, 3.637], [2.334, 3.625], [2.695, 3.620], [3.003, 3.615]],
    printed: { slope: -0.0059, b: 3.6368, x1: 1.99, x2: 3.06 } },
  german: { label: 'German land-frontier, 1900', pts: [[1.629, 3.481], [1.835, 3.474], [2.008, 3.439], [2.263, 3.420], [2.262, 3.382], [2.476, 3.399], [2.475, 3.349], [2.700, 3.363], [2.700, 3.312]],
    printed: { slope: -0.1604, b: 3.7641, x1: 1.67, x2: 2.77 } },
  britain: { label: 'West coast of Britain', pts: [[1.012, 3.475], [1.479, 3.319], [2.004, 3.187], [2.310, 3.071], [2.730, 2.983], [2.980, 2.983]],
    printed: { slope: -0.2612, b: 3.7220, x1: 1.00, x2: 3.06 } },
  portugal: { label: 'Land-frontier of Portugal', pts: [[1.507, 2.873], [1.704, 2.839], [1.988, 2.844], [2.297, 2.760], [2.424, 2.739], [2.743, 2.724]],
    printed: { slope: -0.1257, b: 3.0659, x1: 1.56, x2: 2.90 } },
};
const P33_ORDER = ['australia', 'circle', 'safrica', 'german', 'britain', 'portugal'];
// the slopes Richardson's study is usually quoted with (D = 1 - slope)
const QUOTED = { australia: -0.13, safrica: -0.02, german: -0.15, britain: -0.25, portugal: -0.14, circle: 0 };

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

// exact length of an equal-sided polygon inscribed in a circle of circumference C, side e:
// n = π/asin(e/2r) sides of length e (kept fractional, the smooth version of the walk)
function circleLaw(C, e) {
  const r = C / (2 * Math.PI);
  if (e >= 2 * r) return NaN; // the yardstick exceeds the diameter: no step fits
  return (e * Math.PI) / Math.asin(e / (2 * r));
}

// ---- coastlines for the divider demo ----
// Quadric Koch coastline: Plate 51's generator (N = 8, r = 1/4) on a straight initiator, D = 3/2
// (the chapter announces D = 3/2 as the first approximation for coastlines). Triadic Koch curve,
// D = log 4/log 3. Both carry codes all 0.
const COAST_QUAD = genFromCodes([[0, 0], [1 / 4, 0], [1 / 4, 1 / 4], [1 / 2, 1 / 4], [1 / 2, 0], [1 / 2, -1 / 4], [3 / 4, -1 / 4], [3 / 4, 0], [1, 0]], [0, 0, 0, 0, 0, 0, 0, 0]);
const COAST_KOCH = genFromCodes([[0, 0], [1 / 3, 0], [1 / 2, R3 / 6], [2 / 3, 0], [1, 0]], [0, 0, 0, 0]);
const COASTS = {
  quad: { name: 'Quadric coast', D: 1.5, dlabel: 'log 8/log 4 = 3/2', r: 1 / 4, maxN: 6, gen: COAST_QUAD },
  koch: { name: 'Koch coast', D: Math.log(4) / Math.log(3), dlabel: 'log 4/log 3 ≈ 1.2619', r: 1 / 3, maxN: 8, gen: COAST_KOCH },
  circle: { name: 'Semicircle', D: 1, dlabel: '1 (rectifiable)', r: 1, maxN: 0, gen: null },
};
const coastCache = {};
function coastCurve(kind, n) {
  const key = `${kind}|${n}`;
  if (coastCache[key]) return coastCache[key];
  let P;
  if (kind === 'circle') {
    const m = 2048;
    P = new Float64Array(2 * m + 2);
    for (let i = 0; i <= m; i++) { const a = Math.PI - (Math.PI * i) / m; P[2 * i] = 0.5 + 0.5 * Math.cos(a); P[2 * i + 1] = 0.5 * Math.sin(a); }
  } else {
    P = curveOf(Array.from({ length: n }, () => COASTS[kind].gen));
  }
  return (coastCache[key] = P);
}
function coastStage(kind, eps) {
  const S = COASTS[kind];
  if (kind === 'circle') return 0;
  // edges at stage n are r^n; keep them at least 4x shorter than the yardstick
  const n = Math.ceil(Math.log(4 / eps) / Math.log(1 / S.r));
  return Math.max(2, Math.min(S.maxN, n));
}

// ---- the divider walk along an open curve ----
// From the first point, march to the first point of the curve at chord distance e, plant a vertex,
// repeat; the leftover chord to the far end counts as a fraction of a step. Same construction as
// the walks of the length-area page, on an open initiator.
function dividerWalkOpen(P, e) {
  const n = P.length / 2, e2 = e * e;
  let ax = P[0], ay = P[1], i = 0;
  const poly = [ax, ay];
  let steps = 0, guard = 0;
  while (i < n - 1 && guard++ < 1e6) {
    let j = i, found = -1;
    while (j < n - 1) {
      const dx = P[2 * j + 2] - ax, dy = P[2 * j + 3] - ay;
      if (dx * dx + dy * dy >= e2) { found = j; break; }
      j++;
    }
    if (found < 0) break;
    const px = P[2 * found], py = P[2 * found + 1], qx = P[2 * found + 2], qy = P[2 * found + 3];
    const ux = qx - px, uy = qy - py, wx = px - ax, wy = py - ay;
    const A = ux * ux + uy * uy, B = 2 * (ux * wx + uy * wy), Cc = wx * wx + wy * wy - e2;
    const disc = Math.max(0, B * B - 4 * A * Cc), t = A > 0 ? (-B + Math.sqrt(disc)) / (2 * A) : 1;
    ax = px + ux * Math.min(1, Math.max(0, t)); ay = py + uy * Math.min(1, Math.max(0, t));
    poly.push(ax, ay);
    steps++;
    i = found + (t >= 1 ? 1 : 0);
  }
  const leftover = Math.hypot(P[2 * n - 2] - ax, P[2 * n - 1] - ay) / e;
  poly.push(P[2 * n - 2], P[2 * n - 1]);
  return { poly, steps: steps + leftover };
}

// the measurement ladder: walks at log-spaced yardsticks, cached per coast
const ladderCache = {};
function measureLadder(kind) {
  if (ladderCache[kind]) return ladderCache[kind];
  const out = [];
  for (let k = 0; k <= 13; k++) {
    const e = 0.4 * Math.pow(0.004 / 0.4, k / 13);
    const P = coastCurve(kind, coastStage(kind, e));
    const w = dividerWalkOpen(P, e);
    out.push({ e, steps: w.steps, L: w.steps * e });
  }
  return (ladderCache[kind] = out);
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
  const step = spec.tick || 1;
  for (let e = Math.ceil(spec.x0 / step) * step; e <= spec.x1 + 1e-9; e += step) {
    const x = X(e);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.beginPath(); c.moveTo(x, T); c.lineTo(x, T + h); c.stroke();
    c.strokeStyle = PRINT.ink; c.beginPath(); c.moveTo(x, T + h); c.lineTo(x, T + h + 4); c.stroke();
    c.font = '11px "IBM Plex Mono", monospace'; c.fillText(e.toFixed(step < 1 ? 1 : 0), x, T + h + 7);
  }
  c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let e = Math.ceil(spec.y0 / step) * step; e <= spec.y1 + 1e-9; e += step) {
    const y = Y(e);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.beginPath(); c.moveTo(L, y); c.lineTo(L + w, y); c.stroke();
    c.strokeStyle = PRINT.ink; c.beginPath(); c.moveTo(L - 4, y); c.lineTo(L, y); c.stroke();
    c.font = '11px "IBM Plex Mono", monospace'; c.fillText(e.toFixed(step < 1 ? 1 : 0), L - 7, y);
  }
  c.fillStyle = PRINT.ink; c.font = '600 11px "Schibsted Grotesk", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText(spec.xlabel, L + w / 2, f.h - 6);
  c.save(); c.translate(12, T + h / 2); c.rotate(-Math.PI / 2); c.fillText(spec.ylabel, 0, 0); c.restore();
  return { X, Y, L, T, w, h,
    clipLine(x1, x2, slope, b, color, dash) {
      c.save(); c.beginPath(); c.rect(L, T, w, h); c.clip();
      c.strokeStyle = color; c.lineWidth = 1.4; if (dash) c.setLineDash(dash);
      c.beginPath(); c.moveTo(X(x1), Y(slope * x1 + b)); c.lineTo(X(x2), Y(slope * x2 + b)); c.stroke();
      c.restore();
    },
    curve(pts, color, dash, lw) {
      c.save(); c.beginPath(); c.rect(L, T, w, h); c.clip();
      c.strokeStyle = color; c.lineWidth = lw || 1.4; if (dash) c.setLineDash(dash);
      c.beginPath();
      pts.forEach(([x, y], i) => { if (i) c.lineTo(X(x), Y(y)); else c.moveTo(X(x), Y(y)); });
      c.stroke();
      c.restore();
    },
    ring(lx, ly, r = 4.5, color = PRINT.ink) { c.beginPath(); c.arc(X(lx), Y(ly), r, 0, 2 * Math.PI); c.fillStyle = PRINT.paper; c.fill(); c.strokeStyle = color; c.lineWidth = 1.3; c.stroke(); },
    dot(lx, ly, r = 4, color = PRINT.ink) { c.beginPath(); c.arc(X(lx), Y(ly), r, 0, 2 * Math.PI); c.fillStyle = color; c.fill(); },
    label(lx, ly, text, color) {
      c.fillStyle = color || PRINT.muted; c.font = '600 10px "Schibsted Grotesk", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillText(text, X(lx), Y(ly));
    },
  };
}
