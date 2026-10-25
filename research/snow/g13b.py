exec(open('snow.py').read().split('random.seed')[0])
from scipy.ndimage import distance_transform_edt
from PIL import Image
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
OF = tuple(c ^ 3 for c in O[::-1])
# expanded generator: leg 5 of S replaced by F with leg-5 code (2)
def expand_leg(G, codes, leg, H, hcodes):
    a, b, c = G[leg], G[leg + 1], codes[leg]
    m, rev = c & 1, 1 if c >= 2 else 0
    g = np.conj(H) if m else H
    if rev: a2, b2 = b, a
    else: a2, b2 = a, b
    P = a2 + (b2 - a2) * g
    sub = []
    for k in range(len(H) - 1):
        cc = hcodes[k]; cm = m ^ (cc & 1); cr = (1 if cc >= 2 else 0)
        sub.append(((P[k + 1], P[k]) if cr else (P[k], P[k + 1]), cm | ((cr ^ rev) << 1)))
    if rev: sub = sub[::-1]
    # rebuild as (start, end, code) where code expressed relative to traversal
    pts = list(G[:leg + 1]); cods = list(codes[:leg])
    for (x, y), cc in sub:
        # traversal goes from the point where we are; if the child is reversed (cr) its chord is (y->x) traversal x->y reversed
        pts.append(None); cods.append(cc)
    return sub
sub = expand_leg(S, O, 4, F, OF)
for (x, y), cc in sub: print(np.round(x, 3), np.round(y, 3), cc)
