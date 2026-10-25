exec(open('p69fit.py').read())
import sys
disc = np.load('disc_mask.npy')
def show(R, name):
    pal = np.array([20, 140, 225], np.uint8)
    a = pal[cls] * disc + 255 * (~disc); b = pal[R] * disc + 255 * (~disc)
    out = np.concatenate([a, np.full((H, 10), 255), b], 1).astype(np.uint8)
    Image.fromarray(out).save(FG + name)
T = mapper(math.radians(-1), 0)
R = render(rounded([D13] * 3, 'toward'), koch_outline(5), 1, T)
show(R, 'p69_fit_toward.png')
