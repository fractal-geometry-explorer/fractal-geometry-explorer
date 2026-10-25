exec(open('qtree.py').read().split("for name, L in")[0])
from matplotlib.path import Path
u = (1 + 2j) / 5; v = (2 - 1j) / 5
def koch_side(a, b, n):
    pts = [a, b]
    for _ in range(n):
        new = [pts[0]]
        for p, q in zip(pts[:-1], pts[1:]):
            d = q - p; new += [p + d * v, p + d * (v + u), q]
        pts = new
    return pts
sq = [0, 1, 1 + 1j, 1j]
B = []
for k in range(4): B += koch_side(sq[k], sq[(k + 1) % 4], 6)[:-1]
poly = Path(np.array([[z.real, z.imag] for z in B]))
for codes in [(0, 0, 0, 1, 1), (1, 1, 1, 0, 0), (2, 2, 0, 3, 3), (3, 3, 1, 2, 2)]:
    segs = stage_l(F_links, codes, 5)
    M = np.array([[((p + q) / 2).real, ((p + q) / 2).imag] for p, q in segs])
    print(codes, 'fraction of link midpoints inside the quartet', poly.contains_points(M).mean().round(3))
H0 = stage_l(H_links, (0, 0, 0, 0, 0), 5)
M = np.array([[((p + q) / 2).real, ((p + q) / 2).imag] for p, q in H0]); print('H all-0', poly.contains_points(M).mean().round(3))
