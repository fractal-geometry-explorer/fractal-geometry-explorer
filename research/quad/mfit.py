import numpy as np, scipy.ndimage as nd, math, cmath
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
def mgon_island(M, n, sg, R=1.0, rot=0.0):
    th = 2*math.pi/M
    q = 1/(2 + cmath.exp(-1j*th))                 # first leg (as a fraction of the side), turns by -theta, then back
    if sg < 0: q = q.conjugate()
    w = q; v = q*cmath.exp(-1j*th) if sg > 0 else q*cmath.exp(1j*th)
    P = [R*cmath.exp(1j*(rot + th*k)) for k in range(M)]
    for _ in range(n):
        Q = []
        for i in range(len(P)):
            a, b = P[i], P[(i+1) % len(P)]; d = b - a
            Q += [a, a + d*w, a + d*(w+v)]
        P = Q
    return P
a = np.array(Image.open(FG + 'h49-065.png').convert('L')).astype(float)
sm = nd.uniform_filter(a, 9); dark = sm < 110; light = sm > 160
lab, n = nd.label(light); s = nd.sum(light, lab, range(1, n+1)); order = np.argsort(s)[::-1]
inner = lab == (order[0]+1)
fill8 = nd.binary_fill_holes(inner); mask4 = fill8 & ~inner
lab2, n2 = nd.label(dark); s2 = nd.sum(dark, lab2, range(1, n2+1)); ring = lab2 == (np.argsort(s2)[::-1][0]+1)
fill16 = nd.binary_fill_holes(ring)
C = (1108.0, 1281.0); R32 = 1140.0
def mask_of(P, shape):
    im = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon([(C[0] + p.real, C[1] - p.imag) for p in P], fill=255)
    return np.array(im) > 127
def iou(a, b): return (a & b).sum() / (a | b).sum()
ds = 4
for M, target, Rf, stage in [(4, mask4, 0.572, 6), (8, fill8, 0.779, 5), (16, fill16, 0.893, 4)]:
    T = target[::ds, ::ds]
    best = None
    for sg in (1, -1):
        for deg in np.arange(0, 360/M, 1.0 if M == 4 else 0.5):
            for rs in (0.98, 1.0, 1.02):
                P = [p/ds for p in mgon_island(M, stage, sg, R32*Rf*rs, math.radians(deg))]
                im = Image.new('L', (T.shape[1], T.shape[0]), 0)
                ImageDraw.Draw(im).polygon([(C[0]/ds + p.real, C[1]/ds - p.imag) for p in P], fill=255)
                sc = iou(np.array(im) > 127, T)
                if not best or sc > best[0]: best = (sc, sg, deg, rs)
    print(f'M={M}: best IoU {best[0]:.3f} sigma={best[1]} rotation={best[2]}° size x{best[3]}')
