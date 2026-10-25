exec(open('p69fit.py').read().split("W = 815")[0])
src = open('p69fit.py').read(); exec(src[src.index("def koch_outline"):src.index("CEN = ")]); exec(src[src.index("def curve_leaves"):src.index("def score")])
from scipy.ndimage import gaussian_filter, label, binary_dilation, binary_erosion
from scipy.optimize import minimize
import itertools
CEN = complex(0.5, r3 / 6)
G13Sraw = substitute(S, 4, S)
V = {'D13': D13, 'mD13': mirror(D13), 'G13': G13, 'mG13': mirror(G13)}
for name, n, j in (('p69_c1.png', 1, 2), ('p69_c2.png', 2, 5)):
    g = gaussian_filter(np.array(Image.open(FG + name).convert('L')).astype(float), 2)
    H, W = g.shape
    cls = np.where(g < 75, 0, np.where(g > 165, 2, 1))
    lab, _ = label(cls > 0); inner = lab == lab[H // 2, W // 2]
    ys, xs = np.nonzero(inner); cx, cy = xs.mean(), ys.mean()
    # disc of black around
    lb, _ = label(cls == 0); sizes = np.bincount(lb.ravel()); sizes[0] = 0; ring = lb == sizes.argmax()
    yy, xx = np.nonzero(ring); R0 = np.hypot(xx - cx, yy - cy).max()
    gy, gx = np.mgrid[0:H, 0:W]; disc = np.hypot(gx - cx, gy - cy) < R0 * 0.97
    def O_of(side):
        outl = koch_outline(j); O = []
        for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], side, 10)
        return outl, O
    def render(p, gens, side, mir, rule='toward'):
        cxx, cyy, sc, rot = p; Rm = np.exp(1j * math.radians(rot))
        def T(zs):
            w = np.array(zs) - CEN
            if mir: w = np.conj(w)
            w = w * Rm * sc; return list(zip(cxx + w.real, cyy - w.imag))
        outl, O = O_of(side); i1 = [k for k, z in enumerate(outl) if abs(z - 1) < 1e-9][0]
        lower = [O[k] for k in range(i1 * 10, -1, -1)]
        img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img); d.polygon(T(O), fill=2)
        if gens is not None: d.polygon(T(rounded(gens, rule) + lower), fill=1)
        m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(T(O), fill=1)
        return np.array(img) * np.array(m)
    sc0 = math.sqrt(inner.sum() / (1.6 * r3 / 4))
    best = None
    for side in (1, -1):
        for rot in np.arange(-30, 30, 2):
            p = (cx, cy, sc0, rot); R = render(p, None, side, 0)
            s = (((R > 0) == (cls > 0)) & disc).mean()
            if best is None or s > best[0]: best = (s, side, rot)
    print(name, 'outline', best)
    side, rot = best[1], best[2]
    res = []
    for combo in itertools.product(V.keys(), repeat=n):
        for k6 in range(6):
            for mir in (0, 1):
                for rule in ('toward', 'away'):
                    R = render((cx, cy, sc0, rot + 60 * k6), [V[c] for c in combo], side, mir, rule)
                    s = ((R == cls) & disc).sum() / disc.sum()
                    res.append((round(s, 4), combo, k6 * 60, mir, rule))
    res.sort(reverse=True); print(res[:6])
