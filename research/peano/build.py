t = open('code/peano/template.html').read()
css = open('code/quad/base.css').read().replace('/* Layout: four plate sections in book order (49 with its family and critical-angle studies, 51, 53, 54–55), each a printed figure beside its caption, controls and numbers; a sticky index on top. One column under 900px. */',
  '/* Layout: Plate 63 (island, the flipping point, the sweep), Plates 64–65 (two-interval sweeps) and the efficiency demo, each a printed figure beside its caption, controls and numbers; a sticky index on top. One column under 900px. */')
out = t.replace('/*BASECSS*/', css).replace('/*SCRIPT*/', open('code/peano/script.js').read())
open('peano-sweeps.html', 'w').write(out)
pre = open('preview_kp.html').read()
open('preview_ps.html', 'w').write(pre[:pre.index('<body>') + 6] + out + '</body></html>')
print(len(out))
