from PIL import Image, ImageDraw
from gens import GENS
from check import island
def render(P, size=260, pad=12):
    xs = [p.real for p in P]; ys = [p.imag for p in P]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    s = (size - 2*pad) / max(x1-x0, y1-y0)
    cx, cy = (x0+x1)/2, (y0+y1)/2
    im = Image.new('L', (size, size), 230); d = ImageDraw.Draw(im)
    d.polygon([(size/2 + (p.real-cx)*s, size/2 - (p.imag-cy)*s) for p in P], fill=20)
    return im
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
rows = []
for N, (G, bb) in GENS.items():
    row = []
    for n in ((1, 2) if N != 98 else (1, 2)):
        for sg in (1, -1):
            row.append(render(island(G, bb, n, sg)))
    rows.append(row)
out = Image.new('L', (4*270, len(rows)*270), 255)
for j, r in enumerate(rows):
    for i, im in enumerate(r): out.paste(im, (i*270, j*270))
out.save(FG + 'quad_chir.png')
