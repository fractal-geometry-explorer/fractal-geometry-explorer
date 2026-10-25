import math, cmath
import numpy as np
from matplotlib.path import Path
from mfit import mgon_island
def quartet(a, b, d, sg=1):
    v = complex(1, 2*sg)/5
    g = [0, v, 2*v, 2*v - 1j*sg*v, v - 1j*sg*v, 1]
    codes = [2, 0, 0, 2, 0]
    if d == 0: return [a, b]
    p = [a + (b-a)*gk for gk in g]
    out = [a]
    for k in range(5):
        c = quartet(p[k], p[k+1], d-1, sg) if codes[k] == 0 else quartet(p[k+1], p[k], d-1, sg)[::-1]
        out += c[1:]
    return out
if __name__ == '__main__':
    s1 = quartet(0, 1, 1); s2 = quartet(0, 1, 2)
    print('stage1', [f'{p.real:.2f},{p.imag:.2f}' for p in s1])
    print('stage2 n', len(s2) - 1, 'end', s2[-1])
    R = 1.0
    I = mgon_island(4, 7, -1, R, math.pi/4)
    path = Path([(p.real, p.imag) for p in I])
    V = [R*cmath.exp(1j*(math.pi/4 + k*math.pi/2)) for k in range(4)]
    res = []
    for k in range(4):
        for fwd in (1, -1):
            a, b = (V[k], V[(k+1) % 4]) if fwd > 0 else (V[(k+1) % 4], V[k])
            for sg in (1, -1):
                Q = quartet(a, b, 6, sg)
                inside = path.contains_points([(p.real, p.imag) for p in Q[::3]]).mean()
                res.append((inside, k, fwd, sg))
    res.sort(reverse=True)
    for r in res[:6]: print('inside %.4f  edge %d  dir %+d  sigma %+d' % r)
