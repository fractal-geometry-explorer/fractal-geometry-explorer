exec(open('dec.py').read().split("if __name__")[0])
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
from scipy.spatial import ConvexHull
for name, gens in (('S6', [S] * 6), ('D13x4', [D13] * 4), ('F6', [F] * 6)):
    P = curve(gens)
    print(name, len(P), 'x', P.real.min().round(3), P.real.max().round(3), 'y', P.imag.min().round(3), P.imag.max().round(3), 'centroid', np.round(P.mean(), 3))
    W = 700; x0, x1, y0, y1 = P.real.min(), P.real.max(), P.imag.min(), P.imag.max(); s = (W - 40) / max(x1 - x0, y1 - y0)
    im = Image.new('L', (W, W), 255); d = ImageDraw.Draw(im)
    d.line([(20 + (z.real - x0) * s, W - 20 - (z.imag - y0) * s) for z in P], fill=0, width=1)
    d.line([(20 + (0 - x0) * s, W - 20 - (0 - y0) * s), (20 + (1 - x0) * s, W - 20 - (0 - y0) * s)], fill=128, width=3)
    im.save(FG + f'snow_{name}.png')
