// CORE START
const S3 = Math.sqrt(3), S7 = Math.sqrt(7), DEG = 180 / Math.PI;
const PHI = Math.atan2(S3, 5);                          // 19.1066°: the turn of the first step
// the generator on a side running from 0 to 1: three steps of length 1/√7, symmetric about 1/2.
// As in the plate, the first step turns outward (to the right of travel round a counterclockwise hexagon).
const GW = [Math.cos(PHI) / S7, -Math.sin(PHI) / S7];
const GV = [GW[0] * 0.5 - GW[1] * S3 / 2, GW[0] * S3 / 2 + GW[1] * 0.5];
const GEN = [[0, 0], GW, [GW[0] + GV[0], GW[1] + GV[1]], [1, 0]];
// pointy-top hexagon of side 1, counterclockwise from its lower-left corner
const HEX = (() => { const P = new Float64Array(12); for (let k = 0; k < 6; k++) { const a = (-150 + 60 * k) / DEG; P[2 * k] = Math.cos(a); P[2 * k + 1] = Math.sin(a); } return P; })();
const islandCache = [];
function islandPoly(n) {
  if (islandCache[n]) return islandCache[n];
  let P = HEX;
  for (let k = 0; k < n; k++) {
    const m = P.length / 2, Q = new Float64Array(m * 6);
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, dx = P[j] - ax, dy = P[j + 1] - ay;
      for (let g = 0; g < 3; g++) { Q[6 * i + 2 * g] = ax + dx * GEN[g][0] - dy * GEN[g][1]; Q[6 * i + 2 * g + 1] = ay + dx * GEN[g][1] + dy * GEN[g][0]; }
    }
    P = Q;
  }
  return (islandCache[n] = P);
}
function shoelace(P) { let s = 0; const m = P.length / 2; for (let i = 0; i < m; i++) { const j = ((i + 1) % m) * 2; s += P[2 * i] * P[j + 1] - P[j] * P[2 * i + 1]; } return s / 2; }
// The Peano–Gosper curve (Plate 70): A → A−B−−B+A++AA+B−, B → +A−BB−−B−A++A+B, with turns of 60°.
// B is A run backwards. The plate's handedness has '+' turning clockwise. It runs from hexagon corner 0 to corner 2.
const SNAKE = { A: 'A-B--B+A++AA+B-', B: '+A-BB--B-A++A+B' };
const KIDS = { A: 'ABBAAAB', B: 'ABBBAAB' };
const snakeCache = [];
function flowsnake(n) {
  if (snakeCache[n]) return snakeCache[n];
  const N = Math.pow(7, n), P = new Float64Array(2 * N + 2);
  const DX = [], DY = [];
  for (let h = 0; h < 6; h++) { DX.push(Math.cos(h * Math.PI / 3)); DY.push(Math.sin(h * Math.PI / 3)); }
  let x = 0, y = 0, h = 0, w = 1;
  const rec = (sym, d) => {
    if (d === 0) { x += DX[h]; y += DY[h]; P[2 * w] = x; P[2 * w + 1] = y; w++; return; }
    const s = SNAKE[sym];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '+') h = (h + 5) % 6; else if (c === '-') h = (h + 1) % 6; else rec(c, d - 1);
    }
  };
  rec('A', n);
  const ax = HEX[0], ay = HEX[1], bx = HEX[4], by = HEX[5], L2 = x * x + y * y;
  const cr = ((bx - ax) * x + (by - ay) * y) / L2, ci = ((by - ay) * x - (bx - ax) * y) / L2;
  for (let i = 0; i <= N; i++) { const px = P[2 * i], py = P[2 * i + 1]; P[2 * i] = ax + cr * px - ci * py; P[2 * i + 1] = ay + ci * px + cr * py; }
  return (snakeCache[n] = P);
}
// Pertiling: island n is exactly seven copies of island n−1, each shrunk by 1/√7 and turned −19.1°,
// one at the center and six at distance √3/√7.
const RHO = [Math.cos(-PHI) / S7, Math.sin(-PHI) / S7];
const CEN = [[0, 0]];
for (let k = 0; k < 6; k++) { const a = -PHI + k * Math.PI / 3; CEN.push([Math.cos(a) * S3 / S7, Math.sin(a) * S3 / S7]); }
// Tiling: islands of stage ≥ 1 tile the plane on the lattice √3·e^{i(θ + 60°k)}, θ = −2·19.1°
const TILE_TH = -2 * PHI;
// a point on one side's limit curve (side running from 0 to 1), from the base-3 digits of t
function sideP(t) {
  const d = [];
  let x = Math.min(Math.max(t, 0), 1);
  for (let k = 0; k < 40; k++) { x *= 3; let q = Math.floor(x); if (q > 2) q = 2; d.push(q); x -= q; }
  let zr = 0, zi = 0;
  for (let k = d.length - 1; k >= 0; k--) {
    const a = GEN[d[k]], b = GEN[d[k] + 1], dr = b[0] - a[0], di = b[1] - a[1];
    const nr = a[0] + dr * zr - di * zi, ni = a[1] + dr * zi + di * zr;
    zr = nr; zi = ni;
  }
  return [zr, zi];
}
// CORE END

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // this page's extra inks on top of the shared palette
  PRINT.gain = 'rgba(47,95,158,0.42)'; PRINT.loss = 'rgba(186,88,44,0.42)';
  PRINT.ground = '#48494b'; PRINT.lake = '#e6e5df'; PRINT.trace = 'rgba(42,111,219,0.78)';

  // page-specific canvas helpers; the rest of the plumbing is shared (src/shared/draw.js)
  function fitR(f, r) { const s = Math.min(f.w, f.h) / (2 * r); return { s, ox: f.w / 2, oy: f.h / 2 }; }
  const islandPaths = [], snakePaths = [];
  const islandPath = (n) => islandPaths[n] || (islandPaths[n] = polyPath(islandPoly(n)));
  const snakePath = (n) => snakePaths[n] || (snakePaths[n] = polyPath(flowsnake(n), false));
  const sup = (n) => String(n).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');

  // ====================== Plate 46 ======================
  const st46 = { n: 2, fill: true, gain: false, timer: 0 };
  const f46 = figure($('c46'), () => {
    const f = f46, c = f.ctx, n = st46.n;
    paper(f, PRINT.paper);
    const v = fitR(f, 1.1);
    toWorld(f, v);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const cur = islandPath(n);
    if (st46.gain && n > 0) {
      const prev = islandPath(n - 1), sd = new Path2D();
      sd.addPath(cur); sd.addPath(prev);
      c.save(); c.clip(cur); c.fillStyle = PRINT.gain; c.fill(sd, 'evenodd'); c.restore();
      c.save(); c.clip(prev); c.fillStyle = PRINT.loss; c.fill(sd, 'evenodd'); c.restore();
      c.setLineDash([5 / v.s, 4 / v.s]); c.lineWidth = 1.1 / v.s; c.strokeStyle = PRINT.muted; c.stroke(prev); c.setLineDash([]);
    }
    if (st46.fill) { c.lineWidth = 0.9 / v.s; c.strokeStyle = PRINT.ink; c.stroke(snakePath(n + 1)); }
    c.lineWidth = 2.6 / v.s; c.strokeStyle = PRINT.ink; c.stroke(cur);
  });
  const mark46 = stepButtons($('s46'), [0, 1, 2, 3, 4, 5], String, (v) => `Wrapping stage ${v}`, (n) => { stop46(); set46(n); });
  function set46(n) {
    st46.n = n; mark46(n);
    const sides = 6 * Math.pow(3, n), side = Math.pow(7, -n / 2);
    $('s46v').textContent = `stage ${n}`; $('c46s').textContent = n;
    $('c46f').textContent = st46.fill ? ` · filling stage ${n + 1}` : '';
    $('r46a').textContent = fmt(sides);
    $('r46b').textContent = n === 0 ? '1' : n % 2 === 0 ? `1/${fmt(Math.pow(7, n / 2))}` : `1/${n > 1 ? fmt(Math.pow(7, (n - 1) / 2)) : ''}√7 ≈ ${side.toPrecision(3)}`;
    $('r46c').innerHTML = `${Math.pow(3 / S7, n).toFixed(3)} <small>× the hexagon's</small>`;
    const area = shoelace(islandPoly(n)) / shoelace(HEX);
    $('r46d').innerHTML = `${area.toFixed(6)} <small>× the hexagon</small>`;
    if (n === 0) $('r46e').textContent = 'nothing yet: stage 0 is the hexagon';
    else {
      const num = Math.pow(3, n - 1), den = 14 * Math.pow(7, n - 1);
      $('r46e').textContent = `${fmt(num)}/${fmt(den)} = ${(num / den).toFixed(4)} of the hexagon`;
    }
    $('c46').setAttribute('aria-label', `Gosper island at wrapping stage ${n}, ${fmt(sides)} sides${st46.fill ? `, with the filling curve at stage ${n + 1}` : ''}`);
    f46.draw();
  }
  function stop46() { clearTimeout(st46.timer); st46.timer = 0; $('play46').textContent = 'Grow it'; }
  $('play46').addEventListener('click', () => {
    if (st46.timer) { stop46(); return; }
    $('play46').textContent = 'Stop';
    let n = 0;
    const tick = () => { set46(n); n++; st46.timer = n <= 5 ? setTimeout(tick, 1000) : 0; if (!st46.timer) stop46(); };
    tick();
  });
  $('fill46').addEventListener('change', (e) => { st46.fill = e.target.checked; set46(st46.n); });
  $('gain46').addEventListener('change', (e) => { st46.gain = e.target.checked; $('key46').hidden = !e.target.checked; f46.draw(); });

  // ====================== Tiling and pertiling ======================
  const TILE_N = 5;
  const stT = { d: 1, ex: 0, tiles: false, hover: -1, r: 1.1, rTarget: 1.1, raf: 0, provs: [], anim: null, msg: '' };
  const TONE = { center: 0.86, odd: 0.47, even: 0.66 };       // light center; dark and medium ring, as in Plate 47
  const roleL = (k) => (k === 0 ? TONE.center : k % 2 ? TONE.odd : TONE.even);
  const grey = (L) => { const v = Math.round(L * 255); return `rgb(${v},${Math.round(v * 0.99)},${Math.round(v * 0.95)})`; };
  function buildProvinces() {
    const d = stT.d, base = islandPoly(TILE_N - d), e = 1 + 0.85 * stT.ex, out = [];
    const rec = (ar, ai, br, bi, digits) => {
      if (digits.length === d) {
        const P = new Float64Array(base.length);
        for (let i = 0; i < base.length; i += 2) { const x = base[i], y = base[i + 1]; P[i] = br + ar * x - ai * y; P[i + 1] = bi + ar * y + ai * x; }
        let L = 0.86;
        if (d >= 1) { L = roleL(digits[d - 1]); if (d >= 2) L = 0.62 * L + 0.38 * roleL(digits[d - 2]); }
        out.push({ P, path: polyPath(P), digits, L, ar, ai, br, bi });     // the province is z ↦ b + a·z applied to the island
        return;
      }
      for (let k = 0; k < 7; k++) {
        const cx = CEN[k][0] * e, cy = CEN[k][1] * e;
        rec(ar * RHO[0] - ai * RHO[1], ar * RHO[1] + ai * RHO[0], br + ar * cx - ai * cy, bi + ar * cy + ai * cx, digits.concat(k));
      }
    };
    rec(1, 0, 0, 0, []);
    stT.provs = out;
  }
  const NEIGH = (() => {
    const out = [];
    for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) {
      if (!a && !b) continue;
      const x = S3 * (a * Math.cos(TILE_TH) + b * Math.cos(TILE_TH + Math.PI / 3)), y = S3 * (a * Math.sin(TILE_TH) + b * Math.sin(TILE_TH + Math.PI / 3));
      if (Math.hypot(x, y) < 5.2) out.push({ x, y, col: ((a - b) % 3 + 3) % 3 });
    }
    return out;
  })();
  const NEIGH_FILL = ['#d6dbe0', '#c5ccd4', '#b4bdc8'];
  const TOP7P = CEN.map((cc) => {
    const base = islandPoly(TILE_N - 1), P = new Float64Array(base.length);
    for (let i = 0; i < base.length; i += 2) { const x = base[i], y = base[i + 1]; P[i] = cc[0] + RHO[0] * x - RHO[1] * y; P[i + 1] = cc[1] + RHO[0] * y + RHO[1] * x; }
    return P;
  });
  const TOP7 = TOP7P.map((P) => polyPath(P));
  const easeT = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const smoothT = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  let viewT = null;
  const fT = figure($('cT'), () => drawT());
  // k converts screen pixels to the current drawing units, so lines keep their width under any zoom
  function drawNeighbours(c, k) {
    const isl = islandPath(TILE_N);
    for (const t of NEIGH) {
      c.save(); c.translate(t.x, t.y);
      c.fillStyle = NEIGH_FILL[t.col]; c.fill(isl);
      c.lineWidth = 1 / k; c.strokeStyle = '#7d8794'; c.stroke(isl);
      c.restore();
    }
  }
  function drawProvinces(c, k, provs, o) {
    provs.forEach((p, i) => { c.fillStyle = i === o.hover ? '#9db8de' : grey(p.L); c.fill(p.path); });
    c.lineWidth = (stT.d >= 3 ? 0.5 : 0.8) / k; c.strokeStyle = PRINT.ink;
    provs.forEach((p) => c.stroke(p.path));
    if (stT.ex === 0) {
      // the seven top-level provinces, so 49 or 343 still read as seven groups
      if (stT.d >= 2) { c.lineWidth = 1.7 / k; for (const t of o.top7) c.stroke(t); }
      c.lineWidth = 2.2 / k; c.stroke(o.outline);
    } else {
      // where the provinces came from
      c.setLineDash([5 / k, 4 / k]); c.lineWidth = 1.2 / k; c.strokeStyle = PRINT.muted; c.stroke(o.outline); c.setLineDash([]);
    }
  }
  function drawT() {
    const f = fT, c = f.ctx, an = stT.anim;
    paper(f, PRINT.paper);
    const v = (viewT = fitR(f, stT.r));
    c.lineJoin = 'round';
    if (!an) {
      toWorld(f, v);
      if (stT.tiles) drawNeighbours(c, v.s);
      drawProvinces(c, v.s, stT.provs, { hover: stT.hover, top7: TOP7, outline: islandPath(TILE_N) });
      if (stT.hover >= 0) { c.lineWidth = 2.2 / v.s; c.strokeStyle = PRINT.accent; c.stroke(stT.provs[stT.hover].path); }
      return;
    }
    // Expanding province T(z) = b + a·z: the view runs along z ↦ z* + a^(−t)(z − z*), a spiral about T's fixed point z*,
    // which at t = 1 is T's inverse. The province's own provinces are T applied to the island's provinces, so the last
    // frame is exactly the picture at rest.
    const e = easeT(an.t), s = smoothT(0.12, 0.8, e);
    const cm = Math.exp(-e * an.logm), cang = -e * an.arg, cr = cm * Math.cos(cang), ci = cm * Math.sin(cang), k = v.s * cm;
    const applyM = () => { toWorld(f, v); c.translate(an.z[0], an.z[1]); c.transform(cr, ci, -ci, cr, 0, 0); c.translate(-an.z[0], -an.z[1]); };
    if (stT.tiles) {
      c.save(); toWorld(f, v); c.globalAlpha = e; drawNeighbours(c, v.s); c.restore();
      c.save(); applyM(); c.globalAlpha = 1 - e; drawNeighbours(c, k); c.restore();
    }
    c.save(); applyM();
    c.globalAlpha = 1 - e;                                                      // the rest fly outward and fade
    drawProvinces(c, k, an.others, { hover: -1, top7: TOP7, outline: islandPath(TILE_N) });
    c.globalAlpha = 1 - s; c.fillStyle = grey(an.L); c.fill(an.path);           // the chosen province...
    c.globalAlpha = s;                                                          // ...shows its own provinces as it grows
    drawProvinces(c, k, an.subs, { hover: -1, top7: an.top7, outline: an.outline });
    c.globalAlpha = 1 - s; c.lineWidth = 2.6 / k; c.strokeStyle = PRINT.accent; c.stroke(an.path);
    c.restore();
  }
  const growText = (d) => ['', '√7 ≈ 2.65 times', '7 times', '7√7 ≈ 18.5 times'][d];
  function expandT(i) {
    if (stT.anim || i < 0 || stT.d === 0) return;
    const p = stT.provs[i], A = [p.ar, p.ai], B = [p.br, p.bi];
    const T = (P) => { const Q = new Float64Array(P.length); for (let j = 0; j < P.length; j += 2) { const x = P[j], y = P[j + 1]; Q[j] = B[0] + A[0] * x - A[1] * y; Q[j + 1] = B[1] + A[0] * y + A[1] * x; } return Q; };
    const dr = 1 - A[0], di = -A[1], dd = dr * dr + di * di;
    stT.hover = -1;
    stT.anim = {
      t: 0, t0: performance.now(), dur: 1700,
      z: [(B[0] * dr + B[1] * di) / dd, (B[1] * dr - B[0] * di) / dd],          // fixed point b / (1 − a)
      logm: Math.log(Math.hypot(A[0], A[1])), arg: Math.atan2(A[1], A[0]), path: p.path, L: p.L,
      others: stT.provs.filter((_, j) => j !== i),
      subs: stT.provs.map((q) => ({ path: polyPath(T(q.P)), L: q.L })),
      top7: TOP7P.map((P) => polyPath(T(P))), outline: polyPath(T(islandPoly(TILE_N))),
    };
    const d = stT.d;
    stT.msg = `<b>${p.digits.map(provName).join(' › ')}</b> grew ${growText(d)} and turned back ${(PHI * DEG * d).toFixed(1)}°. It fills the island exactly, with ${fmt(Math.pow(7, d))} provinces of its own: the picture you started with.`;
    $('infoT').innerHTML = stT.msg;
    if (reduceMotion) { stT.anim = null; drawT(); return; }
    requestAnimationFrame(stepExpand);
  }
  function stepExpand(now) {
    const an = stT.anim;
    if (!an) return;
    an.t = Math.min(1, (now - an.t0) / an.dur);
    drawT();
    if (an.t < 1) requestAnimationFrame(stepExpand); else { stT.anim = null; drawT(); }
  }
  const markT = stepButtons($('dT'), [0, 1, 2, 3], (d) => (d === 0 ? 'Whole' : fmt(Math.pow(7, d))), (d) => (d === 0 ? 'The whole island' : `${fmt(Math.pow(7, d))} provinces`), (d) => setDepthT(d));
  function setDepthT(d) {
    if (stT.anim) return;
    stT.d = d; stT.hover = -1; stT.msg = ''; markT(d);
    $('dTv').textContent = d === 0 ? 'the whole island' : `${fmt(Math.pow(7, d))} provinces`;
    $('cTn').textContent = d === 0 ? 'the whole island' : `${fmt(Math.pow(7, d))} provinces`;
    $('exT').disabled = d === 0;
    $('cT').style.cursor = d === 0 ? 'default' : 'pointer';
    buildProvinces(); infoT(); drawT();
  }
  const scaleText = (d) => ['1', '1/√7 ≈ 0.378', '1/7 ≈ 0.143', '1/(7√7) ≈ 0.054'][d];
  const provName = (k) => (k === 0 ? 'center' : `ring ${k}`);
  function infoT() {
    const el = $('infoT');
    if (stT.hover < 0) {
      if (stT.msg) { el.innerHTML = stT.msg; return; }
      el.textContent = stT.d === 0
        ? 'One island. Choose 7, 49 or 343 to divide it.'
        : `Click any of the ${fmt(Math.pow(7, stT.d))} provinces (or use the arrow keys and Enter) to expand it to the whole island.`;
      return;
    }
    const p = stT.provs[stT.hover], d = stT.d;
    el.innerHTML = `<b>${p.digits.map(provName).join(' › ')}</b>: the whole island at ${scaleText(d)} the size, turned −${(PHI * DEG * d).toFixed(1)}°. Click to expand it.`;
  }
  function animT() {
    const k = reduceMotion ? 1 : 0.2;
    stT.r += (stT.rTarget - stT.r) * k;
    if (Math.abs(stT.rTarget - stT.r) < 0.002) stT.r = stT.rTarget;
    if (!stT.anim) drawT();
    stT.raf = stT.r === stT.rTarget ? 0 : requestAnimationFrame(animT);
  }
  $('tileT').addEventListener('change', (e) => {
    stT.tiles = e.target.checked; stT.rTarget = stT.tiles ? 2.9 : 1.1;
    if (!stT.raf) stT.raf = requestAnimationFrame(animT);
  });
  $('exT').addEventListener('input', (e) => { if (stT.anim) return; stT.ex = +e.target.value / 100; $('exTv').textContent = `${e.target.value}%`; buildProvinces(); drawT(); });
  function insidePoly(P, x, y) {
    let c = false;
    const m = P.length / 2;
    for (let i = 0, j = m - 1; i < m; j = i++) {
      const xi = P[2 * i], yi = P[2 * i + 1], xj = P[2 * j], yj = P[2 * j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function hitT(e) {
    const r = $('cT').getBoundingClientRect(), x = (e.clientX - r.left - viewT.ox) / viewT.s, y = (viewT.oy - (e.clientY - r.top)) / viewT.s;
    for (let i = 0; i < stT.provs.length; i++) if (insidePoly(stT.provs[i].P, x, y)) return i;
    return -1;
  }
  function hoverT(e) {
    if (!viewT || stT.d === 0 || stT.anim) return;
    const hit = hitT(e);
    if (hit !== stT.hover) { stT.hover = hit; if (hit >= 0) stT.msg = ''; infoT(); drawT(); }
  }
  const cT = $('cT');
  let downT = null;
  cT.addEventListener('pointermove', hoverT);
  cT.addEventListener('pointerdown', (e) => { downT = [e.clientX, e.clientY]; hoverT(e); });
  cT.addEventListener('pointerup', (e) => {
    if (!downT || !viewT || stT.d === 0) return;
    const moved = Math.hypot(e.clientX - downT[0], e.clientY - downT[1]);
    downT = null;
    if (moved <= 8) expandT(hitT(e));
  });
  cT.addEventListener('pointerleave', () => { if (stT.hover >= 0 && !stT.anim) { stT.hover = -1; infoT(); drawT(); } });
  cT.addEventListener('keydown', (e) => {
    if (stT.d === 0 || stT.anim) return;
    const n = stT.provs.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') stT.hover = (stT.hover + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') stT.hover = stT.hover <= 0 ? n - 1 : stT.hover - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expandT(stT.hover >= 0 ? stT.hover : 0); return; }
    else return;
    e.preventDefault(); stT.msg = ''; infoT(); drawT();
  });

  // ====================== Loxodromic corner ======================
  // Slider u puts the point at side parameter 3^−u from the corner. Near the corner the coastline satisfies
  // P(t/3) = w·P(t) with w = e^{−i·19.1°}/√7 exactly, so the chord is w^⌊u⌋ times its value at the fractional part.
  const V0 = [HEX[0], HEX[1]];
  const SIDES = {
    out: { a: [HEX[0], HEX[1]], b: [HEX[2], HEX[3]] },        // the side leaving the corner (counterclockwise)
    in: { a: [HEX[10], HEX[11]], b: [HEX[0], HEX[1]] },       // the side arriving at the corner
  };
  function chordBase(side, f) {
    // chord from the corner, in the side's own frame, for 0 ≤ f < 1 (no powers of w applied)
    if (side === 'out') return sideP(Math.pow(3, -f));
    const q = sideP(1 - Math.pow(3, -f));
    return [q[0] - 1, q[1]];
  }
  function chordAt(side, u) {
    const k = Math.floor(u), f = u - k, b = chordBase(side, f), S = SIDES[side];
    const mag = Math.pow(7, -k / 2), ang = -PHI * k;
    const cr = Math.cos(ang) * mag, ci = Math.sin(ang) * mag;
    const lr = b[0] * cr - b[1] * ci, li = b[0] * ci + b[1] * cr;           // in the side frame
    const er = S.b[0] - S.a[0], ei = S.b[1] - S.a[1];                        // side direction (length 1)
    const wx = lr * er - li * ei, wy = lr * ei + li * er;                    // world, relative to the corner
    const start = side === 'out' ? 0 : Math.PI;                              // direction of the chord at u = 0, side frame
    let rel = Math.atan2(b[1], b[0]) - start;
    rel -= 2 * Math.PI * Math.round(rel / (2 * Math.PI));
    return { x: wx, y: wy, d: Math.hypot(wx, wy), turned: (rel + ang) * DEG };
  }
  const LOX_RMAX = (() => {
    let m = 0;
    for (const side of ['out', 'in']) for (let i = 0; i <= 600; i++) { const f = i / 600, b = chordBase(side, f); m = Math.max(m, Math.pow(7, f / 2) * Math.hypot(b[0], b[1])); }
    return m * 1.005;
  })();
  const stL = { u: 0, target: 0, side: 'out', raf: 0, last: 0, play: false };
  const LOX_A0 = 30 / DEG;               // so the leaving side starts out pointing right on screen
  const LOX_MAXRATE = 1.5;               // the view follows the slider at most 1.5 steps a second (about 29° of turn)
  const LOX_PLAYRATE = 0.7;              // Play: 0.7 steps a second
  // a pure zoom about the corner: no camera rotation, so everything on screen moves straight outward
  function loxView(f) {
    const zoom = Math.pow(7, stL.u / 2), rho = Math.min(f.w, f.h) * 0.42;
    return { s: (rho / LOX_RMAX) * zoom, a: LOX_A0, ox: f.w * 0.5, oy: f.h * 0.5, zoom, rho };
  }
  // The island's coastline near the corner, refined only on screen and only down to about a pixel; returns screen points.
  // Points off screen are clamped to a band just outside the canvas: at deep zoom the far corners of the island sit
  // ~10¹⁰ px away, more than a GPU rasterizer's float precision can take (that caused flicker). Every clamped edge
  // lies wholly beyond one side of the screen, so clamping cannot change which pixels on screen are land.
  function adaptiveLox(v, f) {
    const ca = Math.cos(v.a) * v.s, sa = Math.sin(v.a) * v.s, out = [];
    const X = (x, y) => v.ox + ca * x - sa * y, Y = (x, y) => v.oy - (sa * x + ca * y);
    const W = f.w, H = f.h, pxs = v.s * f.dpr, M = 256;
    const cx = (x) => (x < -M ? -M : x > W + M ? W + M : x), cy = (y) => (y < -M ? -M : y > H + M ? H + M : y);
    const rec = (ax, ay, bx, by, lvl) => {
      const len = Math.hypot(bx - ax, by - ay), mx = (ax + bx) / 2, my = (ay + by) / 2, r = len * 0.52 * v.s + 2;
      const sx = X(mx, my), sy = Y(mx, my);
      if (sx + r < 0 || sx - r > W || sy + r < 0 || sy - r > H || len * pxs < 0.9 || lvl > 46) { out.push(cx(X(ax, ay)), cy(Y(ax, ay))); return; }
      const dx = bx - ax, dy = by - ay;
      for (let g = 0; g < 3; g++) {
        const p = GEN[g], q = GEN[g + 1];
        rec(ax + dx * p[0] - dy * p[1], ay + dx * p[1] + dy * p[0], ax + dx * q[0] - dy * q[1], ay + dx * q[1] + dy * q[0], lvl + 1);
      }
    };
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      rec(HEX[2 * i] - V0[0], HEX[2 * i + 1] - V0[1], HEX[2 * j] - V0[0], HEX[2 * j + 1] - V0[1], 0);
    }
    return out;
  }
  const fL = figure($('cL'), () => {
    const f = fL, c = f.ctx, v = loxView(f), ch = chordAt(stL.side, stL.u);
    paper(f, PRINT.paper);
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    const pts = adaptiveLox(v, f);
    c.fillStyle = PRINT.ink; c.fill(polyPath(pts));
    const ca = Math.cos(v.a) * v.s, sa = Math.sin(v.a) * v.s;
    const px = v.ox + ca * ch.x - sa * ch.y, py = v.oy - (sa * ch.x + ca * ch.y);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // where the chord started, and a spiral arc that adds up its turning (one more loop of radius per full turn)
    const th0 = (stL.side === 'out' ? 0 : -120) / DEG;                 // screen angle at the start (y down)
    const tot = -ch.turned / DEG;                                        // clockwise turn so far, radians
    c.strokeStyle = PRINT.paper; c.lineWidth = 6;
    c.beginPath(); c.moveTo(v.ox + Math.cos(th0) * 14, v.oy + Math.sin(th0) * 14); c.lineTo(v.ox + Math.cos(th0) * 52, v.oy + Math.sin(th0) * 52); c.stroke();
    c.strokeStyle = '#8f8e88'; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]);
    if (Math.abs(tot) > 0.002) {
      const arc = new Path2D(), nSeg = Math.max(8, Math.ceil(Math.abs(tot) * 24));
      for (let i = 0; i <= nSeg; i++) { const a = (tot * i) / nSeg, r = 30 + 9 * (Math.abs(a) / (2 * Math.PI)); const x = v.ox + Math.cos(th0 + a) * r, y = v.oy + Math.sin(th0 + a) * r; if (i) arc.lineTo(x, y); else arc.moveTo(x, y); }
      c.strokeStyle = PRINT.paper; c.lineWidth = 6; c.stroke(arc);
      c.strokeStyle = '#d24d1f'; c.lineWidth = 2.2; c.stroke(arc);
    }
    c.strokeStyle = PRINT.paper; c.lineWidth = 5; c.beginPath(); c.moveTo(v.ox, v.oy); c.lineTo(px, py); c.stroke();
    c.strokeStyle = PRINT.accent; c.lineWidth = 2; c.stroke();
    c.fillStyle = PRINT.accent; c.strokeStyle = PRINT.paper; c.lineWidth = 2;
    c.beginPath(); c.arc(px, py, 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#d24d1f'; c.beginPath(); c.arc(v.ox, v.oy, 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
    // zoom, on a paper tab
    const zs = v.zoom < 1000 ? `zoom ×${v.zoom < 10 ? v.zoom.toFixed(2) : v.zoom.toFixed(0)}` : (() => { const e = Math.floor(Math.log10(v.zoom)); return `zoom ×${(v.zoom / Math.pow(10, e)).toFixed(1)}·10${sup(e)}`; })();
    c.font = '500 12px "IBM Plex Mono", ui-monospace, monospace';
    const tw = c.measureText('zoom ×0.0·10⁰⁰').width + 16;
    c.fillStyle = PRINT.paper; c.fillRect(f.w - tw - 8, 8, tw, 24);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.strokeRect(f.w - tw - 7.5, 8.5, tw - 1, 23);
    c.fillStyle = PRINT.muted; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText(zs, f.w - 16, 20.5);
    c.textAlign = 'left';
  });
  // the turning plot: the curve is drawn for the chosen side; only the marker moves
  const LP = { W: 360, H: 180, ml: 40, mr: 10, mt: 10, mb: 32, y0: 30, y1: -400, umax: 20 };
  const lpX = (u) => LP.ml + (u / LP.umax) * (LP.W - LP.ml - LP.mr), lpY = (a) => LP.mt + ((LP.y0 - a) / (LP.y0 - LP.y1)) * (LP.H - LP.mt - LP.mb);
  function buildLoxPlot() {
    let s = `<rect x="${LP.ml}" y="${lpY(0)}" width="${LP.W - LP.ml - LP.mr}" height="${lpY(-30) - lpY(0)}" fill="rgba(47,95,158,0.13)"/>`;
    s += `<text x="${LP.W - LP.mr - 4}" y="${lpY(-30) - 4}" text-anchor="end">band: Koch's corner, Plate 42</text>`;
    for (const a of [0, -90, -180, -270, -360]) s += `<line x1="${LP.ml}" x2="${LP.W - LP.mr}" y1="${lpY(a)}" y2="${lpY(a)}" stroke="#c9c8c2"/><text x="${LP.ml - 5}" y="${lpY(a) + 3.5}" text-anchor="end">${a === 0 ? '0' : '−' + -a}°</text>`;
    const ticks = [[0, '×1'], [1, '×10²'], [2, '×10⁴'], [3, '×10⁶'], [4, '×10⁸']];
    for (const [k, t] of ticks) { const x = lpX((k * 2 * Math.LN10) / (0.5 * Math.log(7))); s +=`<line x1="${x}" x2="${x}" y1="${LP.mt}" y2="${LP.H - LP.mb}" stroke="#c9c8c2"/><text x="${x}" y="${LP.H - LP.mb + 13}" text-anchor="middle">${t}</text>`; }
    s += `<text x="${(LP.ml + LP.W - LP.mr) / 2}" y="${LP.H - 3}" text-anchor="middle">how many times closer to the corner</text>`;
    let p = '';
    for (let i = 0; i <= 1000; i++) { const u = (i / 1000) * LP.umax, a = chordAt(stL.side, u).turned; p += (i ? 'L' : 'M') + lpX(u).toFixed(2) + ' ' + lpY(a).toFixed(2); }
    s += `<path d="${p}" fill="none" stroke="#151515" stroke-width="1.3" stroke-linejoin="round"/>`;
    s += `<line id="lpLine" y1="${LP.mt}" y2="${LP.H - LP.mb}" stroke="#2f5f9e"/><circle id="lpDot" r="4" fill="#2f5f9e" stroke="#ecebe6" stroke-width="2"/>`;
    $('loxPlot').innerHTML = s;
  }
  function renderL() {
    const ch = chordAt(stL.side, stL.u), x = lpX(stL.u).toFixed(2);
    $('uLv').textContent = `distance ${ch.d >= 0.01 ? ch.d.toFixed(3) : ch.d.toExponential(2)}`;
    const turns = Math.abs(ch.turned) / 360;
    $('aLv').textContent = `${ch.turned < -0.05 ? '−' : ''}${Math.abs(ch.turned).toFixed(1)}° · ${turns.toFixed(2)} turn${turns >= 0.995 && turns < 1.005 ? '' : 's'}`;
    const ln = $('lpLine'), dot = $('lpDot');
    ln.setAttribute('x1', x); ln.setAttribute('x2', x);
    dot.setAttribute('cx', x); dot.setAttribute('cy', lpY(ch.turned).toFixed(2));
    fL.draw();
  }
  // The view eases toward the slider but never faster than LOX_MAXRATE, so a quick drag cannot whip it round.
  function stepL(now) {
    const dt = Math.min(0.05, (now - stL.last) / 1000 || 0.016);
    stL.last = now;
    if (stL.play) {
      stL.target = Math.min(20, stL.target + LOX_PLAYRATE * dt);
      $('uL').value = String(Math.round(stL.target * 100));
      if (stL.target >= 20) stopPlayL();
    }
    const gap = stL.target - stL.u;
    const move = Math.sign(gap) * Math.min(Math.abs(gap) * (1 - Math.exp(-dt / 0.12)), LOX_MAXRATE * dt);
    stL.u = Math.abs(gap) < 0.0005 ? stL.target : stL.u + move;
    renderL();
    stL.raf = stL.u === stL.target && !stL.play ? 0 : requestAnimationFrame(stepL);
  }
  function kickL() { if (!stL.raf) { stL.last = performance.now(); stL.raf = requestAnimationFrame(stepL); } }
  function setL(u) {
    stL.target = u;
    if (reduceMotion) { stL.u = u; renderL(); return; }
    kickL();
  }
  function stopPlayL() { stL.play = false; $('playL').textContent = 'Play slowly'; }
  $('playL').addEventListener('click', () => {
    if (stL.play) { stopPlayL(); return; }
    if (stL.target >= 19.99) { stL.u = stL.target = 0; $('uL').value = '0'; renderL(); }   // start over from the top
    if (reduceMotion) { setL(20); $('uL').value = '2000'; return; }
    stL.play = true; $('playL').textContent = 'Pause'; kickL();
  });
  $('uL').addEventListener('input', (e) => { stopPlayL(); setL(+e.target.value / 100); });
  const markSide = stepButtons($('sideL'), ['out', 'in'], (s) => (s === 'out' ? 'Counterclockwise' : 'Clockwise'), (s) => `Point approaches the corner ${s === 'out' ? 'counterclockwise, along the side leaving it' : 'clockwise, along the side arriving at it'}`, (s) => { stL.side = s; markSide(s); buildLoxPlot(); renderL(); });

  // ====================== Plate 47 ======================
  const ROLE = { A: [2, 1, 0, 1, 2, 1, 2], B: [2, 1, 2, 1, 0, 1, 2] };   // 0 center (thin), 1 medium, 2 thick
  const WID = [0.16, 0.34, 0.52];                                         // × the step length
  const st47 = { m: 5, mode: 'prov', wrap: false, view: null, userView: false, trace: -1, traceRaf: 0 };
  let hatch = null, hatchKey = '';
  function hatchPaths() {
    const key = `${st47.m}|${st47.mode}`;
    if (key === hatchKey) return hatch;
    const m = st47.m, N = Math.pow(7, m), P = flowsnake(m), L = S3 * Math.pow(7, -m / 2);
    const cls = new Uint8Array(N);
    const B1 = Math.pow(7, m - 1), B2 = Math.pow(7, Math.max(0, m - 2));
    for (let i = 0; i < N; i++) {
      const d1 = Math.floor(i / B1), t1 = KIDS.A[d1], r1 = ROLE.A[d1];
      const d2 = Math.floor((i % B1) / B2), r2 = ROLE[t1][d2];
      cls[i] = st47.mode === 'prov' ? r1 : st47.mode === 'sub' ? r2 : st47.mode === 'both' ? r1 * 3 + r2 : 1;
    }
    const widthOf = (k) => (st47.mode === 'both' ? (WID[Math.floor(k / 3)] + WID[k % 3]) / 2 : WID[k]) * L;
    const groups = new Map();
    for (let i = 0; i < N; i++) {
      const k = cls[i];
      let g = groups.get(k);
      if (!g) { g = { path: new Path2D(), w: widthOf(k), open: -2 }; groups.set(k, g); }
      if (g.open !== i) g.path.moveTo(P[2 * i], P[2 * i + 1]);
      g.path.lineTo(P[2 * i + 2], P[2 * i + 3]);
      g.open = i + 1;
    }
    hatchKey = key; hatch = { groups: [...groups.values()], n: N, L };
    return hatch;
  }
  const w47 = $('w47');
  const f47 = figure($('c47'), () => draw47());
  function fit47() { st47.view = fitR(f47, 1.12); st47.view.fit = st47.view.s; st47.userView = false; touch47(); }
  function drawBase47() {
    if (!st47.view || !st47.userView) fit47();
    const f = f47, c = f.ctx, v = st47.view, h = hatchPaths();
    paper(f, PRINT.ground);
    toWorld(f, v);
    c.fillStyle = PRINT.lake; c.fill(islandPath(Math.min(6, st47.m)));
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = PRINT.ink;
    for (const g of h.groups) { c.lineWidth = Math.max(g.w, 0.35 / v.s); c.stroke(g.path); }
    if (st47.wrap) { c.lineWidth = 1.8 / v.s; c.strokeStyle = '#d24d1f'; c.stroke(islandPath(st47.m - 1)); }
    $('c47s').textContent = st47.m; $('c47n').textContent = fmt(h.n);
  }
  function drawTrace47() {
    if (st47.trace < 0) return;
    const f = f47, c = f.ctx, v = st47.view, P = flowsnake(st47.m), k = Math.min(st47.trace, Math.pow(7, st47.m));
    toWorld(f, v);
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = PRINT.trace; c.lineWidth = Math.max(0.5 * S3 * Math.pow(7, -st47.m / 2), 1.6 / v.s);
    c.stroke(polyPath(P, false, k + 1));
    const px = P[2 * k], py = P[2 * k + 1];
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    c.fillStyle = PRINT.trace; c.strokeStyle = '#ffffff'; c.lineWidth = 2;
    c.beginPath(); c.arc(v.ox + px * v.s, v.oy - py * v.s, 5, 0, Math.PI * 2); c.fill(); c.stroke();
  }
  function draw47() {
    drawBase47();
    snap.width = f47.canvas.width; snap.height = f47.canvas.height; snap.getContext('2d').drawImage(f47.canvas, 0, 0);
    snapView = { s: st47.view.s, ox: st47.view.ox, oy: st47.view.oy };
    drawTrace47();
  }
  const snap = document.createElement('canvas');
  let snapView = null, raf47 = 0, full47 = 0;
  function quick47() {
    const v = st47.view, k = v.s / snapView.s, c = f47.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PRINT.ground; c.fillRect(0, 0, f47.canvas.width, f47.canvas.height);
    c.drawImage(snap, (v.ox - snapView.ox * k) * f47.dpr, (v.oy - snapView.oy * k) * f47.dpr, snap.width * k, snap.height * k);
    drawTrace47();
  }
  function schedule47() { if (!raf47) raf47 = requestAnimationFrame(() => { raf47 = 0; draw47(); }); }
  function view47() {
    if (!snapView) { schedule47(); return; }
    if (!raf47) raf47 = requestAnimationFrame(() => { raf47 = 0; quick47(); });
    clearTimeout(full47); full47 = setTimeout(schedule47, 160);
  }
  function touch47() { w47.style.touchAction = st47.view && st47.view.s > st47.view.fit * 1.02 ? 'none' : 'pan-y'; }
  function zoom47(px, py, k) {
    const v = st47.view, ns = Math.min(v.fit * 300, Math.max(v.fit * 0.8, v.s * k));
    const wx = (px - v.ox) / v.s, wy = (v.oy - py) / v.s;
    v.s = ns; v.ox = px - wx * ns; v.oy = py + wy * ns;
    st47.userView = true; touch47(); view47();
  }
  function pan47(dx, dy) { st47.view.ox += dx; st47.view.oy += dy; st47.userView = true; view47(); }
  const mark47 = stepButtons($('s47'), [3, 4, 5, 6], String, (m) => `Filling stage ${m}`, (m) => {
    stopTrace(); st47.m = m; mark47(m);
    $('s47v').textContent = `stage ${m} · ${fmt(Math.pow(7, m))} steps`;
    $('info47').textContent = 'The curve fills one province completely before it crosses into the next.';
    schedule47();
  });
  const HMODES = ['prov', 'sub', 'both', 'even'];
  const HNAMES = { prov: '7 provinces (the plate)', sub: '49 sub-provinces', both: 'Both levels', even: 'Even widths' };
  const markH = stepButtons($('h47'), HMODES, (k) => HNAMES[k], (k) => `Line widths by ${HNAMES[k]}`, (k) => { st47.mode = k; markH(k); schedule47(); });
  $('wrap47').addEventListener('change', (e) => { st47.wrap = e.target.checked; schedule47(); });
  function stopTrace(keep) {
    cancelAnimationFrame(st47.traceRaf); st47.traceRaf = 0;
    if (!keep) st47.trace = -1;
    $('trace47').textContent = 'Trace the curve';
  }
  $('trace47').addEventListener('click', () => {
    if (st47.traceRaf) { stopTrace(); $('info47').textContent = 'The curve fills one province completely before it crosses into the next.'; schedule47(); return; }
    const N = Math.pow(7, st47.m), B1 = N / 7, dur = reduceMotion ? 1 : 9000, t0 = performance.now();
    $('trace47').textContent = 'Stop';
    if (!snapView) draw47();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      st47.trace = Math.round(p * N);
      const prov = Math.min(7, Math.floor(st47.trace / B1) + 1);
      $('info47').innerHTML = p < 1
        ? `<b>Province ${prov} of 7</b> · step ${fmt(st47.trace)} of ${fmt(N)}`
        : `<b>Done:</b> one unbroken line through all ${fmt(N)} steps, province after province, from one corner of the hexagon to another.`;
      quick47();
      if (p < 1) st47.traceRaf = requestAnimationFrame(tick); else stopTrace(true);
    };
    st47.traceRaf = requestAnimationFrame(tick);
  });
  const center47 = () => [f47.w / 2, f47.h / 2];
  $('zin47').addEventListener('click', () => zoom47(...center47(), 1.6));
  $('zout47').addEventListener('click', () => zoom47(...center47(), 1 / 1.6));
  $('zfit47').addEventListener('click', () => { st47.userView = false; schedule47(); });
  const pts = new Map();
  let pinch = null;
  const local = (e) => { const r = w47.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  w47.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.view-tools')) return;
    pts.set(e.pointerId, local(e));
    try { w47.setPointerCapture(e.pointerId); } catch (_) {}
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; }
    w47.classList.add('dragging');
  });
  w47.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), cur = local(e);
    pts.set(e.pointerId, cur);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      pan47(m[0] - pinch.m[0], m[1] - pinch.m[1]);
      if (pinch.d > 0) zoom47(m[0], m[1], d / pinch.d);
      pinch = { d, m };
    } else if (pts.size === 1 && (e.pointerType !== 'touch' || st47.view.s > st47.view.fit * 1.02)) pan47(cur[0] - prev[0], cur[1] - prev[1]);
  });
  const end47 = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) w47.classList.remove('dragging'); };
  w47.addEventListener('pointerup', end47); w47.addEventListener('pointercancel', end47);
  w47.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const [x, y] = local(e); zoom47(x, y, Math.exp(-e.deltaY * 0.0045)); }, { passive: false });
  w47.addEventListener('dblclick', (e) => { if (e.target.closest('.view-tools')) return; const [x, y] = local(e); zoom47(x, y, e.shiftKey ? 0.5 : 2); });

  // ---------- boot ----------
  set46(2);
  setDepthT(1);
  markSide('out'); buildLoxPlot(); renderL();
  mark47(5); markH('prov');
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fL.draw());
})();
