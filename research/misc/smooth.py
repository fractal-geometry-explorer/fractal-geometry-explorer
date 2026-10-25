import sys, numpy as np
sys.path.insert(0,'.')
from gen import *
from PIL import Image, ImageDraw
OPTS=[1,3,0,3,3,1,2,2,0,2,0]
def chaikin(c, it, q=0.25):
    for _ in range(it):
        a=c[:-1]; b=c[1:]
        Q=a+(b-a)*q; R=a+(b-a)*(1-q)
        mid=np.empty(2*len(a),complex); mid[0::2]=Q; mid[1::2]=R
        c=np.concatenate([[c[0]],mid[1:-1] if False else mid,[c[-1]]])
    return c
def fill(c, W=850, h=0.42, pad=0.0):
    xs=c.real; ys=c.imag
    x0=0-0.0; x1=1.0; y1=ys.max()+0.02; y0=-h
    sc=W/(x1-x0); H=int((y1-y0)*sc)
    img=Image.new('L',(W,H),235); dd=ImageDraw.Draw(img)
    poly=list(c)+[complex(1,y0), complex(0,y0)]
    dd.polygon([((z.real-x0)*sc,(y1-z.imag)*sc) for z in poly], fill=20)
    return img
c=level(3,OPTS)
print('x range',c.real.min(),c.real.max(),'y',c.imag.min(),c.imag.max())
for it in (2,4):
    fill(chaikin(c,it)).save(f'../fgn/sm3_{it}.png')
pl=Image.open('../fgn/plate_crop.png').convert('L')
a=fill(chaikin(c,4)); 
W=a.width+pl.width+20; H=max(a.height,pl.height)
cmp=Image.new('L',(W,H),255); cmp.paste(pl,(0,0)); cmp.paste(a,(pl.width+20,0)); cmp.save('../fgn/cmp.png')
