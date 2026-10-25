import sys, numpy as np
sys.path.insert(0,'.')
from gen import *
from PIL import Image, ImageDraw
OPTS=[1,3,0,3,3,1,2,2,0,2,0]
def unit(z): 
    a=abs(z); return z/a if a>0 else z
def cross(a,b): return (a.conjugate()*b).imag
def dot(a,b): return (a.conjugate()*b).real
def arc_pts(p,t,q,m):
    ch=q-p; sw=2*np.arctan2(cross(t,ch),dot(t,ch))
    if abs(sw)<1e-9: return [p+ch*f for f in np.linspace(0,1,m+1)[1:]]
    # center: p + i*t*r (left normal if sw>0)
    n=1j*t; r=dot(ch,ch)/(2*dot(n,ch)); c=p+n*r
    return [c+(p-c)*np.exp(1j*sw*f) for f in np.linspace(0,1,m+1)[1:]]
def biarc(p1,t1,p2,t2,m):
    v=p2-p1; t=t1+t2; den=2*(1-dot(t1,t2))
    if abs(den)<1e-12:
        vt2=dot(v,t2)
        d= dot(v,v)/(4*vt2) if abs(vt2)>1e-12 else abs(v)/2
    else:
        vt=dot(v,t); d=(-vt+np.sqrt(vt*vt+den*dot(v,v)))/den
    pm1=p1+d*t1; pm2=p2-d*t2; pm=(pm1+pm2)/2; tm=unit(pm2-pm1)
    if abs(pm2-pm1)<1e-15: tm=t1
    return arc_pts(p1,t1,pm,m)+arc_pts(pm,tm,p2,m)
def circ_tangent(a,b,c):
    # tangent at b of circle through a,b,c (direction of travel a->c)
    u=b-a; w=c-b
    # standard: tangent = unit(u)*|w| + unit(w)*|u| weighted ... use exact circle tangent
    # exact: t ∝ |w|^2 * u + |u|^2 * w  (tangent of circumcircle at middle point)
    return unit(u*abs(w)**2 + w*abs(u)**2) if True else None
def through_vertices(c,m=6):
    N=len(c); T=[None]*N
    for k in range(1,N-1): T[k]=circ_tangent(c[k-1],c[k],c[k+1])
    # endpoints: reflect circle tangent
    T[0]=unit(2*unit(c[1]-c[0])*1 - T[1]*0) ; T[0]=unit(c[1]-c[0]); T[-1]=unit(c[-1]-c[-2])
    out=[c[0]]
    for k in range(N-1): out+=biarc(c[k],T[k],c[k+1],T[k+1],m)
    return np.array(out)
def fillets(c,r=1.0,m=6):
    N=len(c); out=[c[0]]
    for k in range(1,N-1):
        V=c[k]; A=V+(c[k-1]-V)*r/2; B=V+(c[k+1]-V)*r/2
        out.append(A)
        out+=biarc(A,unit(V-c[k-1]),B,unit(c[k+1]-V),m)
    out.append(c[-1]); return np.array(out)
def fill(c, W=850, h=0.42, erode=0.0, ss=3):
    W2=W*ss; x0=0; x1=1.0; y1=0.86; y0=-h
    sc=W2/(x1-x0); H=int((y1-y0)*sc)
    img=Image.new('L',(W2,H),235); dd=ImageDraw.Draw(img)
    poly=list(c)+[complex(1,y0), complex(0,y0)]
    P=[((z.real-x0)*sc,(y1-z.imag)*sc) for z in poly]
    dd.polygon(P, fill=20)
    if erode>0: dd.line(P[:len(c)], fill=235, width=int(erode*sc), joint='curve')
    return img.resize((W,H//ss), Image.LANCZOS)
if __name__=='__main__':
    c=level(3,OPTS)
    pl=Image.open('../fgn/plate_crop.png').convert('L')
    ims=[pl, fill(through_vertices(c)), fill(fillets(c,1.0))]
    W=sum(i.width for i in ims)+40; H=max(i.height for i in ims)
    cmp=Image.new('L',(W,H),255); x=0
    for i in ims: cmp.paste(i,(x,0)); x+=i.width+20
    cmp.resize((W//2,H//2)).save('../fgn/arcs_cmp.png')
