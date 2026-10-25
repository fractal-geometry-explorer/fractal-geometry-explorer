import itertools
def build(rule_of_stage, n, a=0j, b=1+0j):
    # segments carry (start, end, mirror m); generator apex side s (+1 left, -1 right) and child codes (mirror, reverse)
    segs = [(a, b, 0)]
    for k in range(1, n + 1):
        s, codes = rule_of_stage(k)
        out = []
        for (p, q, m) in segs:
            side = s * (-1 if m else 1)
            c = p + (q - p) * complex(0.5, 0.5 * side)
            kids = []
            for j, (x, y) in enumerate(((p, c), (c, q))):
                cm, cr = codes[j]
                if cr: kids.append((y, x, m ^ cm ^ 1, True))     # reversing flips left/right too
                else: kids.append((x, y, m ^ cm, False))
            # a reversed child is still traversed forwards along the curve: store as forward segment with flipped mirror
            for (x, y, mm, r) in kids:
                out.append((y, x, mm) if r else (x, y, mm))
        segs = out
    pts = [segs[0][0]] + [q for (_, q, _) in segs]
    return pts, segs
target4 = [(0,0),(.25,0),(.25,.25),(.25,.5),(0,.5),(0,.75),(.25,.75),(.5,.75),(.5,.5),(.5,.75),(.75,.75),(1,.75),(1,.5),(.75,.5),(.75,.25),(.75,0),(1,0)]
T4 = [complex(x, y) for x, y in target4]
codesets = list(itertools.product(itertools.product((0, 1), (0, 1)), repeat=2))
hits = []
for so, co, se, ce in itertools.product((1, -1), codesets, (1, -1), codesets):
    rule = lambda k: (so, co) if k % 2 == 1 else (se, ce)
    pts, _ = build(rule, 4)
    if all(abs(p - t) < 1e-9 for p, t in zip(pts, T4)): hits.append((so, co, se, ce))
print('uniform rules (odd/even stages) reproducing stage 4:', len(hits))
for h in hits[:10]: print(h)
