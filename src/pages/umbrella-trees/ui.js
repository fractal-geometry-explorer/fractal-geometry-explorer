// Wiring for the umbrella-tree page: the plate reproduction, the grow-your-own tree
// with r held at the self-contact threshold, and the tips-against-branches figure.
const fmt4 = (x) => x.toFixed(4);

// ---------- Plate 155 ----------
const plateState = { focus: null };            // null = all five
const plateSegs = PLATE.map((t) => treeSegs(t.theta * DEG, rCrit(t.theta), t.L, t.x, t.y, t.phi, t.depth));
const plateBB = (() => {
  const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const segs of plateSegs) for (const s of segs) {
    bb.x0 = Math.min(bb.x0, s[0], s[2]); bb.x1 = Math.max(bb.x1, s[0], s[2]);
    bb.y0 = Math.min(bb.y0, s[1], s[3]); bb.y1 = Math.max(bb.y1, s[1], s[3]);
  }
  return bb;
})();
const treeBB = plateSegs.map((segs) => {
  const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const s of segs) {
    bb.x0 = Math.min(bb.x0, s[0], s[2]); bb.x1 = Math.max(bb.x1, s[0], s[2]);
    bb.y0 = Math.min(bb.y0, s[1], s[3]); bb.y1 = Math.max(bb.y1, s[1], s[3]);
  }
  return bb;
});
const vP = zoomable('wP', 'cP', (f) => fitBox(f, plateState.focus === null ? plateBB : treeBB[plateState.focus], 0.05), (f, v) => {
  paper(f, PRINT.paper);
  toWorld(f, v);
  const lw = 1.15 / v.s;
  plateSegs.forEach((segs, i) => {
    const dimmed = plateState.focus !== null && plateState.focus !== i;
    f.ctx.strokeStyle = dimmed ? PRINT.faint : PRINT.ink;
    f.ctx.lineWidth = lw; f.ctx.lineCap = 'round';
    for (const p of chunked(segs.length, (path, k) => { const s = segs[k]; path.moveTo(s[0], s[1]); path.lineTo(s[2], s[3]); }, 2048)) f.ctx.stroke(p);
  });
  toScreen(f);
});
function pickPlate(i) {
  plateState.focus = i;
  const bs = [...document.querySelectorAll('#treesP button')];
  bs.forEach((b, k) => b.setAttribute('aria-pressed', String((i === null ? 0 : i + 1) === k)));
  const t = i === null ? null : PLATE[i];
  $('rPt').textContent = t ? t.theta + '°' : '20° – 200°';
  $('rPr').textContent = t ? fmt4(rCrit(t.theta)) : '—';
  $('rPd').textContent = t ? fmt4(dimOf(rCrit(t.theta))) : '1.02 – 1.64';
  $('rPs').textContent = t ? fmt(plateSegs[i].length) + ' segments, ' + t.depth + ' levels' : fmt(plateSegs.reduce((s, g) => s + g.length, 0)) + ' segments';
  $('cPt').textContent = t ? 'θ = ' + t.theta + '° (' + t.label + ')' : 'The five trees as printed';
  vP.refit();
}
(() => {
  const row = $('treesP');
  const all = document.createElement('button');
  all.type = 'button'; all.textContent = 'All five'; all.setAttribute('aria-label', 'All five trees, as printed');
  all.addEventListener('click', () => pickPlate(null));
  row.append(all);
  PLATE.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = 'θ = ' + t.theta + '°';
    b.setAttribute('aria-label', 'Tree with inter-branch angle ' + t.theta + ' degrees, ' + t.label);
    b.addEventListener('click', () => pickPlate(i));
    row.append(b);
  });
})();
$('plate155').addEventListener('click', () => pickPlate(null));

