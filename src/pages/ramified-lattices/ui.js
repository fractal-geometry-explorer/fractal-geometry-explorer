(() => {

  // ====================== Plate 141: Sierpiński gasket and arrowhead ======================
  const stA = { n: 8, mode: 'fish' };
  const cacheA = {};
  function dataA() {
    const key = `${stA.mode}|${stA.n}`;
    if (cacheA[key]) return cacheA[key];
    let out;
    if (stA.mode === 'sets') {
      const tris = gasketTris(stA.n);
      const paths = chunked(tris.length, (p, i) => { const [x, y, s] = tris[i]; p.moveTo(x, y); p.lineTo(x + s, y); p.lineTo(x + s / 2, y + (s * R3) / 2); }, 2048);
      out = { paths, count: tris.length, box: { x0: 0, x1: 1, y0: 0, y1: R3 / 2 } };
    } else {
      const P = curveOf(new Array(stA.n).fill(ARROW_GEN));
      const F = stA.n >= 3 ? arrowFish(P) : P;
      out = { P, F, count: P.length / 2 - 1, path: polyPath(P, false), fishPath: polyPath(F, false), box: stA.mode === 'fish' ? bbox(F) : { x0: 0, x1: 1, y0: 0, y1: R3 / 2 } };
    }
    return (cacheA[key] = out);
  }
  const zA = zoomable('wA', 'cA', (f) => fitBox(f, dataA().box, 0.04), (f, v) => {
    const c = f.ctx, D = dataA(), L = Math.pow(0.5, stA.n) * v.s;
    paper(f, PRINT.paper); toWorld(f, v);
    c.lineJoin = 'round';
    if (stA.mode === 'sets') {
      c.fillStyle = PRINT.ink;
      for (const p of D.paths) c.fill(p);
    } else if (stA.mode === 'teragon') {
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(0.5, Math.min(2.2, L * 0.16)) / v.s; c.stroke(D.path);
    } else {
      // the plate: the fish piece filled as one polygon. Its pinches alternate which tremas
      // connect to the outside, which is what prints the big tremas black.
      c.fillStyle = PRINT.ink; c.fill(D.fishPath, 'evenodd');
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(0.3, Math.min(1.2, L * 0.1)) / v.s; c.stroke(D.fishPath);
    }
    toScreen(f);
    if (stA.mode === 'teragon') { dot(c, v, 0, 0); dot(c, v, 1, 0); }
  });
  const MODES_A = { fish: 'Plate 141', teragon: 'Teragon', sets: 'Closed sets' };
  const CAP_A = {
    fish: 'The arrowhead of Plate 141: the piece of the curve between two successive visits to the midpoint of [0, 1], closed into one polygon and filled. The large tremas come out black or white exactly as the plate prints them: whether a trema reads as ink depends on how many of the curve\'s pinch points separate it from the outside.',
    teragon: 'The teragon on [0, 1]. Finite stages are free of self-contact, like the Koch curves of Chapter 6, but the limit touches itself infinitely often, and every point of the limit is a branch point.',
    sets: 'Sierpiński\'s curve as a gasket, built by cutting out tremas: each filled triangle is replaced by the three closed triangles on its corners, so the open middle quarter is removed, ad infinitum.',
  };
  function setA(refit) {
    const D = dataA();
    markMA(stA.mode); markSA(stA.n);
    markSA.buttons.forEach((b, i) => { b.disabled = (stA.mode === 'fish' && i < 3) || (stA.mode === 'sets' && i > 8); });
    $('cAt').textContent = { fish: 'Sierpiński arrowhead', teragon: 'Arrowhead teragon', sets: 'Gasket by tremas' }[stA.mode];
    $('capA').innerHTML = CAP_A[stA.mode];
    $('sAv').textContent = `stage ${stA.n}`; $('cAs').textContent = stA.n;
    $('cAn').textContent = stA.mode === 'sets' ? `${fmt(D.count)} triangles` : `${fmt(D.count)} intervals`;
    $('rAa').textContent = fmt(D.count);
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; if (k === 'fish' && stA.n < 3) stA.n = 3; if (k === 'sets' && stA.n > 8) stA.n = 8; setA(true); });
  const markSA = stepButtons($('sA'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], String, (n) => `Stage ${n}`, (n) => { stA.n = n; setA(stA.mode === 'fish'); });
  $('plate141').addEventListener('click', () => { Object.assign(stA, { mode: 'fish', n: 8 }); setA(true); });
  miniCurve('miniArrow', ARROW_PTS);
  miniCurve('miniArrow2', curveOf([ARROW_GEN, ARROW_GEN]), false);

  // ====================== Page 132: critical percolation clusters ======================
  const stB = { mode: 'backbone', seed: 2, p: 0.5, L: 104 };
  let dataBCache = null;
  function dataB() {
    const key = `${stB.seed}|${stB.p}|${stB.L}`;
    if (dataBCache && dataBCache.key === key) return dataBCache;
    return (dataBCache = { key, ...percolation(stB.L, stB.p, stB.seed * 7919 + 13) });
  }
  const fB = figure($('cB'), () => drawB());
  function drawB() {
    const D = dataB(), c = fB.ctx, L = D.L;
    c.setTransform(fB.dpr, 0, 0, fB.dpr, 0, 0);
    c.fillStyle = '#121212'; c.fillRect(0, 0, fB.w, fB.h);
    const s = Math.min(fB.w, fB.h) / (L + 1), ox = (fB.w - s * (L - 1)) / 2, oy = (fB.h - s * (L - 1)) / 2;
    const line = (i, j) => { c.moveTo(ox + (i % L) * s, oy + ((i / L) | 0) * s); c.lineTo(ox + (j % L) * s, oy + ((j / L) | 0) * s); };
    const pass = (test, style, w) => {
      c.beginPath();
      for (let i = 0; i < L * L; i++) { if (D.right[i] && i % L < L - 1 && test(i, i + 1)) line(i, i + 1); if (D.up[i] && i < L * L - L && test(i, i + L)) line(i, i + L); }
      c.strokeStyle = style; c.lineWidth = w; c.lineCap = 'round'; c.stroke();
    };
    if (stB.mode === 'bonds') pass(() => true, '#b9b7ae', 1);
    else if (stB.mode === 'cluster') { pass((i, j) => !(D.inC[i] && D.inC[j]), 'rgba(185,183,174,0.28)', 1); pass((i, j) => D.inC[i] && D.inC[j], '#f2f1ea', 1.4); }
    else { pass((i, j) => D.inC[i] && D.inC[j] && !(D.keep[i] && D.keep[j]), 'rgba(185,183,174,0.22)', 1); pass((i, j) => D.keep[i] && D.keep[j], '#f2f1ea', 1.6); }
  }
  function setB() {
    const D = dataB();
    markMB(stB.mode);
    let kept = 0, inc = 0;
    for (let i = 0; i < D.L * D.L; i++) { if (D.keep[i]) kept++; if (D.inC[i]) inc++; }
    $('rBa').textContent = fmt(inc); $('rBb').textContent = fmt(kept);
    $('rBc').textContent = D.spans ? 'yes' : 'no';
    $('rBd').textContent = (stB.p).toFixed(2);
    $('pBv').textContent = `p = ${stB.p.toFixed(2)}`;
    drawB();
  }
  const MODES_B = { bonds: 'All open bonds', cluster: 'Cluster of interest', backbone: 'Dangling ends trimmed' };
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(); });
  $('rollB').addEventListener('click', () => { stB.seed++; setB(); });
  $('pB').addEventListener('input', (e) => { stB.p = Number(e.target.value) / 100; $('pBv').textContent = `p = ${stB.p.toFixed(2)}`; setB(); });

  // ====================== Plate 143: the fractal skewed web ======================
  const stC = { n: 4, mode: 'web', yaw: 0.42, pitch: 0.42 };
  const cacheC = {};
  function dataC() {
    if (cacheC[stC.n]) return cacheC[stC.n];
    return (cacheC[stC.n] = { tets: webTets(stC.n) });
  }
  function frameC() {
    const ca = Math.cos(stC.yaw), sa = Math.sin(stC.yaw), cp = Math.cos(stC.pitch), sp = Math.sin(stC.pitch);
    return (x, y, z) => {
      // centre the tetrahedron, yaw about the vertical, then tilt toward the viewer
      const X = x - 0.5, Y = y - R3 / 4, Z = z - Math.sqrt(6) / 6;
      const xr = X * ca - Y * sa, yr = X * sa + Y * ca;
      return [xr, yr * sp + Z * cp, yr * cp - Z * sp];       // [screen x, screen y, depth away from viewer]
    };
  }
  const fC = figure($('cC'), () => drawC());
  function drawC() {
    const c = fC.ctx, D = dataC(), T = frameC();
    c.setTransform(fC.dpr, 0, 0, fC.dpr, 0, 0);
    c.fillStyle = PRINT.paper; c.fillRect(0, 0, fC.w, fC.h);
    const sc = Math.min(fC.w, fC.h) / 1.45, ox = fC.w / 2, oy = fC.h / 2;
    const px = (p) => [ox + p[0] * sc, oy - p[1] * sc];
    if (stC.mode === 'shadow') {
      // project every tetrahedron along the axis joining the midpoints of two opposite edges:
      // each one lands on a subsquare, and together they pave the initial square
      const d = WEB_AXIS.dir;
      const e1 = [1, 0, 0].map((v, k) => v - d[k] * d[0]);
      const L1 = Math.hypot(...e1), u = e1.map((v) => v / L1);
      const w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
      // a tetrahedron's four corners project to the corners of a square (turned 45° in this basis)
      const proj = (x, y, z) => { const X = x - 0.5, Y = y - R3 / 4, Z = z - Math.sqrt(6) / 6; return [X * u[0] + Y * u[1] + Z * u[2], X * w[0] + Y * w[1] + Z * w[2]]; };
      c.beginPath();
      for (const [x, y, z, s] of D.tets) {
        const pts = TET_V.map(([vx, vy, vz]) => proj(x + vx * s, y + vy * s, z + vz * s));
        for (const [i, k] of [[0, 0], [2, 1], [1, 2], [3, 3]]) { const p = pts[i]; c[k === 0 ? 'moveTo' : 'lineTo'](ox + p[0] * sc * 1.25, oy - p[1] * sc * 1.25); }
        c.closePath();
      }
      c.strokeStyle = PRINT.ink; c.fillStyle = 'rgba(21,21,21,0.12)'; c.lineWidth = 1;
      c.fill(); c.stroke();
      return;
    }
    const segs = [];
    for (const [x, y, z, s] of D.tets) {
      const P = TET_V.map(([vx, vy, vz]) => T(x + vx * s, y + vy * s, z + vz * s));
      for (const [a, b] of TET_EDGES) segs.push([P[a], P[b], (P[a][2] + P[b][2]) / 2]);
    }
    segs.sort((a, b) => b[2] - a[2]);
    const dmin = segs[segs.length - 1][2], dmax = segs[0][2], span = Math.max(1e-9, dmax - dmin);
    c.lineCap = 'round';
    for (const [a, b, d] of segs) {
      const t = (d - dmin) / span;           // far edges print lighter, near edges darker
      c.strokeStyle = `rgba(21,21,21,${(0.9 - 0.55 * t).toFixed(3)})`;
      c.lineWidth = 1.5 - 0.6 * t;
      c.beginPath(); c.moveTo(...px(a)); c.lineTo(...px(b)); c.stroke();
    }
  }
  attachOrbit($('wC'), stC, drawC);
  function setC() {
    const D = dataC();
    markMC(stC.mode); markSC(stC.n);
    $('cCs').textContent = stC.n; $('cCn').textContent = `${fmt(D.tets.length)} tetrahedra`;
    $('rCa').textContent = fmt(D.tets.length);
    $('capC').innerHTML = stC.mode === 'shadow'
      ? 'Projected along the line joining the midpoints of either couple of opposite edges, every tetrahedron of generation k lands on a subsquare of side (½)<sup>k</sup> of the initial square. The web\'s shadow is the whole square: a shape of dimension 2 whose projection has positive area.'
      : 'Drag to turn the web. Every closed tetrahedron is replaced by the four half-scale tetrahedra on its corners; what remains in the limit is a spatial curve, a web of lines, with D = 2 exactly.';
    drawC();
  }
  const MODES_C = { web: 'The web', shadow: 'Its square shadow' };
  const markMC = stepButtons($('mC'), Object.keys(MODES_C), (k) => MODES_C[k], (k) => `Show: ${MODES_C[k]}`, (k) => { stC.mode = k; setC(); });
  const markSC = stepButtons($('sC'), [0, 1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { stC.n = n; setC(); });
  $('plate143').addEventListener('click', () => { Object.assign(stC, { mode: 'web', n: 5, yaw: 0.16, pitch: 0.26 }); setC(); });

  // ====================== Plate 145: the Sierpiński carpet and its kin ======================
  const stD = { kind: 'triadic', b: 5, n: 3 };
  const cacheD = {};
  function bD() { return stD.kind === 'triadic' ? 3 : stD.b; }
  function maxND() { const N = carpetN(stD.kind, bD()); let n = 0, c = 1; while (c * N <= 70000) { c *= N; n++; } return n; }
  function dataD() {
    const key = `${stD.kind}|${bD()}|${stD.n}`;
    if (cacheD[key]) return cacheD[key];
    const cells = carpetCells(stD.kind, bD(), stD.n);
    const paths = chunked(cells.length, (p, i) => { const [x, y, s] = cells[i]; p.rect(x, y, s, s); }, 4096);
    return (cacheD[key] = { cells, paths });
  }
  const zD = zoomable('wD', 'cD', (f) => fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0.04), (f, v) => {
    const c = f.ctx, D = dataD();
    paper(f, PRINT.paper); toWorld(f, v);
    c.fillStyle = PRINT.ink; c.strokeStyle = PRINT.ink; c.lineWidth = 0.25 / v.s; c.lineJoin = 'miter';
    for (const p of D.paths) { c.fill(p); c.stroke(p); }
    toScreen(f);
  });
  function setD(refit) {
    const b = bD(), N = carpetN(stD.kind, b), D = Math.log(N) / Math.log(b);
    stD.n = Math.min(stD.n, maxND());
    markKD(stD.kind); markSD(stD.n);
    markSD.buttons.forEach((bt, i) => { bt.disabled = i > maxND(); });
    $('bD').value = b; $('bDv').textContent = `b = ${b}`;
    $('bD').disabled = stD.kind === 'triadic';
    $('bD').step = stD.kind === 'small' ? 2 : 1; $('bD').min = stD.kind === 'small' ? 5 : 4;
    const cells = dataD().cells.length;
    $('sDv').textContent = `stage ${stD.n}`; $('cDs').textContent = stD.n; $('cDn').textContent = `${fmt(cells)} squares`;
    $('rDa').textContent = `${N} of ${b * b}`; $('rDb').textContent = D.toFixed(4);
    $('dimD').textContent = { triadic: 'N = 8, r = 1/3 · D = log 8/log 3 ≈ 1.8928', large: `thin ring of 4(b−1) = ${N} squares · D = log ${N}/log ${b} ≈ ${D.toFixed(4)}`, small: `thick ring of b²−1 = ${N} squares · D = log ${N}/log ${b} ≈ ${D.toFixed(4)}` }[stD.kind];
    $('capD').innerHTML = {
      triadic: 'The literal planar extension of Cantor\'s mid-third removal: the middle ninth of a square is cut out as a trema, and the ring of 8 remaining subsquares is kept, ad infinitum. The carpet\'s area vanishes while the total perimeter of its holes is infinite.',
      large: 'A "large centered medallion" carpet: the trema is a square of side 1 − 2/b with the same centre, and the generator is a thin ring of 4(b − 1) squares of side 1/b. As b grows, D falls toward 1.',
      small: 'A "small centered medallion" carpet, for odd b: the trema is the single centre subsquare of side 1/b, and the generator is a thick ring of b² − 1 squares. As b grows, D climbs toward 2: any D between 1 and 2 can be approached by a centered carpet.',
    }[stD.kind];
    if (refit) zD.refit(); else zD.schedule();
  }
  const markKD = stepButtons($('kD'), ['triadic', 'large', 'small'], (k) => ({ triadic: 'Triadic carpet', large: 'Large medallion', small: 'Small medallion' }[k]), (k) => `Family: ${k}`, (k) => { stD.kind = k; if (k === 'small' && stD.b % 2 === 0) stD.b = 5; setD(false); });
  const markSD = stepButtons($('sD'), [0, 1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { stD.n = n; setD(false); });
  $('bD').addEventListener('input', (e) => { let b = Number(e.target.value); if (stD.kind === 'small' && b % 2 === 0) b += 1; stD.b = Math.max(4, Math.min(9, b)); setD(false); });
  $('plate145c').addEventListener('click', () => { Object.assign(stD, { kind: 'triadic', n: 3 }); setD(true); });

  // ====================== Plate 145: the Menger sponge ======================
  const stE = { n: 3, yaw: 0.52, pitch: 0.42 };
  const cacheE = {};
  function dataE() {
    if (cacheE[stE.n]) return cacheE[stE.n];
    return (cacheE[stE.n] = spongeFaces(stE.n));
  }
  // face corner offsets per axis and direction
  const FACE_PTS = [
    [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ];
  const fE = figure($('cE'), () => drawE());
  function drawE() {
    const c = fE.ctx, D = dataE(), m = D.size;
    c.setTransform(fE.dpr, 0, 0, fE.dpr, 0, 0);
    c.fillStyle = PRINT.paper; c.fillRect(0, 0, fE.w, fE.h);
    const ca = Math.cos(stE.yaw), sa = Math.sin(stE.yaw), cp = Math.cos(stE.pitch), sp = Math.sin(stE.pitch);
    const T = (x, y, z) => {
      const X = x / m - 0.5, Y = y / m - 0.5, Z = z / m - 0.5;
      const xr = X * ca - Y * sa, yr = X * sa + Y * ca;
      return [xr, yr * sp + Z * cp, yr * cp - Z * sp];
    };
    const NRM = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const sc = Math.min(fE.w, fE.h) / 1.9, ox = fE.w / 2, oy = fE.h / 2;
    const light = [-0.5, -0.75, 0.78];   // from the front right and above, as in the book's print
    const quads = [];
    for (const [x, y, z, axis, dir] of D.faces) {
      const k = axis * 2 + (dir > 0 ? 0 : 1);
      // world normal after yaw
      const n0 = NRM[k], nx = n0[0] * ca - n0[1] * sa, ny = n0[0] * sa + n0[1] * ca, nz = n0[2];
      const toward = -(ny * cp - nz * sp);    // negative depth direction faces the viewer
      if (toward <= 0.001) continue;
      const pts = FACE_PTS[k].map(([dx, dy, dz]) => T(x + dx, y + dy, z + dz));
      const depth = (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4;
      const lam = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
      quads.push([pts, depth, lam]);
    }
    quads.sort((a, b) => b[1] - a[1]);
    for (const [pts, , lam] of quads) {
      const tone = lam > 0.7 ? '#e6e4dc' : lam > 0.35 ? '#9b998f' : '#2a2a27';
      c.fillStyle = tone; c.strokeStyle = tone;
      c.beginPath();
      c.moveTo(ox + pts[0][0] * sc, oy - pts[0][1] * sc);
      for (let i = 1; i < 4; i++) c.lineTo(ox + pts[i][0] * sc, oy - pts[i][1] * sc);
      c.closePath(); c.fill(); c.lineWidth = 0.6; c.stroke();
      c.strokeStyle = 'rgba(21,21,21,0.35)'; c.lineWidth = 0.4; c.stroke();
    }
  }
  attachOrbit($('wE'), stE, drawE);
  function setE() {
    const D = dataE();
    markSE(stE.n);
    $('cEs').textContent = stE.n; $('cEn').textContent = `${fmt(D.count)} cubes`;
    $('rEa').textContent = fmt(D.count);
    drawE();
  }
  const markSE = stepButtons($('sE'), [0, 1, 2, 3], String, (n) => `Stage ${n}`, (n) => { stE.n = n; setE(); });
  $('plate145s').addEventListener('click', () => { Object.assign(stE, { n: 3, yaw: 0.52, pitch: 0.42 }); setE(); });

  // ====================== Pages 138–139: branches without loops ======================
  const stF = { n: 4, mode: 'side' };
  const cacheF = {};
  function dataF() {
    const key = `${stF.mode}|${stF.n}`;
    if (cacheF[key]) return cacheF[key];
    const P = curveOf(new Array(stF.n).fill(BRANCH_GEN));
    let out;
    if (stF.mode === 'side') out = { P, count: P.length / 2 - 1, path: polyPath(P, false), box: bbox(P) };
    else {
      // the square initiator, bumps outward: four copies of the curve around the unit square
      // clockwise, so that every side's tabs grow outward, as the snowflake's do
      const sides = [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0], [1, 0, 0, 0]], path = new Path2D();
      let count = 0;
      const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      for (const [ax, ay, bx, by] of sides) {
        const dx = bx - ax, dy = by - ay, Q = new Float64Array(P.length);
        for (let i = 0; i < P.length; i += 2) { Q[i] = ax + dx * P[i] - dy * P[i + 1]; Q[i + 1] = ay + dy * P[i] + dx * P[i + 1]; }
        path.addPath(polyPath(Q, false)); bbox(Q, box); count += P.length / 2 - 1;
      }
      out = { count, path, box };
    }
    return (cacheF[key] = out);
  }
  const zF = zoomable('wF', 'cF', (f) => fitBox(f, dataF().box, 0.04), (f, v) => {
    const c = f.ctx, D = dataF(), L = Math.pow(1 / 3, stF.n) * v.s;
    paper(f, PRINT.paper); toWorld(f, v);
    c.strokeStyle = PRINT.ink; c.lineJoin = 'round'; c.lineWidth = Math.max(0.4, Math.min(2, L * 0.1)) / v.s; c.stroke(D.path);
    toScreen(f);
    if (stF.mode === 'side') { dot(c, v, 0, 0); dot(c, v, 1, 0); }
  });
  function setF(refit) {
    const D = dataF();
    markMF(stF.mode); markSF(stF.n);
    $('cFs').textContent = stF.n; $('cFn').textContent = `${fmt(D.count)} intervals`;
    $('rFa').textContent = fmt(D.count);
    if (refit) zF.refit(); else zF.schedule();
  }
  const MODES_F = { side: 'One side, as printed', square: 'On the square' };
  const markMF = stepButtons($('mF'), Object.keys(MODES_F), (k) => MODES_F[k], (k) => `Show: ${MODES_F[k]}`, (k) => { stF.mode = k; setF(true); });
  const markSF = stepButtons($('sF'), [1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { stF.n = n; setF(false); });
  $('fig139').addEventListener('click', () => { Object.assign(stF, { mode: 'side', n: 4 }); setF(true); });
  miniCurve('miniBranch', BRANCH_PTS);

  // ====================== Plate 146: the split snowflake halls ======================
  const stG = { n: 4, mode: 'curve', flake: false };
  const cacheG = {};
  const FLAKE_G = polyPath(kochFlakePts(5).flat(), true);
  function dataG() {
    if (cacheG[stG.n]) return cacheG[stG.n];
    const P = curveOf(new Array(stG.n).fill(HALLS_GEN));
    return (cacheG[stG.n] = { P, count: P.length / 2 - 1, path: polyPath(P, false), closed: polyPath(P, true), box: bbox(P) });
  }
  const zG = zoomable('wG', 'cG', (f) => fitBox(f, { x0: -0.12, x1: 1.12, y0: -0.3, y1: 0.88 }, 0.03), (f, v) => {
    const c = f.ctx, D = dataG(), L = Math.pow(1 / (3 * R3), stG.n) * v.s;
    paper(f, PRINT.paper); toWorld(f, v);
    c.lineJoin = 'round';
    if (stG.flake) { c.strokeStyle = '#a9a79f'; c.lineWidth = 1 / v.s; c.setLineDash([4 / v.s, 3 / v.s]); c.stroke(FLAKE_G); c.setLineDash([]); }
    if (stG.mode === 'halls') {
      c.fillStyle = '#c7c5bc'; c.fill(D.closed);
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(0.35, Math.min(1.6, L * 2.4)) / v.s; c.stroke(D.path);
    } else {
      c.strokeStyle = PRINT.ink; c.lineWidth = Math.max(0.35, Math.min(1.8, L * 3)) / v.s; c.stroke(D.path);
    }
    toScreen(f); dot(c, v, 0, 0); dot(c, v, 1, 0);
  });
  function setG(refit) {
    const D = dataG();
    markMG(stG.mode); markSG(stG.n);
    $('flakeG').checked = stG.flake;
    $('cGs').textContent = stG.n; $('cGn').textContent = `${fmt(D.count)} legs`;
    $('rGa').textContent = fmt(D.count);
    $('capG').innerHTML = stG.mode === 'halls'
      ? 'The Wise Elders\' division: the curve runs from one end of the line to the other, and everything on one side of it is gray. Each contender\'s share is a labyrinth of halls connected by narrow doors, and the riddles answer themselves: follow the gray to see who controls the Great Hall at the centre, and where it opens to the outside.'
      : 'The maze at this stage. The straight line the curve starts from is the Elders\' line; the curve wanders north and south of it, and in the limit it splits the snowflake\'s interior into two intertwined halls.';
    if (refit) zG.refit(); else zG.schedule();
  }
  const MODES_G = { curve: 'The maze', halls: 'North and South' };
  const markMG = stepButtons($('mG'), Object.keys(MODES_G), (k) => MODES_G[k], (k) => `Show: ${MODES_G[k]}`, (k) => { stG.mode = k; setG(false); });
  const markSG = stepButtons($('sG'), [1, 2, 3, 4, 5], String, (n) => `Stage ${n}`, (n) => { stG.n = n; setG(false); });
  $('flakeG').addEventListener('change', (e) => { stG.flake = e.target.checked; setG(false); });
  $('plate146').addEventListener('click', () => { Object.assign(stG, { mode: 'curve', n: 4, flake: false }); setG(true); });
  miniCurve('miniHalls', HALLS_PTS);

  setA(true); setB(); setC(); setD(true); setE(); setF(true); setG(true);
})();
