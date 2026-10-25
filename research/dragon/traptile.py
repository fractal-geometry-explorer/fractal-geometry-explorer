exec(open('trap.py').read().split('ims = []')[0])
import numpy as np
# domain of each S interval: trapezoid (0,0),(1,0),(1,cot),(0,tan) in the interval's frame (s=+1); mirrored for s=-1
def check(phi, n=6, G=700):
    t = math.tan(math.radians(phi)); T = [0, 1, 1 + 1j / t, 1j * t]
    segs = gen_sweep(apex(phi), n, True, False, False)
    S = [x for x in segs if x[2] == 'S'] if n % 2 == 0 else None
    big = np.zeros((G, G), np.int32)
    def poly(L, s, p, q):
        return [p + (q - p) * (z if s > 0 else z.conjugate()) for z in L]
    xs = [z.real for z in T]; ys = [z.imag for z in T]
    sc = (G - 20) / max(max(xs) - min(xs), max(ys) - min(ys))
    tf = lambda z: (10 + (z.real - min(xs)) * sc, G - 10 - (z.imag - min(ys)) * sc)
    for p, q, ty, s in S:
        im = Image.new('L', (G, G), 0); ImageDraw.Draw(im).polygon([tf(z) for z in poly(T, s, p, q)], fill=1)
        big += np.array(im)
    im = Image.new('L', (G, G), 0); ImageDraw.Draw(im).polygon([tf(z) for z in T], fill=1); m0 = np.array(im)
    return (big > 1).sum() / m0.sum(), ((big > 0) != (m0 > 0)).sum() / m0.sum(), len(S)
for phi in (15, 20, 25, 30, 35, 40, 45):
    print(phi, check(phi, 6))
