t = open('code/snow/template.html').read()
css = open('code/quad/base.css').read().replace('/* Layout: four plate sections in book order (49 with its family and critical-angle studies, 51, 53, 54–55), each a printed figure beside its caption, controls and numbers; a sticky index on top. One column under 900px. */',
  '/* Layout: snowflake sweeps (68–69), Peano–Gosper trees (70–71), a cascade tree (71), the fudgeflake (72–73) and the quartet (73), each a printed figure beside its caption, controls and numbers; a sticky index on top. One column under 900px. */')
script = open('code/snow/core.js').read() + '\n' + open('code/snow/plumbing.js').read() + open('code/snow/ui_sections.js').read()
out = t.replace('/*BASECSS*/', css).replace('/*SCRIPT*/', script)
open('snow-sweeps.html', 'w').write(out)
pre = open('preview_kp.html').read()
open('preview_sn.html', 'w').write(pre[:pre.index('<body>') + 6] + out + '</body></html>')
print(len(out))
