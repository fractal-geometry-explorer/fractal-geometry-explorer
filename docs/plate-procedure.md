# How to decode a plate and build its page

This is the procedure that produced the first ten pages. Follow it for every plate group. Record what you find in `DECISIONS.md` and the status in `TRACKER.md`.

## 1. Read the plate

1. **Get the PDF.** The book is not in the repository. Ask the user to attach the PDF to the session if it isn't there.
2. **Render the pages.** Use `pdftoppm`, 110 dpi to look and 600 dpi to measure. The scan's page offset is in `TRACKER.md`.
   - `pdftoppm -f P -l P -r 600 -png book.pdf scans/d6`
3. **Read the caption text.** `pdftotext -layout -f P -l P`. OCR mangles symbols, so check them on the image.
4. **Crop the caption box** (the generator and its second stage) at 600 dpi and look at it closely. The second stage is the key evidence. It fixes the orientation code of every piece, and the first stage alone never does.

## 2. Decode the construction

1. **Write the generator's points exactly.** Use lattice coordinates or angles and lengths from the caption. Check that Σ rᴰ = 1 gives the stated D.
2. **Enumerate the candidate decorations,** usually 4 per interval: mirror or not, reversed or not. Score each candidate's second stage against the scan. A good score is the mean distance from sampled points on the candidate polyline to the nearest ink, under 0.5 px at 600 dpi. Keep only exact matches.
3. **Then check the plate itself, not only the caption box.** The two can differ (see Plates 68 and 69).
   - **Fit the transform.** Use Nelder–Mead on the outline mask, or match two known points.
   - **Score agreement by class.** Black, gray and light pixel classes, inside the figure.
   - **Look at a difference image.** Red where the book is dark and we are light, blue for the reverse. It shows systematic errors, such as wrong rules or wrong arc directions, at a glance.
4. **Check the claims numerically:** self-avoidance (no repeated vertices, no proper crossings), tiling (union equals the region, overlaps zero), dimension, area.
5. **Random plates.** Match statistics (dimension, appearance, scaling), not pixels. Expose the seed.
6. **When the book doesn't determine something,** choose the simplest option that fits. Say on the page that it is a reconstruction, and log it in `DECISIONS.md`.

## 3. Build the page

- **One page per plate group,** in `src/pages/<slug>/`, listed in `src/pages.json`. Use the shared stylesheet and library.
- **Page structure.**
  - Eyebrow with chapter and pages, title, a two-to-three-sentence dek.
  - A sticky section index.
  - Per section: plate heading, dimension line, figure, then caption text, controls, readouts and a short note.
  - A source line.
- **Every figure is computed from the rules,** with no traced artwork. Include a "Show Plate N as printed" preset that sets the fitted parameters.
- **Write plainly.** Use short quotes from the book only where the wording matters, and paraphrase the rest. Never put long caption text or scans on the page.
- **Interaction.** Zoomable canvases (pinch, drag, Ctrl/⌘-scroll, Fit button), stage buttons, sliders that redraw within a frame where possible.

## 4. Test

- `python3 tools/build.py && node tests/smoke.cjs`: no script errors, no blank canvases, no horizontal scroll at 390 px.
- Screenshot the presets next to the scan and look at them yourself.
- **Timing.** The default view should draw in under about 300 ms. If a stage is slow, cache, chunk or draw copies through transforms.
- Check phone width and dark mode.

## 5. Finish the session

- Update `TRACKER.md` and `DECISIONS.md`, commit on the chapter branch and open a pull request.
- Summarise for the user what matched, what is a reconstruction, and anything worth their eye.
