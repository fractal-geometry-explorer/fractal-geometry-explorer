import numpy as np, json
MV="DLUULDLDRDLLDRDLDLUULDLULURRULUULURRULULDLUULDLDRDLLDRDLDLUULDLDRDLLDRDRURDDRURDRDLLDRDLDLUULDLLDLUULDLDRDLLDRDRURDDRURDRDLLDRDLDLUULDLDRDLLDRDLDLUULDLULURRULUULURRULULD"
dmap={'R':0,'U':1,'L':2,'D':3}
def turns(dirs): return [((b-a+1)%4)-1 for a,b in zip(dirs,dirs[1:])]   # -1 right? values in {-1,0,1,2}
T=turns([dmap[c] for c in MV])
G8=[0,1,0,3,3,0,1,0]                     # R U R D D R U R
G18=None
def build(gen_dirs, n):
    seq=[0]
    for _ in range(n):
        seq=[(d+g)%4 for d in seq for g in gen_dirs]
    return seq
def island(gen_dirs,n):
    side=build(gen_dirs,n)
    # square initiator traversed counterclockwise: sides R,U,L,D
    return [ (d+k)%4 for k in range(4) for d in side ]
def find(T, C, cyclic=False):
    Cs=C+C[:len(T)] if cyclic else C
    hits=[]
    variants={'fwd':T,'mirror':[-t if t in(1,-1) else t for t in T],
              'rev':[-t if t in(1,-1) else t for t in T[::-1]], 'rev-mirror':T[::-1]}
    s=' '.join(map(str,Cs))
    for name,v in variants.items():
        pat=' '.join(map(str,v))
        i=s.find(pat)
        if i>=0: hits.append((name, s[:i].count(' ')))
    return hits
print('turn values present', sorted(set(T)))
for n in (3,4):
    C=turns(build(G8,n)); print('8-seg curve level',n,len(C)+1,'moves:',find(T,C))
    C=turns(island(G8,n)); print('8-seg island level',n,':',find(T,C,cyclic=True))
