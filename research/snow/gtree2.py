exec(open('gtree.py').read().split("res = []")[0])
from scipy.ndimage import binary_dilation
Ad = binary_dilation(Aimg, iterations=3)
h = 474 / 7; x0, y0 = 648, 470
lat = lambda i, j: (x0 + h * (i + j / 2), y0 - h * j * math.sqrt(3) / 2)
inked = set()
for i in range(-3, 12):
    for j in range(-6, 8):
        for di, dj in ((1, 0), (0, 1), (-1, 1)):
            (xa, ya), (xb, yb) = lat(i, j), lat(i + di, j + dj)
            t = np.linspace(0.15, 0.85, 20); X = xa + (xb - xa) * t; Y = ya + (yb - ya) * t
            if X.min() < 0 or Y.min() < 0 or X.max() >= W or Y.max() >= H: continue
            if Ad[Y.astype(int), X.astype(int)].mean() > 0.9: inked.add(((i, j), (i + di, j + dj)))
print(len(inked), sorted(inked))
