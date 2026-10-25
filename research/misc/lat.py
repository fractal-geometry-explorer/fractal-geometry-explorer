import numpy as np, sys
from PIL import Image
from scipy import ndimage
im=np.array(Image.open(sys.argv[1]).convert('L')).astype(float)
dark=ndimage.binary_opening(im<100, structure=np.ones((2,2)))
k=int(sys.argv[2])
vert=ndimage.binary_opening(dark, structure=np.ones((k,1)))
hor=ndimage.binary_opening(dark, structure=np.ones((1,k)))
def peaks(prof, minv):
    idx=[i for i in range(1,len(prof)-1) if prof[i]>=minv and prof[i]>=prof[i-1] and prof[i]>=prof[i+1]]
    m=[]
    for x in idx:
        if m and x-m[-1][-1]<=2: m[-1].append(x)
        else: m.append([x])
    return [float(np.mean(g)) for g in m]
xs=peaks(vert.sum(axis=0),3); ys=peaks(hor.sum(axis=1),3)
print(len(xs),'x lines; diffs median', np.median(np.diff(xs)), 'first', [round(v) for v in xs[:12]])
print(len(ys),'y lines; diffs median', np.median(np.diff(ys)), 'first', [round(v) for v in ys[:12]])
print(','.join(str(round(v,1)) for v in xs)); print(','.join(str(round(v,1)) for v in ys))
