import sys, numpy as np
sys.path.insert(0,'.')
from sweep import *
from PIL import Image, ImageDraw
OPTS=[1,3,3,3,2,1,3]
c=level(5,OPTS)
print('points', len(c), 'x range', c.real.min(), c.real.max(), 'y range', c.imag.min(), c.imag.max())
# centroid of the visited points (region filled is the snowflake)
cen=c.mean(); print('centroid', cen)
r=np.abs(c-cen); print('max radius', r.max(), 'at angle', np.degrees(np.angle(c[np.argmax(r)]-cen)))
# tips: angles of the 6 farthest directions
ang=np.degrees(np.angle(c-cen)); 
for a0 in range(-180,180,30):
    m=(ang>=a0)&(ang<a0+30)
    if m.any(): print(f'sector {a0:4d}..{a0+30:4d}: max r {r[m].max():.3f}')
W=700; img=Image.new('L',(W,W),255); d=ImageDraw.Draw(img)
sc=W/1.6; ox=W/2-cen.real*sc; oy=W/2+cen.imag*sc
d.line([(ox+z.real*sc, oy-z.imag*sc) for z in level(4,OPTS)], fill=0, width=1)
d.line([(ox, oy), (ox+sc, oy)], fill=128, width=2)
img.save('../fgn/sw_L4.png')
