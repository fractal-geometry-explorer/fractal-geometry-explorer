import math, cmath, numpy as np
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
def apex(phi):
    a = math.radians(phi); return math.cos(a) * cmath.exp(1j * a)
def gen_sweep(A, n, revS=False, revR=False, revQ=False):
    # two-type square-sweep rule with a general right-angled apex A (short or long leg first)
    segs = [(0j, 1 + 0j, 'S', 1)]
    for _ in range(n):
        out = []
        for p, q, t, s in segs:
            rev = {'S': revS, 'R': revR, 'Q': revQ}[t]
            AA = A if s > 0 else A.conjugate()
            if rev: AA = 1 - AA.conjugate()   # the generator run backwards
            c = p + (q - p) * AA
            if t == 'S': out += [(p, c, 'R', s), (c, q, 'Q', s)]
            elif t == 'R': out += [(p, c, 'S', -s), (c, q, 'S', s)]
            else: out += [(p, c, 'S', s), (c, q, 'S', -s)]
        segs = out
    return segs
def render(segs, size=300, pad=8):
    P = [segs[0][0]] + [s[1] for s in segs]
    xs = [z.real for z in P]; ys = [z.imag for z in P]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys); sc = (size - 2 * pad) / max(x1 - x0, y1 - y0)
    im = Image.new('L', (size, size), 236); d = ImageDraw.Draw(im)
    d.line([(pad + (z.real - x0) * sc, size - pad - (z.imag - y0) * sc) for z in P], fill=20, width=1)
    return im, (round(x0, 3), round(x1, 3), round(y0, 3), round(y1, 3))
ims = []
for flags in [(False, False, False), (True, False, False), (False, True, True), (True, True, True), (False, True, False), (False, False, True)]:
    im, bb = render(gen_sweep(apex(30), 14, *flags)); ims.append(im); print(flags, bb)
out = Image.new('L', (6 * 305, 300), 255)
for i, im in enumerate(ims): out.paste(im, (i * 305, 0))
out.save(FG + 'trap_variants.png')
