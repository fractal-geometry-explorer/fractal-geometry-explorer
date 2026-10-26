// Chapter 34 geometry: the two Plate 318 carpets, the Cantor dusts along their mid lines, and
// the chapter's lacunarity measures (the gap census with its prefactor F, and the spread of the
// mass found in a window). Both generators were read from the caption box at 600 dpi and the
// printed stage-2 figures verified cell for cell (2401 cells each).
const D_CARPET = Math.log(40) / Math.log(7);   // b = 7, N = 40
const D_DUST = Math.log(4) / Math.log(7);      // the mid lines: N = 4, r = 1/7

// hole cells of each generator, (row, col) from the top left, 0-indexed:
// left, one 3×3 trema in the middle; right, nine 1×1 tremas spread out
const HOLES_L = [];
for (let i = 2; i <= 4; i++) for (let j = 2; j <= 4; j++) HOLES_L.push(i * 7 + j);
const HOLES_R = [];
for (const i of [1, 3, 5]) for (const j of [1, 3, 5]) HOLES_R.push(i * 7 + j);
function keepMask(holes) { const m = new Uint8Array(49).fill(1); for (const h of holes) m[h] = 0; return m; }

// occupancy of stage k as a 7^k × 7^k grid of 0/1 (row 0 at the top)
function occupancy(mask, k) {
  let n = 1, g = new Uint8Array([1]);
  for (let s = 0; s < k; s++) {
    const nn = n * 7, out = new Uint8Array(nn * nn);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (!g[i * n + j]) continue;
      for (let di = 0; di < 7; di++) for (let dj = 0; dj < 7; dj++) {
        if (mask[di * 7 + dj]) out[(i * 7 + di) * nn + (j * 7 + dj)] = 1;
      }
    }
    g = out; n = nn;
  }
  return g;
}

// ---------- the mid-line dusts ----------
// cut either carpet along its middle row: left keeps columns {0,1,5,6}, right {0,2,4,6}
const COLS_L = [0, 1, 5, 6];
const COLS_R = [0, 2, 4, 6];

function dustStarts(cols, n) {                 // stage n: 4^n pieces of length 7^-n
  let starts = [0], len = 1;
  for (let k = 0; k < n; k++) {
    const out = new Float64Array(starts.length * 4);
    let j = 0;
    for (const a of starts) for (const c of cols) out[j++] = a + (c * len) / 7;
    starts = out; len /= 7;
  }
  return { starts, len };
}

// the limit dust's mass on [0, x] (each kept cell carries 1/4 of its parent's mass)
function dustMass(x, cols) {
  let m = 0, p = 1;
  for (let i = 0; i < 40; i++) {
    if (x <= 0) return m;
    if (x >= 1) return m + p;
    const d = Math.floor(x * 7);
    let idx = -1, below = 0;
    for (let q = 0; q < 4; q++) { if (cols[q] < d) below++; else if (cols[q] === d) idx = q; }
    m += (below * p) / 4;
    if (idx < 0) return m;
    p /= 4; x = x * 7 - d;
  }
  return m;
}
const windowMass = (t, w, cols) => dustMass(t + w, cols) - dustMass(t, cols);

// ---------- the gap census ----------
// gaps of the generator, between its merged kept cells (left: one gap of 3/7; right: three of 1/7)
function baseGaps(cols) {
  const out = [];
  for (let q = 1; q < 4; q++) { const g = cols[q] - cols[q - 1] - 1; if (g > 0) out.push(g / 7); }
  return out;
}
// generation j repeats every base gap 4^(j-1) times at 1/7^(j-1) the length, so the census
// Nr(U > u) climbs in steps along F·u^−D; collapsing gaps together lowers F
function gapSteps(cols, J) {
  const gaps = [];
  for (let j = 1; j <= J; j++) for (const g of baseGaps(cols)) gaps.push({ len: g * Math.pow(7, 1 - j), count: Math.pow(4, j - 1) });
  gaps.sort((a, b) => b.len - a.len);
  let cum = 0;
  return gaps.map((g) => ({ len: g.len, below: cum, above: (cum += g.count) }));
}
// F fitted through the step corners (geometric mean of the counts at each riser)
function gapPrefactor(steps) {
  let s = 0, n = 0;
  for (const g of steps) { if (g.below > 0) { s += Math.log(Math.sqrt(g.below * g.above)) + D_DUST * Math.log(g.len); n++; } }
  return Math.exp(s / n);
}

// ---------- mass in a window, sampled ----------
// slide a window of width w along [0, 1]; keep the masses of the windows that hit the dust.
// Returns the samples with their mean and the chapter's second-order lacunarity <(W/<W> - 1)^2>.
function massSamples(cols, w, M = 4000) {
  const vals = [];
  for (let i = 0; i < M; i++) {
    const t = (i / (M - 1)) * (1 - w), m = windowMass(t, w, cols);
    if (m > 1e-12) vals.push(m);
  }
  let mean = 0;
  for (const v of vals) mean += v;
  mean /= vals.length;
  let l2 = 0;
  for (const v of vals) l2 += (v / mean - 1) ** 2;
  return { vals, mean, l2: l2 / vals.length };
}
