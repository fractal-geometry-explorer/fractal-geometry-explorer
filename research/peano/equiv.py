import math, cmath
def cesaro(a, b, n, apex_of_stage, stage=1, m=0, rev=0, out=None):
    # generic: apex A (y to the left of travel), codes [1,1]; apex may depend on stage
    if out is None: out = [a]
    def rec(a, b, m, rev, d, k):
        if d == 0: out.append(a if rev else b); return
        A = apex_of_stage(k); A = A.conjugate() if m else A
        c = a + (b - a) * A
        kids = [(a, c, m ^ 1, 0), (c, b, m ^ 1, 0)]
        for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec(x, y, cm, rev ^ cr, d - 1, k + 1)
    rec(a, b, m, rev, n, stage)
    return out
def ap(theta): h = 0.5 / math.tan(math.radians(theta) / 2); return complex(0.5, -h)
# two-sweep: [0,1] then [1,0], first stage at 90°, then 95°
f = lambda k: ap(90) if k == 1 else ap(95)
two = cesaro(0j, 1 + 0j, 14, f) + cesaro(1 + 0j, 0j, 14, f)[1:]
# four-sweep along the sides of the square with diagonal [0,1]: corners 0, c1, 1, c2
A90 = ap(90); c1 = A90; c2 = A90.conjugate()
corners = [0j, (1 + 0j) * A90, 1 + 0j]
g = lambda k: ap(95)
# side orientation: as produced by stage 1 of each sweep
s1 = cesaro(0j, 1 + 0j, 1, f); s2 = cesaro(1 + 0j, 0j, 1, f)
print('stage-1 corners', s1, s2)
four = []
for (a, b) in [(s1[0], s1[1]), (s1[1], s1[2]), (s2[0], s2[1]), (s2[1], s2[2])]:
    pts = cesaro(a, b, 13, g, m=1)   # children are mirrored relative to the parent (code 1)
    four += pts if not four else pts[1:]
d = max(abs(p - q) for p, q in zip(two, four))
print('points', len(two), len(four), 'max difference', d)
