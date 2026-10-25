import numpy as np
s3=np.sqrt(3)
# snowflake-sweep generator (Plates 68-69): six intervals of 1/3 and one of 1/sqrt3
G7=np.array([0, 1/6+1j*s3/6, 1/3+1j*s3/3, 2/3+1j*s3/3, 5/6+1j*s3/6, 1/3+0j, 2/3+0j, 1+0j])
def seg_map(a,b,o):
    if o==0: return lambda z: a+(b-a)*z
    if o==1: return lambda z: a+(b-a)*np.conj(z)
    if o==2: return lambda z: b+(a-b)*z
    return lambda z: b+(a-b)*np.conj(z)
def level(n, opts, G=G7):
    pts=np.array([0j,1+0j])
    for _ in range(n):
        out=[pts[0]]
        for i in range(len(pts)-1):
            pass
        # apply generator-with-orientations to every segment of current level (IFS recursion)
        pts_new=[]
        prev=pts
        maps=[seg_map(G[i],G[i+1],opts[i]) for i in range(len(G)-1)]
        out=[]
        for i,f in enumerate(maps):
            c=f(prev)
            if opts[i]>=2: c=c[::-1]
            out.append(c if i==0 else c[1:])
        pts=np.concatenate(out)
    return pts
