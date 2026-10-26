// Plate C5: the self-squared dragon. Per-pixel iteration of f(z) = λz(1−z): points whose orbit
// escapes are the black velvet; the rest settle onto the attracting 25-cycle and are coloured by
// which cycle point every 25th iterate converges to (the caption's 25 "stones", 5 genera of 5
// species). The λ values and the colour mapping are documented in DECISIONS.md.
'use strict';

const LAMBDAS = [
  { key: 'plate', re: 1.6461826781, im: 0.9636567466, name: 'the λ fitted to the plate', btn: 'the plate' },
  { key: 'printed', re: 1.64, im: 0.96, name: 'λ = 1.64 + 0.96i exactly', btn: 'as the caption prints it' },
  { key: 'heart', re: 1.6776241726, im: 0.9885488715, name: 'the period-5 heart', btn: 'period-5 heart' },
  { key: 'twin', re: 1.6435993896, im: 1.0096152717, name: 'a neighbouring 25-dragon', btn: 'a sibling dragon' },
];
// genus base colours, matched to the plate: gold on the main body, then the plate's other inks
const GENUS_RGB = [[236, 190, 42], [212, 44, 38], [214, 64, 158], [64, 134, 214], [56, 164, 94]];
const SPECIES_SHADE = [1.14, 0.98, 0.84, 0.7, 0.56];

const dragon = { lam: LAMBDAS[0], mode: 'stones', cyc: null, col: null, maxIter: 1500 };

// the attractor of the critical orbit: null when the critical point escapes
function findCycle(lr, li) {
  let x = 0.5, y = 0;
  for (let i = 0; i < 6000; i++) {
    const ax = x - (x * x - y * y), ay = y - 2 * x * y;       // z(1-z)
    x = lr * ax - li * ay; y = lr * ay + li * ax;
    if (x * x + y * y > 1e8) return null;
  }
  // minimal period, then the cycle in iteration order
  let px = x, py = y, per = 0;
  for (let p = 1; p <= 400; p++) {
    const ax = px - (px * px - py * py), ay = py - 2 * px * py;
    const nx = lr * ax - li * ay, ny = lr * ay + li * ax;
    px = nx; py = ny;
    if ((px - x) * (px - x) + (py - y) * (py - y) < 1e-18) { per = p; break; }
  }
  if (!per) return null;
  const cx = new Float64Array(per), cy = new Float64Array(per);
  let mr = 1, mi = 0;
  for (let k = 0; k < per; k++) {
    cx[k] = x; cy[k] = y;
    const dr = lr * (1 - 2 * x) - li * (-2 * y), di = lr * (-2 * y) + li * (1 - 2 * x);
    const nmr = mr * dr - mi * di; mi = mr * di + mi * dr; mr = nmr;
    const ax = x - (x * x - y * y), ay = y - 2 * x * y;
    const nx = lr * ax - li * ay, ny = lr * ay + li * ax;
    x = nx; y = ny;
  }
  return { per, cx, cy, mult: Math.hypot(mr, mi) };
}

// genus/species layout: the cycle sits on a period-5 satellite, so z_k ≈ z_{k+5} and the 25
// points fall into 5 bunches of 5 by their index mod 5. A genus is a bunch: its five stones'
// cycle points string along one stretch of the dragon and meet at a wasp's waist, matching the
// caption's gold. Gold goes to the bunch that holds the critical point (the big body diamonds);
// the species shade distinguishes the five stones inside a genus.
function cycleColours(cyc) {
  const { per, cx, cy } = cyc;
  const fam = new Int32Array(per), sp = new Int32Array(per);
  let near = 0, nd = Infinity;
  for (let k = 0; k < per; k++) {
    const d = (cx[k] - 0.5) * (cx[k] - 0.5) + cy[k] * cy[k];
    if (d < nd) { nd = d; near = k; }
  }
  for (let k = 0; k < per; k++) {
    const j = (k - near + per) % per;
    fam[k] = j % 5;
    sp[k] = ((j / 5) | 0) % 5;
  }
  return { fam, sp };
}

function dragonSet(key) {
  const L = LAMBDAS.find((l) => l.key === key) || LAMBDAS[0];
  dragon.lam = L;
  dragon.cyc = findCycle(L.re, L.im);
  dragon.col = dragon.cyc ? cycleColours(dragon.cyc) : null;
}

