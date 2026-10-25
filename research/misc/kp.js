
// CORE START
const S3 = Math.sqrt(3);
// Koch island on the unit triangle, counterclockwise, peninsulas pointing outward (to the right of travel)
const TRI = [0, 0, 1, 0, 0.5, S3 / 2];
const kochCache = {};
function kochPoly(n) {
  if (kochCache[n]) return kochCache[n];
  let P = Float64Array.from(TRI);
  for (let k = 0; k < n; k++) {
    const m = P.length / 2, Q = new Float64Array(m * 8);
    let w = 0;
    for (let i = 0; i < m; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, bx = P[j], by = P[j + 1];
      const vx = (bx - ax) / 3, vy = (by - ay) / 3;
      const px = ax + vx + (0.5 * vx + (S3 / 2) * vy), py = ay + vy + (-(S3 / 2) * vx + 0.5 * vy);
      Q[w++] = ax; Q[w++] = ay; Q[w++] = ax + vx; Q[w++] = ay + vy; Q[w++] = px; Q[w++] = py; Q[w++] = ax + 2 * vx; Q[w++] = ay + 2 * vy;
    }
    P = Q;
  }
  return (kochCache[n] = P);
}
// Cesàro's outer teragon: every side of the inner one gets an outward tent with legs 1/√3 as long (120° at the apex)
function tentOut(P) {
  const m = P.length / 2, Q = new Float64Array(m * 4);
  let w = 0;
  for (let i = 0; i < m; i++) {
    const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, bx = P[j], by = P[j + 1];
    Q[w++] = ax; Q[w++] = ay;
    Q[w++] = (ax + bx) / 2 + (by - ay) * S3 / 6; Q[w++] = (ay + by) / 2 - (bx - ax) * S3 / 6;
  }
  return Q;
}
function tentIn(P) {
  const m = P.length / 2, Q = new Float64Array(m * 4);
  let w = 0;
  for (let i = 0; i < m; i++) {
    const ax = P[2 * i], ay = P[2 * i + 1], j = ((i + 1) % m) * 2, bx = P[j], by = P[j + 1];
    Q[w++] = ax; Q[w++] = ay;
    Q[w++] = (ax + bx) / 2 - (by - ay) * S3 / 6; Q[w++] = (ay + by) / 2 + (bx - ax) * S3 / 6;
  }
  return Q;
}
function shoelace(P) {
  let s = 0;
  const m = P.length / 2;
  for (let i = 0; i < m; i++) { const j = ((i + 1) % m) * 2; s += P[2 * i] * P[j + 1] - P[j] * P[2 * i + 1]; }
  return s / 2;
}
// a point on the Koch curve over [0,1] (peninsulas below), from the base-4 digits of t
function kochPoint(t) {
  const d = [];
  let x = Math.min(Math.max(t, 0), 1);
  for (let k = 0; k < 26; k++) { x *= 4; let q = Math.floor(x); if (q > 3) q = 3; d.push(q); x -= q; }
  let zx = 0, zy = 0;
  const c = 0.5, s = S3 / 2;
  for (let k = d.length - 1; k >= 0; k--) {
    const ux = zx / 3, uy = zy / 3;
    switch (d[k]) {
      case 0: zx = ux; zy = uy; break;
      case 1: zx = 1 / 3 + (c * ux + s * uy); zy = -s * ux + c * uy; break;          // rotate −60°
      case 2: zx = 0.5 + (c * ux - s * uy); zy = -S3 / 6 + (s * ux + c * uy); break;  // rotate +60°
      default: zx = 2 / 3 + ux; zy = uy;
    }
  }
  return [zx, zy];
}
// The snowflake sweep (Plates 68–69): six steps of 1/3 and one of 1/√3, with each step's copy laid down as decoded
// from the book's second-stage drawing. Orientation codes: 0 as drawn, 1 mirrored, 2 reversed, 3 reversed and mirrored.
const SW_G = [[0, 0], [1 / 6, S3 / 6], [1 / 3, S3 / 3], [2 / 3, S3 / 3], [5 / 6, S3 / 6], [1 / 3, 0], [2 / 3, 0], [1, 0]];
const SW_O = [1, 3, 3, 3, 2, 1, 3];
function sweepSegments(depth, seq) {
  const N = Math.pow(7, depth), A = new Float64Array(N * 4), C = new Uint8Array(N), R = new Uint8Array(N);
  let w = 0;
  const rec = (ax, ay, bx, by, c, rev, d) => {
    if (d === depth) { A[4 * w] = ax; A[4 * w + 1] = ay; A[4 * w + 2] = bx; A[4 * w + 3] = by; C[w] = c; R[w] = rev; w++; return; }
    const F = seq[d] === 1, dx = bx - ax, dy = by - ay, kids = [];
    for (let i = 0; i < 7; i++) {
      const o = SW_O[i];
      let a = SW_G[i], b = SW_G[i + 1];
      if (o >= 2) { const t = a; a = b; b = t; }
      let cc = o & 1, rr = o >= 2 ? 1 : 0;
      if (F) { a = [1 - a[0], a[1]]; b = [1 - b[0], b[1]]; cc ^= 1; rr ^= 1; }     // mirror in the line x = 1/2
      const ay2 = c ? -a[1] : a[1], by2 = c ? -b[1] : b[1];
      kids.push([ax + dx * a[0] - dy * ay2, ay + dx * ay2 + dy * a[0], ax + dx * b[0] - dy * by2, ay + dx * by2 + dy * b[0], c ^ cc, rev ^ rr]);
    }
    if (rev ^ (F ? 1 : 0)) kids.reverse();
    for (const k of kids) rec(k[0], k[1], k[2], k[3], k[4], k[5], d + 1);
  };
  rec(0, 0, 1, 0, 0, 0, 0);
  return { A, C, R, n: w };
}
// CORE END

