import numpy as np, sys, json
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
ink = im < 150
# --- vertical gridlines: fit x(y) ---
vnom = [570.6, 1215.0, 1866.0, 2519.5, 3163.0, 3800.5]
vvals = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5]
vfits=[]
for nx in vnom:
    xs=[]; ys=[]
    for y in range(220, 2420, 8):
        seg = ink[y, int(nx)-18:int(nx)+19]
        if seg.sum()>=3 and seg.sum()<=14:
            idx = np.nonzero(seg)[0]
            if idx.max()-idx.min() < 15:
                xs.append(int(nx)-18+idx.mean()); ys.append(y)
    b,a = np.polyfit(ys,xs,1)
    vfits.append((a,b,len(xs)))
    print('v',round(nx,1),'x = %.2f + %.5f y'%(a,b),'n',len(xs))
# --- horizontal gridlines: fit y(x) ---
hspec = [(647, 600, 3780, 4.0), (1311, 440, 4080, 3.5), (1946, 440, 4080, 3.0)]
hfits=[]
for ny,xa,xb,val in hspec:
    xs=[]; ys=[]
    for x in range(xa, xb, 8):
        seg = ink[ny-18:ny+19, x]
        if 3<=seg.sum()<=14:
            idx=np.nonzero(seg)[0]
            if idx.max()-idx.min()<15:
                ys.append(ny-18+idx.mean()); xs.append(x)
    b,a = np.polyfit(xs,ys,1)
    hfits.append((a,b,val,len(xs)))
    print('h',val,'y = %.2f + %.5f x'%(a,b),'n',len(xs))
pts = json.load(open('points_px.json'))
def tologx(px,py):
    X = [a+b*py for a,b,_ in vfits]
    return float(np.interp(px, X, vvals))  # clamped? need extrapolation
def tology(px,py):
    Y = [a+b*px for a,b,v,_ in hfits]
    V = [4.0,3.5,3.0]
    # Y increasing, V decreasing
    if py < Y[0]: return 4.0 + (Y[0]-py)*0.5/(Y[1]-Y[0])
    if py > Y[2]: return 3.0 - (py-Y[2])*0.5/(Y[2]-Y[1])
    return float(np.interp(py, Y, [4.0,3.5,3.0]))
data={}
for name,p in pts.items():
    out=[]
    for px,py,_ in p:
        lx = tologx(px,py); ly = tology(px,py)
        out.append((round(lx,4), round(ly,4)))
    data[name]=out
for name,o in data.items():
    print(name, o)
# least squares per line series
fits={}
for name in ('australia','safrica','german','britain','portugal'):
    arr=np.array(data[name]); 
    b,a = np.polyfit(arr[:,0], arr[:,1], 1)
    res = arr[:,1] - (a+b*arr[:,0])
    fits[name]=dict(slope=round(b,4), intercept=round(a,4), D=round(1-b,4), rms=round(float(np.sqrt((res**2).mean())),4))
    print(name, fits[name])
json.dump({'points':data,'fits':fits}, open('data_log.json','w'), indent=1)
