(() => {
  const f2 = (x, k = 4) => Number(x.toFixed(k)).toString();

  // raster canvases: an ImageData at CSS resolution, cached while the view and mode hold
  function rasterFig(wrapId, canvasId, fitOf, key, make, overlay, opts = {}) {
    const cache = { key: '', cv: null };
    const z = zoomable(wrapId, canvasId, fitOf, (f, v) => {
      const W = Math.max(1, Math.round(f.w)), H = Math.max(1, Math.round(f.h));
      const k = `${key()}|${W}|${H}|${v.s.toFixed(4)}|${v.ox.toFixed(2)}|${v.oy.toFixed(2)}`;
      if (cache.key !== k) {
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const img = cv.getContext('2d').createImageData(W, H);
        make(img, v);
        cv.getContext('2d').putImageData(img, 0, 0);
        cache.key = k; cache.cv = cv;
      }
      const c = f.ctx;
      c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      c.imageSmoothingEnabled = true;
      c.drawImage(cache.cv, 0, 0, f.w, f.h);
      if (overlay) overlay(f, v);
      toScreen(f);
    }, opts);
    return z;
  }

  // ====================== Pages 194-195: an attractor that is a dust ======================
  const stB = { win: { l0: 2.5, l1: 4, x0: 0, x1: 1 }, k: -1, tap: null };
  const bifWindow = (k) => {
    const a = 0.35, c = 0.4, dl = Math.pow(F_DELTA, k), da = Math.pow(F_ALPHA, k);
    return { l0: LAM_INF - a / dl, l1: LAM_INF + a / dl, x0: 0.5 - c / da, x1: 0.5 + c / da };
  };
  const zB = rasterFig('wB', 'cB',
    (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0.01),
    () => `bif|${stB.win.l0}|${stB.win.l1}|${stB.win.x0}|${stB.win.x1}|${stB.k}`,
    (img, v) => rasterBif(img, v, stB.win, stB.k > 0 && stB.k % 2 === 1),
    (f, v) => {
      const c = f.ctx, w = stB.win;
      const uOf = (lam) => (lam - w.l0) / (w.l1 - w.l0);
      if (LAM_INF > w.l0 && LAM_INF < w.l1) {
        const px = v.ox + uOf(LAM_INF) * v.s;
        c.strokeStyle = PRINT.accent; c.lineWidth = 1; c.setLineDash([4, 4]);
        c.beginPath(); c.moveTo(px, v.oy - v.s * 1.01); c.lineTo(px, v.oy + 4); c.stroke();
        c.setLineDash([]);
      }
      if (stB.tap && stB.tap.lam > w.l0 && stB.tap.lam < w.l1) {
        const px = v.ox + uOf(stB.tap.lam) * v.s;
        c.strokeStyle = PRINT.red; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(px, v.oy - v.s * 1.01); c.lineTo(px, v.oy + 4); c.stroke();
      }
    },
    {
      maxZoom: 60,
      onTap: (wx) => {
        const lam = stB.win.l0 + (stB.win.l1 - stB.win.l0) * wx;
        if (lam <= 0 || lam > 4) return;
        stB.tap = { lam };
        const o = orbitInfo(lam);
        $('rBa').textContent = f2(lam, 6);
        $('rBb').textContent = o.esc ? 'escapes [0, 1]' : o.p ? `cycle of ${o.p} point${o.p > 1 ? 's' : ''}` : 'no short cycle';
        $('rBc').textContent = o.esc ? '—' : f2(o.lyap, 3) + (o.lyap > 0 ? ' — "chaotic"' : '');
        $('infoB').textContent = o.esc ? `At λ = ${f2(lam, 4)} the orbit of ½ escapes: λ > 4 territory.`
          : o.p ? `At λ = ${f2(lam, 4)} the attractor is a cycle of ${o.p} point${o.p > 1 ? 's' : ''}; the Lyapunov exponent ${f2(o.lyap, 3)} is negative, so nearby orbits are pulled in.`
          : `At λ = ${f2(lam, 4)} no cycle of period ≤ 64 shows up and the Lyapunov exponent ${f2(o.lyap, 3)} is ${o.lyap > 0 ? 'positive: the evolution on the attractor looks "chaotic"' : 'near zero: close to a bifurcation'}.`;
        zB.schedule();
      },
    });
  const setWinB = (win, k) => {
    stB.win = win; stB.k = k;
    $('rBk').textContent = k < 0 ? '—' : String(k);
    $('kBv').textContent = k < 0 ? 'off' : `k = ${k}`;
    zB.refit();
  };
  $('wholeB').addEventListener('click', () => { setWinB({ l0: 2.5, l1: 4, x0: 0, x1: 1 }, -1); $('infoB').textContent = ''; });
  $('kBm').addEventListener('click', () => { if (stB.k > 0) setWinB(bifWindow(stB.k - 1), stB.k - 1); });
  $('kBp').addEventListener('click', () => { const k = stB.k < 0 ? 0 : Math.min(7, stB.k + 1); setWinB(bifWindow(k), k); });

  // ====================== Plate 198: the San Marco dragon ======================
  const stM = { count: 64000, seed: 1982, shade: false, orbit: null, anim: 0 };
  let marcoCache = { seed: -1, P: null };
  const MARCO_MAX = 512000;
  const marcoP = () => {
    if (marcoCache.seed !== stM.seed) marcoCache = { seed: stM.seed, P: marcoPoints(MARCO_MAX, stM.seed) };
    return marcoCache.P;
  };
  const zM = rasterFig('wM', 'cM',
    (f) => fitBox(f, { x0: -0.06, x1: 1.06, y0: -0.34, y1: 0.34 }, 0.015),
    () => `marco|${stM.count}|${stM.seed}|${stM.shade}|${stM.anim}`,
    (img, v) => {
      if (stM.shade) rasterMarcoSet(img, v);
      else {
        const d = img.data;
        for (let o = 0; o < d.length; o += 4) { d[o] = 236; d[o + 1] = 235; d[o + 2] = 230; d[o + 3] = 255; }
      }
      const n = stM.anim ? Math.min(stM.anim, stM.count) : stM.count;
      stampDots(img, v, marcoP(), n);
    },
    (f, v) => {
      if (!stM.orbit) return;
      const c = f.ctx, O = stM.orbit;
      c.strokeStyle = PRINT.red; c.lineWidth = 1.2; c.beginPath();
      for (let i = 0; i < O.length; i++) {
        const px = v.ox + O[i][0] * v.s, py = v.oy - O[i][1] * v.s;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
      dot(c, v, O[0][0], O[0][1], 4, PRINT.accent);
      dot(c, v, O[O.length - 1][0], O[O.length - 1][1], 3.2, PRINT.red);
    },
    {
      maxZoom: 2000,
      onTap: (wx, wy) => {
        // forward iteration: the dragon repels, which is why the plate had to run time backward
        let zr = wx, zi = wy;
        const O = [[zr, zi]];
        let fate = '';
        for (let i = 0; i < 160 && !fate; i++) {
          const ar = 1 - zr, ai = -zi;
          const mr = zr * ar - zi * ai, mi = zr * ai + zi * ar;
          zr = 3 * mr; zi = 3 * mi;
          O.push([zr, zi]);
          if (zr * zr + zi * zi > 2500) fate = `flees to infinity after ${i + 1} steps`;
          const er = zr - 2 / 3, ei = zi;
          if (er * er + ei * ei < 1e-5) fate = `creeps to the fixed point ⅔ in ${i + 1} steps`;
        }
        if (!fate) fate = 'is still creeping toward the fixed point ⅔ after 160 steps';
        stM.orbit = O;
        $('infoM').textContent = `Run forward, the orbit of the tapped point ${fate}. The dragon's skin repels; only the backward orbit is attracted to it.`;
        zM.schedule();
      },
    });
  const marksM = stepButtons($('nM'), [1000, 8000, 64000, 512000], (n) => n >= 1000 ? `${n / 1000}k` : String(n), (n) => `${n} points`, (n) => {
    stM.count = n; stM.anim = 0; marksM(n); $('rMa').textContent = n.toLocaleString('en-US'); zM.schedule();
  });
  marksM(stM.count);
  $('fillM').addEventListener('click', () => {
    stM.anim = 200;
    const step = () => {
      if (!stM.anim) return;
      stM.anim = Math.round(stM.anim * 1.09 + 60);
      zM.schedule();
      if (stM.anim < stM.count) requestAnimationFrame(step); else stM.anim = 0;
    };
    requestAnimationFrame(step);
  });
  $('seedM').addEventListener('click', () => {
    stM.seed = (stM.seed * 48271 + 11) % 99991; stM.anim = 0;
    $('rMb').textContent = String(stM.seed);
    zM.schedule();
  });
  $('shadeM').addEventListener('change', (e) => { stM.shade = e.target.checked; zM.schedule(); });
  $('plate198').addEventListener('click', () => {
    stM.count = 64000; stM.seed = 1982; stM.shade = false; stM.orbit = null; stM.anim = 0;
    $('shadeM').checked = false; marksM(64000);
    $('rMa').textContent = '64,000'; $('rMb').textContent = '1982';
    $('infoM').textContent = '';
    zM.refit();
  });

  // ====================== Plate 199: the Pharaoh's Breastplate ======================
  const Q_FIT = 0.6474;
  const stP = { mode: 'dots', count: 64000, seed: 1982, q: Q_FIT, gens: false, anim: null, perm: 0 };
  let pDots = { key: '', P: null }, pCirc = { key: '', C: null };
  const dotsOf = () => {
    const k = `${stP.count}|${stP.seed}|${stP.q}`;
    if (pDots.key !== k) { pDots = { key: k, P: breastPoints(stP.count, stP.seed, stP.q) }; stP.perm = 0; }
    return pDots.P;
  };
  const breastBox = { x0: -1.03, x1: 1.03, y0: -1.03, y1: 1.06 };
  const zP = rasterFig('wP', 'cP',
    (f) => fitBox(f, breastBox, 0.012),
    () => `breast|${stP.mode}|${stP.count}|${stP.seed}|${stP.q}|${stP.gens}|${stP.perm}|${stP.anim ? stP.anim.t.toFixed(3) : ''}`,
    (img, v) => {
      const d = img.data;
      for (let o = 0; o < d.length; o += 4) { d[o] = 236; d[o + 1] = 235; d[o + 2] = 230; d[o + 3] = 255; }
      if (stP.mode === 'dots') {
        const P = dotsOf();
        if (stP.anim) {
          // the set itself stays as a ghost, so the moving cloud is seen to land back on it;
          // every dot slides along its ray through the acting circle's centre
          stampDots(img, v, P, stP.count, 0.1);
          const C = stP.anim.C, t = stP.anim.t, n = stP.count, F = new Float64Array(2 * n);
          for (let i = 0; i < n; i++) {
            const [x, y] = flowPoint(P[2 * i], P[2 * i + 1], C, t);
            F[2 * i] = x; F[2 * i + 1] = y;
          }
          stampDots(img, v, F, n);
        } else stampDots(img, v, P, stP.count);
      }
    },
    (f, v) => {
      const c = f.ctx;
      if (stP.mode === 'circles') {
        const minR = Math.max(1e-5, 0.5 / v.s);
        const k = `${stP.q}|${minR.toFixed(6)}`;
        if (pCirc.key !== k) {
          const C = breastCircles(stP.q, minR);
          pCirc = { key: k, C, e: packingExponent(breastCircles(stP.q, 2e-4)) };
          $('rPc').textContent = C.length.toLocaleString('en-US');
          $('rPd').textContent = isFinite(pCirc.e) ? `≈ ${f2(pCirc.e, 2)}` : '—';
        }
        c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(0.5, Math.min(1.1, v.s / 700));
        if (stP.anim) {
          // mid-flow the circles are no longer circles, so draw them as flowed polylines
          const K = stP.anim.C, t = stP.anim.t;
          c.beginPath();
          let drawn = 0;
          for (const ci of pCirc.C) {
            const pr = ci.r * v.s;
            if (pr < 1.4 || drawn > 4000) continue;
            drawn++;
            const m = Math.max(10, Math.min(48, Math.round(pr / 2)));
            for (let s = 0; s <= m; s++) {
              const a = 2 * Math.PI * s / m;
              const [x, y] = flowPoint(ci.x + ci.r * Math.cos(a), ci.y + ci.r * Math.sin(a), K, t);
              const px = v.ox + x * v.s, py = v.oy - y * v.s;
              if (s === 0) c.moveTo(px, py); else c.lineTo(px, py);
            }
          }
          c.stroke();
        } else {
          c.beginPath();
          for (const ci of pCirc.C) {
            const px = v.ox + ci.x * v.s, py = v.oy - ci.y * v.s, pr = ci.r * v.s;
            if (px + pr < 0 || px - pr > f.w || py + pr < 0 || py - pr > f.h) continue;
            c.moveTo(px + pr, py); c.arc(px, py, pr, 0, Math.PI * 2);
          }
          c.stroke();
        }
      }
      if (stP.anim) {
        // the acting circle holds still while everything else streams through it
        const K = stP.anim.C;
        c.strokeStyle = stP.anim.col; c.lineWidth = 2.2;
        c.beginPath(); c.arc(v.ox + K.x * v.s, v.oy - K.y * v.s, K.r * v.s, 0, Math.PI * 2); c.stroke();
      }
      if (stP.gens) {
        const F = breastFrame(stP.q);
        const draw = (ci, col) => {
          c.strokeStyle = col; c.lineWidth = 1.4; c.setLineDash([6, 4]);
          c.beginPath(); c.arc(v.ox + ci.x * v.s, v.oy - ci.y * v.s, ci.r * v.s, 0, Math.PI * 2); c.stroke();
          c.setLineDash([]);
        };
        draw(F.KA, PRINT.accent); draw(F.KB, PRINT.red); draw(F.KC, '#3f8f6c'); draw(F.KD, '#3f8f6c');
      }
    },
    { maxZoom: 3000 });
  const modeP = stepButtons($('mP'), ['dots', 'circles'], (m) => m === 'dots' ? 'Dots, as printed' : 'The circles themselves', (m) => m, (m) => {
    stP.mode = m; modeP(m); zP.schedule();
  });
  modeP('dots');
  const marksP = stepButtons($('nP'), [4000, 16000, 64000, 256000], (n) => `${n / 1000}k`, (n) => `${n} points`, (n) => {
    stP.count = n; marksP(n); $('rPa').textContent = n.toLocaleString('en-US'); zP.schedule();
  });
  marksP(stP.count);
  $('seedP').addEventListener('click', () => {
    stP.seed = (stP.seed * 48271 + 11) % 99991;
    $('rPb').textContent = String(stP.seed);
    zP.schedule();
  });
  $('gensP').addEventListener('change', (e) => { stP.gens = e.target.checked; zP.schedule(); });
  const K_WORDS = {
    KA: ['K₁', 'the big circle seated on the outer rim: the outer boundary and the bottom necklace circle trade places'],
    KB: ['K₂', 'the circle seated on the inner rim: the inner boundary and the circle below it trade places'],
    KC: ['K₃', 'the left circle through the tangency point: the left horn turns inside out'],
    KD: ['K₄', 'the right circle through the tangency point: the right horn turns inside out'],
  };
  const K_COLS = { KA: PRINT.accent, KB: PRINT.red, KC: '#3f8f6c', KD: '#3f8f6c' };
  function animateInversion(which) {
    if (stP.anim) return;
    const F = breastFrame(stP.q), C = F[which];
    const dur = 1500, t0 = performance.now();
    stP.anim = { C, t: 0, col: K_COLS[which] };
    $('infoP').textContent = `Inverting in ${K_WORDS[which][0]} — ${K_WORDS[which][1]}. The set as a whole lands exactly on itself: that is what self-inverse means.`;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      stP.anim.t = 0.5 - 0.5 * Math.cos(Math.PI * p); // ease in and out
      zP.schedule();
      if (p < 1) requestAnimationFrame(step);
      else {
        // dots: keep the exact image points, so inversions compose run after run
        if (stP.mode === 'dots') {
          const P = dotsOf(), pt = [0, 0];
          for (let i = 0; i < stP.count; i++) {
            pt[0] = P[2 * i]; pt[1] = P[2 * i + 1];
            invertPt(pt, C);
            P[2 * i] = pt[0]; P[2 * i + 1] = pt[1];
          }
          stP.perm++;
        }
        stP.anim = null;
        zP.schedule();
      }
    };
    requestAnimationFrame(step);
  }
  for (const w of ['KA', 'KB', 'KC', 'KD']) $('inv' + w).addEventListener('click', () => animateInversion(w));
  $('qPs').addEventListener('input', (e) => {
    stP.q = Number(e.target.value);
    $('qPv').textContent = f2(stP.q, 3) + (Math.abs(stP.q - Q_FIT) < 5e-4 ? ' (the plate)' : '');
    zP.schedule();
  });
  $('plate199').addEventListener('click', () => {
    stP.mode = 'dots'; stP.count = 64000; stP.seed = 1982; stP.q = Q_FIT; stP.gens = false;
    pDots = { key: '', P: null }; stP.perm = 0; $('infoP').textContent = '';
    modeP('dots'); marksP(64000);
    $('qPs').value = Q_FIT; $('qPv').textContent = f2(Q_FIT, 3) + ' (the plate)';
    $('gensP').checked = false;
    $('rPa').textContent = '64,000'; $('rPb').textContent = '1982';
    zP.refit();
  });
})();
