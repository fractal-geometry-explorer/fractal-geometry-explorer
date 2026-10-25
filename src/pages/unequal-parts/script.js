// CORE START
const DEG = 180 / Math.PI, S3 = Math.sqrt(3);
// A generator: points from (0,0) to (1,0) and, for each piece, an orientation code
// (0 as drawn, 1 flipped across its chord, 2 run backwards, 3 both).
function makeGen(points, codes) {
  const rs = [];
  for (let k = 0; k + 1 < points.length; k++) rs.push(Math.hypot(points[k + 1][0] - points[k][0], points[k + 1][1] - points[k][1]));
  let B = 0;            // the limit of a piece stays within B × (its length) of the piece's midpoint
  for (let k = 0; k + 1 < points.length; k++) B = Math.max(B, Math.hypot((points[k][0] + points[k + 1][0]) / 2 - 0.5, (points[k][1] + points[k + 1][1]) / 2) / (1 - rs[k]));
  return { pts: points, mir: points.map(([x, y]) => [x, -y]), codes, rs, B, D: dimension(rs) };
}
// Plate 56: Koch's shape with flat sides a and bump sides 1 − 2a (a = 1/4 in the plate)
function gen56(a) { const b = 1 - 2 * a; return makeGen([[0, 0], [a, 0], [0.5, (b * S3) / 2], [1 - a, 0], [1, 0]], [0, 0, 0, 0]); }
// Plate 57, top: two legs meeting at apex A, both copies flipped to the inside (as in Pólya's curve)
function apexFor(gammaDeg, p) {          // the point above x = p from which [0, 1] is seen at angle γ ≥ 90°
  const g = gammaDeg / DEG, ang = (y) => Math.acos((-p * (1 - p) + y * y) / (Math.hypot(p, y) * Math.hypot(1 - p, y)));
  let lo = 1e-6, hi = Math.sqrt(p * (1 - p));
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (ang(mid) > g) lo = mid; else hi = mid; }
  return [p, (lo + hi) / 2];
}
function gen57(gammaDeg, p) { const A = apexFor(gammaDeg, p); return makeGen([[0, 0], A, [1, 0]], [1, 1]); }
// Plate 57, bottom: four flats r and two 60° bumps of side b, one up and one down; 4r + 2b = 1
function genB(b) {
  const r = (1 - 2 * b) / 4, h = (b * S3) / 2;
  return makeGen([[0, 0], [r, 0], [r + b / 2, h], [r + b, 0], [2 * r + b, 0], [3 * r + b, 0], [3 * r + 1.5 * b, -h], [3 * r + 2 * b, 0], [1, 0]], [0, 0, 0, 0, 0, 0, 0, 0]);
}
// count the pieces at size ε (each piece is split until it is shorter than ε), and the stages each needed
function countPieces(rs, eps, cap = 600000, parity = -1) {
  let n = 0, lo = Infinity, hi = 0, len = 0, over = false;
  const rec = (L, lvl) => {
    if (over) return;
    if (L < eps && (parity < 0 || lvl % 2 === parity)) { n++; len += L; if (lvl < lo) lo = lvl; if (lvl > hi) hi = lvl; if (n > cap) over = true; return; }
    for (const r of rs) rec(L * r, lvl + 1);
  };
  rec(1, 0);
  return { n, lo, hi, len, over };
}
// CORE END

