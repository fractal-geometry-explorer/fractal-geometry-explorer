import numpy as np, sys
from PIL import Image, ImageDraw
exec(open('altdragon.py').read().split('for name')[0])
n = int(sys.argv[1]); prune = int(sys.argv[2])
D1 = alt_dragon([1] * n)
C = np.concatenate([D1, (1 - D1)[1:]])  # closed: 0->1 then 1->0
# lattice: step h, direction rotated; map to integer grid
d0 = C[1] - C[0]
U = (C - C[0]) / d0          # now steps are +-1, +-i
G = np.round(np.stack([U.real, U.imag], 1)).astype(int)
assert np.allclose(U, G[:, 0] + 1j * G[:, 1], atol=1e-6)
mn = G.min(0) - 1; G = G - mn; W, H = G.max(0) + 2
# edges used
used = set()
for a, b in zip(G[:-1], G[1:]): used.add((min(tuple(a), tuple(b)), max(tuple(a), tuple(b))))
# winding number for cell (i,j) = square [i,i+1]x[j,j+1]: count vertical edges at x <= i with signed direction
wind = np.zeros((W, H), int)
for a, b in zip(G[:-1], G[1:]):
    if a[0] == b[0]:  # vertical edge at x=a0, spanning y in [min,min+1]
        y = min(a[1], b[1]); s = 1 if b[1] > a[1] else -1
        wind[a[0]:, y] += s     # cells with i >= x are to the right
inside = wind != 0
# visits per vertex: turns
turns = {}
for k in range(1, len(G) - 1):
    v = tuple(G[k]); ein = G[k] - G[k - 1]; eout = G[k + 1] - G[k]
    turns.setdefault(v, []).append((tuple(-ein), tuple(eout)))  # the two edge directions bounding the cut quadrant
# also closing vertex (start=end)
v = tuple(G[0]); turns.setdefault(v, []).append((tuple(-(G[-1] - G[-2])), tuple(G[1] - G[0])))
segs = []
def cell(v, dx, dy):  # quadrant cell at vertex v in direction (dx,dy) in {-1,1}
    return (v[0] + (0 if dx > 0 else -1), v[1] + (0 if dy > 0 else -1))
adj = {}
def link(c1, c2):
    if inside[c1] and inside[c2]:
        adj.setdefault(c1, set()).add(c2); adj.setdefault(c2, set()).add(c1)
for v, T in turns.items():
    cut = set()
    for e1, e2 in T: cut.add((e1[0] + e2[0], e1[1] + e2[1]))   # quadrant direction (dx,dy)
    free = [q for q in ((1, 1), (-1, 1), (-1, -1), (1, -1)) if q not in cut]
    if len(T) == 2 and len(free) == 2: link(cell(v, *free[0]), cell(v, *free[1]))
# edge-adjacent through unused edges
for i in range(W - 1):
    for j in range(H - 1):
        if inside[i, j]:
            if inside[i + 1, j] and (((i + 1, j), (i + 1, j + 1)) not in used): link((i, j), (i + 1, j))
            if inside[i, j + 1] and (((i, j + 1), (i + 1, j + 1)) not in used): link((i, j), (i, j + 1))
nodes = set(adj)
print('inside cells', inside.sum(), 'tree nodes', len(nodes), 'edges', sum(len(s) for s in adj.values()) // 2)
for _ in range(prune):
    leaves = [c for c in adj if len(adj[c]) == 1]
    for c in leaves:
        for o in adj[c]: adj[o].discard(c)
        del adj[c]
S = 900; sc = S / max(W, H)
im = Image.new('L', (S, S), 255); d = ImageDraw.Draw(im)
for c, nb in adj.items():
    for o in nb:
        if o > c: d.line([((c[0] + .5) * sc, S - (c[1] + .5) * sc), ((o[0] + .5) * sc, S - (o[1] + .5) * sc)], fill=0, width=2)
im.save('/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/river_try.png')
