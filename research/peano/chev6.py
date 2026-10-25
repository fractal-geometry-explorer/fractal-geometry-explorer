exec(open('chev5.py').read().split("im = Image.open")[0])
V = np.array(curve(apex(30), [1, 3], n))
s = (pb - pa) / (q - p); t = pa - s * p; W = s * V + t
M = (W[:-1] + W[1:]) / 2; tr = cKDTree(np.stack([M.real, M.imag], 1))
# also per-segment mirror state: rebuild with orientation flags
def curve_flags(A, codes, n):
    out = []
    def rec(a, b, m, rev, d):
        if d == 0: out.append((m, rev)); return
        gg = [0j, (A.conjugate() if m else A), 1 + 0j]
        P = [a + (b - a) * z for z in gg]; kids = []
        for k in range(2):
            c = codes[k]; cm = m ^ (c & 1); cr = 1 if c >= 2 else 0
            kids.append((P[k + 1], P[k], cm, 1) if cr else (P[k], P[k + 1], cm, 0))
        for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec(x, y, cm, rev ^ cr, d - 1)
    rec(0j, 1 + 0j, 0, 0, n); return out
flags = curve_flags(apex(30), [1, 3], n)
rows = []
for k, c in enumerate(comps):
    a = c['A'][0] - 1j * c['A'][1]; b = c['B'][0] - 1j * c['B'][1]; C = c['C'][0] - 1j * c['C'][1]
    m = (a + b) / 2; dd, j = tr.query([m.real, m.imag])
    if dd > 0.08 * c['L']: continue
    p0, q0 = W[j], W[j + 1]
    if min(abs(p0 - a) + abs(q0 - b), abs(p0 - b) + abs(q0 - a)) > 0.12 * c['L']: continue
    # chevron pixels in the frame of the segment p0 -> q0 (curve order), y to the left of travel
    ys, xs = np.nonzero(lab == np.argsort(sizes)[::-1][k] + 1)
    Z = xs - 1j * ys
    loc = (Z - p0) / (q0 - p0)
    # outer corner: farthest from chord; inner: min |y| peak
    yabs = np.abs(loc.imag); ci = np.argmax(yabs)
    side = np.sign(loc.imag[ci])
    X = loc.real; Y = loc.imag * side
    bins = np.linspace(0, 1, 41); inner = []
    for ii in range(40):
        mm = (X >= bins[ii]) & (X < bins[ii + 1])
        if mm.sum(): inner.append((bins[ii] + 0.0125, Y[mm].min()))
    inner = np.array(inner); di = np.argmax(inner[:, 1])
    rows.append((loc.real[ci], loc.imag[ci], inner[di][0], inner[di][1] * side, flags[j][0], flags[j][1], c['L']))
R = np.array(rows)
print('matched', len(R))
for f in sorted(set(zip(R[:, 4], R[:, 5]))):
    sel = (R[:, 4] == f[0]) & (R[:, 5] == f[1])
    print('mirror', int(f[0]), 'rev', int(f[1]), 'count', sel.sum(), 'C', R[sel, :2].mean(0).round(3), 'D', R[sel, 2:4].mean(0).round(3), 'stdC', R[sel, :2].std(0).round(3))
