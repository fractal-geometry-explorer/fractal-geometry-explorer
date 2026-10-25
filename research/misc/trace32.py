import numpy as np, sys
from PIL import Image
from scipy import ndimage
im=np.array(Image.open(sys.argv[1]).convert('L')).astype(float)
dark=im<100
dark=ndimage.binary_opening(dark, structure=np.ones((2,2)))
# vertical and horizontal strokes
vert=ndimage.binary_opening(dark, structure=np.ones((15,1)))
hor=ndimage.binary_opening(dark, structure=np.ones((1,15)))
def peaks(prof, minv):
    p=[]; 
    for i in range(1,len(prof)-1):
        if prof[i]>=minv and prof[i]>=prof[i-1] and prof[i]>=prof[i+1]: p.append(i)
    # merge close
    m=[]
    for x in p:
        if m and x-m[-1][-1]<=4: m[-1].append(x)
        else: m.append([x])
    return [np.mean(g) for g in m]
xs=peaks(vert.sum(axis=0), 10); ys=peaks(hor.sum(axis=1), 10)
print('vertical-line x:', [round(x) for x in xs])
print('horizontal-line y:', [round(y) for y in ys])
dx=np.diff(xs); dy=np.diff(ys)
print('dx', [round(v,1) for v in dx]); print('dy',[round(v,1) for v in dy])
