from kfit import *
import itertools
W, H = 2190, 2553
S, bar, xl, xr = silhouette('v-073.png', (int(W*0.03), int(H*0.06), int(W*0.92), int(H*0.52)))
S = S[::2, ::2]; bar //= 2; xl //= 2; xr //= 2
print('silhouette', S.shape, bar, xl, xr, 'land fraction above bar', S.mean().round(3))
best = None
for codes in itertools.product(range(4), repeat=2):
    for xa in np.arange(0.30, 0.365, 0.008):
        for ya in np.arange(0.42, 0.48, 0.008):
            g = [0j, complex(xa, ya), 1 + 0j]
            sc = iou(S, render(curve(g, list(codes), 0.012), S.shape, xl, xr, bar))
            if not best or sc > best[0]: best = (sc, codes, xa, ya)
print('coarse', best)
sc, codes, xa0, ya0 = best
for xa in np.arange(xa0 - 0.008, xa0 + 0.0081, 0.002):
    for ya in np.arange(ya0 - 0.008, ya0 + 0.0081, 0.002):
        g = [0j, complex(xa, ya), 1 + 0j]
        s2 = iou(S, render(curve(g, list(codes), 0.006), S.shape, xl, xr, bar))
        if s2 > best[0]: best = (s2, codes, xa, ya)
sc, codes, xa, ya = best
r1, r2 = abs(complex(xa, ya)), abs(complex(1 - xa, -ya))
ang = math.degrees(math.acos(((-xa) * (1 - xa) + (-ya) * (-ya)) / (r1 * r2)))
print('best IoU %.4f codes %s apex (%.3f, %.3f) r1 %.4f r2 %.4f apex angle %.2f D %.4f' % (sc, codes, xa, ya, r1, r2, ang, dimension([r1, r2])))