// ---------- Grow a tree at the threshold ----------
const grow = { theta: 150, lock: true, r: rCrit(150), depth: 9, trunk: false };
function growSegs() {
  return treeSegs(grow.theta * DEG, grow.r, 1, 0, 0, Math.PI / 2, grow.depth);
}
let gSegs = growSegs();
const growBB = () => {
  const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const s of gSegs) {
    bb.x0 = Math.min(bb.x0, s[0], s[2]); bb.x1 = Math.max(bb.x1, s[0], s[2]);
    bb.y0 = Math.min(bb.y0, s[1], s[3]); bb.y1 = Math.max(bb.y1, s[1], s[3]);
  }
  if (grow.trunk) bb.y0 = Math.min(bb.y0, -1 / grow.r);
  return bb;
};
const vG = zoomable('wG', 'cG', (f) => fitBox(f, growBB(), 0.06), (f, v) => {
  paper(f, PRINT.paper);
  toWorld(f, v);
  const lw = 1.2 / v.s;
  f.ctx.lineCap = 'round';
  if (grow.trunk) {
    f.ctx.strokeStyle = PRINT.gray; f.ctx.lineWidth = lw;
    const p = new Path2D(); p.moveTo(0, 0); p.lineTo(0, -1 / grow.r); f.ctx.stroke(p);
  }
  f.ctx.strokeStyle = PRINT.ink; f.ctx.lineWidth = lw;
  for (const p of chunked(gSegs.length, (path, k) => { const s = gSegs[k]; path.moveTo(s[0], s[1]); path.lineTo(s[2], s[3]); }, 2048)) f.ctx.stroke(p);
  toScreen(f);
});
function growRead() {
  const D = dimOf(grow.r);
  $('sGtv').textContent = 'θ = ' + grow.theta + '°';
  const over = !grow.lock && grow.r > rCrit(grow.theta) + 1e-4;
  $('sGrv').textContent = 'r = ' + fmt4(grow.r) + (grow.lock ? ' (threshold)' : over ? ' — overlaps itself' : '');
  $('rGr').textContent = fmt4(grow.r);
  $('rGd').textContent = fmt4(D);
  $('rGw').textContent = fmt4(Math.max(1, D));
  $('rGl').textContent = grow.r < 0.5 ? fmt4(2 / (1 - 2 * grow.r)) + ' × the first branch' : 'infinite';
  $('cGs').textContent = fmt(gSegs.length);
  $('rG').value = grow.r;
}
function growDraw(full) {
  gSegs = growSegs();
  growRead();
  drawCurve();
  if (full) vG.refit(); else vG.schedule();
}
// a coarse pass while the slider moves, the full depth shortly after it settles
let growTimer = 0;
function nudgeGrow(refit) {
  const want = grow.depth;
  grow.depth = Math.min(want, 9);
  growDraw(refit);
  grow.depth = want;
  clearTimeout(growTimer);
  growTimer = setTimeout(() => growDraw(false), 170);
}
$('tG').addEventListener('input', () => {
  grow.theta = Number($('tG').value);
  if (grow.lock) grow.r = rCrit(grow.theta);
  nudgeGrow(true);
});
$('rG').addEventListener('input', () => {
  if (grow.lock) return;
  grow.r = Number($('rG').value);
  nudgeGrow(true);
});
$('lockG').addEventListener('change', () => {
  grow.lock = $('lockG').checked;
  $('rG').disabled = grow.lock;
  if (grow.lock) { grow.r = rCrit(grow.theta); nudgeGrow(true); } else growRead();
});
$('trunkG').addEventListener('change', () => { grow.trunk = $('trunkG').checked; growDraw(true); });
const markDepth = stepButtons($('dG'), [6, 7, 8, 9, 10, 11, 12, 13], (v) => String(v), (v) => v + ' levels', (v) => {
  grow.depth = v; markDepth(v); growDraw(false);
});
markDepth(grow.depth);
for (const [id, th] of [['g120', 120], ['g180', 180], ['g200', 200]]) {
  $(id).addEventListener('click', () => {
    grow.theta = th; $('tG').value = th;
    if (!grow.lock) { grow.lock = true; $('lockG').checked = true; $('rG').disabled = true; }
    grow.r = rCrit(th);
    nudgeGrow(true);
  });
}

