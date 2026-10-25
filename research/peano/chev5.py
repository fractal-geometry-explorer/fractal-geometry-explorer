exec(open('chev3.py').read().split('best = []')[0])
import pickle
from PIL import ImageDraw
best = pickle.load(open('best.pkl', 'rb'))
hits, n, i, kind, (p, q, pa, pb) = best[0]
im = Image.open(FG + 'p64_600.png').convert('RGB'); d = ImageDraw.Draw(im)
for nn, col in ((n, (40, 110, 220)), (n + 1, (220, 60, 40))):
    V = np.array(curve(apex(30), [1, 3], nn))
    if kind == 'pres':
        s = (pb - pa) / (q - p); t = pa - s * p; W = s * V + t
    else:
        s = (pb - pa) / (np.conj(q) - np.conj(p)); t = pa - s * np.conj(p); W = s * np.conj(V) + t
    d.line([(z.real, -z.imag) for z in W], fill=col, width=3 if nn == n else 2)
im.resize((im.size[0] // 2, im.size[1] // 2)).save(FG + 'chev_overlay.png')
print(n, kind)
