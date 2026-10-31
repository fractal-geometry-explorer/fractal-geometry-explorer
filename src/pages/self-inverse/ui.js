// Chapter 18 page wiring. Each section recomputes its figure from the fitted circles at the
// current view, so zooming refines every cover; heavy redraws do a coarse pass first and the
// full pass once the control settles (see DECISIONS.md, "Heavy sliders").

// ---------- small drawing helpers ----------
function strokeCircles(c, v, f, circles, color, lw = 1.1) {
  c.strokeStyle = color; c.lineWidth = lw;
  c.beginPath();
  for (const k of circles) {
    const r = k.r * v.s;
    if (r < 0.35) continue;
    c.moveTo(v.ox + k.x * v.s + r, v.oy - k.y * v.s);
    c.arc(v.ox + k.x * v.s, v.oy - k.y * v.s, r, 0, Math.PI * 2);
  }
  c.stroke();
}
function fillCircles(c, v, f, circles, color, rMinPx = 0.22) {
  c.fillStyle = color;
  c.beginPath();
  for (const k of circles) {
    const r = Math.max(k.r * v.s, rMinPx);
    c.moveTo(v.ox + k.x * v.s + r, v.oy - k.y * v.s);
    c.arc(v.ox + k.x * v.s, v.oy - k.y * v.s, r, 0, Math.PI * 2);
  }
  c.fill();
}
// regions may be complements (inside: false): those are drawn as canvas-rect minus disc
function fillRegions(c, v, f, regions, color) {
  c.fillStyle = color;
  const simple = [];
  for (const g of regions) {
    if (g.inside === false) {
      const p = new Path2D();
      p.rect(-4, -4, f.w + 8, f.h + 8);
      p.arc(v.ox + g.x * v.s, v.oy - g.y * v.s, g.r * v.s, 0, Math.PI * 2);
      c.fill(p, 'evenodd');
    } else simple.push(g);
  }
  fillCircles(c, v, f, simple, color);
}
const viewBox = (f, v, pad = 0.05) => ({
  x0: (0 - v.ox) / v.s - pad * f.w / v.s, x1: (f.w - v.ox) / v.s + pad * f.w / v.s,
  y0: (v.oy - f.h) / v.s - pad * f.h / v.s, y1: v.oy / v.s + pad * f.h / v.s,
});
const px = (v, n = 1) => n / v.s;   // n screen pixels in world units
const GRAYPANEL = '#b3b1aa';

