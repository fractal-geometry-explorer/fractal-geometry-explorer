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
dark=ndimage.binary_opening(page<100, structure=np.ones((3,3)))
R=(slice(60,1420),slice(240,2170))
U=ndimage.binary_dilation(dark[R],iterations=2).astype(float)
out=[]
for n,a,b,unit in ((4,8,8*170,8.03),(5,64,64*170,2.0075),(4,8,8*170,4.015),(4,8,8*170,16.06)):
    Q=pts(build(G8,n))[a:b+1]
    for k in range(4):
        for mir in (False,True):
            q=(np.conj(Q) if mir else Q)*(1j**k)*unit
            x=q.real-q.real.min()+3; y=q.imag.max()-q.imag+3
            W=int(x.max())+4; H=int(y.max())+4
            im=Image.new('L',(W,H),0); ImageDraw.Draw(im).line(list(zip(x,y)),fill=255,width=2)
            C=(np.array(im)>0).astype(float)
            if C.shape[0]>U.shape[0] or C.shape[1]>U.shape[1]: continue
            corr=signal.fftconvolve(U, C[::-1,::-1], mode="valid")
            i=np.unravel_index(np.argmax(corr),corr.shape)
            out.append((corr[i]/C.sum(), n, unit, k*90, mir, (int(i[0]),int(i[1])), C.shape))
out.sort(key=lambda r:-r[0])
for r in out[:6]: print(round(r[0],3), r[1:])
