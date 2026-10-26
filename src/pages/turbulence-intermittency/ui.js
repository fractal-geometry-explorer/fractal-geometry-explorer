(() => {
  const pow = Math.pow, sup = (n) => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x) => { if (x < 1000) return x >= 100 ? x.toFixed(0) : x.toFixed(x >= 1 ? 1 : 3); const [m, e] = x.toExponential(1).split('e'); return `${m}·10${sup(+e)}`; };
  const pct = (x) => `${(100 * x).toFixed(x >= 0.1 ? 0 : 2)}%`;
  const MONO = '500 10.5px "IBM Plex Mono", monospace';

  // a screen-space chart frame with margins; returns the plot rectangle
  function frame(c, f, ml = 52, mr = 14, mt = 14, mb = 36) {
    const iw = f.w - ml - mr, ih = f.h - mt - mb;
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, mt, iw, ih);
    c.font = MONO;
    return { ml, mt, iw, ih };
  }
  const xlabel = (c, f, r, s) => { c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(s, r.ml + r.iw / 2, f.h - 16); };
  const ylabel = (c, r, s) => { c.save(); c.translate(14, r.mt + r.ih / 2); c.rotate(-Math.PI / 2); c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, 0); c.restore(); };

  // ====================== 1: the record a probe reads ======================
  const stA = { mode: 'record', N: 3, m: 5, seed: 7, fixed: false, k: 1 };
  const mMaxA = (N) => { let m = 0; for (let v = 1; m < 7 && v * N <= 20000; m++) v *= N; return Math.max(1, m); };
  const cacheA = {};
  const dataA = () => {
    const key = `${stA.N}|${stA.m}|${stA.seed}|${stA.fixed ? 1 : 0}`;
    return cacheA[key] || (cacheA[key] = curdleLine(stA.N, stA.m, stA.seed, stA.fixed));
  };
  const PITCH = 0.085, THICK = 0.035;
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'cascade') return fitBox(f, { x0: -0.02, x1: 1.02, y0: -(PITCH * stA.m + THICK + 0.02), y1: 0.02 }, 0.03);
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.18, y1: 0.62 }, 0.03);
  }, (f, v) => {
    const c = f.ctx, stages = dataA();
    paper(f, PRINT.paper); toWorld(f, v);
    c.fillStyle = PRINT.ink;
    const pen = 0.75 / v.s;                      // each gust keeps at least a pen's width on screen
    if (stA.mode === 'cascade') {
      for (let k = 0; k <= stA.m; k++) {
        const len = Math.max(pow(9, -k), pen), p = new Path2D();
        for (const a of stages[k]) p.rect(a, -(PITCH * k) - THICK, len, THICK);
        c.fill(p);
      }
    } else {
      const len = Math.max(pow(9, -stA.m), pen), rec = new Path2D();
      for (const a of stages[stA.m]) rec.rect(a, 0, len, 0.55);
      c.fill(rec);
      toScreen(f);
      c.strokeStyle = PRINT.rule; c.lineWidth = 1;
      c.beginPath(); c.moveTo(v.ox, v.oy); c.lineTo(v.ox + v.s, v.oy); c.stroke();
      // the probe's verdict: windows of size 9^−k that contain any dissipation
      toWorld(f, v);
      const wk = pow(9, -stA.k), band = new Path2D();
      for (const a of stages[stA.k]) band.rect(a, -0.125, wk, 0.055);
      c.fillStyle = PRINT.red; c.fill(band);
      toScreen(f);
      c.strokeStyle = PRINT.rule;
      c.strokeRect(v.ox, v.oy + 0.07 * v.s, v.s, 0.055 * v.s);
    }
    toScreen(f);
  });
  const MODES_A = { record: 'The record', cascade: 'Stage by stage' };
  const INFO_A = {
    record: 'Black: the dissipation a perfect probe would read. Red: the stretches a probe of the chosen size calls turbulent — everything else it reads as laminar. Shrink the probe and the turbulent fraction falls; zoom in and every burst splits again.',
    cascade: 'Each row curdles the one above: every gusty ninth-stretch keeps N of its 9 ninths. The total dissipation never changes, so what survives carries ever higher intensity — gusts within gusts, after the fashion of the Cantor bar of Plate 80.',
  };
  function setA(refit) {
    markMA(stA.mode); markNA(stA.N); markSA(stA.m);
    const max = mMaxA(stA.N);
    markSA.buttons.forEach((b, i) => { b.disabled = i + 1 > max; });
    $('kA').max = stA.m; $('kA').value = stA.k;
    $('probeWrap').hidden = stA.mode !== 'record';
    const d = Math.log(stA.N) / Math.log(9);
    $('dimA').textContent = `base 9, N = ${stA.N} gusts per eddy · d = log ${stA.N}/log 9 ≈ ${d.toFixed(4)} · in space, D = 2 + d ≈ ${(2 + d).toFixed(2)}`;
    $('cAt').textContent = MODES_A[stA.mode];
    $('cAn').textContent = stA.mode === 'cascade' ? `stages 0 to ${stA.m}` : `stage ${stA.m} · ${fmt(pow(stA.N, stA.m))} gusts · probe reads 9${sup(-stA.k)}-sized stretches`;
    $('sAv').textContent = `stage ${stA.m}`;
    $('kAv').textContent = stA.k === 0 ? 'the whole record' : `9${sup(-stA.k)} ≈ ${pow(9, -stA.k).toPrecision(2)}`;
    $('infoA').innerHTML = INFO_A[stA.mode];
    $('rAa').textContent = `${d.toFixed(3)}`;
    $('rAb').textContent = `${(2 + d).toFixed(3)}`;
    $('rAc').textContent = `${sci(pow(9 / stA.N, stA.m))}× the mean`;
    $('rAd').textContent = pct(pow(stA.N / 9, stA.k));
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markNA = stepButtons($('nA'), [1, 2, 3, 4, 5, 6, 7, 8, 9], String, (N) => `${N} gusts per eddy`, (N) => { stA.N = N; stA.m = Math.min(stA.m, mMaxA(N)); stA.k = Math.min(stA.k, stA.m); setA(true); });
  const markSA = stepButtons($('sA'), [1, 2, 3, 4, 5, 6, 7], String, (n) => `Stage ${n}`, (n) => { stA.m = n; stA.k = Math.min(stA.k, n); setA(stA.mode === 'cascade'); });
  $('kA').addEventListener('input', (e) => { stA.k = +e.target.value; setA(false); });
  $('fixedA').addEventListener('change', (e) => { stA.fixed = e.target.checked; setA(false); });
  $('gustsA').addEventListener('click', () => { stA.seed = (stA.seed * 1664525 + 1013904223) >>> 0; setA(false); });
  $('pA1').addEventListener('click', () => { Object.assign(stA, { mode: 'record', N: 3, m: 5, k: 1 }); setA(true); });
  $('pA2').addEventListener('click', () => { Object.assign(stA, { mode: 'record', N: 9, m: 4, k: 1 }); setA(true); });

  // ====================== 2: curdling in space ======================
  const stB = { mode: 'curds', N: 16, m: 2, seed: 2, zc: 0.42 };
  const mMaxB = (N) => { let m = 0; for (let v = 1; m < 4 && v * N <= 8000; m++) v *= N; return Math.max(1, m); };
  const cacheB = {};
  const genB = () => cubeGen(stB.N, stB.seed);
  function dataB() {
    const key = `${stB.N}|${stB.m}|${stB.seed}`;
    if (!cacheB[key]) {
      const { cells, side } = curdleCube(genB(), stB.m);
      cells.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
      cacheB[key] = { cells, side };
    }
    return cacheB[key];
  }
  const KISO = Math.cos(Math.PI / 6), TISO = 0.5;
  const zB = zoomable('wB', 'cB', (f) => {
    if (stB.mode === 'curds') return fitBox(f, { x0: -0.92, x1: 0.92, y0: -1.06, y1: 1.06 }, 0.02);
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.02, y1: 1.02 }, 0.02);
  }, (f, v) => {
    const c = f.ctx, { cells, side } = dataB();
    paper(f, PRINT.paper); toWorld(f, v);
    if (stB.mode === 'curds') {
      const lw = 0.5 / v.s, u = (x, y) => (x - y) * KISO, w = (x, y, z) => z - (x + y) * TISO;
      const face = (pts, color) => {
        c.beginPath(); c.moveTo(pts[0], pts[1]);
        for (let i = 2; i < 8; i += 2) c.lineTo(pts[i], pts[i + 1]);
        c.closePath(); c.fillStyle = color; c.strokeStyle = color; c.lineWidth = lw; c.fill(); c.stroke();
      };
      for (const [x, y, z] of cells) {
        const s = side, x1 = x + s, y1 = y + s, z1 = z + s;
        face([u(x, y), w(x, y, z1), u(x1, y), w(x1, y, z1), u(x1, y1), w(x1, y1, z1), u(x, y1), w(x, y1, z1)], '#d7d4c9');
        face([u(x1, y), w(x1, y, z), u(x1, y1), w(x1, y1, z), u(x1, y1), w(x1, y1, z1), u(x1, y), w(x1, y, z1)], '#3e3d38');
        face([u(x, y1), w(x, y1, z), u(x1, y1), w(x1, y1, z), u(x1, y1), w(x1, y1, z1), u(x, y1), w(x, y1, z1)], '#9a988f');
      }
    } else if (stB.mode === 'slice') {
      const p = new Path2D();
      for (const [x, y, z] of cells) if (z <= stB.zc && stB.zc < z + side) p.rect(x, y, side, side);
      c.fillStyle = PRINT.ink; c.fill(p);
      toScreen(f); c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(v.ox, v.oy - v.s, v.s, v.s); toWorld(f, v);
    } else {
      const seen = new Set(), p = new Path2D(), g = Math.round(1 / side);
      for (const [x, y] of cells) {
        const key = Math.round(x * g) * (g + 1) + Math.round(y * g);
        if (!seen.has(key)) { seen.add(key); p.rect(x, y, side, side); }
      }
      c.fillStyle = PRINT.ink; c.fill(p);
      toScreen(f); c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(v.ox, v.oy - v.s, v.s, v.s); toWorld(f, v);
    }
    toScreen(f);
  });
  function miniBdraw() {
    const kept = new Set(genB().map(([i, j, k]) => `${i},${j},${k}`));
    let s = '';
    for (let z = 0; z < 3; z++) {
      const x0 = z * 4.1;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
        if (kept.has(`${i},${j},${z}`)) s += `<rect x="${x0 + i}" y="${2 - j}" width="1" height="1" fill="currentColor"/>`;
      for (let t = 0; t <= 3; t++) s += `<line x1="${x0 + t}" y1="0" x2="${x0 + t}" y2="3" stroke="#8a8a84" stroke-width="0.05"/><line x1="${x0}" y1="${t}" x2="${x0 + 3}" y2="${t}" stroke="#8a8a84" stroke-width="0.05"/>`;
    }
    $('miniB').innerHTML = s;
    $('miniBfx').textContent = `N = ${stB.N} of 27`;
  }
  const MODES_B = { curds: 'The curds', slice: 'A plane cut', sky: 'Projected on the sky' };
  const INFO_B = {
    curds: 'The subeddies still carrying dissipation after m stages of curdling. The generator (the chosen N of 27, shown layer by layer above) repeats inside every curd — the whole and its finest details come from the same process, so the limit is self-similar by construction.',
    slice: 'Cut the cube with a plane: the curds it meets form a flat pattern of dimension D − 1. Slide the cut — some heights are rich and some are empty, which is intermittency seen edge-on.',
    sky: 'Project every curd on one face, the way galaxies project on the sky. For D > 2 the projections pile up and cover almost everything in the limit; for D < 2 they cover a vanishing fraction — chapter 9\'s dark night sky, and section 3\'s other half.',
  };
  function setB(refit) {
    markMB(stB.mode); markSB(stB.m);
    const max = mMaxB(stB.N);
    markSB.buttons.forEach((b, i) => { b.disabled = i > max; });
    $('zBwrap').hidden = stB.mode !== 'slice';
    const D = stB.N === 1 ? 0 : Math.log(stB.N) / Math.log(3), { cells, side } = dataB();
    $('nBv').textContent = `N = ${stB.N} · D ≈ ${D.toFixed(3)}`;
    $('sBv').textContent = `stage ${stB.m}`;
    $('zBv').textContent = stB.zc.toFixed(3);
    $('dimB').textContent = `base 3: keep N = ${stB.N} of 27 subeddies · D = log ${stB.N}/log 3 ≈ ${D.toFixed(4)} · density × ${(27 / stB.N).toFixed(2)} per stage`;
    $('cBt').textContent = MODES_B[stB.mode];
    $('cBn').textContent = `stage ${stB.m} · ${fmt(cells.length)} subeddies of side 3${sup(-stB.m)}`;
    $('infoB').innerHTML = INFO_B[stB.mode];
    $('rBa').textContent = D.toFixed(4);
    $('rBb').textContent = `${fmt(pow(stB.N, stB.m))} of ${fmt(pow(27, stB.m))}`;
    $('rBc').textContent = `${sci(pow(27 / stB.N, stB.m))}× the mean`;
    if (stB.mode === 'slice') {
      const n = cells.reduce((s, [, , z]) => s + (z <= stB.zc && stB.zc < z + side ? 1 : 0), 0);
      $('tBd').textContent = 'The cut holds'; $('rBd').textContent = `${fmt(n)} cells · D − 1 ≈ ${Math.max(0, D - 1).toFixed(2)}`;
    } else if (stB.mode === 'sky') {
      const g = Math.round(1 / side), seen = new Set();
      for (const [x, y] of cells) seen.add(Math.round(x * g) * (g + 1) + Math.round(y * g));
      $('tBd').textContent = 'Sky covered'; $('rBd').textContent = pct(seen.size / (g * g));
    } else { $('tBd').textContent = 'Each subeddy'; $('rBd').textContent = `side 3${sup(-stB.m)} ≈ ${pow(3, -stB.m).toFixed(stB.m > 2 ? 4 : 3)}`; }
    miniBdraw();
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(true); });
  const markSB = stepButtons($('sB'), [0, 1, 2, 3, 4], String, (n) => `Stage ${n}`, (n) => { stB.m = n; setB(false); });
  $('nBs').addEventListener('input', (e) => { stB.N = +e.target.value; stB.m = Math.min(stB.m, mMaxB(stB.N)); setB(false); });
  $('zBs').addEventListener('input', (e) => { stB.zc = +e.target.value; setB(false); });
  $('shufB').addEventListener('click', () => { stB.seed = (stB.seed * 1664525 + 1013904223) >>> 0; setB(false); });
  $('pB1').addEventListener('click', () => { Object.assign(stB, { mode: 'curds', N: 16, m: 2 }); $('nBs').value = 16; setB(true); });
  $('pB2').addEventListener('click', () => { Object.assign(stB, { mode: 'curds', N: 27, m: 2 }); $('nBs').value = 27; setB(true); });

  // ====================== 3: why the probes say D > 2 ======================
  const stC = { mode: 'stages', D: 2.55 };
  const MC = 20;
  let limC = null;                     // the limit curve over D in [1, 3], computed once
  const limCurve = () => limC || (limC = Array.from({ length: 201 }, (_, i) => hitLimit(1 + (2 * i) / 200)));
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0), (f) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const r = frame(c, f);
    if (stC.mode === 'stages') {
      const X = (m) => r.ml + (m / MC) * r.iw, Y = (h) => r.mt + (1 - h) * r.ih;
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = PRINT.muted;
      for (let m = 0; m <= MC; m += 5) c.fillText(String(m), X(m), r.mt + r.ih + 6);
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (const h of [0, 0.5, 1]) c.fillText(h.toFixed(1), r.ml - 6, Y(h));
      xlabel(c, f, r, 'stages of curdling, m'); ylabel(c, r, 'P(probe still hits)');
      const curve = (D, color, lw) => {
        const hs = hitCurve(D, MC);
        c.strokeStyle = color; c.lineWidth = lw; c.beginPath();
        hs.forEach((h, m) => (m ? c.lineTo(X(m), Y(h)) : c.moveTo(X(0), Y(h))));
        c.stroke();
        return hs[MC];
      };
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = MONO;
      for (const D of [1.5, 2, 2.5, 3]) {
        const end = curve(D, PRINT.faint, 1.4);
        c.fillStyle = PRINT.muted; c.fillText(`D = ${D}`, X(MC) - 44, Y(end) + (D === 2 ? 10 : -8));
      }
      curve(stC.D, PRINT.red, 2.2);
      c.fillStyle = PRINT.red; c.fillText(`D = ${stC.D.toFixed(2)}`, r.ml + 8, Y(hitCurve(stC.D, 3)[3]) - 10);
    } else {
      const X = (D) => r.ml + ((D - 1) / 2) * r.iw, Y = (h) => r.mt + (1 - h) * r.ih;
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = PRINT.muted;
      for (const D of [1, 1.5, 2, 2.5, 3]) c.fillText(D.toFixed(1), X(D), r.mt + r.ih + 6);
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (const h of [0, 0.5, 1]) c.fillText(h.toFixed(1), r.ml - 6, Y(h));
      xlabel(c, f, r, 'dimension D of the support'); ylabel(c, r, 'P(probe hits, in the limit)');
      // measured band for turbulent dissipation, and the galaxies' D
      c.fillStyle = 'rgba(194,69,45,0.12)'; c.fillRect(X(2.5), r.mt, X(2.66) - X(2.5), r.ih);
      c.fillStyle = PRINT.red; c.textAlign = 'center'; c.fillText('measured', (X(2.5) + X(2.66)) / 2, r.mt + r.ih - 18);
      c.strokeStyle = PRINT.muted; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(2), r.mt); c.lineTo(X(2), r.mt + r.ih); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.muted; c.textAlign = 'left'; c.fillText('D = 2', X(2) + 5, r.mt + 20);
      const L = limCurve();
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath();
      L.forEach((h, i) => (i ? c.lineTo(X(1 + (2 * i) / 200), Y(h)) : c.moveTo(X(1), Y(h))));
      c.stroke();
      dotAt(c, X(1.23), Y(0), PRINT.accent); c.fillStyle = PRINT.accent; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('galaxies, D ≈ 1.23', X(1.23) + 7, Y(0) - 5);
      dotAt(c, X(stC.D), Y(hitLimit(stC.D)), PRINT.red);
    }
  });
  const dotAt = (c, x, y, color) => { c.beginPath(); c.arc(x, y, 4.5, 0, 2 * Math.PI); c.fillStyle = color; c.fill(); c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke(); };
  const MODES_C = { stages: 'Stage by stage', limit: 'The limit, against D' };
  const INFO_C = {
    stages: 'Each curve: the probability that a straight probe still meets dissipation after m stages. Below D = 2 every curve dies; above it they level off. D = 2 is the critical case — the family tree averages exactly one child, and dies out all the same, only slowly.',
    limit: 'The limiting probability jumps away from zero exactly at D = 2. Galaxies (D ≈ 1.23) sit far below: almost no line of sight meets one, and the night sky is dark. Turbulent dissipation sits in the measured band above: probes hit it "often", never "never".',
  };
  function setC(refit) {
    markMC(stC.mode);
    const D = stC.D, lim = hitLimit(D), h20 = hitCurve(D, MC)[MC];
    $('DCv').textContent = `D = ${D.toFixed(2)}`;
    $('cCt').textContent = MODES_C[stC.mode];
    $('cCn').textContent = `branching ratio 3^(D−2) ≈ ${pow(3, D - 2).toFixed(3)}`;
    $('infoC').innerHTML = INFO_C[stC.mode];
    $('rCa').textContent = pow(3, D - 2).toFixed(3);
    $('rCb').textContent = D <= 2 ? '0 — dies out' : lim.toFixed(3);
    $('rCc').textContent = D > 2 ? `a dust, d = ${(D - 2).toFixed(2)}` : 'empty in the limit';
    $('rCd').textContent = h20.toFixed(3);
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(false); });
  $('DCs').addEventListener('input', (e) => { stC.D = +e.target.value; setC(false); });
  const presetC = (D) => { stC.D = D; $('DCs').value = D; setC(false); };
  $('pC1').addEventListener('click', () => presetC(2.55));
  $('pC2').addEventListener('click', () => presetC(1.23));
  $('pC3').addEventListener('click', () => presetC(2));

  // ====================== 4: the spectrum (in)equality ======================
  const stD = { mode: 'lines', D: 2.55 };
  const expo = (D) => 2 / 3 + specB(D);
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0), (f) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const r = frame(c, f);
    if (stD.mode === 'lines') {
      // log–log: r over three decades, ⟨Δv²⟩ = r^(2/3 + B) through (1, 1)
      const X = (lr) => r.ml + ((lr + 3) / 3) * r.iw, Y = (ly) => r.mt + (-ly / 3) * r.ih;
      c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let e = -3; e <= 0; e++) {
        const x = X(e);
        if (e > -3) { c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(x, r.mt); c.lineTo(x, r.mt + r.ih); c.stroke(); }
        c.fillText(`10${sup(e)}`, x, r.mt + r.ih + 6);
      }
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let e = -3; e <= 0; e++) {
        const y = Y(e);
        if (e > -3) { c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(r.ml, y); c.lineTo(r.ml + r.iw, y); c.stroke(); }
        c.fillText(`10${sup(e)}`, r.ml - 6, y);
      }
      xlabel(c, f, r, 'separation r'); ylabel(c, r, '⟨[v(x) − v(x+r)]²⟩');
      const line = (ex, color, dash, lw) => {
        c.strokeStyle = color; c.lineWidth = lw; c.setLineDash(dash);
        c.beginPath(); c.moveTo(X(-3), Y(-3 * ex)); c.lineTo(X(0), Y(0)); c.stroke(); c.setLineDash([]);
      };
      line(2 / 3, PRINT.accent, [6, 4], 1.4);
      c.fillStyle = PRINT.accent; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('Kolmogorov: slope 2/3 (D = 3)', X(-2.92), Y(-0.55));
      line(expo(stD.D), PRINT.ink, [], 2.2);
      c.fillStyle = PRINT.ink; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(`D = ${stD.D.toFixed(2)}: slope ${expo(stD.D).toFixed(3)}`, X(-2.95), Y(-2.95 * expo(stD.D)) + 10);
    } else {
      const X = (D) => r.ml + (D - 2) * r.iw, Y = (ex) => r.mt + ((1.05 - ex) / 0.45) * r.ih;
      c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
      for (const D of [2, 2.25, 2.5, 2.75, 3]) c.fillText(D.toFixed(2), X(D), r.mt + r.ih + 6);
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (const ex of [2 / 3, 0.8, 0.9, 1]) c.fillText(ex === 2 / 3 ? '2/3' : ex.toFixed(1), r.ml - 6, Y(ex));
      xlabel(c, f, r, 'dimension D of the support'); ylabel(c, r, 'variance exponent 2/3 + B');
      // weighted curdling allows anything below the fractally homogeneous line, down to 2/3
      c.fillStyle = 'rgba(47,95,158,0.10)'; c.beginPath();
      c.moveTo(X(2), Y(2 / 3)); c.lineTo(X(2), Y(1)); c.lineTo(X(3), Y(2 / 3)); c.closePath(); c.fill();
      c.fillStyle = 'rgba(194,69,45,0.12)'; c.fillRect(X(2.5), r.mt, X(2.66) - X(2.5), r.ih);
      c.fillStyle = PRINT.red; c.textAlign = 'center'; c.fillText('measured D', (X(2.5) + X(2.66)) / 2, r.mt + 8);
      c.strokeStyle = PRINT.accent; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(X(2), Y(2 / 3)); c.lineTo(X(3), Y(2 / 3)); c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.accent; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('Kolmogorov 2/3', X(2.03), Y(2 / 3) + 5);
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(X(2), Y(1)); c.lineTo(X(3), Y(2 / 3)); c.stroke();
      c.fillStyle = PRINT.ink; c.textBaseline = 'bottom'; c.fillText('B = (3 − D)/3', X(2.08), Y(expo(2.14)) - 6);
      c.fillStyle = PRINT.muted; c.fillText('weighted curdling: B ≤ (3 − D)/3', X(2.2), Y(0.71) - 4);
      dotAt(c, X(stD.D), Y(expo(stD.D)), PRINT.red);
    }
  });
  const MODES_D = { lines: 'Structure function', exponent: 'Exponent against D' };
  const INFO_D = {
    lines: 'On log paper the structure function is a straight line of slope 2/3 + B. Concentrating the dissipation on a thinner set (smaller D) steepens it: nearby points more often fall in the same laminar stretch, so small-scale differences lose variance.',
    exponent: 'The exponent against D. Fractally homogeneous turbulence sits on the line B = (3 − D)/3; weighted curdling fills the region below it. With the measured D ≈ 2.5–2.6, the correction B stays below ~0.17 — which is why Kolmogorov\'s 2/3 worked so well for decades.',
  };
  function setD(refit) {
    markMD(stD.mode);
    const D = stD.D, B = specB(D);
    $('DDv').textContent = `D = ${D.toFixed(2)}`;
    $('cDt').textContent = MODES_D[stD.mode];
    $('cDn').textContent = `B = (3 − ${D.toFixed(2)})/3 ≈ ${B.toFixed(3)}`;
    $('infoD').innerHTML = INFO_D[stD.mode];
    $('rDa').textContent = B.toFixed(4);
    $('rDb').textContent = `2/3 + B ≈ ${(2 / 3 + B).toFixed(4)}`;
    $('rDc').textContent = `∝ k^−${(5 / 3 + B).toFixed(3)}`;
    $('rDd').textContent = (D - 2).toFixed(2);
    if (refit) zD.refit(); else zD.schedule();
  }
  const markMD = stepButtons($('mD'), Object.keys(MODES_D), (k) => MODES_D[k], (k) => `Show: ${MODES_D[k]}`, (k) => { stD.mode = k; setD(false); });
  $('DDs').addEventListener('input', (e) => { stD.D = +e.target.value; setD(false); });
  const presetD = (D) => { stD.D = D; $('DDs').value = D; setD(false); };
  $('pD1').addEventListener('click', () => presetD(2.55));
  $('pD2').addEventListener('click', () => presetD(3));

  setA(true); setB(true); setC(true); setD(true);
})();
