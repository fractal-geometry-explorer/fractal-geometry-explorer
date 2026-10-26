// Chapter 38 ("Scaling and Power Laws Without Geometry") prints no plates, so everything on this
// page computes the chapter's formulas: the hyperbolic (Paretian) distribution and its expectation
// paradoxes, the scaling lexicographic tree behind the generalized Zipf law, the mixed-bag
// robustness argument of Mandelbrot 1963e, and Lydall's salary hierarchy.

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
function normal(rnd) {
  let u = 0;
  while (!u) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}
// the hyperbolic variable with prefactor 1: Pr(U > u) = u^(-D) for u >= 1
const paretoSample = (rnd, D) => Math.pow(1 - rnd(), -1 / D);

// E(U | U > u0) = u0 · D/(D − 1) when D > 1 — the source of the expectation paradoxes
// conditional mean overshoot measured on a sample: the mean of (U − u0) over the U > u0
function overshoot(sample, u0) {
  let s = 0, n = 0;
  for (const u of sample) if (u > u0) { s += u - u0; n++; }
  return { mean: n ? s / n : NaN, n };
}

// ---- the scaling lexicographic tree: N proper letters of probability r each, the space
// 1 − N r. Level k holds the N^k words of k letters, each of probability P0·r^k, filling the
// ranks (N^k − 1)/(N − 1) + 1 ... (N^{k+1} − 1)/(N − 1). ΣP = P0·Σ(N r)^k = 1 exactly. ----
const treeD = (N, r) => Math.log(N) / Math.log(1 / r);
// P = F(ρ + V)^(−1/D): approximating ρ by the average of its level bounds, as the book
// instructs, gives ρ + V = V·(1 + N)·N^k/2, hence F = P0·(V(1 + N)/2)^(1/D)
function zipfParams(N, r, P0 = 1 - N * r) {
  const D = treeD(N, r), V = 1 / (N - 1);
  return { D, V, P0, F: P0 * Math.pow((V * (1 + N)) / 2, 1 / D) };
}
function zipfLevels(N, r, maxRank = 1e5, Pmin = 1e-9) {
  const out = [];
  let lo = 1, cnt = 1, P = 1 - N * r;
  while (lo <= maxRank && P > Pmin) { out.push({ lo, hi: lo + cnt - 1, P }); lo += cnt; cnt *= N; P *= r; }
  return out;
}
const zipfLaw = (N, r, rho, P0) => { const { D, V, F } = zipfParams(N, r, P0); return F * Math.pow(rho + V, -1 / D); };

// a sample of M words of independent letters, returned as frequencies sorted descending
function sampleWords(rnd, N, r, M, maxLen = 40) {
  const stop = 1 - N * r, counts = new Map();
  for (let w = 0; w < M; w++) {
    let key = '';
    for (let l = 0; l < maxLen; l++) {
      const x = rnd();
      if (x < stop) break;
      key += String.fromCharCode(97 + Math.min(N - 1, Math.floor((x - stop) / r)));
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Uint32Array.from([...counts.values()].sort((a, b) => b - a));
}

// ---- Lydall's hierarchy: every member has N subordinates, each paid r times their superior,
// so level k holds N^k members of income r^k and the Zipf formalism applies unchanged ----
function salaryLevels(N, r, K) {
  const out = [];
  let lo = 1, cnt = 1, U = 1;
  for (let k = 0; k <= K; k++) { out.push({ k, lo, hi: lo + cnt - 1, count: cnt, U }); lo += cnt; cnt *= N; U *= r; }
  return out;
}

// ---- the mixed bag (Mandelbrot 1963e): a dataset pooled from B batches, each batch the true
// variable times its own random "filter" scale, log-uniform over two decades ----
function mixedDataset(rnd, hyperbolic, n, D, sigma, B = 3) {
  const out = new Float64Array(n);
  for (let b = 0; b < B; b++) {
    const s = Math.pow(10, rnd() * 2 - 1);
    for (let i = Math.floor((b * n) / B); i < Math.floor(((b + 1) * n) / B); i++)
      out[i] = s * (hyperbolic ? paretoSample(rnd, D) : Math.exp(sigma * normal(rnd)));
  }
  return out.sort();
}
// apparent tail exponent: the log–log slope of the survival function between two quantiles
// (0.8–0.99 keeps the fit out of the noisy extreme order statistics)
function tailSlope(sorted, q0 = 0.8, q1 = 0.99) {
  const n = sorted.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
  for (let i = Math.floor(n * q0); i < Math.min(n - 1, Math.floor(n * q1)); i++) {
    const x = Math.log10(sorted[i]), y = Math.log10((n - i) / n);
    sx += x; sy += y; sxx += x * x; sxy += x * y; m++;
  }
  return (m * sxy - sx * sy) / (m * sxx - sx * sx);
}

// ---- a small chart in screen space: frame, grid, decade or plain tick labels ----
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
      const span = t1 - t0, step = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((s) => span / s <= 8) || 10000;
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
