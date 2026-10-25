# Fractal Geometry Explorer

An integrated website of interactive reconstructions of every plate and main concept in Benoit B. Mandelbrot's *The Fractal Geometry of Nature* (W. H. Freeman, 1982, updated printing). Every figure is computed from the rules in the book's captions and checked against the scanned plate.

## Read first, every session

1. `TRACKER.md`: what exists, what's next, and each plate's kind (exact, random, render, data, art).
2. `DECISIONS.md`: what earlier sessions found. Don't redo a decoded plate, and don't contradict a recorded finding without new evidence from the scan.
3. `docs/plate-procedure.md`: how to decode a plate and build its page.

## The book

- **The scan isn't in this repository.** Never commit the PDF, page images or crops. `scans/` is git-ignored for local use. If a session needs the book, ask the user to attach the PDF.
- **Page mapping:** book page = PDF page − 16 up to page 276. Then come the colour plates C1–C16, and after them book page = PDF page − 32.
- **Plates are numbered by their page.** Captions often sit on the facing page.
- **Copyright.** The book is in copyright. Pages paraphrase and keep quotations short. No scans or traced art appear on the site.

## Layout

```
src/shared/base.css        shared style: colour tokens, dark mode, layout, controls
src/pages.json             manifest: slug, title, plates, chapter, kind, scripts
src/pages/<slug>/          template.html + scripts (or page.html for older single-file pages)
tools/build.py             builds site/ from src/  (python3 tools/build.py)
tools/check_build.py       confirms the sources reproduce the published pages
tests/smoke.cjs            Playwright smoke test of every built page
site/                      build output, deployed as the website
.github/workflows/pages.yml rebuilds site/ and publishes it to GitHub Pages on every merge to main
research/                  analysis scripts from earlier sessions (reference only; paths are stale)
```

The shared JavaScript library doesn't exist yet. Pages currently carry their own copies of the canvas, zoom and control code. Extracting it is the first task in `TRACKER.md` ("Foundation"). Until it is done, copy from the most recent page, `src/pages/snow-sweeps/`.

## Commands

- **Build:** `python3 tools/build.py`
- **Test:** `node tests/smoke.cjs`. Playwright is preinstalled in Claude's cloud sessions; elsewhere run `npm i -D playwright` first.
- **Preview:** open `site/index.html`, or serve the folder with `python3 -m http.server -d site`.

## Page conventions

- **Fonts.** Schibsted Grotesk (display), Newsreader (body), IBM Plex Mono (numbers), from Google Fonts.
- **Colours.** The tokens in `base.css`. Figures are reproductions of printed plates, so their paper (`#ecebe6`) and ink stay the same in light and dark themes.
- **Structure.**
  - Eyebrow (book, chapter, pages), then title, then dek.
  - A sticky section index.
  - One `section.plate` per plate group, with a figure beside the caption, controls, readouts (`dl.read`) and a short `.note`.
  - A source line at the end.
- **Phone.** It must work at 390 px with a 16 px gutter and no horizontal scroll.
- **Interaction.** Zoomable canvases using the snapshot-while-panning pattern, a Fit button, and presets labelled "Show Plate N as printed".
- **Accuracy notes.** Say on the page when something is fitted, reconstructed or a guess. The user values this and checks the plates closely.
- **Writing.** Clear and brief explanations in plain language. Prefer an easy-to-follow explanation to a quote.
- **Rendering pitfalls.** See the "Rendering lessons" section of `DECISIONS.md`.

## Git

- **Branches.** Work on a branch per chapter or task, for example `ch08-cantor` or `foundation-lib`. Never push to `main`; open a pull request, and the user merges.
- **Shared code.** Changes to `src/shared/`, and later the shared library, go in their own small pull request. A chapter that needs a new shared tool builds it in its own folder first.
- **Bookkeeping.** Update `TRACKER.md` and `DECISIONS.md` in the same pull request as the work.
- **Commits.** Keep them small, with messages that say what changed for the reader of the site.

## Working with the user

- They read the book alongside the site and often spot mismatches with the plates; treat those reports as high-value.
- They ask conceptual questions. Answer in the conversation, and offer to add an explanation to the page when it would help other readers.
- Prefer a short status line and the result over a narration of steps.