// the critical curve D(theta), computed point by point in idle time
const curve = [];                     // [thetaDeg, Dcrit]
const CURVE_T0 = 8, CURVE_T1 = 270, CURVE_STEP = 2;
const fCurve = figure($('cCurve'), () => drawCurve());
function drawCurve() {
  const f = fCurve, c = f.ctx;
  paper(f, PRINT.paper);
  c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  const mL = 34, mR = 8, mT = 8, mB = 22;
  const X = (th) => mL + (th - CURVE_T0) / (CURVE_T1 - CURVE_T0) * (f.w - mL - mR);
  const Y = (D) => mT + (2.05 - D) / (2.05 - 0.95) * (f.h - mT - mB);
  c.strokeStyle = PRINT.rule; c.lineWidth = 1; c.font = '10px ' + getComputedStyle(document.body).getPropertyValue('--f-mono');
  c.fillStyle = PRINT.muted; c.textAlign = 'center';
  for (const th of [45, 90, 135, 180, 225, 270]) {
    c.beginPath(); c.moveTo(X(th), mT); c.lineTo(X(th), f.h - mB); c.stroke();
    c.fillText(th + '°', X(th), f.h - 8);
  }
  c.textAlign = 'right';
  for (const D of [1, 1.5, 2]) {
    c.beginPath(); c.moveTo(mL, Y(D)); c.lineTo(f.w - mR, Y(D)); c.stroke();
    c.fillText(D.toFixed(1), mL - 5, Y(D) + 3);
  }
  if (curve.length > 1) {
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.6; c.beginPath();
    curve.forEach(([th, D], i) => { if (i) c.lineTo(X(th), Y(D)); else c.moveTo(X(th), Y(D)); });
    c.stroke();
  }
  // the five printed trees, and the two landmarks
  c.fillStyle = PRINT.red;
  for (const t of PLATE) { c.beginPath(); c.arc(X(t.theta), Y(dimOf(rCrit(t.theta))), 3.4, 0, 2 * Math.PI); c.fill(); }
  c.fillStyle = PRINT.accent;
  for (const th of [120, 180]) { c.beginPath(); c.arc(X(th), Y(dimOf(rCrit(th))), 3, 0, 2 * Math.PI); c.fill(); }
  // the slider's tree
  const D = dimOf(grow.r);
  if (D >= 0.95 && D <= 2.05) {
    c.strokeStyle = PRINT.accent; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(X(grow.theta), mT); c.lineTo(X(grow.theta), f.h - mB); c.stroke();
  }
}
(() => {
  let th = CURVE_T0;
  const step = () => {
    const stop = performance.now() + 12;
    while (th <= CURVE_T1 && performance.now() < stop) { curve.push([th, dimOf(rCrit(th))]); th += CURVE_STEP; }
    drawCurve();
    if (th <= CURVE_T1) setTimeout(step, 40);
  };
  setTimeout(step, 200);
})();

