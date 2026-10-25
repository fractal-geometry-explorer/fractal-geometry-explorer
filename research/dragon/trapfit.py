exec(open('trap.py').read().split('ims = []')[0])
import numpy as np
from PIL import ImageFilter
plate = Image.open(FG + 'p67_big.png').convert('L'); W, H = plate.size
pl = np.array(plate).astype(float); pl[:255, :] = 230  # drop text
pmask = (pl < 140).astype(float)
def chev(n, flags=(True, False, False), phi=30):
    A = apex(phi)
    segs = gen_sweep(A, n, *flags)
    out = []
    for p, q, t, s in segs:
        rev = {'S': flags[0], 'R': flags[1], 'Q': flags[2]}[t]
        AA = A if s > 0 else A.conjugate()
        if rev: AA = 1 - AA.conjugate()
        F = p + (q - p) * AA; M = (p + q) / 2; v = F - M
        out.append([p, M + 0.43 * v, q, M + 0.235 * v])
    return out
def draw(polys, x0, y0, sc, size=(W, H), ang=0.0):
    im = Image.new('L', size, 0); d = ImageDraw.Draw(im); R = cmath.exp(1j * ang)
    for P in polys:
        d.polygon([(x0 + (z * R).real * sc, y0 - (z * R).imag * sc) for z in P], fill=255)
    return np.array(im) / 255.
def score(m):
    a = (m > 0.5); b = pmask > 0.5
    return (a & b).sum() / max(1, (a | b).sum())
if __name__ == '__main__':
    import sys
    best = []
    for n in (8, 9, 10, 11):
        polys = chev(n)
        # coarse search at half resolution
        bb = None
        for sc in np.arange(980, 1121, 20):
            for x0 in np.arange(130, 191, 10):
                for y0 in np.arange(1520, 1661, 15):
                    m = draw(polys, x0, y0, sc)
                    from scipy.ndimage import uniform_filter
                    s = (uniform_filter(m, 9) * uniform_filter(pmask, 9)).sum() / np.sqrt((uniform_filter(m, 9) ** 2).sum() * (uniform_filter(pmask, 9) ** 2).sum())
                    if bb is None or s > bb[0]: bb = (s, sc, x0, y0)
        print(n, bb, flush=True); best.append((n,) + bb)
    import pickle; pickle.dump(best, open('trapfit.pkl', 'wb'))
