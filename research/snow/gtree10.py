exec(open('gtree9.py').read().split("for codes in")[0])
good = []
for codes in itertools.product(range(4), repeat=7):
    s2 = stats(tree_stage(codes, 2))
    if s2[3] == 0 and s2[1] == 49:
        s3 = stats(tree_stage(codes, 3))
        good.append((s3[3], s3[1], codes))
good.sort(); print(len(good), good[:10])
