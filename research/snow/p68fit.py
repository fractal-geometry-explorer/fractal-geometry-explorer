exec(open('dec.py').read().split("if __name__")[0])
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
im = Image.open(FG + 'dh-084.png').convert('L'); s = 300 / 110
crop = im.crop((int(200 * s), 0, int(650 * s), int(450 * s)))
A = np.array(crop) < 100
H, W = A.shape
ys, xs = np.nonzero(A[:int(H * 0.6)])
print('crop', W, H, 'snowflake x range (upper part)', xs.min(), xs.max(), 'top y', ys.min())
# black rectangle top edge: rows where nearly the whole width is dark
rowfrac = A.mean(1)
rect_top = np.argmax(rowfrac > 0.6); print('rect top row', rect_top)
x0, x1 = xs.min(), xs.max(); sc = (x1 - x0)
def render(gens, ox, oy, sc):
    P = curve(gens)
    poly = list(P) + [1 - 3j, -3j]
    img = Image.new('L', (W, H), 0); ImageDraw.Draw(img).polygon([(ox + z.real * sc, oy - z.imag * sc) for z in poly], fill=1)
    return np.array(img) > 0
cands = {'7:S4': [S] * 4, '7:S5': [S] * 5, '7:F5': [F] * 5, '7:SF5': [S, F, S, F, S], '7:FS5': [F, S, F, S, F],
         '13:3': [D13] * 3, '13:4': [D13] * 4, '13:mix3': [D13, mirror(D13), D13]}
for oy in (rect_top - 4, rect_top, rect_top + 4):
    for name, gens in cands.items():
        M = render(gens, x0, oy, sc)
        acc = (M == A)[:, :].mean()
        print(oy, name, round(acc, 4))
