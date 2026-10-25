exec(open('p69fit.py').read())
from matplotlib.path import Path
from scipy.spatial import ConvexHull
lb, n = label(cls == 0); sizes = np.bincount(lb.ravel()); sizes[0] = 0; big = lb == sizes.argmax()
yy, xx = np.nonzero(big); P = np.stack([xx, yy], 1); h = ConvexHull(P)
hull = Path(P[h.vertices]); gx, gy = np.meshgrid(np.arange(W), np.arange(H))
disc = hull.contains_points(np.stack([gx.ravel(), gy.ravel()], 1)).reshape(H, W) | inner
np.save('disc_mask.npy', disc)
print('disc frac', disc.mean())
outl = koch_outline(5)
best = []
for rdeg in np.arange(-6, 6.1, 1.0):
    for ds in (0.98, 1.0, 1.02):
        for dx in (-6, 0, 6):
            for dy in (-6, 0, 6):
                T = mapper(math.radians(rdeg), 0, dx, dy, ds)
                O = []
                for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], 1, 3)
                img = Image.new('L', (W, H), 0); ImageDraw.Draw(img).polygon([T(z) for z in O], fill=1)
                M = np.array(img) > 0
                best.append((((M == (cls > 0)) & disc).sum() / disc.sum(), rdeg, ds, dx, dy))
best.sort(reverse=True); print('outline fit', best[:4])
