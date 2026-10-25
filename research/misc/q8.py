import numpy as np
from PIL import Image, ImageDraw
G8=[(0,0),(1,0),(1,1),(2,1),(2,0),(2,-1),(3,-1),(3,0),(4,0)]
def gen(G,b):
    return np.array([complex(x,y)/b for x,y in G])
def level(n, G=G8, b=4, flip_stage=None):
    g=gen(G,b); pts=np.array([0j,1+0j])
    for k in range(n):
        gg=np.conj(g) if (flip_stage and flip_stage[k]) else g
        out=[pts[0]]
        for i in range(len(pts)-1):
            a,c=pts[i],pts[i+1]; out+=list(a+(c-a)*gg[1:])
        pts=np.array(out)
    return pts
def draw(q, name, u=10, pad=20):
    x0,x1,y0,y1=q.real.min(),q.real.max(),q.imag.min(),q.imag.max()
    W=int((x1-x0)*u)+2*pad; H=int((y1-y0)*u)+2*pad
    img=Image.new('L',(W,H),255); d=ImageDraw.Draw(img)
    d.line([(pad+(z.real-x0)*u, pad+(y1-z.imag)*u) for z in q], fill=0, width=2)
    img.save(name)
if __name__=='__main__':
    for n in (2,3):
        q=level(n)*4**n; draw(q, f'../fgn/q8_L{n}.png', u=12 if n==2 else 5)
