import numpy as np, subprocess, json
from PIL import Image, ImageDraw
js = r'''
const fs=require('fs'); eval(fs.readFileSync('core.js','utf8')+';global.X={riverTree,pruneTree};');
const out={};
for (const n of [9,10,11]) for (const pr of [1,2,3,4]) {
  const R=X.riverTree(n), g=X.pruneTree(R.adj,pr), segs=[];
  for (const [a,s] of g) for (const b of s) if (b>a) segs.push([...R.toXY(a),...R.toXY(b)]);
  out[n+'_'+pr]=segs;
}
console.log(JSON.stringify(out));
'''
open('/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/code/dragon/_rv.js','w').write(js)
D = json.loads(subprocess.check_output(['node', '_rv.js']))
book = Image.open('../../fgn/dh-083.png').convert('L').crop((60, 720, 1000, 1640))
bw, bh = book.size
tiles = [book.resize((bw // 2, bh // 2))]
toP = lambda x, y: (x, y)
for key in ['9_2', '9_3', '11_2', '11_3', '11_4', '10_2']:
    segs = np.array(D[key])
    # same frame as the page: twindragon box x -0.35..1.35, y -0.7..0.7
    W, H = bw // 2, bh // 2
    s = min(W / 1.7, H / 1.4); ox = W / 2 - 0.5 * s; oy = H / 2
    im = Image.new('L', (W, H), 236); d = ImageDraw.Draw(im)
    for x0, y0, x1, y1 in segs: d.line([(ox + x0 * s, oy - y0 * s), (ox + x1 * s, oy - y1 * s)], fill=20, width=2)
    d.text((5, 5), key, fill=0)
    tiles.append(im)
out = Image.new('L', (sum(t.width for t in tiles) + 10 * len(tiles), max(t.height for t in tiles)), 255)
x = 0
for t in tiles: out.paste(t, (x, 0)); x += t.width + 10
out.save('../../fgn/river_cmp.png'); print(out.size)
