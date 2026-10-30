(() => {
  const pow = Math.pow;
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

  // ====================== 1: the definition — D against D_T ======================
  const D_CANTOR = Math.log(2) / Math.log(3), D_KOCH = Math.log(4) / Math.log(3);
  const SHAPES = {
    line: {
      name: 'A straight segment', Dt: 1, D: 1,
      dim: 'D = 1 · D_T = 1 · dimensionally concordant — not a fractal',
      why: 'a curve', dval: '1 exactly',
      info: 'Euclid&rsquo;s shapes are <i>dimensionally concordant</i>: every useful dimension agrees. A segment is a curve (D_T&nbsp;=&nbsp;1) and its Hausdorff dimension is also 1, so the detail buttons have nothing to add — magnified, it is only itself.',
    },
    cantor: {
      name: 'The Cantor dust', Dt: 0, D: D_CANTOR,
      dim: `D = log 2 / log 3 ≈ 0.6309 · D_T = 0 · D > D_T: a fractal`,
      why: 'totally disconnected: a dust', dval: `log 2/log 3 ≈ 0.6309`,
      info: 'Keep the outer thirds of every interval, without end. What remains is totally disconnected — every piece falls apart into smaller pieces — so its topological dimension is 0. Yet it is far more than a finite set of points: D ≈ 0.63 measures that. Built in full on the <a href="cantor-dust.html">Cantor dust</a> page (chapter 8).',
    },
    koch: {
      name: 'The Koch curve', Dt: 1, D: D_KOCH,
      dim: `D = log 4 / log 3 ≈ 1.2618 · D_T = 1 · D > D_T: a fractal`,
      why: 'a curve', dval: `log 4/log 3 ≈ 1.2618`,
      info: 'A curve — an unbroken line one can trace end to end, so D_T = 1 — whose crinkles carry more than length: D ≈ 1.26. The chapter&rsquo;s example of a noninteger D. Built in full on the <a href="koch-plates.html">Triadic Koch Island</a> page (chapter 6).',
    },
    brown: {
      name: 'A Brownian trail', Dt: 1, D: 2,
      dim: 'D = 2 · D_T = 1 · D > D_T: a fractal with an integer D',
      why: 'a curve', dval: '2 exactly',
      info: 'The chapter&rsquo;s warning that <i>fractal</i> does not mean <i>fractional</i>: the trail of Brownian motion is a curve (D_T = 1) whose D equals 2 exactly — it very nearly fills the plane. A fresh seeded trail each time; chapter 25 takes it up on the <a href="brown-trails.html">Brown Trails</a> page.',
    },
  };
  const stA = { shape: 'koch', m: 4, seed: 7 };
  const cacheA = {};
  const dataA = () => {
    const key = `${stA.shape}|${stA.m}|${stA.seed}`;
    if (cacheA[key]) return cacheA[key];
    let d = null;
    if (stA.shape === 'cantor') d = cantorStarts(stA.m);
    if (stA.shape === 'koch') d = kochCurve(stA.m);
    if (stA.shape === 'brown') d = brownTrail(256 << (stA.m - 1), stA.seed);
    return (cacheA[key] = d);
  };
  const AXIS_H = 56;                             // screen band kept for the dimension axis
  const zA = zoomable('wA', 'cA', (f) => {
    let bb;
    if (stA.shape === 'line') bb = { x0: -0.02, x1: 1.02, y0: -0.30, y1: 0.30 };
    else if (stA.shape === 'cantor') bb = { x0: -0.02, x1: 1.02, y0: -0.34, y1: 0.26 };
    else if (stA.shape === 'koch') bb = { x0: -0.02, x1: 1.02, y0: -0.22, y1: 0.42 };
    else { const P = dataA(), b = bbox(P); bb = { x0: b.x0 - 0.03, x1: b.x1 + 0.03, y0: b.y0 - 0.03, y1: b.y1 + 0.03 }; }
    const v = fitBox({ w: f.w, h: f.h - AXIS_H, dpr: f.dpr }, bb, 0.03);
    return v;
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    c.strokeStyle = PRINT.ink; c.fillStyle = PRINT.ink; c.lineJoin = 'round'; c.lineCap = 'round';
    if (stA.shape === 'line') {
      c.lineWidth = 2.5 / v.s;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(1, 0); c.stroke();
    } else if (stA.shape === 'cantor') {
      const starts = dataA(), len = pow(3, -stA.m), w = Math.max(len, 0.75 / v.s), p = new Path2D();
      for (const a of starts) p.rect(a, -0.015, w, 0.03);
      c.fill(p);
    } else {
      const P = dataA();
      c.lineWidth = (stA.shape === 'koch' ? 1.6 : 1.2) / v.s;
      c.stroke(polyPath(P, false));
    }
    toScreen(f);
    drawAxisA(c, f);
  });
  // the dimension axis: D_T in blue, D in red, the gap between them shaded — the gap is what
  // makes the set a fractal
  function drawAxisA(c, f) {
    const s = SHAPES[stA.shape], ml = 64, mr = 24, y = f.h - 26, t = (d) => ml + ((f.w - ml - mr) * d) / 3;
    c.font = MONO; c.lineWidth = 1;
    c.strokeStyle = PRINT.rule; c.beginPath(); c.moveTo(ml, y); c.lineTo(f.w - mr, y); c.stroke();
    c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let d = 0; d <= 3; d++) {
      c.strokeStyle = PRINT.rule; c.beginPath(); c.moveTo(t(d), y - 4); c.lineTo(t(d), y + 4); c.stroke();
      c.fillText(String(d), t(d), y + 7);
    }
    c.textAlign = 'left'; c.fillText('dimension', f.w - mr - 68, y - 28);
    if (s.D > s.Dt) { c.fillStyle = 'rgba(194,69,45,0.18)'; c.fillRect(t(s.Dt), y - 10, t(s.D) - t(s.Dt), 10); }
    c.fillStyle = PRINT.accent; c.beginPath(); c.moveTo(t(s.Dt), y - 1); c.lineTo(t(s.Dt) - 5, y - 11); c.lineTo(t(s.Dt) + 5, y - 11); c.closePath(); c.fill();
    c.fillStyle = PRINT.red; c.beginPath(); c.arc(t(s.D), y - 5, 4.5, 0, 2 * Math.PI); c.fill();
    c.textBaseline = 'alphabetic';
    if (s.D === s.Dt) { c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.fillText('D = D_T = 1', t(1), y - 16); }
    else {
      c.fillStyle = PRINT.accent; c.textAlign = 'right'; c.fillText(`D_T = ${s.Dt}`, t(s.Dt) - 8, y - 14);
      c.fillStyle = PRINT.red; c.textAlign = 'left'; c.fillText(`D ≈ ${s.D.toFixed(s.D === 2 ? 0 : 2)}`, t(s.D) + 8, y - 14);
    }
  }
  function setA(refit) {
    const s = SHAPES[stA.shape];
    markShA(stA.shape); markMA(stA.m);
    markMA.buttons.forEach((b) => { b.disabled = stA.shape === 'line'; });
    $('newA').hidden = stA.shape !== 'brown';
    $('dimA').textContent = s.dim;
    $('cAt').textContent = s.name;
    $('cAn').textContent = stA.shape === 'line' ? 'no detail to add'
      : stA.shape === 'cantor' ? `stage ${stA.m} · ${fmt(1 << stA.m)} pieces of length 3${sup(-stA.m)}`
      : stA.shape === 'koch' ? `stage ${stA.m} · ${fmt(pow(4, stA.m))} edges`
      : `${fmt(256 << (stA.m - 1))} steps · seed ${stA.seed}`;
    $('infoA').innerHTML = s.info;
    $('rAa').innerHTML = `${s.Dt} — ${s.why}`;
    $('rAb').textContent = s.dval;
    $('rAc').textContent = s.D === s.Dt ? '0 — concordant' : `${(Math.floor((s.D - s.Dt) * 1e4) / 1e4).toFixed(4)} — discordant`;
    $('rAd').textContent = s.D > s.Dt ? (s.D === Math.round(s.D) ? 'yes — even with D an integer' : 'yes — D exceeds D_T') : 'no — D = D_T';
    if (refit) zA.refit(); else zA.schedule();
  }
  const sup = (n) => String(n).replace(/-/, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const markShA = stepButtons($('shA'), Object.keys(SHAPES), (k) => SHAPES[k].name, (k) => SHAPES[k].name, (k) => { stA.shape = k; setA(true); });
  const markMA = stepButtons($('mA'), [1, 2, 3, 4, 5, 6, 7], String, (n) => `Detail ${n}`, (n) => { stA.m = n; setA(stA.shape === 'brown'); });
  $('newA').addEventListener('click', () => { stA.seed = (stA.seed * 1664525 + 1013904223) >>> 0; setA(true); });

  // ====================== 2: effective dimension — the ball of thread ======================
  const stB = { mode: 'see', x: 1, coast: false, seed: 11 };
  let ballData = null;
  const ball = () => ballData || (ballData = windBall(stB.seed));
  // how wide a field the observer takes in at resolution 10^x cm, and how coarse the picture is
  // drawn: presentation choices, interpolated between the chapter's stations for legibility
  const lerpAt = (pts, x) => {
    if (x >= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x >= pts[i][0]) { const [x1, g1] = pts[i - 1], [x0, g0] = pts[i]; return g0 * pow(g1 / g0, (x - x0) / (x1 - x0)); }
    return pts[pts.length - 1][1];
  };
  const fovOf = (x) => Math.min(320, Math.max(0.015, pow(10, x) * lerpAt([[3, 3.2], [0.2, 3.2], [-2, 50], [-3, 200], [-9, 200]], x)));
  const cellOf = (x) => lerpAt([[1.5, 12], [1, 8], [0, 4.5], [-1, 2.5], [-2, 1], [-9, 1]], x);
  const seeCache = { key: '', cv: null, rect: null };

  function drawScene(c2, W2, H2, fov, x) {
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.fillStyle = PRINT.paper; c2.fillRect(0, 0, W2, H2);
    const s2 = W2 / fov;
    c2.setTransform(s2, 0, 0, -s2, W2 / 2, H2 / 2);
    const B = ball();
    // deep close-ups slide toward the front-most stitch, so the view never lands in a gap
    const t0 = Math.max(0, Math.min(1, (0.8 - fov) / 0.65));
    c2.translate(-B.anchor[0] * t0, -B.anchor[1] * t0);
    c2.lineCap = 'round'; c2.lineJoin = 'round';
    const shade = (z, lift) => {
      const g = Math.max(30, Math.min(225, 46 + 120 * (z / BALL_R) + lift));
      return `rgb(${g},${g - 2},${g - 6})`;
    };
    const dotted = x < -4.6;                      // past the fibers, only atomlike pinpoints
    if (!dotted) {
      // the ball's dark inside, behind the winding, where the thread leaves gaps
      c2.fillStyle = '#504e47'; c2.beginPath(); c2.arc(0, 0, BALL_R * 0.985, 0, 2 * Math.PI); c2.fill();
      for (const band of B.bands) {
        for (let t = 0; t < TONE_N; t++) {
          c2.lineWidth = THREAD_W; c2.strokeStyle = shade(band.z, (t - 2) * 9); c2.stroke(band.paths[t]);
          if (fov < 3.5) { c2.lineWidth = THREAD_W * 0.38; c2.strokeStyle = shade(band.z, 38 + (t - 2) * 9); c2.stroke(band.paths[t]); }
        }
      }
    }
    // close enough to see the fibers inside each thread (and, deeper still, only pinpoints)
    if (fov < 0.45) {
      const lim = fov * 0.9, FIB_P = 0.0018, nF = Math.floor(THREAD_W / FIB_P), FIB_W = 0.0012;
      if (dotted) { const d = fov / 55; c2.setLineDash([d * 0.4, d * 1.8]); }
      for (const s of B.segs) {
        if (s[4] < BALL_R - 0.35) continue;
        const mx = (s[0] + s[2]) / 2 - B.anchor[0] * t0, my = (s[1] + s[3]) / 2 - B.anchor[1] * t0;
        if (Math.abs(mx) > lim + 0.15 || Math.abs(my) > lim + 0.15) continue;
        let nx = -(s[3] - s[1]), ny = s[2] - s[0];
        const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        for (let k = 0; k < nF; k++) {
          const o = (k - (nF - 1) / 2) * FIB_P;
          const g = 48 + 112 * (s[4] / BALL_R) + (k % 2 ? 26 : -22) + (((s[5] * 7 + k * 13) % 7) - 3) * 7;
          c2.strokeStyle = `rgb(${g},${g - 2},${g - 6})`; c2.lineWidth = dotted ? FIB_W * 0.5 : FIB_W;
          c2.beginPath(); c2.moveTo(s[0] + nx * o, s[1] + ny * o); c2.lineTo(s[2] + nx * o, s[3] + ny * o); c2.stroke();
        }
      }
      c2.setLineDash([]);
    }
  }
  const zB = zoomable('wB', 'cB', (f) => {
    if (stB.mode === 'chart') return { s: 1, ox: 0, oy: 0 };
    const fov = fovOf(stB.x), h = fov * (f.h / Math.max(1, f.w));
    return fitBox(f, { x0: -fov / 2, x1: fov / 2, y0: -h / 2, y1: h / 2 }, 0);
  }, (f, v) => {
    const c = f.ctx;
    if (stB.mode === 'chart') { paper(f, PRINT.paper); toScreen(f); drawChartB(c, f); return; }
    paper(f, '#dddbd2');
    const fov = fovOf(stB.x), cell = cellOf(stB.x);
    const rect = { x0: -fov / 2, x1: fov / 2, y0: -fov / 2, y1: fov / 2 };
    const key = `${stB.x.toFixed(2)}|${stB.seed}|${f.w}`;
    if (seeCache.key !== key) {
      const W2 = Math.max(8, Math.round(f.w / cell)), H2 = W2;
      const cv = seeCache.cv || (seeCache.cv = document.createElement('canvas'));
      cv.width = W2; cv.height = H2;
      drawScene(cv.getContext('2d'), W2, H2, fov, stB.x);
      seeCache.key = key;
    }
    const px = v.ox + rect.x0 * v.s, py = v.oy - rect.y1 * v.s, pw = (rect.x1 - rect.x0) * v.s, ph = (rect.y1 - rect.y0) * v.s;
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    c.imageSmoothingEnabled = cell < 1.5;
    c.drawImage(seeCache.cv, px, py, pw, ph);
    c.imageSmoothingEnabled = true;
    // a scale bar, a round length near a fifth of the field
    const nice = pow(10, Math.floor(Math.log10(fov / 3))), bar = nice * v.s;
    c.font = MONO; c.fillStyle = '#3a3a35'; c.strokeStyle = '#3a3a35'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(14, f.h - 14); c.lineTo(14 + bar, f.h - 14); c.stroke();
    c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(fmtLen(nice), 14, f.h - 19);
  });
  function fmtLen(e) {                            // e in cm
    const nice = (v, u) => `${+v.toPrecision(2)} ${u}`;
    if (e >= 100) return nice(e / 100, 'm');
    if (e >= 1) return nice(e, 'cm');
    if (e >= 0.01) return nice(e * 10, 'mm');
    if (e >= 1e-4) return nice(e * 1e4, 'µm');
    return nice(e * 1e8, 'Å');
  }
  function drawChartB(c, f) {
    const r = frame(c, f, 46, 14, 18, 40), X0 = 3, X1 = -8;
    const tx = (x) => r.ml + ((X0 - x) / (X0 - X1)) * r.iw, ty = (d) => r.mt + r.ih - (d / 3.3) * r.ih;
    // the ill-defined crossings, shaded
    for (const cr of BALL_CROSS) {
      const a = tx(cr.at + 2.2 * cr.w), b = tx(cr.at - 2.2 * cr.w);
      c.fillStyle = 'rgba(21,21,21,0.06)'; c.fillRect(a, r.mt, b - a, r.ih);
    }
    // zone labels
    c.fillStyle = PRINT.muted; c.textAlign = 'center'; c.textBaseline = 'top';
    const edges = [X0, ...BALL_CROSS.map((cr) => cr.at), X1];
    BALL_ZONES.forEach((z, i) => {
      const mid = (edges[i] + edges[i + 1]) / 2;
      if (f.w > 560 || i % 2 === 0) c.fillText(z.label, tx(mid), ty(z.d) - 16);
    });
    // axes
    c.textBaseline = 'top'; c.fillStyle = PRINT.muted;
    for (const [x, lab] of [[2, '1 m'], [1, '10 cm'], [0, '1 cm'], [-1, '1 mm'], [-2, '0.1 mm'], [-3, '0.01 mm'], [-4, '1 µm'], [-6, '100 Å'], [-8, '1 Å']]) {
      c.strokeStyle = PRINT.rule; c.beginPath(); c.moveTo(tx(x), r.mt + r.ih); c.lineTo(tx(x), r.mt + r.ih + 4); c.stroke();
      if (f.w > 560 || [2, 0, -2, -4, -6, -8].includes(x)) c.fillText(lab, tx(x), r.mt + r.ih + 7);
    }
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let d = 0; d <= 3; d++) { c.fillText(String(d), r.ml - 6, ty(d)); c.strokeStyle = PRINT.rule; c.beginPath(); c.moveTo(r.ml, ty(d)); c.lineTo(r.ml + 4, ty(d)); c.stroke(); }
    xlabel(c, f, r, 'resolution, coarse → fine'); ylabel(c, r, 'effective dimension');
    // the coastline, for contrast: its "transition" is the whole middle of the range
    if (stB.coast) {
      c.strokeStyle = PRINT.red; c.lineWidth = 1.6; c.beginPath();
      for (let x = X0; x >= X1; x -= 0.03) { const X = tx(x), Y = ty(coastDim(x)); x === X0 ? c.moveTo(X, Y) : c.lineTo(X, Y); }
      c.stroke();
      c.fillStyle = PRINT.red; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText('a coastline, on its own scale: D ≈ 1.25 the whole way', tx(1.1), ty(1.25) - 6);
    }
    // the ball of thread
    c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath();
    for (let x = X0; x >= X1; x -= 0.03) { const X = tx(x), Y = ty(effDim(x)); x === X0 ? c.moveTo(X, Y) : c.lineTo(X, Y); }
    c.stroke();
    // the slider's position
    c.strokeStyle = 'rgba(194,69,45,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx(stB.x), r.mt); c.lineTo(tx(stB.x), r.mt + r.ih); c.stroke();
    c.fillStyle = PRINT.red; c.beginPath(); c.arc(tx(stB.x), ty(effDim(stB.x)), 4.5, 0, 2 * Math.PI); c.fill();
    c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke();
  }
  const MODES_B = { see: 'What the observer sees', chart: 'Dimension against resolution' };
  const INFO_B = {
    see: 'One picture of the same ball, redrawn as the resolution refines: a dot, then a solid ball, then winding threads, then a thread seen as a thick column, then its fibers — and, far past what can be drawn, atomlike pinpoints. The scale bar bottom left gives the size. Drag the slider slowly, or jump between the chapter&rsquo;s stations.',
    chart: 'The effective dimension of the ball, zone by zone. Flat stretches are honest integer dimensions; the shaded crossings are the ill-defined transitions between them. The chapter&rsquo;s closing move: in a fractal those transitions are not thin — they widen into a whole zone where D exceeds D_T. Turn on the coastline to see it.',
  };
  const STATIONS = [['Far away', 2.2], ['10 cm', 1], ['10 mm', 0], ['0.1 mm', -2], ['0.01 mm', -3], ['Atoms', -8]];
  function setB(refit) {
    markMB(stB.mode); markStB(STATIONS.findIndex(([, x]) => Math.abs(x - stB.x) < 0.026));
    $('xB').value = String(-stB.x);
    $('xBv').textContent = fmtLen(pow(10, stB.x));
    $('coastWrap').hidden = stB.mode !== 'chart';
    $('cBt').textContent = MODES_B[stB.mode];
    $('cBn').textContent = stB.mode === 'see' ? `resolution ${fmtLen(pow(10, stB.x))} · field shown ${fmtLen(fovOf(stB.x))}` : 'the ball of thread across eleven decades';
    $('infoB').innerHTML = INFO_B[stB.mode];
    const z = ballZone(stB.x), d = effDim(stB.x);
    $('rBa').textContent = fmtLen(pow(10, stB.x));
    $('rBb').textContent = z.crossing ? `${z.from.label} → ${z.to.label}` : z.zone.label;
    $('rBc').textContent = z.crossing ? `crossing over (≈ ${d.toFixed(2)})` : String(z.zone.d);
    $('rBd').textContent = z.crossing ? 'ill defined — in transition' : `${z.zone.d} — well defined here`;
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(true); });
  const markStB = stepButtons($('stB'), [0, 1, 2, 3, 4, 5], (i) => STATIONS[i][0], (i) => `Resolution ${STATIONS[i][0]}`, (i) => { stB.x = STATIONS[i][1]; setB(true); });
  let nudgeB = 0;
  $('xB').addEventListener('input', (e) => {
    stB.x = -(+e.target.value);
    // the full redraw re-renders the scene; while the slider moves, settle it like a pan
    clearTimeout(nudgeB); nudgeB = setTimeout(() => setB(true), 90);
    setBText();
  });
  function setBText() {
    $('xBv').textContent = fmtLen(pow(10, stB.x));
    const z = ballZone(stB.x);
    $('rBa').textContent = fmtLen(pow(10, stB.x));
    $('rBb').textContent = z.crossing ? `${z.from.label} → ${z.to.label}` : z.zone.label;
  }
  $('coastB').addEventListener('change', (e) => { stB.coast = e.target.checked; setB(false); });
  $('windB').addEventListener('click', () => { stB.seed = (stB.seed * 1664525 + 1013904223) >>> 0; ballData = null; seeCache.key = ''; setB(false); });

  // ---- first paint ----
  setA(true);
  setB(true);
})();
