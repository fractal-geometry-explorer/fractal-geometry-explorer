import sys; sys.path.insert(0,'.')
from variants import *
def beta_vertices(c,beta,m=6):
    N=len(c); T=[unit(c[1]-c[0])]
    for k in range(1,N-1):
        u=c[k]-c[k-1]; w=c[k+1]-c[k]
        T.append(unit(unit(u)*abs(w)**beta + unit(w)*abs(u)**beta))
    T.append(unit(c[-1]-c[-2]))
    out=[c[0]]
    for k in range(N-1): out+=biarc(c[k],T[k],c[k+1],T[k+1],m)
    return np.array(out)
c=level(3,OPTS)
for beta in (-1,-0.5,0,0.5):
    print('beta',beta, round(score(beta_vertices(c,beta))[0],4))
def score_er(curve,er,S=1095,OX=1053,OY=1035):
    img=Image.new('L',(A.shape[1],A.shape[0]),0); dd=ImageDraw.Draw(img)
    poly=list(curve)+[complex(curve[-1].real,-0.295), complex(curve[0].real,-0.295)]
    tr=lambda z:(OX*F+z.real*S*F, OY*F-z.imag*S*F)
    dd.polygon([tr(z) for z in poly], fill=255)
    if er>0: dd.line([tr(z) for z in curve], fill=0, width=max(1,int(round(er*S*F))), joint='curve')
    R=np.array(img)[box[1]:box[3],box[0]:box[2]]>127
    return (R&P).sum()/(R|P).sum()
bv=beta_vertices(c,0)
for er in (0,0.002,0.004,0.006):
    print('bisector arcs, channel',er, round(score_er(bv,er),4))
