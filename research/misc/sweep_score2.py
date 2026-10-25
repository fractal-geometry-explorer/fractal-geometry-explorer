import sys, numpy as np
sys.path.insert(0,'.')
from sweep import *
from PIL import Image, ImageDraw
from scipy import ndimage
sub=np.array(Image.open('../fgn/sw_stage2.png').convert('L')).astype(float)
dark=ndimage.binary_dilation(sub<140, iterations=2)
P0=np.array([26.8,429.7]); P1=np.array([499.2,427.1])
v=P1-P0; base=complex(v[0],-v[1])
def to_px(z): w=z*base; return P0[0]+w.real, P0[1]-w.imag
names=['N','M','R','RM']; best=[]
for i in range(7):
    sc=[]
    for o in range(4):
        c=seg_map(G7[i],G7[i+1],o)(G7)
        samp=np.array([c[k]+(c[k+1]-c[k])*t for k in range(7) for t in np.linspace(0.15,0.85,9)])
        x,y=to_px(samp); xi=np.clip(np.round(x).astype(int),0,sub.shape[1]-1); yi=np.clip(np.round(y).astype(int),0,sub.shape[0]-1)
        sc.append(dark[yi,xi].mean())
    b=int(np.argmax(sc)); best.append(b)
    print(i, ' '.join(f'{names[o]}:{s:.2f}' for o,s in enumerate(sc)), '->', names[b])
print('opts', best)
im=Image.open('../fgn/sw_stage2.png').convert('RGB'); d=ImageDraw.Draw(im)
c=level(2,best); x,y=to_px(c); d.line(list(zip(x,y)), fill=(230,40,40), width=2); im.save('../fgn/sw_overlay2.png')
