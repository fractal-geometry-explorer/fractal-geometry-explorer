// Chapter 40 has no plates: the one figure is this timeline of the six sketched lives,
// set entirely from dates and ages printed in the chapter. Years computed from an age
// the chapter gives (rather than a printed year) carry a: 1 and show as ≈.
const LIVES = [
  { id: 'bachelier', name: 'BACHELIER', born: 1870, died: 1946, events: [
    { y: 1900, t: 'defends "Mathematical theory of speculation" in Paris; the grade is a near-insulting mention honorable' },
    { y: 1913, t: 'the Annales paper that constructs the Wiener function before Wiener — with one fatal scaling error' },
    { y: 1928, a: 1, t: 'blackballed at Dijon after Lévy confirms the error' },
    { y: 1960, a: 1, p: 1, t: 'the 1900 thesis receives an English translation, sixty years after its defense' },
  ] },
  { id: 'fournier', name: "FOURNIER D'ALBE", born: 1868, died: 1933, events: [
    { y: 1907, t: 'Two New Worlds: galaxy clustering stated precisely enough to yield D = 1' },
  ] },
  { id: 'hurst', name: 'HURST', born: 1880, died: 1978, events: [
    { y: 1906, t: 'goes to Egypt for a short stay; it lasts 62 years' },
    { y: 1951, a: 1, t: 'reads the first long paper on R/S and the Nile, at 71' },
    { y: 1955, a: 1, t: 'reads the second, at 75; the discovery is finally recognized' },
  ] },
  { id: 'levy', name: 'LÉVY', born: 1886, died: 1971, events: [
    { y: 1904, t: 'a 19-year-old student rediscovers the Fournier universe, and finds it too simple to publish' },
    { y: 1926, a: 1, t: 'asked for a lecture on errors in gun fire, near 40; probability begins' },
    { y: 1936, a: 1, t: 'first major book, at 50' },
    { y: 1946, a: 1, t: 'second major book, at 60' },
    { y: 1965, a: 1, t: "occupies Poincaré's seat at the Académie des Sciences, when nearly 80" },
  ] },
  { id: 'richardson', name: 'RICHARDSON', born: 1881, died: 1953, events: [
    { y: 1922, t: 'Weather Prediction by Numerical Process; disreputable for twenty years, then a classic' },
    { y: 1926, t: '"Does the wind possess a velocity?" — diffusion studied without one' },
    { y: 1928, a: 1, t: 'doctorate at 47, in mathematical psychology, sitting beside his own pupils' },
    { y: 1961, p: 1, t: 'the posthumous coastline paper that helped start the Essay' },
  ] },
  { id: 'zipf', name: 'ZIPF', born: 1902, died: 1950, events: [
    { y: 1949, t: 'Human Behavior and the Principle of Least Effort, apparently at his own expense' },
  ] },
];

const T = { mode: 'year', hover: null };   // hover: { pi, ei } or { row: pi }
const hits = { dots: [], rows: [] };

const span = (mode) => (mode === 'year' ? [1862, 1986] : [-3, 97]);
const ex = (p, e) => (T.mode === 'year' ? e.y : e.y - p.born);

function drawTimeline() {
  const c = fT.ctx;
  paper(fT, PRINT.paper);
  toScreen(fT);
  const L = 14, R = 18, TOP = 14, BOT = 34;
  const w = fT.w - L - R, h = fT.h - TOP - BOT;
  const [x0, x1] = span(T.mode);
  const X = (v) => L + ((v - x0) / (x1 - x0)) * w;

  // axis: faint decade lines, labelled every 20
  c.textAlign = 'center'; c.textBaseline = 'top';
  const step = 10, lo = Math.ceil(x0 / step) * step;
  for (let v = lo; v <= x1; v += step) {
    const x = X(v);
    c.strokeStyle = PRINT.rule; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, TOP); c.lineTo(x, TOP + h); c.stroke();
    if (v % 20 === 0) {
      c.fillStyle = PRINT.muted; c.font = '500 10.5px "IBM Plex Mono", monospace';
      c.fillText(T.mode === 'age' && v === 0 ? 'age 0' : String(v), x, TOP + h + 8);
    }
  }

  hits.dots.length = 0; hits.rows.length = 0;
  const rowH = h / LIVES.length;
  LIVES.forEach((p, pi) => {
    const yMid = TOP + rowH * (pi + 0.68);
    const bx0 = X(T.mode === 'year' ? p.born : 0), bx1 = X(T.mode === 'year' ? p.died : p.died - p.born);
    const hot = T.hover && (T.hover.row === pi || T.hover.pi === pi);
    // life bar
    c.fillStyle = hot ? PRINT.accent : PRINT.ink;
    c.fillRect(bx0, yMid - 3.5, bx1 - bx0, 7);
    // name
    c.fillStyle = hot ? PRINT.accent : PRINT.ink;
    c.font = '600 11px "Schibsted Grotesk", Arial, sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const label = `${p.name} · ${p.born}–${p.died}`;
    c.fillText(label, bx0, yMid - 10);
    const lw = c.measureText(label).width;
    hits.rows.push({ pi, x0: bx0, x1: Math.max(bx1, bx0 + lw), y0: yMid - 22, y1: yMid + 8 });
    // events
    p.events.forEach((e, ei) => {
      const x = X(ex(p, e));
      const on = T.hover && T.hover.pi === pi && T.hover.ei === ei;
      c.beginPath(); c.arc(x, yMid, on ? 6 : 4.5, 0, Math.PI * 2);
      if (e.p) { c.fillStyle = PRINT.paper; c.fill(); c.strokeStyle = PRINT.red; c.lineWidth = 2; c.stroke(); }
      else { c.fillStyle = PRINT.red; c.fill(); c.strokeStyle = PRINT.paper; c.lineWidth = 1.2; c.stroke(); }
      if (on) { c.beginPath(); c.arc(x, yMid, 9, 0, Math.PI * 2); c.strokeStyle = PRINT.accent; c.lineWidth = 1.5; c.stroke(); }
      hits.dots.push({ pi, ei, x, y: yMid });
    });
  });
}

