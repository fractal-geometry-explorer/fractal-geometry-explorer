exec(open('chev5.py').read().split("im = Image.open")[0])
s = (pb - pa) / (q - p); t = pa - s * p
A = apex(30); LAM = 0.42
darts = []
def rec(a, b, m, rev, d):
    if d == 0:
        F = a + (b - a) * (A.conjugate() if m else A); M = (a + b) / 2
        darts.append((a, M + LAM * (F - M), b, M + LAM / 2 * (F - M))); return
    P = [a, a + (b - a) * (A.conjugate() if m else A), b]; kids = []
    for k, c in enumerate([1, 3]):
        cm = m ^ (c & 1); cr = 1 if c >= 2 else 0
        kids.append((P[k + 1], P[k], cm, 1) if cr else (P[k], P[k + 1], cm, 0))
    for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec(x, y, cm, rev ^ cr, d - 1)
rec(0j, 1 + 0j, 0, 0, 7)
plate = Image.open(FG + 'p64_600.png').convert('L')
mine = Image.new('L', plate.size, 236); dr = ImageDraw.Draw(mine)
for D in darts: dr.polygon([((s * z + t).real, -(s * z + t).imag) for z in D], fill=25)
P_ = np.array(plate) < 120; M_ = np.array(mine) < 120
P_[:620, :] = False; M_[:620, :] = False
P_[:1150, :700] = False; M_[:1150, :700] = False
print('IoU', (P_ & M_).sum() / (P_ | M_).sum(), 'plate dark', P_.sum(), 'mine dark', M_.sum())
rgb = np.zeros(P_.shape + (3,), np.uint8) + 240
rgb[P_ & M_] = (30, 30, 30); rgb[P_ & ~M_] = (220, 60, 40); rgb[~P_ & M_] = (50, 110, 220)
Image.fromarray(rgb).resize((plate.size[0] // 2, plate.size[1] // 2)).save(FG + 'chev_fit.png')
