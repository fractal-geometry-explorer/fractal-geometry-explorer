// Chapter 10 prints no plates, so every figure on this page is the page's own illustration of
// the chapter's text. The models: a fixed-count random curdling of [0, 1] in base 9 (the gusty
// record a probe reads), the chapter's curdling of the unit cube in base 3 (fractally
// homogeneous turbulence), the branching-process section argument for D > 2, and the spectrum
// (in)equality B = (3 − D)/3.

// seeded PRNG (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// k distinct cells out of n (partial Fisher–Yates), seeded, ascending. The first k picks of a
// given seed are a prefix of the first k + 1, so growing N adds curds without moving the rest.
function pickCells(rand, n, k) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) { const j = i + Math.floor(rand() * (n - i)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, k).sort((a, b) => a - b);
}

// curdle [0, 1] in base 9: every kept cell keeps exactly N of its 9 subcells, so the gusts'
// dimension is exactly d = log N / log 9, and the dissipation (total mass 1 at every stage)
// spreads uniformly — density (9/N)^m in every kept stage-m cell, zero elsewhere. `fixed` reuses
// one set of N positions in every cell (the chapter's "de-randomized" curdling); otherwise every
// cell draws its own positions from the same seed. Returns the starts of every stage 0..m
// (stage k holds the N^k ancestors, of length 9^−k, of the stage-m cells).
function curdleLine(N, m, seed, fixed) {
  const rand = rng(seed), gen = pickCells(rand, 9, N), stages = [new Float64Array(1)];
  let len = 1;
  for (let s = 0; s < m; s++) {
    const prev = stages[s], out = new Float64Array(prev.length * N);
    let j = 0;
    for (const a of prev) { const cells = fixed ? gen : pickCells(rand, 9, N); for (const c of cells) out[j++] = a + (c * len) / 9; }
    stages.push(out); len /= 9;
  }
  return stages;
}

// curdle the unit cube in base 3: one generator (N of the 27 subcells, seeded), reused in every
// cell — the chapter's curdling, "a crude de-randomized form" of the Novikov–Stewart model of
// chapter 23. D = log N / log 3; dissipation density multiplies by 27/N at every stage.
const cubeGen = (N, seed) => pickCells(rng(seed), 27, N).map((c) => [c % 3, ((c / 3) | 0) % 3, (c / 9) | 0]);
function curdleCube(gen, m) {
  let cells = [[0, 0, 0]], side = 1;
  for (let s = 0; s < m; s++) {
    const out = [], t = side / 3;
    for (const [x, y, z] of cells) for (const [i, j, k] of gen) out.push([x + i * t, y + j * t, z + k * t]);
    cells = out; side = t;
  }
  return { cells, side };
}

// the section argument, computed exactly. Randomize the curdling (base 3, each subcell kept
// independently with probability p = 3^(D−3), so E(kept) = 27p and D = 3 + log₃ p). A straight
// probe's trace crosses 3 subcells of each cell it was turbulent in, so the trace down the
// cascade is a branching process with Binomial(3, p) offspring — mean 3p = 3^(D−2). It dies out
// surely when D ≤ 2 and survives forever with positive probability when D > 2: extinction by
// stage m iterates the generating function q → (1 − p + p·q)³ from q = 0.
function hitCurve(D, M) {
  const p = Math.pow(3, D - 3), out = [1];
  let q = 0;
  for (let m = 1; m <= M; m++) { const t = 1 - p + p * q; q = t * t * t; out.push(1 - q); }
  return out;
}
const hitLimit = (D, it = 4000) => hitCurve(D, it)[it];

// the spectrum (in)equality (Mandelbrot 1967k, 1976o): in fractally homogeneous turbulence
// ⟨[v(x) − v(x+r)]²⟩ = |r|^(2/3 + B) with B = (3 − D)/3; weighted curdling gives B ≤ (3 − D)/3.
const specB = (D) => (3 - D) / 3;
