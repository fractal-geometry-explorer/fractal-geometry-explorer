import numpy as np, itertools
from PIL import Image
from scipy.ndimage import distance_transform_edt
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
u = (1 + 2j) / 5; v = (2 - 1j) / 5
Q = np.array([0, u, 2 * u, 2 * u + v, u + v, 1])
def place(G, a, b, code):
    g = np.conj(G) if code & 1 else G
    if code & 2: g = (1 - g)[::-1]
    return a + (b - a) * g
def stage2(codes):
    out = [0j]
    for k in range(5): out.extend(place(Q, Q[k], Q[k + 1], codes[k])[1:])
    return np.array(out)
im = Image.open(FG + 'g72_quartet.png').convert('L'); A = np.array(im) < 110
print(A.shape)
dist = distance_transform_edt(~A)
# stage-1 generator at (220,555)->(700,557); stage 2 at (818,560)->(1297,566)
def score(P, x0, y0, sc):
    X = x0 + P.real * sc; Y = y0 - P.imag * sc
    t = np.linspace(0, 1, 12)[:, None]
    sx = (X[:-1] + (X[1:] - X[:-1]) * t).ravel(); sy = (Y[:-1] + (Y[1:] - Y[:-1]) * t).ravel()
    if sx.min() < 0 or sy.min() < 0 or sx.max() >= A.shape[1] or sy.max() >= A.shape[0]: return 99
    return dist[sy.astype(int), sx.astype(int)].mean()
print('gen', round(score(Q, 220, 555, 480), 2))
res = sorted((score(stage2(c), 818, 562, 479), c) for c in itertools.product(range(4), repeat=5))
print(res[:4])
