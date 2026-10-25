exec(open('gtree.py').read().split("im = Image.open")[0])
from PIL import ImageDraw
def tree_stage(codes, n):
    segs = [(0j, 1 + 0j)]
    for _ in range(n):
        new = []
        for (p, q) in segs:
            for c, (a, b) in zip(codes, links): new += place_links([(a, b)], p, q, c)
        segs = new
    return segs
book = Image.open(FG + 'p71_bot.png').convert('L').resize((600, 616))
tiles = [book]
for n in (3, 4, 5):
    segs = tree_stage((3, 1, 3, 1, 3, 3, 1), n)
    Z = np.array([z for s in segs for z in s]); x0, x1, y0, y1 = Z.real.min(), Z.real.max(), Z.imag.min(), Z.imag.max(); sc = 560 / max(x1 - x0, y1 - y0)
    im = Image.new('L', (600, 616), 255); d = ImageDraw.Draw(im)
    for p, q in segs: d.line([(20 + (p.real - x0) * sc, 596 - (p.imag - y0) * sc), (20 + (q.real - x0) * sc, 596 - (q.imag - y0) * sc)], fill=0, width=1)
    tiles.append(im)
out = Image.new('L', (4 * 610, 616), 255)
for k, t in enumerate(tiles): out.paste(t, (k * 610, 0))
out.save(FG + 'casc_cmp.png')
def comps(segs):
    key = lambda z: (round(z.real * 1e6), round(z.imag * 1e6))
    E = [(key(p), key(q)) for p, q in segs]; V = set(v for e in E for v in e); par = {v: v for v in V}
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for a, b in E: par[f(a)] = f(b)
    return len(set(f(v) for v in V))
for n in (1, 2, 3): print(n, 'components', comps(tree_stage((3, 1, 3, 1, 3, 3, 1), n)))
s1 = tree_stage((3, 1, 3, 1, 3, 3, 1), 1); print([ (np.round(p, 3), np.round(q, 3)) for p, q in s1])
