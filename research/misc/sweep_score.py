import sys, numpy as np
sys.path.insert(0,'.')
from sweep import *
from PIL import Image
from scipy import ndimage
im=np.array(Image.open('../fgn/sw600-084.png').convert('L')).astype(float)
s=600/80; X0=int(330*s)+740; Y0=int(425*s)+0
sub=im[Y0:Y0+620, X0:X0+560]
Image.fromarray(sub.astype(np.uint8)).save('../fgn/sw_stage2.png')
dark=sub<110
er=ndimage.binary_erosion(dark, iterations=5)
lab,n=ndimage.label(er)
blobs=[(ndimage.sum(er,lab,i), *ndimage.center_of_mass(er,lab,i)) for i in range(1,n+1)]
big=sorted([b for b in blobs if b[0]>100], key=lambda b:-b[0])
for b in big[:12]: print('blob size %d at x=%.1f y=%.1f'%(b[0],b[2],b[1]))
