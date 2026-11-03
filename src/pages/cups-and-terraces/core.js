// Chapter 29 ("The Areas of Islands, Lakes, and Cups") prints no plates, so this page computes
// the chapter's claims on fields built by pages/brown-relief/core.js (loaded before this file:
// fbmSurface, cropField, upsample, quantile, fft1, mulberry32, gaussMaker are defined there).
// Here: island and deadvalley areas for the Korcak law, the one-dimensional cup construction
// B*(x) (a Levy devil's staircase up, then down), and the filled relief B*(x,y) by priority flood.

// connected components above (sign=+1) or below (sign=-1) the level; returns
// { areas: cell counts sorted descending, touchesBorder: same order, labels: Int32Array }
function components(h, w, hgt, level, sign) {
  const labels = new Int32Array(w * hgt).fill(-1), stack = [];
  const out = [];
  const above = (o) => (sign > 0 ? h[o] > level : h[o] < level);
  for (let s = 0; s < w * hgt; s++) {
    if (labels[s] >= 0 || !above(s)) continue;
    const id = out.length;
    let cells = 0, border = false;
    stack.length = 0; stack.push(s); labels[s] = id;
    while (stack.length) {
      const o = stack.pop(), x = o % w, y = (o - x) / w;
      cells++;
      if (x === 0 || y === 0 || x === w - 1 || y === hgt - 1) border = true;
      if (x > 0 && labels[o - 1] < 0 && above(o - 1)) { labels[o - 1] = id; stack.push(o - 1); }
      if (x < w - 1 && labels[o + 1] < 0 && above(o + 1)) { labels[o + 1] = id; stack.push(o + 1); }
      if (y > 0 && labels[o - w] < 0 && above(o - w)) { labels[o - w] = id; stack.push(o - w); }
      if (y < hgt - 1 && labels[o + w] < 0 && above(o + w)) { labels[o + w] = id; stack.push(o + w); }
    }
    out.push({ cells, border });
  }
  return { comps: out, labels };
}
// island areas (above sea), largest first; excludeMain drops the largest component (a continent)
function rankedAreas(comps) {
  return comps.map((c) => c.cells).sort((a, b) => b - a);
}
// least-squares slope of log10(rank) against log10(area) over ranks [i0, i1). Fit only islands
// that do not touch the window border: truncated islands flatten the line badly (checked in node:
// with border islands in, the fitted B runs at half the prediction; without them it scatters
// around it).
function korcakSlope(areas, i0 = 1, i1 = 60, minArea = 4) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
  const n = Math.min(i1, areas.length);
  for (let i = i0; i < n; i++) {
    if (areas[i] < minArea) break;
    const x = Math.log10(areas[i]), y = Math.log10(i + 1);
    sx += x; sy += y; sxx += x * x; sxy += x * y; m++;
  }
  if (m < 4) return NaN;
  return (m * sxy - sx * sy) / (m * sxx - sx * sx);          // = -B
}

// (fbmLine, the one-dimensional fractional Brown profile, lives in pages/brown-relief/core.js,
// which this page loads first)

// ---- the cups in one dimension: B*(x) is the running maximum from the left up to the argmax,
// and the running maximum from the right after it; droplets above B* escape, the domain
// B < z < B* decomposes into the cups ----
function fillCups1D(B) {
  const n = B.length, S = new Float64Array(n);
  let iMax = 0;
  for (let i = 1; i < n; i++) if (B[i] > B[iMax]) iMax = i;
  let m = -Infinity;
  for (let i = 0; i <= iMax; i++) { m = Math.max(m, B[i]); S[i] = m; }
  m = -Infinity;
  for (let i = n - 1; i > iMax; i--) { m = Math.max(m, B[i]); S[i] = m; }
  return { S, iMax };
}
// the cups: maximal runs where S > B (by more than a hair); returns [start, end) index pairs
function cupRuns(B, S, eps = 1e-9) {
  const runs = [];
  let a = -1;
  for (let i = 0; i < B.length; i++) {
    const inCup = S[i] - B[i] > eps;
    if (inCup && a < 0) a = i;
    if (!inCup && a >= 0) { runs.push([a, i]); a = -1; }
  }
  if (a >= 0) runs.push([a, B.length]);
  return runs;
}

// ---- the filled relief B*(x,y), by priority flood: water poured from the border settles so
// that every cell's level is the lowest brim on any path to the edge ----
function fillCups2D(h, w, hgt) {
  const S = Float64Array.from(h), seen = new Uint8Array(w * hgt);
  // binary min-heap of [level, offset]
  const heapL = new Float64Array(w * hgt + 1), heapO = new Int32Array(w * hgt + 1);
  let hn = 0;
  const push = (l, o) => {
    let i = ++hn;
    while (i > 1) { const p = i >> 1; if (heapL[p] <= l) break; heapL[i] = heapL[p]; heapO[i] = heapO[p]; i = p; }
    heapL[i] = l; heapO[i] = o;
  };
  const pop = () => {
    const top = [heapL[1], heapO[1]];
    const l = heapL[hn], o = heapO[hn--];
    let i = 1;
    while (2 * i <= hn) {
      let k = 2 * i;
      if (k < hn && heapL[k + 1] < heapL[k]) k++;
      if (heapL[k] >= l) break;
      heapL[i] = heapL[k]; heapO[i] = heapO[k]; i = k;
    }
    if (hn) { heapL[i] = l; heapO[i] = o; }
    return top;
  };
  for (let x = 0; x < w; x++) { for (const o of [x, (hgt - 1) * w + x]) if (!seen[o]) { seen[o] = 1; push(h[o], o); } }
  for (let y = 0; y < hgt; y++) { for (const o of [y * w, y * w + w - 1]) if (!seen[o]) { seen[o] = 1; push(h[o], o); } }
  while (hn) {
    const [lvl, o] = pop();
    S[o] = Math.max(h[o], lvl);
    const x = o % w, y = (o - x) / w;
    for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= hgt) continue;
      const no = ny * w + nx;
      if (seen[no]) continue;
      seen[no] = 1;
      push(Math.max(h[no], S[o]), no);
    }
  }
  return S;
}

// Lambert hillshade of a field, light from the upper left, into an ImageData-ready gray
function shadeField(h, w, hgt, zScale) {
  const out = new Float64Array(w * hgt);
  const lx = -0.5, ly = -0.5, lz = 0.7071;
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * w + x;
      const gx = (h[Math.min(w - 1, x + 1) + y * w] - h[Math.max(0, x - 1) + y * w]) * zScale / 2;
      const gy = (h[x + Math.min(hgt - 1, y + 1) * w] - h[x + Math.max(0, y - 1) * w]) * zScale / 2;
      const L = Math.hypot(gx, gy, 1);
      out[o] = Math.max(0, (-gx * lx - gy * ly + lz) / L);
    }
  }
  return out;
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
