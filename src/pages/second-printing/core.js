// Update-for-the-second-printing core: the map z -> lam(z - 1/z) (Julia basins and its lambda-map,
// Plates VIII and X), the squaring map in quaternions (Plates II and 467, raymarched), and the
// digitised metal-fracture diagrams of page 461.

// ---------- z -> lam(z - 1/z) ----------
// One step; q = |z|^2 is reused by callers that watch for escape and the pole.
function lzStep(lr, li, zr, zi) {
  const q = zr * zr + zi * zi;
  const ar = zr - zr / q, ai = zi + zi / q; // z - 1/z
  return [lr * ar - li * ai, lr * ai + li * ar];
}

// The attracting cycle reached from the critical point i, if any: { p, pts } with pts the cycle in
// orbit order, or null (escape, pole, or no cycle of period <= 64 found).
function lzCycle(lr, li, warm = 8000) {
  let zr = 0, zi = 1;
  for (let k = 0; k < warm; k++) {
    const q = zr * zr + zi * zi;
    if (q > 1e16 || q < 1e-16) return null;
    [zr, zi] = lzStep(lr, li, zr, zi);
  }
  const pts = [[zr, zi]];
  for (let p = 1; p <= 64; p++) {
    const q = zr * zr + zi * zi;
    if (q > 1e16 || q < 1e-16) return null;
    [zr, zi] = lzStep(lr, li, zr, zi);
    const dr = zr - pts[0][0], di = zi - pts[0][1];
    if (dr * dr + di * di < 1e-16) return { p, pts };
    pts.push([zr, zi]);
  }
  return null;
}

const PAPER_RGB = [236, 235, 230], INK_RGB = [21, 21, 21];
function putGray(d, o, g) { d[o] = g[0]; d[o + 1] = g[1]; d[o + 2] = g[2]; d[o + 3] = 255; }
const mix = (t) => [0, 1, 2].map((k) => Math.round(PAPER_RGB[k] + (INK_RGB[k] - PAPER_RGB[k]) * t));

// Julia basins (Plate VIII). cyc from lzCycle; shade = phase of capture, ink where no basin claims
// the pixel (the Julia filigree of "stars"), paper where the orbit escapes to infinity.
function rasterBasins(img, v, lam, cyc, itmax = 600, step = 1) {
  const W = img.width, H = img.height, d = img.data, lr = lam[0], li = lam[1];
  const p = cyc ? cyc.p : 0;
  // one gray per phase, spread over the plate's range (three phases land on the print's grays)
  const shades = Array.from({ length: Math.max(1, p) }, (_, m) => mix(p > 1 ? 0.16 + 0.56 * m / (p - 1) : 0.42));
  const ink = mix(1), pap = mix(0);
  const A = [];
  if (cyc) for (let m = 0; m < p; m++) { A.push([cyc.pts[m][0], cyc.pts[m][1], m]); A.push([-cyc.pts[m][0], -cyc.pts[m][1], m]); }
  for (let j = 0; j < H; j += step) {
    const wy = (v.oy - (j + 0.5)) / v.s;
    for (let i = 0; i < W; i += step) {
      const wx = ((i + 0.5) - v.ox) / v.s;
      let zr = wx, zi = wy, col = ink;
      for (let k = 0; k < itmax; k++) {
        const q = zr * zr + zi * zi;
        if (q > 1e16) { col = pap; break; }
        if (q < 1e-18) break; // the pole: on the Julia set's backward orbit
        const ar = zr - zr / q, ai = zi + zi / q;
        const nzr = lr * ar - li * ai, nzi = lr * ai + li * ar;
        zr = nzr; zi = nzi;
        if (p && k >= 8) {
          for (let m = 0; m < A.length; m++) {
            const dr = zr - A[m][0], di = zi - A[m][1];
            if (dr * dr + di * di < 1e-10) {
              // all points of one basin component reach the same cycle point in step, so the
              // phase (index - step) mod p is constant on the component: a stable shade
              col = shades[(((A[m][2] - k) % p) + p) % p];
              k = itmax; break;
            }
          }
        }
      }
      for (let bj = j; bj < Math.min(H, j + step); bj++) for (let bi = i; bi < Math.min(W, i + step); bi++) putGray(d, (bj * W + bi) * 4, col);
    }
  }
}

