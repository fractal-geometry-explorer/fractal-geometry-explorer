import numpy as np
from PIL import Image
import sys
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(np.float32)
ink = im < 128
H, W = ink.shape
# chart region approx (from quarter view *4): x 130*4..960*4, y 45*4..600*4
x0,x1,y0,y1 = 400, 4100, 150, 2500
sub = ink[y0:y1, x0:x1]
colsum = sub.sum(axis=0)
rowsum = sub.sum(axis=1)
def peaks(arr, thresh, minsep):
    idx = np.where(arr > thresh)[0]
    groups = []
    for i in idx:
        if groups and i - groups[-1][-1] <= minsep: groups[-1].append(i)
        else: groups.append([i])
    return [(sum(g)/len(g), max(arr[g[0]:g[-1]+1])) for g in groups]
print('W,H', W, H)
print('cols (x+%d):'%x0)
for c,v in peaks(colsum, (y1-y0)*0.35, 20): print('  %.1f  %d'%(c+x0, v))
print('rows (y+%d):'%y0)
for r,v in peaks(rowsum, (x1-x0)*0.35, 20): print('  %.1f  %d'%(r+y0, v))
