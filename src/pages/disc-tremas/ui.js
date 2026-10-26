(() => {
  const pct = (x) => (x >= 0.1 ? `${(100 * x).toFixed(0)}%` : x >= 0.005 ? `${(100 * x).toFixed(1)}%` : x >= 1e-4 ? `${(100 * x).toFixed(2)}%` : 'under 0.01%');

  // one trema window: a zoomable canvas, a D control, a seed, presets and readouts.
  // cfg.toD / cfg.fromD map the slider's [0,1] to D (the sweep section is log in C = 2 - D,
  // so equal slider steps multiply C by equal factors, which is how the plates are spaced).
  function tremaSection(S) {
    const st = { D: S.D0, seed: S.seed0, mark: false };
    let coarse = false, timer = 0;
    const z = zoomable('w' + S.id, 'c' + S.id, (f) => fitBox(f, { x0: -0.01, x1: PLATE_W + 0.01, y0: -0.01, y1: 1.01 }, 0.015), (f, v) => {
      const r = renderTremas(f, v, st, S.field, S.disc, coarse, S.markable && st.mark);
      $('r' + S.id + 'a').textContent = `${st.D.toFixed(4)} (C = ${r.C.toFixed(4)})`;
      $('r' + S.id + 'b').textContent = fmt(r.P);
      $('r' + S.id + 'c').textContent = pct(Math.min(1, (TAU / 2) * r.r1 * r.r1 / PLATE_W));
      $('r' + S.id + 'd').textContent = pct(uncovered(r.C, r.P)) + (r.pixels ? ` · marked ${pct(r.missed / r.pixels)}` : '');
    });
    function nudge() {                 // coarse at once, the full pass when the control settles
      coarse = true; z.schedule();
      clearTimeout(timer); timer = setTimeout(() => { coarse = false; z.schedule(); }, 180);
    }
    function set(refit, moving) {
      const preset = S.presets.find((q) => Math.abs(q.D - st.D) < 5e-4);
      $('s' + S.id).value = S.fromD(st.D);
      $('s' + S.id + 'v').textContent = `D = ${st.D.toFixed(S.dp)}`;
      $('seed' + S.id + 'v').textContent = `nº ${st.seed}`;
      $('c' + S.id + 't').textContent = preset ? preset.cap : S.cap;
      $('c' + S.id + 'n').textContent = `D = ${st.D.toFixed(4)} · seed nº ${st.seed}`;
      if (refit) { coarse = false; z.refit(); } else if (moving) nudge(); else { coarse = false; z.schedule(); }
    }
    $('s' + S.id).addEventListener('input', (e) => { st.D = S.toD(+e.target.value); set(false, true); });
    $('seed' + S.id).addEventListener('click', () => { st.seed = 1 + Math.floor(Math.random() * 9999); set(false, false); });
    if (S.markable) $('mark' + S.id).addEventListener('change', (e) => { st.mark = e.target.checked; set(false, false); });
    S.presets.forEach((q, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = i ? 'btn' : 'btn primary'; b.textContent = q.label;
      b.addEventListener('click', () => { st.D = q.D; if (q.seed !== undefined) st.seed = q.seed; if (q.mark !== undefined && S.markable) { st.mark = q.mark; $('mark' + S.id).checked = q.mark; } set(true); });
      $('pre' + S.id).append(b);
    });
    set(true);
    return { st, set };
  }

  // ============ Plates 306-307: smallish tremas, in white ============
  tremaSection({
    id: 'A', field: PRINT.ink, disc: PRINT.paper,
    D0: 1.99, seed0: 13, dp: 3,
    toD: (t) => 2 - (0.001 * Math.pow(150, t)), fromD: (D) => Math.log((2 - D) / 0.001) / Math.log(150),
    cap: 'White disc tremas',
    presets: [
      { label: 'Show Plate 306 as printed', D: 1.99, seed: 13, cap: 'Appenzeller: a few pinholes' },
      { label: 'Plate 307', D: 1.9, seed: 13, cap: 'Emmenthaler: overlapping holes' },
    ],
  });

  // ============ Plates 308-309: larger tremas, in black ============
  tremaSection({
    id: 'B', field: PRINT.paper, disc: PRINT.ink,
    D0: 1.75, seed0: 4, dp: 3,
    toD: (t) => 2 - (0.12 * Math.pow(6, t)), fromD: (D) => Math.log((2 - D) / 0.12) / Math.log(6),
    cap: 'Black disc tremas',
    presets: [
      { label: 'Show Plate 308 as printed', D: 1.75, seed: 4, cap: 'Tremas in black, speckled ground' },
      { label: 'Plate 309', D: 1.5, seed: 4, cap: 'Forked white threads' },
    ],
  });

  // ============ Saturating the Moon: one seed, C growing ============
  tremaSection({
    id: 'S', field: PRINT.paper, disc: PRINT.ink, markable: true,
    D0: 1.99, seed0: 7, dp: 4,
    toD: (t) => 2 - (0.002 * Math.pow(500, t)), fromD: (D) => Math.log((2 - D) / 0.002) / Math.log(500),
    cap: 'The same craters, longer bombardment',
    presets: [
      { label: 'Fresh surface', D: 1.998, mark: false, cap: 'C small: the surface barely marked' },
      { label: 'D = 1.9', D: 1.9, mark: false, cap: 'Holes overlap into voids' },
      { label: 'D = 1.5', D: 1.5, mark: false, cap: 'Threads between the craters' },
      { label: 'Dust at D ≈ 1.2', D: 1.2, mark: true, cap: 'Near the galaxies’ D: clustered dust' },
    ],
  });
})();
