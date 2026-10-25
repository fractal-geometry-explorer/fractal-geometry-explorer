import numpy as np, sys, json
from PIL import Image
from scipy import ndimage
im=np.array(Image.open(sys.argv[1]).convert('L')).astype(float)
dark=ndimage.binary_opening(im<100, structure=np.ones((2,2)))
X=[float(v) for v in sys.argv[2].split(',')]; Y=[float(v) for v in sys.argv[3].split(',')]
def frac(x0,y0,x1,y1):
    t=np.linspace(0.25,0.75,9); xs=(x0+(x1-x0)*t).round().astype(int); ys=(y0+(y1-y0)*t).round().astype(int)
    # allow +-2 px tolerance perpendicular
    hit=0
    for x,y in zip(xs,ys):
        win=dark[max(0,y-2):y+3, max(0,x-2):x+3]
        hit+=win.any()
    return hit/len(t)
edges=set()
for i in range(len(X)):
    for j in range(len(Y)):
        if i+1<len(X) and frac(X[i],Y[j],X[i+1],Y[j])>0.99: edges.add(((i,j),(i+1,j)))
        if j+1<len(Y) and frac(X[i],Y[j],X[i],Y[j+1])>0.99: edges.add(((i,j),(i,j+1)))
adj={}
for a,b in edges: adj.setdefault(a,[]).append(b); adj.setdefault(b,[]).append(a)
deg={k:len(v) for k,v in adj.items()}
ends=[k for k,v in deg.items() if v==1]; bad=[k for k,v in deg.items() if v>2]
print('edges',len(edges),'ends',ends,'deg>2',bad)
# trace from each end
paths=[]
seen=set()
for e in ends:
    if e in seen: continue
    p=[e]; seen.add(e); prev=None; cur=e
    while True:
        nxt=[n for n in adj[cur] if n!=prev]
        if not nxt: break
        prev,cur=cur,nxt[0]; p.append(cur); seen.add(cur)
        if deg[cur]!=2: break
    paths.append(p)
for p in paths:
    mv=''.join({(1,0):'R',(-1,0):'L',(0,1):'D',(0,-1):'U'}[(b[0]-a[0],b[1]-a[1])] for a,b in zip(p,p[1:]))
    print(len(mv), p[0], p[-1], mv)
json.dump([[list(n) for n in p] for p in paths], open(sys.argv[4],'w'))
