(() => {
  const D21 = Math.log(3) / Math.log(Math.sqrt(7));

  // ====================== The controller and the portfolio (pages 201-203) ======================
  const stA = { mode: 'stage', ctl: 'alt', K: 6, seed: 1 };
  const KS_A = [2, 3, 4, 5, 6, 7];
  function stageCurve() {
    const seq = controlSequence(stA.ctl, stA.K, stA.seed);
    return { seq, P: controlledCurve(stA.K, (k) => seq[k]) };
  }
  function pieceCurve(seed) {
    const rnd = mulberry32(seed * 48271 + 3);
    // per-piece coin: hash stage and index through the seeded stream is order-dependent, so
    // draw a fixed table of tosses per stage (enough for 3^k pieces) once per seed
    const tables = [];
    for (let k = 0; k < stA.K; k++) {
      const t = new Uint8Array(Math.pow(3, k) + 1);
      for (let i = 0; i < t.length; i++) t[i] = rnd() < 0.5 ? 0 : 1;
      tables.push(t);
    }
    return controlledCurve(stA.K, (k, i) => tables[k][i]);
  }
  const zA = zoomable('wA', 'cA', (f) => {
    if (stA.mode === 'portfolio') return fitBox(f, { x0: -0.05, x1: 3.35, y0: -1.25, y1: 0.45 }, 0.03);
    return fitBox(f, { x0: -0.05, x1: 1.05, y0: -0.42, y1: 0.42 }, 0.03);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    toWorld(f, v);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (stA.mode === 'portfolio') {
      for (let p = 0; p < 6; p++) {
        const col = p % 3, row = (p - col) / 3;
        const P = pieceCurve(stA.seed + p);
        c.save();
        c.translate(col * 1.15, -row * 0.85);
        c.strokeStyle = PRINT.ink; c.lineWidth = 1.1 / v.s;
        c.stroke(polyPath(P, false));
        c.restore();
      }
      toScreen(f);
      c.font = '500 10.5px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = PRINT.muted;
      for (let p = 0; p < 6; p++) {
        const col = p % 3, row = (p - col) / 3;
        c.fillText(`seed ${stA.seed + p}`, v.ox + (col * 1.15) * v.s, v.oy - (-row * 0.85 + 0.38) * v.s);
      }
      return;
    }
    const { P } = stageCurve();
    c.strokeStyle = PRINT.ink; c.lineWidth = 1.4 / v.s;
    c.stroke(polyPath(P, false));
    toScreen(f);
  });
  const MODES_A = { stage: 'One tape, one curve', portfolio: 'Six pages of the portfolio' };
  const CTLS_A = { allS: 'All S', alt: 'Alternate S, F', pi: 'Digits of π', coin: 'A seeded coin' };
  function setA(refit) {
    markMA(stA.mode); markCA(stA.ctl); markKA(stA.K);
    $('ctlAg').hidden = stA.mode === 'portfolio';
    $('newA').hidden = stA.mode !== 'portfolio' && stA.ctl !== 'coin';
    const seq = controlSequence(stA.ctl, stA.K, stA.seed);
    const word = seq.map((s) => (s ? 'F' : 'S')).join(' ');
    $('cAt').textContent = MODES_A[stA.mode];
    $('cAn').textContent = stA.mode === 'portfolio'
      ? `every piece its own toss · stage ${stA.K} · seeds ${stA.seed}–${stA.seed + 5}`
      : `${CTLS_A[stA.ctl]} → ${word}`;
    $('infoA').innerHTML = stA.mode === 'portfolio'
      ? 'Six seeds, one species: the pages differ in detail but are the same in essentials — the chapter\'s botanical standard for a good random model. A "defective seed" producing an atypical plant is allowed, but must be rare.'
      : 'The controller may read a tape, interpret a compact instruction ("alternate S and F", "use the k-th digit of π"), or toss a seeded coin — the processor below never knows the difference. Each sequence is a different curve of the same D.';
    $('rAa').textContent = stA.mode === 'portfolio' ? 'one toss per piece' : word;
    $('rAb').textContent = stA.mode === 'portfolio' || stA.ctl === 'coin' ? String(stA.seed) : '— (no chance used)';
    $('rAc').textContent = stA.mode === 'portfolio' ? `2^(Σ3ᵏ) at stage ${stA.K}` : `2ᴷ per K stages`;
    $('rAd').textContent = D21.toFixed(4);
    if (refit) zA.refit(); else zA.schedule();
  }
  const markMA = stepButtons($('mA'), Object.keys(MODES_A), (k) => MODES_A[k], (k) => `Show: ${MODES_A[k]}`, (k) => { stA.mode = k; setA(true); });
  const markCA = stepButtons($('ctlA'), Object.keys(CTLS_A), (k) => CTLS_A[k], (k) => `Control sequence: ${CTLS_A[k]}`, (k) => { stA.ctl = k; setA(false); });
  const markKA = stepButtons($('kA'), KS_A, String, (k) => `${k} stages`, (k) => { stA.K = k; setA(false); });
  $('coinA').addEventListener('click', () => { stA.mode = 'stage'; stA.ctl = 'coin'; setA(false); });
  $('newA').addEventListener('click', () => { stA.seed += stA.mode === 'portfolio' ? 6 : 1; setA(false); });

  // ====================== Self-constrained chance (pages 203-204) ======================
  const stB = { mode: 'poly', n: 12, self: 'free', seed: 1 };
  let lastB = { P: null, contacts: 0, tries: 1, failed: false };
  const rateCacheB = {};
  function sampleB() {
    const rnd = mulberry32(stB.seed * 104729 + stB.n * 7 + (stB.self === 'avoid' ? 1 : 0));
    if (stB.self === 'avoid') {
      const r = selfAvoidingPolygon(stB.n, rnd);
      lastB = r ? { P: r.P, contacts: 0, tries: r.tries, failed: false } : { P: randomClosedPolygon(stB.n, rnd), contacts: -1, tries: 20000, failed: true };
      if (lastB.failed) lastB.contacts = selfContacts(lastB.P);
    } else {
      const P = randomClosedPolygon(stB.n, rnd);
      lastB = { P, contacts: selfContacts(P), tries: 1, failed: false };
    }
  }
  function rateB(n) {
    const key = `${n}`;
    if (!(key in rateCacheB)) rateCacheB[key] = acceptanceRate(n, 5, n > 24 ? 1500 : 3000);
    return rateCacheB[key];
  }
  const zB = zoomable('wB', 'cB', (f) => {
    if (stB.mode === 'rate') return fitBox(f, { x0: 0, x1: 1, y0: 0, y1: 1 }, 0);
    const bb = bbox(Float64Array.from(lastB.P.flat()));
    return fitBox(f, { x0: bb.x0 - 1, x1: bb.x1 + 1, y0: bb.y0 - 1, y1: bb.y1 + 1 }, 0.04);
  }, (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    if (stB.mode === 'poly') {
      toWorld(f, v);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const P = lastB.P;
      c.strokeStyle = PRINT.ink; c.lineWidth = 2.2 / v.s;
      c.beginPath(); c.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]);
      c.stroke();
      // mark the self-contacts
      const seen = new Map();
      for (let i = 0; i < P.length - 1; i++) {
        const k = `${P[i][0]},${P[i][1]}`;
        if (seen.has(k)) {
          c.beginPath(); c.arc(P[i][0], P[i][1], 4.5 / v.s, 0, 2 * Math.PI);
          c.fillStyle = PRINT.red; c.fill();
        }
        seen.set(k, 1);
      }
      c.beginPath(); c.arc(P[0][0], P[0][1], 4.5 / v.s, 0, 2 * Math.PI);
      c.fillStyle = PRINT.accent; c.fill();
      toScreen(f);
    } else {
      toScreen(f);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const ns = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const ch = chart(f, { x: { min: 2, max: 13, log: false, label: 'half the sides, n' }, y: { min: 1e-4, max: 1, log: true, label: 'share of draws that are self-avoiding' } });
      ch.clip();
      c.strokeStyle = PRINT.red; c.lineWidth = 1.8; c.beginPath();
      let started = false;
      const pts = [];
      for (const n of ns) {
        const r = rateB(n);
        if (r <= 0) continue;
        pts.push([n, r]);
        if (started) c.lineTo(ch.X(n), ch.Y(r)); else { c.moveTo(ch.X(n), ch.Y(r)); started = true; }
      }
      c.stroke();
      for (const [n, r] of pts) { c.beginPath(); c.arc(ch.X(n), ch.Y(r), 3.5, 0, 2 * Math.PI); c.fillStyle = PRINT.ink; c.fill(); c.strokeStyle = PRINT.paper; c.lineWidth = 1.5; c.stroke(); }
      ch.unclip();
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = PRINT.ink; c.fillText('measured on batches of random closed polygons', ch.ml + 10, ch.mt + 8);
      c.fillStyle = PRINT.red; c.fillText('a roughly geometric collapse;', ch.ml + 10, ch.mt + 24);
      c.fillText('past n = 12 the batches find none at all', ch.ml + 10, ch.mt + 40);
    }
  });
  const MODES_B = { poly: 'A random polygon', rate: 'The price of the constraint' };
  function setB(refit) {
    if (stB.mode === 'poly') sampleB();
    markMB(stB.mode); markSB(stB.self);
    $('selfBg').hidden = stB.mode !== 'poly';
    $('nvB').textContent = `n = ${stB.n}`;
    $('cBt').textContent = MODES_B[stB.mode];
    $('cBn').textContent = stB.mode === 'poly' ? `2n = ${2 * stB.n} sides · seed ${stB.seed}` : 'batches of 1,500–3,000 draws per n';
    $('infoB').innerHTML = stB.mode === 'rate'
      ? 'Rejection is honest but hopeless: to sample one self-avoiding polygon of 2n sides costs on the order of 1/rate draws, and the rate collapses with n. Counting the survivors exactly is the unsolved problem the chapter names.'
      : stB.self === 'avoid'
        ? (lastB.failed ? `<b>Gave up</b> after ${fmt(lastB.tries)} draws without one self-avoiding polygon — the constraint has priced this n out of rejection sampling.` : `This sample needed <b>${fmt(lastB.tries)}</b> draw${lastB.tries === 1 ? '' : 's'}: the controller had to inspect its outcome and start over, the signature of self-constrained chance.`)
        : `Nonconstrained: one pass, no inspection, done. The red dots are the walk's self-contacts${lastB.contacts ? ` — ${lastB.contacts} here` : ' (none this time, by luck)'}, which a coastline forbids.`;
    $('rBa').textContent = String(2 * stB.n);
    $('rBb').textContent = stB.mode === 'rate' ? '—' : String(lastB.contacts);
    $('rBc').textContent = stB.mode === 'rate' ? '≈ 1/rate' : (stB.self === 'avoid' ? (lastB.failed ? `> ${fmt(lastB.tries)}` : fmt(lastB.tries)) : '1');
    const rate = rateB(stB.n);
    $('rBd').textContent = rate > 0 ? `${(100 * rate).toPrecision(2)}% at this n` : 'none in a 1,500-draw batch';
    if (refit) zB.refit(); else zB.schedule();
  }
  const markMB = stepButtons($('mB'), Object.keys(MODES_B), (k) => MODES_B[k], (k) => `Show: ${MODES_B[k]}`, (k) => { stB.mode = k; setB(true); });
  const markSB = stepButtons($('selfB'), ['free', 'avoid'], (k) => (k === 'free' ? 'Any closed polygon' : 'Self-avoiding'), (k) => `Demand: ${k}`, (k) => { stB.self = k; setB(true); });
  $('nsB').addEventListener('input', (e) => { stB.n = +e.target.value; setB(true); });
  $('newB').addEventListener('click', () => { stB.seed++; setB(true); });

  setA(true); setB(true);
})();
