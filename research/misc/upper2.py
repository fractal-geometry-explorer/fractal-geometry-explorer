import numpy as np, json, sys
sys.argv=['x']
exec(open('upper.py').read().split('# search translation')[0])
region=np.zeros_like(dark); region[60:1400, 250:2160]=True
d2=ndimage.distance_transform_edt(~(dark&region))
seg=slice(8, 8*170+1)      # level-4 moves covering level-3 moves 1..169
xa,ya=x4[seg],y4[seg]
samp=np.linspace(0,len(xa)-1,1500).astype(int)
def score(dx,dy):
    xx=(xa[samp]+dx).round().astype(int); yy=(ya[samp]+dy).round().astype(int)
    if xx.min()<0 or yy.min()<0 or xx.max()>=d2.shape[1] or yy.max()>=d2.shape[0]: return 1e9
    return np.mean(np.minimum(d2[yy,xx],40))
best=None
for dx in range(-1400,400,6):
    for dy in range(-1500,0,6):
        s=score(dx,dy)
        if best is None or s<best[0]: best=(s,dx,dy)
s,a,b=best
for dx in range(a-6,a+7):
    for dy in range(b-6,b+7):
        s=score(dx,dy)
        if s<best[0]: best=(s,dx,dy)
print('best', best)
s,dx,dy=best
# how far does the match extend? score level-4 moves in windows along the whole curve
def win_score(i0,i1):
    xx=(x4[i0:i1]+dx).round().astype(int); yy=(y4[i0:i1]+dy).round().astype(int)
    ok=(xx>=0)&(xx<d2.shape[1])&(yy>=0)&(yy<d2.shape[0])
    if ok.mean()<1: return 99
    return float(np.mean(np.minimum(d2[yy,xx],40)))
ws=[(i, round(win_score(i,i+128),1)) for i in range(0,4096,128)]
print('per-window mean distance (px) along the level-4 curve:', ws)
img=Image.open('../fgn/p32hi-048.png').convert('RGB'); dd=ImageDraw.Draw(img)
good=[i for i,v in ws if v<3]
lo,hi=min(good),max(good)+128
dd.line([(a+dx,b+dy) for a,b in zip(x4[lo:hi+1],y4[lo:hi+1])], fill=(230,40,40), width=2)
img.crop((150,0,2190,1450)).resize((816,580)).save('../fgn/upper_overlay2.png')
json.dump({'dx':dx,'dy':dy,'lo':lo,'hi':hi}, open('p32_upper.json','w'))
print('matched level-4 move range', lo, hi)
