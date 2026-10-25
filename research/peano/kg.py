import random, math
Z = [(0,0),(1,0),(1,1),(0,1)]
C = (0.5,0.5)
def side(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
def tri_time(P, a, b, c, depth=45):
    t = 0.0; h = 1.0
    for _ in range(depth):
        m = ((a[0]+b[0])/2, (a[1]+b[1])/2)
        h /= 2
        # first sub-triangle (a, c, m) lies on a's side of line c–m
        sa = side(c, m, a); sp = side(c, m, P)
        if sp * sa >= 0:   # same side as a (or on the line): first half
            a, b, c = a, c, m
        else:
            t += h; a, b, c = c, b, m
    return t
def in_tri(P, a, b, c):
    s1, s2, s3 = side(a, b, P), side(b, c, P), side(c, a, P)
    return (s1 >= 0 and s2 >= 0 and s3 >= 0) or (s1 <= 0 and s2 <= 0 and s3 <= 0)
def T(P):
    for k in range(4):
        a, b = Z[k], Z[(k+1) % 4]
        if in_tri(P, a, b, C): return k + tri_time(P, a, b, C)
    raise ValueError
random.seed(3)
worst = 0
for _ in range(200000):
    P = (random.random(), random.random()); Q = (random.random(), random.random())
    if random.random() < 0.5:   # nearby pairs too
        Q = (min(1, max(0, P[0] + random.gauss(0, 0.02))), min(1, max(0, P[1] + random.gauss(0, 0.02))))
    d2 = (P[0]-Q[0])**2 + (P[1]-Q[1])**2; L = abs(T(P) - T(Q))
    if L > 0: worst = max(worst, d2 / L)
print('max |PQ|^2 / |L(P,Q)| over random pairs:', round(worst, 4))
for M in (5, 20, 100, 1000):
    sums = []
    for trial in range(200):
        pts = [(random.random(), random.random()) for _ in range(M)]
        chain = sorted(pts + Z, key=T)
        s = sum((chain[i][0]-chain[i+1][0])**2 + (chain[i][1]-chain[i+1][1])**2 for i in range(len(chain)-1))
        s2 = sum((p[0]-q[0])**2 + (p[1]-q[1])**2 for p, q in zip(sorted(pts, key=T), sorted(pts, key=T)[1:]))
        sums.append((s, s2))
    print('M', M, 'max sum with corners', round(max(x for x, _ in sums), 4), 'max without', round(max(y for _, y in sums), 4))
