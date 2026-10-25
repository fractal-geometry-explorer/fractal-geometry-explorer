from two import *
import numpy as np
def apex_general(alpha_deg, gamma_deg):
    # apex A such that angle at 0 is alpha and angle at A is gamma
    a = math.radians(alpha_deg); g = math.radians(gamma_deg)
    b = math.pi - a - g
    r1 = math.sin(b) / math.sin(g)          # law of sines, |0→1| = 1
    return r1 * cmath.exp(1j * a)
names = []
for al in (30, 40, 50, 60):
    A = apex_general(al, 90)
    pts = build(A, 12, polya)
    nm = f'pe_polya_unequal_{al}.png'; render(pts, nm, width=1); names.append(nm)
from PIL import Image
ims = [Image.open(FG + n).resize((350, 350)) for n in names]
out = Image.new('L', (1420, 350), 255)
for i, im in enumerate(ims): out.paste(im, (i * 357, 0))
out.save(FG + 'pe_grid3.png')
