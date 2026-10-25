exec(open('p69bits.py').read().split("toward = [")[0])
import itertools
G13Sraw = substitute(S, 4, S)
V = {'D13': D13, 'mD13': mirror(D13), 'G13': G13, 'mG13': mirror(G13), 'nS': normalise(G13Sraw), 'S13': G13Sraw}
def score_gens(gens, rule='toward'):
    img = Image.new('L', (Wq, Hq), 0); ImageDraw.Draw(img).polygon(T(rounded(gens, rule) + lower), fill=1)
    G = (np.array(img) > 0) & mO
    return ((G & grayq) | (~G & lightq))[ins].mean()
res = []
for combo in itertools.product(V.keys(), repeat=3):
    s = score_gens([V[c] for c in combo]); res.append((round(s, 4), combo))
res.sort(reverse=True); print(res[:10])