// ---------- the two Apollonian circles and the packing (Soddy reflection) ----------
function apollonianBoth(a, ka, b, kb, c, kc) {
  const s = 2 * Math.sqrt(Math.max(0, ka * kb + kb * kc + kc * ka));
  const zx = a.x * ka + b.x * kb + c.x * kc, zy = a.y * ka + b.y * kb + c.y * kc;
  const re = ka * kb * (a.x * b.x - a.y * b.y) + kb * kc * (b.x * c.x - b.y * c.y) + kc * ka * (c.x * a.x - c.y * a.y);
  const im = ka * kb * (a.x * b.y + a.y * b.x) + kb * kc * (b.x * c.y + b.y * c.x) + kc * ka * (c.x * a.y + c.y * a.x);
  const m = Math.sqrt(Math.hypot(re, im)), th = Math.atan2(im, re) / 2;
  const sx = m * Math.cos(th), sy = m * Math.sin(th);
  // each curvature root pairs with one sign of the complex square root; keep the tangent ones
  const ok = [];
  for (const k4 of [ka + kb + kc + s, ka + kb + kc - s]) for (const sg of [1, -1]) {
    const x = (zx + sg * 2 * sx) / k4, y = (zy + sg * 2 * sy) / k4, r = 1 / k4;
    if (r <= 0) continue;
    const want = ka < 0 ? Math.abs(a.r - r) : a.r + r;
    const want2 = b.r + r;
    if (Math.abs(Math.hypot(x - a.x, y - a.y) - want) < 1e-6 && Math.abs(Math.hypot(x - b.x, y - b.y) - want2) < 1e-6) ok.push({ x, y, r, k: k4 });
  }
  return ok;
}
// packing by reflection: in triangle (a,b,c), the inscribed circle is the Soddy reflection of
// d, the OTHER circle tangent to all three of a, b, c. Nodes: [a,b,c,d, depth, low].
function packTriangles(roots, rmin, bb, cap = 50000) {
  const out = [];
  const stack = roots.slice();
  while (stack.length && out.length < cap) {
    const [a, b, c, d, depth, low] = stack.pop();
    if (bb) {
      const p1 = tangentPoint(a.c, b.c), p2 = tangentPoint(b.c, c.c), p3 = tangentPoint(a.c, c.c);
      const x0 = Math.min(p1[0], p2[0], p3[0]), x1 = Math.max(p1[0], p2[0], p3[0]);
      const y0 = Math.min(p1[1], p2[1], p3[1]), y1 = Math.max(p1[1], p2[1], p3[1]);
      if (x1 < bb.x0 || x0 > bb.x1 || y1 < bb.y0 || y0 > bb.y1) continue;
    }
    const k = 2 * (a.k + b.k + c.k) - d.k;
    const x = (2 * (a.c.x * a.k + b.c.x * b.k + c.c.x * c.k) - d.c.x * d.k) / k;
    const y = (2 * (a.c.y * a.k + b.c.y * b.k + c.c.y * c.k) - d.c.y * d.k) / k;
    const n = { c: { x, y, r: 1 / k }, k };
    out.push({ x, y, r: 1 / k, g: depth, low });
    if (1 / k > rmin) stack.push([a, b, n, c, depth + 1, low], [a, c, n, b, depth + 1, low], [b, c, n, a, depth + 1, low]);
  }
  return out;
}
const asNode = (c, inner = true) => ({ c, k: (inner ? 1 : -1) / c.r });
// the full packing of GIVEN at cutoff rmin: the two Apollonian circles, then every triangle.
// In a root triangle such as (O, A, up), the other circle tangent to all three is the third
// given circle B, so it is the one the Soddy reflection flips.
function fullPacking(rmin, bb) {
  const [O, A, B] = GIVEN;
  const nO = asNode(O, false), nA = asNode(A), nB = asNode(B);
  let [up, dn] = apollonianBoth(O, nO.k, A, nA.k, B, nB.k).map((c) => ({ c: { x: c.x, y: c.y, r: c.r }, k: c.k }));
  if (up.c.y < dn.c.y) [up, dn] = [dn, up];
  const roots = [];
  for (const ap of [up, dn]) {
    const low = ap === dn;
    roots.push([nO, nA, ap, nB, 1, low], [nO, nB, ap, nA, 1, low], [nA, nB, ap, nO, 1, low]);
  }
  return { apo: [up.c, dn.c], dn: dn.c, rest: packTriangles(roots, rmin, bb) };
}

