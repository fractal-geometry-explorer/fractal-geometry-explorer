// Chapter 19 core: iteration of z -> lam*z*(1-z) and x -> x^2 - mu, rasterised Julia sets and
// parameter maps (distance-estimate rendering), Newton solvers for nuclei and multipliers, the
// drape silhouettes of Plate 187, and the Fatou-dust diagram of Plate 192.

const MU = (lr, li) => [lr * lr / 4 - li * li / 4 - lr / 2, lr * li / 2 - li / 2]; // mu = lam^2/4 - lam/2

// ---------- orbit tools ----------
// attracting cycle reached from the critical point 1/2, if any: { p, zr, zi } or null
function cycleOf(lr, li, itmax = 60000) {
  // a long warmup, because a multiplier of modulus 0.98 needs thousands of turns to settle
  let zr = 0.5, zi = 0, R2 = Math.max(100, lr * lr + li * li);
  for (let i = 0; i < itmax; i++) {
    const ar = 1 - zr, ai = -zi;                       // 1 - z
    const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar; // z(1-z)
    zr = lr * mr - li * mi; zi = lr * mi + li * mr;
    if (zr * zr + zi * zi > R2) return null;
  }
  const z0r = zr, z0i = zi;
  for (let p = 1; p <= 600; p++) {
    const ar = 1 - zr, ai = -zi;
    const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;
    zr = lr * mr - li * mi; zi = lr * mi + li * mr;
    const dr = zr - z0r, di = zi - z0i;
    if (dr * dr + di * di < 1e-20) return { p, zr: z0r, zi: z0i };
  }
  return null;
}
// f^p(1/2) and d/dlam f^p(1/2), both complex, for the parameter-plane Newton
function critOrbit(lr, li, p) {
  let zr = 0.5, zi = 0, dr = 0, di = 0;
  for (let k = 0; k < p; k++) {
    const ar = 1 - zr, ai = -zi;
    const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;       // z(1-z)
    const sr = 1 - 2 * zr, si = -2 * zi;                        // 1-2z
    const tr = lr * sr - li * si, ti = lr * si + li * sr;       // lam(1-2z)
    const ndr = mr + tr * dr - ti * di, ndi = mi + tr * di + ti * dr;
    zr = lr * mr - li * mi; zi = lr * mi + li * mr;
    dr = ndr; di = ndi;
  }
  return [zr, zi, dr, di];
}
// Newton for f^p(1/2) = 1/2: the nucleus (superstable centre) of a period-p atom
function nucleus(p, lr, li) {
  for (let it = 0; it < 120; it++) {
    const [zr, zi, dr, di] = critOrbit(lr, li, p);
    const gr = zr - 0.5, gi = zi;
    const dn = dr * dr + di * di;
    if (dn < 1e-30) break;
    const sr = (gr * dr + gi * di) / dn, si = (gi * dr - gr * di) / dn;
    lr -= sr; li -= si;
    if (sr * sr + si * si < 1e-26) break;
  }
  return [lr, li];
}
// first guess for the sprout of period n at angle 2*pi*m/n on the unit circle |lam| = 1
function sproutGuess(n, m) {
  const th = 2 * Math.PI * m / n, r = 1 + 2 * Math.abs(Math.sin(Math.PI * m / n)) / (n * n) + 1 / (n * n);
  return [r * Math.cos(th), r * Math.sin(th)];
}
// 2D complex Newton for f^n(z)=z, (f^n)'(z)=sigma: the lam whose period-n cycle has multiplier sigma
function lamForSigma(n, sr, si, lr, li) {
  // start z on the attracting cycle reached from 1/2
  let zr = 0.5, zi = 0;
  for (let i = 0; i < 2500; i++) {
    const ar = 1 - zr, ai = -zi;
    const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;
    const nr = lr * mr - li * mi, ni = lr * mi + li * mr;
    zr = nr; zi = ni;
  }
  const G = (zr, zi, lr, li) => {
    let wr = zr, wi = zi, dr = 1, di = 0;
    for (let k = 0; k < n; k++) {
      const sr1 = 1 - 2 * wr, si1 = -2 * wi;
      const tr = lr * sr1 - li * si1, ti = lr * si1 + li * sr1;
      const ndr = dr * tr - di * ti, ndi = dr * ti + di * tr;
      const ar = 1 - wr, ai = -wi;
      const mr = wr * ar - wi * ai, mi = wr * ai + wi * ar;
      wr = lr * mr - li * mi; wi = lr * mi + li * mr;
      dr = ndr; di = ndi;
    }
    return [wr - zr, wi - zi, dr - sr, di - si];
  };
  const h = 1e-7;
  for (let it = 0; it < 90; it++) {
    const [g1r, g1i, g2r, g2i] = G(zr, zi, lr, li);
    if (g1r * g1r + g1i * g1i < 1e-24 && g2r * g2r + g2i * g2i < 1e-24) break;
    const [a1r, a1i, c1r, c1i] = G(zr + h, zi, lr, li);
    const [b1r, b1i, d1r, d1i] = G(zr, zi, lr + h, li);
    // complex Jacobian entries a = dg1/dz, b = dg1/dlam, c = dg2/dz, d = dg2/dlam
    const ar = (a1r - g1r) / h, ai = (a1i - g1i) / h;
    const br = (b1r - g1r) / h, bi = (b1i - g1i) / h;
    const cr = (c1r - g2r) / h, ci = (c1i - g2i) / h;
    const dr = (d1r - g2r) / h, di = (d1i - g2i) / h;
    const detr = ar * dr - ai * di - (br * cr - bi * ci), deti = ar * di + ai * dr - (br * ci + bi * cr);
    const dn = detr * detr + deti * deti;
    if (dn < 1e-30) break;
    // dz = (g1*d - g2*b)/det, dlam = (a*g2 - c*g1)/det
    const n1r = g1r * dr - g1i * di - (g2r * br - g2i * bi), n1i = g1r * di + g1i * dr - (g2r * bi + g2i * br);
    const n2r = ar * g2r - ai * g2i - (cr * g1r - ci * g1i), n2i = ar * g2i + ai * g2r - (cr * g1i + ci * g1r);
    const dzr = (n1r * detr + n1i * deti) / dn, dzi = (n1i * detr - n1r * deti) / dn;
    const dlr = (n2r * detr + n2i * deti) / dn, dli = (n2i * detr - n2r * deti) / dn;
    zr -= dzr; zi -= dzi; lr -= dlr; li -= dli;
    if (dlr * dlr + dli * dli < 1e-26) break;
  }
  return [lr, li];
}

