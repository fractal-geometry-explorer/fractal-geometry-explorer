import sys, numpy as np
sys.path.insert(0,'.')
from gen import *
from smooth3 import fill
from smooth2 import gsmooth
from PIL import Image
OPTS=[1,3,0,3,3,1,2,2,0,2,0]
def catmull(c, n=12, alpha=0.5):
    P=np.concatenate([[2*c[0]-c[1]],c,[2*c[-1]-c[-2]]])
    out=[c[0]]
    for i in range(1,len(P)-2):
        p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
        t0=0; t1=t0+abs(p1-p0)**alpha; t2=t1+abs(p2-p1)**alpha; t3=t2+abs(p3-p2)**alpha
        for t in np.linspace(t1,t2,n+1)[1:]:
            A1=(t1-t)/(t1-t0)*p0+(t-t0)/(t1-t0)*p1
            A2=(t2-t)/(t2-t1)*p1+(t-t1)/(t2-t1)*p2
            A3=(t3-t)/(t3-t2)*p2+(t-t2)/(t3-t2)*p3
            B1=(t2-t)/(t2-t0)*A1+(t-t0)/(t2-t0)*A2
            B2=(t3-t)/(t3-t1)*A2+(t-t1)/(t3-t1)*A3
            out.append((t2-t)/(t2-t1)*B1+(t-t1)/(t2-t1)*B2)
    return np.array(out)
c=level(3,OPTS)
pl=Image.open('../fgn/plate_crop.png').convert('L')
ims=[pl, fill(catmull(c),erode=0.006), fill(catmull(c, alpha=0.5),erode=0.010)]
W=sum(i.width for i in ims)+40; H=max(i.height for i in ims)
cmp=Image.new('L',(W,H),255); x=0
for i in ims: cmp.paste(i,(x,0)); x+=i.width+20
cmp.resize((W//2,H//2)).save('../fgn/cmp4.png')
