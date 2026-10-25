exec(open('dec.py').read().split("if __name__")[0])
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
r3 = math.sqrt(3)
hexa = [0j, complex(0.5, -r3 / 6), 1 + 0j, complex(1, r3 / 3), complex(0.5, r3 / 2), complex(0, r3 / 3)]
def boundary(j):
    P = list(hexa)
    for k in range(j):
        s = 1 if k % 2 == 0 else -1
        out = []
        for i in range(len(P)):
            a, b = P[i], P[(i + 1) % len(P)]; out += [a, (a + b) / 2 + (b - a) * 1j * s / (2 * r3)]
        P = out
    return P
def arc_pts(a, b, side, n=12):
    # 60° arc from a to b bulging to `side` (+1 left, -1 right); radius = |b-a|
    m = (a + b) / 2; d = b - a; L = abs(d)
    # centre on the opposite side at distance L*cos30
    c = m - d / L * 1j * side * L * r3 / 2
    a0 = np.angle(a - c); a1 = np.angle(b - c)
    da = (a1 - a0 + np.pi) % (2 * np.pi) - np.pi
    return [c + L * np.exp(1j * (a0 + da * t)) for t in np.linspace(0, 1, n)]
def curve_children(gens):
    # leaf maps (f, rev) in traversal order
    out = []
    def rec(f, rev, d):
        if d == len(gens): out.append((f, rev)); return
        kids = gens[d]
        for g, s in (kids[::-1] if rev else kids): rec(comp(f, g), rev ^ s, d + 1)
    rec((1 + 0j, 0j, 0), 0, 0)
    return out
def rounded_curve(gens, mode):
    pts = []
    for f, rev in curve_children(gens):
        a, b = app(f, 0j), app(f, 1 + 0j)
        dom = -1 if f[2] else 1      # own domain on the left unless mirrored (relative to chord a->b)
        if rev: a, b = b, a; dom = -dom
        side = dom if mode == 'toward' else -dom
        pts += arc_pts(a, b, side)[:-1]
    pts.append(1 + 0j)
    return pts
def render(gens, mode, j, W=500):
    B = boundary(j)
    # boundary with inward arcs (interior is on the left for CCW)
    Bp = []
    for i in range(len(B)): Bp += arc_pts(B[i], B[(i + 1) % len(B)], 1)[:-1]
    C = rounded_curve(gens, mode)
    # upper arc of boundary: from tip 1 (index of 1+0j) going CCW to tip 0
    n = len(Bp); i1 = int(np.argmin(np.abs(np.array(Bp) - 1))); i0 = int(np.argmin(np.abs(np.array(Bp) - 0)))
    upper = [Bp[(i1 + k) % n] for k in range((i0 - i1) % n + 1)]
    sc = W / 1.5; T = lambda z: ((z.real + 0.25) * sc, W - (z.imag + 0.42) * sc)
    im = Image.new('L', (W, W), 20); d = ImageDraw.Draw(im)
    d.polygon([T(z) for z in Bp], fill=225)               # inside snowflake light
    d.polygon([T(z) for z in C + upper[1:]], fill=140)    # left of the curve: darker gray
    return im
tiles = []
for mode in ('toward', 'away'):
    for gens, j in (([D13], 0), ([D13, D13], 2)):
        tiles.append(render(gens, mode, j))
book = Image.open(FG + 'p69_small.png').convert('L').resize((500, int(500 * 744 / 800)))
out = Image.new('L', (5 * 510, 510), 255); out.paste(book, (0, 0))
for k, t in enumerate(tiles): out.paste(t, ((k + 1) * 510, 0))
out.save(FG + 'round69_cmp.png')