const fT = figure($('cT'), () => drawTimeline());

// ---------- hover, tap, and the readline ----------
const INFO0 = 'Hover or tap a red mark to read the event it records. An open mark is posthumous.';
function infoText(hv) {
  if (!hv || hv.pi === undefined) return INFO0;
  const p = LIVES[hv.pi], e = p.events[hv.ei], name = p.name.charAt(0) + p.name.slice(1).toLowerCase();
  const when = e.p ? `${e.y - p.died} years after his death` : `aged ${e.y - p.born}`;
  return `${e.a ? '≈' : ''}${e.y} · ${name}, ${when} — ${e.t}.`;
}
function pick(x, y) {
  for (const d of hits.dots) if (Math.hypot(d.x - x, d.y - y) < 11) return { pi: d.pi, ei: d.ei };
  for (const r of hits.rows) if (x >= r.x0 - 4 && x <= r.x1 + 4 && y >= r.y0 && y <= r.y1) return { row: r.pi };
  return null;
}
const wrapT = $('wT');
const localT = (ev) => { const r = wrapT.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
wrapT.addEventListener('pointermove', (ev) => {
  const [x, y] = localT(ev), hv = pick(x, y);
  const same = JSON.stringify(hv) === JSON.stringify(T.hover);
  $('cT').style.cursor = hv ? 'pointer' : 'default';
  if (!same) { T.hover = hv; $('infoT').textContent = infoText(hv); drawTimeline(); }
});
wrapT.addEventListener('pointerleave', () => {
  if (T.hover) { T.hover = null; $('infoT').textContent = INFO0; drawTimeline(); }
});
wrapT.addEventListener('click', (ev) => {
  const [x, y] = localT(ev), hv = pick(x, y);
  if (hv && hv.row !== undefined) { document.getElementById(LIVES[hv.row].id).scrollIntoView({ behavior: 'smooth' }); return; }
  if (hv) { T.hover = hv; $('infoT').textContent = infoText(hv); drawTimeline(); }
});

// ---------- the time-axis toggle ----------
const CAPS = {
  year: 'Calendar time, 1860s to 1980s. Switch to ages to line the six births up: the red marks drift far to the right, and two fall beyond the end of their own life bar.',
  age: 'All six births aligned at age 0. The red marks crowd the right of each bar — the chapter’s point in one picture — and the two open marks, Bachelier’s translation and Richardson’s coastline paper, lie beyond the life they crown.',
};
const markMode = stepButtons($('mT'), ['year', 'age'],
  (m) => (m === 'year' ? 'Calendar years' : 'Aligned by age'),
  (m) => (m === 'year' ? 'Place the lives on calendar years' : 'Align the lives by age'),
  (m) => {
    T.mode = m; markMode(m);
    $('cTm').textContent = m === 'year' ? 'calendar years' : 'aligned by age';
    $('capT').textContent = CAPS[m];
    drawTimeline();
  });
markMode('year');

// ---------- readouts ----------
{
  let late = 0, post = 0;
  for (const p of LIVES) for (const e of p.events) { if (e.y - p.born > 65) late++; if (e.p) post++; }
  $('rTa').textContent = String(late);
  $('rTb').textContent = String(post);
}
$('infoT').textContent = INFO0;
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawTimeline());
