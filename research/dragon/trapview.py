exec(open('trapfit.py').read().split("if __name__")[0])
import sys
n = int(sys.argv[1]); sc = float(sys.argv[2]); x0 = float(sys.argv[3]); y0 = float(sys.argv[4])
m = draw(chev(n), x0, y0, sc)
plate = np.array(Image.open(FG + 'p67_big.png').convert('RGB')).astype(float)
ov = plate.copy()
ov[m > 0.5] = ov[m > 0.5] * 0.3 + np.array([255, 0, 0]) * 0.7
side = np.concatenate([plate, 255 - 215 * m[..., None].repeat(3, 2), ov], 1)
Image.fromarray(side.astype(np.uint8)).resize((side.shape[1] // 2, side.shape[0] // 2)).save(FG + 'trap_cmp.png')
