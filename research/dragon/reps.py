from fractions import Fraction as F
import itertools
# Gaussian rationals as (re, im) Fractions; beta = -1 + i
def mul(a, b): return (a[0]*b[0]-a[1]*b[1], a[0]*b[1]+a[1]*b[0])
def add(a, b): return (a[0]+b[0], a[1]+b[1])
def sub(a, b): return (a[0]-b[0], a[1]-b[1])
def inv(a): n = a[0]**2+a[1]**2; return (a[0]/n, -a[1]/n)
B = (F(-1), F(1)); Bi = inv(B); ONE = (F(1), F(0)); ZERO = (F(0), F(0))
def val(intdigits, pre, per):
    # value of intdigits . pre (per)* ; intdigits most significant first
    v = ZERO
    for d in intdigits: v = add(mul(v, B), (F(d), F(0)))
    p = ONE; f = ZERO
    for d in pre:
        p = mul(p, Bi); f = add(f, mul(p, (F(d), F(0))))
    # periodic tail: sum over block, times 1/(1 - Bi^len)
    q = ONE; blk = ZERO
    for d in per:
        q = mul(q, Bi); blk = add(blk, mul(q, (F(d), F(0))))
    tail = mul(mul(p, blk), inv(sub(ONE, q)))
    return add(v, add(f, tail))
print('0.(1) =', val([], [], [1]))
print('1/(beta-1) =', inv(sub(B, ONE)))
# search: two representations with different first fractional digit, small pre/period
seen = {}
hits = []
for L in range(0, 4):
    for pre in itertools.product((0, 1), repeat=L):
        for P in range(1, 5):
            for per in itertools.product((0, 1), repeat=P):
                if all(x == 0 for x in per) and P > 1: continue
                s = ''.join(map(str, pre)) + '(' + ''.join(map(str, per)) + ')'
                v = val([], pre, per)
                seen.setdefault(v, []).append(s)
multi = {v: s for v, s in seen.items() if len(set(x for x in s)) > 1}
# distinct strings may be the same sequence written differently (e.g. (1) vs 1(1)); expand to 12 digits to compare
def expand(s, n=16):
    pre, per = s.split('('); per = per[:-1]; out = pre
    while len(out) < n: out += per
    return out[:n]
res = []
for v, ss in seen.items():
    ex = sorted(set(expand(s) for s in ss))
    if len(ex) > 1: res.append((v, ex, ss))
for v, ex, ss in sorted(res, key=lambda r: len(min(r[2], key=len)))[:12]:
    print(v[0], v[1], ex, sorted(ss, key=len)[:3])
