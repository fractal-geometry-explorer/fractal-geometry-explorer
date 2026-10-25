import numpy as np, math, cmath
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
def curve(gen, codes, eps):
    N = len(gen) - 1
    def rec(a, b, m):
        if abs(b - a) < eps: return [b]
        g = [p.conjugate() for p in gen] if m else gen
        p = [a + (b - a) * gk for gk in g]
        out = []
        for k in range(N):
            c = codes[k]; cm = m ^ (c & 1)
            if c >= 2:
                seg = rec(p[k + 1], p[k], cm); full = [p[k + 1]] + seg
                out += full[::-1][1:]
            else:
                out += rec(p[k], p[k + 1], cm)
        return out
    return [0j] + rec(0j, 1 + 0j, 0)
def dimension(rs):
    lo, hi = 0.5, 3.0
    for _ in range(80):
        mid = (lo + hi) / 2
        if sum(r ** mid for r in rs) > 1: lo = mid
        else: hi = mid
    return (lo + hi) / 2
def silhouette(page, box, thr=100):
    a = np.array(Image.open(FG + page).convert('L').crop(box)).astype(float)
    dark = a < thr
    # bar = lowest rows where dark spans most of the width
    frac = dark.mean(1); rows = np.nonzero(frac > 0.85)[0]
    bar_top = rows.min()
    cols = np.nonzero(dark[bar_top - 3])[0] if dark[bar_top - 3].any() else np.nonzero(dark[bar_top])[0]
    xb = np.nonzero(dark[bar_top + 5])[0]
    return dark[:bar_top, :], bar_top, xb.min(), xb.max()
def render(pts, shape, x0, x1, ybase):
    h, w = shape; W = x1 - x0
    im = Image.new('L', (w, h), 0)
    poly = [(x0 + p.real * W, ybase - p.imag * W) for p in pts] + [(x1, ybase + 5), (x0, ybase + 5)]
    ImageDraw.Draw(im).polygon(poly, fill=255)
    return np.array(im)[:h, :] > 127
def iou(a, b): return (a & b).sum() / max(1, (a | b).sum())
