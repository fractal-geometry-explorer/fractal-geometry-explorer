#!/usr/bin/env python3
"""Plate 81, third pass: find each curtain's frame from column profiles, then fit and arrows.

Usage: python3 -I measure_curtains3.py <page81.png>
"""
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(np.float32) / 255.0
H, W = img.shape
dark = img < 0.5

def runs_of(mask, min_gap):
    idx = np.where(mask)[0]
    if not len(idx):
        return []
    groups = np.split(idx, np.where(np.diff(idx) > min_gap)[0] + 1)
    return [(int(g[0]), int(g[-1]) + 1) for g in groups]

# Column profile over the whole page right of the text gutter guess: find the gutter first.
colsum_all = dark.sum(axis=0)
# the widest all-white column band between x=1500 and x=2400 separates text from figures
white = colsum_all[1500:2400] < 5
wruns = runs_of(white, 1)
gutter = max(wruns, key=lambda r: r[1] - r[0])
gx = 1500 + (gutter[0] + gutter[1]) // 2
print('text/figure gutter around x =', 1500 + gutter[0], '-', 1500 + gutter[1])

figzone = dark[:, 1500 + gutter[1]:]
xoff = 1500 + gutter[1]
rows = figzone.sum(axis=1)
rbands = runs_of(rows > 1, 60)
rbands = [b for b in rbands if b[1] - b[0] > 800]
print('figure y-bands:', rbands)

for name, (fy0, fy1) in zip(['top(D)', 'bottom(r)'], rbands):
    cols = figzone[fy0:fy1].sum(axis=0)
    xs = np.where(cols > 3)[0]
    x0, x1 = xoff + int(xs[0]), xoff + int(xs[-1]) + 1
    wfig = x1 - x0
    print(f'\n{name}: y {fy0}-{fy1} (h {fy1-fy0}), x {x0}-{x1} (w {wfig}), aspect h/w {(fy1-fy0)/wfig:.3f}')
    data = []
    for y in range(fy0, fy1, 10):
        row = dark[y, x0:x1]
        mid = wfig // 2
        if row[mid]:
            continue
        i = mid
        while i > 0 and not row[i - 1]:
            i -= 1
        j = mid
        while j < len(row) - 1 and not row[j + 1]:
            j += 1
        if i <= 2 or j >= len(row) - 3:
            continue
        g = (j - i + 1) / wfig
        r = (1 - g) / 2
        if not (0.02 < r < 0.49):
            continue
        data.append((y, r))
    ya = np.array([d[0] for d in data]); ra = np.array([d[1] for d in data])
    Da = np.log(2) / np.log(1 / ra)
    print(f'  {len(data)} central-gap samples y {ya.min():.0f}-{ya.max():.0f}')
    for nm, va, topv in [('r', ra, 0.5), ('D', Da, 1.0)]:
        A = np.vstack([ya, np.ones_like(ya)]).T
        (m, c), *_ = np.linalg.lstsq(A, va, rcond=None)
        rms = float(np.sqrt(((va - (m * ya + c)) ** 2).mean()))
        print(f'  linear in {nm}: rms {rms:.4f}  y({nm}={topv})={ (topv - c) / m:.0f}  y({nm}=0)={-c / m:.0f}')
    # arrows: ink left of x0 and right of x1, within this band
    for side, x_a, x_b in [('left', max(0, x0 - 220), x0 - 8), ('right', x1 + 8, min(W, x1 + 220))]:
        sl = dark[fy0:fy1, x_a:x_b]
        rs = sl.sum(axis=1)
        for g0, g1 in runs_of(rs > 4, 25):
            print(f'  {side} arrow: y {fy0+g0}-{fy0+g1} centre {fy0+(g0+g1)//2}  frac_from_fig_top {(( (g0+g1)/2 )/(fy1-fy0)):.4f}')
