exec(open('g13c.py').read().split("print('7 SS'")[0])
im = Image.open(FG + 'g69_13.png').convert('L'); A = np.array(im) < 110; dist = distance_transform_edt(~A)
x0, y0, sc = 903, 676, 697
def child_curve(f, r, H):
    # H's stage-1 curve placed by child map f with reversal r
    P = curve([H]); Q = np.array([app(f, z) for z in P])
    return Q[::-1] if r else Q
codesX = {0: (1 + 0j, 0j, 0), 1: (1 + 0j, 0j, 1), 2: (-1 + 0j, 1 + 0j, 0), 3: (-1 + 0j, 1 + 0j, 1)}   # extra pre-transform on [0,1]
for k, (f, r) in enumerate(G13):
    best = []
    for hn, H in (('G13', G13), ('mG13', mirror(G13))):
        for c, X in codesX.items():
            Q = child_curve(comp(f, X), r ^ (c >> 1), H)
            best.append((round(score(Q, x0, y0, sc, dist), 2), hn, c))
    best.sort()
    print(k + 1, 'len %.3f' % abs(f[0]), best[:3])
