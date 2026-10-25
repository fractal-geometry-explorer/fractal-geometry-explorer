from kfit import *
import itertools
S, bar, xl, xr = silhouette('v-072.png', (219, 255, 2146, 1276))
S = S[::2, ::2]; bar //= 2; xl //= 2; xr //= 2
E = lambda deg: cmath.exp(1j * math.radians(deg))
def gen4(a1, a2):
    b = (1 - a1 - a2)
    return [0j, a1 + 0j, a1 + b * E(60), 1 - a2 + 0j, 1 + 0j], [a1, b, b, a2]
res = []
for codes in itertools.product(range(4), repeat=4):
    g, rs = gen4(0.25, 0.25)
    sc = iou(S, render(curve(g, list(codes), 0.008), S.shape, xl, xr, bar))
    res.append((sc, codes))
res.sort(reverse=True)
for r in res[:6]: print('IoU %.4f codes %s' % r)
