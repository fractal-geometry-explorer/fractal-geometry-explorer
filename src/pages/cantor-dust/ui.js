(() => {

  // a dust generator as a small figure: the kept pieces on a dashed [0, 1]
  function dustMini(id, N, r) {
    const S = pieceStarts(N, r);
    $(id).innerHTML = `<line x1="0" y1="0" x2="1" y2="0" stroke="#8a8a84" stroke-width="0.012" stroke-dasharray="0.03 0.022"/>` +
      S.map((s) => `<line x1="${s.toFixed(4)}" y1="0" x2="${(s + r).toFixed(4)}" y2="0" stroke="currentColor" stroke-width="0.055"/>`).join('') +
      `<g fill="currentColor">${S.flatMap((s) => [s, s + r]).map((x) => `<circle cx="${x.toFixed(4)}" cy="0" r="0.026"/>`).join('')}</g>`;
  }
  const pow = Math.pow, sup = (n) => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x) => { if (x >= 0.001) return x.toFixed(x >= 0.1 ? 3 : 4); const [m, e] = x.toExponential(1).split('e'); return `${m}·10⁻${sup(-e)}`; };
  const barsPath = (N, r, n, pitch, t) => chunked(n + 1, (p, k) => {
    const { starts, len } = dustPieces(N, r, k);
    for (const a of starts) p.rect(a, -(pitch(k) + t), len, t);
  }, 1);

  // ====================== Plate 80: the Cantor bar ======================
  const stA = { n: 7, mode: 'printed' };
  const cacheA = {};
  function dataA() {
    const key = `${stA.mode}|${stA.n}`;
    if (cacheA[key]) return cacheA[key];
    let out;
    if (stA.mode === 'printed') out = { paths: barsPath(2, 1 / 3, stA.n, barTop, BAR_T) };
    else if (stA.mode === 'cake') out = { H: 0.62 };
    else {
      const { starts, len } = dustPieces(2, 1 / 3, stA.n), R0 = 0.42, DR = 0.58, cx = 0.5, cy = 0;
      out = { paths: chunked(starts.length, (p, i) => {
        const inn = R0 + starts[i] * DR, outr = R0 + (starts[i] + len) * DR;
        p.moveTo(cx + outr, cy); p.arc(cx, cy, outr, 0, 2 * Math.PI);
        p.moveTo(cx + inn, cy); p.arc(cx, cy, inn, 0, 2 * Math.PI, true);
      }) };
    }
    return (cacheA[key] = out);
  }
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'cake') return fitBox(f, { x0: -0.03, x1: 1.03, y0: -0.03, y1: 0.65 }, 0.03);
    if (stA.mode === 'rings') return fitBox(f, { x0: -0.55, x1: 1.55, y0: -1.05, y1: 1.05 }, 0.02);
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: -(barTop(stA.n) + BAR_T + 0.03), y1: 0.03 }, 0.03);
  }, (f, v) => {
    const c = f.ctx, D = dataA();
    paper(f, PRINT.paper); toWorld(f, v);
    c.fillStyle = PRINT.ink;
    if (stA.mode === 'cake') {
      // each layer keeps at least a pen's width, as a plotter would draw it
      const { starts, len } = dustPieces(2, 1 / 3, stA.n), h = Math.max(len * D.H, 0.75 / v.s);
      for (const a of starts) c.fillRect(0, a * D.H + (len * D.H - h) / 2, 1, h);
    } else {
      if (stA.mode === 'rings') { c.beginPath(); c.arc(0.5, 0, 0.36, 0, 2 * Math.PI); c.fillStyle = PRINT.gray; c.fill(); c.fillStyle = PRINT.ink; }
      for (const p of D.paths) c.fill(p);
    }
    toScreen(f);
  });
  const MODES_A = { printed: 'The bar, as printed', cake: 'Cantor cake', rings: "Saturn's rings" };
  const INFO_A = {
    printed: 'Each row is one more stage of curdling. The matter conserved through every stage ends up "hammered" into ever denser slugs — the drawing keeps their thickness constant and lets the print (or your screen) give out instead.',
    cake: 'Start the same curdling from a pancake much less thick than it is wide. Dough curdles into thinner pancakes, "exuding an appropriate filling", and the limit is an infinitely extrapolated Napoleon — a <b>Cantor cake</b>. Here, seen from the side: the dust is vertical, each layer runs the full width.',
    rings: "Voyager found Saturn's rings broken by very many, mostly very thin gaps, and diaphanous — light passes through, as befits a set that is \"thin and spare\". The caption's picture: circles whose radii run over a Cantor dust (the product of a dust by a circle). This drawing is our illustration of that remark.",
  };
  function setA(refit) {
    markMA(stA.mode); markSA(stA.n);
    const n = stA.n;
    $('cAt').textContent = { printed: 'Cantor bar', cake: 'Cantor cake', rings: "Saturn's rings" }[stA.mode];
    $('cAn').textContent = stA.mode === 'printed' ? `stages 0 to ${n}` : `stage ${n}`;
    $('sAv').textContent = `stage ${n}`;
    $('infoA').innerHTML = INFO_A[stA.mode];
    $('rAa').textContent = fmt(pow(2, n));
    $('rAb').textContent = `3⁻${sup(n)} ≈ ${sci(pow(3, -n))}`;
    $('rAc').textContent = `(2/3)${sup(n)} ≈ ${sci(pow(2 / 3, n))}`;
    $('rAd').textContent = `(3/2)${sup(n)} ≈ ${pow(1.5, n).toFixed(1)}×`;
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Draw: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markSA = stepButtons($('sA'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], String, (n) => `Stage ${n}`, (n) => { stA.n = n; setA(stA.mode === 'printed'); });
  $('plate80').addEventListener('click', () => { Object.assign(stA, { n: 7, mode: 'printed' }); setA(true); });
  dustMini('miniA', 2, 1 / 3);

  // ====================== Plate 81: the Cantor curtains ======================
  const stB = { which: 'D', marks: true, showCut: false, cut: 0.6309 };
  let imgB = { key: '', img: null };            // the rastered curtain, reused while the view holds
  const PP = [236, 235, 230], KK = [21, 21, 21];
  const rOf = (t) => (stB.which === 'D' ? (t < 1e-4 ? 0 : Math.min(0.5, pow(2, -1 / t))) : Math.min(0.5, t / 2));
  // switching curtains keeps the cut on the same dust: on the D curtain its height is D, on the r curtain 2r
  const cutFor = (which, t) => (which === 'r' ? pow(2, 1 - 1 / t) : Math.LN2 / Math.log(2 / t));
  const setWhich = (k) => { if (k !== stB.which) stB.cut = cutFor(k, stB.cut); stB.which = k; };
  const small = (x, d) => (x >= pow(10, -d) ? x.toFixed(d) : x > 0 ? sci(x) : '0');
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, { x0: -0.14, x1: 1.14, y0: -0.02, y1: 1.02 }, 0.02), (f, v) => {
    const c = f.ctx, W = f.canvas.width, H = f.canvas.height;
    const key = `${stB.which}|${W}|${H}|${v.s}|${v.ox}|${v.oy}`;
    if (imgB.key !== key) {
      const img = c.createImageData(W, H), d = img.data, px = 1 / (v.s * f.dpr), wx0 = -v.ox / v.s, buf = new Float64Array(W);
      for (let j = 0; j < H; j++) {
        const wy = (v.oy - (j + 0.5) / f.dpr) / v.s, base = j * W * 4;
        let inside = wy >= 0 && wy <= 1;
        const r = inside ? rOf(wy) : 0;
        if (r < 1e-6) inside = false;
        if (inside) { buf.fill(0); coverDust(buf, 2, r, wx0, px, 0, 1, 40, dustDim(2, r) - 1); }
        for (let i = 0; i < W; i++) {
          const cv = inside ? Math.min(1, buf[i]) : 0, o = base + 4 * i;
          d[o] = PP[0] + (KK[0] - PP[0]) * cv; d[o + 1] = PP[1] + (KK[1] - PP[1]) * cv; d[o + 2] = PP[2] + (KK[2] - PP[2]) * cv; d[o + 3] = 255;
        }
      }
      imgB = { key, img };
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.putImageData(imgB.img, 0, 0);
    toScreen(f);
    const mark = (wy, label) => {
      const y = v.oy - wy * v.s, a0 = v.ox - 0.1 * v.s, a1 = v.ox - 0.018 * v.s, b0 = v.ox + 1.018 * v.s, b1 = v.ox + 1.1 * v.s;
      c.strokeStyle = c.fillStyle = PRINT.ink; c.lineWidth = 1.6;
      for (const [xa, xb, s] of [[a0, a1, 1], [b1, b0, -1]]) {
        c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke();
        c.beginPath(); c.moveTo(xb + s * 1, y); c.lineTo(xb - s * 6, y - 4); c.lineTo(xb - s * 6, y + 4); c.closePath(); c.fill();
      }
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText(label, a0, y - 4);
    };
    if (stB.marks) mark(stB.which === 'D' ? Math.log(2) / Math.log(3) : 2 / 3, stB.which === 'D' ? 'D = 0.6309' : 'r = 1/3');
    if (stB.showCut) {
      const y = v.oy - stB.cut * v.s;
      c.strokeStyle = PRINT.red; c.lineWidth = 1.4; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(v.ox - 0.02 * v.s, y); c.lineTo(v.ox + 1.02 * v.s, y); c.stroke(); c.setLineDash([]);
    }
  }, { onTap: (wx, wy) => { if (wy >= 0 && wy <= 1 && wx >= -0.1 && wx <= 1.1) { stB.cut = Math.max(0.02, wy); stB.showCut = true; setB(false); } } });
  const INFO_B = {
    D: 'Linear in D: the dimension falls off evenly from 1 to 0, so r = 2<sup>−1/D</sup>. Near the bottom r plunges and the folds rush to the corners.',
    r: 'Linear in r: the ratio falls off evenly from 1/2 to 0. The triadic dust, r = 1/3, sits two thirds of the way up.',
  };
  function setB(refit) {
    markMB(stB.which);
    $('cBt').textContent = stB.which === 'D' ? 'The D curtain' : 'The r curtain';
    $('cBn').textContent = stB.which === 'D' ? 'D runs from 1 at the top to 0 at the bottom' : 'r runs from 1/2 at the top to 0 at the bottom';
    $('infoB').innerHTML = INFO_B[stB.which] + (stB.showCut ? '' : ' Tap the figure, or turn on the cut, to read r and D along any horizontal line.');
    $('markB').checked = stB.marks;
    $('cutB').checked = stB.showCut;
    $('cutWrap').hidden = !stB.showCut;
    if (stB.showCut) {
      const r = rOf(stB.cut);
      $('cutBs').value = stB.cut;
      $('cutBv').textContent = stB.which === 'D' ? `D = ${stB.cut.toFixed(3)}` : `r = ${small(stB.cut / 2, 3)}`;
      $('rBa').textContent = small(r, 4);
      $('rBb').textContent = r > 0 ? dustDim(2, r).toFixed(4) : '0';
      $('rBc').textContent = (1 - 2 * r).toFixed(4);
      $('rBd').textContent = r > 0.4999 ? '1' : '0';
    } else { $('rBa').textContent = $('rBb').textContent = $('rBc').textContent = '—'; $('rBd').textContent = '0'; }
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), ['D', 'r'], (k) => (k === 'D' ? 'Linear in D (top figure)' : 'Linear in r (bottom figure)'), (k) => `Vertical coordinate ${k}`, (k) => { setWhich(k); setB(false); });
  $('markB').addEventListener('change', (e) => { stB.marks = e.target.checked; setB(false); });
  $('cutB').addEventListener('change', (e) => { stB.showCut = e.target.checked; setB(false); });
  $('cutBs').addEventListener('input', (e) => { stB.cut = +e.target.value; setB(false); });
  $('plate81t').addEventListener('click', () => { setWhich('D'); Object.assign(stB, { marks: true, showCut: false }); setB(true); });
  $('plate81b').addEventListener('click', () => { setWhich('r'); Object.assign(stB, { marks: true, showCut: false }); setB(true); });

  // ====================== Plate 83: the devil's staircase ======================
  const stC = { mode: 'printed', n: 5, m1: 0.18, m2: 0.65, dm: 0.125 };
  function stairColumns(f, v, inv) {
    // one sample per device pixel column across the visible part of [0, 1]
    const px = 1 / (v.s * f.dpr), lo = Math.max(0, -v.ox / v.s), hi = Math.min(1, (f.w - v.ox) / v.s), out = [];
    if (hi <= lo) return out;
    for (let x = lo; x <= hi + px / 2; x += px) { const t = Math.min(1, x); out.push(t, inv ? cantorInv(t) : cantorF(t)); }
    return out;
  }
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, { x0: -0.03, x1: 1.03, y0: stC.mode === 'stages' || stC.mode === 'mass' ? -0.17 : -0.03, y1: 1.03 }, 0.03), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    if (stC.mode === 'printed' || stC.mode === 'mass') {
      const S = stairColumns(f, v, false), p = new Path2D();
      if (S.length) {
        p.moveTo(S[0], 0);
        for (let i = 0; i < S.length; i += 2) p.lineTo(S[i], S[i + 1]);
        p.lineTo(S[S.length - 2], 0);
        p.closePath();
      }
      if (stC.mode === 'printed') { c.fillStyle = PRINT.ink; c.fill(p); }
      else {
        c.fillStyle = '#dedcd3'; c.fill(p);
        c.strokeStyle = PRINT.ink; c.lineWidth = 1.2 / v.s; c.stroke(p);
        const win = (u, color, bary) => {
          const u1 = Math.min(1, u + stC.dm), xa = 1 - cantorInv(1 - u), xb = cantorInv(u1);
          c.fillStyle = color.band; c.fillRect(0, u, 1, u1 - u);
          const { starts, len } = dustPieces(2, 1 / 3, 6);
          c.fillStyle = color.ink;
          for (const a of starts) {
            const s = Math.max(a, xa), e = Math.min(a + len, xb);
            if (e > s) c.fillRect(s, bary, e - s, 0.03);
          }
          c.strokeStyle = color.ink; c.lineWidth = 1 / v.s; c.setLineDash([4 / v.s, 3 / v.s]);
          c.beginPath(); c.moveTo(xa, u); c.lineTo(xa, bary + 0.03); c.moveTo(xb, u1); c.lineTo(xb, bary); c.stroke(); c.setLineDash([]);
        };
        win(Math.min(stC.m1, 1 - stC.dm), { band: 'rgba(47,95,158,0.22)', ink: PRINT.accent }, -0.075);
        win(Math.min(stC.m2, 1 - stC.dm), { band: 'rgba(194,69,45,0.20)', ink: PRINT.red }, -0.135);
      }
    } else if (stC.mode === 'stages') {
      const P = staircase(stC.n), treads = new Path2D(), diags = new Path2D();
      for (let i = 2; i < P.length; i += 2) {
        const p = P[i + 1] === P[i - 1] ? treads : diags;
        p.moveTo(P[i - 2], P[i - 1]); p.lineTo(P[i], P[i + 1]);
      }
      c.lineWidth = 2 / v.s; c.lineCap = 'round';
      c.strokeStyle = PRINT.red; c.stroke(diags);
      c.strokeStyle = PRINT.ink; c.stroke(treads);
      const { starts, len } = dustPieces(2, 1 / 3, stC.n), bar = new Path2D();
      for (const a of starts) bar.rect(a, -0.075, len, 0.03);
      c.fillStyle = PRINT.ink; c.fill(bar);
    } else {
      const S = stairColumns(f, v, true), p = new Path2D();
      for (let i = 0; i < S.length; i += 2) { if (i) p.lineTo(S[i], S[i + 1]); else p.moveTo(S[i], S[i + 1]); }
      c.strokeStyle = '#b9b7af'; c.lineWidth = 1 / v.s; c.setLineDash([5 / v.s, 4 / v.s]);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(1, 1); c.stroke(); c.setLineDash([]);
      c.strokeStyle = PRINT.ink; c.lineWidth = 1.8 / v.s; c.lineJoin = 'round'; c.stroke(p);
    }
    toScreen(f);
    if (stC.mode !== 'printed') { dot(c, v, 0, 0); dot(c, v, 1, 1); }
  });
  const MODES_C = { printed: 'As printed', stages: 'The construction', motion: 'Cantor motion', mass: 'Reading off masses' };
  const CAP_C = {
    printed: 'The square filled with ink under M(R), computed column by column — in the limit, not at a finite stage. Zoom in anywhere: more steps appear forever, and the big tread over each trema stays perfectly flat.',
    stages: 'Stage by stage: over each kept piece the mass climbs along a diagonal (red); over each trema it rests on a tread (black). Each stage replaces every diagonal by two diagonals half as tall and a tread between them. The bar below is the matching stage of Plate 80.',
    motion: 'Read the ordinate M as time and the abscissa as position: the inverse function R(M) is a motion that creeps across each slug, then leaps over each gap in no time at all — "most discontinuous". Chapters 31 and 32 randomize it. The dashed diagonal is uniform motion, for comparison.',
    mass: 'The staircase "maps the drastic nonuniformity of the Cantor bar into something uniform and homogeneous": two equal spans of mass on the vertical axis (the two bands) come from stretches of bar holding exactly the same mass, however different they look. Science thrives on uniformity, so such regularizing transformations make fractal irregularity accessible to analysis.',
  };
  function setC(refit) {
    markMC(stC.mode); markSC(stC.n);
    $('sCwrap').hidden = stC.mode !== 'stages';
    $('massWrap').hidden = stC.mode !== 'mass';
    $('cCt').textContent = MODES_C[stC.mode];
    $('capC').innerHTML = CAP_C[stC.mode];
    $('cCn').textContent = { printed: 'the square filled under M(R)', stages: `stage ${stC.n} · ${fmt(pow(2, stC.n))} diagonals`, motion: 'position against time', mass: 'two windows of equal mass' }[stC.mode];
    if (stC.mode === 'stages') {
      const n = stC.n;
      $('sCv').textContent = `stage ${n}`;
      $('rCa').textContent = stairLen(n).toFixed(5);
      $('rCb').textContent = `${(1 - pow(2 / 3, n)).toFixed(4)} → 1`;
      $('rCc').textContent = `${Math.sqrt(1 + pow(4 / 9, n)).toFixed(4)} → 1`;
    } else if (stC.mode === 'mass') {
      const span = (u0) => { const u = Math.min(u0, 1 - stC.dm); return cantorInv(Math.min(1, u + stC.dm)) - (1 - cantorInv(1 - u)); };
      $('m1v').textContent = `mass ${stC.m1.toFixed(3)} to ${(stC.m1 + stC.dm).toFixed(3)} · bar span ${span(stC.m1).toFixed(3)}`;
      $('m2v').textContent = `mass ${stC.m2.toFixed(3)} to ${(stC.m2 + stC.dm).toFixed(3)} · bar span ${span(stC.m2).toFixed(3)}`;
      $('rCa').textContent = '2'; $('rCb').textContent = '1'; $('rCc').textContent = '1';
    } else { $('rCa').textContent = '2'; $('rCb').textContent = '1'; $('rCc').textContent = '1'; }
    if (refit) zC.refit(); else zC.schedule();
  }
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(true); });
  const markSC = stepButtons($('sC'), [1, 2, 3, 4, 5, 6, 7, 8], String, (n) => `Stage ${n}`, (n) => { stC.n = n; setC(false); });
  const markDM = stepButtons($('dmC'), [0.25, 0.125, 0.0625], (d) => ({ 0.25: '1/4', 0.125: '1/8', 0.0625: '1/16' }[d]), (d) => `Window height ${d}`, (d) => { stC.dm = d; markDM(d); setC(false); });
  $('m1s').addEventListener('input', (e) => { stC.m1 = Math.min(+e.target.value, 1 - stC.dm); setC(false); });
  $('m2s').addEventListener('input', (e) => { stC.m2 = Math.min(+e.target.value, 1 - stC.dm); setC(false); });
  $('plate83').addEventListener('click', () => { stC.mode = 'printed'; setC(true); });
  markDM(stC.dm);

  // ====================== Chapter 8: dust and dimension ======================
  const stD = { N: 2, r: 1 / 3, n: 6, mode: 'bars' };
  const MAXN_D = { 2: 10, 3: 7, 4: 6, 5: 5 };
  const rMin = 0.04, rMax = () => 1 / stD.N - 0.002;
  const FRACS = [[1, 3], [1, 4], [1, 5], [1, 9], [1, 6], [1, 7], [1, 8], [2, 5], [1, 2]];
  const rLabel = (r) => { for (const [p, q] of FRACS) if (Math.abs(r - p / q) < 5e-4) return `${p}/${q}`; return r.toFixed(3); };
  const zD = zoomable('wD', 'cD', (f) => {
    if (stD.mode === 'compare') return fitBox(f, { x0: -0.02, x1: 1.02, y0: -1.08, y1: 0.03 }, 0.03);
    if (stD.mode === 'gaps') return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
    return fitBox(f, { x0: -0.02, x1: 1.02, y0: -(0.08 * stD.n + BAR_T + 0.03), y1: 0.03 }, 0.03);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toWorld(f, v);
    if (stD.mode === 'bars') {
      c.fillStyle = PRINT.ink;
      for (const p of barsPath(stD.N, stD.r, stD.n, (k) => 0.08 * k, BAR_T)) c.fill(p);
    } else if (stD.mode === 'compare') {
      c.fillStyle = PRINT.ink;
      for (const [N, r, oy] of [[2, 1 / 4, 0], [3, 1 / 9, -0.58]]) {
        toWorld(f, v); c.translate(0, oy);
        for (const p of barsPath(N, r, 5, (k) => 0.08 * k, BAR_T)) c.fill(p);
      }
      toScreen(f);
      c.fillStyle = PRINT.muted; c.font = '600 12px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillText('N = 2, r = 1/4 · D = 1/2', v.ox, v.oy - 0.02 * v.s);
      c.fillText('N = 3, r = 1/9 · D = 1/2', v.ox, v.oy + 0.56 * v.s);
    } else {
      // the gap-count chart, drawn in screen space
      toScreen(f);
      const D = dustDim(stD.N, stD.r), J = Math.max(3, Math.min(12, Math.ceil(Math.log(5e4) / Math.log(stD.N))));
      const gens = gapGenerations(stD.N, stD.r, J).filter((g) => g.len > 1e-9);
      const ml = 56, mr = 14, mt = 12, mb = 34, iw = f.w - ml - mr, ih = f.h - mt - mb;
      const lx0 = Math.log10(gens[gens.length - 1].len), lx1 = Math.log10(gens[0].len) + 0.3;
      const ly0 = Math.log10(0.8), ly1 = Math.log10(gens[gens.length - 1].above) + 0.2;
      const X = (u) => ml + ((Math.log10(u) - lx0) / (lx1 - lx0)) * iw;
      const Y = (n) => mt + ih - ((Math.log10(n) - ly0) / (ly1 - ly0)) * ih;
      c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(ml, mt, iw, ih);
      c.fillStyle = PRINT.muted; c.font = '500 10.5px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let e = Math.ceil(lx0); e <= Math.floor(lx1); e++) {
        const x = ml + ((e - lx0) / (lx1 - lx0)) * iw;
        c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(x, mt); c.lineTo(x, mt + ih); c.stroke();
        c.fillText(`10${e < 0 ? '⁻' : ''}${'⁰¹²³⁴⁵⁶⁷⁸⁹'[Math.abs(e)]}`, x, mt + ih + 6);
      }
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let e = 0; e <= Math.floor(ly1); e++) {
        const y = mt + ih - ((e - ly0) / (ly1 - ly0)) * ih;
        c.strokeStyle = '#dddbd2'; c.beginPath(); c.moveTo(ml, y); c.lineTo(ml + iw, y); c.stroke();
        c.fillText(`10${'⁰¹²³⁴⁵⁶⁷⁸⁹'[e]}`, ml - 6, y);
      }
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText('gap length u', ml + iw / 2, f.h - 14);
      c.save(); c.translate(14, mt + ih / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; c.fillText('Nr(U > u)', 0, 0); c.restore();
      // the steps
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath();
      c.moveTo(X(Math.pow(10, lx1)), Y(0.8));
      for (const g of gens) { c.lineTo(X(g.len), Y(Math.max(0.8, g.below))); c.lineTo(X(g.len), Y(g.above)); }
      c.lineTo(X(gens[gens.length - 1].len * 0.6), Y(gens[gens.length - 1].above));
      c.stroke();
      // the line F·u^−D through the steps' corners
      const lf = gens.slice(1).reduce((s, g) => s + Math.log10(Math.sqrt((g.below + 1) * g.above)) + D * Math.log10(g.len), 0) / (gens.length - 1);
      c.strokeStyle = PRINT.red; c.lineWidth = 1.4; c.setLineDash([6, 4]); c.beginPath();
      const uA = Math.pow(10, lx1), uB = gens[gens.length - 1].len * 0.6;
      c.moveTo(X(uA), Y(Math.pow(10, lf - D * Math.log10(uA))));
      c.lineTo(X(uB), Y(Math.min(Math.pow(10, ly1), Math.pow(10, lf - D * Math.log10(uB)))));
      c.stroke(); c.setLineDash([]);
      c.fillStyle = PRINT.red; c.textAlign = 'left'; c.fillText(`slope −D = −${D.toFixed(4)}`, ml + 10, mt + 8);
    }
    toScreen(f);
  });
  const MODES_D = { bars: 'Curdling', gaps: 'Gap counts', compare: 'Same D, different look' };
  const INFO_D = {
    bars: 'Choose how many pieces survive each stage (N) and how long each is (r). The dimension D = log N/log (1/r) says how fast the curds multiply against how fast they shrink; the dust\'s total length (N r)ⁿ always dies away.',
    gaps: 'Count the tremas longer than u. Each generation adds N times as many gaps, each r times shorter, so the count climbs in uniform steps on log paper, crossing the dashed line F·u⁻ᴰ — dimension read off a census of the holes.',
    compare: 'Two dusts with the very same D = 1/2: N = 2 pieces of r = 1/4, and N = 3 pieces of r = 1/9. Equal dimension, yet they "look" very different — the lower one is coarser, more lacunar. Chapter 34 measures that difference as lacunarity.',
  };
  function setD(refit) {
    markMD(stD.mode); markND(stD.N); markSD(stD.n);
    $('genWrap').hidden = stD.mode === 'compare';
    const max = MAXN_D[stD.N];
    markSD.buttons.forEach((b, i) => { b.disabled = i + 1 > max; });
    const D = dustDim(stD.N, stD.r), n = stD.n;
    $('rDs').value = (stD.r - rMin) / (rMax() - rMin);
    $('rDv').textContent = `r = ${rLabel(stD.r)}`;
    $('sDv').textContent = `stage ${n}`;
    $('cDt').textContent = MODES_D[stD.mode];
    $('cDn').textContent = stD.mode === 'compare' ? 'both at stage 5' : stD.mode === 'gaps' ? `N = ${stD.N}, r = ${rLabel(stD.r)}` : `N = ${stD.N}, r = ${rLabel(stD.r)} · stages 0 to ${n}`;
    $('infoD').innerHTML = INFO_D[stD.mode];
    $('dimD').textContent = `N pieces of ratio r, evenly spaced · D = log ${stD.N}/log ${(1 / stD.r).toFixed(Math.abs(1 / stD.r - Math.round(1 / stD.r)) < 1e-9 ? 0 : 2)} ≈ ${D.toFixed(4)}`;
    $('miniDfx').textContent = `N = ${stD.N}, r = ${rLabel(stD.r)}`;
    dustMini('miniD', stD.N, stD.r);
    $('rDa').textContent = D.toFixed(4);
    $('rDb').textContent = fmt(pow(stD.N, n));
    $('rDc').textContent = sci(pow(stD.r, n));
    $('rDd').textContent = `${sci(pow(stD.N * stD.r, n))} → 0`;
    if (refit) zD.refit(); else zD.schedule();
  }
  const markMD = stepButtons($('mD'), Object.keys(MODES_D), (k) => MODES_D[k], (k) => `Show: ${MODES_D[k]}`, (k) => { stD.mode = k; setD(true); });
  const markND = stepButtons($('nD'), [2, 3, 4, 5], String, (N) => `${N} pieces`, (N) => { stD.N = N; stD.r = Math.min(stD.r, rMax()); stD.n = Math.min(stD.n, MAXN_D[N]); setD(true); });
  const markSD = stepButtons($('sD'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], String, (n) => `Stage ${n}`, (n) => { stD.n = n; setD(true); });
  $('rDs').addEventListener('input', (e) => { stD.r = rMin + (+e.target.value) * (rMax() - rMin); setD(false); });
  for (const [label, N, r] of [['N=2, r=1/3', 2, 1 / 3], ['N=3, r=1/5', 3, 1 / 5], ['N=2, r=1/4', 2, 1 / 4], ['N=3, r=1/9', 3, 1 / 9]]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', () => { stD.N = N; stD.r = r; if (stD.mode === 'compare') stD.mode = 'bars'; stD.n = Math.min(stD.n, MAXN_D[N]); setD(true); });
    $('preD').append(b);
  }

  setA(true); setB(true); setC(true); setD(true);
})();
