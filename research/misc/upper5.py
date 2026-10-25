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
R=(slice(40,1440),slice(220,2190))
U=ndimage.binary_dilation(dark[R],iterations=1).astype(float)
Q=-pts(build(G8,4))
best=None
for unit in np.arange(6.9,7.7,0.05):
    q=Q*unit; x=q.real-q.real.min()+3; y=q.imag.max()-q.imag+3
    im=Image.new('L',(int(x.max())+4,int(y.max())+4),0); ImageDraw.Draw(im).line(list(zip(x,y)),fill=255,width=2)
    C=(np.array(im)>0).astype(float)
    if C.shape[0]>U.shape[0] or C.shape[1]>U.shape[1]: continue
    corr=signal.fftconvolve(U, C[::-1,::-1], mode='valid'); i=np.unravel_index(np.argmax(corr),corr.shape)
    v=corr[i]/C.sum()
    if best is None or v>best[0]: best=(v,unit,i)
    print(round(unit,2), round(v,3))
print('best', best)
v,unit,(oy,ox)=best
q=Q*unit; x=q.real-q.real.min()+3+ox+R[1].start; y=q.imag.max()-q.imag+3+oy+R[0].start
img=Image.open('../fgn/p32hi-048.png').convert('RGB'); d=ImageDraw.Draw(img)
d.line(list(zip(x,y)), fill=(230,40,40), width=1)
img.crop((200,30,2200,1450)).resize((1000,710)).save('../fgn/upper_fit.png')
