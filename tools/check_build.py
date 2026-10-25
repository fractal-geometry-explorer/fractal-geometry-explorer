#!/usr/bin/env python3
"""Check that building from src/ reproduces the published artifacts byte for byte.

  python3 tools/check_build.py path/to/published/folder

The folder holds the published pages as <slug>.html (for example, saved with the Artifact read action).
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build

pub = Path(sys.argv[1])
bad = 0
for p in build.load_manifest():
    f = pub / f"{p['slug']}.html"
    if not f.exists():
        print('skip', p['slug']); continue
    same = build.build_page(p, rewrite=False) == f.read_text()
    bad += not same
    print('same' if same else 'DIFFERENT', p['slug'])
sys.exit(1 if bad else 0)
