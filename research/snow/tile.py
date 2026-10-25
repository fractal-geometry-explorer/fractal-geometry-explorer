exec(open('dec.py').read().split("if __name__")[0])
from PIL import Image, ImageDraw
def koch_snowflake(n):
    tri = [0j, complex(0.5, math.sqrt(3) / 2), 1 + 0j]   # clockwise so bumps point outward? check
    pts = []
    for a, b in zip(tri, tri[1:] + tri[:1]):
        seg = [a, b]
        for _ in range(n):
            new = [seg[0]]
            for p, q in zip(seg[:-1], seg[1:]):
                d = (q - p) / 3; c1 = p + d; c2 = p + 2 * d; tip = c1 + d * complex(0.5, math.sqrt(3) / 2)
                new += [c1, tip, c2, q]
            seg = new
        pts += seg[:-1]
    return np.array(pts)
K = koch_snowflake(5)
print('K extent', K.real.min(), K.real.max(), K.imag.min(), K.imag.max())
G = 900
def raster(poly, sc=600, ox=150, oy=650):
    im = Image.new('L', (G, G), 0); ImageDraw.Draw(im).polygon([(ox + z.real * sc, oy - z.imag * sc) for z in poly], fill=1); return np.array(im).astype(int)
base = raster(K)
for name, gen in (('S', S), ('F', F), ('D13', D13)):
    acc = np.zeros_like(base)
    for f, r in gen: acc += raster(app(f, K))
    print(name, 'base area px', base.sum(), 'union', (acc > 0).sum(), 'overlap px', (acc > 1).sum(), 'outside', ((acc > 0) & (base == 0)).sum(), 'missed', ((acc == 0) & (base > 0)).sum())
