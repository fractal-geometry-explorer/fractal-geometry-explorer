exec(open('tcasc.py').read())
r3 = math.sqrt(3)
# Gosper tree, codes from the stage-2 fit
exec(open('gtree.py').read().split("def place_links")[0].split("import numpy")[1].join(["import numpy", ""]) if False else "")
phi = math.atan2(r3, 5); w = complex(math.cos(phi), math.sin(phi)) / math.sqrt(7); om = complex(0.5, r3 / 2)
S = 0; A = w; B = w + w / om; E = 1; Cc = A + w * om; D = Cc + w * om * om; F = Cc + w; Gp = F + w / om
GL = [(S, A), (A, B), (B, E), (A, Cc), (Cc, D), (Cc, F), (F, Gp)]
for n in (1, 2, 3, 4): print('gosper tree', n, stats(cascade(GL, (3, 1, 3, 1, 3, 3, 1), n)))
c = complex(0.5, r3 / 6); t = complex(0.5, r3 / 2)
YL = [(0j, c), (c, 1 + 0j), (c, t)]
res = []
for codes in itertools.product(range(4), repeat=3):
    s = stats(cascade(YL, codes, 6)); res.append((s[1] != 729, s[3], codes, s))
res.sort(); print('Y:', res[:8])
u = (1 + 2j) / 5; v = (2 - 1j) / 5; a = (2 + 1j) / 5; b = (1 - 2j) / 5
FL = [(0j, u), (u, 2 * u), (2 * u, 2 * u + v), (u, u + v), (u + v, 1 + 0j)]
HL = [(0j, a), (a, 2 * a), (a, a + b), (a + b, 1 + 0j), (a + b, b)]
for name, L in (('F', FL), ('H', HL)):
    res = []
    for codes in itertools.product(range(4), repeat=5):
        s = stats(cascade(L, codes, 4)); res.append((s[1] != 625, s[3], codes))
    res.sort(); print(name, [r for r in res if not r[0]][:8], 'count perfect', sum(1 for r in res if not r[0] and r[1] == 0))
