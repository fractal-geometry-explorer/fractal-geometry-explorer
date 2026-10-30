import numpy as np, sys, json
from PIL import Image, ImageDraw
img = Image.open(sys.argv[1]).convert('L')
im = np.asarray(img)
ink = (im < 128).astype(np.float32)
def corr(a,k):
    kk=np.zeros_like(a); kh,kw=k.shape
    kk[:kh,:kw]=k; kk=np.roll(np.roll(kk,-(kh//2),0),-(kw//2),1)
    return np.fft.irfft2(np.fft.rfft2(a)*np.conj(np.fft.rfft2(kk)),s=a.shape)
yy,xx=np.mgrid[-30:31,-30:31]; rr=np.hypot(yy,xx)
def mk(lo,hi):
    m=((rr>=lo)&(rr<hi)).astype(np.float32); return m/m.sum()
x0,x1,y0,y1 = 400, 4150, 150, 2500
sub = ink[y0:y1, x0:x1]
ringscore = corr(sub, mk(9,14)) - corr(sub, mk(0,6))
discscore = corr(sub, mk(0,13))
from scipy.ndimage import maximum_filter
# circle dots: disc score very high, restricted to circle band
mx = maximum_filter(discscore, size=24)
cands = np.argwhere((discscore==mx)&(discscore>0.80))
dots=[]
for y,x in cands:
    ax,ay = x+x0, y+y0
    if (ay<1000) or (ax>3150 and ay<1300):
        dots.append((int(ax),int(ay),float(discscore[y,x])))
dots.sort()
seeds = {
 'australia': [(1856,463),(2340,520),(2725,560),(3115,630),(3555,718)],
 'safrica':   [(1855,1140),(2290,1145),(2733,1150),(3122,1155),(3440,1160)],
 'german':    [(1383,1337),(1651,1342),(1875,1390),(2210,1415),(2212,1462),(2487,1443),(2484,1505),(2770,1490),(2772,1545)],
 'britain':   [(573,1333),(1182,1540),(1836,1713),(2227,1842),(2764,1962),(3087,1960)],
 'portugal':  [(1205,2090),(1454,2132),(1833,2140),(2213,2246),(2378,2272),(2786,2292)],
}
refined = {}
for name, pts in seeds.items():
    out=[]
    for sx,sy in pts:
        wy, wx = sy-y0, sx-x0
        w = ringscore[wy-30:wy+31, wx-30:wx+31]
        dy,dx = np.unravel_index(np.argmax(w), w.shape)
        out.append((int(sx-30+dx), int(sy-30+dy), float(w[dy,dx])))
    refined[name]=out
refined['circle']=dots
json.dump(refined, open('points_px.json','w'), indent=1)
rgb = Image.open(sys.argv[1]).convert('RGB')
d = ImageDraw.Draw(rgb)
colors = {'australia':(220,0,0),'circle':(0,0,220),'safrica':(0,150,0),'german':(200,120,0),'britain':(160,0,160),'portugal':(0,160,160)}
for name,pts in refined.items():
    for i,(cx,cy,s) in enumerate(pts):
        d.ellipse((cx-22,cy-22,cx+22,cy+22), outline=colors[name], width=4)
        d.text((cx+24,cy-34), f'{name[:2]}{i}:{s:.2f}', fill=colors[name])
        print(name,i,cx,cy,round(s,2))
rgb.crop((300,100,4250,2600)).resize((1975,1250)).save('overlay2.png')
