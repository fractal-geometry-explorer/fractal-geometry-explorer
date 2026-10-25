import numpy as np, math
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, label
exec(open('dec.py').read().split("if __name__")[0])
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
r3 = math.sqrt(3)
W = 815
book = gaussian_filter(np.array(Image.open(FG + 'p69_L.png').convert('L').resize((W, 818))).astype(float), 1.2)
H = book.shape[0]
cls = np.where(book < 80, 0, np.where(book > 165, 2, 1))           # 0 black, 1 gray, 2 light
lab, _ = label(cls > 0); inner = lab == lab[H // 2, W // 2]
ys, xs = np.nonzero(inner)
cx, cy = xs.mean(), ys.mean(); A = inner.sum()
K_AREA = 1.6 * r3 / 4
scale = math.sqrt(A / K_AREA)
print('centre', cx, cy, 'scale px/unit', scale)
def koch_outline(j):
    P = [0j, complex(0.5, -r3 / 6), 1 + 0j, complex(1, r3 / 3), complex(0.5, r3 / 2), complex(0, r3 / 3)]
    for k in range(j):
        s = 1 if k % 2 == 0 else -1
        Q = []
        for i in range(len(P)):
            a, b = P[i], P[(i + 1) % len(P)]; Q += [a, (a + b) / 2 + (b - a) * 1j * s / (2 * r3)]
        P = Q
    return P
def arc(a, b, side, n=8):
    m = (a + b) / 2; d = b - a; L = abs(d); c = m - d / L * 1j * side * L * r3 / 2
    a0 = np.angle(a - c); da = (np.angle(b - c) - a0 + np.pi) % (2 * np.pi) - np.pi
    return [c + L * np.exp(1j * (a0 + da * t / n)) for t in range(n)]
CEN = complex(0.5, r3 / 6)
def mapper(rot, mir, dx=0, dy=0, ds=1):
    R = np.exp(1j * rot)
    def T(z):
        w = z - CEN
        if mir: w = np.conj(w)
        w = w * R * scale * ds
        return (cx + dx + w.real, cy + dy - w.imag)
    return T
def render(curvepts, outline, oside, T):
    O = []
    for i in range(len(outline)): O += arc(outline[i], outline[(i + 1) % len(outline)], oside)
    per = 8; i1 = [k for k, z in enumerate(outline) if abs(z - 1) < 1e-9][0]
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    d.polygon([T(z) for z in O], fill=2)
    lower = [O[k] for k in range(i1 * per, -1, -1)]
    d.polygon([T(z) for z in list(curvepts) + lower], fill=1)
    # re-black the outside of the outline (the gray polygon may spill)
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon([T(z) for z in O], fill=1)
    return np.array(img) * np.array(m)
def curve_leaves(gens):
    out = []
    def rec(f, rev, d):
        if d == len(gens): out.append((f, rev)); return
        for g, s in (gens[d][::-1] if rev else gens[d]): rec(comp(f, g), rev ^ s, d + 1)
    rec((1 + 0j, 0j, 0), 0, 0); return out
def rounded(gens, rule):
    pts = []
    for f, rev in curve_leaves(gens):
        a, b = app(f, 0j), app(f, 1 + 0j); dom = -1 if f[2] else 1
        if rev: a, b = b, a; dom = -dom
        side = {'toward': dom, 'away': -dom, 'left': 1, 'right': -1}[rule]
        pts += arc(a, b, side)
    pts.append(1 + 0j); return pts
def score(R): return (R == cls).mean()
