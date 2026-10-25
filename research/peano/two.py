import cmath, math
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
def apex_iso(theta_deg):
    t = math.radians(theta_deg) / 2
    return complex(0.5, 0.5 / math.tan(t))          # apex to the left of 0→1
def apex_right(alpha_deg):                           # right angle at apex; first leg cos α
    a = math.radians(alpha_deg)
    return math.cos(a) * cmath.exp(1j * a)
def build(A, n, rule, start=0j, end=1 + 0j):
    pts = [start, end]
    for k in range(1, n + 1):
        out = [pts[0]]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            left = rule(i, k)
            g = A if left else A.conjugate()
            out += [a + (b - a) * g, b]
        pts = out
    return pts
polya = lambda i, k: (i + k) % 2 == 1
cesaro = lambda i, k: k % 2 == 0      # initiator [1,0]: odd stages right, even left
def render(pts, name, fill=None, size=700, pad=20, closed=False, width=1):
    xs = [p.real for p in pts]; ys = [p.imag for p in pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    s = (size - 2 * pad) / max(x1 - x0, y1 - y0)
    P = [(pad + (p.real - x0) * s, size - pad - (p.imag - y0) * s) for p in pts]
    im = Image.new('L', (size, size), 236); d = ImageDraw.Draw(im)
    if fill == 'evenodd':
        # rasterise even-odd via scanline parity using a mask per polygon with xor
        import numpy as np
        acc = np.zeros((size, size), bool)
        poly = P + [P[0]]
        # xor fill of triangles fan from first point (works for even-odd)
        for i in range(1, len(P) - 1):
            m = Image.new('1', (size, size), 0); ImageDraw.Draw(m).polygon([P[0], P[i], P[i + 1]], fill=1)
            acc ^= np.array(m, bool)
        arr = np.array(im); arr[acc] = 20; im = Image.fromarray(arr)
    else:
        d.line(P, fill=20, width=width)
    im.save(FG + name)
