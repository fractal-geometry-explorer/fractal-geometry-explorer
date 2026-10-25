exec(open('p68fit.py').read().split("cands = ")[0])
import sys
out = [Image.fromarray((~A * 255).astype(np.uint8))]
for gens in ([D13] * 3, [D13] * 4, [S] * 5):
    M = render(gens, x0, 892, sc); out.append(Image.fromarray((~M * 255).astype(np.uint8)))
o = Image.new('L', (4 * 620, 620), 255)
for i, im in enumerate(out): o.paste(im.resize((600, 600)), (i * 620, 0))
o.save(FG + 'p68_cmp.png')
