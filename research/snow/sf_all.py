exec(open('dec.py').read().split("if __name__")[0])
src = open('snow.py').read(); exec(src[src.index('def check'):src.index('random.seed')])
import itertools
bad = 0
for seq in itertools.product('SF', repeat=5):
    gens = [S if c == 'S' else F for c in seq]
    r = check(curve(gens))
    if r != (0, 0): bad += 1; print(''.join(seq), r)
print('sequences with self-contact:', bad, 'of 32')
r = check(curve([D13] * 4)); print('13 x4', r)
