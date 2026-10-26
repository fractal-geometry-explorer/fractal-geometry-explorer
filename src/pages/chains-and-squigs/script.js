(() => {
  // seeded RNG, so every random figure can be reproduced
  const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const L6 = Math.log(18) / Math.log(6), LSQ = Math.log(2.5) / Math.log(2);

  // ====================== Plate 228: random Koch coastline ======================
  // Two generators read from the caption box: 18 unit steps on the square lattice, (0,0) to (6,0).
  // KB is Plate 53's. KA uses the same 19 lattice points, but six of its edges close a separate
  // ring, which becomes a satellite island.
  const KB = [0, 0, 1, 0, 1, 1, 1, 2, 2, 2, 3, 2, 3, 1, 2, 1, 2, 0, 3, 0, 4, 0, 4, -1, 3, -1, 3, -2, 4, -2, 5, -2, 5, -1, 5, 0, 6, 0];
  const KA = [0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 4, -1, 3, -1, 3, -2, 4, -2, 5, -2, 5, -1, 5, 0, 6, 0];
  const KA_RING = [1, 1, 2, 1, 3, 1, 3, 2, 2, 2, 1, 2, 1, 1];
  const stA = { n: 3, seed: 7, mode: 'island' };
  let cacheA = { key: '' };
  function applyGen(ax, ay, dx, dy, G, out) {
    for (let i = 2; i < G.length; i += 2) out.push(ax + (G[i] * dx - G[i + 1] * dy) / 6, ay + (G[i] * dy + G[i + 1] * dx) / 6);
  }
  function dataA() {
    const key = `${stA.n}|${stA.seed}`;
    if (cacheA.key === key) return cacheA;
    const rnd = mulberry32(stA.seed);
    let loops = [[0, 0, 6, 0, 6, 6, 0, 6, 0, 0]];                 // the square initiator, counterclockwise
    for (let s = 0; s < stA.n; s++) {
      const next = [];
      for (const pl of loops) {
        const out = [pl[0] * 6, pl[1] * 6];
        for (let i = 0; i + 3 < pl.length; i += 2) {
          const ax = pl[i] * 6, ay = pl[i + 1] * 6, dx = pl[i + 2] * 6 - ax, dy = pl[i + 3] * 6 - ay;
          if (rnd() < 0.5) applyGen(ax, ay, dx, dy, KB, out);
          else { applyGen(ax, ay, dx, dy, KA, out); const ring = [ax + (dx - dy) / 6, ay + (dy + dx) / 6]; applyGen(ax, ay, dx, dy, KA_RING, ring); next.push(ring); }
        }
        next.push(out);
      }
      loops = next;
    }
    const S = Math.pow(6, stA.n + 1), bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    let edges = 0;
    for (const pl of loops) { edges += pl.length / 2 - 1; for (let i = 0; i < pl.length; i += 2) { const x = pl[i] / S, y = pl[i + 1] / S; pl[i] = x; pl[i + 1] = y; bb.x0 = Math.min(bb.x0, x); bb.x1 = Math.max(bb.x1, x); bb.y0 = Math.min(bb.y0, y); bb.y1 = Math.max(bb.y1, y); } }
    // batch the loops into a few paths; none of them nests inside another, so one fill is safe
    const paths = [];
    for (let i = 0; i < loops.length; i += 512) {
      const p = new Path2D();
      for (let k = i; k < Math.min(loops.length, i + 512); k++) { const pl = loops[k]; p.moveTo(pl[0], pl[1]); for (let j = 2; j < pl.length; j += 2) p.lineTo(pl[j], pl[j + 1]); }
      paths.push(p);
    }
    return (cacheA = { key, loops, paths, edges, islands: loops.length - 1, bb });
  }
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, dataA().bb, 0.03), (f, v) => {
    const c = f.ctx, D = dataA();
    paper(f, PRINT.paper); toWorld(f, v);
    if (stA.mode === 'island') solid(c, D.paths, PRINT.ink, 0.5 / v.s);
    else { c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = Math.max(0.5, Math.min(1.6, Math.pow(1 / 6, stA.n) * v.s * 0.1)) / v.s; for (const p of D.paths) c.stroke(p); }
    toScreen(f);
  });
  function setA(refit) {
    const D = dataA();
    markSA(stA.n); markMA(stA.mode);
    $('sAv').textContent = `stage ${stA.n}`; $('cAs').textContent = stA.n;
    $('cAn').textContent = `${fmt(D.edges)} steps`; $('seedAv').textContent = `seed ${stA.seed}`;
    $('rAa').textContent = fmt(D.edges); $('rAb').textContent = fmt(D.islands);
    $('cAt').textContent = stA.mode === 'island' ? 'Random Koch island' : 'Coastline teragon';
    if (refit) zA.refit(); else zA.schedule();
  }
  const markSA = stepButtons($('sA'), [0, 1, 2, 3, 4], String, (n) => `Stage ${n}`, (n) => { stA.n = n; setA(true); });
  const markMA = stepButtons($('mA'), ['island', 'coast'], (k) => (k === 'island' ? 'Island in ink' : 'Coastline'), (k) => k, (k) => { stA.mode = k; setA(false); });
  $('seedA').addEventListener('click', () => { stA.seed = 1 + Math.floor(Math.random() * 9999); setA(true); });
  $('plate228').addEventListener('click', () => { Object.assign(stA, { n: 4, seed: 7, mode: 'island' }); setA(true); });
  // minis: the two generators as in the caption box
  const kaPts = []; for (let i = 0; i < KA.length; i += 2) kaPts.push([KA[i] / 6, KA[i + 1] / 6 * -1]);
  const kbPts = []; for (let i = 0; i < KB.length; i += 2) kbPts.push([KB[i] / 6, KB[i + 1] / 6 * -1]);
  const ringPts = []; for (let i = 0; i < KA_RING.length; i += 2) ringPts.push(`${KA_RING[i] / 6},${KA_RING[i + 1] / 6}`);
  miniCurve('miniKA', kaPts.map(([x, y]) => [x, -y]));
  $('miniKA').innerHTML += `<polyline points="${ringPts.join(' ')}" fill="none" stroke="currentColor" stroke-width="0.02" stroke-linejoin="round" transform="scale(1,-1)"/>`;
  miniCurve('miniKB', kbPts.map(([x, y]) => [x, -y]));

  // ====================== Plate 229: random Peano curve ======================
  // Each interval carries a shelter triangle (u, v, f). It is replaced by the straight thread
  // u -> mid(u,f) -> mid(v,f) -> mid(u,v) -> v or by its mirror image through the perpendicular
  // bisector of uv (the flipped thread), each with probability 1/2. The drawn teragon detours
  // through the centre of every shelter of every stage, which is the caption's rule for making
  // the curve easier to follow.
  const R3H = Math.sqrt(3) / 2;
  const stB = { n: 5, seed: 9, rule: 'tri', mode: 'plate' };
  let cacheB = { key: '' };
  function dataB() {
    const key = `${stB.n}|${stB.seed}|${stB.rule}|${stB.mode}`;
    if (cacheB.key === key) return cacheB;
    const rnd = mulberry32(stB.seed), wander = stB.rule === 'wander', det = stB.rule === 'det';
    const pts = [0, 0];
    let count = 0;
    const rec = (ux, uy, vx, vy, fx, fy, depth, level, idx) => {
      if (depth === 0) {
        count++;
        if (stB.mode === 'plate') pts.push((ux + vx + fx) / 3, (uy + vy + fy) / 3);
        pts.push(vx, vy);
        return;
      }
      const mufx = (ux + fx) / 2, mufy = (uy + fy) / 2, mvfx = (vx + fx) / 2, mvfy = (vy + fy) / 2, muvx = (ux + vx) / 2, muvy = (uy + vy) / 2;
      const flip = det ? idx % 2 === 0 : rnd() < 0.5;
      let ch = flip
        ? [[ux, uy, muvx, muvy, mufx, mufy], [muvx, muvy, mufx, mufy, mvfx, mvfy], [mufx, mufy, mvfx, mvfy, fx, fy], [mvfx, mvfy, vx, vy, muvx, muvy]]
        : [[ux, uy, mufx, mufy, muvx, muvy], [mufx, mufy, mvfx, mvfy, fx, fy], [mvfx, mvfy, muvx, muvy, mufx, mufy], [muvx, muvy, vx, vy, mvfx, mvfy]];
      if (wander && level >= 2) ch = ch.map(([ax, ay, bx, by]) => {
        const dx = bx - ax, dy = by - ay, side = rnd() < 0.5 ? 1 : -1;
        return [ax, ay, bx, by, ax + dx / 2 - side * R3H * dy, ay + dy / 2 + side * R3H * dx];
      });
      for (let j = 0; j < 4; j++) {
        rec(ch[j][0], ch[j][1], ch[j][2], ch[j][3], ch[j][4], ch[j][5], depth - 1, level + 1, j);
        if (stB.mode === 'plate' && j === 1) pts.push((ux + vx + fx) / 3, (uy + vy + fy) / 3);
      }
    };
    rec(0, 0, 1, 0, 0.5, R3H, stB.n, 0, 1);      // the initiator itself takes the straight form
    const P = new Float64Array(pts), bb = bbox(P);
    return (cacheB = { key, P, path: polyPath(P, false), count, bb });
  }
  const zB = zoomable('wB', 'cB', (f) => { const b = { ...dataB().bb }; b.y0 = Math.min(b.y0, -0.05); return fitBox(f, b, 0.03); }, (f, v) => {
    const c = f.ctx, D = dataB();
    paper(f, PRINT.paper); toWorld(f, v);
    if (stB.mode === 'plate') {
      const p = new Path2D(D.path); p.lineTo(1, 0); p.lineTo(0, 0); p.closePath();
      c.fillStyle = PRINT.ink; c.fill(p, 'evenodd');
      c.fillStyle = PRINT.ink; c.fillRect(-0.025, -0.04, 1.05, 0.04);        // the initiator bar of the print
    } else {
      c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = Math.max(0.5, Math.min(2, Math.pow(0.5, stB.n) * v.s * 0.1)) / v.s; c.stroke(D.path);
    }
    toScreen(f); if (stB.mode !== 'plate') { dot(c, v, 0, 0); dot(c, v, 1, 0); }
  });
  const RULES_B = { det: 'Deterministic', tri: 'Random, in the triangle', wander: 'Random, wandering' };
  const INFO_B = {
    det: 'Straight and flipped alternate along the teragon. Stage 2 of this setting is the caption box\'s second diagram, reproduced exactly.',
    tri: 'A fair coin picks straight or flipped at every interval. Every shelter stays inside its parent, so the sweep fills exactly the equilateral triangle.',
    wander: 'The coin also re-tosses each shelter\'s side from the third stage on, so the sweep leaks outside the triangle at every scale — the ragged silhouette of the printed plate.',
  };
  function setB(refit) {
    const D = dataB();
    markSB(stB.n); markMB(stB.mode); markGB(stB.rule);
    $('sBv').textContent = `stage ${stB.n}`; $('cBs').textContent = stB.n; $('cBn').textContent = `${fmt(D.count)} intervals`;
    $('seedBv').textContent = stB.rule === 'det' ? 'no seed' : `seed ${stB.seed}`;
    $('rBa').textContent = fmt(D.count);
    $('cBt').textContent = stB.mode === 'plate' ? 'Random sweep, spiked' : 'Teragon';
    $('infoB').textContent = INFO_B[stB.rule];
    if (refit) zB.refit(); else zB.schedule();
  }
  const markSB = stepButtons($('sB'), [1, 2, 3, 4, 5, 6, 7], String, (n) => `Stage ${n}`, (n) => { stB.n = n; setB(true); });
  const markMB = stepButtons($('mB'), ['plate', 'curve'], (k) => (k === 'plate' ? 'Spiky fill' : 'Teragon'), (k) => k, (k) => { stB.mode = k; setB(false); });
  const markGB = stepButtons($('gB'), Object.keys(RULES_B), (k) => RULES_B[k], (k) => RULES_B[k], (k) => { stB.rule = k; setB(true); });
  $('seedB').addEventListener('click', () => { stB.seed = 1 + Math.floor(Math.random() * 9999); setB(true); });
  $('plate229').addEventListener('click', () => { Object.assign(stB, { n: 6, seed: 9, rule: 'wander', mode: 'plate' }); setB(true); });
  miniCurve('miniPS', [[0, 0], [0.25, R3H / 2], [0.75, R3H / 2], [0.5, 0], [1, 0]]);
  miniCurve('miniPF', [[0, 0], [0.5, 0], [0.25, R3H / 2], [0.75, R3H / 2], [1, 0]]);

  // ====================== Plate 230: the squig ======================
  // The valley is a chain of triangles. At each stage every interface (a shared side) is halved and
  // one half is kept, the left one with probability p; inside each triangle the finer chain is then
  // forced: one subtriangle when the kept halves meet at a corner, three otherwise.
  const stC = { n: 8, seed: 4, p: 0.5, mode: 'valleys' };
  let cacheC = { key: '' };
  function centroid(T) { return [(T[0][0] + T[1][0] + T[2][0]) / 3, (T[0][1] + T[1][1] + T[2][1]) / 3]; }
  function refineChain(tris, ifs, rnd, p, closed) {
    const n = tris.length, halves = [];
    for (let i = 0; i < ifs.length; i++) {
      const [P, Q] = ifs[i], m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
      // the flow direction decides which half is "left": downstream through this interface
      const a = closed ? tris[(i + n - 1) % n] : tris[Math.max(0, i - 1)], b = closed ? tris[i % n] : tris[Math.min(n - 1, i)];
      let [dx, dy] = [centroid(b)[0] - centroid(a)[0], centroid(b)[1] - centroid(a)[1]];
      if (!closed && (i === 0 || i === ifs.length - 1)) { const t = tris[i === 0 ? 0 : n - 1], c = centroid(t); const mm = m; const rx = 2 * mm[0] - c[0], ry = 2 * mm[1] - c[1]; [dx, dy] = i === 0 ? [c[0] - rx, c[1] - ry] : [rx - c[0], ry - c[1]]; }
      const left = dx * (P[1] - m[1]) - dy * (P[0] - m[0]) < 0 ? Q : P;      // cross(d, P-m) > 0 means P is left
      const keep = rnd() < p ? left : (left === P ? Q : P);
      halves.push([keep, m]);
    }
    const outT = [], outI = [];
    for (let i = 0; i < n; i++) {
      const E = halves[i], X = closed ? halves[(i + 1) % n] : halves[i + 1], [A, B, C] = tris[i];
      const mAB = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], mBC = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2], mCA = [(C[0] + A[0]) / 2, (C[1] + A[1]) / 2];
      const subs = { A: [A, mAB, mCA], B: [B, mBC, mAB], C: [C, mCA, mBC], M: [mAB, mBC, mCA] };
      const share = { A: [mAB, mCA], B: [mBC, mAB], C: [mCA, mBC] };
      // compare by value: the shared points are computed independently in each parent, so the
      // objects differ, but the doubles are bitwise equal
      const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
      const cnr = (seg) => (eq(seg[0], A) || eq(seg[1], A) ? 'A' : eq(seg[0], B) || eq(seg[1], B) ? 'B' : 'C');
      const cE = cnr(E), cX = cnr(X);
      if (cE === cX) { outT.push(subs[cE]); outI.push(E); }
      else { outT.push(subs[cE], subs.M, subs[cX]); outI.push(E, share[cE], share[cX]); }
    }
    if (!closed) outI.push(halves[halves.length - 1]);
    return [outT, outI];
  }
  const TRI0 = [[0, 0], [1, 0], [0.5, R3H]];
  function dataC() {
    const key = `${stC.n}|${stC.seed}|${stC.p}|${stC.mode}`;
    if (cacheC.key === key) return cacheC;
    const rnd = mulberry32(stC.seed);
    if (stC.mode === 'tree') {
      // branching squigs: every triangle drains across its outlet side; the kept half of the outlet
      // decides which subtriangle inherits it, and the rest drain inward, fully determined
      let nodes = [{ T: TRI0, o: [TRI0[0], TRI0[1]] }];
      const depth = Math.min(stC.n, 7);
      for (let s = 0; s < depth; s++) {
        const out = [];
        for (const { T, o } of nodes) {
          let [a, b, c] = T;
          // rotate so the outlet is (a, b)
          for (let r = 0; r < 3 && !((o[0] === a && o[1] === b) || (o[0] === b && o[1] === a)); r++) [a, b, c] = [b, c, a];
          const mab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], mbc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2], mca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
          const e = rnd() < 0.5;                                   // which half of the outlet is kept
          out.push({ T: [a, mab, mca], o: e ? [a, mab] : [mab, mca] });
          out.push({ T: [b, mbc, mab], o: e ? [mbc, mab] : [b, mab] });
          out.push({ T: [mab, mbc, mca], o: e ? [mab, mca] : [mab, mbc] });
          out.push({ T: [c, mca, mbc], o: [mca, mbc] });
        }
        nodes = out;
      }
      const p = new Path2D();
      for (const { T, o } of nodes) {
        const [cx, cy] = centroid(T), mx = (o[0][0] + o[1][0]) / 2, my = (o[0][1] + o[1][1]) / 2;
        p.moveTo(cx, cy); p.lineTo(mx, my);
      }
      return (cacheC = { key, tree: p, count: nodes.length, stages: null, bb: { x0: 0, x1: 1, y0: 0, y1: R3H } });
    }
    let tris = [TRI0], ifs = [[TRI0[0], TRI0[2]], [TRI0[0], TRI0[1]]];     // in through the left side, out through the base
    const stages = [];
    for (let s = 0; s <= stC.n; s++) {
      if (stC.mode === 'valleys' || s === stC.n) stages.push({ s, tris, ifs });
      if (s < stC.n) [tris, ifs] = refineChain(tris, ifs, rnd, stC.p, false);
    }
    const last = stages[stages.length - 1], pts = [];
    for (let i = 0; i < last.ifs.length; i++) { const [P, Q] = last.ifs[i]; pts.push((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2); }
    const vpaths = stages.map(({ tris: ts }) => { const p = new Path2D(); for (const [A, B, C] of ts) { p.moveTo(A[0], A[1]); p.lineTo(B[0], B[1]); p.lineTo(C[0], C[1]); } return p; });
    return (cacheC = { key, stages, vpaths, curve: polyPath(pts, false), count: last.tris.length, bb: { x0: 0, x1: 1, y0: 0, y1: R3H } });
  }
  const zC = zoomable('wC', 'cC', (f) => fitBox(f, dataC().bb, 0.04), (f, v) => {
    const c = f.ctx, D = dataC();
    paper(f, PRINT.paper); toWorld(f, v);
    if (stC.mode === 'tree') {
      c.strokeStyle = PRINT.ink; c.lineCap = 'round'; c.lineWidth = Math.max(0.5, Math.min(1.4, Math.pow(0.5, Math.min(stC.n, 7)) * v.s * 0.12)) / v.s;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(1, 0); c.lineTo(0.5, R3H); c.closePath(); c.strokeStyle = PRINT.gray; c.lineWidth = 1 / v.s; c.stroke();
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(0.5, Math.min(1.4, Math.pow(0.5, Math.min(stC.n, 7)) * v.s * 0.12)) / v.s; c.stroke(D.tree);
    } else {
      if (stC.mode === 'valleys') {
        D.vpaths.forEach((p, k) => { const t = D.vpaths.length === 1 ? 1 : k / (D.vpaths.length - 1); const g = Math.round(228 - 150 * t); c.fillStyle = `rgb(${g},${g},${Math.round(g * 0.985)})`; c.fill(p); });
      }
      c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineCap = 'round';
      c.lineWidth = Math.max(0.6, Math.min(2.4, Math.pow(0.5, stC.n) * v.s * 0.2)) / v.s; c.stroke(D.curve);
    }
    toScreen(f);
  });
  const MODES_C = { valleys: 'Valleys in grays', curve: 'The squig alone', tree: 'Branching squigs' };
  const INFO_C = {
    valleys: 'Each stage\'s valley over the last, darker and darker, the squig in black — the plate\'s superposition.',
    curve: 'The squig drawn through the midpoints of the kept halves.',
    tree: 'Page 227\'s facing-column figure: the subtriangles the river leaves drain into it by the same rule, and the tree fills the triangle at random. Always an even coin.',
  };
  function setC(refit) {
    const D = dataC(), E = 3 - stC.p * stC.p - (1 - stC.p) * (1 - stC.p), dim = Math.log(E) / Math.log(2);
    markSC(stC.n); markMC(stC.mode);
    $('sCv').textContent = `stage ${stC.mode === 'tree' ? Math.min(stC.n, 7) : stC.n}`; $('cCs').textContent = stC.mode === 'tree' ? Math.min(stC.n, 7) : stC.n;
    $('cCn').textContent = `${fmt(D.count)} ${stC.mode === 'tree' ? 'triangles' : 'links'}`;
    $('seedCv').textContent = `seed ${stC.seed}`;
    $('pCv').textContent = `p = ${stC.p.toFixed(2)} · D ≈ ${dim.toFixed(4)}`;
    $('rCa').textContent = fmt(D.count); $('rCb').textContent = E.toFixed(2); $('rCc').textContent = `≈ ${dim.toFixed(4)}`;
    $('cCt').textContent = { valleys: 'Squig valley', curve: 'Squig curve', tree: 'Branching squigs' }[stC.mode];
    $('infoC').textContent = INFO_C[stC.mode];
    $('pC').disabled = stC.mode === 'tree';
    if (refit) zC.refit(); else zC.schedule();
  }
  const markSC = stepButtons($('sC'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], String, (n) => `Stage ${n}`, (n) => { stC.n = n; setC(false); });
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => MODES_C[k], (k) => { stC.mode = k; setC(true); });
  $('pC').addEventListener('input', (e) => { stC.p = Number(e.target.value) / 100; setC(false); });
  $('seedC').addEventListener('click', () => { stC.seed = 1 + Math.floor(Math.random() * 9999); setC(false); });
  $('plate230').addEventListener('click', () => { Object.assign(stC, { n: 10, seed: 4, p: 0.5, mode: 'valleys' }); $('pC').value = 50; setC(true); });

  // ====================== Plate 231: the hexa-squig ======================
  const stD = { n: 10, seed: 2, mode: 'coast' };
  let cacheD = { key: '' };
  function dataD() {
    const key = `${stD.n}|${stD.seed}`;
    if (cacheD.key === key) return cacheD;
    const rnd = mulberry32(stD.seed);
    const O = [0, 0], V = Array.from({ length: 6 }, (_, k) => [Math.cos((k * Math.PI) / 3), Math.sin((k * Math.PI) / 3)]);
    let tris = V.map((p, k) => [O, p, V[(k + 1) % 6]]);
    let ifs = V.map((p) => [O, p]);                                // the six radial sides, cyclically
    for (let s = 0; s < stD.n; s++) [tris, ifs] = refineChain(tris, ifs, rnd, 0.5, true);
    const pts = [];
    for (const [P, Q] of ifs) pts.push((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2);
    let area = 0;
    for (let i = 0; i < pts.length; i += 2) { const j = (i + 2) % pts.length; area += pts[i] * pts[j + 1] - pts[j] * pts[i + 1]; }
    return (cacheD = { key, loop: polyPath(pts, true), count: tris.length, area: Math.abs(area) / 2, hex: polyPath(V.flat(), true) });
  }
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, { x0: -1, x1: 1, y0: -R3H, y1: R3H }, 0.04), (f, v) => {
    const c = f.ctx, D = dataD();
    paper(f, PRINT.paper); toWorld(f, v);
    if (stD.mode === 'coast') {
      c.fillStyle = PRINT.ink; c.fill(D.hex);
      c.fillStyle = PRINT.paper; c.fill(D.loop);
    } else {
      c.strokeStyle = PRINT.rule; c.lineWidth = 1 / v.s; c.stroke(D.hex);
      c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = Math.max(0.5, Math.min(1.8, Math.pow(0.5, stD.n) * v.s * 0.2)) / v.s; c.stroke(D.loop);
    }
    toScreen(f);
  });
  function setD(refit) {
    const D = dataD(), hexA = 6 * (R3H / 2);
    markSD(stD.n); markMD(stD.mode);
    $('sDv').textContent = `stage ${stD.n}`; $('cDs').textContent = stD.n; $('cDn').textContent = `${fmt(D.count)} links`;
    $('seedDv').textContent = `seed ${stD.seed}`;
    $('rDa').textContent = fmt(D.count); $('rDb').textContent = `${((D.area / hexA) * 100).toFixed(1)}% of the hexagon`;
    $('cDt').textContent = stD.mode === 'coast' ? 'Hexa-squig coastline' : 'The loop alone';
    if (refit) zD.refit(); else zD.schedule();
  }
  const markSD = stepButtons($('sD'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], String, (n) => `Stage ${n}`, (n) => { stD.n = n; setD(false); });
  const markMD = stepButtons($('mD'), ['coast', 'loop'], (k) => (k === 'coast' ? 'Coast in ink' : 'The loop'), (k) => k, (k) => { stD.mode = k; setD(false); });
  $('seedD').addEventListener('click', () => { stD.seed = 1 + Math.floor(Math.random() * 9999); setD(false); });
  $('plate231').addEventListener('click', () => { Object.assign(stD, { n: 11, seed: 2, mode: 'coast' }); setD(true); });

  setA(true); setB(true); setC(true); setD(true);
})();