// render the window [view] into the figure, coarse first then full, synchronously
function dragonRender(f, v) {
  const t0 = performance.now();
  const W = Math.max(2, Math.round(f.w)), H = Math.max(2, Math.round(f.h));
  const off = dragonRender.off || (dragonRender.off = document.createElement('canvas'));
  off.width = W; off.height = H;
  const octx = off.getContext('2d');
  const img = octx.createImageData(W, H);
  const data = img.data;
  const { re: lr, im: li } = dragon.lam;
  const cyc = dragon.cyc, col = dragon.col, mode = dragon.mode;
  const per = cyc ? cyc.per : 0;
  const ccx = cyc ? cyc.cx : null, ccy = cyc ? cyc.cy : null;
  const maxIt = dragon.maxIter;
  const esc = 1e8, eps = 1e-8;
  for (let py = 0; py < H; py++) {
    const wy = (v.oy - (py + 0.5)) / v.s;
    for (let px = 0; px < W; px++) {
      const wx = ((px + 0.5) - v.ox) / v.s;
      let x = wx, y = wy, n = 0, cls = -1, escAt = -1;
      while (n < maxIt) {
        if (cyc && n % per === 0) {
          for (let k = 0; k < per; k++) {
            const dx = x - ccx[k], dy = y - ccy[k];
            if (dx * dx + dy * dy < eps) { cls = k; break; }
          }
          if (cls >= 0) break;
        }
        const ax = x - (x * x - y * y), ay = y - 2 * x * y;
        x = lr * ax - li * ay; y = lr * ay + li * ax;
        n++;
        if (x * x + y * y > esc) { escAt = n; break; }
      }
      const o = 4 * (py * W + px);
      let r = 0, g = 0, b = 0;
      if (cls >= 0) {
        if (mode === 'velvet') { r = g = b = 236; }
        else {
          const base = GENUS_RGB[col.fam[cls]];
          const sh = mode === 'genera' ? 1 : SPECIES_SHADE[col.sp[cls]];
          r = Math.min(255, base[0] * sh); g = Math.min(255, base[1] * sh); b = Math.min(255, base[2] * sh);
        }
      } else if (!cyc && escAt > 0 && mode !== 'velvet') {
        // no attractor at this λ: shade the dust by escape time so the ghost of the dragon shows
        const t = Math.min(1, escAt / 60);
        r = g = b = 10 + 120 * t * t;
      }
      data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const c = f.ctx;
  c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  c.imageSmoothingEnabled = true;
  c.drawImage(off, 0, 0, f.w, f.h);
  $('r5d').textContent = `≤ ${maxIt} · ${Math.round(performance.now() - t0)} ms`;
}

const DRAGON_BB = { x0: -0.32, x1: 1.32, y0: -0.8, y1: 0.8 };
const dz = zoomable('wD5', 'cD5', (f) => fitBox(f, DRAGON_BB, 0.02), dragonRender, { maxZoom: 2000 });
dz.z.ground = '#000';

function dragonSync() {
  const L = dragon.lam, cyc = dragon.cyc;
  $('cD5s').textContent = `λ = ${L.re.toFixed(L.key === 'printed' ? 2 : 4)} + ${L.im.toFixed(L.key === 'printed' ? 2 : 4)}i`;
  $('cD5t').textContent = cyc ? 'The dragon' : 'Dust: no stones';
  $('r5a').textContent = cyc ? `period ${cyc.per}` : 'none — escapes';
  $('r5b').textContent = cyc && cyc.per === 25 ? '5 × 5 species' : cyc ? `${cyc.per} stones` : '—';
  $('r5c').textContent = cyc ? `|f′| ≈ ${cyc.mult < 1e-6 ? '0' : cyc.mult.toFixed(4)}` : '—';
  $('info5').innerHTML = cyc
    ? `The critical orbit settles on a <b>period-${cyc.per}</b> cycle; every orbit that does not escape joins it.`
    : `At this λ the critical point itself escapes: the interior is empty, the dragon is a <b>dust</b>, shaded here by escape time.`;
  lamMark(L.key); modeMark(dragon.mode);
  dz.schedule();
}
const lamMark = stepButtons($('lam5'), LAMBDAS.map((l) => l.key), (k) => LAMBDAS.find((l) => l.key === k).btn, (k) => LAMBDAS.find((l) => l.key === k).name,
  (k) => { dragonSet(k); dragonSync(); });
const modeMark = stepButtons($('mode5'), ['stones', 'genera', 'velvet'], (m) => ({ stones: '25 stones', genera: '5 genera', velvet: 'the velvet alone' }[m]), (m) => m,
  (m) => { dragon.mode = m; dragonSync(); });
$('p5').addEventListener('click', () => { dragonSet('plate'); dragon.mode = 'stones'; dz.refit(); dragonSync(); });

dragonSet('plate');
dragonSync();
