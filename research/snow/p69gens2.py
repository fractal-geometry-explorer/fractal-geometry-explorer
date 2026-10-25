exec(open('p69gens.py').read().split("res = []")[0])
import numpy as np
def score_full(gens, rule='toward', swap=False):
    img = Image.new('L', (Wq, Hq), 0); ImageDraw.Draw(img).polygon(T(rounded(gens, rule) + lower), fill=1)
    G = (np.array(img) > 0) & mO
    if swap: G = ~G & mO
    return ((G & grayq) | (~G & lightq))[ins].mean()
P1 = curve([D13, D13]); P2 = curve([G13, mirror(G13)])
print('stage-2 polylines equal?', len(P1) == len(P2) and np.allclose(P1, P2))
res = []
for combo in itertools.product(['D13', 'mD13', 'G13', 'mG13'], repeat=3):
    for swap in (False, True):
        for rule in ('toward', 'away'):
            res.append((round(score_full([V[c] for c in combo], rule, swap), 4), combo, swap, rule))
res.sort(reverse=True); print(res[:8])
