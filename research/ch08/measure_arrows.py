#!/usr/bin/env python3
"""Plate 81 arrows: rows with a long horizontal ink run in the margin strips just
outside each curtain; also thinnest cord widths inside the curtains.

Usage: python3 -I measure_arrows.py <page81.png>
"""
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(np.float32) / 255.0
H, W = img.shape
dark = img < 0.5

figs = {'top(D)': (501, 2705, 2058, 4168), 'bottom(r)': (2845, 4944, 2085, 4175)}
for name, (fy0, fy1, fx0, fx1) in figs.items():
    print(name)
    for side, xa, xb in [('left', fx0 - 115, fx0 - 5), ('right', fx1 + 5, fx1 + 115)]:
        strip = dark[max(0, fy0 - 60):min(H, fy1 + 60), xa:xb]
        rs = strip.sum(axis=1)
        idx = np.where(rs > 40)[0]
        if len(idx):
            groups = np.split(idx, np.where(np.diff(idx) > 15)[0] + 1)
            for g in groups:
                yc = max(0, fy0 - 60) + (g[0] + g[-1]) / 2
                frac_up = (fy1 - yc) / (fy1 - fy0)   # fraction from figure bottom
                print(f'  {side} arrow centre y={yc:.0f}  frac from bottom {frac_up:.4f}')
        else:
            print(f'  {side}: none')

# thinnest cords: ink-run widths at a mid row of the bottom curtain
for name, y, (fx0, fx1) in [('top(D) mid', 1600, (2058, 4168)), ('bottom(r) mid', 3900, (2085, 4175))]:
    row = dark[y, fx0:fx1]
    widths = []
    i = 0
    while i < len(row):
        if row[i]:
            j = i
            while j < len(row) and row[j]:
                j += 1
            widths.append(j - i)
            i = j
        else:
            i += 1
    widths.sort()
    print(f'{name}: {len(widths)} cords, thinnest {widths[:6]}, median {widths[len(widths)//2] if widths else 0}')
