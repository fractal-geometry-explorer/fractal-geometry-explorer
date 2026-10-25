#!/usr/bin/env python3
"""Build every page listed in src/pages.json into site/, plus site/index.html.

Every page is a template: src/pages/<slug>/template.html with two placeholders, /*BASECSS*/
(filled with src/shared/base.css, its first "Layout:" comment replaced by the page's own; the
three oldest pages still carry their own stylesheet and have no placeholder) and /*SCRIPT*/
(filled with the page's scripts, concatenated in the order listed; entries with a "/" resolve
from src/, so "shared/draw.js" is the shared library).

The sources are artifact-style fragments without a document skeleton. The site build wraps each
one in <!doctype html> with charset and viewport metas, injects the site shell (a slim bar with
the site name and previous/next plates in book order), and rewrites the claude.ai artifact links
between pages to the site's own pages. site/index.html gets the chapter index and a plate finder
over every plate in TRACKER.md.

Use --as-published to skip all of that and rebuild the bare fragments, for comparing against the
published artifacts (tools/check_build.py does this when given a folder).
"""
import json, re, sys, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, SITE = ROOT / 'src', ROOT / 'site'
LAYOUT_RE = re.compile(r'/\* Layout:[^\n]*\*/')

SHELL_CSS = '''<style>
body { margin: 0; }
/* The hidden attribute must beat the pages' own display rules (.slider, .check, ...). The artifact
   wrapper's stylesheet used to provide this; self-hosted pages carry it themselves. */
[hidden] { display: none !important; }
nav.shell { font-family: var(--f-display); font-size: 12.5px; font-weight: 600; background: var(--page);
  border-bottom: 1px solid var(--rule); display: flex; align-items: center; gap: 6px 18px;
  padding: 9px max(16px, env(safe-area-inset-right, 0px)) 9px max(16px, env(safe-area-inset-left, 0px)); }
nav.shell a { color: var(--text); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
nav.shell a:hover { color: var(--accent); }
nav.shell .home { letter-spacing: 0.07em; text-transform: uppercase; flex: none; }
nav.shell .gap { flex: 1; }
nav.shell .pn { color: var(--muted); font-weight: 500; }
nav.shell .pn b { color: var(--text); font-weight: 600; }
nav.shell a:hover .pn, nav.shell a:hover .pn b { color: var(--accent); }
</style>'''


def load_manifest():
    return json.loads((SRC / 'pages.json').read_text())['pages']


def first_plate_number(p):
    m = re.search(r'\d+', p['plates'])
    return int(m.group(0)) if m else 10_000


def book_order(pages):
    return sorted(pages, key=lambda p: (p['chapter'], first_plate_number(p), p['slug']))


def parse_tracker():
    """Every plate row in TRACKER.md: label, numbers, title, kind, status, slug and part."""
    out, part = [], ''
    for line in (ROOT / 'TRACKER.md').read_text().splitlines():
        if line.startswith('## '):
            part = line[3:].strip()
            continue
        if not line.startswith('|') or part.startswith('Foundation') or part.startswith('Concepts'):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) < 5 or cells[0] in ('Plate', ':-') or set(cells[0]) <= {':', '-', ' '}:
            continue
        if len(cells) == 6:
            label, _page, title, kind, status, slug = cells
        else:
            label, title, kind, status, slug = cells[:5]
        nums = [int(n) for n in re.findall(r'\d+', label)]
        if len(nums) == 2 and '–' in label and nums[1] > nums[0] and nums[1] - nums[0] < 12 and 'p.' not in label:
            nums = list(range(nums[0], nums[1] + 1))
        out.append({'label': label, 'nums': nums, 'c': label.startswith('C'), 'title': title,
                    'kind': kind, 'status': status, 'slug': slug, 'part': part})
    return out


def build_page(p, rewrite=True, pages=None):
    d = SRC / 'pages' / p['slug']
    css = (SRC / 'shared' / 'base.css').read_text()
    css = LAYOUT_RE.sub(lambda m: p['layout_comment'], css, count=1)
    script = '\n'.join(((SRC / s) if '/' in s else (d / s)).read_text() for s in p['scripts'])
    out = (d / 'template.html').read_text().replace('/*BASECSS*/', css).replace('/*SCRIPT*/', script)
    if rewrite and pages:
        for q in pages:
            out = out.replace(q['artifact'], f"{q['slug']}.html")
        # links that opened artifacts in a new tab now stay in the site
        out = re.sub(r'(href="[a-z0-9-]+\.html") target="_blank" rel="noopener"', r'\1', out)
        out = wrap_page(out, p, pages)
    return out


