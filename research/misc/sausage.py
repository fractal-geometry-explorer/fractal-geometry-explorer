import sys; sys.path.insert(0,'.')
import numpy as np
from gen import *
from scipy import ndimage
from PIL import Image, ImageDraw
OPTS=[1,3,0,3,3,1,2,2,0,2,0]
def sausage_areas(c, eps_list, h=0.0004):
    pad=max(eps_list)+0.01
    x0=c.real.min()-pad; y1=c.imag.max()+pad
    W=int((c.real.max()+pad-x0)/h)+1; H=int((y1-(c.imag.min()-pad))/h)+1
    img=Image.new('1',(W,H),1); d=ImageDraw.Draw(img)
    d.line([((z.real-x0)/h,(y1-z.imag)/h) for z in c], fill=0, width=1)
    dist=ndimage.distance_transform_edt(np.array(img))*h
    return [ (dist<=e).sum()*h*h for e in eps_list ]
eps=np.geomspace(0.004,0.16,12)
for n in (2,3,4,5):
    c=level(n,OPTS)
    A=np.array(sausage_areas(c,eps)); L=A/(2*eps)
    print('n',n,' L:',' '.join(f'{v:.2f}' for v in L))
    for lo,hi in ((0.005,0.05),(0.005,0.08),(0.008,0.12)):
        m=(eps>=lo)&(eps<=hi)
        s=np.polyfit(np.log(eps[m]),np.log(L[m]),1)[0]
        print(f'   fit eps {lo}-{hi}: slope {s:.3f}  D={1-s:.3f}')
print('eps',' '.join(f'{e:.4f}' for e in eps))
