exec(open('p69int.py').read().split("O = outline(8, -1)")[0])
O = outline(8, -1)
for name, gens in (('a', [D13, D13, D13]), ('b', [G13, mirror(G13), mirror(G13)])):
    R = render_full(rounded(gens, 'toward'), O)
    img = np.zeros((H, W, 3), np.uint8); img[...] = 235
    img[blk & disc] = (40, 40, 40); img[(R == 1)] = (150, 150, 150)
    img[(R == 2) & gray] = (220, 40, 40); img[(R == 1) & light] = (40, 90, 220)
    Image.fromarray(img).resize((W // 3, H // 3)).save(FG + f'p69_diff_{name}.png')
a = Image.open(FG + 'p69_diff_a.png'); b = Image.open(FG + 'p69_diff_b.png')
o = Image.new('RGB', (a.width * 2 + 10, a.height), 'white'); o.paste(a, (0, 0)); o.paste(b, (a.width + 10, 0)); o.save(FG + 'p69_diff_ab.png')
