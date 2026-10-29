// Chapter 35: general tremas. The model code behind both plates — the plane trema fractal of
// Plate 323 (diamond tremas of free aspect) and the spatial trema dust of Plate 325 (ellipsoid
// tremas on a 600³ torus, one octant of a shell projected on the sky). Everything is a Poisson
// trema process: positions and sizes random, the trema length (area, volume) law fixed by D,
// the generator's shape free. No DOM in this file.

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// a deterministic stream per grid cell, so a trema is the same every time its cell is visited
function cellHash(a, b, c, d) {
  let h = Math.imul(a ^ 0x2e1b2137, 0x9e3779b1) ^ Math.imul(b ^ 0x5f356495, 0x85ebca77) ^ Math.imul(c ^ 0x1b873593, 0xc2b2ae3d) ^ Math.imul(d, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return h >>> 0;
}
function poisson(mu, rnd) {
  const L = Math.exp(-mu);
  let k = 0, p = 1;
  do { k++; p *= rnd(); } while (p > L);
  return k - 1;
}

// ====================== Plate 323: diamond tremas in the plane ======================
// Tremas are rhombi ("diamonds") of aspect w = short diagonal / long diagonal, isotropically
// rotated. The number of tremas with area above a, centered per unit area, is K/a with
// K = (2 − D)/2: then a point escapes every trema with probability (aMin/aMax)^K, which depends
// on the area law alone — El Hélou's theorem, and the caption's "identical white areas".
const P323 = { aMax: 0.05, aMin: 3e-5 };
function tremas323(D, w, seed) {
  const K = (2 - D) / 2;
  const pMax = Math.sqrt((2 * P323.aMax) / w);            // long diagonal of the largest diamond
  const m = pMax / 2 + 0.01, side = 1 + 2 * m;            // centers beyond the square still reach it
  const rnd = mulberry(seed);
  const count = Math.round(side * side * K * (1 / P323.aMin - 1 / P323.aMax));
  const T = new Float64Array(count * 5);                  // cx, cy, half long diag, half short diag, angle
  for (let i = 0; i < count; i++) {
    const a = P323.aMin / (1 - rnd() * (1 - P323.aMin / P323.aMax));   // density K/a² between the cutoffs
    const p = Math.sqrt((2 * a) / w);
    T[5 * i] = -m + rnd() * side; T[5 * i + 1] = -m + rnd() * side;
    T[5 * i + 2] = p / 2; T[5 * i + 3] = (w * p) / 2; T[5 * i + 4] = rnd() * Math.PI;
  }
  return T;
}
const whiteExpected323 = (D) => Math.pow(P323.aMin / P323.aMax, (2 - D) / 2);
// fill-only diamond paths in chunks (no closePath: fill() closes each subpath, see DECISIONS.md)
function diamondPaths(T) {
  return chunked(T.length / 5, (p, i) => {
    const cx = T[5 * i], cy = T[5 * i + 1], h1 = T[5 * i + 2], h2 = T[5 * i + 3];
    const co = Math.cos(T[5 * i + 4]), si = Math.sin(T[5 * i + 4]);
    const ux = h1 * co, uy = h1 * si, vx = -h2 * si, vy = h2 * co;
    p.moveTo(cx + ux, cy + uy); p.lineTo(cx + vx, cy + vy); p.lineTo(cx - ux, cy - uy); p.lineTo(cx - vx, cy - vy);
  }, 2048);
}

// ====================== Plate 325: a spatial trema dust on the sky ======================
// The caption's pipeline: a 600³ periodic lattice (a torus), tremas removed, the origin moved to
// a point no trema covers, the lattice points of the shell R1 < |p| ≤ R2 kept, pushed off the
// lattice by a random [0,1] vector, and one octant projected on the sky through the Hammer
// projection. Tremas are ellipsoids with the volume pinned to scale³ ("volume is pinned down
// during resizing"), so D again depends on the volume law alone, and the shape is free.
//
// Scales live in octaves k: scale in (Λ/2^(k+1), Λ/2^k], density (3−D)/r⁴ per unit volume, which
// puts a Poisson(7(3−D)/3) count of tremas in each octave-k grid cell and makes a point escape
// the whole process with probability (smallest scale / largest)^(3−D). Tremas come from a hash of
// their grid cell, so the dust is a fixed function of the seed and can be re-visited cell by cell.
const P325 = { L: 600, kMin: 1, kMax: 7 };               // scales 600/2^8 = 2.34 … 600/2 = 300
const scaleRange325 = () => [P325.L / Math.pow(2, P325.kMax + 1), P325.L / Math.pow(2, P325.kMin)];
function survival325(D) { const [a, b] = scaleRange325(); return Math.pow(a / b, 3 - D); }

// semi-axes per unit scale: [along the symmetry axis, equatorial], with volume (4π/3)·ax·eq² = 1
function shapeAxes(shape, f) {
  const s3 = 3 / (4 * Math.PI);
  if (shape === 'sphere') { const s = Math.cbrt(s3); return [s, s]; }
  if (shape === 'pancake') { const a = Math.cbrt(s3 / f); return [f * a, a]; }
  const a = Math.cbrt(s3 / (f * f)); return [a, f * a];   // needle
}

// dust325Start returns a job whose next() processes one 150-sized block of the octant, so a page
// can spread the computation over frames; dust325 runs the whole job at once (used by tests)
function dust325(opts) {
  const job = dust325Start(opts);
  while (job.next());
  return job;
}
function dust325Start(opts) {
  const { D, shape, f, seed, R2, south, jitter } = opts;
  const L = P325.L, R1 = R2 / 1.5, c = 3 - D, mu = (7 * c) / 3;
  const [sAx, sEq] = shapeAxes(shape, f);
  const bMax = Math.max(sAx, sEq);                        // bounding radius per unit scale
  const axInv = 1 / (sAx * sAx), eqInv = 1 / (sEq * sEq);
  const rnd = mulberry(seed);
  const O = [0, 0, 0];                                    // the origin, a lattice point of the torus

  // Tremas live in one flat stack: 10 floats each — cx, cy, cz, axis x/y/z, 1/ax², 1/eq²,
  // bound², ax·scale (the half-thickness, for the slab test). A node's tremas are a slice of the
  // stack; children append their filtered copies after it and pop them on the way out, so the
  // traversal allocates nothing. Cells are generated from a hash of their wrapped grid index, so
  // the dust is a fixed function of the seed and a cell re-visited yields the same tremas.
  const ST = 10;
  let S = new Float64Array(1 << 16), top = 0;
  const grow = (need) => { if (top + need > S.length) { const n = new Float64Array(Math.max(S.length * 2, top + need)); n.set(S); S = n; } };
  function emitCell(k, jx, jy, jz, x0, y0, z0, x1, y1, z1) {
    const n = 1 << k, rk = L / n;
    const r = mulberry(cellHash(((jx % n) + n) % n, ((jy % n) + n) % n, ((jz % n) + n) % n, (seed ^ (k * 0x9e37)) >>> 0));
    const m = poisson(mu, r), b3 = 1 / (rk * rk * rk), a3 = 8 * b3;
    grow(m * ST);
    for (let t = 0; t < m; t++) {
      const sc = Math.pow(a3 - r() * (a3 - b3), -1 / 3);  // inverse CDF of density ∝ 1/r⁴ on (rk/2, rk]
      const cx = (jx + r()) * rk - O[0], cy = (jy + r()) * rk - O[1], cz = (jz + r()) * rk - O[2];
      const u = 2 * r() - 1, th = r() * 2 * Math.PI, si = Math.sqrt(1 - u * u);
      const nx = si * Math.cos(th), ny = si * Math.sin(th);
      const bb = bMax * bMax * sc * sc;
      // bounding-sphere test against the box, then a slab test across the symmetry axis —
      // flat tremas have huge bounding spheres but are thin, and the slab test knows it
      const dx = Math.max(x0 - cx, 0, cx - x1), dy = Math.max(y0 - cy, 0, cy - y1), dz = Math.max(z0 - cz, 0, cz - z1);
      if (dx * dx + dy * dy + dz * dz > bb) continue;
      const hx = (x1 - x0) / 2, dn = Math.abs(nx * ((x0 + x1) / 2 - cx) + ny * ((y0 + y1) / 2 - cy) + u * ((z0 + z1) / 2 - cz));
      const reach = sAx * sc + hx * (Math.abs(nx) + Math.abs(ny) + Math.abs(u));
      if (dn > reach) continue;
      S[top] = cx; S[top + 1] = cy; S[top + 2] = cz; S[top + 3] = nx; S[top + 4] = ny; S[top + 5] = u;
      S[top + 6] = axInv / (sc * sc); S[top + 7] = eqInv / (sc * sc); S[top + 8] = bb; S[top + 9] = sAx * sc;
      top += ST;
    }
  }
  // all octave-k tremas that can reach the box go onto the stack
  function gather(k, x0, y0, z0, x1, y1, z1) {
    const rk = L / (1 << k), b = bMax * rk;
    const jx0 = Math.floor((O[0] + x0 - b) / rk), jx1 = Math.floor((O[0] + x1 + b) / rk);
    const jy0 = Math.floor((O[1] + y0 - b) / rk), jy1 = Math.floor((O[1] + y1 + b) / rk);
    const jz0 = Math.floor((O[2] + z0 - b) / rk), jz1 = Math.floor((O[2] + z1 + b) / rk);
    for (let jx = jx0; jx <= jx1; jx++) for (let jy = jy0; jy <= jy1; jy++) for (let jz = jz0; jz <= jz1; jz++)
      emitCell(k, jx, jy, jz, x0, y0, z0, x1, y1, z1);
  }
  const inside = (i, x, y, z) => {
    const vx = x - S[i], vy = y - S[i + 1], vz = z - S[i + 2];
    const q = vx * vx + vy * vy + vz * vz;
    if (q > S[i + 8]) return false;
    const t = vx * S[i + 3] + vy * S[i + 4] + vz * S[i + 5];
    return t * t * S[i + 6] + (q - t * t) * S[i + 7] <= 1;
  };
  function covered(x, y, z, kTo = P325.kMax) {
    for (let k = P325.kMin; k <= kTo; k++) {
      top = 0;
      gather(k, x, y, z, x, y, z);
      for (let i = 0; i < top; i += ST) if (inside(i, x, y, z)) return true;
    }
    return false;
  }

  // move the origin to a lattice point that no trema covers ("moved to a nonremoved point");
  // this search runs in plain torus coordinates (O = 0). A whole block can sit inside one large
  // trema, so a block that keeps failing is abandoned for a fresh one.
  let tries = 0, ox = 0, oy = 0, oz = 0, found = false;
  for (let round = 0; round < 24 && !found; round++) {
    const bx = Math.floor(rnd() * L), by = Math.floor(rnd() * L), bz = Math.floor(rnd() * L);
    // a block whose middle sits inside a large trema is almost surely swallowed whole — skip it
    // cheaply; this leans the origin toward a dense region, which the caption allows
    if (covered((bx + 32) % L, (by + 32) % L, (bz + 32) % L, 4)) continue;
    for (let t = 0; t < 8000; t++, tries++) {
      ox = (bx + Math.floor(rnd() * 64)) % L; oy = (by + Math.floor(rnd() * 64)) % L; oz = (bz + Math.floor(rnd() * 64)) % L;
      if (!covered(ox, oy, oz)) { found = true; break; }
    }
  }
  O[0] = ox; O[1] = oy; O[2] = oz;
  top = 0;

  // walk an octree over the octant of the shell, carrying down the tremas that reach each cell;
  // a cell all of whose corners lie in one trema is gone (ellipsoids are convex), and lattice
  // points are only tested inside the small cells that survive
  const sg = south ? -1 : 1;
  const dots = [];                                        // x, y, z per surviving point (jittered)
  let tested = 0;
  // the list for a node at [p0, p1): octaves ≤ k filtered to its box, octave k + 1 gathered by the parent
  function recurse(k, x0, y0, z0, size, p0, p1) {
    const x1 = x0 + size, y1 = y0 + size, z1 = z0 + size;
    // fully swallowed? only a trema at least as wide as the cell's diagonal can manage it
    const need = (3 * size * size) / 4;
    for (let i = p0; i < p1; i += ST) {
      if (S[i + 8] < need) continue;
      let n = 0;
      for (; n < 8 && inside(i, n & 1 ? x1 : x0, n & 2 ? y1 : y0, n & 4 ? z1 : z0); n++);
      if (n === 8) return;
    }
    if (k === P325.kMax) {
      for (let x = Math.ceil(x0); x < x1; x++) for (let y = Math.ceil(y0); y < y1; y++) for (let z = Math.ceil(z0); z < z1; z++) {
        if (sg > 0 ? x <= 0 || y <= 0 || z <= 0 : x >= 0 || y >= 0 || z >= 0) continue;
        const q = x * x + y * y + z * z;
        if (q <= R1 * R1 || q > R2 * R2) continue;
        tested++;
        let dead = false;
        for (let i = p0; i < p1 && !dead; i += ST) dead = inside(i, x, y, z);
        if (dead) continue;
        const jr = mulberry(cellHash(x | 0, y | 0, z | 0, seed ^ 0x5bd1));
        dots.push(jitter ? [x + jr(), y + jr(), z + jr()] : [x, y, z]);
      }
      return;
    }
    // octave k + 1 is gathered once for the whole node; each child then filters its own list
    // from the node's tremas plus that gather
    const h = size / 2, g0 = top;
    gather(k + 1, x0, y0, z0, x1, y1, z1);
    const g1 = top;
    for (let i = 0; i < 8; i++) {
      const cx0 = x0 + (i & 1 ? h : 0), cy0 = y0 + (i & 2 ? h : 0), cz0 = z0 + (i & 4 ? h : 0);
      const cx1 = cx0 + h, cy1 = cy0 + h, cz1 = cz0 + h;
      if (sg > 0 ? cx1 <= 0 || cy1 <= 0 || cz1 <= 0 : cx0 >= 0 || cy0 >= 0 || cz0 >= 0) continue;
      const lo = (a0, a1) => (sg > 0 ? Math.max(a0, 0) : Math.max(-a1, 0));
      const near = lo(cx0, cx1) ** 2 + lo(cy0, cy1) ** 2 + lo(cz0, cz1) ** 2;
      const far = Math.max(cx0 * cx0, cx1 * cx1) + Math.max(cy0 * cy0, cy1 * cy1) + Math.max(cz0 * cz0, cz1 * cz1);
      if (near > R2 * R2 || far <= R1 * R1) continue;
      const q0 = top, mx = (cx0 + cx1) / 2, my = (cy0 + cy1) / 2, mz = (cz0 + cz1) / 2;
      for (let s = 0; s < 2; s++) {
        const a = s ? g0 : p0, b = s ? g1 : p1;
        for (let j = a; j < b; j += ST) {
          const dx = Math.max(cx0 - S[j], 0, S[j] - cx1), dy = Math.max(cy0 - S[j + 1], 0, S[j + 1] - cy1), dz = Math.max(cz0 - S[j + 2], 0, S[j + 2] - cz1);
          if (dx * dx + dy * dy + dz * dz > S[j + 8]) continue;
          const dn = Math.abs(S[j + 3] * (mx - S[j]) + S[j + 4] * (my - S[j + 1]) + S[j + 5] * (mz - S[j + 2]));
          if (dn > S[j + 9] + (h / 2) * (Math.abs(S[j + 3]) + Math.abs(S[j + 4]) + Math.abs(S[j + 5]))) continue;
          grow(ST);
          S.copyWithin(top, j, j + ST);
          top += ST;
        }
      }
      recurse(k + 1, cx0, cy0, cz0, h, q0, top);
      top = q0;
    }
    top = g0;
  }
  // the work, cut into the level-2 blocks (size 150) of the octant that meet the shell
  const kStart = 2, sB = L / (1 << kStart);
  const boxes = [];
  const lo0 = sg > 0 ? 0 : -R2, hiEnd = sg > 0 ? R2 : 0;
  for (let x = Math.floor(lo0 / sB) * sB; x < hiEnd; x += sB)
    for (let y = Math.floor(lo0 / sB) * sB; y < hiEnd; y += sB)
      for (let z = Math.floor(lo0 / sB) * sB; z < hiEnd; z += sB) {
        const lo = (a) => (sg > 0 ? Math.max(a, 0) : Math.max(-a - sB, 0));
        const near = lo(x) ** 2 + lo(y) ** 2 + lo(z) ** 2;
        const far = Math.max(x * x, (x + sB) ** 2) + Math.max(y * y, (y + sB) ** 2) + Math.max(z * z, (z + sB) ** 2);
        if (near > R2 * R2 || far <= R1 * R1) continue;
        boxes.push([x, y, z]);
      }
  let bi = 0;
  return {
    dots, originTries: tries, R1, total: boxes.length,
    get tested() { return tested; },
    get done() { return bi >= boxes.length; },
    next() {
      if (bi >= boxes.length) return false;
      const [x, y, z] = boxes[bi++];
      top = 0;
      for (let k = P325.kMin; k <= kStart; k++) gather(k, x, y, z, x + sB, y + sB, z + sB);
      recurse(kStart, x, y, z, sB, 0, top);
      return bi < boxes.length;
    },
  };
}

// Hammer projection of one octant: latitude φ (from the z axis' equator), longitude λ centered on
// the octant. North: x, y, z > 0, λ = atan2(y, x) − 45°. South (the antipodal octant): x, y, z < 0.
function hammer(phi, lam) {
  const d = Math.sqrt(1 + Math.cos(phi) * Math.cos(lam / 2));
  return [(2 * Math.SQRT2 * Math.cos(phi) * Math.sin(lam / 2)) / d, (Math.SQRT2 * Math.sin(phi)) / d];
}
function projectDot(x, y, z, south) {
  const r = Math.hypot(x, y, z), phi = Math.asin(z / r);
  const lam = Math.atan2(y, x) - (south ? (-3 * Math.PI) / 4 : Math.PI / 4);
  const [X, Y] = hammer(phi, lam);
  return [X, Y, r];
}
// the "gothic ogive window": the equator across the bottom and the two meridians λ = ±45°
function ogiveOutline(south) {
  const P = [], n = 64, s = south ? -1 : 1;
  for (let i = 0; i <= n; i++) P.push(hammer(0, -Math.PI / 4 + (i / n) * (Math.PI / 2)));          // equator
  for (let i = 1; i <= n; i++) P.push(hammer((s * Math.PI * i) / (2 * n), Math.PI / 4));           // up one side
  for (let i = n - 1; i >= 0; i--) P.push(hammer((s * Math.PI * i) / (2 * n), -Math.PI / 4));      // down the other
  return P;
}
