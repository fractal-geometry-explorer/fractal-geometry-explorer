#!/usr/bin/env python3
"""Check that the sources reproduce the published pages byte for byte.

  python3 tools/check_build.py
      Rebuild every page and the index in site mode and compare against the committed site/
      folder, which is what .github/workflows/pages.yml publishes. CI runs this.

  python3 tools/check_build.py path/to/published/folder
      Compare the bare fragments (no site shell, artifact links kept) against a folder of
      published pages saved as <slug>.html, for example with the Artifact read action. The
      pages that moved onto the shared library no longer match the pre-foundation artifacts;
      building those byte for byte needs the sources from before the foundation work
      (the import commit, c05f120).
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build

against_site = len(sys.argv) < 2
pub = build.SITE if against_site else Path(sys.argv[1])
pages = build.load_manifest()
bad = 0
for p in pages:
    f = pub / f"{p['slug']}.html"
    if not f.exists():
        print('skip', p['slug']); continue
    same = build.build_page(p, rewrite=against_site, pages=pages) == f.read_text()
    bad += not same
    print('same' if same else 'DIFFERENT', p['slug'])
if against_site:
    same = build.index_page(pages) == (pub / 'index.html').read_text()
    bad += not same
    print('same' if same else 'DIFFERENT', 'index')
sys.exit(1 if bad else 0)
