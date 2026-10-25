from kfit import *
S, bar, xl, xr = silhouette('v-072.png', (219, 255, 2146, 1276))
S = S[::2, ::2]; bar //= 2; xl //= 2; xr //= 2
print('silhouette', S.shape, 'bar row', bar, 'x', xl, xr)
c60 = cmath.exp(1j * math.pi / 3)
def gen5(a, b):
    c = 1 - 2 * a - b
    p1 = a; p2 = a + b * c60; p3 = p2 + c; p4 = p3 + b * c60.conjugate()
    return [0j, complex(p1), p2, p3, p4, 1 + 0j], [a, b, c, b, a]
best = None
for a in np.arange(0.16, 0.34, 0.01):
    for b in np.arange(0.2, 0.5, 0.01):
        if 1 - 2 * a - b < 0.05: continue
        g, rs = gen5(a, b)
        pts = curve(g, [0, 0, 0, 0, 0], 0.012)
        sc = iou(S, render(pts, S.shape, xl, xr, bar))
        if not best or sc > best[0]: best = (sc, a, b)
print('coarse best', best)
sc0, a0, b0 = best
for a in np.arange(a0 - 0.012, a0 + 0.012, 0.002):
    for b in np.arange(b0 - 0.012, b0 + 0.012, 0.002):
        g, rs = gen5(a, b)
        pts = curve(g, [0, 0, 0, 0, 0], 0.006)
        sc = iou(S, render(pts, S.shape, xl, xr, bar))
        if sc > best[0]: best = (sc, a, b)
sc, a, b = best
print('fine best IoU %.4f a %.3f b %.3f c %.3f  D %.4f' % (sc, a, b, 1 - 2 * a - b, dimension([a, b, 1 - 2 * a - b, b, a])))
