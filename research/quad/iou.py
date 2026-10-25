import numpy as np
from PIL import Image, ImageDraw
from gens import GENS
from check import island
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
def silhouette_book(f, box, thr=110):
    a = np.array(Image.open(FG + f).convert('L').crop(box)) < thr
    ys, xs = np.nonzero(a)
    return a[ys.min():ys.max()+1, xs.min():xs.max()+1]
def render_mask(P, shape):
    h, w = shape
    xs = [p.real for p in P]; ys = [p.imag for p in P]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    im = Image.new('L', (w, h), 0); d = ImageDraw.Draw(im)
    d.polygon([((p.real - x0) / (x1 - x0) * (w - 1), (y1 - p.imag) / (y1 - y0) * (h - 1)) for p in P], fill=255)
    return np.array(im) > 127
def iou(a, b): return (a & b).sum() / (a | b).sum()
tests = [('Plate 51 stage 1', 's-067.png', (150, 225, 320, 395), 8, 1), ('Plate 51 stage 2', 's-067.png', (385, 100, 560, 280), 8, 2),
         ('Plate 53 stage 1', 's-069.png', (375, 110, 620, 320), 18, 1), ('Plate 53 stage 2', 's-069.png', (690, 250, 960, 520), 18, 2),
         ('Plate 55 stage 1', 's-071.png', (40, 40, 350, 340), 32, 1), ('Plate 55 stage 2', 's-071.png', (30, 860, 360, 1180), 32, 2)]
for name, f, box, N, n in tests:
    B = silhouette_book(f, box)
    G, bb = GENS[N]
    sc = {sg: iou(B, render_mask(island(G, bb, n, sg), B.shape)) for sg in (1, -1)}
    print(f'{name}: book silhouette {B.shape}, IoU sigma=+1 {sc[1]:.3f}, sigma=-1 {sc[-1]:.3f}')
