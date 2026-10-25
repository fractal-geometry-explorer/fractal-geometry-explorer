exec(open('sweep.py').read().split('def stats')[0])
from PIL import Image, ImageDraw
def processed(n, delta=0.12):
    segs = square_sweep(n)
    off = [delta * (q - p) * 1j * s for p, q, t, s in segs]
    pts = [segs[0][0] + off[0]]
    for k in range(len(segs) - 1):
        p, b, _, _ = segs[k]; _, c, _, _ = segs[k + 1]
        u, v = b - p, c - b; o1, o2 = off[k], off[k + 1]
        cr = (u.conjugate() * v).imag; dt = (u.conjugate() * v).real
        if abs(cr) < 1e-12 and dt < 0: pts.append(b)             # backtrack: pinch to a V
        elif abs(cr) < 1e-12: pts.append(b + (o1 if abs(o1 - o2) < 1e-12 else 0))
        else: pts.append(b + o1 + o2)
    pts.append(segs[-1][1] + off[-1])
    return pts
def render(n, S=440, pad=30, delta=0.12):
    im = Image.new('L', (S + 2 * pad, S + 2 * pad), 235); d = ImageDraw.Draw(im)
    T = lambda z: (pad + z.real * S, pad + S - z.imag * S)
    d.rectangle([T(0j)[0], T(1j)[1], T(1 + 0j)[0], T(0j)[1]], outline=60, width=2)
    P = processed(n, delta)
    d.line([T(z) for z in P], fill=20, width=4)
    return im
row = Image.new('L', (3 * 500, 500), 255)
for i, n in enumerate((2, 4, 6)): row.paste(render(n), (i * 500, 0))
row.save('/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/sqproc.png')
