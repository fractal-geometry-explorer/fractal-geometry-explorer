import numpy as np
s3=np.sqrt(3)
# generator on triangular lattice, unit base
def pts():
    L=1/3; S=1/(3*s3)
    steps=[(L,60),(L,60),(L,0),(L,-60),(S,150),(S,150),(S,210),(S,270),(S,270),(L,0),(L,0)]
    z=[0j]
    for r,a in steps: z.append(z[-1]+r*np.exp(1j*np.radians(a)))
    return np.array(z)
G=pts()
def seg_map(a,b,opt):
    # opt: 0=N,1=M(mirror),2=R(reverse),3=RM
    if opt==0: f=lambda z: a+(b-a)*z
    elif opt==1: f=lambda z: a+(b-a)*np.conj(z)
    elif opt==2: f=lambda z: b+(a-b)*z
    else: f=lambda z: b+(a-b)*np.conj(z)
    return f
def level(n, opts):
    # opts: list of 11 option codes; returns point list from 0 to 1
    if n==0: return np.array([0j,1+0j])
    prev=level(n-1,opts)
    out=[]
    for i in range(11):
        f=seg_map(G[i],G[i+1],opts[i])
        c=f(prev)
        if opts[i]>=2: c=c[::-1]
        out.append(c if i==0 else c[1:])
    return np.concatenate(out)
