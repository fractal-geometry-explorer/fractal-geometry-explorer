import numpy as np, itertools, math
from PIL import Image, ImageDraw
from scipy.ndimage import binary_dilation, distance_transform_edt
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
r3 = math.sqrt(3)
def pol(L, a): return L * complex(math.cos(math.radians(a)), math.sin(math.radians(a)))
steps = [pol(1/3, 60), pol(1/3, 60), pol(1/3, 0), pol(1/3, -60), pol(1/r3, 210), pol(1/3, 0), pol(1/3, 0)]
S = [0j]
for s in steps: S.append(S[-1] + s)
S = np.array(S)
F = (1 - np.conj(S))[::-1]          # mirror in x = 1/2, run from 0 to 1
print('S', np.round(S, 3)); print('F', np.round(F, 3))
def apply(G, a, b, code):
    # code: bit0 mirror (conj), bit1 reverse
    g = np.conj(G) if code & 1 else G
    if code & 2: g = (1 - g)[::-1]     # traverse backwards (rotate 180 about midpoint, reversed)
    return a + (b - a) * g
def stage(G1, G2list, codes):
    out = [0j]
    for k in range(7):
        seg = apply(G2list, S[k] if G1 is None else G1[k], S[k + 1] if G1 is None else G1[k + 1], codes[k])
        out.extend(seg[1:])
    return np.array(out)
im = Image.open(FG + 'g68_7.png').convert('L'); A = np.array(im) < 110
P = A[60:620, 800:1360]          # panel region
ink = P.copy()
dist_ink = distance_transform_edt(~ink)
x0, y0, sc = 840 - 800, 480 - 60, 473
res = []
for G2name, G2 in (('S', S), ('F', F)):
    for codes in itertools.product(range(4), repeat=7):
        pts = stage(S, G2, codes)
        X = x0 + pts.real * sc; Y = y0 - pts.imag * sc
        if X.min() < 0 or Y.min() < 0 or X.max() >= 560 or Y.max() >= 560: continue
        # sample along the polyline, mean distance to ink
        t = np.linspace(0, 1, 12)[:, None]
        sx = (X[:-1] + (X[1:] - X[:-1]) * t).ravel(); sy = (Y[:-1] + (Y[1:] - Y[:-1]) * t).ravel()
        d = dist_ink[sy.astype(int), sx.astype(int)].mean()
        res.append((d, G2name, codes))
res.sort()
for r in res[:8]: print(round(r[0], 2), r[1], r[2])