(() => {
  const RAMP = ['#2f5f9e', '#3f8f8c', '#8a9a3c', '#d08a2c', '#c2452d'];
  const rampRGB = (t) => {
    t = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
    const i = Math.min(RAMP.length - 2, Math.floor(t)), f = t - i, a = RAMP[i], b = RAMP[i + 1];
    const c = (s, k) => parseInt(s.slice(1 + 2 * k, 3 + 2 * k), 16);
    return [0, 1, 2].map((k) => c(a, k) + (c(b, k) - c(a, k)) * f);
  };
  const PAPER_RGB = [236, 235, 230];
  const mixRGB = (a, b, w) => `rgb(${a.map((x, k) => Math.round(x * (1 - w) + b[k] * w)).join(',')})`;
  const rampAt = (t) => mixRGB(rampRGB(t), [0, 0, 0], 0);

  // ---------- shared plumbing ----------
  // The curve in screen coordinates. A piece is split while it is at least ε long (the plate's rule), at least
  // pxMin pixels long, and on screen. Points are not clamped: a long piece or a stage's whole triangle can cross the
  // screen with its ends far outside, and moving those ends would move what is drawn (zoom is capped at 300×, so
  // coordinates stay small enough for the canvas). depth[i] is the stage of the piece ending at point i + 1 (−1 if it was off screen).
  // If `areas` is given, every split also records the region between the piece's chord and its new path:
  // the land that stage adds (a bulge to the left of travel, since the land lies to the right) or carves away.
  function buildCurve(G, eps, v, f, pxMin, parity = -1, areas = null) {
    const out = [], dep = [], s = v.s, W = f.w, H = f.h;
    const X = (x) => v.ox + x * s, Y = (y) => v.oy - y * s;
    const clx = (x) => x, cly = (y) => y;
    const emit = (ax, ay, bx, by, m, rev, lvl) => {
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), lp = len * s;
      const sx = X((ax + bx) / 2), sy = Y((ay + by) / 2), rr = lp * G.B + 2;
      const off = sx + rr < 0 || sx - rr > W || sy + rr < 0 || sy - rr > H;
      if ((len < eps && (parity < 0 || lvl % 2 === parity)) || lp < pxMin || off || lvl > 60) {
        if (rev) out.push(clx(X(ax)), cly(Y(ay))); else out.push(clx(X(bx)), cly(Y(by)));
        dep.push(off ? -1 : lvl);
        return;
      }
      const g = m ? G.mir : G.pts, N = g.length - 1, P = new Array(N + 1);
      for (let k = 0; k <= N; k++) P[k] = [ax + dx * g[k][0] - dy * g[k][1], ay + dx * g[k][1] + dy * g[k][0]];
      if (areas) {
        let S = 0;
        for (let k = 0; k <= N; k++) { const q = P[k], r = P[(k + 1) % (N + 1)]; S += q[0] * r[1] - r[0] * q[1]; }
        const scr = new Array(2 * (N + 1));
        for (let k = 0; k <= N; k++) { scr[2 * k] = clx(X(P[k][0])); scr[2 * k + 1] = cly(Y(P[k][1])); }
        areas.push({ stage: lvl + 1, add: rev ? S > 0 : S < 0, pts: scr });
      }
      if (!rev) {
        for (let k = 0; k < N; k++) { const c = G.codes[k], cm = m ^ (c & 1); if (c >= 2) emit(P[k + 1][0], P[k + 1][1], P[k][0], P[k][1], cm, true, lvl + 1); else emit(P[k][0], P[k][1], P[k + 1][0], P[k + 1][1], cm, false, lvl + 1); }
      } else {
        for (let k = N - 1; k >= 0; k--) { const c = G.codes[k], cm = m ^ (c & 1); if (c >= 2) emit(P[k + 1][0], P[k + 1][1], P[k][0], P[k][1], cm, false, lvl + 1); else emit(P[k][0], P[k][1], P[k + 1][0], P[k + 1][1], cm, true, lvl + 1); }
      }
    };
    out.push(clx(X(0)), cly(Y(0)));
    emit(0, 0, 1, 0, 0, false, 0);
    return { pts: out, dep };
  }
  // the curve's bounding box in world units (from a modest stage)
  function worldBox(G) {
    const O = 1000, r = buildCurve(G, 0.004, { s: 1, ox: O, oy: O }, { w: 2 * O, h: 2 * O }, 0).pts;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < r.length; i += 2) { const x = r[i] - O, y = O - r[i + 1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, x1, y0, y1 };
  }
  function genSVG(svg, G, flipNote) {
    const xs = G.pts.map((p) => p[0]), ys = G.pts.map((p) => -p[1]);
    const x0 = -0.06, x1 = 1.06, y0 = Math.min(...ys, 0) - 0.07, y1 = Math.max(...ys, 0) + 0.07;
    svg.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
    const sw = 0.014;
    let s = `<line x1="0" y1="0" x2="1" y2="0" stroke="#8a8a84" stroke-width="${sw * 0.5}" stroke-dasharray="0.025 0.02"/>`;
    s += `<polyline points="${xs.map((x, i) => x.toFixed(4) + ',' + ys[i].toFixed(4)).join(' ')}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="round"/>`;
    s += xs.map((x, i) => `<circle cx="${x.toFixed(4)}" cy="${ys[i].toFixed(4)}" r="${i === 0 || i === xs.length - 1 ? 0.02 : 0.013}" fill="currentColor"/>`).join('');
    svg.innerHTML = s;
  }
  // pan and zoom: a quick rescaled snapshot while moving, a full redraw once it settles
  // Land drawn black above a base bar (as in the plates). Coloured by stage: each stage's new land is painted in
  // that stage's colour, in stage order, and land a stage carves away goes back to paper; so every bit of land
  // shows the stage that last made it. Each coastline piece is outlined in a darker shade of the stage it ends on.
  const BAR = 0.06;
  function renderLand(f, v, G, eps, byDepth, keyIds, parity = -1) {
    const c = f.ctx, areas = byDepth ? [] : null, cv = buildCurve(G, eps, v, f, 0.6, parity, areas);
    paper(f, PRINT.paper); toScreen(f);
    if (!byDepth) {
      const P = cv.pts.slice();
      P.push(v.ox + 1 * v.s, v.oy + BAR * v.s, v.ox + 0 * v.s, v.oy + BAR * v.s);
      c.fillStyle = PRINT.ink; c.fill(polyPath(P));
      return;
    }
    let hi = 1;
    for (const d of cv.dep) if (d > hi) hi = d;
    for (const a of areas) if (a.stage > hi) hi = a.stage;
    const tOf = (k) => (hi > 1 ? (k - 1) / (hi - 1) : 0);
    const byStage = new Map();
    for (const a of areas) {
      let g = byStage.get(a.stage); if (!g) byStage.set(a.stage, (g = { add: new Path2D(), cut: new Path2D() }));
      const p = a.add ? g.add : g.cut;
      p.moveTo(a.pts[0], a.pts[1]);
      for (let i = 2; i < a.pts.length; i += 2) p.lineTo(a.pts[i], a.pts[i + 1]);
      p.closePath();
    }
    for (let k = 1; k <= hi; k++) {
      const g = byStage.get(k);
      if (!g) continue;
      c.fillStyle = mixRGB(rampRGB(tOf(k)), PAPER_RGB, 0.18); c.fill(g.add);
      c.fillStyle = PRINT.paper; c.fill(g.cut);
    }
    const lines = new Map();
    for (let i = 0; i < cv.dep.length; i++) {
      const d = cv.dep[i];
      if (d < 0) continue;
      let g = lines.get(d); if (!g) lines.set(d, (g = new Path2D()));
      g.moveTo(cv.pts[2 * i], cv.pts[2 * i + 1]); g.lineTo(cv.pts[2 * i + 2], cv.pts[2 * i + 3]);
    }
    c.lineWidth = 1.2; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [d, g] of lines) { c.strokeStyle = mixRGB(rampRGB(tOf(d)), [0, 0, 0], 0.35); c.stroke(g); }
    c.fillStyle = PRINT.ink; c.fillRect(v.ox, v.oy, v.s, BAR * v.s);
    if (keyIds) { $(keyIds[0]).textContent = 'stage 1'; $(keyIds[1]).textContent = `stage ${hi}`; }
  }
  // ε sliders: logarithmic, from 0.25 down to epsMin
  const epsOf = (v, epsMin) => Math.pow(10, Math.log10(0.25) + (Math.log10(epsMin) - Math.log10(0.25)) * (v / 100));
  const epsText = (e) => `ε = ${e >= 0.01 ? e.toFixed(3) : e.toPrecision(2)}`;
  const piecesText = (q) => (q.over ? `> ${fmt(q.n - 1)}` : fmt(q.n));

  // ====================== Plate 56 ======================
  const st56 = { a: 0.25, e: 80, depth: false, G: gen56(0.25), box: null };
  st56.box = worldBox(st56.G);
  const fitOf56 = (f) => fitBox(f, { x0: -0.01, x1: 1.01, y0: -BAR, y1: Math.max(0.3, st56.box.y1) }, 0.03);
  const z56 = zoomable('w56', 'c56', fitOf56, (f, v) => renderLand(f, v, st56.G, epsOf(st56.e, 0.001), st56.depth, ['k56a', 'k56b']), { maxZoom: 300 });
  function set56(refit) {
    st56.G = gen56(st56.a);
    if (refit) { st56.box = worldBox(st56.G); z56.refit(); } else z56.schedule();
    const eps = epsOf(st56.e, 0.001), q = countPieces(st56.G.rs, eps);
    const b = 1 - 2 * st56.a;
    $('a56v').textContent = `a = ${st56.a.toFixed(3)}`; $('e56v').textContent = epsText(eps);
    $('r56a').textContent = st56.G.D.toFixed(4); $('r56b').textContent = piecesText(q); $('r56c').textContent = `${q.lo} to ${q.hi}`;
    $('r56d').innerHTML = `${q.len.toFixed(3)} <small>× the base</small>`;
    $('c56n').textContent = `${piecesText(q)} pieces at ${epsText(eps)}`;
    $('g56t').innerHTML = `r = ${st56.a.toFixed(3)}, ${b.toFixed(3)}, ${b.toFixed(3)}, ${st56.a.toFixed(3)}<br>2·a<sup>D</sup> + 2·(1 − 2a)<sup>D</sup> = 1`;
    $('p56dim').textContent = Math.abs(st56.a - 0.25) < 1e-9 ? 'Generator 1/4, 1/2, 1/2, 1/4 · D ≈ 1.4500' : Math.abs(st56.a - 1 / 3) < 0.0011 ? "Koch's own generator, 1/3 each · D ≈ 1.2619" : `Generator ${st56.a.toFixed(3)}, ${b.toFixed(3)}, ${b.toFixed(3)}, ${st56.a.toFixed(3)} · D ≈ ${st56.G.D.toFixed(4)}`;
    genSVG($('g56'), st56.G);
    drawG();
  }
  $('a56').addEventListener('input', (e) => { st56.a = +e.target.value / 1000; set56(true); });
  $('e56').addEventListener('input', (e) => { st56.e = +e.target.value; set56(false); });
  $('d56').addEventListener('change', (e) => { st56.depth = e.target.checked; $('k56').hidden = !st56.depth; z56.schedule(); });
  for (const [a, label] of [[0.25, 'Plate 56: a = 1/4'], [1 / 3, "Koch's curve: a = 1/3"], [0.4, 'Flatter: a = 0.4']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', () => { st56.a = a; $('a56').value = String(Math.round(a * 1000)); set56(true); });
    $('pre56').append(b);
  }

  // ====================== Plate 57, top ======================
  // default angle: the one that gives the caption's D = 1.8797 with the trunk where the figure has it
  const P57 = 0.328;
  const GAMMA57 = (() => { let lo = 90.001, hi = 130; for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (gen57(m, P57).D > 1.8797) lo = m; else hi = m; } return (lo + hi) / 2; })();
  const st57 = { g: GAMMA57, p: P57, e: 70, depth: false, even: true, G: null };
  st57.G = gen57(st57.g, st57.p);
  $('ang57').value = String(Math.round(GAMMA57 * 100));
  const fitOf57 = (f) => fitBox(f, { x0: -0.01, x1: 1.01, y0: -BAR, y1: 0.52 }, 0.02);
  const z57 = zoomable('w57', 'c57', fitOf57, (f, v) => renderLand(f, v, st57.G, epsOf(st57.e, 0.0025), st57.depth, ['k57a', 'k57b'], st57.even ? 0 : -1), { maxZoom: 300 });
  function set57() {
    st57.G = gen57(st57.g, st57.p);
    z57.schedule();
    const eps = epsOf(st57.e, 0.0025), q = countPieces(st57.G.rs, eps, 400000, st57.even ? 0 : -1);
    const [r1, r2] = st57.G.rs;
    $('ang57v').textContent = `${st57.g.toFixed(2)}°`; $('p57v').textContent = `${st57.p.toFixed(3)} along the base`; $('e57v').textContent = epsText(eps);
    $('r57a').textContent = st57.G.D.toFixed(4); $('r57b').textContent = piecesText(q); $('r57c').textContent = `${q.lo} to ${q.hi}`;
    $('r57d').textContent = (r1 * r1 + r2 * r2).toFixed(4);
    $('c57n').textContent = `${piecesText(q)} pieces at ${epsText(eps)}`;
    $('g57t').innerHTML = `r₁ = ${r1.toFixed(3)}, r₂ = ${r2.toFixed(3)}<br>r₁<sup>D</sup> + r₂<sup>D</sup> = 1`;
    $('p57tdim').textContent = `Two legs, r ≈ ${r1.toFixed(3)} and ${r2.toFixed(3)} · D ≈ ${st57.G.D.toFixed(4)}`;
    genSVG($('g57'), st57.G);
    drawG();
  }
  $('ang57').addEventListener('input', (e) => { st57.g = +e.target.value / 100; set57(); });
  $('p57').addEventListener('input', (e) => { st57.p = +e.target.value / 1000; set57(); });
  $('e57').addEventListener('input', (e) => { st57.e = +e.target.value; set57(); });
  $('even57').addEventListener('change', (e) => { st57.even = e.target.checked; set57(); });
  $('d57').addEventListener('change', (e) => { st57.depth = e.target.checked; $('k57').hidden = !st57.depth; z57.schedule(); });
  for (const [g, p, label] of [[GAMMA57, P57, 'Plate 57'], [90.2, P57, 'Nearly Pólya: 90.2°'], [100, P57, '100°'], [GAMMA57, 0.5, 'Trunk centred']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label;
    b.addEventListener('click', () => { st57.g = g; st57.p = p; $('ang57').value = String(Math.round(g * 100)); $('p57').value = String(Math.round(p * 1000)); set57(); });
    $('pre57').append(b);
  }

  // ====================== Plate 57, bottom ======================
  // The printed figure is cropped. Undoing the crop makes the bump positions symmetric under a half-turn and fits
  // every copy end to end: flats 0.225, bumps 0.05. On that full curve the printed window runs from 0.97% to 94.45%.
  const B57 = 0.05, PRINTED = [0.0097, 0.9445];
  const stB = { b: B57, e: 70, crop: true, G: genB(B57) };
  const fB = figure($('cB'), () => {
    const f = fB, c = f.ctx, G = stB.G, h = Math.max(0.07, (stB.b * S3) / 2 * 1.25);
    const v = fitBox(f, { x0: -0.01, x1: 1.01, y0: -h, y1: h }, 0.04);
    paper(f, PRINT.paper); toScreen(f);
    const cv = buildCurve(G, epsOf(stB.e, 0.001), v, f, 0.5);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = PRINT.ink; c.lineWidth = 1.3;
    c.stroke(polyPath(cv.pts, false));
    if (stB.crop && Math.abs(stB.b - B57) < 1e-9) {
      const xa = v.ox + PRINTED[0] * v.s, xb = v.ox + PRINTED[1] * v.s;
      c.fillStyle = 'rgba(236,235,230,0.72)';
      c.fillRect(0, 0, xa, f.h); c.fillRect(xb, 0, f.w - xb, f.h);
      c.strokeStyle = '#c2452d'; c.lineWidth = 1.2; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(xa, 6); c.lineTo(xa, f.h - 6); c.moveTo(xb, 6); c.lineTo(xb, f.h - 6); c.stroke(); c.setLineDash([]);
      c.font = '600 11px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif'; c.fillStyle = '#c2452d'; c.textBaseline = 'top';
      c.textAlign = 'left'; c.fillText('printed figure starts', xa + 5, 6);
      c.textAlign = 'right'; c.fillText('printed figure ends', xb - 5, 6);
      c.textAlign = 'left';
    }
  });
  function setB() {
    stB.G = genB(stB.b);
    const eps = epsOf(stB.e, 0.001), q = countPieces(stB.G.rs, eps), r = (1 - 2 * stB.b) / 4;
    $('bBv').textContent = `b = ${stB.b.toFixed(3)}`; $('eBv').textContent = epsText(eps);
    $('rBa').textContent = stB.G.D.toFixed(4); $('rBb').textContent = r.toFixed(4); $('rBc').textContent = piecesText(q);
    $('rBd').textContent = `${((4 * r + 4 * stB.b - 1) * 100).toFixed(1)}%`;
    $('cBn').textContent = `${Math.abs(stB.b - B57) < 1e-9 ? 'flats 0.225, bumps 0.05' : `bumps b = ${stB.b.toFixed(3)}`} · ${piecesText(q)} pieces at ${epsText(eps)}`;
    $('p57bdim').textContent = `Four flats and two small bumps · D ≈ ${stB.G.D.toFixed(4)}`;
    $('cropB').disabled = Math.abs(stB.b - B57) > 1e-9;
    genSVG($('gB'), stB.G);
    fB.draw(); drawG();
  }
  $('bB').addEventListener('input', (e) => { stB.b = +e.target.value / 1000; setB(); });
  $('cropB').addEventListener('change', (e) => { stB.crop = e.target.checked; fB.draw(); });
  $('preB').addEventListener('click', () => { stB.b = B57; $('bB').value = '50'; setB(); });
  $('eB').addEventListener('input', (e) => { stB.e = +e.target.value; setB(); });

  // ====================== G(D) ======================
  function drawG() {
    if (!st56.G || !st57.G || !stB.G) return;
    const W = 400, H = 250, ml = 36, mr = 12, mt = 12, mb = 34, Dx0 = 0.8, Dx1 = 2.2, Gy1 = 2;
    const X = (d) => ml + ((d - Dx0) / (Dx1 - Dx0)) * (W - ml - mr), Y = (g) => mt + (1 - Math.min(g, Gy1) / Gy1) * (H - mt - mb);
    const series = [
      { name: 'Plate 56', rs: st56.G.rs, D: st56.G.D, color: '#2f5f9e' },
      { name: 'Plate 57, top', rs: st57.G.rs, D: st57.G.D, color: '#c2452d' },
      { name: 'Plate 57, bottom', rs: stB.G.rs, D: stB.G.D, color: '#3f8f8c' },
      { name: 'Koch (Plate 42)', rs: [1 / 3, 1 / 3, 1 / 3, 1 / 3], D: Math.log(4) / Math.log(3), color: '#8a8a84', dash: true },
    ];
    let s = '';
    for (const g of [0, 0.5, 1, 1.5, 2]) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(g)}" y2="${Y(g)}" stroke="${g === 1 ? '#151515' : '#c9c8c2'}" stroke-width="${g === 1 ? 1.1 : 1}"/><text x="${ml - 5}" y="${Y(g) + 3.5}" text-anchor="end">${g}</text>`;
    for (let d = 1; d <= 2; d += 0.2) s += `<line x1="${X(d)}" x2="${X(d)}" y1="${H - mb}" y2="${H - mb + 4}" stroke="#8a8a84"/><text x="${X(d)}" y="${H - mb + 15}" text-anchor="middle">${d.toFixed(1)}</text>`;
    s += `<text x="${(ml + W - mr) / 2}" y="${H - 4}" text-anchor="middle">D</text><text x="${ml + 4}" y="${mt + 10}">G(D) = Σ r<tspan baseline-shift="sub" font-size="8">m</tspan><tspan baseline-shift="super" font-size="8">D</tspan></text>`;
    for (const se of series) {
      let p = '';
      for (let i = 0; i <= 140; i++) { const d = Dx0 + ((Dx1 - Dx0) * i) / 140, g = se.rs.reduce((a, r) => a + Math.pow(r, d), 0); p += (i ? 'L' : 'M') + X(d).toFixed(1) + ' ' + Y(g).toFixed(1); }
      s += `<path d="${p}" fill="none" stroke="${se.color}" stroke-width="1.7"${se.dash ? ' stroke-dasharray="4 3"' : ''}/>`;
      s += `<circle cx="${X(se.D)}" cy="${Y(1)}" r="4" fill="${se.color}" stroke="#ecebe6" stroke-width="1.5"/>`;
    }
    $('gPlot').innerHTML = s;
    $('gLeg').innerHTML = series.map((se) => `<span><span class="sw" style="background:${se.color}"></span>${se.name}: D = ${se.D.toFixed(4)}</span>`).join('');
  }

  // ---------- boot ----------
  set56(false);
  set57();
  setB();
})();