// The lambda-map (Plate X), in the print's own orientation: screen x = Im lam, screen y = Re lam,
// so that +1 points up and the white disc |lam + 1/2| < 1/2 hangs at the bottom.
// The print's empirical rule (see the page note): paper where the critical orbit escapes or settles
// on a 2-point limit cycle, solid ink for a limit cycle of any other size, and a dust of sampling
// dots where no cycle is found -- the chaotic lambdas.
function classifyLam(lr, li, warm) {
  let zr = 0, zi = 1;
  for (let k = 0; k < warm; k++) {
    const q = zr * zr + zi * zi;
    if (q > 1e16) return 0;              // escapes: infinity attracts, |lam| > 1
    if (q < 1e-16) return -2;            // hit the pole: counted with the chaotic dust
    [zr, zi] = lzStep(lr, li, zr, zi);
  }
  const sr = zr, si = zi;
  for (let p = 1; p <= 64; p++) {
    const q = zr * zr + zi * zi;
    if (q > 1e16) return 0;
    if (q < 1e-16) return -2;
    [zr, zi] = lzStep(lr, li, zr, zi);
    const dr = zr - sr, di = zi - si;
    if (dr * dr + di * di < 1e-14) return p;
  }
  return -1; // no cycle yet: slow convergence or chaos
}
function rasterLamMap(img, v, opts = {}) {
  const { byPeriod = false, step = 1 } = opts;
  const W = img.width, H = img.height, d = img.data;
  const ink = mix(1), pap = mix(0);
  for (let j = 0; j < H; j += step) {
    const wy = (v.oy - (j + 0.5)) / v.s; // Re lam
    for (let i = 0; i < W; i += step) {
      const wx = ((i + 0.5) - v.ox) / v.s; // Im lam
      let p = classifyLam(wy, wx, 700);
      if (p === -1) p = classifyLam(wy, wx, 2600); // near a disc's edge convergence is slow
      let col = null;
      if (p === 0) col = pap;
      else if (p >= 1) col = byPeriod ? mix(Math.min(0.95, 0.22 + p * 0.09)) : (p === 2 ? pap : ink);
      if (col === null) {
        // chaotic: the book's sparse sampling dust, hashed on the pixel grid so panning is stable
        let h = (i * 374761393 + j * 668265263) ^ (i * j);
        h = (h ^ (h >> 13)) * 1274126177; h = (h ^ (h >> 16)) >>> 0;
        col = (h % 1000) < 170 ? ink : pap;
      }
      for (let bj = j; bj < Math.min(H, j + step); bj++) for (let bi = i; bi < Math.min(W, i + step); bi++) putGray(d, (bj * W + bi) * 4, col);
    }
  }
}

// ---------- the squaring map in quaternions (Plates II and 467) ----------
// q -> q^2 - mu with mu complex, the slice through (1, i, j): the distance-estimate raymarcher of
// Norton's method's descendants, d = |q| log|q| / (2 |dq|).
function quatDE(mr, mi, x, y, z, iter = 16) {
  let qr = x, qi = y, qj = z, qk = 0, dr = 1, di = 0, dj = 0, dk = 0, m2 = 0;
  for (let n = 0; n < iter; n++) {
    const ndr = 2 * (qr * dr - qi * di - qj * dj - qk * dk);
    const ndi = 2 * (qr * di + qi * dr + qj * dk - qk * dj);
    const ndj = 2 * (qr * dj - qi * dk + qj * dr + qk * di);
    const ndk = 2 * (qr * dk + qi * dj - qj * di + qk * dr);
    const nqr = qr * qr - qi * qi - qj * qj - qk * qk - mr;
    const nqi = 2 * qr * qi - mi;
    const nqj = 2 * qr * qj, nqk = 2 * qr * qk;
    dr = ndr; di = ndi; dj = ndj; dk = ndk;
    qr = nqr; qi = nqi; qj = nqj; qk = nqk;
    m2 = qr * qr + qi * qi + qj * qj + qk * qk;
    if (m2 > 256) break;
  }
  const m = Math.sqrt(m2), dm = Math.sqrt(dr * dr + di * di + dj * dj + dk * dk);
  return dm < 1e-30 ? 0 : Math.max(0, 0.5 * m * Math.log(Math.max(m, 1e-9)) / dm);
}

// March one row of the image; the caller chunks rows to keep the page responsive.
function quatRow(row, W, H, j, cam, mr, mi, step = 1) {
  const { px, py, pz, fx, fy, fz, rx, ry, rz, ux, uy, uz, fov, R } = cam;
  for (let i = 0; i < W; i += step) {
    const su = (i + 0.5 - W / 2) / (W / 2) * fov, sv = -(j + 0.5 - H / 2) / (H / 2) * fov;
    let dx = fx + su * rx + sv * ux, dy = fy + su * ry + sv * uy, dz = fz + su * rz + sv * uz;
    const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
    let t = R - 2.3, v = -1;
    for (let s = 0; s < 160; s++) {
      const d = quatDE(mr, mi, px + t * dx, py + t * dy, pz + t * dz);
      if (d < 0.0016) { v = t; break; }
      t += d;
      if (t > R + 2.3) break;
    }
    let g = 255;
    if (v > 0) {
      const hx = px + v * dx, hy = py + v * dy, hz = pz + v * dz, e = 0.004;
      const nx = quatDE(mr, mi, hx + e, hy, hz) - quatDE(mr, mi, hx - e, hy, hz);
      const ny = quatDE(mr, mi, hx, hy + e, hz) - quatDE(mr, mi, hx, hy - e, hz);
      const nz = quatDE(mr, mi, hx, hy, hz + e) - quatDE(mr, mi, hx, hy, hz - e);
      const nl = Math.hypot(nx, ny, nz) || 1;
      const lam = Math.max(0, (nx * cam.lx + ny * cam.ly + nz * cam.lz) / nl);
      g = 38 + 46 * ((nx / nl) * 0.3 + 0.5) + 150 * lam; // ambient wash plus one key light
    }
    row[i] = g;
    if (step > 1) for (let k = 1; k < step && i + k < W; k++) row[i + k] = g;
  }
}
function quatCamera(yawDeg, pitchDeg) {
  const yaw = yawDeg * Math.PI / 180, pitch = pitchDeg * Math.PI / 180, R = 3.2;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const px = R * cp * sy, py = R * sp, pz = R * cp * cy;
  const fx = -px / R, fy = -py / R, fz = -pz / R;
  let rx = fz, rz = -fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
  let lx = -0.5, ly = 0.75, lz = 0.45; const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;
  return { px, py, pz, fx, fy, fz, rx, ry: 0, rz, ux, uy, uz, lx, ly, lz, fov: 0.62, R };
}