// ---------- section A: inversion ----------
(function sectionA() {
  const K = { x: 0, y: 0, r: 1 };
  const st = { mode: 'elsewhere', cx: 1.45, cy: 0.62 };
  const modes = ['through O', 'elsewhere', 'orthogonal', 'line'];
  const geomOf = () => {
    const d = Math.hypot(st.cx, st.cy);
    if (st.mode === 'line') return { line: true, nx: st.cx / d, ny: st.cy / d, d };
    const r = st.mode === 'through O' ? d : st.mode === 'orthogonal' ? Math.sqrt(Math.max(0.05, d * d - 1)) : 0.42 * d;
    return { x: st.cx, y: st.cy, r };
  };
  const zoom = zoomable('wA', 'cA', (f) => fitBox(f, { x0: -2.3, x1: 2.3, y0: -2.3, y1: 2.3 }), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const g = geomOf();
    // the reference circle C and its centre O
    strokeCircles(c, v, f, [K], PRINT.ink, 2);
    dot(c, v, 0, 0, 3.4, PRINT.ink);
    c.fillStyle = PRINT.muted; c.font = '13px "IBM Plex Mono"'; c.fillText('O', v.ox + 7, v.oy - 7);
    c.fillText('C', v.ox + (K.r * 0.72) * v.s, v.oy - (K.r * 0.72) * v.s);
    if (g.line) {
      // a line at distance d from O along (nx, ny), and its inverse: a circle through O
      c.strokeStyle = PRINT.ink; c.lineWidth = 2; c.beginPath();
      const px0 = v.ox + g.nx * g.d * v.s, py0 = v.oy - g.ny * g.d * v.s, tx = -g.ny, ty = g.nx, L = 4 * v.s;
      c.moveTo(px0 - tx * L, py0 + ty * L); c.lineTo(px0 + tx * L, py0 - ty * L); c.stroke();
      const r = K.r * K.r / (2 * g.d);
      strokeCircles(c, v, f, [{ x: g.nx * r, y: g.ny * r, r }], PRINT.red, 2);
    } else {
      strokeCircles(c, v, f, [g], PRINT.ink, 2);
      const d2 = g.x * g.x + g.y * g.y - g.r * g.r;
      if (Math.abs(d2) < 1e-4) {        // through O: the inverse is a straight line, drawn through two inverted points
        const nn = Math.hypot(g.x, g.y), nx = g.x / nn, ny = g.y / nn;
        const p1 = invPoint(K, g.x + g.r * ny, g.y - g.r * nx), p2 = invPoint(K, g.x - g.r * ny, g.y + g.r * nx);
        c.strokeStyle = PRINT.red; c.lineWidth = 2; c.beginPath();
        const ex = p2[0] - p1[0], ey = p2[1] - p1[1];
        c.moveTo(v.ox + (p1[0] - 5 * ex) * v.s, v.oy - (p1[1] - 5 * ey) * v.s);
        c.lineTo(v.ox + (p2[0] + 5 * ex) * v.s, v.oy - (p2[1] + 5 * ey) * v.s); c.stroke();
      } else {
        const im = invCircle(K, g);
        strokeCircles(c, v, f, [im], PRINT.red, 2);
      }
    }
    dot(c, v, st.cx, st.cy, 5, PRINT.accent);
  }, { maxZoom: 8, onTap: (x, y) => { st.cx = x; st.cy = y === 0 ? 1e-4 : y; clamp(); zoom.schedule(); update(); } });
  function clamp() {
    const d = Math.hypot(st.cx, st.cy);
    const lo = st.mode === 'orthogonal' ? 1.12 : 0.3;
    if (d < lo) { st.cx *= lo / d; st.cy *= lo / d; }
  }
  const markA = stepButtons($('mA'), modes, (m) => ({ 'through O': 'through O', elsewhere: 'not through O', orthogonal: 'orthogonal to C', line: 'a line' }[m]), (m) => `Show ${m === 'line' ? 'a line' : `a circle ${m}`}`, (m) => {
    st.mode = m; clamp(); markA(m); zoom.schedule(); update();
  });
  function update() {
    const d = Math.hypot(st.cx, st.cy);
    $('rAd').textContent = d.toFixed(3) + ' R';
    $('rAk').textContent = st.mode === 'line' ? 'a circle through O' : st.mode === 'through O' ? 'a straight line' : st.mode === 'orthogonal' ? 'itself, unchanged' : 'a circle';
    $('infoA').textContent = st.mode === 'orthogonal' ? 'An orthogonal circle crosses C at right angles; inversion slides it along itself.' :
      st.mode === 'through O' ? 'The circle passes through O, so its inverse runs off to infinity: a straight line.' :
      st.mode === 'line' ? 'A line is a circle through infinity; its inverse is a circle through O.' :
      'Tap anywhere on the figure to move the black circle.';
  }
  markA(st.mode); update();
})();

