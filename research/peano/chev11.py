exec(open('chev10.py').read().split("x0 = [")[0])
x = list(np.load('chevfit.npy'))
best = (loss(x), x)
for dx in range(-16, 17, 4):
    for dy in range(-16, 17, 4):
        y = x[:]; y[4] = dx; y[5] = dy
        l = loss(y)
        if l < best[0]: best = (l, y)
print('grid best IoU', -best[0], 'dx dy', best[1][4], best[1][5])
x = best[1]
sim = [x] + [list(np.array(x) + np.array(e)) for e in ([0.03,0,0,0,0,0,0],[0,0.08,0,0,0,0,0],[0,0,0.006,0,0,0,0],[0,0,0,0.004,0,0,0],[0,0,0,0,4,0,0],[0,0,0,0,0,4,0],[0,0,0,0,0,0,0.02])]
r = minimize(loss, x, method='Nelder-Mead', options=dict(maxiter=700, initial_simplex=np.array(sim), xatol=1e-4, fatol=1e-5))
print('best IoU', -r.fun, 'params lam %.3f mu %.3f scale %.4f rot %.3f° dx %.1f dy %.1f along %.3f' % (r.x[0], r.x[1], r.x[2], np.degrees(r.x[3]), r.x[4], r.x[5], r.x[6]))
np.save('chevfit2.npy', r.x)
m = render(r.x)
rgb = np.zeros(Pm.shape + (3,), np.uint8) + 240
rgb[Pm & m] = (30, 30, 30); rgb[Pm & ~m] = (220, 60, 40); rgb[~Pm & m] = (50, 110, 220)
Image.fromarray(rgb).save(FG + 'chev_fit2.png')
