import numpy as np, sys
from PIL import Image, ImageDraw
exec(open('altdragon.py').read().split('for name')[0])
im = Image.open('../../fgn/dh-083.png').convert('L')
boxes = {'top': (40, 0, 1000, 660), 'tile': (40, 1700, 1000, 2553)}
A = alt_dragon([1] * 14); B = 1 - A      # B: D(1 -> 0, right) = 180° turn of A about 1/2
def raster(Q, lab, W, H, x0, y0, s, out, d):
    for a, b in zip(Q[:-1], Q[1:]):
        m = (a + b) / 2; h = (b - a) / 2
        d.polygon([((z.real - x0) * s, H - (z.imag - y0) * s) for z in (a, m + 1j * h, b, m - 1j * h)], fill=lab)
for name, bx in boxes.items():
    g = np.array(im.crop(bx)).astype(int); H, W = g.shape
    # classes: 0 paper (>200), 1 black (<80), 2 gray
    th = {'top': (150, 55), 'tile': (165, 75)}[name]; cls = np.where(g > th[0], 0, np.where(g < th[1], 1, 2))
    ys, xs = np.nonzero(cls > 0); cy0, cy1, cx0, cx1 = ys.min(), ys.max(), xs.min(), xs.max()
    cls = cls[cy0:cy1 + 1, cx0:cx1 + 1]; H, W = cls.shape
    res = []
    for mir in (0, 1):
        for r in range(8):
            R = np.exp(1j * np.pi / 4 * r)
            QA = (np.conj(A) if mir else A) * R; QB = (np.conj(B) if mir else B) * R
            allq = np.concatenate([QA, QB]); x0, x1, y0, y1 = allq.real.min(), allq.real.max(), allq.imag.min(), allq.imag.max()
            s = min(W / (x1 - x0), H / (y1 - y0))
            img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
            raster(QA, 1, W, H, x0, y0, s, img, d); raster(QB, 2, W, H, x0, y0, s, img, d)
            M = np.array(img)
            for swap in (0, 1):
                MM = M if not swap else np.where(M == 1, 2, np.where(M == 2, 1, 0))
                fg = (MM > 0) | (cls > 0)
                acc = ((MM == cls) & fg).sum() / fg.sum()
                res.append((round(acc, 3), mir, r * 45, swap))
    res.sort(reverse=True); print(name, res[:4])
