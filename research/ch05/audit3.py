import numpy as np, sys
from PIL import Image, ImageDraw
img = Image.open(sys.argv[1]).convert('L')
im = np.asarray(img)
ink = (im < 128).astype(np.float32)
x0,x1,y0,y1 = 400, 4100, 150, 2500
sub = ink[y0:y1, x0:x1]
def corr(a,k):
    kk=np.zeros_like(a); kh,kw=k.shape
    kk[:kh,:kw]=k; kk=np.roll(np.roll(kk,-(kh//2),0),-(kw//2),1)
    return np.fft.irfft2(np.fft.rfft2(a)*np.conj(np.fft.rfft2(kk)),s=a.shape)
yy,xx=np.mgrid[-34:35,-34:35]; rr=np.hypot(yy,xx)
def mk(lo,hi):
    m=((rr>=lo)&(rr<hi)).astype(np.float32); return m/m.sum()
ringscore = corr(sub, mk(9,14)) - corr(sub, mk(0,6)) - 1.2*corr(sub, mk(17,28))
dotscore  = corr(sub, mk(0,13)) - 1.5*corr(sub, mk(17,26))
from scipy.ndimage import maximum_filter
def maxima(score,thr,sep=26):
    mx=maximum_filter(score,size=sep)
    return sorted([(int(x+x0),int(y+y0),float(score[y,x])) for y,x in np.argwhere((score==mx)&(score>thr))])
rings=maxima(ringscore,0.30)
dots=maxima(dotscore,0.40)
np.save('cand_rings.npy', np.array(rings)); np.save('cand_dots.npy', np.array(dots))
print(len(rings),'rings',len(dots),'dots')
def sheet(cands, fname):
    n=len(cands); cols=10; rows=max(1,(n+cols-1)//cols); cell=100
    S=Image.new('RGB',(cols*cell,rows*cell),(255,255,255))
    d=ImageDraw.Draw(S)
    for i,(cx,cy,s) in enumerate(cands):
        c=img.crop((cx-40,cy-40,cx+40,cy+40)).resize((cell-20,cell-20)).convert('RGB')
        X=(i%cols)*cell; Y=(i//cols)*cell
        S.paste(c,(X+10,Y+10))
        d.text((X+4,Y+1), f'{i} {s:.2f}', fill=(255,0,0))
    S.save(fname)
sheet(rings,'sheet_rings.png'); sheet(dots,'sheet_dots.png')
