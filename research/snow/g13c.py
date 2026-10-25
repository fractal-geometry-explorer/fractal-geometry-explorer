exec(open('dec.py').read().split("if __name__")[0])
from scipy.ndimage import distance_transform_edt
from PIL import Image
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
# check 7-generator stage 2 again with this machinery
im = Image.open(FG + 'g68_7.png').convert('L'); A = np.array(im) < 110
dist = distance_transform_edt(~A)
def score(P, x0, y0, sc, dist):
    X = x0 + P.real * sc; Y = y0 - P.imag * sc
    t = np.linspace(0, 1, 12)[:, None]
    sx = (X[:-1] + (X[1:] - X[:-1]) * t).ravel(); sy = (Y[:-1] + (Y[1:] - Y[:-1]) * t).ravel()
    ok = (sx >= 0) & (sy >= 0) & (sx < dist.shape[1]) & (sy < dist.shape[0])
    return dist[sy[ok].astype(int), sx[ok].astype(int)].mean() if ok.all() else 99
print('7 SS', round(score(curve([S, S]), 840, 480, 473, dist), 2), ' SF', round(score(curve([S, F]), 840, 480, 473, dist), 2))
im = Image.open(FG + 'g69_13.png').convert('L'); A = np.array(im) < 110; dist = distance_transform_edt(~A)
print('13 gen', round(score(curve([G13]), 92, 683, 703, dist), 2))
for name, gens in (('G13,G13', [G13, G13]), ('G13S,G13S', [G13S, G13S]), ('G13,mirror', [G13, mirror(G13)])):
    print(name, round(score(curve(gens), 903, 676, 697, dist), 2))
