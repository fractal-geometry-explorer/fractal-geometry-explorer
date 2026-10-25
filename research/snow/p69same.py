exec(open('dec.py').read().split("if __name__")[0])
def segset(gens):
    P = curve(gens); key = lambda z: (round(z.real * 1e7), round(z.imag * 1e7))
    return set(tuple(sorted((key(a), key(b)))) for a, b in zip(P[:-1], P[1:])), [key(z) for z in P]
for n in (1, 2, 3):
    A, pa = segset([D13] * n); B, pb = segset([G13] + [mirror(G13)] * (n - 1))
    print(n, 'same segments:', A == B, 'same order:', pa == pb, len(A ^ B))