// ---------- section B: Apollonian packing ----------
(function sectionB() {
  const st = { mode: 'packing', stage: Infinity };
  const stages = [0, 1, 2, 3, Infinity];
  let lastCount = 0, lastMin = 0;
  const FIT = { x0: -1.05, x1: 1.05, y0: -1.05, y1: 1.05 };
  const zoom = zoomable('wB', 'cB', (f) => fitBox(f, FIT), (f, v) => {
    const c = f.ctx;
    const gasket = st.mode === 'gasket';
    paper(f, gasket ? GRAYPANEL : PRINT.paper); toScreen(f);
    const bb = viewBox(f, v);
    const rmin = Math.max(px(v, 1.4), 1e-5);
    const { apo, dn, rest } = fullPacking(rmin, bb);
    if (gasket) {
      // the photographed gasket: the triangle below the inner pair, white, its discs black
      const tri = triPath(GIVEN, dn, v);
      c.fillStyle = '#f0efe9'; c.fill(tri);
      const inTri = rest.filter((k) => k.low);
      fillCircles(c, v, f, [dn, ...inTri], PRINT.ink);
      lastCount = inTri.length + 1;
      lastMin = rmin;
    } else {
      const upTo = st.stage;
      strokeCircles(c, v, f, GIVEN, PRINT.ink, 2);
      if (upTo >= 1) strokeCircles(c, v, f, apo, PRINT.ink, upTo === 1 ? 2.4 : 1.4);
      let shown = [];
      if (upTo > 1) shown = rest.filter((k) => (upTo === Infinity ? true : k.g < upTo));
      strokeCircles(c, v, f, shown, PRINT.ink, 1.1);
      lastCount = 3 + (upTo >= 1 ? 2 : 0) + shown.length;
      lastMin = shown.length ? Math.min(...shown.map((k) => k.r)) : apo[0].r;
    }
    readout();
  }, { maxZoom: 3000 });
  // the curvilinear triangle of three mutually tangent circles that contains circle dn
  function triPath(cs, dn, v) {
    const p = new Path2D();
    // the outer circle goes first into tangentPoint: for an internal tangency the point lies
    // away from the inner circle's centre, which "outer + r·unit(toward inner)" gets right
    const corners = [tangentPoint(cs[0], cs[1]), tangentPoint(cs[1], cs[2]), tangentPoint(cs[0], cs[2])];
    const arcs = [[cs[1], corners[0], corners[1]], [cs[2], corners[1], corners[2]], [cs[0], corners[2], corners[0]]];
    let first = true;
    for (const [K, pA, pB] of arcs) {
      let a1 = Math.atan2(pA[1] - K.y, pA[0] - K.x), a2 = Math.atan2(pB[1] - K.y, pB[0] - K.x);
      // walk the arc that stays nearest dn's centre
      const mid = (t) => [K.x + K.r * Math.cos(a1 + t * dAng), K.y + K.r * Math.sin(a1 + t * dAng)];
      let dAng = a2 - a1;
      while (dAng > Math.PI) dAng -= 2 * Math.PI;
      while (dAng < -Math.PI) dAng += 2 * Math.PI;
      let m = mid(0.5);
      const other = (() => { let d = dAng > 0 ? dAng - 2 * Math.PI : dAng + 2 * Math.PI; return d; })();
      const mAlt = [K.x + K.r * Math.cos(a1 + 0.5 * other), K.y + K.r * Math.sin(a1 + 0.5 * other)];
      if (Math.hypot(mAlt[0] - dn.x, mAlt[1] - dn.y) < Math.hypot(m[0] - dn.x, m[1] - dn.y)) dAng = other;
      const steps = 48;
      for (let i = first ? 0 : 1; i <= steps; i++) {
        const a = a1 + (dAng * i) / steps, X = v.ox + (K.x + K.r * Math.cos(a)) * v.s, Y = v.oy - (K.y + K.r * Math.sin(a)) * v.s;
        if (first && i === 0) p.moveTo(X, Y); else p.lineTo(X, Y);
      }
      first = false;
    }
    p.closePath();
    return p;
  }
  function readout() {
    $('rBa').textContent = fmt(lastCount);
    $('rBb').textContent = lastMin < 1 ? lastMin.toExponential(1) : '—';
    $('cBn').textContent = `${fmt(lastCount)} circles`;
    $('cBt').textContent = st.mode === 'gasket' ? 'Apollonian gasket' : 'Apollonian packing';
  }
  const markMode = stepButtons($('mB'), ['packing', 'gasket'], (m) => (m === 'packing' ? 'the packing' : 'one gasket'), (m) => m, (m) => { st.mode = m; markMode(m); zoom.refit(); });
  const markStage = stepButtons($('sB'), stages, (s) => (s === Infinity ? '∞' : String(s)), (s) => `stage ${s}`, (s) => {
    st.stage = s; markStage(s); $('sBv').textContent = s === 0 ? 'the three given circles' : s === 1 ? '+ two Apollonian circles' : s === Infinity ? 'packing' : `stage ${s}`;
    zoom.schedule();
  });
  $('preB170').addEventListener('click', () => { st.mode = 'packing'; markMode('packing'); st.stage = 1; markStage(1); $('sBv').textContent = '+ two Apollonian circles'; zoom.refit(); });
  $('preBgasket').addEventListener('click', () => { st.mode = 'gasket'; markMode('gasket'); zoom.refit(); });
  markMode('packing'); markStage(Infinity);
})();

