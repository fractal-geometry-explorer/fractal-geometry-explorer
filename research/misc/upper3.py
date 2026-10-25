import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, signal
G8=[0,1,0,3,3,0,1,0]
def build(g,n):
    seq=[0]
    for _ in range(n): seq=[(d+x)%4 for d in seq for x in g]
    return seq
def pts(dirs):
    step=[1,1j,-1,-1j]; z=[0j]
    for d in dirs: z.append(z[-1]+step[d])
    return np.array(z)
page=np.array(Image.open('../fgn/p32hi-048.png').convert('L')).astype(float)
dark=ndimage.binary_opening(page<100, structure=np.ones((2,2)))
R=(slice(60,1420),slice(240,2170))
U=ndimage.binary_dilation(dark[R],iterations=1).astype(float)
nd=dark[R].sum()
res=[]
for n,unit in ((4,8.03),(5,8.03),(4,16.06),(3,8.03)):
    Q=pts(build(G8,n))
    for k in range(4):
        for mir in (False,True):
            q=np.conj(Q) if mir else Q
            q=q*(1j**k)*unit
            x=q.real-q.real.min()+3; y=q.imag.max()-q.imag+3
            W=int(x.max())+4; H=int(y.max())+4
            if W>6000 or H>6000: continue
            im=Image.new('L',(W,H),0); ImageDraw.Draw(im).line(list(zip(x,y)),fill=255,width=3)
            C=(np.array(im)>0).astype(float)
            corr=signal.fftconvolve(U, C[::-1,::-1], mode='full')
            i=np.unravel_index(np.argmax(corr),corr.shape)
            res.append((corr[i]/nd, n, unit, k, mir, i, C.shape))
res.sort(key=lambda r:-r[0])
for r in res[:6]: print(round(r[0],3), 'level',r[1],'unit',r[2],'rot',r[3]*90,'mirror',r[4],'peak',r[5],'curve img',r[6])
