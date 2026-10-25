exec(open('dec.py').read().split("if __name__")[0])
src = open('snow.py').read(); exec(src[src.index('def check'):src.index('random.seed')])
import itertools
for rule, (gS, gF) in (('pure', (G13, mirror(G13))), ('plate68', (D13, mirror(D13)))):
    bad = []
    for seq in itertools.product('SF', repeat=3):
        r = check(curve([gS if c == 'S' else gF for c in seq]))
        if r != (0, 0): bad.append((''.join(seq), r))
    print(rule, 'stage 3 sequences with self-contact:', bad, flush=True)
for rule, gens in (('pure SFFF', [G13] + [mirror(G13)] * 3), ('pure SSSS', [G13] * 4), ('68 SFSF', [D13, mirror(D13), D13, mirror(D13)])):
    print(rule, check(curve(gens)), flush=True)
