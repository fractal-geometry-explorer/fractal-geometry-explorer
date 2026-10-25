exec(open('p69fit.py').read())
k = 2444 / 815
T0 = mapper(math.radians(-1), 0)
T = lambda z: tuple(v * k for v in T0(z))
bk = Image.open(FG + 'p69_L.png').convert('L')
box = (1050, 60, 1500, 420)
tiles = [bk.crop(box)]
labels = []
for j, side in ((5, -1), (6, 1), (6, -1), (7, 1), (7, -1), (8, 1)):
    outl = koch_outline(j); O = []
    for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], side, 8)
    img = Image.new('L', bk.size, 30); ImageDraw.Draw(img).polygon([T(z) for z in O], fill=215)
    tiles.append(img.crop(box)); labels.append((j, side))
w, h = tiles[0].size
out = Image.new('L', (4 * (w + 10), 2 * (h + 10)), 255)
for i, t in enumerate(tiles): out.paste(t, ((i % 4) * (w + 10), (i // 4) * (h + 10)))
out.save(FG + 'p69_tip2.png'); print(labels)
