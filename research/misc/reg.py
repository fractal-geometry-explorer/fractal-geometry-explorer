import sys; sys.path.insert(0,'.')
import numpy as np
from PIL import Image, ImageDraw
from arcs import *
a=Image.open('../fgn/full300-047.png').convert('L')
F=0.3  # downsample
A=np.array(a.resize((int(a.width*F),int(a.height*F)), Image.BILINEAR)).astype(float)<110
# plate region above band
X0,X1,Y0,Y1=int(1030*F),int(2165*F),int(30*F),int(1040*F)
P=A[Y0:Y1,X0:X1]
c=level(3,OPTS); tv=through_vertices(c,6)
def render(curve, s, ox, oy, band=0.3):
    img=Image.new('1',(A.shape[1],A.shape[0]),0); dd=ImageDraw.Draw(img)
    poly=list(curve)+[complex(curve[-1].real,-band), complex(curve[0].real,-band)]
    dd.polygon([(ox+z.real*s, oy-z.imag*s) for z in poly], fill=1)
    return np.array(img)[Y0:Y1,X0:X1]
def iou(R): return (R&P).sum()/max(1,(R|P).sum())
best=None
for s in np.linspace(1000,1200,21)*F:
    for ox in np.arange(1030,1080,5)*F:
        for oy in np.arange(1020,1050,5)*F:
            v=iou(render(tv,s,ox,oy))
            if best is None or v>best[0]: best=(v,s/F,ox/F,oy/F)
print('best',best)
v,s,ox,oy=best
for s2 in np.linspace(s-10,s+10,5):
  for ox2 in np.arange(ox-4,ox+5,2):
    for oy2 in np.arange(oy-4,oy+5,2):
        vv=iou(render(tv,s2*F,ox2*F,oy2*F))
        if vv>best[0]: best=(vv,s2,ox2,oy2)
print('refined',best)