def shell_nav(p, pages):
    order = book_order(pages)
    i = order.index(p)
    parts = ['<nav class="shell" aria-label="Site">',
             '<a class="home" href="index.html">Fractal Geometry Explorer</a>', '<span class="gap"></span>']
    if i > 0:
        q = order[i - 1]
        parts.append(f'<a rel="prev" href="{q["slug"]}.html"><span class="pn">&#8592; <b>{html.escape(q["plates"])}</b></span></a>')
    if i + 1 < len(order):
        q = order[i + 1]
        parts.append(f'<a rel="next" href="{q["slug"]}.html"><span class="pn"><b>{html.escape(q["plates"])}</b> &#8594;</span></a>')
    parts.append('</nav>')
    return ''.join(parts)


def wrap_page(fragment, p, pages):
    """The sources are artifact fragments; the site serves real documents with the shell bar."""
    cut = fragment.index('</style>') + len('</style>')
    head, body = fragment[:cut], fragment[cut:]
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + '\n' + SHELL_CSS + '\n</head>\n<body>\n'
            + shell_nav(p, pages) + body + '\n</body>\n</html>\n')


def index_page(pages):
    plates = parse_tracker()
    # finder data: label, numbers, title, status, slug, part (short)
    short = lambda part: re.sub(r'\s*\(.*\)$', '', part)
    data = [[e['label'], e['nums'], e['title'], e['status'], e['slug'], short(e['part']), 1 if e['c'] else 0]
            for e in plates]
    # sections: book parts in order, with built pages as cards and what remains as a count
    parts = []
    for e in plates:
        if e['part'] not in parts:
            parts.append(e['part'])
    order = book_order(pages)
    bypart = {}
    for part in parts:
        m = re.search(r'chapters (\d+)–(\d+)', part) or re.search(r'chapters (\d+)-(\d+)', part)
        if m:
            lo, hi = int(m.group(1)), int(m.group(2))
            bypart[part] = [p for p in order if lo <= p['chapter'] <= hi]
        else:
            bypart[part] = []
    sections = []
    for part in parts:
        todo = sum(1 for e in plates if e['part'] == part and e['status'] != 'done')
        cards = ''.join(
            f'<a href="{p["slug"]}.html"><b>{html.escape(p["plates"])}</b><span>{html.escape(p["title"])}</span>'
            f'<small>Chapter {p["chapter"]}</small></a>'
            for p in bypart[part])
        left = f'<p class="left">{todo} plate group{"s" if todo != 1 else ""} still to build.</p>' if todo else ''
        if not cards and not left:
            continue
        m = re.search(r'\((chapters[^)]*|pages[^)]*|C1[^)]*)\)', part)
        sections.append(f'<section><h2>{html.escape(short(part))}</h2>'
                        f'<p class="chapters">{html.escape(m.group(1) if m else "")}</p>'
                        f'<div class="cards">{cards}</div>{left}</section>')
    return INDEX_TPL.replace('/*DATA*/', json.dumps(data, ensure_ascii=False)).replace('<!--SECTIONS-->', ''.join(sections))


