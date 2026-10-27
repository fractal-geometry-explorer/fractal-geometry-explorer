(() => {
  const ink = [21, 21, 21], paperC = [236, 235, 230];
  const shade = (a) => `rgb(${paperC.map((v, i) => Math.round(v + (ink[i] - v) * a)).join(',')})`;
  const UNIT = { x0: 0, x1: 1, y0: 0, y1: 1 };
  const log5 = Math.log(5);

  // ================= Plates 218–219: Hoyle curdling =================
  // Shades fitted to the print: the stage squares read at about 0.27, 0.52 and 0.82 of full ink.
  const A_SHADES = [0.27, 0.52, 0.82, 0.9];
  const A = { seed: 7, aloneSeed: 9, stage: 3, alone: false, stages: null, usedSeed: 7 };
  const buildA = () => { A.usedSeed = A.alone ? A.aloneSeed : A.seed; A.stages = hoyleStages(4, A.usedSeed); };
  buildA();
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, UNIT, 0.035), (f, v) => {
    paper(f, PRINT.paper);
    const c = f.ctx;
    toScreen(f);
    const ks = A.alone ? [A.stage] : Array.from({ length: A.stage }, (_, i) => i + 1);
    for (const k of ks) {
      const side = Math.pow(5, -k);
      c.fillStyle = shade(A.alone ? 0.82 : A_SHADES[k - 1]);
      for (const [x, y] of project(A.stages[k - 1])) c.fillRect(v.ox + x * side * v.s, v.oy - (y + 1) * side * v.s, side * v.s + 0.25, side * v.s + 0.25);
    }
    c.strokeStyle = PRINT.rule; c.lineWidth = 1;
    c.strokeRect(v.ox, v.oy - v.s, v.s, v.s);
  });
  const sA = stepButtons($('sA'), [1, 2, 3, 4], (v) => String(v), (v) => `stage ${v}`, (v) => { A.stage = v; updateA(); });
  const mA = stepButtons($('mA'), [0, 1], (v) => (v ? 'One stage alone' : 'Stages superposed'), (v) => (v ? 'one stage alone' : 'stages superposed'), (v) => { A.alone = !!v; updateA(); });
  function updateA(refit) {
    buildA();
    sA(A.stage); mA(A.alone ? 1 : 0);
    $('sAv').textContent = `stage ${A.stage}`;
    const cubes = A.stages[A.stage - 1].length, squares = project(A.stages[A.stage - 1]).length;
    $('cAt').textContent = A.alone ? 'One stage alone' : 'Stages superposed';
    $('cAs').textContent = String(A.stage);
    $('cAn').textContent = `${fmt(cubes)} cubes`;
    $('rAa').textContent = fmt(cubes);
    $('rAb').textContent = fmt(squares);
    $('rAc').textContent = `5^−${A.stage} ≈ ${Math.pow(5, -A.stage).toPrecision(3)}`;
    $('infoA').innerHTML = `Seed <b>${A.usedSeed}</b> · every surviving cube collapses into 5 of its 125 subcubes, so the k-precurd is 5<sup>k</sup> cubes of side 5<sup>−k</sup>, and D = log 5/log 5 = 1. The drawing is the projection on a face of the initiator cube.`;
    if (refit) zA.refit(); else zA.schedule();
  }
  $('plate219').addEventListener('click', () => { A.alone = false; A.stage = 3; A.seed = 7; updateA(true); });
  $('plate218').addEventListener('click', () => { A.alone = true; A.stage = 4; A.aloneSeed = 9; updateA(true); });
  $('reseedA').addEventListener('click', () => { const s = (Math.random() * 1e9) | 0; if (A.alone) A.aloneSeed = s; else A.seed = s; updateA(); });

  // ================= Plates 220–223: Novikov–Stewart =================
  const S = 625;
  const B = { seed: 1982, N: 19, splice: false, M: null, cache: new Map() };
  B.M = rankField(B.seed);
  // Plate 220's splice seam, measured from the scan: from 0.571 of the width on the bottom
  // edge to 0.742 of the height (counted from the bottom) on the right edge. Below it, N = 24.
  const SEAM = { bx: 0.571, ry: 0.742 };
  const inCorner = (ux, uy) => uy < ((ux - SEAM.bx) * SEAM.ry) / (1 - SEAM.bx);
  const NofSplice = (x, y) => (inCorner((x + 0.5) / S, 1 - (y + 0.5) / S) ? 24 : 22);
  const CLS_COLORS = [shade(0.22), shade(0.95), shade(0)];
  function fieldB() {
    const key = B.splice ? 'splice' : B.N;
    if (!B.cache.has(key)) {
      const r = classify(B.M, B.splice ? NofSplice : () => B.N);
      const img = new ImageData(S, S), d = img.data;
      const rgb = CLS_COLORS.map((c) => c.match(/\d+/g).map(Number));
      for (let i = 0; i < S * S; i++) { const [cr, cg, cb] = rgb[r.cls[i]]; d[4 * i] = cr; d[4 * i + 1] = cg; d[4 * i + 2] = cb; d[4 * i + 3] = 255; }
      r.snapshot = document.createElement('canvas');
      r.snapshot.width = S; r.snapshot.height = S;
      r.snapshot.getContext('2d').putImageData(img, 0, 0);
      B.cache.set(key, r);
    }
    return B.cache.get(key);
  }
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, UNIT, 0.025), (f, v) => {
    paper(f, PRINT.paper);
    const c = f.ctx, r = fieldB(), cell = v.s / S, top = v.oy - v.s;
    toScreen(f);
    if (cell < 7) {
      c.imageSmoothingEnabled = cell < 2;
      c.drawImage(r.snapshot, v.ox, top, v.s, v.s);
      c.imageSmoothingEnabled = true;
    } else {
      // zoomed far enough to draw the print's own texture: a small cross per whey cell
      const x0 = Math.max(0, Math.floor(-v.ox / cell)), x1 = Math.min(S, Math.ceil((f.w - v.ox) / cell));
      const y0 = Math.max(0, Math.floor(-top / cell)), y1 = Math.min(S, Math.ceil((f.h - top) / cell));
      const arm = cell * 0.26, bar = cell * 0.12;
      c.fillStyle = CLS_COLORS[1];
      for (let y = y0; y < y1; y++) { const row = y * S, py = top + y * cell; for (let x = x0; x < x1; x++) if (r.cls[row + x] === 1) c.fillRect(v.ox + x * cell, py, cell + 0.25, cell + 0.25); }
      c.fillStyle = shade(0.78);
      for (let y = y0; y < y1; y++) {
        const row = y * S, cy = top + (y + 0.5) * cell;
        for (let x = x0; x < x1; x++) if (r.cls[row + x] === 0) {
          const cx = v.ox + (x + 0.5) * cell;
          c.fillRect(cx - arm, cy - bar / 2, 2 * arm, bar);
          c.fillRect(cx - bar / 2, cy - arm, bar, 2 * arm);
        }
      }
    }
    if (B.splice) {
      c.strokeStyle = PRINT.paper; c.lineWidth = Math.max(1.5, v.s / 900);
      c.beginPath();
      c.moveTo(v.ox + SEAM.bx * v.s, v.oy);
      c.lineTo(v.ox + v.s, v.oy - SEAM.ry * v.s);
      c.stroke();
    }
    c.strokeStyle = PRINT.rule; c.lineWidth = 1;
    c.strokeRect(v.ox, top, v.s, v.s);
  });
  const dOf = (n) => Math.log(n) / log5;
  const B_PRESETS = { plate220: 'splice', plate221: 19, plate222: 16, plate223: 13 };
  function updateB(refit) {
    $('nB').value = String(B.N);
    $('nBv').textContent = B.splice ? 'N = 22, corner 24' : `N = ${B.N} of 25`;
    const r = fieldB(), at = B.splice ? 'splice' : B.N;
    for (const [id, v] of Object.entries(B_PRESETS)) $(id).setAttribute('aria-pressed', String(v === at));
    $('rBa').textContent = B.splice ? `${dOf(22).toFixed(4)} | ${dOf(24).toFixed(4)}` : dOf(B.N).toFixed(4);
    $('rBb').textContent = B.splice ? `${(1 + dOf(22)).toFixed(4)} | ${(1 + dOf(24)).toFixed(4)}` : (1 + dOf(B.N)).toFixed(4);
    $('rBc').textContent = fmt(r.clusters);
    $('rBd').textContent = r.percolating ? `yes · ${r.percolating === 1 ? 'one cluster' : r.percolating + ' clusters'}` : 'no';
    $('cBt').textContent = B.splice ? 'Plate 220: two dimensions spliced' : `N = ${B.N}`;
    $('cBn').textContent = `${fmt(r.curd)} of ${fmt(S * S)} cells are curd`;
    $('infoB').innerHTML = `Seed <b>${B.seed}</b> · stage 4, a 625 × 625 grid. One random stacking of every eddy's 25 subeddies serves every N: lowering N "grays away" the top of each stack, so these curds are nested, as in the book.`;
    if (refit) zB.refit(); else zB.schedule();
  }
  $('nB').addEventListener('input', () => { B.N = Number($('nB').value); B.splice = false; updateB(); });
  for (const [id, v] of Object.entries(B_PRESETS)) $(id).addEventListener('click', () => { B.splice = v === 'splice'; if (v !== 'splice') B.N = v; updateB(true); });
  $('reseedB').addEventListener('click', () => { B.seed = (Math.random() * 1e9) | 0; B.M = rankField(B.seed); B.cache.clear(); updateB(); });

  // ================= Canonical curdling and the Bienaymé effect =================
  const C = { b: 5, p: 0.8, seed: 11, rows: null };
  const C_STAGES = { 3: 8, 5: 6 };
  const buildC = () => { C.rows = canonicalRows(C.b, C.p, C_STAGES[C.b], C.seed); };
  buildC();
  const fC = figure($('cC'), () => {
    paper(fC, PRINT.paper);
    const c = fC.ctx;
    c.setTransform(fC.dpr, 0, 0, fC.dpr, 0, 0);
    const stages = C_STAGES[C.b], mx = 0.05 * fC.w, bw = fC.w - 2 * mx;
    const pitch = fC.h / (stages + 1.7), th = pitch * 0.52, yTop = pitch * 0.5;
    const cov = new Float32Array(Math.ceil(bw) + 2);
    for (let k = 0; k < C.rows.length; k++) {
      const y = yTop + k * pitch, w = bw * Math.pow(C.b, -k);
      if (w >= 1) {
        c.fillStyle = shade(0.92);
        for (const s of C.rows[k]) c.fillRect(mx + s * w, y, Math.max(w - (w > 3 ? 0.6 : 0), 0.8), th);
      } else {
        // sub-pixel slugs: deposit true ink coverage per pixel column (see DECISIONS.md)
        cov.fill(0);
        for (const s of C.rows[k]) { const a = s * w, i = Math.floor(a); cov[i] += w * (1 - (a - i)); cov[i + 1] += w * (a - i); }
        for (let i = 0; i < cov.length; i++) if (cov[i] > 0.004) { c.fillStyle = shade(0.92 * Math.min(1, cov[i])); c.fillRect(mx + i, y, 1, th); }
      }
      c.fillStyle = PRINT.muted; c.font = '11px "IBM Plex Mono", monospace';
      c.fillText(String(k), mx * 0.25, y + th * 0.5 + 4);
    }
  });
  const bC = stepButtons($('bC'), [3, 5], (v) => `b = ${v}`, (v) => `base ${v}`, (v) => { C.b = v; updateC(); });
  function updateC() {
    buildC();
    bC(C.b);
    const EN = C.b * C.p, died = C.rows.findIndex((r) => r.length === 0);
    $('pCv').textContent = `p = ${C.p.toFixed(2)} · ⟨N⟩ = ${EN.toFixed(2)}`;
    $('rCa').textContent = EN.toFixed(2);
    $('rCb').textContent = EN > 1 ? (Math.log(EN) / Math.log(C.b)).toFixed(4) : 'none · dies out';
    $('rCc').textContent = `${(extinction(C.b, C.p) * 100).toFixed(1)}%`;
    $('rCd').textContent = died < 0 ? `alive at stage ${C_STAGES[C.b]}` : `died at stage ${died}`;
    fC.draw();
  }
  $('pC').addEventListener('input', () => { C.p = Number($('pC').value); updateC(); });
  $('critC').addEventListener('click', () => { C.p = Math.round(100 / C.b) / 100; $('pC').value = String(C.p); updateC(); });
  $('reseedC').addEventListener('click', () => { C.seed = (Math.random() * 1e9) | 0; updateC(); });

  updateA();
  updateB();
  updateC();
})();
