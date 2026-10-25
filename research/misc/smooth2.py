import sys, numpy as np
sys.path.insert(0,'.')
from gen import *
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter1d
OPTS=[1,3,0,3,3,1,2,2,0,2,0]
def resample(c, ds):
    d=np.abs(np.diff(c)); s=np.concatenate([[0],np.cumsum(d)])
    t=np.arange(0,s[-1],ds); t=np.append(t,s[-1])
    return np.interp(t,s,c.real)+1j*np.interp(t,s,c.imag), ds
def gsmooth(c, sigma_len, ds=0.0008):
    r,_=resample(c,ds)
    # odd reflection about endpoints keeps endpoints fixed
    n=int(4*sigma_len/ds)+2
    left=2*r[0]-r[1:n+1][::-1]; right=2*r[-1]-r[-n-1:-1][::-1]
    ext=np.concatenate([left,r,right])
    sx=gaussian_filter1d(ext.real, sigma_len/ds); sy=gaussian_filter1d(ext.imag, sigma_len/ds)
    return (sx+1j*sy)[n:-n]
def fill(c, W=850, h=0.42):
    x0=0; x1=1.0; y1=0.86; y0=-h
    sc=W/(x1-x0); H=int((y1-y0)*sc)
    img=Image.new('L',(W,H),235); dd=ImageDraw.Draw(img)
    poly=list(c)+[complex(1,y0), complex(0,y0)]
    dd.polygon([((z.real-x0)*sc,(y1-z.imag)*sc) for z in poly], fill=20)
    return img
if __name__=="__main__":
  c=level(3,OPTS)
  pl=Image.open('../fgn/plate_crop.png').convert('L')
  ims=[pl]
  for sg in (0.006,0.010):
      ims.append(fill(gsmooth(c,sg)))
  W=sum(i.width for i in ims)+40; H=max(i.height for i in ims)
  cmp=Image.new('L',(W,H),255); x=0
  for i in ims: cmp.paste(i,(x,0)); x+=i.width+20
  cmp.resize((W//2,H//2)).save('../fgn/cmp2.png')
