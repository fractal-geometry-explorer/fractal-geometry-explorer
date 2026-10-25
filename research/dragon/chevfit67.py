exec(open('trapfit.py').read().split("if __name__")[0])
from scipy.ndimage import gaussian_filter
A = apex(30); flags = (True, False, False)
segs = gen_sweep(A, 9, *flags)
base = []
for p, q, t, s in segs:
    rev = {'S': flags[0], 'R': flags[1], 'Q': flags[2]}[t]
    AA = A if s > 0 else A.conjugate()
    if rev: AA = 1 - AA.conjugate()
    base.append((p, q, p + (q - p) * AA))
Pm = gaussian_filter(pmask, 1.5)
def sc(lo, li):
    polys = [[p, (p + q) / 2 + lo * (F - (p + q) / 2), q, (p + q) / 2 + li * (F - (p + q) / 2)] for p, q, F in base]
    m = draw(polys, 155.82, 1567.34, 1039.54)
    a = m > .5; b = pmask > .5
    return (a & b).sum() / (a | b).sum()
for lo in (0.40, 0.43, 0.46, 0.5):
    print(lo, [round(sc(lo, li), 4) for li in (0.18, 0.21, 0.235, 0.26, 0.3)])
