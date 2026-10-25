#!/usr/bin/env python3
"""Build every page listed in src/pages.json into site/, plus site/index.html.

Two kinds of page, for now:
  template  src/pages/<slug>/template.html with two placeholders, /*BASECSS*/ (filled with
            src/shared/base.css, its first "Layout:" comment replaced by the page's own) and
            /*SCRIPT*/ (filled with the page's scripts, concatenated in the order listed).
  single    src/pages/<slug>/page.html, a self-contained page from before the shared stylesheet
            existed. To be moved onto the shared library (see TRACKER.md, "Foundation").

Links between pages are written as claude.ai artifact URLs in the sources; the build rewrites
them to the site's own pages. Use --as-published to skip that and reproduce the artifacts byte
for byte (tools/check_build.py does this).
"""
import json, re, sys, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, SITE = ROOT / 'src', ROOT / 'site'
LAYOUT_RE = re.compile(r'/\* Layout:[^\n]*\*/')


def load_manifest():
    return json.loads((SRC / 'pages.json').read_text())['pages']


def build_page(p, rewrite=True, pages=None):
    d = SRC / 'pages' / p['slug']
    if p['kind'] == 'single':
        out = (d / 'page.html').read_text()
    else:
        css = (SRC / 'shared' / 'base.css').read_text()
        css = LAYOUT_RE.sub(lambda m: p['layout_comment'], css, count=1)
        script = '\n'.join(((SRC / s) if '/' in s else (d / s)).read_text() for s in p['scripts'])
        out = (d / 'template.html').read_text().replace('/*BASECSS*/', css).replace('/*SCRIPT*/', script)
    if rewrite and pages:
        for q in pages:
            out = out.replace(q['artifact'], f"{q['slug']}.html")
        # links that opened artifacts in a new tab now stay in the site
        out = re.sub(r'(href="[a-z0-9-]+\.html") target="_blank" rel="noopener"', r'\1', out)
    return out


def index_page(pages):
    rows = []
    for ch in sorted({p['chapter'] for p in pages}):
        items = ''.join(
            f'<li><a href="{p["slug"]}.html"><b>{html.escape(p["plates"])}</b> {html.escape(p["title"])}</a></li>'
            for p in pages if p['chapter'] == ch)
        rows.append(f'<section><h2>Chapter {ch}</h2><ul>{items}</ul></section>')
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fractal Geometry Explorer</title>
<style>
:root {{ --page:#e4e5e1; --text:#1b1d1f; --muted:#595e64; --rule:#c4c7c1; --surface:#f6f6f3; --accent:#285895; }}
@media (prefers-color-scheme: dark) {{ :root {{ --page:#111214; --text:#e5e5e1; --muted:#9a9fa6; --rule:#2e3034; --surface:#1d1f22; --accent:#8ab1e6; }} }}
body {{ margin:0; background:var(--page); color:var(--text); font:15px/1.5 "Helvetica Neue", Arial, sans-serif; }}
main {{ max-width:880px; margin:0 auto; padding:36px 16px 64px; }}
h1 {{ font-size:clamp(28px,5vw,44px); text-transform:uppercase; margin:0 0 8px; }}
p.dek {{ font-family:Georgia, serif; font-size:18px; max-width:62ch; }}
h2 {{ font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); border-top:1px solid var(--rule); padding-top:16px; }}
ul {{ list-style:none; padding:0; display:grid; gap:8px; }}
a {{ display:block; padding:10px 12px; background:var(--surface); border:1px solid var(--rule); color:var(--text); text-decoration:none; }}
a:hover {{ border-color:var(--text); }} a b {{ color:var(--accent); font-weight:600; margin-right:8px; }}
</style></head><body><main>
<h1>Fractal Geometry Explorer</h1>
<p class="dek">Interactive reconstructions of the plates in Benoit B. Mandelbrot's <i>The Fractal Geometry of Nature</i> (1982), computed from the rules in the captions.</p>
{''.join(rows)}
</main></body></html>
'''


def main():
    pages = load_manifest()
    as_published = '--as-published' in sys.argv
    SITE.mkdir(exist_ok=True)
    for p in pages:
        (SITE / f"{p['slug']}.html").write_text(build_page(p, rewrite=not as_published, pages=pages))
    (SITE / 'index.html').write_text(index_page(pages))
    print(f'built {len(pages)} pages and index.html into {SITE}')


if __name__ == '__main__':
    main()
