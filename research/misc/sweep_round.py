import sys, numpy as np
sys.path.insert(0,'.')
from sweep import G7
from PIL import Image, ImageDraw
OPTS=[1,3,3,3,2,1,3]
def expand(depth, opts=OPTS):
    out=[]
    def rec(A,B,c,rev,d):
        if d==0: out.append((A,B,c,rev)); return
        F=lambda z: A+(B-A)*(np.conj(z) if c else z)
        kids=[]
        for i,o in enumerate(opts):
            a,b=G7[i],G7[i+1]
            if o in (2,3): a,b=b,a
            kids.append((F(a),F(b), c ^ (1 if o in (1,3) else 0), rev ^ (1 if o in (2,3) else 0)))
        for k in (reversed(kids) if rev else kids): rec(*k,d-1)
    rec(0j,1+0j,0,0,depth)
    return out
def arc_points(A,B,c,rev,bulge,m=8):
    # 60-degree arc on chord F(0)F(1), bulging to +bulge*y in the copy's own frame
    side=bulge*(-1 if c else 1)
    ch=B-A; n=1j*ch*side          # left normal times side
    mid=(A+B)/2; R=abs(ch)
    cen=mid - n/abs(n)*R*np.sqrt(3)/2 if abs(n)>0 else mid
    a0=np.angle(A-cen); a1=np.angle(B-cen)
    da=(a1-a0+np.pi)%(2*np.pi)-np.pi
    pts=cen+R*np.exp(1j*(a0+da*np.linspace(0,1,m+1)))
    return pts[::-1] if rev else pts
def render(depth,bulge,name,round_=True,W=700):
    segs=expand(depth)
    path=[]
    for A,B,c,rev in segs:
        if round_: p=arc_points(A,B,c,rev,bulge)
        else: p=np.array([B,A]) if rev else np.array([A,B])
        path.extend(p if not path else p[1:])
    path=np.array(path)
    cen=0.5+1j*np.sqrt(3)/6; R=0.62
    sc=W/(2*R*1.05); T=lambda z:(W/2+(z.real-cen.real)*sc, W/2-(z.imag-cen.imag)*sc)
    img=Image.new('L',(W,W),228); d=ImageDraw.Draw(img)
    d.ellipse([T(cen-R+1j*R)[0],T(cen-R+1j*R)[1],T(cen+R-1j*R)[0],T(cen+R-1j*R)[1]], fill=30)
    # lake: the snowflake = region swept; approximate by filling both sides: draw light lake via the Koch snowflake polygon
    def koch(n):
        tri=[0j,1+0j,0.5+1j*np.sqrt(3)/2][::-1]
        pts=tri+[tri[0]]
        for _ in range(n):
            q=[]
            for a,b in zip(pts,pts[1:]):
                v=(b-a)/3; q+= [a, a+v, a+v+v*np.exp(-1j*np.pi/3) if False else a+v+v*np.exp(1j*np.pi/3)*1, a+2*v]
            q.append(pts[-1]); pts=q
        return pts
    lake=koch(6)
    # ensure outward bumps: test orientation
    d.polygon([T(z) for z in lake], fill=230)
    poly=list(path)+[1-0.9j, -0.9j]
    mask=Image.new('L',(W,W),0); ImageDraw.Draw(mask).polygon([T(z) for z in poly], fill=255)
    lakem=Image.new('L',(W,W),0); ImageDraw.Draw(lakem).polygon([T(z) for z in lake], fill=255)
    m=np.array(mask)>0; l=np.array(lakem)>0
    a=np.array(img); a[m&l]=165; img=Image.fromarray(a)
    img.save(name)
for bulge in (1,-1):
    render(3,bulge,f'../fgn/sw_round3_{bulge}.png')
    render(4,bulge,f'../fgn/sw_round4_{bulge}.png')
render(4,1,'../fgn/sw_sharp4.png',round_=False)
