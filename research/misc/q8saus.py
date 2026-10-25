import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
G8=[0,1,0,3,3,0,1,0]
def build(g,n):
    seq=[0]
    for _ in range(n): seq=[(d+x)%4 for d in seq for x in g]
    return seq
def pts(dirs):
    step=[1,1j,-1,-1j]; z=[0j]
    for d in dirs: z.append(z[-1]+step[d])
    return np.array(z)
def areas(c, eps_list, h):
    pad=max(eps_list)+0.01
    x0=c.real.min()-pad; y1=c.imag.max()+pad
    W=int((c.real.max()+pad-x0)/h)+1; H=int((y1-(c.imag.min()-pad))/h)+1
    img=Image.new('1',(W,H),1); d=ImageDraw.Draw(img)
    d.line([((z.real-x0)/h,(y1-z.imag)/h) for z in c], fill=0, width=1)
    dist=ndimage.distance_transform_edt(np.array(img))*h
    return np.array([(dist<=e).sum()*h*h for e in eps_list])
eps=np.geomspace(0.002,0.12,13)
for n in (3,4,5,6):
    c=pts(build(G8,n))/4**n
    if n==3: print('bbox y', c.imag.min(), c.imag.max())
    L=areas(c,eps,h=0.00025)/(2*eps)
    loc=1-np.diff(np.log(L))/np.diff(np.log(eps))
    m=eps<=0.03
    D=1-np.polyfit(np.log(eps[m]),np.log(L[m]),1)[0]
    print(f'n={n} fitted D (eps<=0.03) {D:.3f}  local D', ' '.join(f'{v:.2f}' for v in loc))
print('eps',' '.join(f'{e:.4f}' for e in eps))
