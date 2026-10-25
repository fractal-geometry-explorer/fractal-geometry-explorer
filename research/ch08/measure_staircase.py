#!/usr/bin/env python3
"""Measure Plate 83: frame, the staircase's top profile against the Cantor function,
riser resolution, and the white hairline inside the black fill.

Usage: python3 -I measure_staircase.py <page83.png>
"""
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(np.float32) / 255.0
H, W = img.shape
dark = img < 0.5
ysum = dark.sum(axis=1)
xsum = dark.sum(axis=0)
ys = np.where(ysum > 3)[0]
xs = np.where(xsum > 3)[0]
y0, y1 = int(ys[0]), int(ys[-1]) + 1
x0, x1 = int(xs[0]), int(xs[-1]) + 1
print(f'ink box: x {x0}-{x1} (w {x1-x0}), y {y0}-{y1} (h {y1-y0}), aspect h/w {(y1-y0)/(x1-x0):.4f}')

def cantor(x):
    # Cantor function on [0,1]
    y = 0.0
    p = 0.5
    for _ in range(60):
        if x < 1/3:
            x *= 3
        elif x <= 2/3:
            return y + p
        else:
            y += p
            x = 3 * x - 2
        p /= 2
    return y

# top profile: for each column, first ink row
prof = np.full(x1 - x0, np.nan)
for i in range(x1 - x0):
    col = dark[y0:y1, x0 + i]
    idx = np.where(col)[0]
    if len(idx):
        prof[i] = idx[0]
ok = ~np.isnan(prof)
X = (np.arange(x1 - x0) + 0.5) / (x1 - x0)
M = 1 - prof / (y1 - y0)
C = np.array([cantor(x) for x in X])
err = (M - C)[ok]
print(f'top profile vs Cantor function: mean {err.mean():+.4f}, rms {np.sqrt((err**2).mean()):.4f}, max |{np.abs(err).max():.4f}|')
# in pixels
print(f'  rms in px: {np.sqrt((err**2).mean())*(y1-y0):.1f}, max px: {np.abs(err).max()*(y1-y0):.1f}')

# where are the worst errors?
w = np.argsort(-np.abs(M - C) * ok)[:6]
for i in w:
    print(f'  X={X[i]:.4f} M={M[i]:.4f} C={C[i]:.4f} diff {(M[i]-C[i])*(y1-y0):+.1f}px')

# tread resolution: lengths of maximal runs where profile is constant (within 2px)
treads = []
i = 0
while i < len(prof):
    j = i
    while j + 1 < len(prof) and ok[j + 1] and abs(prof[j + 1] - prof[i]) <= 2:
        j += 1
    if j > i:
        treads.append(j - i + 1)
    i = j + 1
treads = sorted(treads)
print(f'treads: n={len(treads)}, smallest {treads[:8]}, largest {treads[-3:]} (px); width/3^k: ' +
      ', '.join(f'3^-{k}={round((x1-x0)/3**k)}px' for k in range(4, 9)))

# white hairline: scan a horizontal line midway up, print the gray profile crossing the left boundary
yline = (y0 + y1) // 2
row = img[yline]
ink_idx = np.where(dark[yline])[0]
if len(ink_idx):
    a = ink_idx[0]
    prof_slice = row[max(0, a - 6): a + 60]
    print(f'gray profile across left boundary at y={yline}, x from {max(0, a-6)}:')
    print('  ' + ' '.join(f'{v:.2f}' for v in prof_slice))
# count white pixels strictly inside the ink region on that row
inside = dark[yline, ink_idx[0]: ink_idx[-1]]
runs = []
i = 0
while i < len(inside):
    if not inside[i]:
        j = i
        while j < len(inside) and not inside[j]:
            j += 1
        runs.append((ink_idx[0] + i, j - i))
        i = j
    else:
        i += 1
print('white runs inside ink on that row (x, len):', runs[:10])
