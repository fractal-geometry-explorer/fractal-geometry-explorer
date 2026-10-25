import numpy as np, json
from PIL import Image, ImageDraw
from scipy import ndimage
G8=[0,1,0,3,3,0,1,0]
def build(g,n):
    seq=[0]
    for _ in range(n): seq=[(d+x)%4 for d in seq for x in g]
    return seq
X=np.array([132,164,195,229,259,290,321,357,388,418,450,482,513,544,580,610,644,676,708,740,772,808,839,870,903],float)
Y=np.array([96,127,164,194,226,258,290,322,354,390,422,453,484,516,548,579,616,647,679,712,742,774,805,842,874,906,937],float)
sx=np.polyfit(np.arange(len(X)),X,1); sy=np.polyfit(np.arange(len(Y)),Y,1)
print('lattice px per unit', sx[0], sy[0])
path=json.load(open('lower_path.json'))[0]           # nodes (i,j), j down
P=np.array([complex(i,-j) for i,j in path])           # y up
def pts(dirs):
    step=[1,1j,-1,-1j]; z=[0j]
    for d in dirs: z.append(z[-1]+step[d])
    return np.array(z)
Q3=pts(build(G8,3))
best=None
for k in range(4):
    for mir in (False,True):
        q=Q3[1:171]-Q3[1]
        if mir: q=np.conj(q)
        q=q*(1j**k)
        err=np.abs(q-(P-P[0])).max()
        if best is None or err<best[0]: best=(err,k,mir)
print('symmetry fit error',best)
err,k,mir=best
def to_lattice(z3):     # level-3 curve coords -> traced lattice coords (y up)
    q=z3-Q3[1]; q=np.conj(q) if mir else q
    return q*(1j**k)+P[0]
def lattice_to_page(L):  # lattice (i, -j) -> 300dpi page px
    i=L.real; j=-L.imag
    return (sx[1]+sx[0]*i)+1137.5, (sy[1]+sy[0]*j)+1362.5
# whole level-3 curve on page
Q4=pts(build(G8,4))/4.0
page=np.array(Image.open('../fgn/p32hi-048.png').convert('L')).astype(float)
dark=ndimage.binary_opening(page<100, structure=np.ones((2,2)))
dist=ndimage.distance_transform_edt(~dark)
x4,y4=lattice_to_page(to_lattice(Q4))
xs3,ys3=lattice_to_page(to_lattice(Q3))
print('level-3 full curve page bbox', xs3.min(),xs3.max(),ys3.min(),ys3.max())
print('level-4 (same place) bbox', x4.min(),x4.max(),y4.min(),y4.max())
# search translation for level-4 to land on the upper drawing
samp=np.linspace(0,len(x4)-1,3000).astype(int)
def score(dx,dy):
    xx=(x4[samp]+dx).round().astype(int); yy=(y4[samp]+dy).round().astype(int)
    ok=(xx>=0)&(xx<dist.shape[1])&(yy>=0)&(yy<dist.shape[0])
    if ok.mean()<0.9: return 1e9
    return np.mean(np.minimum(dist[yy[ok],xx[ok]],30))
bestt=None
for dx in range(-1600,200,8):
    for dy in range(-1500,200,8):
        s=score(dx,dy)
        if bestt is None or s<bestt[0]: bestt=(s,dx,dy)
s,dx0,dy0=bestt
for dx in range(dx0-8,dx0+9):
    for dy in range(dy0-8,dy0+9):
        s=score(dx,dy)
        if s<bestt[0]: bestt=(s,dx,dy)
print('best translation for level 4 onto upper drawing', bestt)
# also test: how much of the upper drawing's dark pixels are explained
s,dx,dy=bestt
img=Image.open('../fgn/p32hi-048.png').convert('RGB'); d=ImageDraw.Draw(img)
d.line([(a+dx,b+dy) for a,b in zip(x4,y4)], fill=(230,40,40), width=2)
d.line([(a,b) for a,b in zip(xs3[1:171],ys3[1:171])], fill=(40,120,230), width=3)
img.crop((150,0,2190,2400)).resize((680,800)).save('../fgn/upper_overlay.png')
json.dump({'k':k,'mir':bool(mir),'dx':dx,'dy':dy}, open('p32_frame.json','w'))
