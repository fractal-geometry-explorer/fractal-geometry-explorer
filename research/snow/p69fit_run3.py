exec(open('p69fit.py').read())
disc = np.load('disc_mask.npy')
T = mapper(math.radians(-1), 0)
for j in (4, 5, 6, 7, 8):
    for side in (1, -1):
        outl = koch_outline(j); O = []
        for i in range(len(outl)): O += arc(outl[i], outl[(i + 1) % len(outl)], side, 4)
        img = Image.new('L', (W, H), 0); ImageDraw.Draw(img).polygon([T(z) for z in O], fill=1)
        M = np.array(img) > 0
        print(j, side, round((((M == (cls > 0)) & disc).sum() / disc.sum()), 4))
