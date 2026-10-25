from gens import GENS
def island(G, bb, n, sg):
    side = bb ** n
    P = [0, side, side + 1j*side, 1j*side]
    for _ in range(n):
        Q = []
        m = len(P)
        for i in range(m):
            a, b = P[i], P[(i+1) % m]
            d = (b - a) / bb
            d = complex(round(d.real), round(d.imag))
            for (x, y) in G[:-1]:
                Q.append(a + d * complex(x, sg*y))
        P = [complex(round(p.real), round(p.imag)) for p in Q]
    return P
def area2(P):
    s = 0
    for i in range(len(P)):
        a, b = P[i], P[(i+1) % len(P)]
        s += a.real*b.imag - b.real*a.imag
    return s
if __name__ == "__main__":
    for N, (G, bb) in GENS.items():
        steps = [(G[k+1][0]-G[k][0], G[k+1][1]-G[k][1]) for k in range(len(G)-1)]
        unit = all(abs(dx)+abs(dy) == 1 for dx, dy in steps)
        sym = all((bb - G[k][0], -G[k][1]) == G[len(G)-1-k] for k in range(len(G)))
        distinct = len(set(G)) == len(G)
        print(f'N={N} b={bb}: steps={len(steps)} unit={unit} point-symmetric={sym} self-avoiding path={distinct} N==b^2/2: {N == bb*bb//2}')
        for n in (1, 2) if N < 98 else (1, 2):
            P = island(G, bb, n, 1)
            verts = len(P); uniq = len(set(P))
            print(f'   stage {n}: sides {verts} (expect {4*N**n}), distinct vertices {uniq}, area/side^2 {area2(P)/2/(bb**n)**2:.6f}')
