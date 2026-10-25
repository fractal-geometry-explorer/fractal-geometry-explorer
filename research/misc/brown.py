import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
def midpoint_path(K, rng):
    # Mandelbrot p.234-235: random initiator with mean-square length 1, then isotropic Gaussian midpoint
    # displacements whose mean square halves each pass (Levy construction). E|B(t)|^2 = t.
    N=2**K; z=np.zeros(N+1,complex)
    z[N]=(rng.normal()+1j*rng.normal())*np.sqrt(0.5)
    step=N; dt=1.0
    while step>1:
        h=step//2
        mids=(z[0:N:step]+z[step:N+1:step])/2
        sd=np.sqrt(dt/8)            # per-coordinate sd of a bridge midpoint, diffusion E|dB|^2 = dt
        z[h:N:step]=mids+(rng.normal(size=mids.size)+1j*rng.normal(size=mids.size))*sd
        step=h; dt/=2
    return z
def areas(c, eps_list, h):
    pad=max(eps_list)+0.01
    x0=c.real.min()-pad; y1=c.imag.max()+pad
    W=int((c.real.max()+pad-x0)/h)+1; H=int((y1-(c.imag.min()-pad))/h)+1
    img=Image.new('1',(W,H),1); d=ImageDraw.Draw(img)
    d.line([((z.real-x0)/h,(y1-z.imag)/h) for z in c], fill=0, width=1)
    dist=ndimage.distance_transform_edt(np.array(img))*h
    return np.array([(dist<=e).sum()*h*h for e in eps_list])
eps=np.geomspace(0.002,0.12,13)
if __name__ != "__main__": pass
if __name__=="__main__":
    for seed in (1,2,3):
        rng=np.random.default_rng(seed); z=midpoint_path(18,rng)
        print(f'seed {seed}: extent x {np.ptp(z.real):.2f} y {np.ptp(z.imag):.2f}  |B(1)|={abs(z[-1]):.2f}')
        for n in (6,7,8,9):
            c=z[::4**(9-n)]
            A=areas(c,eps,h=0.0005); L=A/(2*eps)
            m=eps<=0.031
            D=1-np.polyfit(np.log(eps[m]),np.log(L[m]),1)[0]
            wien=A*np.log(1/(2*eps**2))/np.pi
            print(f'  stage {n} ({4**n} steps): fitted D {D:.3f}   A*ln(1/2e^2)/pi at e=.002,.0078,.031: {wien[0]:.2f} {wien[4]:.2f} {wien[8]:.2f}')
    print('Wiener-law D (2 - 2/ln(1/(2e^2))) at e=.002, .01, .03:', [round(2-2/np.log(1/(2*e*e)),3) for e in (0.002,0.01,0.03)])
