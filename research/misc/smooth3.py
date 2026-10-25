import sys, numpy as np
sys.path.insert(0,'.')
from gen import *
from smooth2 import gsmooth
from PIL import Image, ImageDraw
OPTS=[1,3,0,3,3,1,2,2,0,2,0]
def fill(c, W=850, h=0.42, erode=0.0, ss=3):
    W2=W*ss
    x0=0; x1=1.0; y1=0.86; y0=-h
    sc=W2/(x1-x0); H=int((y1-y0)*sc)
    img=Image.new('L',(W2,H),235); dd=ImageDraw.Draw(img)
    poly=list(c)+[complex(1,y0), complex(0,y0)]
    P=[((z.real-x0)*sc,(y1-z.imag)*sc) for z in poly]
    dd.polygon(P, fill=20)
    if erode>0:
        dd.line(P[:len(c)], fill=235, width=int(erode*sc), joint='curve')
    return img.resize((W,H//ss), Image.LANCZOS)
if __name__=="__main__":
  c=level(3,OPTS)
  pl=Image.open('../fgn/plate_crop.png').convert('L')
  ims=[pl]
  for sg,er in ((0.008,0.008),(0.012,0.012)):
      ims.append(fill(gsmooth(c,sg),erode=er))
  W=sum(i.width for i in ims)+40; H=max(i.height for i in ims)
  cmp=Image.new('L',(W,H),255); x=0
  for i in ims: cmp.paste(i,(x,0)); x+=i.width+20
  cmp.resize((W//2,H//2)).save('../fgn/cmp3.png')
