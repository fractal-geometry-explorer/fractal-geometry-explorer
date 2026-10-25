exec(open('gtree.py').read().split("res = []")[0])
from PIL import ImageDraw
im = Image.open(FG + 'g71_tree.png').convert('RGB'); d = ImageDraw.Draw(im)
codes = (1, 3, 3, 3, 3, 3, 1)
segs = []
for (p, q), c in zip(links, codes): segs += place_links(links, p, q, c)
for p, q in segs:
    d.line([(648 + p.real * 474, 470 - p.imag * 474), (648 + q.real * 474, 470 - q.imag * 474)], fill=(255, 0, 0), width=3)
im.crop((600, 60, 1200, 600)).save(FG + 'gtree_ov.png')
