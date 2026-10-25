exec(open('p69align.py').read().split("p0 = [")[0])
res = np.load('p69align_all.npy', allow_pickle=True).item()
full = Image.open(FG + 'p69_L.png').convert('RGB')
boxes = [(1000, 40, 1450, 400), (150, 380, 600, 740), (700, 1900, 1150, 2260)]
rows = []
for (j, side) in ((5, -1), (6, 1), (7, -1), (8, -1)):
    p = res[(j, side)]; cx, cy, sc, rot = p[0] / S, p[1] / S, p[2] / S, p[3]
    O = outline_pts(j, side, 10); w = (O - CEN) * np.exp(1j * math.radians(rot)) * sc
    im = full.copy(); d = ImageDraw.Draw(im); d.line(list(zip(cx + w.real, cy - w.imag)) + [(cx + w[0].real, cy - w[0].imag)], fill=(230, 30, 30), width=3)
    rows.append([im.crop(b) for b in boxes])
w0, h0 = 450, 360
out = Image.new('RGB', (3 * (w0 + 8), 4 * (h0 + 8)), 'white')
for r, row in enumerate(rows):
    for c, t in enumerate(row): out.paste(t, (c * (w0 + 8), r * (h0 + 8)))
out.save(FG + 'p69_ov.png')
