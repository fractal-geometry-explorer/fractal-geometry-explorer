exec(open('qtree.py').read().split("for name, L in")[0])
s = 300 / 110
im = Image.open(FG + 'dh-089.png').convert('L')
crop = im.crop((int(425 * s), int(625 * s), int(790 * s), int(925 * s)))
tiles = [crop.resize((500, int(500 * crop.height / crop.width)))]
for codes in [(0, 0, 0, 1, 1), (1, 1, 1, 0, 0), (2, 2, 0, 3, 3), (3, 3, 1, 2, 2)]:
    segs = stage_l(F_links, codes, 4)
    Z = np.array([z for sg in segs for z in sg]); x0, x1, y0, y1 = Z.real.min(), Z.real.max(), Z.imag.min(), Z.imag.max(); sc = 460 / max(x1 - x0, y1 - y0)
    img = Image.new('L', (500, 500), 255); d = ImageDraw.Draw(img)
    for p, q in segs: d.line([(20 + (p.real - x0) * sc, 480 - (p.imag - y0) * sc), (20 + (q.real - x0) * sc, 480 - (q.imag - y0) * sc)], fill=0, width=1)
    d.text((5, 5), str(codes), fill=0); tiles.append(img)
out = Image.new('L', (5 * 510, 520), 255)
for k, t in enumerate(tiles): out.paste(t, (k * 510, 0))
out.save(FG + 'qtree_cmp.png')
