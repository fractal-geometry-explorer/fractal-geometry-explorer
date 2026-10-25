import sys, numpy as np
from PIL import Image
from scipy import ndimage
im=np.array(Image.open(sys.argv[1]).convert('L')).astype(float)
dark=im<110
# thick blobs: erode lines away
er=ndimage.binary_erosion(dark, iterations=int(sys.argv[2]))
lab,n=ndimage.label(er)
for i in range(1,n+1):
    ys,xs=np.nonzero(lab==i)
    print(i, round(xs.mean(),1), round(ys.mean(),1), len(xs))
