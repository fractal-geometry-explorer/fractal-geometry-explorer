import json, numpy as np, sys
sys.path.insert(0,'.')
from brown import areas
xs,ys=json.load(open('seed7_full.json')); z=np.array(xs)+1j*np.array(ys)
eps=0.004*(0.15/0.004)**(np.arange(13)/12)
for n in (7,9):
    c=z[::4**(9-n)]
    L=areas(c,eps,h=0.0004)/(2*eps)
    m=eps<=0.031
    print(f'stage {n}: fitted D {1-np.polyfit(np.log(eps[m]),np.log(L[m]),1)[0]:.3f}  L:', ' '.join(f'{v:.2f}' for v in L))
