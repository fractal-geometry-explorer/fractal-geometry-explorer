(() => {
  const fx3 = (x) => x.toFixed(3);
  const pct = (x) => `${(100 * x).toFixed(1)}%`;

  // ====================== Cantor dusts of positive measure (pages 147-148) ======================
  const stA = { mode: 'bar', l1: 1 / 3, q: 0.5, K: 7 };
  const KS_A = [1, 2, 3, 4, 5, 6, 7, 8];
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'bar') return fitBox(f, { x0: -0.02, x1: 1.02, y0: -(stA.K + 1) * 0.12, y1: 0.05 }, 0.02);
    if (stA.mode === 'plane') return fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.02, y1: 1.02 }, 0.02);
    return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
  }, (f, v) => {
    const c = f.ctx, { l1, q, K } = stA;
    paper(f, PRINT.paper);
    if (stA.mode === 'bar') {
      // stages 0..K as rows of constant thickness, Plate 80's style
      toWorld(f, v);
      const TH = 0.07, PITCH = 0.12;
      for (let k = 0; k <= K; k++) {
        const rows = fatDustIntervals(l1, q, k), y = -k * PITCH;
        c.fillStyle = PRINT.ink;
        for (const [a, b] of rows) c.fillRect(a, y - TH, b - a, TH);
      }
      toScreen(f);
      c.font = '500 10.5px "IBM Plex Mono", monospace'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = PRINT.muted;
      for (let k = 0; k <= K; k++) {
        const y = v.oy + (k * 0.12 + 0.035) * v.s;
        if (y > 4 && y < f.h - 4 && v.s * 0.12 > 13) c.fillText(`k = ${k} · ${remaining(l1, q, k).toFixed(3)}`, v.ox - 8, y);
      }
    } else if (stA.mode === 'plane') {
      toWorld(f, v);
      const { squares } = crossDust(l1, q, Math.min(K, 7));
      c.fillStyle = PRINT.ink;
      for (const [x, y, s] of squares) c.fillRect(x, y, s, s);
      toScreen(f);
    } else {
      toScreen(f);
      c.lineJoin = 'round'; c.lineCap = 'round';
      if (stA.mode === 'length') {
        const ch = chart(f, { x: { min: 0, max: 24, log: false, label: 'stage k' }, y: { min: 0, max: 1, log: false, label: 'remaining length' } });
        ch.clip();
        const qs = [[stA.q, PRINT.red, 2.2], [1, PRINT.ink, 1.6]];
        for (const [qq, col, lw] of qs) {
          c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
          for (let k = 0; k <= 24; k++) { const y = ch.Y(remaining(stA.l1, qq, k)); if (k) c.lineTo(ch.X(k), y); else c.moveTo(ch.X(k), y); }
          c.stroke();
        }
        const lim = remainingLimit(stA.l1, stA.q);
        c.strokeStyle = PRINT.red; c.lineWidth = 1; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(ch.X(0), ch.Y(lim)); c.lineTo(ch.X(24), ch.Y(lim)); c.stroke(); c.setLineDash([]);
        ch.unclip();
        c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
        c.fillStyle = PRINT.red; c.fillText(`shrinking tremas, q = ${stA.q.toFixed(2)}: length -> ${lim.toFixed(3)}`, ch.ml + 10, ch.mt + 8);
        c.fillStyle = PRINT.ink; c.fillText('constant tremas, q = 1: length -> 0', ch.ml + 10, ch.mt + 24);
      } else {
        const ch = chart(f, { x: { min: 0, max: 24, log: false, label: 'stage k' }, y: { min: 0, max: 1.05, log: false, label: 'formal dimension Dk' } });
        ch.clip();
        c.strokeStyle = '#b9b7af'; c.lineWidth = 1; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(ch.X(0), ch.Y(1)); c.lineTo(ch.X(24), ch.Y(1)); c.stroke(); c.setLineDash([]);
        c.strokeStyle = PRINT.red; c.lineWidth = 2.2; c.beginPath();
        for (let k = 1; k <= 24; k++) { const y = ch.Y(formalDim(stA.l1, stA.q, k)); if (k > 1) c.lineTo(ch.X(k), y); else c.moveTo(ch.X(k), y); }
        c.stroke();
        c.strokeStyle = PRINT.ink; c.lineWidth = 1.6; c.beginPath();
        for (let k = 1; k <= 24; k++) { const y = ch.Y(formalDim(stA.l1, 1, k)); if (k > 1) c.lineTo(ch.X(k), y); else c.moveTo(ch.X(k), y); }
        c.stroke();
        ch.unclip();
        c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
        c.fillStyle = PRINT.red; c.fillText(`q = ${stA.q.toFixed(2)}: Dk drifts up to D = 1`, ch.ml + 10, ch.mt + 8);
        c.fillStyle = PRINT.ink; c.fillText(`q = 1: Dk stays at log 2/log(2/(1-λ₁)) = ${formalDim(stA.l1, 1, 1).toFixed(4)}`, ch.ml + 10, ch.mt + 24);
      }
    }
  });
  const MODES_A = { bar: 'The bar', plane: 'The plane dust', length: 'Remaining length', dim: 'Drifting Dₖ' };
  const INFO_A = {
    bar: 'Stage k bisects every interval by a trema centred on its midpoint, ratio λₖ — the bisection makes the dust, the ratios decide the measure. Each row is labelled with its remaining length Πₖ(1 − λₖ). With q < 1 the rows stop thinning; at q = 1 they die at Cantor\'s geometric rate.',
    plane: 'The same in the plane: cut a cross of relative area λₖ from the unit square, leaving four tiles, and repeat with λ₂, λ₃, … The remaining area is the same product Π(1 − λₖ), so the limit is a dust (D_T = 0) of positive area: D = 2. In E dimensions, positive volume and D = E.',
    length: 'The product Π(1 − λₖ) against the stage. It converges to a positive limit exactly when Σλₖ < ∞ — the red curve flattens where its tremas have become negligible — while constant ratios (black) decay geometrically to 0.',
    dim: 'The dust with positive length has no similarity dimension, but setting rₖ = (1 − λₖ)/2 defines the formal Dₖ = log 2/log(1/rₖ) of the stage. When it drifts slowly it embodies Chapter 3\'s effective dimension: this dust looks like a D < 1 Cantor dust at coarse resolutions and like D = 1 in the fine.',
  };
  function setA(refit) {
    markMA(stA.mode); markKA(stA.K);
    $('kAg').hidden = stA.mode === 'length' || stA.mode === 'dim';
    $('l1vA').textContent = `λ₁ = ${stA.l1.toFixed(3)}`;
    $('qvA').textContent = `q = ${stA.q.toFixed(2)}`;
    const lim = remainingLimit(stA.l1, stA.q);
    $('cAt').textContent = MODES_A[stA.mode];
    $('cAn').textContent = `λ₁ = ${stA.l1.toFixed(3)}, q = ${stA.q.toFixed(2)}` + (stA.mode === 'bar' || stA.mode === 'plane' ? ` · ${stA.K} stages` : '');
    $('infoA').innerHTML = INFO_A[stA.mode];
    $('dimA').textContent = `λₖ = λ₁qᵏ⁻¹ · remaining measure Π(1 − λₖ) ≈ ${lim.toFixed(3)} · D_T = 0, D = ${stA.q < 1 ? (stA.mode === 'plane' ? '2' : '1') : formalDim(stA.l1, 1, 1).toFixed(4)}`;
    const atK = remaining(stA.l1, stA.q, stA.K);
    $('rAa').textContent = stA.mode === 'plane' ? `${fx3(atK)} (area)` : fx3(atK);
    $('rAb').textContent = stA.q >= 1 ? '0' : fx3(lim);
    $('rAc').textContent = formalDim(stA.l1, stA.q, stA.K).toFixed(4);
    $('rAd').textContent = stA.q < 1 ? (stA.mode === 'plane' ? '2 and 0' : '1 and 0') : `${formalDim(stA.l1, 1, 1).toFixed(3)} and 0`;
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markKA = stepButtons($('kA'), KS_A, String, (k) => `${k} stages`, (k) => { stA.K = k; setA(stA.mode === 'bar'); });
  $('l1sA').addEventListener('input', (e) => { stA.l1 = +e.target.value; setA(false); });
  $('qsA').addEventListener('input', (e) => { stA.q = +e.target.value; setA(false); });
  $('fatA').addEventListener('click', () => { Object.assign(stA, { l1: 1 / 3, q: 0.5 }); $('l1sA').value = 1 / 3; $('qsA').value = 0.5; setA(false); });
  $('cantorA').addEventListener('click', () => { Object.assign(stA, { l1: 1 / 3, q: 1 }); $('l1sA').value = 1 / 3; $('qsA').value = 1; setA(false); });

  // ====================== A curve of positive area (pages 148-149) ======================
  const stB = { mode: 'marsh', l1: 0.4, q: 0.6, K: 8 };
  const zB = zoomable('wB', 'cB', (f) => {
    if (stB.mode === 'chart') return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.02, y1: 0.78 }, 0.02);
  }, (f, v) => {
    const c = f.ctx, { l1, q } = stB;
    paper(f, PRINT.paper);
    if (stB.mode !== 'chart') {
      toWorld(f, v);
      const tris = knoppTriangles(l1, q, stB.K);
      const paths = chunked(tris.length, (p, i) => {
        const t = tris[i];
        p.moveTo(t[0], t[1]); p.lineTo(t[2], t[3]); p.lineTo(t[4], t[5]);
      }, 1024);
      solid(c, paths, stB.mode === 'marsh' ? PRINT.ink : '#b7b5ac', 0.5 / v.s);
      if (stB.mode === 'curve') {
        // the chain of entry points approximates the limit curve
        c.strokeStyle = PRINT.red; c.lineWidth = 1.8 / v.s; c.beginPath();
        c.moveTo(tris[0][0], tris[0][1]);
        for (const t of tris) c.lineTo(t[2], t[3]);
        c.lineTo(tris[tris.length - 1][4], tris[tris.length - 1][5]);
        c.stroke();
      }
      toScreen(f);
    } else {
      toScreen(f);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const ch = chart(f, { x: { min: 0, max: 16, log: false, label: 'stage k' }, y: { min: 0, max: 1, log: false, label: 'marsh area / starting area' } });
      ch.clip();
      for (const [qq, col, lw] of [[stB.q, PRINT.red, 2.2], [1, PRINT.ink, 1.6]]) {
        c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
        for (let k = 0; k <= 16; k++) { const y = ch.Y(remaining(stB.l1, qq, k)); if (k) c.lineTo(ch.X(k), y); else c.moveTo(ch.X(k), y); }
        c.stroke();
      }
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.red; c.fillText(`q = ${stB.q.toFixed(2)}: the curve keeps area ${remainingLimit(stB.l1, stB.q).toFixed(3)}`, ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.ink; c.fillText('q = 1: an ordinary Koch-like curve, area 0', ch.ml + 10, ch.mt + 24);
    }
  });
  const MODES_B = { marsh: 'The marshland', curve: 'The chain of triangles', chart: 'The area' };
  const INFO_B = {
    marsh: 'What area remains after the wedges of ratios λ₁ … λₖ are gone. Each triangle sheds exactly the share λₖ, so the ink covers Π(1 − λₖ) of the starting triangle at every stage — zoom in: the marsh is all edge, and no disc of any size will ever fit inside it.',
    curve: 'The order in which the limit curve threads the triangles (red), entry to exit. Every triangle chain shrinks to a point, so the limit is a continuous curve from corner to corner; removing its point in any wedge tip splits it, hence D_T = 1.',
    chart: 'The marsh area against the stage: the same product as the linear dust, now read as area. Positive exactly when Σλₖ < ∞.',
  };
  const KS_B = [2, 4, 6, 8, 10, 12];
  function setB(refit) {
    markMB(stB.mode); markKB(stB.K);
    $('l1vB').textContent = `λ₁ = ${stB.l1.toFixed(2)}`;
    $('qvB').textContent = `q = ${stB.q.toFixed(2)}`;
    const lim = remainingLimit(stB.l1, stB.q);
    $('cBt').textContent = MODES_B[stB.mode];
    $('cBn').textContent = `λ₁ = ${stB.l1.toFixed(2)}, q = ${stB.q.toFixed(2)} · stage ${stB.K}`;
    $('infoB').innerHTML = INFO_B[stB.mode];
    $('dimB').textContent = `marshland area Π(1 − λₖ) ≈ ${lim.toFixed(3)} · the limit: a curve, D_T = 1, with ${stB.q < 1 ? 'D = 2 and positive area' : 'zero area'}`;
    $('rBa').textContent = fx3(remaining(stB.l1, stB.q, stB.K));
    $('rBb').textContent = stB.q >= 1 ? '0' : fx3(lim);
    $('rBc').textContent = fmt(2 ** stB.K);
    $('rBd').textContent = stB.q < 1 ? '2 and 1' : '< 2, and 1';
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(true); });
  const markKB = stepButtons($('kB'), KS_B, String, (k) => `${k} stages`, (k) => { stB.K = k; setB(false); });
  $('l1sB').addEventListener('input', (e) => { stB.l1 = +e.target.value; setB(false); });
  $('qsB').addEventListener('input', (e) => { stB.q = +e.target.value; setB(false); });
  $('posB').addEventListener('click', () => { Object.assign(stB, { l1: 0.4, q: 0.6 }); $('l1sB').value = 0.4; $('qsB').value = 0.6; setB(false); });
  $('zeroB').addEventListener('click', () => { Object.assign(stB, { q: 1 }); $('qsB').value = 1; setB(false); });

  // ====================== Arteries, veins and flesh (pages 149-150) ======================
  const stC = { l1: 0.3, q: 0.55, K: 5 };
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, { x0: -0.02, x1: 1.02, y0: -0.02, y1: 1.02 }, 0.02), (f, v) => {
    const c = f.ctx, { l1, q, K } = stC;
    paper(f, PRINT.paper);
    toWorld(f, v);
    const { squares, crosses } = crossDust(l1, q, K);
    // tissue first, then the vessels over it, stage by stage so late cuts stay visible
    c.fillStyle = PRINT.ink;
    for (const [x, y, s] of squares) c.fillRect(x, y, s, s);
    for (const [x, y, s, u, k] of crosses) {
      const w = s * u, a = (s - w) / 2;
      c.fillStyle = k % 2 ? '#c2452d' : '#2f5f9e';
      c.fillRect(x + a, y, w, s);
      c.fillRect(x, y + a, s, w);
    }
    toScreen(f);
  });
  const KS_C = [1, 2, 3, 4, 5, 6];
  function setC(refit) {
    markKC(stC.K);
    $('l1vC').textContent = `λ₁ = ${stC.l1.toFixed(2)}`;
    $('qvC').textContent = `q = ${stC.q.toFixed(2)}`;
    const lim = remainingLimit(stC.l1, stC.q);
    $('cCn').textContent = `λ₁ = ${stC.l1.toFixed(2)}, q = ${stC.q.toFixed(2)} · ${stC.K} stages`;
    // every tissue point sits in a stage-k tile, whose own cross is cut at stage k+1:
    // tile side after k stages is prod (1 - u_j)/2
    const side1 = (1 - crossWidth(stC.l1, stC.q, 1)) / 2;
    const side2 = side1 * (1 - crossWidth(stC.l1, stC.q, 2)) / 2;
    $('infoC').innerHTML = stC.q < 1
      ? `With q = ${stC.q.toFixed(2)} the blood takes <b>${pct(1 - lim)}</b> of the section and the tissue keeps <b>${pct(lim)}</b> — yet no tissue disc of any size is free of vessels: zoom into any black tile and the next stages cut it again.`
      : 'At q = 1 the tissue share dies geometrically: all flesh and no blood is impossible, but so is all blood and no flesh — the shrinking schedule is what feeds both demands at once.';
    $('rCa').textContent = stC.q >= 1 ? '0' : pct(lim);
    $('rCb').textContent = stC.q >= 1 ? '100%' : pct(1 - lim);
    // distance bounds: a point in a stage-k tile has the tile's own next odd/even cut within the tile
    $('rCc').textContent = `${side1.toFixed(3)} of any point`;
    $('rCd').textContent = `${side2.toFixed(4)} of any point`;
    if (refit) zC.refit(); else zC.schedule();
  }
  const markKC = stepButtons($('kC'), KS_C, String, (k) => `${k} stages`, (k) => { stC.K = k; setC(false); });
  $('l1sC').addEventListener('input', (e) => { stC.l1 = +e.target.value; setC(false); });
  $('qsC').addEventListener('input', (e) => { stC.q = +e.target.value; setC(false); });
  $('fleshC').addEventListener('click', () => { Object.assign(stC, { l1: 0.3, q: 0.55 }); $('l1sC').value = 0.3; $('qsC').value = 0.55; setC(false); });
  $('zeroC').addEventListener('click', () => { Object.assign(stC, { q: 1 }); $('qsC').value = 1; setC(false); });

  setA(true); setB(true); setC(true);
})();