INDEX_TPL = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Fractal Geometry Explorer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Schibsted+Grotesk:wght@500;600;700;800&display=swap">
<style>
:root {
  --page: #e4e5e1; --text: #1b1d1f; --muted: #595e64; --rule: #c4c7c1; --surface: #f6f6f3; --accent: #285895;
  --f-display: "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif;
  --f-body: "Newsreader", Georgia, "Times New Roman", serif;
  --f-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --page: #111214; --text: #e5e5e1; --muted: #9a9fa6; --rule: #2e3034; --surface: #1d1f22; --accent: #8ab1e6; color-scheme: dark; }
}
:root[data-theme="dark"] { --page: #111214; --text: #e5e5e1; --muted: #9a9fa6; --rule: #2e3034; --surface: #1d1f22; --accent: #8ab1e6; color-scheme: dark; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin: 0; background: var(--page); color: var(--text); font-family: var(--f-display); font-size: 14px; line-height: 1.45; -webkit-font-smoothing: antialiased; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 40px max(16px, env(safe-area-inset-right, 0px)) 72px max(16px, env(safe-area-inset-left, 0px)); display: grid; gap: 36px; }
header { display: grid; gap: 10px; max-width: 820px; }
.eyebrow { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
h1 { margin: 0; font-weight: 800; font-size: clamp(30px, 5.4vw, 54px); line-height: 1.02; letter-spacing: 0.01em; text-transform: uppercase; text-wrap: balance; }
.dek { margin: 0; font-family: var(--f-body); font-size: 19px; line-height: 1.45; max-width: 64ch; }
.finder { display: grid; gap: 8px; max-width: 640px; }
.finder label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.finder input { width: 100%; height: 44px; padding: 0 14px; font: 500 16px/1 var(--f-mono); color: var(--text); background: var(--surface); border: 1px solid var(--rule); }
.finder input:focus { border-color: var(--accent); outline: none; }
#hits { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
#hits li { border: 1px solid var(--rule); background: var(--surface); }
#hits li.todo { opacity: 0.75; }
#hits a, #hits .row { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; padding: 9px 12px; color: var(--text); text-decoration: none; }
#hits a:hover { border-color: var(--text); color: var(--accent); }
#hits b { font-family: var(--f-mono); font-weight: 500; color: var(--accent); flex: none; }
#hits li.todo b { color: var(--muted); }
#hits small { color: var(--muted); margin-left: auto; text-align: right; }
#hits .none { display: block; padding: 9px 12px; color: var(--muted); }
section { display: grid; gap: 14px; border-top: 1px solid var(--rule); padding-top: 24px; }
section h2 { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.chapters { margin: -10px 0 0; font-size: 12px; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
.chapters:empty { display: none; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.cards a { display: grid; gap: 3px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--rule); color: var(--text); text-decoration: none; }
.cards a:hover { border-color: var(--text); }
.cards b { font-family: var(--f-mono); font-weight: 500; font-size: 12.5px; color: var(--accent); }
.cards span { font-weight: 700; font-size: 15px; line-height: 1.25; }
.cards small { font-size: 11.5px; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
.left { margin: 0; font-size: 12.5px; color: var(--muted); }
.source { font-family: var(--f-body); font-size: 15px; color: var(--muted); margin: 0; max-width: 84ch; border-top: 1px solid var(--rule); padding-top: 24px; }
.source i { color: var(--text); }
input:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
</head>
<body>
<div class="wrap">
<header>
  <p class="eyebrow">Benoit B. Mandelbrot &middot; The Fractal Geometry of Nature &middot; W. H. Freeman, 1982</p>
  <h1>Fractal Geometry Explorer</h1>
  <p class="dek">Interactive reconstructions of the book&rsquo;s plates, computed from the rules in the captions &mdash; nothing is traced. Every page rebuilds its plates from the generator up and says so when something is fitted or reconstructed.</p>
</header>
<div class="finder">
  <label for="q">Find a plate</label>
  <input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="A plate number (66, C9) or a word from a caption (dragon, coastline)&hellip;">
  <ul id="hits" hidden></ul>
</div>
<!--SECTIONS-->
<p class="source">Plates are numbered by the page they sit on in <i>The Fractal Geometry of Nature</i> (updated printing). Pages marked &ldquo;still to build&rdquo; are listed in the repository&rsquo;s tracker and arrive chapter by chapter.</p>
</div>
<script>
const PLATES = /*DATA*/;
const q = document.getElementById('q'), hits = document.getElementById('hits');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function find(text) {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  const mC = /^c\\s*(\\d+)$/.exec(t), mN = /^(?:plates?\\s*)?(\\d+)$/.exec(t);
  let rs;
  if (mC) rs = PLATES.filter((p) => p[6] && p[1].includes(+mC[1]));
  else if (mN) rs = PLATES.filter((p) => !p[6] && p[1].includes(+mN[1]));
  else rs = PLATES.filter((p) => (p[0] + ' ' + p[2] + ' ' + p[5]).toLowerCase().includes(t));
  return rs.slice(0, 12);
}
q.addEventListener('input', () => {
  const rs = find(q.value);
  hits.hidden = rs === null;
  if (rs === null) { hits.innerHTML = ''; return; }
  hits.innerHTML = rs.length ? rs.map((p) => {
    const label = esc(/^[\\dC]/.test(p[0]) ? (p[1].length > 1 && !p[6] ? 'Plates ' : p[6] ? 'Plate ' : 'Plate ') + p[0] : p[0]);
    const inner = '<b>' + label + '</b><span>' + esc(p[2]) + '</span><small>' + esc(p[5]) + '</small>';
    return p[3] === 'done' && p[4]
      ? '<li><a href="' + p[4] + '.html">' + inner + '</a></li>'
      : '<li class="todo"><span class="row">' + inner + ' <small>not built yet</small></span></li>';
  }).join('') : '<li class="todo"><span class="none">Nothing in the book&rsquo;s plate list matches.</span></li>';
});
</script>
</body>
</html>
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
