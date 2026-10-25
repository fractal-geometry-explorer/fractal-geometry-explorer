import numpy as np, math
r3 = math.sqrt(3)
def pol(L, a): return L * complex(math.cos(math.radians(a)), math.sin(math.radians(a)))
steps = [pol(1/3, 60), pol(1/3, 60), pol(1/3, 0), pol(1/3, -60), pol(1/r3, 210), pol(1/3, 0), pol(1/3, 0)]
PS = [0j]
for s in steps: PS.append(PS[-1] + s)
O = (1, 3, 3, 3, 2, 1, 3)
# a map is (A, B, m): z -> A*(conj z if m else z) + B ; a child is (map, rev)
def comp(f, g):     # f∘g
    A1, B1, m1 = f; A2, B2, m2 = g
    A2c, B2c = (np.conj(A2), np.conj(B2)) if m1 else (A2, B2)
    return (A1 * A2c, A1 * B2c + B1, m1 ^ m2)
def app(f, z): A, B, m = f; return A * (np.conj(z) if m else z) + B
def children_from(P, codes):
    out = []
    for k, c in enumerate(codes):
        m, rv = c & 1, c >> 1
        a, b = (P[k + 1], P[k]) if rv else (P[k], P[k + 1])
        out.append(((b - a, a, m), rv))
    return out
S = children_from(PS, O)
MX = (-1 + 0j, 1 + 0j, 1)                      # z -> 1 - conj z
def mirror(G): return [(comp(MX, f), r ^ 1) for f, r in G[::-1]]
F = mirror(S)
def substitute(G, leg, H):
    f, r = G[leg]
    sub = [(comp(f, g), r ^ s) for g, s in (H[::-1] if r else H)]
    return G[:leg] + sub + G[leg + 1:]
G13 = substitute(S, 4, F)
G13S = substitute(S, 4, S)
def curve(gens, f=(1 + 0j, 0j, 0), rev=0):
    """gens: list of generators, one per stage"""
    out = [app(f, 0j) if not rev else app(f, 1 + 0j)]
    def rec(f, rev, d):
        if d == len(gens): out.append(app(f, 0j if rev else 1 + 0j)); return
        kids = gens[d]
        for g, s in (kids[::-1] if rev else kids): rec(comp(f, g), rev ^ s, d + 1)
    rec(f, rev, 0)
    return np.array(out)
X3 = (-1 + 0j, 1 + 0j, 1)        # z -> 1 - conj z, with the traversal reversed
def normalise(G):
    """the same children, each written with rev = 0"""
    return [(comp(f, X3), 0) if r else (f, 0) for f, r in G]
D13 = normalise(G13)

if __name__ == '__main__':
    print('ok')
