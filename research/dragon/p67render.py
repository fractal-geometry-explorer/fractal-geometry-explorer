import numpy as np, math, cmath
from PIL import Image, ImageDraw
exec(open('chainfit.py').read().split('Z, chains =')[0])
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
def apexes(A, codes, n):
    pts = [0j]; F = []
    def rec(a, b, m, rev, d):
        if d == 0:
            AA = A.conjugate() if m else A
            pts.append(a if rev else b); F.append(a + (b - a) * AA); return
        AA = A.conjugate() if m else A; c = a + (b - a) * AA; P = [a, c, b]; kids = []
        for k in range(2):
            cc = codes[k]; cm = m ^ (cc & 1); cr = 1 if cc >= 2 else 0
            kids.append((P[k + 1], P[k], cm, 1) if cr else (P[k], P[k + 1], cm, 0))
        for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec(x, y, cm, rev ^ cr, d - 1)
    rec(0j, 1 + 0j, 0, 0, n)
    return np.array(pts), np.array(F)
plate = Image.open(FG + 'p67_big.png').convert('RGB'); W, H = plate.size
def draw(n, lam_out=0.43, lam_in=0.235, codes=(3, 1)):
    P, F = apexes(apex(30), codes, n)
    # similarity: candidate (0,0) -> plate (160,1580); candidate (0,1.5588) -> plate (950,200); y down
    a0 = complex(160, -1580); a1 = complex(950, -200)
    s = (a1 - a0) / (1.5588j); T = lambda z: s * z + a0
    im = Image.new('RGB', (W, H), (240, 240, 240)); d = ImageDraw.Draw(im)
    for i in range(len(F)):
        a, b = P[i], P[i + 1]; M = (a + b) / 2; v = F[i] - M
        poly = [a, M + lam_out * v, b, M + lam_in * v]
        d.polygon([(T(z).real, -T(z).imag) for z in poly], fill=(30, 30, 30))
    return im
ims = [plate] + [draw(n) for n in (6, 7, 8)]
out = Image.new('RGB', (4 * W // 2 + 30, H // 2), 'white')
for i, im in enumerate(ims): out.paste(im.resize((W // 2, H // 2)), (i * (W // 2 + 10), 0))
out.save(FG + 'p67_try.png'); print(out.size)
