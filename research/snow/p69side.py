import numpy as np
from PIL import Image
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
R = np.load('p69R_toward.npy')
bk = Image.open(FG + 'p69_L.png').convert('L')
pal = np.array([35, 150, 225], np.uint8)
ours = Image.fromarray(pal[R])
boxes = [(860, 1700, 1560, 2300), (180, 1250, 880, 1850), (1250, 1000, 1950, 1600)]
tiles = []
for b in boxes: tiles += [bk.crop(b).resize((500, 428)), ours.crop(b).resize((500, 428))]
out = Image.new('L', (6 * 505, 428), 255)
for i, t in enumerate(tiles): out.paste(t, (i * 505, 0))
out.save(FG + 'p69_side.png')