// ---------- page 461, digitised at 600 dpi ----------
// Spectral diagram: log10(sum of power above f) against log10(wave number); the printed fitted
// line is the chain of dots, slope -1.768 (D = (4 + slope)/2 = 1.116; the caption prints 1.118).
const SPEC_CURVE = [[1.047,6.742],[1.084,6.678],[1.122,6.611],[1.159,6.531],[1.197,6.491],[1.234,6.486],[1.271,6.467],[1.309,6.336],[1.346,6.23],[1.459,6.021],[1.496,5.955],[1.533,5.9],[1.571,5.856],[1.608,5.853],[1.646,5.81],[1.683,5.761],[1.721,5.628],[1.758,5.493],[1.796,5.474],[1.833,5.45],[1.87,5.398],[1.908,5.261],[1.945,5.194],[1.983,5.197],[2.02,5.069],[2.058,5],[2.095,4.924],[2.132,4.803],[2.17,4.718],[2.207,4.742],[2.245,4.616],[2.282,4.557],[2.32,4.5],[2.357,4.419],[2.394,4.344],[2.432,4.261],[2.469,4.206],[2.507,4.149],[2.544,4.102],[2.582,4.019],[2.619,3.976],[2.657,3.874],[2.694,3.81],[2.731,3.744],[2.769,3.687],[2.806,3.628],[2.844,3.566],[2.881,3.505],[2.919,3.45],[2.956,3.408],[3.068,3.23],[3.106,3.159],[3.143,3.149],[3.181,3.107],[3.218,3.052],[3.255,3.017],[3.293,2.993],[3.33,2.936],[3.368,2.877],[3.405,2.825],[3.443,2.763],[3.48,2.701],[3.518,2.652],[3.555,2.562],[3.592,2.493],[3.63,2.427],[3.667,2.346],[3.705,2.244],[3.761,1.957],[3.798,1.867],[3.836,1.865],[3.873,1.749],[3.911,1.687],[3.948,1.626],[3.985,1.562],[4.023,1.491],[4.06,1.427],[4.098,1.36],[4.135,1.296],[4.191,1.145],[4.229,1.14],[4.266,1.055]];
const SPEC_LINE = { m: -1.7677, b: 8.597 };
const SPEC_DOTS = { cols: [[1.405, [6.07, 5.07, 4.23, 3.40, 2.57, 1.73]], [3.005, [3.31, 2.58, 1.74, 1.03]]],
  chain: [[1.368,6.183],[1.771,5.472],[2.175,4.740],[2.595,4.016],[2.718,3.765],[3.004,3.312],[3.809,1.864],[4.217,1.141]] };
// Slit-island diagram: log10(area) against log10(perimeter). The printed line has slope 1.724,
// D = 2/slope = 1.160 (caption: 1.164); a refit of the recovered markers gives 1.13, but markers
// sitting right on the line resist recovery, so the printed line is the honest reference.
const SLIT_PTS = [[0.945,0.705],[1.043,0.890],[1.204,1.199],[1.226,1.040],[1.232,1.156],[1.233,1.087],[1.444,1.448],[1.555,1.899],[1.556,1.648],[1.624,1.885],[1.669,2.013],[1.742,1.992],[1.819,2.280],[1.863,2.243],[1.865,2.170],[1.869,2.097],[1.917,2.175],[1.921,2.248],[2.029,2.573],[2.063,2.500],[2.076,2.607],[2.117,2.725],[2.124,2.606],[2.197,2.779],[2.360,3.181],[2.463,3.363],[2.581,3.678],[2.587,3.638],[2.642,3.634],[2.686,3.665],[3.087,4.426],[3.315,4.866]];
const SLIT_LINE = { x0: 0.567, y0: 0.014, x1: 3.990, y1: 5.916 }; // slope 1.724 -> D = 1.160
// Charpy impact energy against fractal dimension, 300 Grade Maraging steel heat-treated at six
// temperatures; energies read on the joules axis (the ft-lb axis is offset, see the page note).
const CHARPY = [[1.097, 164, '300°C'], [1.161, 165, '315°C'], [1.153, 139, '360°C'],
  [1.163, 131, '340°C'], [1.224, 85, '370°C'], [1.280, 32, '430°C']];
const CHARPY_LINE = { x0: 1.104, y0: 174, x1: 1.306, y1: 11 };
