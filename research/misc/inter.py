import sys, numpy as np, itertools, random
sys.path.insert(0,'.')
from gen import *
def check(c, eps=1e-9):
    A=c[:-1]; B=c[1:]; n=len(A)
    # duplicate vertices
    r=np.round(c*1e7)
    dup=len(r)-len(set(r.tolist()))
    cross=0
    def orient(p,q,r): return ((q-p).conjugate()*(r-p)).imag
    for i in range(n):
        for j in range(i+2,n):
            p1,p2,q1,q2=A[i],B[i],A[j],B[j]
            # bbox reject
            if max(p1.real,p2.real)<min(q1.real,q2.real)-eps or max(q1.real,q2.real)<min(p1.real,p2.real)-eps: continue
            if max(p1.imag,p2.imag)<min(q1.imag,q2.imag)-eps or max(q1.imag,q2.imag)<min(p1.imag,p2.imag)-eps: continue
            d1=orient(q1,q2,p1); d2=orient(q1,q2,p2); d3=orient(p1,p2,q1); d4=orient(p1,p2,q2)
            if ((d1>eps and d2<-eps) or (d1<-eps and d2>eps)) and ((d3>eps and d4<-eps) or (d3<-eps and d4>eps)):
                cross+=1
            elif abs(d1)<eps and abs(d2)<eps:  # collinear overlap
                # project
                u=(q2-q1)/abs(q2-q1)
                t=sorted([((p1-q1)/u).real,((p2-q1)/u).real]); L=abs(q2-q1)
                if min(t[1],L)-max(t[0],0)>1e-7: cross+=1
    return dup, cross
M=[1,3,0,3,3,1,2,2,0,2,0]
for n in (2,3):
    print('mandelbrot level',n, check(level(n,M)))
random.seed(1)
ok=0
for k in range(40):
    o=[random.randrange(4) for _ in range(11)]
    d,c=check(level(2,o))
    ok+= (c==0)
print('random level-2 self-avoiding:',ok,'/40')
