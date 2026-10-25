import sys; sys.path.insert(0,'.')
import numpy as np
from PIL import Image, ImageDraw
from arcs import *
S,OX,OY=1095,1053,1035
pg=Image.open('../fgn/full300-047.png').convert('L')
box=(1000,20,2200,1380)
P=np.array(pg.crop(box)).astype(float)<110
def render(curve, band=0.295, erode=0):
    img=Image.new('L',(box[2]-box[0],box[3]-box[1]),0); dd=ImageDraw.Draw(img)
    poly=list(curve)+[complex(curve[-1].real,-band), complex(curve[0].real,-band)]
    tr=lambda z:(OX-box[0]+z.real*S, OY-box[1]-z.imag*S)
    dd.polygon([tr(z) for z in poly], fill=255)
    if erode: dd.line([tr(z) for z in curve], fill=0, width=int(erode*S), joint='curve')
    return np.array(img)>127
def show(R, name):
    out=np.full(R.shape+(3,),255,np.uint8)
    out[P&~R]=(220,40,40)      # plate only: red
    out[R&~P]=(40,140,230)     # ours only: blue
    out[P&R]=(20,20,20)
    Image.fromarray(out).resize((600,680)).save(name)
    u=(P|R).sum(); return (P&R).sum()/u
if __name__=='__main__':
    c=level(3,OPTS)
    print('sharp', show(render(c),'../fgn/ov_sharp.png'))
    print('arcs-v', show(render(through_vertices(c,8)),'../fgn/ov_arcv.png'))
    print('fillet', show(render(fillets(c,1.0,8)),'../fgn/ov_fil.png'))
    a=np.array(pg.crop(box)); r=np.nonzero((a<110)[:1000].any(axis=1))[0][0]; xs=np.nonzero(a[r]<110)[0]
    print('plate topmost dark row',r+box[1],'x',xs.mean()+box[0], '-> world', ((xs.mean()+box[0]-OX)/S, (OY-(r+box[1]))/S))
    i=np.argmax(c.imag); print('sharp curve top', c[i])
    tv=through_vertices(c,8); i=np.argmax(tv.imag); print('arc curve top', tv[i])
