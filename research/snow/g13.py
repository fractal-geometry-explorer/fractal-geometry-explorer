exec(open('snow.py').read().split('random.seed')[0])
from scipy.ndimage import distance_transform_edt
from PIL import Image
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
OF = tuple(c ^ 3 for c in O[::-1])
target = np.array([0.832+0.292j, 0.499+0.481j, 0.331+0.388j, 0.331+0.192j, 0.668+0.192j, 0.331+0j])
def place(G, a, b, code):
    g = np.conj(G) if code & 1 else G
    if code & 2: g = (1 - g)[::-1]
    return a + (b - a) * g
for name, G in (('S', S), ('F', F)):
    for code in range(4):
        P = place(G, S[4], S[5], code)
        # compare the distinct corner points (drop collinear interior points)
        corners = [P[0]] + [P[k] for k in range(1, len(P) - 1) if abs(np.angle((P[k + 1] - P[k]) / (P[k] - P[k - 1]))) > 1e-6] + [P[-1]]
        err = np.abs(np.array(corners) - target).max() if len(corners) == len(target) else 9
        print(name, code, round(err, 3))
