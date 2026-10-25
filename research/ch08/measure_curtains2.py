#!/usr/bin/env python3
"""Refined Plate 81 measurements: true frames, linear fits in absolute y, arrows, run counts.

Usage: python3 -I measure_curtains2.py <page81.png>
"""
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(np.float32) / 255.0
H, W = img.shape
dark = img < 0.5

FIGX0, FIGX1 = 1750, 4250          # generous figure x-range, excludes body text
fig = dark[:, FIGX0:FIGX1]
rows = fig.sum(axis=1)
ys = np.where(rows > 2)[0]
print('ink rows in figure zone: %d-%d' % (ys[0], ys[-1]))
# split the two figures at the widest white gap in the middle
gaps, y = [], ys[0]
prev = ys[0]
for yy in ys[1:]:
    if yy - prev > 1:
        gaps.append((prev + 1, yy))
    prev = yy
big = max(gaps, key=lambda g: g[1] - g[0])
print('figure split gap:', big)
figs = [(ys[0], big[0]), (big[1], ys[-1] + 1)]

for name, (fy0, fy1) in zip(['top(D)', 'bottom(r)'], figs):
    seg = dark[fy0:fy1, FIGX0:FIGX1]
    cols = seg.sum(axis=0)
    xs = np.where(cols > 2)[0]
    x0, x1 = FIGX0 + int(xs[0]), FIGX0 + int(xs[-1]) + 1
    print(f'\n{name}: y {fy0}-{fy1} (h {fy1-fy0}), x {x0}-{x1} (w {x1-x0})')
    wfig = x1 - x0
    # central gap vs absolute y, fit r(y) and D(y) linear
    data = []
    for y in range(fy0 + 40, fy1 - 10, 25):
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
        if i == 0 or j == len(row) - 1:
            continue                      # gap ate an edge: not the central trema
        g = (j - i + 1) / wfig
        r = (1 - g) / 2
        if r < 0.02:
            continue
        data.append((y, r))
    ya = np.array([d[0] for d in data]); ra = np.array([d[1] for d in data])
    Da = np.log(2) / np.log(1 / ra)
    for nm, va in [('r', ra), ('D', Da)]:
        A = np.vstack([ya, np.ones_like(ya)]).T
        (m, c), res, *_ = np.linalg.lstsq(A, va, rcond=None)
        pred = m * ya + c
        rms = float(np.sqrt(((va - pred) ** 2).mean()))
        ytop = ( (0.5 if nm == 'r' else 1.0) - c) / m
        ybot = -c / m
        print(f'  linear in {nm}: rms {rms:.4f}  y({nm}={"1/2" if nm=="r" else "1"})={ytop:.0f}  y({nm}=0)={ybot:.0f}')
    # run counts at a few heights (how deep the print resolves)
    for f in [0.1, 0.35, 0.63, 0.9]:
        y = int(fy0 + f * (fy1 - fy0))
        row = dark[y, x0:x1]
        runs = int(np.sum(row[1:] & ~row[:-1]) + (1 if row[0] else 0))
        print(f'  y {y} (f={f}): {runs} ink runs')
    # arrows: ink just left of x0 / right of x1
    for side, sl in [('left', dark[:, x0 - 160: x0 - 10]), ('right', dark[:, x1 + 10: x1 + 160])]:
        rs = sl.sum(axis=1)
        on = np.where(rs > 8)[0]
        on = on[(on >= fy0 - 50) & (on <= fy1 + 50)]
        if len(on):
            groups = np.split(on, np.where(np.diff(on) > 20)[0] + 1)
            for g in groups:
                print(f'  {side} arrow rows {g[0]}-{g[-1]} centre {int((g[0]+g[-1])/2)}')

# top of each curtain: how thick is the solid [0,1] band before the first slit?
for name, (fy0, fy1) in zip(['top(D)', 'bottom(r)'], figs):
    seg = dark[fy0:fy1, FIGX0:FIGX1]
    cols = seg.sum(axis=0)
    xs = np.where(cols > 2)[0]
    x0, x1 = FIGX0 + int(xs[0]), FIGX0 + int(xs[-1]) + 1
    solid_until = None
    for y in range(fy0, fy0 + 400):
        row = dark[y, x0 + 30: x1 - 30]
        frac = row.mean()
        if frac < 0.985:
            solid_until = y
            break
    print(f'{name}: solid black down to y={solid_until} (top {fy0}), i.e. {solid_until - fy0}px of initiator band')
