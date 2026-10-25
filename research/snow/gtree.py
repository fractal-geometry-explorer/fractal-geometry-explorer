import numpy as np, itertools, math
from PIL import Image
from scipy.ndimage import distance_transform_edt
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
phi = math.atan2(math.sqrt(3), 5)
w = complex(math.cos(phi), math.sin(phi)) / math.sqrt(7); om = complex(0.5, math.sqrt(3) / 2)
S = 0; A = w; B = w + w / om; E = B + w; C = A + w * om; D = C + w * om * om; F = C + w; G = F + w / om
print('E', E)
links = [(S, A), (A, B), (B, E), (A, C), (C, D), (C, F), (F, G)]
def place_links(L, a, b, code):
    out = []
    for p, q in L:
        if code & 1: p, q = np.conj(p), np.conj(q)
        if code & 2: p, q = 1 - p, 1 - q
        out.append((a + (b - a) * p, a + (b - a) * q))
    return out
im = Image.open(FG + 'g71_tree.png').convert('L'); Aimg = np.array(im) < 120
dist = distance_transform_edt(~Aimg)
H, W = Aimg.shape; print(H, W)
def score(segs, x0, y0, sc):
    t = np.linspace(0, 1, 10)
    vals = []
    for p, q in segs:
        z = p + (q - p) * t; X = x0 + z.real * sc; Y = y0 - z.imag * sc
        if X.min() < 0 or Y.min() < 0 or X.max() >= W or Y.max() >= H: return 99
        vals.append(dist[Y.astype(int), X.astype(int)])
    return np.concatenate(vals).mean()
print('gen', round(score(links, 55, 475, 475), 2))
res = []
for codes in itertools.product(range(4), repeat=7):
    segs = []
    for (p, q), c in zip(links, codes): segs += place_links(links, p, q, c)
    res.append((score(segs, 648, 470, 474), codes))
res.sort(); print(res[:5])