// ---------- rasterisers ----------
// Each one fills an ImageData at CSS resolution for the current view; the caller scales it up.
const PAPER_RGB = [236, 235, 230], INK_RGB = [21, 21, 21];
function putPix(d, o, t) { // t in [0,1]: 0 paper, 1 ink
  d[o] = PAPER_RGB[0] + (INK_RGB[0] - PAPER_RGB[0]) * t;
  d[o + 1] = PAPER_RGB[1] + (INK_RGB[1] - PAPER_RGB[1]) * t;
  d[o + 2] = PAPER_RGB[2] + (INK_RGB[2] - PAPER_RGB[2]) * t;
  d[o + 3] = 255;
}

// Julia set of lam*z*(1-z). mode 'fill': interior and boundary in ink. mode 'line': boundary only
// (how the book printed its thin dragons). turn: sample the plane turned 90 degrees about z = 1/2.
// cyc (from cycleOf) lets interior pixels stop as soon as the orbit reaches the attracting cycle.
function rasterJulia(img, v, dpr, lam, opts = {}) {
  const { itmax = 320, mode = 'fill', turn = false, cyc = null } = opts;
  const W = img.width, H = img.height, d = img.data;
  const lr = lam[0], li = lam[1];
  // a thinner threshold for skin-only prints, nearer the book's sparse inverse-iteration dots
  const R2 = Math.max(100, 4 * (lr * lr + li * li)), px = 1 / v.s, thr = px * (mode === 'line' ? 0.45 : 0.75);
  const cp = cyc ? cyc.p : 0, cr = cyc ? cyc.zr : 0, ci = cyc ? cyc.zi : 0;
  for (let j = 0; j < H; j++) {
    const wy = (v.oy - (j + 0.5)) / v.s;
    for (let i = 0; i < W; i++) {
      const wx = ((i + 0.5) - v.ox) / v.s;
      let zr = turn ? 0.5 + wy : wx, zi = turn ? -(wx - 0.5) : wy;
      let dr = 1, di = 0, inside = true, t = 0, near = 0;
      for (let k = 0; k < itmax; k++) {
        const sr = 1 - 2 * zr, si = -2 * zi;
        const tr = lr * sr - li * si, ti = lr * si + li * sr;
        const ndr = dr * tr - di * ti, ndi = dr * ti + di * tr;
        const ar = 1 - zr, ai = -zi;
        const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;
        zr = lr * mr - li * mi; zi = lr * mi + li * mr;
        dr = ndr; di = ndi;
        const q = zr * zr + zi * zi;
        if (q > R2) {
          inside = false;
          const az = Math.sqrt(q), ad = Math.sqrt(dr * dr + di * di);
          const dist = ad > 1e-300 ? az * Math.log(az) / ad : 0;
          t = dist < thr ? 1 : 0;
          break;
        }
        if (cp) {
          const er = zr - cr, ei = zi - ci;
          if (er * er + ei * ei < 1e-9) { near++; if (near > 1) break; } // reached the cycle: interior
        }
      }
      if (inside) t = mode === 'fill' ? 1 : 0;
      putPix(d, (j * W + i) * 4, t);
    }
  }
}

