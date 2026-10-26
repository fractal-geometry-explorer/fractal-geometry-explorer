(() => {
  const PAPER = PRINT.paper, INK = PRINT.ink;
  const DEFAULT_SEED = 1975;                      // the year of the French Essay
  const nextSeed = (s) => ((s * 1103515245 + 12345) & 0x7fffffff) % 100000 || 1;

  // every heavy figure renders once per parameter change into an offscreen canvas that covers a
  // fixed world rectangle; zooming and panning only re-blit it
  function offscreenFigure(wrapId, canvasId, world, build, opts = {}) {
    const st = { off: null, key: '' };
    const z = zoomable(wrapId, canvasId, (f) => fitBox(f, { x0: world.x0, x1: world.x1, y0: world.y0, y1: world.y1 }, 0.015), (f, v) => {
      paper(f, opts.ground || PAPER);
      const c = f.ctx;
      c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      if (st.off) c.drawImage(st.off, v.ox + world.x0 * v.s, v.oy - world.y1 * v.s, (world.x1 - world.x0) * v.s, (world.y1 - world.y0) * v.s);
      toScreen(f);
    }, { maxZoom: opts.maxZoom || 60 });
    if (opts.ground) z.z.ground = opts.ground;
    z.update = (key, ...args) => {
      if (st.key !== key) { st.off = build(...args); st.key = key; }
      z.schedule();
    };
    return z;
  }
  const makeCanvas = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
  const pct = (x) => `${Math.round(x * 100)}%`;

  // land/sea raster: heights above `level` in ink on paper, bilinear-upsampled for smooth coasts
  function coastRaster(field, w, h, level, scale) {
    const up = upsample(field, w, h, scale), cv = makeCanvas(up.w, up.h), c = cv.getContext('2d');
    const img = c.createImageData(up.w, up.h), d = img.data;
    for (let o = 0; o < up.data.length; o++) {
      const land = up.data[o] > level, k = 4 * o;
      d[k] = land ? 21 : 236; d[k + 1] = land ? 21 : 235; d[k + 2] = land ? 21 : 230; d[k + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    return cv;
  }

  // ====================== Plates 264-265: lake landscapes ======================
  // crop of the periodic surface, lakes flattened, quads shaded and drawn back to front, the
  // block's front face in solid ink
  const LAND_W = 224, LAND_D = 176, CELL = 6;
  function landscapeCanvas(H, seaQ, seed) {
    // the synthesized surface is periodic, so the crop may start on any row; start it where the
    // front rows are lowest, as the plates do, so the viewer looks over low ground into the massif
    const full = fbmSurface(256, H, seed);
    let j0 = 0, best = Infinity;
    for (let j = 0; j < 256; j++) {
      let m = 0;
      for (let jj = 0; jj < 10; jj++) for (let i = 0; i < LAND_W; i += 4) m += full[((j + jj) % 256) * 256 + i + 16];
      if (m < best) { best = m; j0 = j; }
    }
    const field = new Float64Array(LAND_W * LAND_D);
    for (let j = 0; j < LAND_D; j++) for (let i = 0; i < LAND_W; i++) field[j * LAND_W + i] = full[((j0 + j) % 256) * 256 + i + 16];
    const sea = quantile(field, seaQ);
    const z = new Float64Array(field.length);
    for (let i = 0; i < field.length; i++) z[i] = Math.max(field[i], sea);
    const S = Math.sin((25 * Math.PI) / 180);                       // viewer 25 degrees over the base
    const ZS = CELL * LAND_W * 0.057 * Math.cos((25 * Math.PI) / 180);
    const W = (LAND_W - 1) * CELL;
    const Hpx = Math.round(W / 2);                                  // the world rectangle is 2 : 1
    const cv = makeCanvas(W, Hpx), c = cv.getContext('2d');
    c.fillStyle = PAPER; c.fillRect(0, 0, W, Hpx);
    const base = Hpx - 36;
    const sy = (j, v) => base - j * CELL * S - (v - sea) * ZS;
    // light 60 degrees over the left, tipped a little toward the viewer so depth slopes shade too
    const LL = Math.hypot(0.5, 0.16, Math.sin((60 * Math.PI) / 180));
    const LX = -0.5 / LL, LY = 0.16 / LL, LZ = Math.sin((60 * Math.PI) / 180) / LL;
    const k = (ZS / CELL) * 0.8;
    for (let j = LAND_D - 2; j >= 0; j--) {
      for (let i = 0; i < LAND_W - 1; i++) {
        const o = j * LAND_W + i;
        const a = z[o], b = z[o + 1], d2 = z[o + LAND_W], e = z[o + LAND_W + 1];
        const x0 = i * CELL, x1 = x0 + CELL;
        if (a <= sea && b <= sea && d2 <= sea && e <= sea) {
          c.fillStyle = '#f6f5f0';
          c.strokeStyle = c.fillStyle; c.lineWidth = 1;
        } else {
          const gx = ((b - a + e - d2) / 2) * k, gy = ((d2 - a + e - b) / 2) * k;
          const inv = 1 / Math.hypot(gx, gy, 1);
          const lam = Math.max(0, (-gx * LX - gy * LY + LZ) * inv);
          const g = Math.round(18 + 205 * Math.min(1, lam) ** 1.5);
          c.fillStyle = `rgb(${g},${g},${g})`;
          c.strokeStyle = c.fillStyle; c.lineWidth = 1;
        }
        c.beginPath();
        c.moveTo(x0, sy(j, a)); c.lineTo(x1, sy(j, b)); c.lineTo(x1, sy(j + 1, e)); c.lineTo(x0, sy(j + 1, d2));
        c.closePath(); c.fill(); c.stroke();
      }
    }
    // the block's front face, down to the bottom edge
    c.fillStyle = INK;
    c.beginPath();
    c.moveTo(0, Hpx);
    for (let i = 0; i < LAND_W; i++) c.lineTo(i * CELL, sy(0, z[i]));
    c.lineTo(W, Hpx); c.closePath(); c.fill();
    return cv;
  }
  const stA = { D: 2.1, seaQ: 0.3, seed: DEFAULT_SEED };
  const WORLD_A = { x0: 0, x1: 2, y0: 0, y1: 1 };
  const zA = offscreenFigure('wA', 'cA', WORLD_A, (H, q, seed) => landscapeCanvas(H, q, seed));
  const FIGS_A = [
    ['t265', 'Plate 265, top', 2.1], ['b265', 'Plate 265, bottom', 2.2333], ['b264', 'Plate 264, bottom', 2.3667], ['t264', 'Plate 264, top', 2.5],
  ];
  function setA() {
    const H = 3 - stA.D;
    markMA(FIGS_A.reduce((best, [k, , d]) => (Math.abs(d - stA.D) < 0.005 ? k : best), ''));
    $('dAv').textContent = `D = ${stA.D.toFixed(4)}`;
    $('qAv').textContent = `${pct(stA.seaQ)} of the grid under water`;
    const fig = FIGS_A.find(([, , d]) => Math.abs(d - stA.D) < 0.005);
    $('cAt').textContent = fig ? fig[1] : 'Fractional Brown relief';
    $('cAn').textContent = `surface D = ${stA.D.toFixed(2)} · seed ${stA.seed}`;
    $('infoA').innerHTML = stA.D >= 2.49 ? 'The ordinary Brown relief: every vertical cut an ordinary Brown line-to-line function, as in Plate 241. "Conspicuously too irregular in its detail."' : stA.D <= 2.15 ? 'H = 0.8 or so "justifies Plate 265": Richardson\'s data make coastline dimensions typically about 1.2, hence relief about 2.2.' : 'Between the model of Earth (D near 2.2) and the ordinary Brown relief (D = 5/2).';
    $('rAa').textContent = stA.D.toFixed(4);
    $('rAb').textContent = (stA.D - 1).toFixed(4);
    $('rAc').textContent = H.toFixed(4);
    $('rAd').textContent = String(stA.seed);
    zA.update(`${stA.D}|${stA.seaQ}|${stA.seed}`, H, stA.seaQ, stA.seed);
  }
  const markMA = stepButtons($('mA'), FIGS_A.map((f) => f[0]), (k) => FIGS_A.find((f) => f[0] === k)[1].replace('Plate ', ''), (k) => FIGS_A.find((f) => f[0] === k)[1], (k) => {
    stA.D = FIGS_A.find((f) => f[0] === k)[2]; $('dAs').value = stA.D; setA();
  });
  $('dAs').addEventListener('input', () => { stA.D = Number($('dAs').value); setA(); });
  $('qAs').addEventListener('input', () => { stA.seaQ = Number($('qAs').value); setA(); });
  $('seedA').addEventListener('click', () => { stA.seed = nextSeed(stA.seed); setA(); });
  $('plateA').addEventListener('click', () => { Object.assign(stA, { D: 2.1, seaQ: 0.3, seed: DEFAULT_SEED }); $('dAs').value = 2.1; $('qAs').value = 0.3; setA(); zA.refit(); });

  // ====================== Plates 266-267: coastlines ======================
  const COAST_W = 216, COAST_H = 144;
  const stB = { D: 8 / 3, landQ: 0.28, seed: DEFAULT_SEED };
  const WORLD_B = { x0: 0, x1: 3, y0: 0, y1: 2 };
  let statsB = { land: 0, isles: 0 };
  const zB = offscreenFigure('wB', 'cB', WORLD_B, (H, landQ, seed) => {
    const field = cropField(fbmSurface(256, H, seed), 256, COAST_W, COAST_H);
    const level = quantile(field, 1 - landQ);
    statsB = { land: landFraction(field, level), isles: islandCount(field, COAST_W, COAST_H, level) };
    return coastRaster(field, COAST_W, COAST_H, level, 4);
  });
  const FIGS_B = [['p266', 'Plate 266', 8 / 3, '8/3'], ['t267', 'Plate 267, top', 7 / 3, '7/3'], ['b267', 'Plate 267, bottom', 5 / 2, '5/2']];
  function setB() {
    markMB(FIGS_B.reduce((best, [k, , d]) => (Math.abs(d - stB.D) < 0.005 ? k : best), ''));
    const fig = FIGS_B.find(([, , d]) => Math.abs(d - stB.D) < 0.005);
    $('dBv').textContent = `D = ${fig ? fig[3] : stB.D.toFixed(4)} · coastline ${(stB.D - 1).toFixed(4)}`;
    $('qBv').textContent = `${pct(stB.landQ)} land`;
    $('cBt').textContent = fig ? fig[1] : 'Brown coastline';
    $('cBn').textContent = `surface D = ${stB.D.toFixed(2)}, coastline D = ${(stB.D - 1).toFixed(2)} · seed ${stB.seed}`;
    $('infoB').innerHTML = stB.D >= 2.5 ? 'Relief D at or beyond 2.5: the ocean splits into roundish separate "seas", and the islands come in "strings".' : 'Below relief D = 2.5 the ocean hangs together and the island strings fade.';
    zB.update(`${stB.D}|${stB.landQ}|${stB.seed}`, 3 - stB.D, stB.landQ, stB.seed);
    $('rBa').textContent = (stB.D - 1).toFixed(4);
    $('rBb').textContent = pct(statsB.land);
    $('rBc').textContent = fmt(statsB.isles);
    $('rBd').textContent = String(stB.seed);
  }
  const markMB = stepButtons($('mB'), FIGS_B.map((f) => f[0]), (k) => { const f = FIGS_B.find((x) => x[0] === k); return `${f[1].replace('Plate ', '')} · D = ${f[3]}`; }, (k) => FIGS_B.find((f) => f[0] === k)[1], (k) => {
    stB.D = FIGS_B.find((f) => f[0] === k)[2]; $('dBs').value = stB.D; setB();
  });
  $('dBs').addEventListener('input', () => { stB.D = Number($('dBs').value); setB(); });
  $('qBs').addEventListener('input', () => { stB.landQ = Number($('qBs').value); setB(); });
  $('seedB').addEventListener('click', () => { stB.seed = nextSeed(stB.seed); setB(); });
  $('plateB').addEventListener('click', () => { Object.assign(stB, { D: 8 / 3, landQ: 0.28, seed: DEFAULT_SEED }); $('dBs').value = stB.D; $('qBs').value = 0.28; setB(); zB.refit(); });

  // ====================== Plate 268: contour lines ======================
  const CONT_W = 240, CONT_H = 168;
  const stC = { D: 1.3333, slope: 5, seed: DEFAULT_SEED };
  const WORLD_C = { x0: 0, x1: 10, y0: 0, y1: 7 };
  const zC = offscreenFigure('wC', 'cC', WORLD_C, (H, slope, seed) => {
    const base = cropField(fbmSurface(256, H, seed), 256, CONT_W, CONT_H);
    // the side of a huge mountain: a systematic slope from the top of the frame to the bottom
    for (let j = 0; j < CONT_H; j++) for (let i = 0; i < CONT_W; i++) base[j * CONT_W + i] += slope * (0.5 - j / (CONT_H - 1));
    const up = upsample(base, CONT_W, CONT_H, 2);
    const cv = makeCanvas(1200, 840), c = cv.getContext('2d');
    c.fillStyle = PAPER; c.fillRect(0, 0, 1200, 840);
    const sx = 1200 / (up.w - 1), sy2 = 840 / (up.h - 1);
    const spread = Math.max(0.8, slope * 0.22);
    for (const [lvl, lw] of [[spread, 1.3], [0, 3], [-spread, 1.3]]) {
      const segs = contourSegs(up.data, up.w, up.h, lvl);
      c.strokeStyle = INK; c.lineWidth = lw; c.lineCap = 'round';
      c.beginPath();
      for (const [x0, y0, x1, y1] of segs) { c.moveTo(x0 * sx, y0 * sy2); c.lineTo(x1 * sx, y1 * sy2); }
      c.stroke();
    }
    return cv;
  });
  const FIGS_C = [['top', 'Top · D ≈ 1.3333', 1.3333], ['bot', 'Bottom · D ≈ 1.1667', 1.1667]];
  function setC() {
    markMC(FIGS_C.reduce((best, [k, , d]) => (Math.abs(d - stC.D) < 0.003 ? k : best), ''));
    const fig = FIGS_C.find(([, , d]) => Math.abs(d - stC.D) < 0.003);
    $('dCv').textContent = `D = ${stC.D.toFixed(4)}`;
    $('sCv').textContent = stC.slope === 0 ? 'none (a summit)' : `${stC.slope.toFixed(1)} sd across the frame`;
    $('cCt').textContent = fig ? `Plate 268, ${fig[0] === 'top' ? 'top' : 'bottom'}` : 'Contour lines';
    $('infoC').innerHTML = 'Both printed figures share one program and seed; only the exponent H changes. The slider redraws the same relief with a different slope.';
    $('rCa').textContent = stC.D.toFixed(4);
    $('rCb').textContent = (2 - stC.D).toFixed(4);
    $('rCc').textContent = (stC.D + 1).toFixed(4);
    $('rCd').textContent = String(stC.seed);
    zC.update(`${stC.D}|${stC.slope}|${stC.seed}`, 2 - stC.D, stC.slope, stC.seed);
  }
  const markMC = stepButtons($('mC'), FIGS_C.map((f) => f[0]), (k) => FIGS_C.find((f) => f[0] === k)[1], (k) => FIGS_C.find((f) => f[0] === k)[1], (k) => {
    stC.D = FIGS_C.find((f) => f[0] === k)[2]; $('dCs').value = stC.D; setC();
  });
  $('dCs').addEventListener('input', () => { stC.D = Number($('dCs').value); setC(); });
  $('sCs').addEventListener('input', () => { stC.slope = Number($('sCs').value); setC(); });
  $('seedC').addEventListener('click', () => { stC.seed = nextSeed(stC.seed); setC(); });
  $('plateC').addEventListener('click', () => { Object.assign(stC, { D: 1.3333, slope: 5, seed: DEFAULT_SEED }); $('dCs').value = stC.D; $('sCs').value = 5; setC(); zC.refit(); });

  // ====================== Plate 269: Brownian Pangaea ======================
  const stD = { q: 0.75, faults: 1600, seed: DEFAULT_SEED, grat: true };
  const NLAT = 121, NLON = 241;
  const WORLD_D = { x0: 0, x1: 2, y0: 0, y1: 1 };
  let sphereCache = { key: '', h: null };
  const zD = offscreenFigure('wD', 'cD', WORLD_D, (q, faults, seed, grat) => {
    const skey = `${faults}|${seed}`;
    if (sphereCache.key !== skey) sphereCache = { key: skey, h: sphereFaults(NLAT, NLON, faults, seed) };
    const h = sphereCache.h, sea = sphereSeaLevel(h, NLAT, NLON, q);
    // rotate the sphere so the main landmass faces the map's centre, as the plate frames its Pangaea
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < NLAT; j++) {
      const lat = ((-90 + (180 * j) / (NLAT - 1)) * Math.PI) / 180, w = Math.cos(lat);
      for (let i = 0; i < NLON; i++) {
        if (h[j * NLON + i] <= sea) continue;
        const lon = ((-180 + (360 * i) / (NLON - 1)) * Math.PI) / 180;
        cx += w * w * Math.cos(lon); cy += w * w * Math.sin(lon); cz += w * Math.sin(lat);
      }
    }
    const cl = Math.hypot(cx, cy, cz) || 1;
    cx /= cl; cy /= cl; cz /= cl;
    const tLat = (15 * Math.PI) / 180, t = [Math.cos(tLat), 0, Math.sin(tLat)];
    // Rodrigues rotation taking t to the land centroid c; sampling through it recentres the land
    const ax = t[1] * cz - t[2] * cy, ay = t[2] * cx - t[0] * cz, az = t[0] * cy - t[1] * cx;
    const sA = Math.hypot(ax, ay, az), cA = t[0] * cx + t[1] * cy + t[2] * cz;
    const [ux, uy, uz] = sA > 1e-9 ? [ax / sA, ay / sA, az / sA] : [0, 0, 1];
    const rot = (v) => {
      const d = ux * v[0] + uy * v[1] + uz * v[2];
      const crx = uy * v[2] - uz * v[1], cry = uz * v[0] - ux * v[2], crz = ux * v[1] - uy * v[0];
      return [v[0] * cA + crx * sA + ux * d * (1 - cA), v[1] * cA + cry * sA + uy * d * (1 - cA), v[2] * cA + crz * sA + uz * d * (1 - cA)];
    };
    const W = 1280, Hh = 640, cv = makeCanvas(W, Hh), c = cv.getContext('2d');
    c.fillStyle = PAPER; c.fillRect(0, 0, W, Hh);
    const img = c.createImageData(W, Hh), d = img.data;
    const X0 = 2 * Math.SQRT2, Y0 = Math.SQRT2;
    for (let py = 0; py < Hh; py++) {
      const y = Y0 - (2 * Y0 * (py + 0.5)) / Hh;
      for (let px = 0; px < W; px++) {
        const x = -X0 + (2 * X0 * (px + 0.5)) / W, inv = hammerInv(x, y), o = 4 * (py * W + px);
        if (!inv) { d[o] = 236; d[o + 1] = 235; d[o + 2] = 230; d[o + 3] = 255; continue; }
        const cl0 = Math.cos(inv[1]);
        const [vx, vy, vz] = rot([cl0 * Math.cos(inv[0]), cl0 * Math.sin(inv[0]), Math.sin(inv[1])]);
        const lon = Math.atan2(vy, vx), lat = Math.asin(Math.max(-1, Math.min(1, vz)));
        const fj = ((lat * 180) / Math.PI + 90) / (180 / (NLAT - 1)), fi = ((lon * 180) / Math.PI + 180) / (360 / (NLON - 1));
        const j0 = Math.max(0, Math.min(NLAT - 2, Math.floor(fj))), i0 = Math.max(0, Math.min(NLON - 2, Math.floor(fi)));
        const ty = fj - j0, tx = fi - i0, oo = j0 * NLON + i0;
        const v = h[oo] * (1 - tx) * (1 - ty) + h[oo + 1] * tx * (1 - ty) + h[oo + NLON] * (1 - tx) * ty + h[oo + NLON + 1] * tx * ty;
        const land = v > sea;
        d[o] = land ? 21 : 236; d[o + 1] = land ? 21 : 235; d[o + 2] = land ? 21 : 230; d[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    const toPx = (lon, lat) => { const [x, y] = hammer(lon, lat); return [((x + X0) / (2 * X0)) * W, ((Y0 - y) / (2 * Y0)) * Hh]; };
    if (grat) {
      c.strokeStyle = 'rgba(21,21,21,0.55)'; c.lineWidth = 1.1;
      c.globalCompositeOperation = 'darken';
      for (let lonD = -180; lonD <= 180; lonD += 30) {
        c.beginPath();
        for (let latD = -90; latD <= 90; latD += 2) { const [x, y] = toPx((lonD * Math.PI) / 180, (latD * Math.PI) / 180); latD === -90 ? c.moveTo(x, y) : c.lineTo(x, y); }
        c.stroke();
      }
      for (let latD = -60; latD <= 60; latD += 30) {
        c.beginPath();
        for (let lonD = -180; lonD <= 180; lonD += 2) { const [x, y] = toPx((lonD * Math.PI) / 180, (latD * Math.PI) / 180); lonD === -180 ? c.moveTo(x, y) : c.lineTo(x, y); }
        c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
    }
    c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath();
    c.ellipse(W / 2, Hh / 2, W / 2 - 1.5, Hh / 2 - 1.5, 0, 0, 2 * Math.PI);
    c.stroke();
    return cv;
  });
  function setD() {
    $('qDv').textContent = pct(stD.q);
    $('fDv').textContent = fmt(stD.faults);
    $('cDn').textContent = `${pct(stD.q)} of the area under water · ${fmt(stD.faults)} faults · seed ${stD.seed}`;
    $('infoD').innerHTML = 'Each fault is a random great circle: one side of the planet steps up, the other down. Enough of them converge to Lévy\'s Brown sphere-to-line function.';
    $('rDb').textContent = pct(stD.q);
    $('rDc').textContent = fmt(stD.faults);
    $('rDd').textContent = String(stD.seed);
    zD.update(`${stD.q}|${stD.faults}|${stD.seed}|${stD.grat}`, stD.q, stD.faults, stD.seed, stD.grat);
  }
  $('qDs').addEventListener('input', () => { stD.q = Number($('qDs').value); setD(); });
  $('fDs').addEventListener('change', () => { stD.faults = Number($('fDs').value); setD(); });
  $('gratD').addEventListener('change', () => { stD.grat = $('gratD').checked; setD(); });
  $('seedD').addEventListener('click', () => { stD.seed = nextSeed(stD.seed); setD(); });
  $('plateD').addEventListener('click', () => { Object.assign(stD, { q: 0.75, faults: 1600, seed: DEFAULT_SEED, grat: true }); $('qDs').value = 0.75; $('fDs').value = 1600; $('gratD').checked = true; setD(); zD.refit(); });

  // ====================== Plate 270: the first Brown coastlines ======================
  // four panels, one seed; unequal heights and growing land shares follow the print
  const PANELS_E = [
    { D: 1.1, land: 0.035, h: 76 }, { D: 1.3, land: 0.09, h: 112 }, { D: 1.5, land: 0.24, h: 216 }, { D: 1.8, land: 0.42, h: 236 },
  ];
  const PANEL_W = 224;
  const stE = { mode: 'printed', D: 1.3, landQ: 0.25, seed: DEFAULT_SEED };
  const WORLD_E = { x0: 0, x1: 10, y0: 0, y1: 16 };
  let statsE = { land: 0 };
  const zE = offscreenFigure('wE', 'cE', WORLD_E, (mode, D, landQ, seed) => {
    const upscale = 3, pxW = PANEL_W * upscale;
    const cv = makeCanvas(pxW + 8, Math.round((pxW + 8) * 1.6)), c = cv.getContext('2d');
    c.fillStyle = PAPER; c.fillRect(0, 0, cv.width, cv.height);
    const panels = mode === 'printed' ? PANELS_E : [{ D, land: landQ, h: Math.round(PANEL_W * 1.45) }];
    const totalH = panels.reduce((s, p) => s + p.h, 0);
    const scaleY = (cv.height - 8) / (totalH * upscale);
    let y = 4;
    for (const p of panels) {
      // the field is one seed for all panels; each panel crops a band of its own height
      const rows = Math.min(236, p.h);
      const field = cropField(fbmSurface(256, 2 - p.D, seed), 256, PANEL_W, rows);
      const level = quantile(field, 1 - p.land);
      if (mode !== 'printed') statsE = { land: landFraction(field, level) };
      const panelCv = coastRaster(field, PANEL_W, rows, level, upscale);
      const drawH = p.h * upscale * scaleY;
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(panelCv, 4, y, pxW, drawH);
      c.strokeStyle = INK; c.lineWidth = 2;
      c.strokeRect(4, y, pxW, drawH);
      y += drawH;
    }
    return cv;
  });
  const MODES_E = { printed: 'The four panels, as printed', single: 'One panel, with sliders' };
  function setE() {
    markME(stE.mode);
    $('dEwrap').hidden = $('qEwrap').hidden = stE.mode === 'printed';
    $('dEv').textContent = `D = ${stE.D.toFixed(4)}`;
    $('qEv').textContent = `${pct(stE.landQ)} land`;
    $('cEt').textContent = stE.mode === 'printed' ? 'As printed' : 'One panel';
    $('cEn').textContent = stE.mode === 'printed' ? `four panels, one seed (${stE.seed})` : `coastline D = ${stE.D.toFixed(2)} · seed ${stE.seed}`;
    $('infoE').innerHTML = stE.mode === 'printed' ? 'Top to bottom: D = 1.1 (near 1), 1.3000 (the Atlas game), 3/2, 1.8 (closer to 2).' : 'One coastline with the dimension and sea level free. Finer tests favor D ≈ 1.2, the Richardson value.';
    $('rEb').textContent = stE.mode === 'printed' ? '—' : stE.D.toFixed(4);
    $('rEc').textContent = stE.mode === 'printed' ? '3.5 · 9 · 24 · 42%' : pct(statsE.land);
    $('rEd').textContent = String(stE.seed);
    zE.update(`${stE.mode}|${stE.D}|${stE.landQ}|${stE.seed}`, stE.mode, stE.D, stE.landQ, stE.seed);
    if (stE.mode !== 'printed') $('rEc').textContent = pct(statsE.land);
  }
  const markME = stepButtons($('mE'), Object.keys(MODES_E), (k) => MODES_E[k], (k) => MODES_E[k], (k) => { stE.mode = k; setE(); zE.refit(); });
  $('dEs').addEventListener('input', () => { stE.D = Number($('dEs').value); setE(); });
  $('qEs').addEventListener('input', () => { stE.landQ = Number($('qEs').value); setE(); });
  $('seedE').addEventListener('click', () => { stE.seed = nextSeed(stE.seed); setE(); });
  $('plateE').addEventListener('click', () => { Object.assign(stE, { mode: 'printed', seed: DEFAULT_SEED }); setE(); zE.refit(); });

  // ====================== Plate 271: an island with varying sea level ======================
  // white raster lines on black, hidden lines removed with a horizon buffer, as on the 1976 CRT
  const ISL_N = 144;
  let islandField = { key: '', z: null, levels: null };
  function islandData(seed) {
    const key = String(seed);
    if (islandField.key === key) return islandField;
    const z = cropField(fbmSurface(256, 0.7, seed), 256, ISL_N, ISL_N);
    // gentle taper so the island emerges in view, not at the sheet's edge (a presentation choice)
    for (let j = 0; j < ISL_N; j++) {
      for (let i = 0; i < ISL_N; i++) {
        const dx = (i / (ISL_N - 1)) * 2 - 1, dy = (j / (ISL_N - 1)) * 2 - 1;
        z[j * ISL_N + i] -= 1.1 * (dx * dx + dy * dy);
      }
    }
    islandField = { key, z, levels: null };
    return islandField;
  }
  // draw one sheet into c; returns nothing. Rows front to back; a horizon buffer hides what lies behind.
  function drawSheet(c, z, sea, x0, y0, w, skew, dy, zs, step) {
    const n = ISL_N, dx = w / (n - 1);
    const minY = new Float64Array(Math.ceil(w + skew * (n - 1)) + 8).fill(1e9);
    // the sheet's base and front skirt in solid black, so the sheet hides whatever lies behind it
    const back = (n - 1) * dy;
    c.fillStyle = '#101010';
    c.beginPath();
    c.moveTo(x0 - 3, y0 + 12);
    c.lineTo(x0 + skew * (n - 1) - 3, y0 - back - 6);
    c.lineTo(x0 + skew * (n - 1) + w + 3, y0 - back - 6);
    c.lineTo(x0 + w + 3, y0 + 12);
    c.closePath(); c.fill();
    c.strokeStyle = '#e8e7e2'; c.lineWidth = 1;
    for (let j = 0; j < n; j += step) {
      const ox = x0 + skew * j, oy = y0 - j * dy;
      c.beginPath();
      let pen = false;
      for (let i = 0; i < n; i++) {
        const v = Math.max(z[j * ISL_N + i], sea);
        const px = ox + i * dx, py = oy - (v - sea) * zs;
        const col = Math.max(0, Math.min(minY.length - 1, Math.round(px - x0)));
        if (py < minY[col] - 0.4) {
          minY[col] = py;
          if (!pen) { c.moveTo(px, py); pen = true; } else c.lineTo(px, py);
        } else pen = false;
      }
      c.stroke();
    }
  }
  const stF = { mode: 'printed', aboveQ: 0.2, seed: DEFAULT_SEED };
  const SEAS_F = [0.975, 0.955, 0.925, 0.875, 0.79, 0.68];               // area quantiles: land grows down the page
  const WORLD_F = { x0: 0, x1: 10, y0: 0, y1: 13 };
  const zF = offscreenFigure('wF', 'cF', WORLD_F, (mode, aboveQ, seed) => {
    const { z } = islandData(seed);
    const W = 1000, Hh = 1300, cv = makeCanvas(W, Hh), c = cv.getContext('2d');
    c.fillStyle = '#101010'; c.fillRect(0, 0, W, Hh);
    if (mode === 'printed') {
      const sheetW = 560, skew = 1.15, dy = 1.45, zs = 46;
      SEAS_F.forEach((q, k) => {
        const sea = quantile(z, q);
        drawSheet(c, z, sea, 60 + k * 18, 330 + k * 190, sheetW, skew, dy, zs, 2);
      });
    } else {
      const sea = quantile(z, 1 - aboveQ);
      drawSheet(c, z, sea, 90, 1120, 780, 0.5, 4.4, 150, 1);
    }
    return cv;
  }, { ground: '#101010' });
  const MODES_F = { printed: 'The six views, as printed', single: 'One island, sea level free' };
  function setF() {
    markMF(stF.mode);
    $('qFwrap').hidden = stF.mode === 'printed';
    $('qFv').textContent = `${pct(stF.aboveQ)} of the sheet above water`;
    $('cFt').textContent = stF.mode === 'printed' ? 'As printed' : 'One island';
    $('cFn').textContent = stF.mode === 'printed' ? `sea level falls from panel to panel · seed ${stF.seed}` : `seed ${stF.seed}`;
    $('infoF').innerHTML = stF.mode === 'printed' ? 'Six views of one island, the sea falling: specks, then a peninsula, then "small islands scattered like seeds at the tip of a narrow peninsula".' : 'Raise and lower the sea around the one island. The flat rows are the sea; their raster makes it shimmer toward the horizon.';
    $('rFc').textContent = stF.mode === 'printed' ? '0.5 → 38%' : pct(stF.aboveQ);
    $('rFd').textContent = String(stF.seed);
    zF.update(`${stF.mode}|${stF.aboveQ}|${stF.seed}`, stF.mode, stF.aboveQ, stF.seed);
  }
  const markMF = stepButtons($('mF'), Object.keys(MODES_F), (k) => MODES_F[k], (k) => MODES_F[k], (k) => { stF.mode = k; setF(); zF.refit(); });
  $('qFs').addEventListener('input', () => { stF.aboveQ = Number($('qFs').value); setF(); });
  $('seedF').addEventListener('click', () => { stF.seed = nextSeed(stF.seed); setF(); });
  $('plateF').addEventListener('click', () => { Object.assign(stF, { mode: 'printed', aboveQ: 0.2, seed: DEFAULT_SEED }); $('qFs').value = 0.2; setF(); zF.refit(); });

  // first paint
  setA(); setB(); setC(); setD(); setE(); setF();
})();
