exec(open('p69band.py').read().split("for j in (7, 8, 9, 10):")[0])
exec(open('p69fit.py').read().split("def score")[0].split("def curve_leaves")[1].join(["def curve_leaves", ""]) if False else "")
src = open('p69fit.py').read(); exec(src[src.index("def curve_leaves"):src.index("def score")])
gray = (full >= 75) & (full <= 168) & disc
light = (full > 168) & disc
def render_full(C, O, dx=-2, dy=0):
    T = lambda zs: list(zip(cx + dx + ((np.array(zs) - CEN) * np.exp(1j * math.radians(rot)) * sc).real, cy + dy - ((np.array(zs) - CEN) * np.exp(1j * math.radians(rot)) * sc).imag))
    outl = koch_outline(8); i1 = [k for k, z in enumerate(outl) if abs(z - 1) < 1e-9][0]; per = 6
    lower = [O[k] for k in range(i1 * per, -1, -1)]
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    d.polygon(T(O), fill=2); d.polygon(T(list(C) + lower), fill=1)
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(T(O), fill=1)
    return np.array(img) * np.array(m)
O = outline(8, -1)
both = disc & ~blk
out = {}
for rule in ('toward', 'away'):
    R = render_full(rounded([D13] * 3, rule), O)
    inside = both & (R > 0)
    agree = ((R == 1) & gray | (R == 2) & light) & inside
    print(rule, 'interior agreement', round(agree.sum() / inside.sum(), 4), 'overall 3-class', round((((R == 0) & blk | (R == 1) & gray | (R == 2) & light) & disc).sum() / disc.sum(), 4))
    out[rule] = R
np.save('p69R_toward.npy', out['toward'])
# difference image for 'toward': red = book gray but ours light; blue = book light but ours gray
R = out['toward']
img = np.zeros((H, W, 3), np.uint8); img[...] = 235
img[blk & disc] = (40, 40, 40); img[(R == 1)] = (150, 150, 150)
img[(R == 2) & gray] = (220, 40, 40); img[(R == 1) & light] = (40, 90, 220)
Image.fromarray(img).resize((W // 2, H // 2)).save(FG + 'p69_diff.png')
