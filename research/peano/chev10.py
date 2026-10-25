exec(open('chev9.py').read().split("plate = Image.open")[0].replace("rec(0j, 1 + 0j, 0, 0, 7)", ""))
from scipy.optimize import minimize
plate = Image.open(FG + 'p64_600.png').convert('L')
R = 2
Pm = np.array(plate.resize((plate.size[0] // R, plate.size[1] // R))) < 120
Pm[:620 // R, :] = False; Pm[:1150 // R, :700 // R] = False
# segments with apex (canonical data), independent of lam
segs = []
def rec2(a, b, m, rev, d):
    if d == 0:
        segs.append((a, b, a + (b - a) * (A.conjugate() if m else A))); return
    P = [a, a + (b - a) * (A.conjugate() if m else A), b]; kids = []
    for k, c in enumerate([1, 3]):
        cm = m ^ (c & 1); cr = 1 if c >= 2 else 0
        kids.append((P[k + 1], P[k], cm, 1) if cr else (P[k], P[k + 1], cm, 0))
    for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec2(x, y, cm, rev ^ cr, d - 1)
rec2(0j, 1 + 0j, 0, 0, 7)
def render(params):
    lam, mu, ds, dr, dx, dy, along = params
    ss = s * (1 + ds) * np.exp(1j * dr); tt = t + complex(dx, dy)
    im = Image.new('L', (plate.size[0] // R, plate.size[1] // R), 0); dd = ImageDraw.Draw(im)
    for a, b, F in segs:
        M = (a + b) / 2; v = F - M
        C = M + lam * v + along * (b - a); D = M + mu * lam * v + along * (b - a) * mu
        dd.polygon([((ss * z + tt).real / R, -(ss * z + tt).imag / R) for z in (a, C, b, D)], fill=255)
    m = np.array(im) > 127
    m[:620 // R, :] = False; m[:1150 // R, :700 // R] = False
    return m
def loss(params):
    m = render(params)
    return -(m & Pm).sum() / (m | Pm).sum()
x0 = [0.42, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0]
print('start IoU', -loss(x0))
r = minimize(loss, x0, method='Nelder-Mead', options=dict(maxiter=500, xatol=1e-4, fatol=1e-5, initial_simplex=None))
print('best IoU', -r.fun, 'params lam %.3f mu %.3f scale %.4f rot %.3f° dx %.1f dy %.1f along %.3f' % (r.x[0], r.x[1], r.x[2], np.degrees(r.x[3]), r.x[4], r.x[5], r.x[6]))
np.save('chevfit.npy', r.x)
