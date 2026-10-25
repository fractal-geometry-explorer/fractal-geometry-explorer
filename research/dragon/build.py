t = open('code/dragon/template.html').read()
css = open('code/quad/base.css').read().replace('/* Layout: four plate sections in book order (49 with its family and critical-angle studies, 51, 53, 54–55), each a printed figure beside its caption, controls and numbers; a sticky index on top. One column under 900px. */',
  '/* Layout: Plate 66 square sweep (with the efficiency note), Plate 67 trapezoid sweep, the dragon and alternate dragons, and the twindragon, each a printed figure beside its caption, controls and numbers; a sticky index on top. One column under 900px. */')
script = open('code/dragon/core.js').read() + '\n' + open('code/dragon/ui.js').read()
out = t.replace('/*BASECSS*/', css).replace('/*SCRIPT*/', script)
open('dragon-sweeps.html', 'w').write(out)
pre = open('preview_kp.html').read()
open('preview_ds.html', 'w').write(pre[:pre.index('<body>') + 6] + out + '</body></html>')
print(len(out))
