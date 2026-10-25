exec(open('p69fit.py').read().split("W = 815")[0])
src = open('p69fit.py').read(); exec(src[src.index("def koch_outline"):src.index("CEN = ")])
CEN = complex(0.5, r3 / 6)
def tile(j, side, Wd=300):
    outl = koch_outline(j); O = []
    for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], side, 12)
    sc = Wd * 0.75
    img = Image.new('L', (Wd, Wd), 225); d = ImageDraw.Draw(img)
    d.ellipse([4, 4, Wd - 4, Wd - 4], fill=30)
    d.polygon([(Wd / 2 + (z - CEN).real * sc, Wd / 2 - (z - CEN).imag * sc) for z in O], fill=215)
    return img
c1 = Image.open(FG + 'p69_c1.png').convert('L').resize((300, 300)); c2 = Image.open(FG + 'p69_c2.png').convert('L').resize((300, 300))
rows = [[c1] + [tile(j, s) for j, s in ((1, 1), (2, -1), (2, 1), (1, -1))], [c2] + [tile(j, s) for j, s in ((3, 1), (5, -1), (5, 1), (4, 1))]]
out = Image.new('L', (5 * 305, 2 * 305), 255)
for r, row in enumerate(rows):
    for c, t in enumerate(row): out.paste(t, (c * 305, r * 305))
out.save(FG + 'circ_cands.png')
