#!/usr/bin/env python3
"""Measure Plate 81's two curtains: frames, arrow heights, and the r(y) law.

For each curtain, at several heights y, find the central white gap's width.
For the r-curtain, gap = 1 - 2r with r linear in height. For the D-curtain,
r = 2^(-1/D) with D linear in height. Compare both models on both figures.

Usage: python3 -I measure_curtains.py <page81.png>
"""
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(np.float32) / 255.0
H, W = img.shape
print('page', W, 'x', H)
dark = img < 0.5

# Curtains are on the right half of the page.
right = dark[:, int(W * 0.42):]
x_off = int(W * 0.42)
rows = right.sum(axis=1)
bands = []
in_b = False
for y, v in enumerate(rows):
    if v > 30 and not in_b:
        y0, in_b = y, True
    elif v <= 30 and in_b:
        bands.append([y0, y]); in_b = False
if in_b:
    bands.append([y0, H])
merged = []
for b in bands:
    if merged and b[0] - merged[-1][1] < 40:
        merged[-1][1] = b[1]
    else:
        merged.append(b)
merged = [b for b in merged if b[1] - b[0] > 400]
print('curtain bands:', merged)

for name, (y0, y1) in zip(['top', 'bottom'], merged):
    seg = dark[y0:y1]
    cols = seg.any(axis=0)
    xs = np.where(cols[x_off:])[0] + x_off
    x0, x1 = int(xs[0]), int(xs[-1]) + 1
    print(f'{name}: y {y0}-{y1} (h {y1-y0}), x {x0}-{x1} (w {x1-x0})')
    # central gap width at fractions of height from the top of the band
    print('  frac_from_top  central_gap/width  r_implied')
    for f in [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]:
        y = int(y0 + f * (y1 - y0))
        row = dark[y, x0:x1]
        # central gap: the white run containing the midpoint
        mid = (x1 - x0) // 2
        if row[mid]:
            print(f'  {f:5.2f}  midpoint is ink')
            continue
        i = mid
        while i > 0 and not row[i - 1]:
            i -= 1
        j = mid
        while j < len(row) - 1 and not row[j + 1]:
            j += 1
        gap = (j - i + 1) / (x1 - x0)
        print(f'  {f:5.2f}  {gap:.4f}  r={(1 - gap) / 2:.4f}')

# arrows in the margins: dark marks left of the curtains
print('arrow candidates (left margin):')
lm = dark[:, int(W * 0.36):int(W * 0.42)]
rowsum = lm.sum(axis=1)
on = rowsum > 3
y = 0
while y < H:
    if on[y]:
        y2 = y
        while y2 < H and on[y2]:
            y2 += 1
        print(f'  y {y}-{y2} centre {(y + y2) // 2}')
        y = y2
    else:
        y += 1
