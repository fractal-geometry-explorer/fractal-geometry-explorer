exec(open('p69fit.py').read())
T = mapper(math.radians(-1), 0)
bk = Image.open(FG + 'p69_L.png').convert('L').resize((W, 818))
box = (230, 0, 560, 250)   # top arm
tiles = [bk.crop(box).resize((660, 500))]
for j, side in ((5, -1), (6, 1), (7, -1), (4, 1)):
    outl = koch_outline(j); O = []
    for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], side, 6)
    img = Image.new('L', (W, H), 30); ImageDraw.Draw(img).polygon([T(z) for z in O], fill=215)
    tiles.append(img.crop(box).resize((660, 500)))
out = Image.new('L', (5 * 670, 500), 255)
for k, t in enumerate(tiles): out.paste(t, (k * 670, 0))
out.save(FG + 'p69_tip.png')
