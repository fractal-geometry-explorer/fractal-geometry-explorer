import sys; sys.path.insert(0,'.')
from overlay import *
c=level(3,OPTS)
def zshow(R, name, sub):
    out=np.full(R.shape+(3,),255,np.uint8)
    out[P&~R]=(220,40,40); out[R&~P]=(40,140,230); out[P&R]=(20,20,20)
    x0,y0,x1,y1=sub
    Image.fromarray(out[y0:y1,x0:x1]).resize(((x1-x0)*2,(y1-y0)*2), Image.NEAREST).save(name)
sub=(380,20,780,330)
zshow(render(c),'../fgn/z_sharp.png',sub)
zshow(render(through_vertices(c,10)),'../fgn/z_arcv.png',sub)
