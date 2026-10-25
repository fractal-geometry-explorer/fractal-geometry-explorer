exec(open('g13c.py').read().split("print('7 SS'")[0])
src = open('snow.py').read(); exec(src[src.index('def check'):src.index('random.seed')])
im = Image.open(FG + 'g69_13.png').convert('L'); A = np.array(im) < 110; dist = distance_transform_edt(~A)
print('D13 stage1', round(score(curve([D13]), 92, 683, 703, dist), 2), ' stage2', round(score(curve([D13, D13]), 903, 676, 697, dist), 2))
print('mirror flags', [f[2] for f, r in D13])
for gens, name in (([D13] * 3, 'D13x3'), ([D13, mirror(D13), D13], 'D13 mix'), ([S] * 4, 'SSSS'), ([normalise(S)] * 4, 'nS x4')):
    P = curve(gens); print(name, len(P) - 1, check(P))
