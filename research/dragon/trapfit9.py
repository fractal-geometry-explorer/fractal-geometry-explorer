exec(open('trapfit.py').read().split("if __name__")[0])
from scipy.ndimage import gaussian_filter
from scipy.optimize import minimize
polys = chev(9)
P = gaussian_filter(pmask, 3)
def neg(v):
    sc, x0, y0, ang = v
    m = gaussian_filter(draw(polys, x0, y0, sc, ang=math.radians(ang)), 3)
    return -(m * P).sum() / math.sqrt((m * m).sum() * (P * P).sum())
best = None
for sc in (980, 1000, 1020, 1040):
    for x0 in (150, 165, 180):
        for y0 in (1560, 1590, 1620):
            s = neg((sc, x0, y0, 0))
            if best is None or s < best[0]: best = (s, sc, x0, y0)
print(best, flush=True)
r = minimize(neg, [best[1], best[2], best[3], 0.0], method='Nelder-Mead', options=dict(xatol=0.5, fatol=1e-5, maxiter=200))
print(r.x, r.fun)
import pickle; pickle.dump(r.x, open('trapfit9.pkl', 'wb'))
