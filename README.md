# Fractal Geometry Explorer

Interactive reconstructions of the plates in Benoit B. Mandelbrot's *The Fractal Geometry of Nature* (1982). Each figure is computed from the rules in the book's captions and checked against the printed plate.

## Status

Ten pages are built so far, covering plates 31–73 (chapters 5–7) and a page on Brownian motion. See `TRACKER.md` for the full plate list and what comes next.

The site is published at https://fractal-geometry-explorer.github.io/fractal-geometry-explorer/ every time `main` changes.

## Build and preview

```sh
python3 tools/build.py              # writes site/
python3 -m http.server -d site      # then open http://localhost:8000
node tests/smoke.cjs                # needs Playwright
```

## How the work is organised

- `CLAUDE.md`: conventions for anyone, human or Claude, working in this repository.
- `docs/plate-procedure.md`: how a plate is decoded, checked against the scan, and turned into a page.
- `DECISIONS.md`: what each plate turned out to be, and which parts are reconstructions.

The book itself is not included. Quotations are kept short, and no scanned images appear on the site.
