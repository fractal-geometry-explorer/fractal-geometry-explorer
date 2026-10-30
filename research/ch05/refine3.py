import numpy as np, sys, json
from PIL import Image, ImageDraw
from scipy.ndimage import label, binary_closing
img = Image.open(sys.argv[1]).convert('L')
im = np.asarray(img)
ink = im < 150
seeds = {
 'australia': [(1860,468),(2372,526),(2758,572),(3168,612)],
 'safrica':   [(1864,1133),(2300,1141),(2768,1153),(3163,1160)],
 'german':    [(1378,1340),(1650,1345),(1870,1388),(2207,1412),(2209,1462),(2480,1437),(2482,1505),(2772,1483),(2774,1546)],
 'britain':   [(585,1340),(1190,1537),(1866,1707),(2267,1852),(2810,1972),(3133,1972)],
 'portugal':  [(1214,2073),(1477,2137),(1838,2142),(2244,2246),(2418,2277),(2831,2298)],
 'odd':       [(3552,716)],
}
circle = [(617,664),(1923,678),(2438,682),(2836,682),(3199,697),(3415,712),(3509,731),(3608,746),(3721,793),(3809,955)]
R=34
refined={}
for name,pts in seeds.items():
    out=[]
    for sx,sy in pts:
        best=[]
        for close in (0,2,3,4):
            w = ink[sy-R:sy+R+1, sx-R:sx+R+1]
            if close: w = binary_closing(w, np.ones((close,close)), border_value=0)
            paper = ~w
            lab,n = label(paper)
            best=[]
            for i in range(1,n+1):
                ys,xs = np.nonzero(lab==i)
                if ys.min()==0 or xs.min()==0 or ys.max()==2*R or xs.max()==2*R: continue
                a=len(ys)
                if 25<=a<=900: best.append((a, xs.mean(), ys.mean()))
            if best: break
        if not best:
            out.append((float(sx),float(sy),0)); print('MISS',name,sx,sy); continue
        best.sort(key=lambda t:(t[1]-R)**2+(t[2]-R)**2)
        base=best[0]
        grp=[b for b in best if abs(b[1]-base[1])<16 and abs(b[2]-base[2])<30]
        A=sum(b[0] for b in grp)
        cx=sum(b[0]*b[1] for b in grp)/A; cy=sum(b[0]*b[2] for b in grp)/A
        out.append((float(sx-R+cx), float(sy-R+cy), A))
        print(name, sx, sy, '->', round(sx-R+cx,1), round(sy-R+cy,1), 'A', A, 'holes', len(grp))
    refined[name]=out
out=[]
for sx,sy in circle:
    w = ink[sy-26:sy+27, sx-26:sx+27]
    lab,n = label(w)
    i = lab[26,26]
    ys,xs = np.nonzero(lab==i)
    # weight by darkness? plain centroid of blob, but blob includes the line: restrict to within 20px of seed
    keep = (abs(xs-26)<22)&(abs(ys-26)<22)
    out.append((float(sx-26+xs[keep].mean()), float(sy-26+ys[keep].mean()), int(keep.sum())))
refined['circle']=out
json.dump(refined, open('points_px.json','w'), indent=1)
rgb = Image.open(sys.argv[1]).convert('RGB')
d = ImageDraw.Draw(rgb)
colors = {'australia':(220,0,0),'circle':(0,0,220),'safrica':(0,150,0),'german':(200,120,0),'britain':(160,0,160),'portugal':(0,160,160),'odd':(255,0,255)}
for name,pts in refined.items():
    for cx,cy,s in pts:
        d.line((cx-26,cy,cx+26,cy), fill=colors[name], width=2)
        d.line((cx,cy-26,cx,cy+26), fill=colors[name], width=2)
rgb.crop((300,100,4250,2600)).resize((2370,1500)).save('overlay4.png')
print('ok')
