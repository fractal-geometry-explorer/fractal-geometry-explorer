(() => {
  const solveExp = (rs) => dimension(rs); // Σ r^x = 1, shared solver
  const deg = (rad) => (rad * 180 / Math.PI);

  // ====================== the diameter exponent Δ ======================
  const stA = { delta: 3 };
  function bbA() {
    const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (const [x, y, bx, by] of vesselTree(stA.delta, 8)) { bb.x0 = Math.min(bb.x0, x, bx); bb.x1 = Math.max(bb.x1, x, bx); bb.y0 = Math.min(bb.y0, y, by); bb.y1 = Math.max(bb.y1, y, by); }
    return bb;
  }
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, bbA(), 0.05), (f, v) => {
    paper(f, PRINT.paper);
    toWorld(f, v);
    const c = f.ctx;
    for (const [x, y, bx, by, d] of vesselTree(stA.delta, 8)) {
      c.beginPath(); c.moveTo(x, y); c.lineTo(bx, by);
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(d * v.s, 0.6) / v.s; c.lineCap = 'round'; c.stroke();
    }
    toScreen(f);
  });
  function setA(delta) {
    stA.delta = delta;
    $('dAv').textContent = `Δ = ${delta.toFixed(2)}`;
    $('dA').value = String(delta);
    const k = Math.pow(2, -1 / delta), sect = 2 * k * k;
    $('rAk').textContent = k.toFixed(4);
    $('rAs').textContent = sect.toFixed(4) + (Math.abs(sect - 1) < 0.005 ? ' (kept)' : sect > 1 ? ' (grows)' : ' (shrinks)');
    $('rAv').textContent = (1 / sect).toFixed(4);
    markA(delta);
    zA.schedule();
  }
  const presetsA = [['Neurons (Rall)', 1.5], ['Trees, rivers (Leonardo)', 2], ['Arteries', 2.7], ['Lung', 3]];
  const rowA = $('preA');
  const bsA = presetsA.map(([t, v]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.textContent = `${t} · Δ = ${v}`;
    b.addEventListener('click', () => setA(v));
    rowA.append(b);
    return [b, v];
  });
  const markA = (cur) => bsA.forEach(([b, v]) => b.classList.toggle('primary', Math.abs(v - cur) < 1e-9));
  $('dA').addEventListener('input', () => setA(Number($('dA').value)));

  // ====================== Plates 164-165: recursive bronchi ======================
  // Fitted to the scans; o1, o2 are the centre-line setbacks in daughter widths
  const PRE_B = {
    p165top: { r1: 0.718, r2: 0.678, c: 0.148, q: 1, o1: 1, o2: 0.5, up: false, chir1: -1, stages: 10 },
    p165bot: { r1: 0.726, r2: 0.582, c: 0.41, q: 1, o1: 0.9, o2: 0.45, up: false, chir1: -1, stages: 10 },
    p164: { split: true, r1: 0.698, r2: 0.659, c: 0.143, cT: 0.17, q: 0.656, qR: 0.78, o1: 1.2, o2: 0.55, up: true, chir1: -1, chir2: 1, stages: 10 },
  };
  const stB = { ...PRE_B.p165top, preset: 'p165top' };
  const cacheB = {};
  function dataB() {
    const key = [stB.r1, stB.r2, stB.c, stB.q, stB.qR, stB.cT, stB.o1, stB.o2, stB.split, stB.up, stB.stages].join('|');
    if (cacheB.key !== key) {
      const rects = bronchiRects(stB);
      cacheB.key = key;
      cacheB.rects = rects;
      cacheB.bb = bronchiBBox(rects);
    }
    return cacheB;
  }
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, dataB().bb, 0.02), (f, v) => {
    paper(f, PRINT.paper);
    toWorld(f, v);
    const { rects } = dataB();
    solid(f.ctx, bronchiPaths(rects, 0.7 / v.s), PRINT.ink, 0.25 / v.s);
    toScreen(f);
  });
  function readB() {
    const D = solveExp([stB.r1, stB.r2]);
    const delta = stB.q >= 0.999 ? D : solveExp([stB.q * stB.r1, stB.q * stB.r2]);
    $('rBd').textContent = D.toFixed(4);
    $('rBdelta').textContent = delta.toFixed(4) + (stB.q >= 0.999 ? ' = D' : ' < D');
    $('rBn').textContent = fmt(dataB().rects.length);
    $('rBw').textContent = stB.split ? `${stB.q.toFixed(2)} / ${stB.qR.toFixed(2)} per stage` : stB.q >= 0.999 ? 'fixed' : `× ${stB.q.toFixed(2)} per stage`;
  }
  const slidersB = [['bR1', 'r1', (v) => v.toFixed(3)], ['bR2', 'r2', (v) => v.toFixed(3)], ['bC', 'c', (v) => v.toFixed(2)], ['bQ', 'q', (v) => v >= 0.999 ? '1 (fixed width/length)' : v.toFixed(2)]];
  let nudgeB = 0;
  function setB(patch, fromPreset) {
    Object.assign(stB, patch);
    if (!fromPreset) { stB.preset = null; stB.split = false; }
    for (const [id, k, show] of slidersB) { $(id).value = String(stB[k]); $(id + 'v').textContent = show(stB[k]); }
    Object.keys(PRE_B).forEach((p) => $(p).classList.toggle('primary', stB.preset === p));
    sBmark(stB.stages);
    readB();
    zB.refit();
  }
  for (const [id, k, show] of slidersB) {
    $(id).addEventListener('input', () => {
      stB[k] = Number($(id).value);
      $(id + 'v').textContent = show(stB[k]);
      stB.preset = null; stB.split = false;
      Object.keys(PRE_B).forEach((p) => $(p).classList.remove('primary'));
      // coarse pass while the control moves, the full one shortly after
      const full = stB.stages;
      stB.stages = Math.min(full, 8); readB(); zB.refit(); stB.stages = full;
      clearTimeout(nudgeB); nudgeB = setTimeout(() => { readB(); zB.refit(); }, 160);
    });
  }
  const sBmark = stepButtons($('sB'), [2, 4, 6, 8, 10, 12], (v) => String(v), (v) => `${v} stages`, (v) => { stB.stages = v; setB({}, stB.preset !== null); });
  for (const p of Object.keys(PRE_B)) $(p).addEventListener('click', () => setB({ ...PRE_B[p], preset: p }, true));

  // ====================== Plate 163: flower models ======================
  // fitted to the scans: angle, ratio and the slight first-level shrink h
  const PRE_C = {
    cTop: { th: 29.9, r: 0.501, h: 1.0, trim: false },
    cMid: { th: 60.3, r: 0.544, h: 0.98, trim: false },
    cBot: { th: 89.8, r: 0.566, h: 1.06, trim: true },
  };
  const stC = { th: PRE_C.cMid.th, r: PRE_C.cMid.r, h: PRE_C.cMid.h, stages: 12, trim: false, sticksOnly: false, preset: 'cMid' };
  const cacheC = {};
  function dataC() {
    const key = [stC.th, stC.r, stC.h, stC.stages, stC.trim].join('|');
    if (cacheC.key !== key) {
      const u = umbrella(stC.r, stC.th * Math.PI / 180, stC.h, stC.stages, stC.trim);
      cacheC.key = key;
      cacheC.u = u;
      const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      bbox(Float64Array.from(u.tris), bb); bbox(Float64Array.from(u.sticks), bb);
      cacheC.bb = bb;
    }
    return cacheC;
  }
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, dataC().bb, 0.03), (f, v) => {
    paper(f, PRINT.paper);
    toWorld(f, v);
    const { u } = dataC(), c = f.ctx;
    if (!stC.sticksOnly) solid(c, triPaths(u.tris), PRINT.ink, 0.6 / v.s);
    c.strokeStyle = PRINT.ink; c.lineWidth = (stC.sticksOnly ? 1 : 0.8) / v.s;
    const segs = [];
    for (let i = 0; i < u.sticks.length; i += 4) segs.push([u.sticks[i], u.sticks[i + 1], u.sticks[i + 2], u.sticks[i + 3]]);
    c.stroke(segPath(segs));
    toScreen(f);
  });
  function readC() {
    const u = dataC().u, D = Math.log(2) / Math.log(1 / u.r);
    $('rCr').textContent = u.r.toFixed(3);
    $('rCd').textContent = `${D.toFixed(2)} (plane) · ${(D + 1).toFixed(2)} (space)`;
    $('rCn').textContent = fmt(u.sticks.length / 4);
    $('rCcrit').textContent = rCrit(stC.th * Math.PI / 180).toFixed(3);
  }
  let nudgeC = 0;
  function syncC() {
    $('thC').value = String(stC.th);
    $('thCv').textContent = `θ = ${stC.th.toFixed(1)}°`;
    $('trimC').checked = stC.trim; $('stickC').checked = stC.sticksOnly;
    Object.keys(PRE_C).forEach((p) => $(p).classList.toggle('primary', stC.preset === p));
  }
  function setC(patch, fromPreset) {
    Object.assign(stC, patch);
    if (!fromPreset) stC.preset = null;
    syncC();
    readC();
    zC.refit();
  }
  $('thC').addEventListener('input', () => {
    stC.th = Number($('thC').value);
    // off the presets, the ratio follows the largest self-avoiding value
    stC.r = rCrit(stC.th * Math.PI / 180); stC.h = 1; stC.preset = null;
    syncC();
    const full = stC.stages;
    stC.stages = Math.min(full, 9); readC(); zC.refit(); stC.stages = full;
    clearTimeout(nudgeC); nudgeC = setTimeout(() => { readC(); zC.refit(); }, 160);
  });
  $('trimC').addEventListener('change', () => setC({ trim: $('trimC').checked }, true));
  $('stickC').addEventListener('change', () => setC({ sticksOnly: $('stickC').checked }, true));
  for (const p of Object.keys(PRE_C)) $(p).addEventListener('click', () => setC({ ...PRE_C[p], sticksOnly: false, preset: p }, true));

  // ---------- mini figures ----------
  // the book's little diagram: a pipe d splitting into d1 and d2
  $('miniDelta').innerHTML = `
    <g stroke="currentColor" fill="none" stroke-width="0.045">
      <path d="M 0 0.28 L 0.52 0.28 M 0 0.56 L 0.56 0.56"/>
      <path d="M 0.52 0.28 L 0.98 0.02 M 0.66 0.44 L 0.98 0.26"/>
      <path d="M 0.56 0.56 L 1.0 0.74 M 0.66 0.44 L 0.56 0.56" />
      <path d="M 0.66 0.44 L 0.52 0.28" opacity="0"/>
      <path d="M 1.02 0.5 L 0.66 0.44 L 1.0 0.74" opacity="0"/>
      <path d="M 0.66 0.44 L 1.04 0.52"/>
    </g>
    <g font-family="var(--f-mono)" font-size="0.14" fill="currentColor">
      <text x="0.05" y="0.47">d</text><text x="0.86" y="0.13">d₁</text><text x="0.86" y="0.92">d₂</text>
    </g>`;
  // the bronchi junction rule
  $('miniT').innerHTML = `
    <g fill="currentColor" opacity="0.92">
      <rect x="0.44" y="0.30" width="0.16" height="0.68"/>
      <rect x="0.04" y="0.30" width="0.52" height="0.115"/>
      <rect x="0.48" y="0.185" width="0.54" height="0.11"/>
    </g>
    <g font-family="var(--f-mono)" font-size="0.1" fill="currentColor">
      <text x="0.63" y="0.86">ℓ, w = c·ℓ</text><text x="0.02" y="0.56">r₁ℓ</text><text x="0.84" y="0.14">r₂ℓ</text>
    </g>`;
  // a stick and its triangle
  $('miniTri').innerHTML = `
    <g stroke="currentColor" fill="none" stroke-width="0.016">
      <path d="M 0.1 0.95 L 0.62 0.1" />
    </g>
    <path d="M 0.1 0.95 L 0.62 0.1 L 0.86 0.52 Z" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="0.012"/>
    <g font-family="var(--f-mono)" font-size="0.11" fill="currentColor">
      <text x="0.02" y="0.78">θ/2</text><text x="0.56" y="0.33">π−θ</text>
    </g>`;

  setA(3);
  setB({}, true);
  setC({}, true);
})();