// ---------- Tips against branches ----------
const parts = { theta: 150, show: 'both', depth: 9, tipDepth: 13 };
let tSegs = [], tTips = new Float64Array(0);
function partsBuild() {
  const r = rCrit(parts.theta);
  tSegs = treeSegs(parts.theta * DEG, r, 1, 0, 0, Math.PI / 2, parts.depth);
  tTips = treeTips(parts.theta * DEG, r, 1, 0, 0, Math.PI / 2, parts.tipDepth);
  $('rTt').textContent = fmt4(dimOf(r));
  $('rTw').textContent = fmt4(Math.max(1, dimOf(r)));
}
partsBuild();
const vT = zoomable('wT', 'cT', (f) => {
  const bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const s of tSegs) {
    bb.x0 = Math.min(bb.x0, s[0], s[2]); bb.x1 = Math.max(bb.x1, s[0], s[2]);
    bb.y0 = Math.min(bb.y0, s[1], s[3]); bb.y1 = Math.max(bb.y1, s[1], s[3]);
  }
  return fitBox(f, bb, 0.06);
}, (f, v) => {
  paper(f, PRINT.paper);
  toWorld(f, v);
  if (parts.show !== 'tips') {
    f.ctx.strokeStyle = parts.show === 'both' ? PRINT.gray : PRINT.ink;
    f.ctx.lineWidth = 1.1 / v.s; f.ctx.lineCap = 'round';
    for (const p of chunked(tSegs.length, (path, k) => { const s = tSegs[k]; path.moveTo(s[0], s[1]); path.lineTo(s[2], s[3]); }, 2048)) f.ctx.stroke(p);
  }
  if (parts.show !== 'tree') {
    const rad = 0.8 / v.s;
    f.ctx.fillStyle = parts.show === 'both' ? PRINT.red : PRINT.ink;
    for (const p of chunked(tTips.length / 2, (path, k) => {
      path.moveTo(tTips[2 * k] + rad, tTips[2 * k + 1]);
      path.arc(tTips[2 * k], tTips[2 * k + 1], rad, 0, 2 * Math.PI);
    }, 2048)) f.ctx.fill(p);
  }
  toScreen(f);
});
const markTTheta = stepButtons($('tT'), [36, 60, 150, 200], (v) => v + '°', (v) => 'Inter-branch angle ' + v + ' degrees', (v) => {
  parts.theta = v; markTTheta(v); partsBuild(); vT.refit();
});
markTTheta(parts.theta);
const SHOWS = [['both', 'Branches and tips'], ['tree', 'Branches only'], ['tips', 'Tips only']];
const markShow = stepButtons($('mT'), SHOWS.map((s) => s[0]), (v) => SHOWS.find((s) => s[0] === v)[1], (v) => SHOWS.find((s) => s[0] === v)[1], (v) => {
  parts.show = v; markShow(v); vT.schedule();
});
markShow(parts.show);

// ---------- minis and first paint ----------
(() => {
  // the construction in two small figures: one fork, then two levels
  const th = 60 * DEG, r = rCrit(60);
  const seg = (x0, y0, a, l) => [x0, y0, x0 + l * Math.cos(a), y0 + l * Math.sin(a)];
  const one = [seg(0.5, -0.62, Math.PI / 2 - th / 2, 0.55), seg(0.5, -0.62, Math.PI / 2 + th / 2, 0.55)];
  const lines = (segs, w) => segs.map((s) => `<line x1="${s[0].toFixed(4)}" y1="${(-s[1]).toFixed(4)}" x2="${s[2].toFixed(4)}" y2="${(-s[3]).toFixed(4)}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`).join('');
  $('miniFork').innerHTML = lines(one, 0.03) +
    `<path d="M ${(0.5 + 0.22 * Math.cos(Math.PI / 2 + th / 2)).toFixed(3)} ${(0.62 - 0.22 * Math.sin(Math.PI / 2 + th / 2)).toFixed(3)} A 0.22 0.22 0 0 1 ${(0.5 + 0.22 * Math.cos(Math.PI / 2 - th / 2)).toFixed(3)} ${(0.62 - 0.22 * Math.sin(Math.PI / 2 - th / 2)).toFixed(3)}" fill="none" stroke="${PRINT.accent}" stroke-width="0.02"/>` +
    `<text x="0.5" y="${(0.62 - 0.33).toFixed(3)}" fill="${PRINT.accent}" font-size="0.14" text-anchor="middle" font-family="inherit">θ</text>`;
  const deep = treeSegs(th, r, 0.5, 0.5, -0.95, Math.PI / 2, 4).map((s) => [s[0], s[1], s[2], s[3]]);
  $('miniLevels').innerHTML = lines(deep, 0.016);
  pickPlate(null);
  growRead();
})();
