import numpy as np
exec(open('p67fit2.py').read().split('def fit(V):')[0].split('def koch_curve')[0].split('\n')[0]) if False else None
src = open('p67fit2.py').read(); i = src.index('def koch_curve'); j = src.index('def fit(V)')
exec('import numpy as np\n' + src[i:j])
exec(open('altdragon.py').read().split('for name')[0])
def canon(V):
    # normalise by similarity: map V[0]->0, V[-1]->1
    return (V - V[0]) / (V[-1] - V[0])
for n in (2, 3, 4, 6):
    Pp = koch_curve(0.5 + 0.5j, (1, 3), n)
    for xs in ([1, 0] * 4, [0, 1] * 4):
        F = alt_dragon(xs[:n])
        for cand in (F, np.conj(F), F[::-1], np.conj(F[::-1])):
            if np.allclose(canon(cand), canon(Pp)) or np.allclose(canon(cand), np.conj(canon(Pp))):
                print('match n', n, xs[:2]); break
    print(n, np.round(canon(Pp)[:6], 3), np.round(canon(alt_dragon([1, 0] * 4)[: 2 ** n + 1] if False else alt_dragon(([1, 0] * 4)[:n]))[:6], 3))
