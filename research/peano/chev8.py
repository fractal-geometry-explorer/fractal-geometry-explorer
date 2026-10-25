exec(open('chev5.py').read().split("im = Image.open")[0])
s = (pb - pa) / (q - p); t = pa - s * p
im = Image.open(FG + 'p64_600.png').convert('RGB'); d = ImageDraw.Draw(im)
V = np.array(curve(apex(30), [1, 3], 7)); W = s * V + t
d.line([(z.real, -z.imag) for z in W], fill=(40, 110, 220), width=2)
im.crop((1450, 600, 2190, 1300)).save(FG + 'chev_overlay_tr.png')
print('scale px per unit', abs(s), 'rotation deg', np.degrees(np.angle(s)), 'origin', t)
