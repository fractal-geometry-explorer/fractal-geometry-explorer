import math, cmath, numpy as np
def square_sweep(n):
    # types: 'S' side of a square, 'R' corner->mid of a 1:2 rectangle, 'Q' mid->corner; sigma = +1 left, -1 right
    segs = [(0j, 1 + 0j, 'S', 1)]
    for _ in range(n):
        out = []
        for p, q, t, s in segs:
            c = p + (q - p) * complex(0.5, 0.5 * s)
            if t == 'S': out += [(p, c, 'R', s), (c, q, 'Q', s)]
            elif t == 'R': out += [(p, c, 'S', -s), (c, q, 'S', s)]
            else: out += [(p, c, 'S', s), (c, q, 'S', -s)]
        segs = out
    return segs
def stats(pts, tag):
    q = [(round(z.real * 1e6), round(z.imag * 1e6)) for z in pts]
    from collections import Counter
    vc = Counter(q); ec = Counter(tuple(sorted((q[i], q[i + 1]))) for i in range(len(q) - 1))
    xs = [z.real for z in pts]; ys = [z.imag for z in pts]
    print(tag, 'steps', len(pts) - 1, 'bbox', round(min(xs), 3), round(max(xs), 3), round(min(ys), 3), round(max(ys), 3),
          '| point passes', dict(Counter(vc.values())), '| edges traced', dict(Counter(ec.values())))
for n in (2, 3, 4, 10, 12):
    segs = square_sweep(n); pts = [segs[0][0]] + [s[1] for s in segs]
    stats(pts, f'square sweep stage {n}')
segs = square_sweep(4); print([(round(s[0].real, 3), round(s[0].imag, 3)) for s in segs] + [(1, 0)])
