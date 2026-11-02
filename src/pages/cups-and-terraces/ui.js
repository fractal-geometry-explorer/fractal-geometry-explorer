(() => {
  const N_SYN = 256, CROP = 192, UP = 2;
  const pct = (x) => `${(100 * x).toFixed(1)}%`;

  // one upsampled field per (H, seed), shared by the sections that use the same parameters
  const fieldCache = {};
  function field(H, seed) {
    const key = `${H.toFixed(2)}|${seed}`;
    if (!fieldCache[key]) {
      const raw = cropField(fbmSurface(N_SYN, H, seed), N_SYN, CROP, CROP);
      fieldCache[key] = upsample(raw, CROP, CROP, UP);
    }
    return fieldCache[key];
  }
  // offscreen map painter: colors[i] decided per cell by pick(o) -> [r,g,b]
  function paintMap(fd, pick) {
    const off = document.createElement('canvas');
    off.width = fd.w; off.height = fd.h;
    const ictx = off.getContext('2d'), img = ictx.createImageData(fd.w, fd.h);
    for (let o = 0; o < fd.w * fd.h; o++) {
      const [r, g, b] = pick(o);
      img.data[4 * o] = r; img.data[4 * o + 1] = g; img.data[4 * o + 2] = b; img.data[4 * o + 3] = 255;
    }
    ictx.putImageData(img, 0, 0);
    return off;
  }
  const INK = [21, 21, 21], SEA = [236, 235, 230], BLUE = [47, 95, 158], RED = [194, 69, 45];
  function blitWorld(f, v, off) {
    const c = f.ctx;
    toScreen(f);
    c.imageSmoothingEnabled = false;
    c.drawImage(off, v.ox, v.oy - v.s, v.s, v.s);
    c.imageSmoothingEnabled = true;
  }

  // ====================== Korcak's law (page 272) ======================
  const stA = { mode: 'map', H: 0.8, sea: 0.7, seed: 1975 };
  const mapCacheA = {};
  function islandsA() {
    const fd = field(stA.H, stA.seed);
    const level = quantile(fd.data, stA.sea);
    const { comps, labels } = components(fd.data, fd.w, fd.h, level, 1);
    return { fd, level, comps, labels };
  }
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'rank') return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
    return fitBox(f, { x0: -0.01, x1: 1.01, y0: -0.01, y1: 1.01 }, 0.01);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    if (stA.mode === 'map') {
      const key = `${stA.H}|${stA.seed}|${stA.sea.toFixed(2)}`;
      if (!mapCacheA[key]) {
        const { fd, level } = islandsA();
        mapCacheA[key] = paintMap(fd, (o) => (fd.data[o] > level ? INK : SEA));
      }
      blitWorld(f, v, mapCacheA[key]);
    } else {
      toScreen(f);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const { comps } = islandsA();
      const areas = rankedAreas(comps.filter((c0) => !c0.border));   // whole islands only
      if (!areas.length) return;
      const ch = chart(f, { ml: 64, x: { min: 1, max: Math.max(10, areas[0] * 2), log: true, label: 'island area a (cells)' }, y: { min: 1, max: Math.max(10, areas.length * 2), log: true, label: 'islands of area > a' } });
      ch.clip();
      // the law: through rank 10, slope -B
      const B = (2 - stA.H) / 2, aRef = areas[Math.min(9, areas.length - 1)];
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6; c.setLineDash([6, 4]); c.beginPath();
      c.moveTo(ch.X(aRef * Math.pow(10 / 0.5, 1 / B)), ch.Y(0.5 * 1));
      c.lineTo(ch.X(aRef * Math.pow(10 / (areas.length * 1.5), 1 / B)), ch.Y(areas.length * 1.5));
      c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.ink;
      for (let i = 0; i < areas.length; i++) {
        if (areas[i] < 1) break;
        c.beginPath(); c.arc(ch.X(areas[i]), ch.Y(i + 1), 3, 0, 2 * Math.PI); c.fill();
      }
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.red; c.fillText(`Korcak: slope -B = ${(-B).toFixed(2)}`, ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.ink; c.fillText('each dot: one island, ranked', ch.ml + 10, ch.mt + 24);
    }
  });
  const MODES_A = { map: 'The archipelago', rank: 'Ranked areas' };
  function setA(refit) {
    markMA(stA.mode);
    $('HvA').textContent = `H = ${stA.H.toFixed(2)}`;
    $('svA').textContent = pct(stA.sea);
    const D = 2 - stA.H, B = D / 2;
    const { comps } = islandsA();
    const inland = rankedAreas(comps.filter((c0) => !c0.border));
    const areas = inland.filter((a) => a >= 2);
    const slope = korcakSlope(inland);
    $('dimA').textContent = `Pr(A > a) = Fa⁻ᴮ · B = D/2 = ${B.toFixed(2)} · H = ${stA.H.toFixed(2)}, sea ${pct(stA.sea)}`;
    $('cAt').textContent = MODES_A[stA.mode];
    $('cAn').textContent = `H = ${stA.H.toFixed(2)}, coastline D = ${D.toFixed(2)} · seed ${stA.seed}`;
    $('infoA').innerHTML = stA.mode === 'map'
      ? 'Land in ink above a sea level set by area share. Raising H makes coasts smoother and the size scatter steeper-tailed; the biggest component is the "continent" and sits outside the island statistics.'
      : `The dots are this map's islands, largest first; the dashed line is the predicted slope −B = −${B.toFixed(2)} pinned at rank 10. The measured slope wanders with the seed — one map is one sample of the law.`;
    $('rAa').textContent = D.toFixed(2);
    $('rAb').textContent = B.toFixed(2);
    $('rAc').textContent = Number.isFinite(slope) ? (-slope).toFixed(2) : 'too few islands';
    $('rAd').textContent = fmt(areas.length);
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  $('HsA').addEventListener('input', (e) => { stA.H = +e.target.value; setA(false); });
  $('ssA').addEventListener('input', (e) => { stA.sea = +e.target.value; setA(false); });
  $('earthA').addEventListener('click', () => { stA.H = 0.8; $('HsA').value = 0.8; setA(false); });
  $('newA').addEventListener('click', () => { stA.seed++; setA(false); });

  // ====================== Islands against deadvalleys (pages 272-273) ======================
  const stB = { sea: 0.7, seed: 1975 };
  const H_B = 0.8;
  const mapCacheB = {};
  function worldB() {
    const key = `${stB.seed}|${stB.sea.toFixed(2)}`;
    if (!mapCacheB[key]) {
      const fd = field(H_B, stB.seed);
      const level = quantile(fd.data, stB.sea);
      const up = components(fd.data, fd.w, fd.h, level, 1);     // land patches
      const dn = components(fd.data, fd.w, fd.h, level, -1);    // water patches
      // main landmass: the largest land patch; ocean: every water patch touching the border
      const landAreas = up.comps.map((c0) => c0.cells);
      const mainLand = landAreas.indexOf(Math.max(...landAreas, 0));
      const islands = up.comps.filter((c0, i) => i !== mainLand && c0.cells >= 2).map((c0) => c0.cells).sort((a, b) => b - a);
      const deadIds = new Set();
      dn.comps.forEach((c0, i) => { if (!c0.border && c0.cells >= 2) deadIds.add(i); });
      const dead = dn.comps.filter((_, i) => deadIds.has(i)).map((c0) => c0.cells).sort((a, b) => b - a);
      const off = paintMap(fd, (o) => {
        if (fd.data[o] > level) return INK;
        return deadIds.has(dn.labels[o]) ? BLUE : SEA;
      });
      mapCacheB[key] = { off, islands, dead };
    }
    return mapCacheB[key];
  }
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, { x0: -0.01, x1: 1.01, y0: -0.01, y1: 1.01 }, 0.01), (f, v) => {
    paper(f, PRINT.paper);
    blitWorld(f, v, worldB().off);
  });
  function setB(refit) {
    $('svB').textContent = pct(stB.sea);
    const { islands, dead } = worldB();
    $('cBn').textContent = `H = ${H_B}, sea ${pct(stB.sea)} · seed ${stB.seed}`;
    const i10 = islands[9], d10 = dead[9];
    $('infoB').innerHTML = stB.sea >= 0.5
      ? `Mostly ocean: <b>${fmt(islands.length)}</b> islands against <b>${fmt(dead.length)}</b> deadvalleys — the island prefactor wins, as a map of a continent in an ocean suggests. Within the Brown sphere model the lesser area is the more cut up: Pangaea crumbles more than Panthalassia.`
      : `Mostly land: now the deadvalleys take the greater prefactor — <b>${fmt(dead.length)}</b> of them against <b>${fmt(islands.length)}</b> islands. The exponent B never moved; only F did.`;
    $('rBa').textContent = fmt(islands.length);
    $('rBb').textContent = fmt(dead.length);
    $('rBc').textContent = i10 ? `${fmt(i10)} cells` : '— (fewer than 10)';
    $('rBd').textContent = d10 ? `${fmt(d10)} cells` : '— (fewer than 10)';
    if (refit) zB.refit(); else zB.schedule();
  }
  $('ssB').addEventListener('input', (e) => { stB.sea = +e.target.value; setB(false); });
  $('panB').addEventListener('click', () => { stB.sea = 0.75; $('ssB').value = 0.75; setB(false); });
  $('thalB').addEventListener('click', () => { stB.sea = 0.25; $('ssB').value = 0.25; setB(false); });
  $('newB').addEventListener('click', () => { stB.seed++; setB(false); });

  // ====================== Cups and the Devil's terraces (pages 273-276) ======================
  const stC = { mode: 'cut', H: 0.5, seed: 1975 };
  const N_CUT = 2048, N_MAP = 128;
  const cutCache = {}, mapCacheC = {};
  function cut1D() {
    const key = `${stC.H}|${stC.seed}`;
    if (!cutCache[key]) {
      const B = fbmLine(N_CUT, stC.H, stC.seed);
      const { S } = fillCups1D(B);
      cutCache[key] = { B, S, runs: cupRuns(B, S, 1e-9) };
    }
    return cutCache[key];
  }
  function map2D() {
    const key = `${stC.H}|${stC.seed}`;
    if (!mapCacheC[key]) {
      const raw = cropField(fbmSurface(N_SYN, stC.H, stC.seed), N_SYN, N_MAP, N_MAP);
      const S = fillCups2D(raw, N_MAP, N_MAP);
      // shade the filled relief; flood the cups in blue
      const sh = shadeField(S, N_MAP, N_MAP, 14);
      const off = paintMap({ w: N_MAP, h: N_MAP, data: S }, (o) => {
        if (S[o] - raw[o] > 1e-9) return BLUE;
        const g = Math.round(90 + 150 * sh[o]);
        return [g, g, Math.round(g * 0.97)];
      });
      // cup statistics on the map
      let wet = 0, vol = 0;
      const depth = new Float64Array(S.length);
      for (let o = 0; o < S.length; o++) { depth[o] = S[o] - raw[o]; if (depth[o] > 1e-9) wet++; vol += depth[o]; }
      const cups = components(depth, N_MAP, N_MAP, 1e-9, 1).comps;
      mapCacheC[key] = { off, wet: wet / S.length, vol: vol / S.length, cups: cups.length, raw, S };
    }
    return mapCacheC[key];
  }
  const zC = zoomable('wC', 'cC', (f) => {
    if (stC.mode === 'map') return fitBox(f, { x0: -0.01, x1: 1.01, y0: -0.01, y1: 1.01 }, 0.01);
    return fitBox(f, { x0: -0.01, x1: 1.01, y0: -0.45, y1: 0.45 }, 0.02);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    if (stC.mode === 'map') { blitWorld(f, v, map2D().off); return; }
    toWorld(f, v);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const Z = 0.12;                                           // vertical scale: sd of B in world units
    if (stC.mode === 'cut') {
      const { B, S } = cut1D();
      // trapped water: the region between B and S
      c.fillStyle = 'rgba(47,95,158,0.55)';
      c.beginPath();
      c.moveTo(0, B[0] * Z);
      for (let i = 0; i < N_CUT; i++) c.lineTo(i / (N_CUT - 1), S[i] * Z);
      for (let i = N_CUT - 1; i >= 0; i--) c.lineTo(i / (N_CUT - 1), B[i] * Z);
      c.fill();
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.1 / v.s;
      c.beginPath();
      for (let i = 0; i < N_CUT; i++) { const x = i / (N_CUT - 1), y = B[i] * Z; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6 / v.s;
      c.beginPath();
      for (let i = 0; i < N_CUT; i++) { const x = i / (N_CUT - 1), y = S[i] * Z; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
    } else {
      // the staircase alone
      const { S } = cut1D();
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.6 / v.s;
      c.beginPath();
      for (let i = 0; i < N_CUT; i++) { const x = i / (N_CUT - 1), y = S[i] * Z; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
    }
    toScreen(f);
  });
  const MODES_C = { cut: 'A vertical cut', stair: 'The staircase B*', map: 'The filled map' };
  const INFO_C = {
    cut: 'The profile B in ink, the filled level B* in red, trapped water in blue. B* climbs to the summit by jumps over the cups and never comes back down until the summit is passed — the one-dimensional cups are the intervals where red leaves black.',
    stair: 'B* alone: continuous, never decreasing before the summit, constant across every cup — all its rise happens on a set of length zero. Zoom in anywhere: more treads. This is a Lévy devil\'s staircase, the construction of Plates 286–287.',
    map: 'The exact two-dimensional filling, cups flooded in blue over the shaded relief. Water finds every sideways escape a one-dimensional cut would miss, so a row of this map holds less water than the same row filled on its own — yet the cups still pock every scale.',
  };
  function setC(refit) {
    markMC(stC.mode);
    $('HvC').textContent = `H = ${stC.H.toFixed(2)}`;
    $('cCt').textContent = MODES_C[stC.mode];
    $('cCn').textContent = `H = ${stC.H.toFixed(2)} · seed ${stC.seed}`;
    $('infoC').innerHTML = INFO_C[stC.mode];
    if (stC.mode === 'map') {
      const m = map2D();
      $('rCa').textContent = fmt(m.cups);
      $('rCb').textContent = pct(m.wet);
      $('rCc').textContent = '—';
      $('rCd').textContent = `${m.vol.toFixed(3)} sd × area`;
    } else {
      const { B, S, runs } = cut1D();
      let inCups = 0, longest = 0, vol = 0;
      for (const [a, b] of runs) { inCups += b - a; longest = Math.max(longest, b - a); }
      for (let i = 0; i < N_CUT; i++) vol += S[i] - B[i];
      $('rCa').textContent = fmt(runs.length);
      $('rCb').textContent = pct(inCups / N_CUT);
      $('rCc').textContent = pct(longest / N_CUT);
      $('rCd').textContent = `${(vol / N_CUT).toFixed(3)} sd × length`;
    }
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(true); });
  $('HsC').addEventListener('input', (e) => { stC.H = +e.target.value; setC(false); });
  $('brownC').addEventListener('click', () => { stC.H = 0.5; $('HsC').value = 0.5; setC(false); });
  $('newC').addEventListener('click', () => { stC.seed++; setC(false); });

  setA(true); setB(true); setC(true);
})();
