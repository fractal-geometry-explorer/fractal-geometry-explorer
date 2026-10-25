exec(open('p69align.py').read().split("bk = np.array")[0])
from scipy.ndimage import gaussian_filter, binary_dilation, binary_erosion
full = gaussian_filter(np.array(Image.open(FG + 'p69_L.png').convert('L')).astype(float), 1.5)
H, W = full.shape
blk = full < 75
disc = np.array(Image.fromarray(np.load('disc_mask.npy').astype(np.uint8) * 255).resize((W, H))) > 127
nb = ~blk & disc
band = (binary_dilation(nb, iterations=10) & ~binary_erosion(nb, iterations=10)) & disc
res = np.load('p69align_all.npy', allow_pickle=True).item()
p = res[(8, -1)]; cx, cy, sc, rot = p[0] * 2, p[1] * 2, p[2] * 2, p[3]
def outline(j, side, n=6):
    outl = koch_outline(j)
    if side == 0: return np.array(outl)
    O = []
    for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], side, n)
    return np.array(O)
def sc_of(O, dx=0, dy=0, ds=1, dr=0):
    w = (O - CEN) * np.exp(1j * math.radians(rot + dr)) * sc * ds
    img = Image.new('L', (W, H), 0); ImageDraw.Draw(img).polygon(list(zip(cx + dx + w.real, cy + dy - w.imag)), fill=1)
    M = np.array(img) > 0
    return ((M == nb) & band).sum() / band.sum()
for j in (7, 8, 9, 10):
    for side in (1, -1, 0):
        O = outline(j, side)
        best = max((sc_of(O, dx, dy, ds), dx, dy, ds) for dx in (-2, 0, 2) for dy in (-2, 0, 2) for ds in (0.998, 1.0, 1.002))
        print(j, side, [round(v, 4) if isinstance(v, float) else v for v in best], flush=True)