// ---------- section C: the net as four clans ----------
(function sectionC() {
  const [O, A, B] = GIVEN;
  const { apo } = fullPacking(1, null);
  const dn = apo[0].y < apo[1].y ? apo[0] : apo[1];
  const GAMMA = [O, A, B, dn];
  const CGEN = [];
  for (let i = 0; i < 4; i++) {
    const tri = GAMMA.filter((_, j) => j !== i);
    const oc = orthoCircle(tri[0], tri[1], tri[2]);
    if (oc) CGEN.push(oc);
  }
  const st = { mode: 'clans' };
  let lastCount = 0;
  const zoom = zoomable('wC', 'cC', (f) => fitBox(f, { x0: -1.05, x1: 1.05, y0: -1.05, y1: 1.05 }), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const bb = viewBox(f, v), rmin = Math.max(px(v, 1.6), 1e-5);
    if (st.mode === 'generator') {
      strokeCircles(c, v, f, GAMMA, PRINT.ink, 2.6);
      strokeCircles(c, v, f, CGEN, PRINT.accent, 1.3);
      lastCount = 8;
    } else {
      const all = clanCircles(CGEN, GAMMA, rmin, bb);
      if (st.mode === 'clans') {
        for (let cl = 0; cl < 4; cl++) strokeCircles(c, v, f, all.filter((k) => k.clan === cl), CAT[[0, 2, 3, 4][cl]], 1.2);
      } else strokeCircles(c, v, f, all, PRINT.ink, 1.1);
      lastCount = all.length;
    }
    $('rCa').textContent = fmt(lastCount);
    $('cCn').textContent = `${fmt(lastCount)} circles`;
    $('cCt').textContent = st.mode === 'generator' ? 'Γ circles (bold) and the generator C (blue)' : st.mode === 'clans' ? 'The net as four clans' : 'The net, plain';
  }, { maxZoom: 3000 });
  const names = ['Γ and C circles', 'four clans', 'plain net'];
  const vals = ['generator', 'clans', 'plain'];
  const mark = stepButtons($('mC'), vals, (m) => names[vals.indexOf(m)], (m) => m, (m) => { st.mode = m; mark(m); zoom.schedule(); });
  mark('clans');
  $('legC').innerHTML = ['Γ₂₃₄ clan', 'Γ₁₃₄ clan', 'Γ₁₂₄ clan', 'Γ₁₂₃ clan'].map((t, i) => `<span><i style="background:${CAT[[0, 2, 3, 4][i]]}"></i>${t}</span>`).join('');
  console.assert(CGEN.length === 4, 'four generator circles exist');
})();

// ---------- section D: Poincaré chain stages ----------
(function sectionD() {
  const st = { stage: 1, ghost: true };
  const FIT = { x0: -1.12, x1: 1.12, y0: -1.0, y1: 0.72 };
  const zoom = zoomable('wD', 'cD', (f) => fitBox(f, FIT), (f, v) => {
    const c = f.ctx;
    paper(f, GRAYPANEL); toScreen(f);
    const prev = st.stage === 0 ? [] : chainStage(CHAIN, st.stage - 1);
    const cur = chainStage(CHAIN, st.stage);
    if (st.ghost) fillCircles(c, v, f, prev.length ? prev : [], '#f0efe9');
    fillCircles(c, v, f, cur, PRINT.ink);
    $('rDa').textContent = fmt(cur.length);
    $('rDb').textContent = Math.max(...cur.map((k) => k.r)).toFixed(4);
    $('cDs').textContent = String(st.stage);
    $('cDn').textContent = `${fmt(cur.length)} links`;
  }, { maxZoom: 400 });
  const mark = stepButtons($('sD'), [0, 1, 2, 3, 4, 5, 6], String, (s) => `stage ${s}`, (s) => {
    st.stage = s; mark(s); $('sDv').textContent = s === 0 ? 'the chain itself' : `stage ${s}`;
    zoom.schedule();
  });
  $('ghostD').addEventListener('change', (e) => { st.ghost = e.target.checked; zoom.schedule(); });
  $('preD').addEventListener('click', () => { st.stage = 1; st.ghost = true; $('ghostD').checked = true; mark(1); $('sDv').textContent = 'stage 1'; zoom.refit(); });
  mark(1);
})();

