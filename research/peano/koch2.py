import cmath, math, numpy as np
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
def apex(phi_deg, gamma_deg=90.0):
    a = math.radians(phi_deg); g = math.radians(gamma_deg); b = math.pi - a - g
    return math.sin(b) / math.sin(g) * cmath.exp(1j * a)
def curve(A, codes, n, start=0j, end=1 + 0j):
    g = [0j, A, 1 + 0j]
    out = [start]
    def rec(a, b, m, rev, d):
        if d == 0:
            out.append(a if rev else b); return
        gg = [z.conjugate() for z in g] if m else g
        p = [a + (b - a) * z for z in gg]
        kids = []
        for k in range(2):
            c = codes[k]; cm = m ^ (c & 1); cr = 1 if c >= 2 else 0
            if cr: kids.append((p[k + 1], p[k], cm, 1))
            else: kids.append((p[k], p[k + 1], cm, 0))
        order = kids if not rev else kids[::-1]
        for (x, y, cm, cr) in order: rec(x, y, cm, rev ^ cr, d - 1)
    rec(start, end, 0, 0, n)
    return out
def draw(pts, size=600, pad=14, width=1, fill=None, bbox=None):
    xs = [p.real for p in pts]; ys = [p.imag for p in pts]
    x0, x1, y0, y1 = bbox or (min(xs), max(xs), min(ys), max(ys))
    s = (size - 2 * pad) / max(x1 - x0, y1 - y0)
    P = [(pad + (p.real - x0) * s, size - pad - (p.imag - y0) * s) for p in pts]
    im = Image.new('L', (size, size), 236)
    if fill:
        acc = np.zeros((size, size), bool)
        for i in range(1, len(P) - 1):
            m = Image.new('1', (size, size), 0); ImageDraw.Draw(m).polygon([P[0], P[i], P[i + 1]], fill=1); acc ^= np.array(m, bool)
        a = np.array(im); a[acc] = 20; im = Image.fromarray(a)
    else:
        ImageDraw.Draw(im).line(P, fill=20, width=width)
    return im
