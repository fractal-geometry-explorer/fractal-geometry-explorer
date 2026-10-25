exec(open('gtree3.py').read().split("best = []")[0])
names = ['SA', 'AB', 'BE', 'AC', 'CD', 'CF', 'FG']
for k, ((p, q), nm) in enumerate(zip(links, names)):
    row = []
    for c in range(4):
        cp = place_links(links, p, q, c)
        L = [seglat(a, b)[0] for a, b in cp]
        hits = ''.join('1' if e in inkset else '0' for e in L)
        row.append((c, hits))
    print(nm, row)
