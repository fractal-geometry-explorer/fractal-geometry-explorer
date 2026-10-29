import numpy as np, sys, json
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
ink = im < 150
d = json.load(open('data_log.json'))
px = json.load(open('points_px.json'))
# approximate px-space line through refined marker centres per series, then sample actual drawn line
spans = {'australia':(1770,3640),'safrica':(1855,3245),'german':(1440,2860),'britain':(430,3240),'portugal':(1300,3030)}
out={}
for name,(xa,xb) in spans.items():
    P = np.array([(a,b) for a,b,_ in px[name]])
    bb,aa = np.polyfit(P[:,0],P[:,1],1)
    xs=[]; ys=[]
    markers = P
    for x in range(xa, xb, 4):
        yc = aa+bb*x
        if any(abs(x-mx)<45 for mx,my in markers): continue
        # avoid gridlines
        if any(abs(x-g)<25 for g in (570,1215,1866,2520,3163,3800)): continue
        w0 = int(yc-28)
        seg = ink[w0:w0+57, x]
        idx = np.nonzero(seg)[0]
        if len(idx)==0: continue
        # keep only if a single compact run
        runs=[]; start=None
        for i in range(57):
            if seg[i] and start is None: start=i
            if (not seg[i] or i==56) and start is not None:
                end=i if not seg[i] else 57
                runs.append((start,end)); start=None
        runs=[r for r in runs if 4<=r[1]-r[0]<=20]
        if len(runs)!=1: continue
        r=runs[0]
        xs.append(x); ys.append(w0+(r[0]+r[1]-1)/2)
    xs=np.array(xs); ys=np.array(ys)
    b,a = np.polyfit(xs,ys,1)
    for _ in range(3):
        res = ys-(a+b*xs); keep = np.abs(res)<2.5*res.std()
        xs,ys = xs[keep],ys[keep]
        b,a = np.polyfit(xs,ys,1)
    out[name]=dict(a=a,b=b,n=len(xs),resid=float(np.abs(ys-(a+b*xs)).mean()))
    print(name,'y = %.2f + %.5f x'%(a,b),'n',len(xs),'resid %.2f'%out[name]['resid'])
# convert printed-line slope to data space: use calibration fits (re-derive quickly)
# vertical gridline x at y: from calibrate run (hardcode)
vf = [(562.71,0.00487),(1209.36,0.00356),(1869.29,-0.00230),(2525.79,-0.00460),(3162.88,-0.00021),(3808.09,-0.00914)]
vv = [1.0,1.5,2.0,2.5,3.0,3.5]
hf = [(630.83,0.00680,4.0),(1313.72,0.00012,3.5),(1922.19,0.00948,3.0)]
def tolog(pxx,pyy):
    X=[a+b*pyy for a,b in vf]
    lx=float(np.interp(pxx,X,vv))
    Y=[a+b*pxx for a,b,v in hf]
    if pyy<Y[0]: ly=4.0+(Y[0]-pyy)*0.5/(Y[1]-Y[0])
    elif pyy>Y[2]: ly=3.0-(pyy-Y[2])*0.5/(Y[2]-Y[1])
    else: ly=float(np.interp(pyy,Y,[4.0,3.5,3.0]))
    return lx,ly
printed={}
for name,(xa,xb) in spans.items():
    a,b = out[name]['a'], out[name]['b']
    p1 = tolog(xa, a+b*xa); p2 = tolog(xb, a+b*xb)
    slope = (p2[1]-p1[1])/(p2[0]-p1[0])
    inter = p1[1]-slope*p1[0]
    printed[name]=dict(slope=round(slope,4), intercept=round(inter,4), D=round(1-slope,4),
                       x1=round(p1[0],4), x2=round(p2[0],4))
    print(name,'printed slope %.4f D %.4f over [%.2f, %.2f]'%(slope,1-slope,p1[0],p2[0]))
d['printed']=printed
json.dump(d, open('data_log.json','w'), indent=1)
