exec(open('p68fit.py').read().split("cands = ")[0])
from scipy.ndimage import gaussian_filter
Ab = gaussian_filter(A.astype(float), 2)
def corr(M):
    Mb = gaussian_filter(M.astype(float), 2)
    a = Ab - Ab.mean(); b = Mb - Mb.mean(); return (a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum())
MXg = lambda G: mirror(G)
for name, gens in (('13:3', [D13] * 3), ('13:4', [D13] * 4), ('m13:4', [mirror(D13)] * 4), ('13,m13 alt4', [D13, mirror(D13)] * 2), ('m13,13 alt4', [mirror(D13), D13] * 2)):
    best = max(((corr(render(gens, x0 + dx, 892 + dy, sc * k)), dx, dy, k) for dx in (-3, 0, 3) for dy in (-6, -3, 0, 3) for k in (0.995, 1, 1.005)))
    print(name, [round(v, 4) if isinstance(v, float) else v for v in best])
