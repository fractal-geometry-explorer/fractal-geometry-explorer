// Chapter 21 ("Chance as a Tool in Model Making") prints no plates, so everything on this page
// computes the chapter's own examples: a controller feeding S or F to the processor of a Koch
// loop (the caption of Plate 46 is the chapter's cited case), the seed as a page number in the
// grand portfolio, and the contrast between nonconstrained and self-constrained chance (random
// lattice polygons against self-avoiding ones).

// ---- the processor: Plate 46's coastline generator (three steps of 1/sqrt 7), run in its
// straight (S) or flipped (F) variant on every interval of the stage ----
const PHI21 = Math.atan2(Math.sqrt(3), 5);
const GW21 = [Math.cos(PHI21) / Math.sqrt(7), -Math.sin(PHI21) / Math.sqrt(7)];
const GV21 = [GW21[0] * 0.5 - GW21[1] * Math.sqrt(3) / 2, GW21[0] * Math.sqrt(3) / 2 + GW21[1] * 0.5];
const GEN21 = [[0, 0], GW21, [GW21[0] + GV21[0], GW21[1] + GV21[1]], [1, 0]];       // S
const GEN21F = GEN21.map(([x, y]) => [x, -y]);                                       // F: mirrored in the chord
// control sequences: what the controller hands the processor before each loop
const PI_DIGITS = '14159265358979323846';
function controlSequence(kind, K, seed) {
  if (kind === 'allS') return Array(K).fill(0);
  if (kind === 'alt') return Array.from({ length: K }, (_, k) => k % 2);
  if (kind === 'pi') return Array.from({ length: K }, (_, k) => +PI_DIGITS[k % PI_DIGITS.length] % 2);
  const rnd = mulberry32(seed * 2654435761 + 11);
  return Array.from({ length: K }, () => (rnd() < 0.5 ? 0 : 1));
}
// the curve on [0,1] after K stages; variantOf(stage, pieceIndex) returns 0 for S, 1 for F
function controlledCurve(K, variantOf) {
  let P = new Float64Array([0, 0, 1, 0]);
  for (let k = 0; k < K; k++) {
    const m = P.length / 2 - 1, Q = new Float64Array(m * 6 + 2);
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], dx = P[2 * i + 2] - ax, dy = P[2 * i + 3] - ay;
      const G = variantOf(k, i) ? GEN21F : GEN21;
      for (let g = 0; g < 3; g++) { Q[6 * i + 2 * g] = ax + dx * G[g][0] - dy * G[g][1]; Q[6 * i + 2 * g + 1] = ay + dx * G[g][1] + dy * G[g][0]; }
    }
    Q[Q.length - 2] = 1; Q[Q.length - 1] = 0;
    P = Q;
  }
  return P;
}

// ---- nonconstrained against self-constrained chance: random 2n-sided lattice polygons ----
// A closed 2n-step walk: n steps paired with their opposites, shuffled. (A simple closed-walk
// sampler, not the uniform distribution on all closed polygons; the page says so.)
const DIRS21 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function randomClosedPolygon(n, rnd) {
  const steps = [];
  for (let i = 0; i < n; i++) { const d = Math.floor(rnd() * 4); steps.push(d, d ^ 1); }
  for (let i = steps.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = steps[i]; steps[i] = steps[j]; steps[j] = t; }
  const P = [[0, 0]];
  let x = 0, y = 0;
  for (const d of steps) { x += DIRS21[d][0]; y += DIRS21[d][1]; P.push([x, y]); }
  return P;
}
// repeated vertices (beyond the closing return to the origin) — the walk's self-contacts
function selfContacts(P) {
  const seen = new Map();
  let hits = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const k = P[i][0] * 100003 + P[i][1];
    if (seen.has(k)) hits++;
    seen.set(k, 1);
  }
  return hits;
}
// rejection-sample a self-avoiding polygon; returns { P, tries } or null after maxTries
function selfAvoidingPolygon(n, rnd, maxTries = 20000) {
  for (let t = 1; t <= maxTries; t++) {
    const P = randomClosedPolygon(n, rnd);
    if (selfContacts(P) === 0) return { P, tries: t };
  }
  return null;
}
// acceptance rate measured over a batch
function acceptanceRate(n, seed, batch = 3000) {
  const rnd = mulberry32(seed * 7919 + n);
  let ok = 0;
  for (let t = 0; t < batch; t++) if (selfContacts(randomClosedPolygon(n, rnd)) === 0) ok++;
  return ok / batch;
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
