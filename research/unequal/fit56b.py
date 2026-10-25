from kfit import *
S, bar, xl, xr = silhouette('v-072.png', (219, 255, 2146, 1276))
S = S[::2, ::2]; bar //= 2; xl //= 2; xr //= 2
E = lambda deg: cmath.exp(1j * math.radians(deg))
def gen7(a, b):
    c = 1 - 2 * a
    pts = [0j, a + 0j]
    for leg, ang in ((b, 120), (b, 60), (c, 0), (b, -60), (b, -120), (a, 0)):
        pts.append(pts[-1] + leg * E(ang))
    return pts, [a, b, b, c, b, b, a]
def gen4(a):
    b = (1 - 2 * a)
    return [0j, a + 0j, a + b * E(60), 1 - a + 0j, 1 + 0j], [a, b, b, a]
def score(g, codes, eps=0.01):
    return iou(S, render(curve(g, codes, eps), S.shape, xl, xr, bar))
best = None
for a in np.arange(0.2, 0.42, 0.01):
    for b in np.arange(0.1, 0.45, 0.01):
        g, rs = gen7(a, b)
        sc = score(g, [0] * 7)
        if not best or sc > best[0]: best = (sc, a, b)
sc0, a0, b0 = best
for a in np.arange(a0 - 0.012, a0 + 0.013, 0.002):
    for b in np.arange(b0 - 0.012, b0 + 0.013, 0.002):
        g, rs = gen7(a, b); sc = score(g, [0] * 7, 0.005)
        if sc > best[0]: best = (sc, a, b)
sc, a, b = best
print('7-leg: IoU %.4f a %.3f b %.3f c %.3f D %.4f' % (sc, a, b, 1 - 2 * a, dimension(gen7(a, b)[1])))
best4 = max((score(gen4(a)[0], [0] * 4), a) for a in np.arange(0.2, 0.45, 0.005))
print('4-leg Koch: IoU %.4f a %.3f D %.4f' % (best4[0], best4[1], dimension(gen4(best4[1])[1])))
