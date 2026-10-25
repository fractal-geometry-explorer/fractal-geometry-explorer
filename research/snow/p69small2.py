exec(open('p69fit.py').read().split("W = 815")[0])
src = open('p69fit.py').read(); exec(src[src.index("def koch_outline"):src.index("CEN = ")]); exec(src[src.index("def curve_leaves"):src.index("def score")])
from scipy.ndimage import gaussian_filter, label, binary_fill_holes
from scipy.optimize import minimize
import itertools
CEN = complex(0.5, r3 / 6)
V = {'D13': D13, 'mD13': mirror(D13), 'G13': G13, 'mG13': mirror(G13)}
for name, n in (('p69_c1.png', 1), ('p69_c2.png', 2)):
    g = gaussian_filter(np.array(Image.open(FG + name).convert('L')).astype(float), 2)
    H, W = g.shape
    cls = np.where(g < 80, 0, np.where(g > 170, 2, 1))
    lab, _ = label(cls > 0); inner = lab == lab[H // 2, W // 2]
    lb, _ = label(cls == 0); sizes = np.bincount(lb.ravel()); sizes[0] = 0; ring = lb == sizes.argmax()
    disc = binary_fill_holes(ring | inner)
    ys, xs = np.nonzero(inner); cx, cy = xs.mean(), ys.mean()
    outl = koch_outline(2 * n - 1); O = []
    for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], 1, 12)
    O = np.array(O); i1 = [k for k, z in enumerate(outl) if abs(z - 1) < 1e-9][0]
    area_O = 0.5 * abs(np.sum(O.real * np.roll(O.imag, -1) - np.roll(O.real, -1) * O.imag))
    sc0 = math.sqrt(inner.sum() / area_O)
    def T(zs, p, mir):
        cxx, cyy, sc, rot = p; w = np.array(zs) - CEN
        if mir: w = np.conj(w)
        w = w * np.exp(1j * math.radians(rot)) * sc; return list(zip(cxx + w.real, cyy - w.imag))
    def rend(p, gens, mir):
        img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img); d.polygon(T(O, p, mir), fill=2)
        if gens is not None:
            lower = [O[k] for k in range(i1 * 12, -1, -1)]
            d.polygon(T(list(rounded(gens, 'toward')) + lower, p, mir), fill=1)
            m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(T(O, p, mir), fill=1); return np.array(img) * np.array(m)
        return np.array(img)
    best = max(((((rend((cx, cy, sc0, r), None, 0) > 0) == (cls > 0)) & disc).sum() / disc.sum(), r) for r in np.arange(-30, 30, 1.0))
    print(name, 'outline fit', round(best[0], 4), best[1])
    res = []
    for combo in itertools.product(V.keys(), repeat=n):
        for k6 in range(6):
            for mir in (0, 1):
                R = rend((cx, cy, sc0, best[1] + 60 * k6), [V[c] for c in combo], mir)
                inside = disc & (R > 0) & (cls > 0)
                res.append((round(((R == cls) & inside).sum() / inside.sum(), 4), combo, 60 * k6, mir))
    res.sort(reverse=True); print(res[:8])
