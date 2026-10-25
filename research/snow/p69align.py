import numpy as np, math
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, binary_dilation, binary_erosion
from scipy.optimize import minimize
exec(open('p69fit.py').read().split("W = 815")[0])
src = open('p69fit.py').read(); exec(src[src.index("def koch_outline"):src.index("CEN = ")])
CEN = complex(0.5, r3 / 6)
bk = np.array(Image.open(FG + 'p69_L.png').convert('L')).astype(float)
S = 0.5; bk = np.array(Image.fromarray(bk.astype(np.uint8)).resize((int(bk.shape[1] * S), int(bk.shape[0] * S))), float)
bk = gaussian_filter(bk, 1.0); H, W = bk.shape
blk = bk < 80
disc = np.load('disc_mask.npy'); disc = np.array(Image.fromarray(disc.astype(np.uint8) * 255).resize((W, H))) > 127
# band near the snowflake boundary in the book
nb = ~blk & disc
band = (binary_dilation(nb, iterations=40) & ~binary_erosion(nb, iterations=40)) & disc
def outline_pts(j, side, n=6):
    outl = koch_outline(j); O = []
    for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], side, n)
    return np.array(O)
def mask(O, p):
    cx, cy, sc, rot = p; R = np.exp(1j * math.radians(rot))
    w = (O - CEN) * R * sc
    img = Image.new('L', (W, H), 0); ImageDraw.Draw(img).polygon(list(zip(cx + w.real, cy - w.imag)), fill=1)
    return np.array(img) > 0
def score(O, p, region):
    M = mask(O, p); return ((M == nb) & region).sum() / region.sum()
p0 = [397.2 * 3 * S, 404.1 * 3 * S, 684.4 * 3 * S, -1.0]
O7 = outline_pts(7, 1)
r = minimize(lambda p: -score(O7, p, band), p0, method='Nelder-Mead', options=dict(initial_simplex=[p0, [p0[0] + 4, p0[1], p0[2], p0[3]], [p0[0], p0[1] + 4, p0[2], p0[3]], [p0[0], p0[1], p0[2] * 1.01, p0[3]], [p0[0], p0[1], p0[2], p0[3] + 0.5]], xatol=0.2, fatol=1e-5, maxiter=300))
print('aligned', r.x, -r.fun)
np.save('p69align.npy', r.x)
for j in (5, 6, 7, 8, 9):
    for side in (1, -1):
        O = outline_pts(j, side)
        print(j, side, round(score(O, r.x, band), 4))
