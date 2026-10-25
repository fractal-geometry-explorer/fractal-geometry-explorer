exec(open('tcasc_search.py').read().split("for n in (1, 2, 3, 4)")[0])
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
c = complex(0.5, r3 / 6); t = complex(0.5, r3 / 2); YL = [(0j, c), (c, 1 + 0j), (c, t)]
u = (1 + 2j) / 5; v = (2 - 1j) / 5
FL = [(0j, u), (u, 2 * u), (2 * u, 2 * u + v), (u, u + v), (u + v, 1 + 0j)]
def render(segs, W=500, mark=True):
    Z = np.array([z for s in segs for z in s]); x0, x1, y0, y1 = Z.real.min(), Z.real.max(), Z.imag.min(), Z.imag.max(); sc = (W - 40) / max(x1 - x0, y1 - y0)
    im = Image.new('L', (W, W), 255); d = ImageDraw.Draw(im)
    for p, q in segs: d.line([(20 + (p.real - x0) * sc, W - 20 - (p.imag - y0) * sc), (20 + (q.real - x0) * sc, W - 20 - (q.imag - y0) * sc)], fill=0, width=1)
    if mark: d.line([(20 + (0 - x0) * sc, W - 20 - (0 - y0) * sc), (20 + (1 - x0) * sc, W - 20 - (0 - y0) * sc)], fill=160, width=3)
    return im
def load(page, box, W=500):
    s = 300 / 110; im = Image.open(FG + 'dh-%03d.png' % page).convert('L').crop(tuple(int(v * s) for v in box))
    return im.resize((W, int(W * im.height / im.width)))
rows = []
rows.append([load(87, (400, 510, 790, 910)), render(cascade(GL, (3, 1, 3, 1, 3, 3, 1), 4))])
rows.append([load(89, (150, 0, 640, 470)), render(cascade(YL, (2, 0, 0), 7))])
rows.append([load(89, (425, 625, 790, 925))] + [render(cascade(FL, cc, 5)) for cc in [(1, 3, 3, 3, 3), (2, 0, 0, 0, 0), (2, 0, 0, 0, 1), (2, 0, 0, 3, 0)]])
for k, r in enumerate(rows):
    H = max(im.height for im in r); out = Image.new('L', (sum(im.width + 10 for im in r), H), 255); x = 0
    for im in r: out.paste(im, (x, 0)); x += im.width + 10
    out.save(FG + f'tcasc_row{k}.png')
