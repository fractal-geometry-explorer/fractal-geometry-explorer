exec(open('p69align.py').read().split("p0 = [")[0])
p0 = list(np.load('p69align.npy'))
res = {}
for j, side in ((5, -1), (6, 1), (7, -1), (7, 1), (8, 1), (8, -1), (6, -1)):
    O = outline_pts(j, side)
    r = minimize(lambda p: -score(O, p, band), p0, method='Nelder-Mead', options=dict(initial_simplex=[p0, [p0[0] + 3, p0[1], p0[2], p0[3]], [p0[0], p0[1] + 3, p0[2], p0[3]], [p0[0], p0[1], p0[2] * 1.008, p0[3]], [p0[0], p0[1], p0[2], p0[3] + 0.4]], xatol=0.2, fatol=1e-5, maxiter=200))
    res[(j, side)] = r.x; print(j, side, round(-r.fun, 4), np.round(r.x, 2), flush=True)
np.save('p69align_all.npy', res, allow_pickle=True)
