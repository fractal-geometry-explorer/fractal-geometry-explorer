(() => {
  const pow = Math.pow, log = Math.log;
  const Dspace = (rho) => log(7) / log(rho);
  const Dflat = (rho) => log(5) / log(rho);
  const dfmt = (x) => (Math.abs(x - 1) < 1e-9 ? '1' : x.toFixed(4));
  const rfmt = (rho) => (Math.abs(rho - Math.round(rho)) < 1e-9 ? String(Math.round(rho)) : rho.toFixed(2));

  // an order-1 aggregate as a small figure: the enclosing circle and its five visible balls
  function aggMini(id, rho) {
    const e = (1 - 1 / rho) / Math.SQRT2, r = 1 / rho;
    const balls = [[0, 0], [e, e], [e, -e], [-e, e], [-e, -e]];
    $(id).innerHTML = `<circle cx="0" cy="0" r="1" fill="none" stroke="#8a8a84" stroke-width="0.02" stroke-dasharray="0.05 0.04"/>` +
      balls.map(([x, y]) => `<circle cx="${x.toFixed(4)}" cy="${(-y).toFixed(4)}" r="${r.toFixed(4)}" fill="currentColor"/>`).join('');
  }

  // ====================== Plate 95: Fournier's multiuniverse ======================
  const stA = { mode: 'printed', order: 3, rho: 7, endless: false, turn: 0, tilt: 0 };
  let octLast = { key: '', pts: null };          // one entry: the ratio slider would flood a map
  const octPts = (order, rho) => {
    const key = `${order}|${rho}`;
    if (octLast.key !== key) octLast = { key, pts: octahedral(order, rho) };
    return octLast.pts;
  };
  const zA = zoomable('wA', 'cA', (f) => {
    const R = pow(stA.rho, stA.order);
    return fitBox(f, { x0: -R, x1: R, y0: -R, y1: R }, 0.035);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    c.fillStyle = PRINT.ink;
    if (stA.mode === 'printed') {
      drawFlat(c, v, f.w, f.h, stA.rho, stA.order, stA.endless, 1.1);
    } else {
      const pts = octPts(stA.order, stA.rho);
      const ta = (stA.turn * Math.PI) / 180, ti = (stA.tilt * Math.PI) / 180;
      const ca = Math.cos(ta), sa = Math.sin(ta), ct = Math.cos(ti), st = Math.sin(ti);
      const r = Math.max(v.s, 1.1);
      for (let i = 0; i < pts.length; i += 3) {
        const x = pts[i] * ca - pts[i + 1] * sa, y = pts[i] * sa + pts[i + 1] * ca, z = pts[i + 2];
        const sx = v.ox + x * v.s, sy = v.oy - (y * ct + z * st) * v.s;
        if (sx < -r || sx > f.w + r || sy < -r || sy > f.h + r) continue;
        if (r > 2) { c.beginPath(); c.arc(sx, sy, r, 0, 2 * Math.PI); c.fill(); }
        else c.fillRect(sx - r, sy - r, 2 * r, 2 * r);
      }
    }
    toScreen(f);
  }, { maxZoom: 100000 });
  const MODES_A = { printed: 'On the page', space: 'Turn it in space' };
  const INFO_A = {
    printed: 'The projection and the equatorial section coincide: each dot you see stands for up to three balls, stacked along your line of sight. On the page the pattern multiplies its dots by 5 while growing by 7, so what is printed has dimension log 5/log 7 — less than the universe it depicts.',
    space: 'The same aggregate with its polar balls shown. At tilt 0° you look straight down the polar axis and see the plate; tilt, and each centre dot splits into three. A generic projection keeps all 7<sup>k</sup> balls apart — the plate\'s view is the exception, chosen so the picture stays readable.',
  };
  function setA(refit) {
    markMA(stA.mode); markSA(stA.order);
    const rho = stA.rho, n = stA.order;
    $('endAwrap').hidden = stA.mode !== 'printed';
    $('turnAwrap').hidden = $('tiltAwrap').hidden = stA.mode !== 'space';
    $('cAt').textContent = stA.mode === 'printed' ? (rho === 7 && n === 3 && !stA.endless ? 'As printed' : 'On the page') : 'In space';
    $('cAn').textContent = `order ${n} · ${fmt(pow(stA.mode === 'space' ? 7 : 5, n))} ${stA.mode === 'space' ? 'balls' : 'dots'}${stA.endless ? ' · zoom in forever' : ''}`;
    $('sAv').textContent = `order ${n}`;
    $('rAv').textContent = rfmt(rho);
    $('turnAv').textContent = `${stA.turn}°`; $('tiltAv').textContent = `${stA.tilt}°`;
    $('infoA').innerHTML = INFO_A[stA.mode];
    $('dimA').textContent = `N = 7, 1/r = ${rfmt(rho)} · in space D = log 7/log ${rfmt(rho)} ${rho === 7 ? '= 1' : '≈ ' + dfmt(Dspace(rho))} · on the page N = 5, D = log 5/log ${rfmt(rho)} ≈ ${Dflat(rho).toFixed(4)}`;
    $('rAa').textContent = fmt(pow(7, n));
    $('rAb').textContent = fmt(pow(5, n));
    $('rAc').textContent = dfmt(Dspace(rho));
    $('rAd').textContent = dfmt(Dflat(rho));
    aggMini('miniA', rho);
    $('miniAfx').innerHTML = `N = 7, 1/r = ${rfmt(rho)}<br>5 dots on the page`;
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markSA = stepButtons($('sA'), [1, 2, 3, 4, 5], String, (n) => `Order ${n}`, (n) => { stA.order = n; setA(true); });
  $('rAs').addEventListener('input', (e) => { stA.rho = +e.target.value; setA(true); });
  $('endA').addEventListener('change', (e) => { stA.endless = e.target.checked; setA(false); });
  $('turnAs').addEventListener('input', (e) => { stA.turn = +e.target.value; setA(false); });
  $('tiltAs').addEventListener('input', (e) => { stA.tilt = +e.target.value; setA(false); });
  $('plate95').addEventListener('click', () => {
    Object.assign(stA, { mode: 'printed', order: 3, rho: 7, endless: false });
    $('rAs').value = 7; $('endA').checked = false;
    setA(true);
  });

  // ====================== Plate 96: a flat Fournier universe ======================
  const stB = { order: 4, rho: 5, endless: false };
  const zB = zoomable('wB', 'cB', (f) => {
    const R = pow(stB.rho, stB.order);
    return fitBox(f, { x0: -R, x1: R, y0: -R, y1: R }, 0.035);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    c.fillStyle = PRINT.ink;
    drawFlat(c, v, f.w, f.h, stB.rho, stB.order, stB.endless, 1.1);
    toScreen(f);
  }, { maxZoom: 100000 });
  function setB(refit) {
    markSB(stB.order);
    const rho = stB.rho, n = stB.order, D = Dflat(rho);
    $('cBt').textContent = rho === 5 && n === 4 && !stB.endless ? 'As printed' : 'The flat pattern';
    $('cBn').textContent = `order ${n} · ${fmt(pow(5, n))} dots${stB.endless ? ' · zoom in forever' : ''}`;
    $('sBv').textContent = `order ${n}`;
    $('rBv').textContent = rfmt(rho);
    $('dimB').textContent = `N = 5, 1/r = ${rfmt(rho)} · D = log 5/log ${rfmt(rho)} ${rho === 5 ? '= 1' : '≈ ' + dfmt(D)} · carried one order further than Plate 95`;
    $('infoB').innerHTML = rho === 5
      ? 'With 1/r = 5 the five balls shrink exactly as fast as they multiply: D = 1, Hoyle\'s value, in the plane for all to see.'
      : `With 1/r = ${rfmt(rho)} the pattern keeps N = 5 but D = ${dfmt(D)}: any dimension below log 5/log 3 ≈ 1.4650 can be reached by spreading or crowding the same five balls.`;
    $('rBa').textContent = fmt(pow(5, n));
    $('rBb').textContent = dfmt(D);
    $('rBc').textContent = `${rfmt(rho)}${'⁰¹²³⁴⁵⁶⁷⁸⁹'[n]} = ${fmt(Math.round(pow(rho, n)))}`;
    $('rBd').innerHTML = `∝ R<sup>${dfmt(D)}</sup>`;
    aggMini('miniB', rho);
    $('miniBfx').innerHTML = `N = 5, 1/r = ${rfmt(rho)}<br>D = ${dfmt(D)}`;
    if (refit) zB.refit(); else zB.schedule();
  }
  const markSB = stepButtons($('sB'), [1, 2, 3, 4, 5], String, (n) => `Order ${n}`, (n) => { stB.order = n; setB(true); });
  $('rBs').addEventListener('input', (e) => { stB.rho = +e.target.value; setB(true); });
  $('endB').addEventListener('change', (e) => { stB.endless = e.target.checked; setB(false); });
  $('plate96').addEventListener('click', () => {
    Object.assign(stB, { order: 4, rho: 5, endless: false });
    $('rBs').value = 5; $('endB').checked = false;
    setB(true);
  });

  // ====================== Chapter 9: mass, density and the dark sky ======================
  // each universe for the M(R) chart: how its points are built, its per-order multiplier N and
  // ratio rho (the guide lines are M = R^D and M = R^D/N)
  const GENS_C = {
    f7: { label: 'Fournier, N = 7', pts: () => massRadii(octahedral(5, 7), 3), N: 7, rho: 7, cap: 'N = 7 octahedral universe · orders 0 to 5' },
    h5: { label: 'Flat, N = 5', pts: () => massRadii(quincunx(6, 5), 2), N: 5, rho: 5, cap: 'flat N = 5 universe · orders 0 to 6' },
    p7: { label: "Plate 95's page pattern", pts: () => massRadii(quincunx(6, 7), 2), N: 5, rho: 7, cap: 'the printed pattern · orders 0 to 6' },
  };
  const stC = { mode: 'mass', gen: 'f7' };
  const massCache = {};
  const massOf = (g) => massCache[g] || (massCache[g] = GENS_C[g].pts());
  const SKY_BINS = 1440;
  let skyData = null;
  function skyOf() {
    if (skyData) return skyData;
    const R = pow(5, 6);
    const four = quincunx(6, 5), unif = uniformDisc(four.length / 2, R, 20261025);
    const cover = (bins) => { let k = 0; for (const b of bins) k += b; return k / bins.length; };
    const fb = skyBins(four, SKY_BINS), ub = skyBins(unif, SKY_BINS);
    return (skyData = { R, four, unif, fb, ub, fCover: cover(fb), uCover: cover(ub) });
  }
  const SUP = (n) => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    toScreen(f);
    if (stC.mode === 'mass') {
      const G = GENS_C[stC.gen], dist = massOf(stC.gen), D = log(G.N) / log(G.rho);
      const ml = 56, mr = 14, mt = 14, mb = 36, iw = f.w - ml - mr, ih = f.h - mt - mb;
      const lx0 = Math.log10(0.8), lx1 = Math.log10(dist[dist.length - 1]) + 0.25;
      const ly0 = Math.log10(0.8), ly1 = Math.log10(dist.length) + 0.25;
      const X = (u) => ml + ((Math.log10(u) - lx0) / (lx1 - lx0)) * iw;
      const Y = (n) => mt + ih - ((Math.log10(n) - ly0) / (ly1 - ly0)) * ih;
      c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, mt, iw, ih);
      c.fillStyle = PRINT.muted; c.font = '500 10.5px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let e = 0; e <= Math.floor(lx1); e++) {
        const x = ml + ((e - lx0) / (lx1 - lx0)) * iw;
        c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(x, mt); c.lineTo(x, mt + ih); c.stroke();
        c.fillText(`10${SUP(e)}`, x, mt + ih + 6);
      }
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let e = 0; e <= Math.floor(ly1); e++) {
        const y = mt + ih - ((e - ly0) / (ly1 - ly0)) * ih;
        c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(ml, y); c.lineTo(ml + iw, y); c.stroke();
        c.fillText(`10${SUP(e)}`, ml - 6, y);
      }
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText('radius R (order-0 balls = 1)', ml + iw / 2, f.h - 15);
      c.save(); c.translate(14, mt + ih / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText('mass M(R)', 0, 0); c.restore();
      // the two guide lines M = R^D and M = R^D/N, then the counted staircase between them
      const uA = pow(10, lx0), uB = pow(10, lx1);
      for (const [den, color] of [[1, PRINT.red], [G.N, PRINT.gray]]) {
        c.strokeStyle = color; c.lineWidth = 1.4; c.setLineDash([6, 4]); c.beginPath();
        c.moveTo(X(uA), Y(Math.max(0.8, pow(uA, D) / den)));
        c.lineTo(X(uB), Y(pow(uB, D) / den));
        c.stroke(); c.setLineDash([]);
      }
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath();
      c.moveTo(X(0.8), Y(1));
      let m = 1;
      for (let i = 1; i < dist.length; i++) {
        if (i + 1 < dist.length && dist[i + 1] - dist[i] < 1e-9) continue;
        c.lineTo(X(dist[i]), Y(m)); c.lineTo(X(dist[i]), Y(i + 1)); m = i + 1;
      }
      c.lineTo(X(uB), Y(m));
      c.stroke();
      c.fillStyle = PRINT.red; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText(`M = R${D === 1 ? '' : SUP(0) + '·⁸²⁷'}  (slope D = ${D === 1 ? '1' : D.toFixed(4)})`, ml + 10, mt + 8);
      c.fillStyle = PRINT.gray;
      c.fillText(`sags to M = R${D === 1 ? '' : SUP(0) + '·⁸²⁷'}/${G.N}`, ml + 10, mt + 24);
    } else {
      const S = skyOf();
      const cx = [f.w * 0.27, f.w * 0.73], cy = f.h * 0.46, rr = Math.min(f.w * 0.21, f.h * 0.36);
      const draw = (k, pts, bins, label) => {
        const s = (rr * 0.94) / S.R;
        c.fillStyle = PRINT.ink;
        for (let i = 0; i < pts.length; i += 2) {
          const x = cx[k] + pts[i] * s, y = cy - pts[i + 1] * s;
          c.fillRect(x - 0.5, y - 0.5, 1.1, 1.1);
        }
        c.strokeStyle = PRINT.rule; c.lineWidth = 1;
        c.beginPath(); c.arc(cx[k], cy, rr, 0, 2 * Math.PI); c.stroke();
        c.strokeStyle = PRINT.red; c.lineWidth = 5;
        let b0 = -1;
        for (let b = 0; b <= bins.length; b++) {
          const on = b < bins.length && bins[b];
          if (on && b0 < 0) b0 = b;
          if (!on && b0 >= 0) {
            const a0 = (b0 / bins.length) * 2 * Math.PI, a1 = (b / bins.length) * 2 * Math.PI;
            c.beginPath(); c.arc(cx[k], cy, rr, -a1, -a0); c.stroke();
            b0 = -1;
          }
        }
        c.fillStyle = PRINT.muted; c.font = '600 12px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
        c.fillText(label, cx[k], cy + rr + 12);
      };
      draw(0, S.four, S.fb, `Fournier flat, D = 1 · sky ${(S.fCover * 100).toFixed(0)}% lit`);
      draw(1, S.unif, S.ub, `uniform scatter, D = 2 · sky ${(S.uCover * 100).toFixed(0)}% lit`);
    }
  });
  const MODES_C = { mass: 'Mass within R', sky: 'The sky from inside' };
  const INFO_C = {
    mass: 'Count the balls within distance R of the central one, on log paper. The count climbs the dashed line M = R<sup>D</sup>, sagging between aggregate radii exactly as the chapter says. The approximate density M(R)/R³ therefore dies away — the universe has no global density, only a dimension.',
    sky: 'Stand on the central ball and mark every direction in which some other ball lies (red rim). In the Fournier universe whole reaches of the horizon stay black however many orders you add; scatter the same number of balls uniformly and almost every direction is lit — Kepler\'s "blazing sky". The marks here go down to the 15,625 balls shown; the limit set of lit directions only gets thinner relative to the dark gaps.',
  };
  function setC(refit) {
    markMC(stC.mode); markGC(stC.gen);
    $('genCwrap').hidden = stC.mode !== 'mass';
    $('cCt').textContent = MODES_C[stC.mode];
    $('infoC').innerHTML = INFO_C[stC.mode];
    if (stC.mode === 'mass') {
      const G = GENS_C[stC.gen], D = log(G.N) / log(G.rho);
      $('cCn').textContent = G.cap;
      $('rCa').textContent = dfmt(D);
      $('rCb').innerHTML = `∝ R<sup>−${(3 - D).toFixed(D === 1 ? 0 : 2)}</sup>`;
      $('rCc').textContent = $('rCd').textContent = '—';
    } else {
      const S = skyOf();
      $('cCn').textContent = `${fmt(S.four.length / 2)} balls each, seen from the central ball`;
      $('rCa').textContent = '1 and 2';
      $('rCb').textContent = '—';
      $('rCc').textContent = `${(S.fCover * 100).toFixed(1)}%`;
      $('rCd').textContent = `${(S.uCover * 100).toFixed(1)}%`;
    }
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(true); });
  const markGC = stepButtons($('gC'), Object.keys(GENS_C), (k) => GENS_C[k].label, (k) => `Universe: ${GENS_C[k].label}`, (k) => { stC.gen = k; setC(false); });

  setA(true); setB(true); setC(true);
})();