// ---------- section E: Plate 177, osculating discs ----------
(function sectionE() {
  const PAIRS4 = [[0, 1], [1, 2], [2, 3], [3, 0]];
  const { seedsIn, seedsOut } = osculatingSeeds(CHAIN, PAIRS4);
  const st = { mode: 'limit', circles: false };
  let lastCount = 0;
  const FIT = { x0: -1.35, x1: 1.35, y0: -1.42, y1: 1.28 };
  const zoom = zoomable('wE', 'cE', (f) => fitBox(f, FIT), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const bb = viewBox(f, v), rmin = Math.max(px(v, 2.6), 2e-5);
    lastCount = 0;
    for (const [seeds, color] of [[seedsOut, '#a5a39c'], [seedsIn, PRINT.ink]]) {
      for (const s of seeds) {
        let regions;
        if (st.mode === 1) regions = [s];
        else if (st.mode === 2) {
          regions = [s];
          for (let m = 0; m < 4; m++) if (!s.omit.includes(m)) regions.push(invRegion(CHAIN[m], s));
        } else regions = osculatingClan(CHAIN, s, rmin, bb);
        fillRegions(c, v, f, regions, color);
        lastCount += regions.length;
      }
    }
    if (st.circles) {
      strokeCircles(c, v, f, CHAIN, PRINT.accent, 1.4);
      strokeCircles(c, v, f, [...seedsIn, ...seedsOut], PRINT.red, 1.1);
    }
    $('rEa').textContent = fmt(lastCount);
    $('cEn').textContent = `${fmt(lastCount)} discs`;
  }, { maxZoom: 2000 });
  const names = { 1: 'first approximation', 2: 'second', limit: 'the limit' };
  const mark = stepButtons($('sE'), [1, 2, 'limit'], (m) => names[m], (m) => `Show the ${names[m]}`, (m) => {
    st.mode = m; mark(m); $('sEv').textContent = names[m];
    zoom.schedule();
  });
  $('circE').addEventListener('change', (e) => { st.circles = e.target.checked; zoom.schedule(); });
  $('preE').addEventListener('click', () => { st.mode = 'limit'; mark('limit'); $('sEv').textContent = names.limit; zoom.refit(); });
  mark('limit');
  console.assert(seedsIn.length === 2 && seedsOut.length === 2, 'M=4: two inside and two outside seeds', seedsIn.length, seedsOut.length);
})();

// ---------- section F: twisted inversions (Plate 178's theme) ----------
(function sectionF() {
  const st = { th: 0, gens: CHAIN, coarse: false };
  let timer = 0, lastCount = 0;
  const fitOf = (f) => (st.gens === CHAIN ? fitBox(f, { x0: -1.3, x1: 1.3, y0: -1.35, y1: 1.2 }) : fitBox(f, { x0: -1.95, x1: 1.75, y0: -1.1, y1: 1.85 }));
  const zoom = zoomable('wF', 'cF', fitOf, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const bb = viewBox(f, v);
    const rmin = Math.max(px(v, st.coarse ? 4 : 0.6), 1e-5);
    const dots = twistedLimit(st.gens, (st.th * Math.PI) / 180, rmin, px(v, 3.2), bb, 400000);
    fillCircles(c, v, f, dots, PRINT.ink, 1.25);
    lastCount = dots.length;
    $('rFa').textContent = fmt(lastCount);
    $('cFn').textContent = `${fmt(lastCount)} discs`;
    $('cFt').textContent = `${st.th}°`;
  }, { maxZoom: 2000 });
  $('twF').addEventListener('input', (e) => {
    st.th = +e.target.value; $('twFv').textContent = `${st.th}°`;
    st.coarse = true; zoom.schedule();
    clearTimeout(timer); timer = setTimeout(() => { st.coarse = false; zoom.schedule(); }, 160);
  });
  const mark = stepButtons($('mF'), ['chain', 'fricke'], (m) => (m === 'chain' ? 'the chain of p. 173' : 'the five circles of Plate 179'), (m) => m, (m) => {
    st.gens = m === 'chain' ? CHAIN : FRICKE; mark(m); zoom.refit();
  });
  mark('chain');
})();

