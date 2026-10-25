import sys, io, contextlib; sys.path.insert(0,'.')
with contextlib.redirect_stdout(io.StringIO()):
    from variants2 import *
c=level(3,OPTS)
for beta in (0,-0.5,-1):
    bv=beta_vertices(c,beta,8)
    print('beta',beta,' '.join(f'ch{er}:{score_er(bv,er):.4f}' for er in (0.0015,0.002,0.0025,0.003)))
