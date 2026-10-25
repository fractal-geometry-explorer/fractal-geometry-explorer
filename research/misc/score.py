import sys, numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0,'.')
from gen import *
im=np.array(Image.open(sys.argv[1]).convert('L')).astype(float)
dark=ndimage.binary_dilation(im<140, iterations=2)
P0=np.array([55.0,388.6]); P11=np.array([524.1,389.6])
def to_px(z):
    v=P11-P0; base=complex(v[0],-v[1])  # y up
    w=z*base
    return P0[0]+w.real, P0[1]-w.imag
names=['N','M','R','RM']
best=[]
for i in range(11):
    sc=[]
    for o in range(4):
        f=seg_map(G[i],G[i+1],o)
        c=f(G)
        # sample densely, skip ends
        samp=[]
        for k in range(11):
            for t in np.linspace(0.15,0.85,8):
                samp.append(c[k]+(c[k+1]-c[k])*t)
        samp=np.array(samp)
        x,y=to_px(samp)
        xi=np.clip(np.round(x).astype(int),0,im.shape[1]-1); yi=np.clip(np.round(y).astype(int),0,im.shape[0]-1)
        sc.append(dark[yi,xi].mean())
    b=int(np.argmax(sc)); best.append(b)
    print(i, ' '.join(f'{names[o]}:{s:.2f}' for o,s in enumerate(sc)), '->',names[b])
print(best)
