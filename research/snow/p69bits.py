exec(open('p69int.py').read().split("O = outline(8, -1)")[0])
mk = [f[2] for f, r in D13]
print('D13 mirror flags', mk)
# leaves of stage 3 with their parent mirror and child index
leaves = []
def rec(f, d, k):
    if d == 3: leaves.append((f, k)); return
    for i, (g, s) in enumerate(D13): rec(comp(f, g), d + 1, i)
rec((1 + 0j, 0j, 0), 0, -1)
def rounded_bits(bits):
    pts = []
    for f, k in leaves:
        a, b = app(f, 0j), app(f, 1 + 0j)
        mparent = f[2] ^ mk[k]
        side = bits[k] * (-1 if mparent else 1)
        pts += arc(a, b, side)
    pts.append(1 + 0j); return pts
# work at quarter resolution
q = 4
Hq, Wq = H // q, W // q
grayq = np.array(Image.fromarray(gray.astype(np.uint8) * 255).resize((Wq, Hq))) > 127
lightq = np.array(Image.fromarray(light.astype(np.uint8) * 255).resize((Wq, Hq))) > 127
O = outline(8, -1)
outl = koch_outline(8); i1 = [k for k, z in enumerate(outl) if abs(z - 1) < 1e-9][0]; per = 6
lower = [O[k] for k in range(i1 * per, -1, -1)]
Rm = np.exp(1j * math.radians(rot))
def T(zs):
    w = (np.array(zs) - CEN) * Rm * sc / q
    return list(zip((cx - 2) / q + w.real, cy / q - w.imag))
mO = Image.new('L', (Wq, Hq), 0); ImageDraw.Draw(mO).polygon(T(O), fill=1); mO = np.array(mO) > 0
ins = mO & (grayq | lightq)
def score(bits):
    img = Image.new('L', (Wq, Hq), 0); ImageDraw.Draw(img).polygon(T(rounded_bits(bits) + lower), fill=1)
    G = (np.array(img) > 0) & mO
    return ((G & grayq) | (~G & lightq))[ins].mean()
toward = [(-1 if m else 1) for m in mk]
cur = toward[:]; best = score(cur); print('toward', round(best, 4))
print('away', round(score([-b for b in toward]), 4))
for p in range(3):
    improved = False
    for k in range(13):
        t = cur[:]; t[k] = -t[k]; s = score(t)
        if s > best + 1e-4: best, cur, improved = s, t, True; print('flip', k, round(s, 4), flush=True)
    if not improved: break
print('final', cur, round(best, 4), 'differs from toward at', [k for k in range(13) if cur[k] != toward[k]])
