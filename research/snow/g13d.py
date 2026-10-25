exec(open('g13c.py').read().split("print('7 SS'")[0])
from PIL import ImageDraw
im = Image.open(FG + 'g69_13.png').convert('RGB')
d = ImageDraw.Draw(im)
for gens, col in (([G13, mirror(G13)], (255, 0, 0)),):
    P = curve(gens); X = 903 + P.real * 697; Y = 676 - P.imag * 697
    d.line(list(zip(X, Y)), fill=col, width=3)
P = curve([G13]); d.line(list(zip(92 + P.real * 703, 683 - P.imag * 703)), fill=(255, 0, 0), width=3)
im.resize((im.width // 2, im.height // 2)).save(FG + 'g13_overlay.png')
