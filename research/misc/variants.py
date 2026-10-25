import sys; sys.path.insert(0,'.')
import numpy as np
from PIL import Image, ImageDraw
from arcs import *
from smooth4 import catmull
pg=Image.open('../fgn/full300-047.png').convert('L')
F=0.5
A=np.array(pg.resize((int(pg.width*F),int(pg.height*F)), Image.BILINEAR)).astype(float)<110
box=[int(v*F) for v in (1000,20,2200,1380)]
P=A[box[1]:box[3],box[0]:box[2]]
def render(curve,S,OX,OY,band=0.295):
    img=Image.new('1',(A.shape[1],A.shape[0]),0); dd=ImageDraw.Draw(img)
    poly=list(curve)+[complex(curve[-1].real,-band), complex(curve[0].real,-band)]
    dd.polygon([(OX*F+z.real*S*F, OY*F-z.imag*S*F) for z in poly], fill=1)
    return np.array(img)[box[1]:box[3],box[0]:box[2]]
def score(curve):
    best=(0,)
    for S in (1085,1090,1095,1100,1105):
        for OX in (1049,1051,1053,1055,1057):
            for OY in (1031,1033,1035,1037,1039):
                R=render(curve,S,OX,OY); v=(R&P).sum()/(R|P).sum()
                if v>best[0]: best=(v,S,OX,OY)
    return best
def bis_vertices(c,m=6):
    N=len(c); T=[unit(c[1]-c[0])]+[unit(unit(c[k]-c[k-1])+unit(c[k+1]-c[k])) for k in range(1,N-1)]+[unit(c[-1]-c[-2])]
    out=[c[0]]
    for k in range(N-1): out+=biarc(c[k],T[k],c[k+1],T[k+1],m)
    return np.array(out)
c=level(3,OPTS)
for name,cv in [('sharp',c),('arcs thru vertices, circle tangent',through_vertices(c,6)),('arcs thru vertices, bisector tangent',bis_vertices(c,6)),
                ('fillet arcs r=1',fillets(c,1.0,6)),('fillet arcs r=0.6',fillets(c,0.6,6)),('catmull-rom',catmull(c,8))]:
    print(f'{name:40s}', ' '.join(str(round(x,4)) if isinstance(x,float) else str(x) for x in score(cv)))
