import sys; sys.path.insert(0,'.')
import numpy as np
from sausage import sausage_areas, level, OPTS
eps=np.geomspace(0.0016,0.064,11)
res={}
for n in (5,6):
    c=level(n,OPTS)
    A=np.array(sausage_areas(c,eps,h=0.0003)); res[n]=A/(2*eps)
    loc=-np.diff(np.log(res[n]))/np.diff(np.log(eps))
    print('n',n,'L',' '.join(f'{v:.1f}' for v in res[n]))
    print('    local D', ' '.join(f'{1+v:.2f}' for v in loc))
print('eps',' '.join(f'{e:.4f}' for e in eps))
