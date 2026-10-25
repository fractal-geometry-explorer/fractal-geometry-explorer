import numpy as np
from PIL import Image, ImageDraw
A=np.arctan(0.5)
def gen_pts(flip=False):
    s=-1 if flip else 1
    r=1/np.sqrt(5)
    d=[s*A, s*(A-np.pi/2), s*A]
    z=[0j]
    for a in d: z.append(z[-1]+r*np.exp(1j*a))
    return np.array(z)
def level(n, flips=None):
    pts=np.array([0j,1+0j])
    for k in range(n):
        g=gen_pts(flips[k] if flips else False)
        out=[pts[0]]
        for i in range(len(pts)-1):
            a,b=pts[i],pts[i+1]
            out+=list(a+(b-a)*g[1:])
        pts=np.array(out)
    return pts
def lattice(n, flips=None):
    p=level(n,flips)
    rot=np.exp(-1j*n*A* (1 if not flips else 1))
    q=p*np.sqrt(5)**n
    # rotate so segments are axis aligned
    seg=q[1]-q[0]; ang=np.angle(seg); q=q*np.exp(-1j*np.round(ang/(np.pi/2))*np.pi/2)*np.exp(-1j*(ang-np.round(ang/(np.pi/2))*np.pi/2))
    return q
def draw(q, name, u=20):
    q=q-complex(q.real.min(), q.imag.max())
    W=int(q.real.max()*u)+40; H=int(-q.imag.min()*u)+40
    img=Image.new('L',(W,H),255); d=ImageDraw.Draw(img)
    d.line([(20+z.real*u, 20-z.imag*u) for z in q], fill=0, width=3)
    d.ellipse((20+q[0].real*u-6,20-q[0].imag*u-6,20+q[0].real*u+6,20-q[0].imag*u+6),fill=0)
    img.save(name)
if __name__=='__main__':
    for n in (3,4):
        q=lattice(n); print(n, len(q)-1, 'segments; integer check', np.abs(q-np.round(q)).max())
        draw(q, f'../fgn/q4_L{n}.png', u=24 if n==3 else 14)
