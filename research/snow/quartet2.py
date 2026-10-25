import numpy as np, math
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
src = open('snow.py').read(); exec(src[src.index('def check'):src.index('random.seed')])
u = (1 + 2j) / 5; v = (2 - 1j) / 5
Q = np.array([0, u, 2 * u, 2 * u + v, u + v, 1])
codes = (2, 0, 0, 2, 0)
def curve(n, a=0j, b=1 + 0j):
    out = [a]
    def rec(a, b, m, rev, d):
        if d == 0: out.append(a if rev else b); return
        g = np.conj(Q) if m else Q
        P = a + (b - a) * g; kids = []
        for k in range(5):
            cc = codes[k]; cm = m ^ (cc & 1); cr = 1 if cc >= 2 else 0
            kids.append((P[k + 1], P[k], cm, 1) if cr else (P[k], P[k + 1], cm, 0))
        for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec(x, y, cm, rev ^ cr, d - 1)
    rec(a, b, 0, 0, n)
    return np.array(out)
P = curve(4); print('stage4', len(P) - 1, check(P), 'extent', P.real.min(), P.real.max(), P.imag.min(), P.imag.max())
W = 900
for name, sides in (('out', [(0, 1), (1, 1 + 1j), (1 + 1j, 1j), (1j, 0)]), ('in', [(1, 0), (1 + 1j, 1), (1j, 1 + 1j), (0, 1j)])):
    im = Image.new('L', (W, W), 255); d = ImageDraw.Draw(im)
    allp = [curve(5, complex(a), complex(b)) for a, b in sides]
    Z = np.concatenate(allp); x0, x1, y0, y1 = Z.real.min(), Z.real.max(), Z.imag.min(), Z.imag.max(); s = (W - 40) / max(x1 - x0, y1 - y0)
    for k, C in enumerate(allp): d.line([(20 + (z.real - x0) * s, W - 20 - (z.imag - y0) * s) for z in C], fill=60 * k, width=1)
    im.save(FG + f'quartet_{name}.png')
    print(name, 'crossings among all', check(np.concatenate(allp)))
P = curve(5)
im = Image.new('RGB', (W, W), 'white'); d = ImageDraw.Draw(im)
x0, x1, y0, y1 = P.real.min(), P.real.max(), P.imag.min(), P.imag.max(); s = (W - 40) / max(x1 - x0, y1 - y0)
T = lambda z: (20 + (z.real - x0) * s, W - 20 - (z.imag - y0) * s)
n = len(P) - 1; cols = [(200, 60, 60), (60, 120, 200), (60, 160, 90), (200, 150, 40), (130, 70, 160)]
for k in range(5):
    seg = P[k * n // 5: (k + 1) * n // 5 + 1]
    d.line([T(z) for z in seg], fill=cols[k], width=1)
d.line([T(0j), T(1 + 0j)], fill=(0, 0, 0), width=2)
im.save(FG + 'quartet_single.png')