// Overlay of filled sets for several real lams (Plate 185, left): count how many keep the point
function rasterOverlay(img, v, lams, itmax = 280) {
  const W = img.width, H = img.height, d = img.data, K = lams.length;
  for (let j = 0; j < H; j++) {
    const wy = (v.oy - (j + 0.5)) / v.s;
    for (let i = 0; i < W; i++) {
      const wx = ((i + 0.5) - v.ox) / v.s;
      let n = 0;
      for (let q = 0; q < K; q++) {
        const L = lams[q];
        let zr = wx, zi = wy, inb = true;
        for (let k = 0; k < itmax; k++) {
          const ar = 1 - zr, ai = -zi;
          const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;
          const nzr = L * mr, nzi = L * mi;
          zr = nzr; zi = nzi;
          if (zr * zr + zi * zi > 100) { inb = false; break; }
        }
        if (inb) n++;
      }
      putPix(d, (j * W + i) * 4, n === 0 ? 0 : 0.12 + 0.82 * (n / K));
    }
  }
}

// Parameter maps. kind 'mu': x -> x^2 - mu, orbit of 0, black = bounded (bottom Plate 188).
// kind 'lam': orbit of 1/2 under lam*z*(1-z), black = bounded, the two discs left empty (top 189).
// kind 'inv': the lam-map seen through the inversion lam' = 1 + 1/(lam - 1) (top Plate 188);
//   world x is Im(lam'), world y is Re(lam') - 1/2, so the sprout images line up along y = 0.
// band = true also shades the escape count in stepped grays: the lemniscates of bottom Plate 189.
function rasterParam(img, v, kind, opts = {}) {
  const { itmax = 420, band = false, discs = true } = opts;
  const W = img.width, H = img.height, d = img.data;
  const px = 1 / v.s, thr = px * 0.7;
  for (let j = 0; j < H; j++) {
    const wy = (v.oy - (j + 0.5)) / v.s;
    for (let i = 0; i < W; i++) {
      const wx = ((i + 0.5) - v.ox) / v.s;
      let pr, pi, thrPix = thr; // the lam (or mu) this pixel asks about, and the pixel size in lam units
      if (kind === 'inv') {
        const ar = wy + 0.5 - 1, ai = wx, dn = ar * ar + ai * ai; // lam' - 1
        if (dn < 1e-12) { putPix(d, (j * W + i) * 4, 0); continue; }
        pr = 1 + ar / dn; pi = -ai / dn;
        thrPix = thr / dn; // the inversion shrinks lam-plane distances by |lam' - 1|^2
      } else { pr = wx; pi = wy; }
      let zr, zi, dr, di;
      if (kind === 'mu') { zr = 0; zi = 0; dr = 0; di = 0; }
      else { zr = 0.5; zi = 0; dr = 0; di = 0; }
      let bounded = true, t = 0, n = 0;
      for (let k = 0; k < itmax; k++) {
        if (kind === 'mu') {
          // z' = 2 z dz - 1 ; z = z^2 - mu
          const ndr = 2 * (zr * dr - zi * di) - 1, ndi = 2 * (zr * di + zi * dr);
          const nzr = zr * zr - zi * zi - pr, nzi = 2 * zr * zi - pi;
          zr = nzr; zi = nzi; dr = ndr; di = ndi;
        } else {
          // dz = z(1-z) + lam(1-2z) dz ; z = lam z (1-z)
          const ar = 1 - zr, ai = -zi;
          const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;
          const sr = 1 - 2 * zr, si = -2 * zi;
          const tr = pr * sr - pi * si, ti = pr * si + pi * sr;
          const ndr = mr + tr * dr - ti * di, ndi = mi + tr * di + ti * dr;
          zr = pr * mr - pi * mi; zi = pr * mi + pi * mr;
          dr = ndr; di = ndi;
        }
        const q = zr * zr + zi * zi;
        if (q > 10000) {
          bounded = false; n = k;
          const az = Math.sqrt(q), ad = Math.sqrt(dr * dr + di * di);
          const dist = ad > 1e-300 ? az * Math.log(az) / ad : 0;
          t = dist < thrPix ? 1 : 0;
          break;
        }
      }
      if (bounded) {
        t = 1;
        if (kind !== 'mu' && discs) {
          const inA = pr * pr + pi * pi < 1, inB = (pr - 2) * (pr - 2) + pi * pi < 1;
          if (inA || inB) t = 0; // the empty discs of the lam-map
        }
      } else if (band && t === 0) {
        // stepped lemniscate grays: domains |f_n(1/2)| < R nest as n grows
        const g = Math.max(0, Math.min(0.5, (n - 4) * 0.035));
        t = g;
      }
      putPix(d, (j * W + i) * 4, t);
    }
  }
}

