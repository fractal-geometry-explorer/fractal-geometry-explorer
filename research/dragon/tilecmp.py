import numpy as np
from PIL import Image, ImageDraw
exec(open('altdragon.py').read().split('for name')[0])
im = Image.open('../../fgn/dh-083.png').convert('L')
g = np.array(im.crop((40, 1700, 1000, 2553))).astype(int)
cls = np.where(g > 165, 0, np.where(g < 75, 1, 2))
ys, xs = np.nonzero(cls > 0); cls = cls[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; H, W = cls.shape
A = alt_dragon([1] * 12); B = 1 - A
toT = lambda z: (z.imag - 0.2) + 1j * (z.real - 0.6)
toP = lambda w: (w.imag + 0.6) + 1j * (w.real + 0.2)
b = -1 + 1j
polys = []
for Q in (A, B):
    for a, c in zip(Q[:-1], Q[1:]):
        m = (a + c) / 2; h = (c - a) / 2; polys.append(np.array([a, m + 1j * h, c, m - 1j * h]))
polys = np.array(polys)
Tw = toT(polys)
reps = []
for d1 in (0, 1):
    for d2 in (0, 1):
        reps.append(((d1, d2), toP(d1 / b + d2 / b ** 2 + Tw / b ** 2)))
res = []
for tone in ('d1', 'd2', 'xor'):
    for mir in (0, 1):
        for r in range(8):
            R = np.exp(1j * np.pi / 4 * r)
            allp = np.concatenate([P for _, P in reps]).ravel(); allp = (np.conj(allp) if mir else allp) * R
            x0, x1, y0, y1 = allp.real.min(), allp.real.max(), allp.imag.min(), allp.imag.max(); s = min(W / (x1 - x0), H / (y1 - y0))
            img = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(img)
            for (d1, d2), P in reps:
                lab = 1 + {'d1': d1, 'd2': d2, 'xor': d1 ^ d2}[tone]
                PP = (np.conj(P) if mir else P) * R
                for q in PP: dr.polygon([((z.real - x0) * s, H - (z.imag - y0) * s) for z in q], fill=lab)
            M = np.array(img)
            for swap in (0, 1):
                MM = M if not swap else np.where(M == 1, 2, np.where(M == 2, 1, 0))
                fg = (MM > 0) | (cls > 0)
                res.append((round(((MM == cls) & fg).sum() / fg.sum(), 3), tone, mir, r * 45, swap))
res.sort(reverse=True); print(res[:6])
