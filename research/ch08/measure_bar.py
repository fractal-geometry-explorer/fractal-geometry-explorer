#!/usr/bin/env python3
"""Measure Plate 80's Cantor bar: row bands (stage thickness), x-extents, ink levels.

Usage: python3 -I measure_bar.py <page80.png>
"""
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(np.float32) / 255.0
H, W = img.shape
print('page', W, 'x', H)

# The figure sits in the top ~45% of the page. Ink = dark.
top = img[: int(H * 0.52)]
dark = top < 0.5
rows = dark.sum(axis=1)
# find horizontal bands with ink
bands = []
in_band = False
for y, v in enumerate(rows):
    if v > 6 and not in_band:
        y0, in_band = y, True
    elif v <= 6 and in_band:
        bands.append((y0, y))
        in_band = False
if in_band:
    bands.append((y0, len(rows)))
# merge bands separated by < 12 px (speckle)
merged = []
for b in bands:
    if merged and b[0] - merged[-1][1] < 12:
        merged[-1] = (merged[-1][0], b[1])
    else:
        merged.append(list(b))
print('bands (y0, y1, thickness):')
for y0, y1 in merged:
    seg = dark[y0:y1]
    cols = seg.any(axis=0)
    xs = np.where(cols)[0]
    x0, x1 = (int(xs[0]), int(xs[-1]) + 1) if len(xs) else (0, 0)
    # count runs of ink along the band's middle rows and mean ink value
    mid = img[(y0 + y1) // 2]
    mrow = dark[(y0 + y1) // 2]
    runs = []
    i = x0
    while i < x1:
        if mrow[i]:
            j = i
            while j < x1 and mrow[j]:
                j += 1
            runs.append((i, j))
            i = j
        else:
            i += 1
    inkmean = float(img[y0:y1, x0:x1][dark[y0:y1, x0:x1]].mean()) if dark[y0:y1, x0:x1].any() else 1.0
    print(f'  y {y0:5d}-{y1:5d}  th {y1-y0:4d}  x {x0:5d}-{x1:5d}  span {x1-x0:5d}  runs(mid) {len(runs):4d}  ink {inkmean:.3f}')
    if len(runs) <= 8:
        print('     runs:', runs)
