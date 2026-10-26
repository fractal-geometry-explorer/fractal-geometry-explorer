(() => {

  // small helper: a sigma-loop generator as a mini SVG (coast with dots, loops)
  function sigMini(id, gen) {
    const b = gen.b, pt = ([x, y]) => `${(x / b).toFixed(4)},${(-y / b).toFixed(4)}`;
    const loopPts = (L) => L.map(pt).join(' ');
    let s = `<polyline points="${gen.coast.map(pt).join(' ')}" fill="none" stroke="currentColor" stroke-width="0.016" stroke-linejoin="round"/>`;
    for (const L of gen.islands.concat(gen.lakes)) s += `<polygon points="${loopPts(L)}" fill="none" stroke="currentColor" stroke-width="0.016"/>`;
    const dots = (pts, closed) => pts.map(([x, y], i) => `<circle cx="${(x / b).toFixed(4)}" cy="${(-y / b).toFixed(4)}" r="${!closed && (i === 0 || i === pts.length - 1) ? 0.03 : 0.016}"/>`).join('');
    s += `<g fill="currentColor">${dots(gen.coast, false)}${gen.islands.concat(gen.lakes).map((L) => dots(L, true)).join('')}</g>`;
    $(id).innerHTML = s;
  }

  // paint a sigma-loop teragon: initiator and loops in creation order, land in ink,
  // water in paper (or by nesting level)
  function paintSigma(c, paths, opts) {
    const loops = paths.filter((p) => p.closed).sort((a, b) => a.born - b.born);
    const chain = paths.find((p) => !p.closed);
    if (chain) {
      const P = chain.pts, p = new Path2D();
      p.moveTo(P[0], P[1]);
      for (let i = 2; i < P.length; i += 2) p.lineTo(P[i], P[i + 1]);
      p.lineTo(1, -0.22); p.lineTo(0, -0.22); p.closePath();
      c.fillStyle = opts.level ? opts.level(1) : PRINT.ink; c.fill(p);
    }
    for (const L of loops) {
      const p = polyPath(L.pts, true);
      c.fillStyle = opts.level ? opts.level(L.lvl) : (L.lvl % 2 ? PRINT.ink : PRINT.paper);
      c.fill(p);
    }
  }
  function strokeSigma(c, paths, w) {
    const p = new Path2D();
    for (const q of paths) {
      const P = q.pts;
      p.moveTo(P[0], P[1]);
      for (let i = 2; i < P.length; i += 2) p.lineTo(P[i], P[i + 1]);
      if (q.closed) p.closePath();
    }
    c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = w; c.stroke(p);
  }
  const shoelace = (P) => {
    let a = 0;
    for (let i = 0; i < P.length; i += 2) { const j = (i + 2) % P.length; a += P[i] * P[j + 1] - P[j] * P[i + 1]; }
    return Math.abs(a) / 2;
  };

  // ====================== pages 117-118: Koch continent and islands ======================
  const stA = { gen: 'g117', n: 3, mode: 'map' };
  const cacheA = {};
  function dataA() {
    const key = `${stA.gen}|${stA.n}`;
    if (cacheA[key]) return cacheA[key];
    const paths = sigmaBuild(stA.gen, 'line', stA.n);
    const islands = paths.filter((p) => p.closed);
    const links = paths.reduce((s, p) => s + p.pts.length / 2 - (p.closed ? 0 : 1), 0);
    // Korcak staircase: island diameters λ = √a, counted from the largest down
    const lam = islands.map((L) => Math.sqrt(shoelace(L.pts))).sort((a, b) => b - a);
    return (cacheA[key] = { paths, islands, links, lam });
  }
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'korcak') return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0.1);
    return fitBox(f, { x0: -0.05, x1: 1.05, y0: -0.24, y1: 0.62 }, 0.03);
  }, (f, v) => {
    const c = f.ctx, D = dataA(), gen = SIGMA_GENS[stA.gen];
    paper(f, PRINT.paper); toWorld(f, v);
    if (stA.mode === 'korcak') {
      toScreen(f);
      const X = (x) => v.ox + x * v.s, Y = (y) => v.oy - y * v.s;
      const lam = D.lam, n = lam.length;
      c.strokeStyle = PRINT.muted; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(X(0), Y(1)); c.lineTo(X(0), Y(0)); c.lineTo(X(1), Y(0)); c.stroke();
      c.fillStyle = PRINT.muted; c.font = '12px "IBM Plex Mono", monospace'; c.textAlign = 'center';
      c.fillText('log λ  (island diameter √a) →', X(0.5), Y(0) + 26);
      c.save(); c.translate(X(0) - 14, Y(0.5)); c.rotate(-Math.PI / 2); c.fillText('log Nr(Λ > λ) →', 0, 0); c.restore();
      if (n) {
        const lo = Math.log10(lam[n - 1]) - 0.25, hi = Math.log10(lam[0]) + 0.25, ymax = Math.log10(n) + 0.25;
        const px = (l) => X((Math.log10(l) - lo) / (hi - lo)), py = (k) => Y(Math.log10(k) / ymax);
        // distinct diameters (one per cohort) with their cumulative counts
        const steps = [];
        for (let k = 0; k < n; k++) if (k === n - 1 || Math.abs(lam[k + 1] - lam[k]) > 1e-9 * lam[k]) steps.push([lam[k], k + 1]);
        c.strokeStyle = PRINT.accent; c.lineWidth = 2; c.beginPath();
        c.moveTo(px(steps[0][0]), py(1));
        for (let i = 0; i < steps.length; i++) {
          const [l, cnt] = steps[i];
          c.lineTo(px(l), py(cnt));
          c.lineTo(px(i + 1 < steps.length ? steps[i + 1][0] : Math.pow(10, lo)), py(cnt));
        }
        c.stroke();
        // guide of slope −D through the first step
        c.strokeStyle = PRINT.red; c.setLineDash([6, 5]); c.lineWidth = 1.5; c.beginPath();
        const l1 = Math.log10(lam[0]), g = (l) => Math.log10(1) + gen.D * (l1 - l);
        c.moveTo(px(lam[0]), Y(g(l1) / ymax)); c.lineTo(X(0.02), Y(g(lo + 0.02 * (hi - lo)) / ymax));
        c.stroke(); c.setLineDash([]);
        c.fillStyle = PRINT.red; c.textAlign = 'left'; c.fillText(`slope −D = −${gen.D.toFixed(4)}`, X(0.12), Y(0.9));
      }
      return;
    }
    const w = Math.max(0.5, Math.min(2, Math.pow(1 / gen.b, stA.n) * v.s * 0.1)) / v.s;
    if (stA.mode === 'map') paintSigma(c, D.paths, {});
    else strokeSigma(c, D.paths, w);
    toScreen(f); dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  const MODES_A = { map: 'Land and sea', teragon: 'Teragon', korcak: 'Korčak staircase' };
  const INFO_A = {
    map: 'Everything below the coastline, and inside every island, is land. Each stage multiplies the number of islands by N = 16 and shrinks the newborn ones by r = 1/8.',
    teragon: 'The broken lines themselves: the coastline from 0 to 1 and the closed island loops seeded so far.',
    korcak: 'Islands counted by diameter, on log–log axes. The counts climb in steps of factor N as λ falls by factor r, so the staircase hugs the dashed line of slope −D: the generalized Korčak law Nr(Λ > λ) = Fλ⁻ᴰ.',
  };
  function setA(refit) {
    const D = dataA(), gen = SIGMA_GENS[stA.gen];
    markGA(stA.gen); markMA(stA.mode); markSA(stA.n);
    $('sAv').textContent = `stage ${stA.n}`; $('cAs').textContent = stA.n;
    $('cAn').textContent = `${fmt(D.links)} links`;
    $('cAt').textContent = MODES_A[stA.mode];
    $('rAa').textContent = fmt(D.links); $('rAb').textContent = fmt(D.islands.length);
    $('rAc').textContent = stA.gen === 'g117' ? 'log 10/log 8 ≈ 1.1073' : '1 (rectifiable)';
    $('dimA').innerHTML = stA.gen === 'g117'
      ? 'N = 16, r = 1/8 · D = log 16/log 8 = 4/3 · each coastline D<sub>c</sub> = log 10/log 8 ≈ 1.1073'
      : 'N = 16, r = 1/8 · D = log 16/log 8 = 4/3 · straight coastline generator: D<sub>c</sub> = 1';
    $('infoA').innerHTML = INFO_A[stA.mode];
    if (refit) zA.refit(); else zA.schedule();
  }
  const markGA = stepButtons($('gA'), ['g117', 'g118'], (g) => SIGMA_GENS[g].name, (g) => `Generator of ${SIGMA_GENS[g].name}`, (g) => { stA.gen = g; setA(false); });
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markSA = stepButtons($('sA'), [1, 2, 3, 4], String, (n) => `Stage ${n}`, (n) => { stA.n = n; setA(false); });
  $('preA1').addEventListener('click', () => { Object.assign(stA, { gen: 'g117', n: 3, mode: 'map' }); setA(true); });
  $('preA2').addEventListener('click', () => { Object.assign(stA, { gen: 'g118', n: 3, mode: 'map' }); setA(true); });
  sigMini('miniA1', SIGMA_GENS.g117); sigMini('miniA2', SIGMA_GENS.g118);

  // ====================== page 121: islands and lakes ======================
  const stB = { n: 3, mode: 'print' };
  const cacheB = {};
  function dataB() {
    const key = stB.n;
    if (cacheB[key]) return cacheB[key];
    const paths = sigmaBuild('g121', 'square', stB.n);
    const loops = paths.filter((p) => p.born > 0);
    const links = paths.reduce((s, p) => s + p.pts.length / 2, 0);
    return (cacheB[key] = {
      paths, links,
      islands: loops.filter((p) => p.lvl % 2 === 1).length,
      lakes: loops.filter((p) => p.lvl % 2 === 0).length,
      depth: Math.max(1, ...loops.map((p) => p.lvl)),
    });
  }
  const LVL_COLORS = ['#b9cdd9', PRINT.ink, '#7aa2b8', '#3d3d39', '#4c7e97', '#6a6a63', '#2f5f7e'];
  const zB = zoomable('wB', 'cB', (f) => fitBox(f, { x0: -0.45, x1: 1.45, y0: -0.45, y1: 1.45 }, 0.02), (f, v) => {
    const c = f.ctx, D = dataB();
    paper(f, stB.mode === 'depth' ? LVL_COLORS[0] : PRINT.paper); toWorld(f, v);
    if (stB.mode === 'teragon') strokeSigma(c, D.paths, Math.max(0.5, Math.min(2, Math.pow(1 / 6, stB.n) * v.s * 0.1)) / v.s);
    else paintSigma(c, D.paths, stB.mode === 'depth' ? { level: (l) => LVL_COLORS[Math.min(l, LVL_COLORS.length - 1)] } : {});
    toScreen(f);
  });
  const MODES_B = { print: 'As printed', depth: 'By nesting level', teragon: 'Teragon' };
  const INFO_B = {
    print: 'Land in ink, water in paper. The outer coast of the big island stays a perfect square at every stage, because this generator\'s coastline is straight: all the dimension lives in the fragmentation.',
    depth: 'Each region tinted by how deep it nests: sea, island, lake-in-island, island-in-lake, and so on. The deepest level drawn grows by two with every stage.',
    teragon: 'All the coastlines at once: the σ-loop. Every loop is a separate closed curve; together they bound the nested land and water.',
  };
  function setB(refit) {
    const D = dataB();
    markMB(stB.mode); markSB(stB.n);
    $('sBv').textContent = `stage ${stB.n}`; $('cBs').textContent = stB.n; $('cBn').textContent = `${fmt(D.links)} links`;
    $('cBt').textContent = MODES_B[stB.mode];
    $('rBa').textContent = fmt(D.links); $('rBb').textContent = fmt(D.islands); $('rBc').textContent = fmt(D.lakes);
    $('rBd').textContent = `level ${D.depth}`;
    $('infoB').innerHTML = INFO_B[stB.mode];
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(false); });
  const markSB = stepButtons($('sB'), [0, 1, 2, 3], String, (n) => `Stage ${n}`, (n) => { stB.n = n; setB(false); });
  $('preB').addEventListener('click', () => { Object.assign(stB, { n: 3, mode: 'print' }); setB(true); });
  sigMini('miniB', SIGMA_GENS.g121);

  // ====================== pages 124-125: curdling clusters ======================
  function gridSvg(gen) {
    const b = gen.b, u = 30 / b;
    let s = `<svg viewBox="-1 -1 32 32" aria-hidden="true"><rect class="frame" x="0" y="0" width="30" height="30" stroke-width="1.5"/>`;
    for (const [i, j] of gen.cells) s += `<rect class="on" x="${(j * u).toFixed(2)}" y="${(i * u).toFixed(2)}" width="${u.toFixed(2)}" height="${u.toFixed(2)}"/>`;
    return s + '</svg>';
  }
  const CLUSTER_COLORS = ['#2f5f9e', '#c2452d', '#3f8f6c', '#b58a2a', '#6b4e9b', '#5f8fae', '#8a6a4f', '#4f8a84'];
  function curdSection(ids, keys, maxStage, dims, info) {
    const st = { gen: keys[0], n: Math.min(3, maxStage), mode: 'clusters' };
    const cache = {};
    function data() {
      const key = `${st.gen}|${st.n}`;
      if (cache[key]) return cache[key];
      const g = CURD_GENS[st.gen], side = Math.pow(g.b, st.n), cells = curdle(st.gen, st.n);
      const cl = clusters(cells, side);
      const order = cl.sizes.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]);
      const rank = new Int32Array(cl.sizes.length);
      order.forEach(([, i], r) => { rank[i] = r; });
      return (cache[key] = { g, side, cells, cl, rank, big: order.length ? order[0][0] : 0 });
    }
    const z = zoomable(ids.w, ids.c, (f) => fitBox(f, { x0: 0, x1: data().side, y0: 0, y1: data().side }, 0.02), (f, v) => {
      const c = f.ctx, D = data(), side = D.side;
      paper(f, PRINT.paper); toWorld(f, v);
      const groups = new Map();
      D.cells.forEach(([i, j], k) => {
        const col = st.mode === 'ink' ? PRINT.ink : (D.rank[D.cl.label[k]] === 0 ? PRINT.ink : CLUSTER_COLORS[D.rank[D.cl.label[k]] % CLUSTER_COLORS.length]);
        if (!groups.has(col)) groups.set(col, new Path2D());
        groups.get(col).rect(j, side - 1 - i, 1, 1);
      });
      for (const [col, p] of groups) solid(c, [p], col, 0.5 / v.s);
      toScreen(f);
    });
    function set(refit) {
      const D = data();
      markG(st.gen); markM(st.mode); markS(st.n);
      $(ids.sv).textContent = `stage ${st.n}`; $(ids.cs).textContent = st.n; $(ids.cn).textContent = `${fmt(D.cells.length)} cells of side ${D.g.b}⁻${st.n > 9 ? st.n : '¹²³⁴⁵⁶'[st.n - 1]}`;
      $(ids.ct).textContent = `Generator ${st.gen.replace('X1', '(left)').replace('X2', '(right)')}`;
      $(ids.ra).textContent = fmt(D.cells.length); $(ids.rb).textContent = fmt(D.cl.sizes.length); $(ids.rc).textContent = `${fmt(D.big)} cells`;
      $(ids.rd).textContent = (Math.log(D.big) / Math.log(Math.pow(D.g.b, st.n))).toFixed(4);
      $(ids.dim).innerHTML = dims[st.gen];
      $(ids.info).innerHTML = info[st.gen];
      if (refit) z.refit(); else z.schedule();
    }
    const markG = ((el) => {
      const mark = { fns: [] };
      const bs = keys.map((k) => {
        const b = document.createElement('button');
        b.type = 'button'; b.innerHTML = gridSvg(CURD_GENS[k]) + `<span>${k.replace('X1', 'left').replace('X2', 'right')}</span>`;
        b.setAttribute('aria-label', `Generator ${k}`);
        b.addEventListener('click', () => { st.gen = k; set(true); });
        el.append(b);
        return b;
      });
      return (cur) => bs.forEach((b, i) => b.setAttribute('aria-pressed', String(keys[i] === cur)));
    })($(ids.g));
    const markM = stepButtons($(ids.m), ['clusters', 'ink'], (k) => (k === 'clusters' ? 'By cluster' : 'All ink'), (k) => `Colour: ${k}`, (k) => { st.mode = k; set(false); });
    const markS = stepButtons($(ids.s), Array.from({ length: maxStage }, (_, i) => i + 1), String, (n) => `Stage ${n}`, (n) => { st.n = n; set(true); });
    return { set, st };
  }
  const secC = curdSection(
    { w: 'wC', c: 'cC', g: 'gC', m: 'mC', s: 'sC', sv: 'sCv', cs: 'cCs', cn: 'cCn', ct: 'cCt', ra: 'rCa', rb: 'rCb', rc: 'rCc', rd: 'rCd', dim: 'dimC', info: 'infoC' },
    ['A', 'B', 'C', 'E', 'F'], 4,
    {
      A: 'Generator A: N = 12 of b² = 16 cells · D = log 12/log 4 ≈ 1.7925 · connected: one cluster, a curve',
      B: 'Generator B: N = 7 · D = log 7/log 4 ≈ 1.4037 · largest cluster an interval, D<sub>c</sub> = 1',
      C: 'Generator C: N = 8 · D = log 8/log 4 = 1.5 · largest cluster a tree, D<sub>c</sub> = log 7/log 4 ≈ 1.4037',
      E: 'Generator E: N = 8 · D = log 8/log 4 = 1.5 · the F-shaped pieces keep splitting: D<sub>c</sub> → 1',
      F: 'Generator F: N = 4 · D = log 4/log 4 = 1 · a dust, akin to the Fournier model of Chapter 9',
    },
    {
      A: 'The kept ring touches ring to ring, so every stage stays one connected precurd. The limit is a curve of zero area: a relative of the Sierpiński carpet of Chapter 14.',
      B: 'The left column reproduces itself and stays a column: the largest cluster has exactly 4ᵏ cells at stage k, an interval in the limit. The other kept cells spin off ever-thinner satellites.',
      C: 'The largest component of the generator has 7 cells in a T shape, and each stage keeps it connected: the limit cluster is a fractal tree, and the maximum D꜀ = log 7/log 4 is attained.',
      E: 'The 8 kept cells form one connected F, but its copies do not hold together: the largest cluster has only 2·4ᵏ cells at stage k, so the limit clusters are straight intervals after all — the maximum is not attained.',
      F: 'Four corner cells, never touching: by stage 2 every cluster is a single cell, and the limit is a dust of dimension 1 that no cell ever rejoins.',
    }
  );
  const secD = curdSection(
    { w: 'wD', c: 'cD', g: 'gD', m: 'mD', s: 'sD', sv: 'sDv', cs: 'cDs', cn: 'cDn', ct: 'cDt', ra: 'rDa', rb: 'rDb', rc: 'rDc', rd: 'rDd', dim: 'dimD', info: 'infoD' },
    ['X1', 'X2'], 6,
    {
      X1: 'Left generator: N = 5 of 9 cells · D = log 5/log 3 ≈ 1.4650 · spine cluster D<sub>c</sub> = 1',
      X2: 'Right generator: N = 6 of 9 cells · D = log 6/log 3 ≈ 1.6309 · largest cluster D<sub>c</sub> ≈ 1.60, fractional b^D<sub>c</sub>',
    },
    {
      X1: 'The left column\'s copies stack across cell borders into one unbroken spine — cross lumping. The spine grows exactly 3× per stage (D꜀ = 1); the corner cells shed separate flecks that lump into short dashes.',
      X2: 'The L of column-plus-row lumps with the corner cell\'s copies into one large cluster whose growth ratio climbs toward ≈ 5.84 per stage: D꜀ ≈ 1.60, strictly between 1 and D. No integer power of 3 matches it.',
    }
  );

  // ====================== page 126: knotted Peano ======================
  const stE = { n: 2, mode: 'curve' };
  const cacheE = {};
  function dataE() {
    const key = stE.n;
    if (cacheE[key]) return cacheE[key];
    const P = knottedCurve(stE.n);
    return (cacheE[key] = { P, path: polyPath(P, false), box: bbox(P), contacts: knottedContacts(P), flood: null });
  }
  function floodE(D) {
    if (D.flood) return D.flood;
    const S = 1024, pad = 18, bb = D.box;
    const sc = (S - 2 * pad) / Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0);
    const off = document.createElement('canvas'); off.width = S; off.height = S;
    const c = off.getContext('2d', { willReadFrequently: true });
    c.setTransform(sc, 0, 0, -sc, pad - bb.x0 * sc, S - pad + bb.y0 * sc);
    c.strokeStyle = '#000'; c.lineWidth = 2.6 / sc; c.lineJoin = 'round'; c.stroke(D.path);
    const img = c.getImageData(0, 0, S, S), a = img.data;
    const label = new Int32Array(S * S).fill(-1);
    const comps = [];
    for (let start = 0; start < S * S; start++) {
      if (label[start] >= 0 || a[4 * start + 3] > 60) continue;
      const id = comps.length, stack = [start];
      label[start] = id;
      let size = 0, edge = false;
      while (stack.length) {
        const k = stack.pop(), x = k % S, y = (k / S) | 0;
        size++;
        if (x === 0 || y === 0 || x === S - 1 || y === S - 1) edge = true;
        for (const q of [k - 1, k + 1, k - S, k + S]) {
          if (q < 0 || q >= S * S || label[q] >= 0 || a[4 * q + 3] > 60) continue;
          if ((q === k - 1 && x === 0) || (q === k + 1 && x === S - 1)) continue;
          label[q] = id; stack.push(q);
        }
      }
      comps.push({ size, edge });
    }
    // tint every knotted-off cell (the components that do not touch the border)
    const toRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const pal = CLUSTER_COLORS.map(toRGB), paperC = toRGB(PRINT.paper);
    const out = c.createImageData(S, S);
    for (let k = 0; k < S * S; k++) {
      const l = label[k];
      let col = paperC, al = 255;
      if (l < 0) col = [21, 21, 21];
      else if (!comps[l].edge) { const p = pal[l % pal.length]; col = [(p[0] + paperC[0]) >> 1, (p[1] + paperC[1]) >> 1, (p[2] + paperC[2]) >> 1]; }
      out.data[4 * k] = col[0]; out.data[4 * k + 1] = col[1]; out.data[4 * k + 2] = col[2]; out.data[4 * k + 3] = al;
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.putImageData(out, 0, 0);
    const inner = comps.filter((q) => !q.edge).length;
    return (D.flood = { off, sc, pad, S, inner });
  }
  const zE = zoomable('wE', 'cE', (f) => fitBox(f, dataE().box, 0.05), (f, v) => {
    const c = f.ctx, D = dataE();
    paper(f, PRINT.paper);
    if (stE.mode === 'clusters' && stE.n <= 3) {
      const F = floodE(D), bb = D.box;
      // the offscreen bitmap is square: it covers M = max(w, h) of the bbox plus margins
      const m = F.pad / F.sc, M = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0);
      toScreen(f);
      c.imageSmoothingEnabled = stE.n < 3;
      c.drawImage(F.off, v.ox + (bb.x0 - m) * v.s, v.oy - (bb.y0 + M + m) * v.s, (M + 2 * m) * v.s, (M + 2 * m) * v.s);
    } else {
      toWorld(f, v);
      const w = Math.max(0.4, Math.min(2.2, Math.pow(1 / Math.sqrt(17), stE.n) * v.s * 0.14)) / v.s;
      c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = w; c.stroke(D.path);
      toScreen(f);
    }
    dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  const MODES_E = { curve: 'Teragon', clusters: 'Knotted-off preclusters' };
  function setE(refit) {
    const D = dataE();
    markME(stE.mode); markSE(stE.n);
    markSE.buttons.forEach((b, i) => { b.disabled = stE.mode === 'clusters' && i + 1 > 3; });
    $('sEv').textContent = `stage ${stE.n}`; $('cEs').textContent = stE.n; $('cEn').textContent = `${fmt(D.P.length / 2 - 1)} links`;
    $('cEt').textContent = MODES_E[stE.mode];
    $('rEa').textContent = fmt(D.P.length / 2 - 1); $('rEb').textContent = fmt(D.contacts);
    $('infoE').innerHTML = stE.mode === 'curve'
      ? 'The teragon, drawn from start dot to end dot. Every copy of the generator contributes one new pinch point where the curve touches itself without crossing.'
      : `Each tinted patch is an open precluster knotted off by the self-contacts${stE.n <= 3 ? ` — ${fmt(floodE(D).inner)} of them at this stage` : ''}. As the construction proceeds, each is further pinched, and thins toward a ramified contact cluster of dimension D꜀ &lt; 2.`;
    if (refit) zE.refit(); else zE.schedule();
  }
  const markME = stepButtons($('mE'), Object.keys(MODES_E), (k) => MODES_E[k], (k) => `Show: ${MODES_E[k]}`, (k) => { stE.mode = k; if (k === 'clusters' && stE.n > 3) stE.n = 3; setE(false); });
  const markSE = stepButtons($('sE'), [1, 2, 3, 4], String, (n) => `Stage ${n}`, (n) => { stE.n = n; setE(true); });
  $('preE').addEventListener('click', () => { Object.assign(stE, { n: 2, mode: 'curve' }); setE(true); });
  miniCurve('miniE', KP_Z);

  // ====================== pages 126-130: Bernoulli percolation ======================
  const stF = { p: 0.5, n: 48, seed: 1 };
  let simF = null;
  function dataF() {
    // the seed is independent of p, so dragging the slider only adds or removes sticks
    if (!simF) simF = percolation(stF.n, stF.p, (stF.seed * 1000003 + stF.n) >>> 0);
    return simF;
  }
  const zF = zoomable('wF', 'cF', (f) => fitBox(f, { x0: 0, x1: stF.n - 1, y0: 0, y1: stF.n - 1 }, 0.03), (f, v) => {
    const c = f.ctx, S = dataF(), n = S.n;
    paper(f, PRINT.paper); toWorld(f, v);
    const vinyl = new Path2D(), copper = new Path2D(), big = new Path2D(), perc = new Path2D();
    const pick = (site) => {
      const r = S.find(site);
      if (S.percolates && r === S.percRoot) return perc;
      if (r === S.bigRoot) return big;
      return copper;
    };
    for (let i = 0; i < n; i++) for (let j = 0; j < n - 1; j++) {
      const p = S.H[i * (n - 1) + j] ? pick(i * n + j) : vinyl;
      p.moveTo(j, n - 1 - i); p.lineTo(j + 1, n - 1 - i);
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < n; j++) {
      const p = S.V[i * n + j] ? pick(i * n + j) : vinyl;
      p.moveTo(j, n - 1 - i); p.lineTo(j, n - 2 - i);
    }
    c.lineCap = 'round';
    c.strokeStyle = '#dedcd4'; c.lineWidth = 0.1; c.stroke(vinyl);
    c.strokeStyle = PRINT.ink; c.lineWidth = 0.22; c.stroke(copper);
    c.strokeStyle = PRINT.accent; c.lineWidth = 0.26; c.stroke(big);
    c.strokeStyle = PRINT.red; c.lineWidth = 0.26; c.stroke(perc);
    toScreen(f);
  });
  function setF(refit) {
    simF = null;
    const S = dataF();
    markNF(stF.n);
    $('pF').value = Math.round(stF.p * 100);
    $('pFv').textContent = `p = ${stF.p.toFixed(2)}`;
    $('nFv').textContent = `${stF.n} × ${stF.n}`;
    $('cFn').textContent = `${stF.n} × ${stF.n} sites, p = ${stF.p.toFixed(2)}`;
    $('rFa').textContent = S.percolates ? 'yes (top to bottom)' : 'no';
    $('rFb').textContent = `${fmt(S.total)} of ${fmt(2 * stF.n * (stF.n - 1))}`;
    $('rFc').textContent = `${fmt(S.bigSize)} sticks`;
    $('rFd').textContent = String(stF.seed);
    $('infoF').textContent = stF.p < 0.45 ? 'Well below the threshold: only small clusters, and the lattice almost never percolates.'
      : stF.p > 0.55 ? 'Well above the threshold: one giant copper cluster spans the lattice almost surely.'
        : 'Near p = ½, the critical point: clusters of every size, ramified and stringy — the regime the chapter\'s fractal model addresses.';
    if (refit) zF.refit(); else zF.schedule();
  }
  const markNF = stepButtons($('nF'), [24, 48, 96], String, (n) => `${n} by ${n}`, (n) => { stF.n = n; setF(true); });
  $('pF').addEventListener('input', (e) => { stF.p = e.target.value / 100; setF(false); });
  $('seedF').addEventListener('click', () => { stF.seed++; setF(false); });
  $('preF').addEventListener('click', () => { Object.assign(stF, { p: 0.5, seed: 1 }); setF(false); });

  setA(true); setB(true); secC.set(true); secD.set(true); setE(true); setF(true);
})();
