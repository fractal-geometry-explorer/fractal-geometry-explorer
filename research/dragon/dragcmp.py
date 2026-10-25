import numpy as np
from PIL import Image, ImageDraw
exec(open('altdragon.py').read().split('for name')[0])
book = np.array(Image.open('../../fgn/p66_mature.png').convert('L').crop((60, 40, 900, 600))) < 128
H, W = book.shape
P = alt_dragon([1] * 14)          # 0 -> 1, right
P = 1 - P                         # the page's D(1 -> 0, right)
best = []
for mir in (0, 1):
    for r in range(8):
        Q = (np.conj(P) if mir else P) * np.exp(1j * np.pi / 4 * r)
        x0, x1, y0, y1 = Q.real.min(), Q.real.max(), Q.imag.min(), Q.imag.max()
        s = min(W / (x1 - x0), H / (y1 - y0))
        im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)
        for a, b in zip(Q[:-1], Q[1:]):
            m = (a + b) / 2; h = (b - a) / 2
            poly = [a, m + 1j * h, b, m - 1j * h]
            d.polygon([((z.real - x0) * s, H - (z.imag - y0) * s) for z in poly], fill=1)
        A = np.array(im) > 0
        iou = (A & book).sum() / (A | book).sum()
        best.append((round(iou, 3), mir, r * 45, round((x1 - x0) / (y1 - y0), 2)))
best.sort(reverse=True); print(best[:5], 'book aspect', round(W / H, 2))