// ---------- section G: Plate 179, Fricke corrected ----------
(function sectionG() {
  const PAIRS5 = [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [2, 4]];
  const PAIRS4 = [[0, 1], [1, 2], [2, 3], [3, 0]];
  const five = osculatingSeeds(FRICKE, PAIRS5);
  const chain4 = FRICKE.slice(0, 4);
  const four = osculatingSeeds(chain4, PAIRS4);
  const st = { mode: 'net' };
  let lastCount = 0;
  const zoom = zoomable('wG', 'cG', (f) => fitBox(f, { x0: -1.95, x1: 1.75, y0: -1.1, y1: 1.85 }), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper); toScreen(f);
    const bb = viewBox(f, v);
    const rmin = Math.max(px(v, 1.3), 2e-5);
    lastCount = 0;
    if (st.mode === 'net') {
      strokeCircles(c, v, f, FRICKE, PRINT.ink, 2.2);
      const dots = twistedLimit(FRICKE, 0, Math.max(px(v, 0.6), 2e-5), px(v, 3.2), bb, 400000);
      fillCircles(c, v, f, dots, PRINT.ink, 1.25);
      // the two circles Fricke's draftsman drew, as members of L
      const g1 = orthoCircle(FRICKE[1], FRICKE[2], FRICKE[4]);
      if (g1) strokeCircles(c, v, f, [g1], PRINT.red, 1.4);
      lastCount = dots.length;
    } else if (st.mode === 'corrected') {
      for (const s of five.seedsIn) {
        const regions = osculatingClan(FRICKE, s, rmin, bb);
        fillRegions(c, v, f, regions, PRINT.ink);
        lastCount += regions.length;
      }
    } else {
      for (const [seeds, color] of [[four.seedsOut, '#a5a39c'], [four.seedsIn, PRINT.ink]]) {
        for (const s of seeds) {
          const regions = osculatingClan(chain4, s, rmin, bb);
          fillRegions(c, v, f, regions, color);
          lastCount += regions.length;
        }
      }
      strokeCircles(c, v, f, [FRICKE[4]], PRINT.red, 1.4);
    }
    $('rGa').textContent = fmt(lastCount);
    $('cGn').textContent = `${fmt(lastCount)} ${st.mode === 'net' ? 'covering discs' : 'osculating discs'}`;
    $('cGt').textContent = st.mode === 'net' ? 'The five circles, their net, and a circle of L' : st.mode === 'corrected' ? 'The corrected limit set, filled' : 'L* of the four-circle chain (C₅ in red)';
  }, { maxZoom: 2000 });
  const names = { net: 'five circles + L', corrected: 'the corrected shape', chain: 'L* of the chain' };
  const mark = stepButtons($('mG'), ['net', 'corrected', 'chain'], (m) => names[m], (m) => names[m], (m) => { st.mode = m; mark(m); zoom.schedule(); });
  $('preGtop').addEventListener('click', () => { st.mode = 'corrected'; mark('corrected'); zoom.refit(); });
  $('preGbot').addEventListener('click', () => { st.mode = 'chain'; mark('chain'); zoom.refit(); });
  mark('net');
  console.assert(five.seedsIn.length === 4 && five.seedsOut.length === 2, 'five-circle seeds: 4 in, 2 out', five.seedsIn.length, five.seedsOut.length);
})();
