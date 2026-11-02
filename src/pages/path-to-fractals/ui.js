(() => {
  // chronological order of stations for prev/next
  const ORDER = STATIONS.map((_, i) => i).sort((a, b) => STATIONS[a][0] - STATIONS[b][0]);
  const st = { sel: ORDER[0] };
  const LANE_Y = (l) => -l * 0.16;
  const X_OF = (year) => (year - YEAR0) / (YEAR1 - YEAR0);

  const zA = zoomable('wA', 'cA', (f) => fitBox(f, { x0: -0.22, x1: 1.03, y0: LANE_Y(LANES.length - 1) - 0.1, y1: 0.1 }, 0.02), (f, v) => {
    const c = f.ctx;
    paper(f, PRINT.paper);
    toWorld(f, v);
    c.lineJoin = 'round'; c.lineCap = 'round';
    // lane rules
    for (let l = 0; l < LANES.length; l++) {
      c.strokeStyle = 'rgba(21,21,21,0.12)'; c.lineWidth = 1 / v.s;
      c.beginPath(); c.moveTo(0, LANE_Y(l)); c.lineTo(1, LANE_Y(l)); c.stroke();
    }
    // the route, in chapter order through chronological stations
    c.strokeStyle = PRINT.red; c.lineWidth = 2 / v.s;
    c.beginPath();
    ORDER.forEach((i, k) => {
      const [year, lane] = STATIONS[i];
      const x = X_OF(year), y = LANE_Y(lane);
      if (k) c.lineTo(x, y); else c.moveTo(x, y);
    });
    c.stroke();
    toScreen(f);
    // decade ticks
    c.font = '500 10.5px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = PRINT.muted;
    for (let yr = 1950; yr <= 1982; yr += yr % 10 === 0 ? 5 : 5) {
      const x = v.ox + X_OF(yr) * v.s, y0 = v.oy - LANE_Y(LANES.length - 1) * v.s;
      c.fillText(String(yr), x, y0 + 14);
    }
    // lane labels
    c.textAlign = 'right'; c.textBaseline = 'middle';
    LANES.forEach((name, l) => c.fillText(name, v.ox - 10, v.oy - LANE_Y(l) * v.s));
    // stations: dots first, then labels with collision avoidance (above the dot, else below,
    // else skipped — the selected station's label always wins its spot)
    STATIONS.forEach(([year, lane], i) => {
      const x = v.ox + X_OF(year) * v.s, y = v.oy - LANE_Y(lane) * v.s;
      const seld = i === st.sel;
      c.beginPath(); c.arc(x, y, seld ? 7 : 5, 0, 2 * Math.PI);
      c.fillStyle = seld ? PRINT.red : PRINT.ink; c.fill();
      c.strokeStyle = PRINT.paper; c.lineWidth = 2; c.stroke();
    });
    const placed = [];                                   // [x0, x1, lane, band]
    const fits = (x0, x1, lane, band) => !placed.some((p) => p[2] === lane && p[3] === band && x0 < p[1] + 6 && x1 > p[0] - 6);
    const byPriority = STATIONS.map((_, i) => i).sort((a, b) => (a === st.sel ? -1 : b === st.sel ? 1 : 0));
    for (const i of byPriority) {
      const [year, lane, label] = STATIONS[i], seld = i === st.sel;
      c.font = `${seld ? 700 : 500} 10.5px "IBM Plex Mono", monospace`;
      const x = Math.max(v.ox + 24, Math.min(v.ox + v.s - 24, v.ox + X_OF(year) * v.s));
      const y = v.oy - LANE_Y(lane) * v.s;
      const hw = c.measureText(label).width / 2;
      let band = null;
      if (fits(x - hw, x + hw, lane, 0)) band = 0;
      else if (fits(x - hw, x + hw, lane, 1)) band = 1;
      if (band === null && !seld) continue;
      band = band ?? 0;
      placed.push([x - hw, x + hw, lane, band]);
      c.textAlign = 'center'; c.textBaseline = band ? 'top' : 'bottom';
      c.fillStyle = seld ? PRINT.red : PRINT.muted;
      c.fillText(label, x, band ? y + 10 : y - 9);
    }
  }, {
    onTap: (wx, wy) => {
      let best = -1, bd = Infinity;
      STATIONS.forEach(([year, lane], i) => {
        const d = Math.hypot((X_OF(year) - wx) * 1.2, LANE_Y(lane) - wy);
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0 && bd < 0.12) { st.sel = best; set(); }
    },
  });
  function set() {
    const [year, lane, label, note, page] = STATIONS[st.sel];
    $('cAn').textContent = `${Math.round(year)} · ${label}`;
    $('infoA').innerHTML = note;
    $('rAa').textContent = Number.isInteger(year) ? String(year) : `≈ ${Math.round(year)}`;
    $('rAb').textContent = LANES[lane];
    $('rAc').innerHTML = page ? `<a href="${page}.html">${page}</a>` : '—';
    $('rAd').textContent = String(STATIONS.length);
    zA.schedule();
  }
  const step = (d) => {
    const k = (ORDER.indexOf(st.sel) + d + ORDER.length) % ORDER.length;
    st.sel = ORDER[k]; set();
  };
  $('nextA').addEventListener('click', () => step(1));
  $('prevA').addEventListener('click', () => step(-1));
  set();
})();