(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-US');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PRINT = {
    paper: '#ecebe6', ink: '#151515', sea: '#a8a8a3', swamp: '#f8f8f4', lake: '#e2e2dd', wave: '#a4a49f',
    accent: '#2f5f9e', accentSoft: 'rgba(47,95,158,0.22)', muted: '#66665f',
  };
  const SNOW = { x0: 0, x1: 1, y0: -S3 / 6, y1: S3 / 2 };            // the snowflake's bounding box
  const SNOW_C = [0.5, S3 / 6], SNOW_R = 1 / S3;

  // ---------- shared canvas plumbing ----------
  function figure(canvas, draw) {
    const wrap = canvas.parentElement;
    const f = { canvas, ctx: canvas.getContext('2d'), w: 1, h: 1, dpr: 1, draw };
    const resize = () => {
      f.dpr = Math.min(2, window.devicePixelRatio || 1);
      f.w = wrap.clientWidth || 1; f.h = wrap.clientHeight || 1;
      canvas.width = Math.round(f.w * f.dpr); canvas.height = Math.round(f.h * f.dpr);
      f.draw();
    };
    new ResizeObserver(resize).observe(wrap);
    f.resize = resize;
    return f;
  }
  function fit(f, b, pad) {
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0, s = Math.min(f.w / (bw * (1 + 2 * pad)), f.h / (bh * (1 + 2 * pad)));
    return { s, ox: f.w / 2 - ((b.x0 + b.x1) / 2) * s, oy: f.h / 2 + ((b.y0 + b.y1) / 2) * s };
  }
  const toWorld = (f, v) => f.ctx.setTransform(f.dpr * v.s, 0, 0, -f.dpr * v.s, f.dpr * v.ox, f.dpr * v.oy);
  function paper(f, color) { f.ctx.setTransform(1, 0, 0, 1, 0, 0); f.ctx.fillStyle = color; f.ctx.fillRect(0, 0, f.canvas.width, f.canvas.height); }
  function polyPath(P) {
    const p = new Path2D();
    p.moveTo(P[0], P[1]);
    for (let i = 2; i < P.length; i += 2) p.lineTo(P[i], P[i + 1]);
    p.closePath();
    return p;
  }
  // the Koch coastline, refined only where it is on screen and only down to about a pixel
  function adaptiveKoch(view, f) {
    const bx0 = -view.ox / view.s, bx1 = (f.w - view.ox) / view.s, by1 = view.oy / view.s, by0 = (view.oy - f.h) / view.s;
    const px = view.s * f.dpr, out = [];
    const rec = (ax, ay, bx, by, lvl) => {
      const len = Math.hypot(bx - ax, by - ay), mx = (ax + bx) / 2, my = (ay + by) / 2, r = len * 0.6;
      if (mx + r < bx0 || mx - r > bx1 || my + r < by0 || my - r > by1 || len * px < 0.8 || lvl > 15) { out.push(ax, ay); return; }
      const vx = (bx - ax) / 3, vy = (by - ay) / 3;
      const qx = ax + vx + (0.5 * vx + (S3 / 2) * vy), qy = ay + vy + (-(S3 / 2) * vx + 0.5 * vy);
      rec(ax, ay, ax + vx, ay + vy, lvl + 1); rec(ax + vx, ay + vy, qx, qy, lvl + 1);
      rec(qx, qy, ax + 2 * vx, ay + 2 * vy, lvl + 1); rec(ax + 2 * vx, ay + 2 * vy, bx, by, lvl + 1);
    };
    for (let i = 0; i < 3; i++) rec(TRI[2 * i], TRI[2 * i + 1], TRI[(2 * i + 2) % 6], TRI[(2 * i + 3) % 6], 0);
    return out;
  }
  function stepButtons(el, values, label, onPick) {
    const bs = values.map((v) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = String(v); b.setAttribute('aria-label', `${label} ${v}`);
      b.addEventListener('click', () => onPick(v));
      el.append(b);
      return b;
    });
    return (cur) => bs.forEach((b, i) => b.setAttribute('aria-pressed', String(values[i] === cur)));
  }

  // ====================== Plate 42 ======================
  const st42 = { n: 2, showNew: true, timer: 0 };
  const f42 = figure($('c42'), () => {
    paper(f42, PRINT.paper);
    const v = fit(f42, SNOW, 0.06);
    toWorld(f42, v);
    const cur = polyPath(kochPoly(st42.n));
    if (st42.showNew && st42.n > 0) {
      f42.ctx.fillStyle = PRINT.accent; f42.ctx.fill(cur);
      f42.ctx.fillStyle = PRINT.ink; f42.ctx.fill(polyPath(kochPoly(st42.n - 1)));
    } else { f42.ctx.fillStyle = PRINT.ink; f42.ctx.fill(cur); }
  });
  const mark42 = stepButtons($('s42'), [0, 1, 2, 3, 4, 5, 6, 7], 'Stage', (n) => { stopPlay(); set42(n); });
  function set42(n) {
    st42.n = n; mark42(n);
    $('s42v').textContent = `stage ${n}`; $('c42s').textContent = n;
    $('r42a').textContent = fmt(3 * Math.pow(4, n));
    $('r42b').textContent = n === 0 ? '1' : `1/${fmt(Math.pow(3, n))}`;
    $('r42c').innerHTML = `${(3 * Math.pow(4 / 3, n)).toFixed(3)} <small>sides of the triangle</small>`;
    $('r42d').innerHTML = `${(1 + 0.6 * (1 - Math.pow(4 / 9, n))).toFixed(4)} <small>× triangle, → 1.6</small>`;
    $('c42').setAttribute('aria-label', `Koch island at stage ${n}, ${fmt(3 * Math.pow(4, n))} sides`);
    f42.draw();
  }
  function stopPlay() { clearTimeout(st42.timer); st42.timer = 0; $('play42').textContent = 'Grow it'; }
  $('play42').addEventListener('click', () => {
    if (st42.timer) { stopPlay(); return; }
    $('play42').textContent = 'Stop';
    let n = 0;
    const tick = () => { set42(n); n++; if (n <= 7) st42.timer = setTimeout(tick, reduceMotion ? 900 : 700); else stopPlay(); };
    tick();
  });
  $('new42').addEventListener('change', (e) => { st42.showNew = e.target.checked; f42.draw(); });

  // ---------- the chord to a corner ----------
  const stTan = { u: 0 };
  const TAN_SAMPLES = (() => {
    const out = [];
    for (let i = 0; i <= 400; i++) { const p = kochPoint(Math.pow(4, -i / 100)); out.push(-Math.atan2(p[1], p[0]) * 180 / Math.PI); }
    return out;
  })();
  const ftan = figure($('ctan'), () => {
    const f = ftan, c = f.ctx;
    paper(f, PRINT.paper);
    const u = stTan.u, P = kochPoint(Math.pow(4, -u)), dist = Math.hypot(P[0], P[1]);
    const rho = Math.min(f.w * 0.62, f.h * 0.9);
    const v = { s: rho / dist, ox: f.w * 0.16, oy: f.h * 0.4 };
    toWorld(f, v);
    // the 30° wedge the chord stays in
    c.fillStyle = PRINT.accentSoft;
    c.beginPath(); c.moveTo(0, 0);
    c.arc(0, 0, dist * 1.25, 0, -Math.PI / 6, true); c.closePath(); c.fill();
    // the island near the corner
    c.fillStyle = PRINT.ink; c.fill(polyPath(adaptiveKoch(v, f)));
    // the chord, with a paper halo so it reads over the land
    c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    const X = (x) => v.ox + x * v.s, Y = (y) => v.oy - y * v.s;
    c.lineCap = 'round';
    c.strokeStyle = PRINT.paper; c.lineWidth = 5; c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(P[0]), Y(P[1])); c.stroke();
    c.strokeStyle = PRINT.accent; c.lineWidth = 2; c.stroke();
    c.fillStyle = PRINT.accent; c.beginPath(); c.arc(X(P[0]), Y(P[1]), 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = PRINT.ink; c.strokeStyle = PRINT.paper; c.lineWidth = 2;
    c.beginPath(); c.arc(X(0), Y(0), 5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.font = '600 12px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
    c.fillStyle = PRINT.muted; c.textBaseline = 'middle';
    c.fillText('corner', X(0) - 6 - c.measureText('corner').width, Y(0));
    c.fillText('0°', X(dist * 1.28), Y(0));
    c.fillText('30°', X(dist * 1.28 * Math.cos(Math.PI / 6)), Y(-dist * 1.28 * Math.sin(Math.PI / 6)));
  });
  function drawTanPlot() {
    const svg = $('tanPlot'), W = 360, H = 150, ml = 34, mr = 10, mt = 10, mb = 30;
    const X = (u) => ml + (u / 4) * (W - ml - mr), Y = (a) => mt + (a / 30) * (H - mt - mb);
    let s = '';
    for (const a of [0, 15, 30]) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(a)}" y2="${Y(a)}" stroke="#c9c8c2"/><text x="${ml - 5}" y="${Y(a) + 3.5}" text-anchor="end">${a}°</text>`;
    ['×1', '×3', '×9', '×27', '×81'].forEach((t, i) => { s += `<line x1="${X(i)}" x2="${X(i)}" y1="${mt}" y2="${H - mb}" stroke="#c9c8c2"/><text x="${X(i)}" y="${H - mb + 13}" text-anchor="middle">${t}</text>`; });
    s += `<text x="${(ml + W - mr) / 2}" y="${H - 3}" text-anchor="middle">how many times closer to the corner</text>`;
    let p = '';
    TAN_SAMPLES.forEach((a, i) => { p += (i ? 'L' : 'M') + X(i / 100).toFixed(1) + ' ' + Y(a).toFixed(1); });
    s += `<path d="${p}" fill="none" stroke="#151515" stroke-width="1.3" stroke-linejoin="round"/>`;
    const a = TAN_SAMPLES[Math.round(stTan.u * 100)];
    s += `<line x1="${X(stTan.u)}" x2="${X(stTan.u)}" y1="${mt}" y2="${H - mb}" stroke="#2f5f9e"/><circle cx="${X(stTan.u)}" cy="${Y(a)}" r="4" fill="#2f5f9e" stroke="#ecebe6" stroke-width="2"/>`;
    svg.innerHTML = s;
  }
  function setTan(u) {
    stTan.u = u;
    const P = kochPoint(Math.pow(4, -u)), d = Math.hypot(P[0], P[1]), a = -Math.atan2(P[1], P[0]) * 180 / Math.PI;
    $('tanv').textContent = `distance ${d >= 0.01 ? d.toFixed(3) : d.toExponential(2)}`;
    $('tana').textContent = `${a.toFixed(1)}°`;
    drawTanPlot(); ftan.draw();
  }
  $('tan').addEventListener('input', (e) => setTan(+e.target.value / 100));

  // ====================== Plate 43 ======================
  const st43 = { k: 0, lim: false };
  const A0 = shoelace(kochPoly(0));
  const f43 = figure($('c43'), () => {
    paper(f43, PRINT.sea);
    const v = fit(f43, SNOW, 0.06);
    toWorld(f43, v);
    const outer = tentOut(kochPoly(st43.k)), inner = tentIn(outer);
    f43.ctx.fillStyle = PRINT.swamp; f43.ctx.fill(polyPath(outer));
    f43.ctx.fillStyle = PRINT.ink; f43.ctx.fill(polyPath(inner));
    if (st43.lim) {
      f43.ctx.strokeStyle = PRINT.accent; f43.ctx.lineWidth = 1.3 / v.s; f43.ctx.lineJoin = 'round';
      f43.ctx.stroke(polyPath(kochPoly(7)));
    }
  });
  const mark43 = stepButtons($('s43'), [0, 1, 2, 3, 4, 5, 6], 'Stage', (k) => set43(k));
  function set43(k) {
    st43.k = k; mark43(k);
    $('s43v').textContent = `stage ${k}`; $('c43s').textContent = k;
    const outer = tentOut(kochPoly(k)), inner = tentIn(outer);
    const swamp = (shoelace(outer) - shoelace(inner)) / A0, land = shoelace(inner) / A0;
    $('r43a').innerHTML = `${swamp < 0.001 ? swamp.toExponential(2) : swamp.toFixed(4)} <small>× triangle</small>`;
    $('r43b').innerHTML = `${land.toFixed(4)} <small>× triangle</small>`;
    $('r43c').textContent = fmt(inner.length / 2); $('r43d').textContent = fmt(outer.length / 2);
    $('c43').setAttribute('aria-label', `Cesàro construction at stage ${k}: land with ${fmt(inner.length / 2)} sides inside swamp with ${fmt(outer.length / 2)} sides, in the sea`);
    f43.draw();
  }
  $('lim43').addEventListener('change', (e) => { st43.lim = e.target.checked; f43.draw(); });

  // ====================== Plate 44 ======================
  const st44 = { b: 5, depth: 1, anim: 0 };
  const NS = 'http://www.w3.org/2000/svg';
  const ss = $('ss');
  // layout in SVG units: interval top-left, square top-right, Koch curve along the bottom
  const KX0 = 40, KX1 = 600, KY = 430;                  // the Koch curve's base, bumps upward
  function kochCurvePts(level) {
    let P = [[0, 0], [1, 0]];
    for (let k = 0; k < level; k++) {
      const Q = [P[0]];
      for (let i = 0; i < P.length - 1; i++) {
        const [ax, ay] = P[i], [bx, by] = P[i + 1], vx = (bx - ax) / 3, vy = (by - ay) / 3;
        Q.push([ax + vx, ay + vy], [ax + vx + (0.5 * vx - (S3 / 2) * vy), ay + vy + ((S3 / 2) * vx + 0.5 * vy)], [ax + 2 * vx, ay + 2 * vy], [bx, by]);
      }
      P = Q;
    }
    return P;
  }
  const KPTS = kochCurvePts(6);                          // 4,096 steps
  const toSvg = ([x, y]) => [KX0 + x * (KX1 - KX0), KY - y * (KX1 - KX0)];
  function draw44() {
    clearInterval(st44.anim);
    ss.textContent = '';
    const g = (tag, attrs, parent = ss) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
    const b = st44.b;
    // interval
    const ix0 = 40, ix1 = 290, iy = 70;
    g('line', { class: 'dim-ink', x1: ix0, y1: iy, x2: ix1, y2: iy });
    for (let i = 0; i <= b; i++) { const x = ix0 + (ix1 - ix0) * i / b; g('line', { class: 'dim-ink', x1: x, y1: iy - 8, x2: x, y2: iy + 8 }); }
    g('text', { x: ix0, y: iy + 32 }).textContent = `${b} pieces, each 1/${b}`;
    // square
    const sx0 = 380, sy0 = 20, side = 220;
    for (let i = 0; i < b; i++) for (let j = 0; j < b; j++) g('rect', { class: 'cell', x: sx0 + side * i / b, y: sy0 + side * j / b, width: side / b, height: side / b });
    g('text', { x: sx0, y: sy0 + side + 20 }).textContent = `${b * b} squares, each 1/${b} on a side`;
    // Koch curve, cut into 4^depth pieces
    const d = st44.depth, nP = Math.pow(4, d), per = (KPTS.length - 1) / nP;
    for (let p = 0; p < nP; p++) {
      let s = '';
      for (let i = p * per; i <= (p + 1) * per; i++) { const [x, y] = toSvg(KPTS[i]); s += (i === p * per ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2); }
      // a wide invisible stroke makes each thin piece easy to hit with a mouse or a finger
      const e = g('g', { class: 'pc', tabindex: 0, role: 'button', 'aria-label': `Piece ${p + 1} of ${nP}. Activate to enlarge it ${Math.pow(3, d)} times.` });
      g('path', { class: 'hit', d: s }, e);
      g('path', { class: 'piece' + (p % 2 ? ' alt' : ''), d: s }, e);
      e.addEventListener('click', () => enlarge(p));
      e.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); enlarge(p); } });
    }
    g('text', { x: KX0, y: KY + 26 }).textContent = `${nP} pieces, each 1/${Math.pow(3, d)} as large`;
    // formulas
    const D = Math.log(4) / Math.log(3);
    $('f44').innerHTML = '';
    const row = (name, txt) => { const r = document.createElement('div'); const bb = document.createElement('b'); bb.textContent = name; const t = document.createElement('span'); t.textContent = txt; r.append(bb, t); $('f44').append(r); };
    row('Interval', `N = ${b}, r = 1/${b}: log ${b} / log ${b} = 1`);
    row('Square', `N = ${b * b}, r = 1/${b}: log ${b * b} / log ${b} = 2`);
    row('Koch curve', `N = ${nP}, r = 1/${Math.pow(3, d)}: log ${nP} / log ${Math.pow(3, d)} = ${D.toFixed(5)}`);
    $('b44v').textContent = b; $('k44v').textContent = `into ${nP} pieces`;
  }
  function enlarge(p) {
    clearInterval(st44.anim);
    ss.querySelectorAll('.ghost').forEach((e) => e.remove());
    const d = st44.depth, nP = Math.pow(4, d), per = (KPTS.length - 1) / nP;
    let s = '';
    for (let i = p * per; i <= (p + 1) * per; i++) { const [x, y] = toSvg(KPTS[i]); s += (i === p * per ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2); }
    const ghost = document.createElementNS(NS, 'path');
    ghost.setAttribute('class', 'ghost'); ghost.setAttribute('d', s); ss.append(ghost);
    // similarity taking the piece's ends onto the whole curve's ends, in SVG coordinates
    const [ax, ay] = toSvg(KPTS[p * per]), [bx, by] = toSvg(KPTS[(p + 1) * per]), [px, py] = toSvg(KPTS[0]), [qx, qy] = toSvg(KPTS[KPTS.length - 1]);
    const ux = bx - ax, uy = by - ay, wx = qx - px, wy = qy - py, den = ux * ux + uy * uy;
    const kr = (wx * ux + wy * uy) / den, ki = (wy * ux - wx * uy) / den;
    const mag = Math.hypot(kr, ki), ang = Math.atan2(ki, kr);
    const setT = (t) => {
      const m = Math.pow(mag, t), a = ang * t, cr = m * Math.cos(a), ci = m * Math.sin(a);
      const tx = ax + (px - ax) * t, ty = ay + (py - ay) * t;
      ghost.setAttribute('transform', `matrix(${cr} ${ci} ${-ci} ${cr} ${tx - (cr * ax - ci * ay)} ${ty - (ci * ax + cr * ay)})`);
      ghost.style.strokeWidth = (2.2 / m).toFixed(3);
    };
    $('n44').textContent = `Piece ${p + 1} of ${nP}, enlarged ${Math.pow(3, d)} times, lands exactly on the whole curve.`;
    if (reduceMotion) { setT(1); return; }
    const t0 = performance.now(), dur = 900;
    st44.anim = setInterval(() => {
      const t = Math.min(1, (performance.now() - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setT(e);
      if (t >= 1) clearInterval(st44.anim);
    }, 16);
  }
  const mark44 = stepButtons($('k44'), [1, 2, 3], 'Cut depth', (dd) => { st44.depth = dd; mark44(dd); $('n44').textContent = 'Hausdorff showed this D is also the curve’s Hausdorff dimension. Mandelbrot’s claim is that it matters in natural science too.'; draw44(); });
  $('b44').addEventListener('input', (e) => { st44.b = +e.target.value; draw44(); });

  // ====================== Plate 45 ======================
  const MAX45 = 6;
  const st45 = { n: 4, seq: new Array(MAX45).fill(0), wave: true, round: true, line: false, view: null, userView: false };
  let sweep = null, sweepKey = '';
  function sweepPaths() {
    const key = `${st45.n}|${st45.seq.slice(0, st45.n).join('')}|${st45.round}`;
    if (key === sweepKey) return sweep;
    const sg = sweepSegments(st45.n, st45.seq);
    const line = new Path2D();
    for (let k = 0; k < sg.n; k++) {
      const ax = sg.A[4 * k], ay = sg.A[4 * k + 1], bx = sg.A[4 * k + 2], by = sg.A[4 * k + 3], rev = sg.R[k];
      const sx = rev ? bx : ax, sy = rev ? by : ay, ex = rev ? ax : bx, ey = rev ? ay : by;
      if (k === 0) line.moveTo(sx, sy);
      if (!st45.round) { line.lineTo(ex, ey); continue; }
      // a sixth of a circle on the step, bulging to its copy's own "up" side
      const side = sg.C[k] ? -1 : 1, chx = bx - ax, chy = by - ay, L = Math.hypot(chx, chy);
      const nx = (-chy * side) / L, ny = (chx * side) / L;
      const cx = (ax + bx) / 2 - nx * L * S3 / 2, cy = (ay + by) / 2 - ny * L * S3 / 2;
      const a0 = Math.atan2(sy - cy, sx - cx), a1 = Math.atan2(ey - cy, ex - cx);
      let da = a1 - a0; da -= 2 * Math.PI * Math.round(da / (2 * Math.PI));
      line.arc(cx, cy, L, a0, a0 + da, da < 0);
    }
    const fill = new Path2D(line);
    fill.lineTo(1.3, -0.45); fill.lineTo(-0.3, -0.45); fill.closePath();   // close around the outside of the snowflake
    sweepKey = key; sweep = { line, fill, n: sg.n };
    return sweep;
  }
  const w45 = $('w45');
  const f45 = figure($('c45'), () => draw45());
  function fit45() { const r = SNOW_R * 1.16; st45.view = fit(f45, { x0: SNOW_C[0] - r, x1: SNOW_C[0] + r, y0: SNOW_C[1] - r, y1: SNOW_C[1] + r }, 0.02); st45.view.fit = st45.view.s; st45.userView = false; touch45(); }
  function draw45() {
    if (!st45.view || !st45.userView) fit45();
    const f = f45, c = f.ctx, v = st45.view;
    paper(f, PRINT.paper);
    toWorld(f, v);
    c.fillStyle = PRINT.ink;
    c.beginPath(); c.arc(SNOW_C[0], SNOW_C[1], SNOW_R * 1.11, 0, Math.PI * 2); c.fill();
    const lake = polyPath(adaptiveKoch(v, f));
    c.fillStyle = PRINT.lake; c.fill(lake);
    const sw = sweepPaths();
    if (st45.wave) { c.save(); c.clip(lake); c.fillStyle = PRINT.wave; c.fill(sw.fill, 'nonzero'); c.restore(); }
    if (st45.line) { c.strokeStyle = PRINT.ink; c.lineWidth = 0.9 / v.s; c.lineJoin = 'round'; c.stroke(sw.line); }
    snap.width = f.canvas.width; snap.height = f.canvas.height; snap.getContext('2d').drawImage(f.canvas, 0, 0);
    snapView = { s: v.s, ox: v.ox, oy: v.oy };
    $('c45s').textContent = st45.n; $('c45n').textContent = fmt(sw.n);
  }
  const snap = document.createElement('canvas');
  let snapView = null, raf45 = 0, full45 = 0;
  function quick45() {
    const v = st45.view, k = v.s / snapView.s, c = f45.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PRINT.paper; c.fillRect(0, 0, f45.canvas.width, f45.canvas.height);
    c.drawImage(snap, (v.ox - snapView.ox * k) * f45.dpr, (v.oy - snapView.oy * k) * f45.dpr, snap.width * k, snap.height * k);
  }
  function schedule45() { if (!raf45) raf45 = requestAnimationFrame(() => { raf45 = 0; draw45(); }); }
  function view45() {
    if (!snapView) { schedule45(); return; }
    if (!raf45) raf45 = requestAnimationFrame(() => { raf45 = 0; quick45(); });
    clearTimeout(full45); full45 = setTimeout(schedule45, 160);
  }
  function touch45() { w45.style.touchAction = st45.view && st45.view.s > st45.view.fit * 1.02 ? 'none' : 'pan-y'; }
  function zoom45(px, py, k) {
    const v = st45.view, ns = Math.min(v.fit * 400, Math.max(v.fit * 0.8, v.s * k));
    const wx = (px - v.ox) / v.s, wy = (v.oy - py) / v.s;
    v.s = ns; v.ox = px - wx * ns; v.oy = py + wy * ns;
    st45.userView = true; touch45(); view45();
  }
  function pan45(dx, dy) { st45.view.ox += dx; st45.view.oy += dy; st45.userView = true; view45(); }
  const mark45 = stepButtons($('s45'), [1, 2, 3, 4, 5, 6], 'Sweep stage', (n) => { st45.n = n; mark45(n); $('s45v').textContent = `stage ${n}`; paintSF(); schedule45(); });
  const sfButtons = [];
  for (let k = 0; k < MAX45; k++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', () => { st45.seq[k] ^= 1; paintSF(); schedule45(); });
    $('sf45').append(b); sfButtons.push(b);
  }
  function paintSF() {
    sfButtons.forEach((b, k) => {
      const f = st45.seq[k];
      b.dataset.f = String(f); b.textContent = `${k + 1}: ${f ? 'F' : 'S'}`;
      b.disabled = k >= st45.n;
      b.setAttribute('aria-label', `Stage ${k + 1} uses the ${f ? 'flipped' : 'straight'} generator`);
    });
  }
  $('mix45').addEventListener('click', () => { st45.seq = st45.seq.map(() => (Math.random() < 0.5 ? 1 : 0)); paintSF(); schedule45(); });
  $('allS45').addEventListener('click', () => { st45.seq.fill(0); paintSF(); schedule45(); });
  $('wave45').addEventListener('change', (e) => { st45.wave = e.target.checked; schedule45(); });
  $('round45').addEventListener('change', (e) => { st45.round = e.target.checked; schedule45(); });
  $('line45').addEventListener('change', (e) => { st45.line = e.target.checked; schedule45(); });
  const center45 = () => [f45.w / 2, f45.h / 2];
  $('zin45').addEventListener('click', () => zoom45(...center45(), 1.6));
  $('zout45').addEventListener('click', () => zoom45(...center45(), 1 / 1.6));
  $('zfit45').addEventListener('click', () => { st45.userView = false; schedule45(); });
  const pts = new Map();
  let pinch = null;
  const local = (e) => { const r = w45.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  w45.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.view-tools')) return;
    pts.set(e.pointerId, local(e));
    try { w45.setPointerCapture(e.pointerId); } catch (_) {}
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; }
    w45.classList.add('dragging');
  });
  w45.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), cur = local(e);
    pts.set(e.pointerId, cur);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      pan45(m[0] - pinch.m[0], m[1] - pinch.m[1]);
      if (pinch.d > 0) zoom45(m[0], m[1], d / pinch.d);
      pinch = { d, m };
    } else if (pts.size === 1 && (e.pointerType !== 'touch' || st45.view.s > st45.view.fit * 1.02)) pan45(cur[0] - prev[0], cur[1] - prev[1]);
  });
  const end45 = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) w45.classList.remove('dragging'); };
  w45.addEventListener('pointerup', end45); w45.addEventListener('pointercancel', end45);
  w45.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const [x, y] = local(e); zoom45(x, y, Math.exp(-e.deltaY * 0.0045)); }, { passive: false });
  w45.addEventListener('dblclick', (e) => { if (e.target.closest('.view-tools')) return; const [x, y] = local(e); zoom45(x, y, e.shiftKey ? 0.5 : 2); });

  // ---------- boot ----------
  set42(2);
  setTan(0);
  set43(0);
  mark44(1); draw44();
  mark45(4); paintSF();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ftan.draw());
})();
