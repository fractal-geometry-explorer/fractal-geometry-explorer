import sys, numpy as np
sys.path.insert(0,'.')
from gen import *
from PIL import Image, ImageDraw
OPTS=[1,3,0,3,3,1,2,2,0,2,0]
# overlay level 2 on book figure
im=Image.open('../fgn/stage2-047.png').convert('RGB'); d=ImageDraw.Draw(im)
P0=np.array([55.0,388.6]); P11=np.array([524.1,389.6])
v=P11-P0; base=complex(v[0],-v[1])
c=level(2,OPTS)*base
pts=[(P0[0]+w.real, P0[1]-w.imag) for w in c]
d.line(pts, fill=(255,0,0), width=2)
im.save('../fgn/overlay2.png')
print(len(level(4,OPTS)))
# fills
def fill(n, W=1100, h=0.42, rule='nonzero'):
    c=level(n,OPTS)
    pad=0.06
    xs=c.real; ys=c.imag
    x0=min(xs.min(),0)-pad; x1=max(xs.max(),1)+pad; y1=ys.max()+pad; y0=-h
    sc=W/(x1-x0); H=int((y1-y0)*sc)
    img=Image.new('L',(W,H),235); dd=ImageDraw.Draw(img)
    poly=list(c)+[1-0j+0, complex(1,y0), complex(0,y0)]
    P=[((z.real-x0)*sc, (y1-z.imag)*sc) for z in poly]
    dd.polygon(P, fill=20)
    return img
for n in (2,3,4):
    fill(n).save(f'../fgn/fill{n}.png')