// Plate 192: along row y = -4/lam, black where the first `order` iterates of x stay in [0, 1].
// Three subsamples per pixel keep the thin high-lambda fingers printing, as the book's ink does.
function rasterFatou(img, v, order) {
  const W = img.width, H = img.height, d = img.data;
  for (let j = 0; j < H; j++) {
    const wy = (v.oy - (j + 0.5)) / v.s;
    const lam = wy < -1e-4 && wy >= -1 ? -4 / wy : 0;
    for (let i = 0; i < W; i++) {
      let t = 0;
      if (lam >= 4) {
        for (let sub = 0; sub < 3 && !t; sub++) {
          const wx = ((i + 0.17 + 0.33 * sub) - v.ox) / v.s;
          if (wx < 0 || wx > 1) continue;
          let x = wx, ok = true;
          for (let k = 0; k < order; k++) { x = lam * x * (1 - x); if (x < 0 || x > 1) { ok = false; break; } }
          if (ok) t = 1;
        }
      }
      putPix(d, (j * W + i) * 4, t);
    }
  }
}

// ---------- Plate 187: silhouettes of the drape ----------
// For each real lam in `lams`, the half-height ymax(x) of the filled set over a row of columns
// (the set is symmetric about the real axis). Coarse sweep down, then bisection.
function drapeProfiles(lams, cols, x0 = -0.72, x1 = 1.72, itmax = 130) {
  const inSet = (lr, xr, yi) => {
    let zr = xr, zi = yi;
    for (let k = 0; k < itmax; k++) {
      const ar = 1 - zr, ai = -zi;
      const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;
      zr = lr * mr; zi = lr * mi;
      if (zr * zr + zi * zi > 100) return false;
    }
    return true;
  };
  const out = [];
  for (const lam of lams) {
    const prof = new Float64Array(cols);
    for (let c = 0; c < cols; c++) {
      const x = x0 + (x1 - x0) * c / (cols - 1);
      // coarse down-sweep to bracket the silhouette's top, then bisect
      let top = -1;
      for (let y = 1.25; y > 0.015; y -= 0.06) if (inSet(lam, x, y)) { top = y; break; }
      if (top < 0) { prof[c] = inSet(lam, x, 0) ? 0.012 : -1; continue; }
      let lo = top, hi = Math.min(1.25, top + 0.06);
      for (let b = 0; b < 7; b++) { const mid = (lo + hi) / 2; if (inSet(lam, x, mid)) lo = mid; else hi = mid; }
      prof[c] = lo;
    }
    out.push({ lam, prof });
  }
  return out;
}
