# Decisions and findings

What each plate turned out to be, how it was checked, and what is a reconstruction rather than a match. Add to this file in every pull request that decodes a plate. Newest chapters go at the bottom of their part.

Conventions used below:
- **Codes.** A generator is a list of points on [0, 1] plus a code per interval. Bit 0 means the copy is mirrored. Bit 1 means the copy is placed from the interval's far end, which also reverses its traversal. So 0 is as drawn, 1 is mirrored, 2 is reversed and 3 is both.
- **"Normalised" form.** Each reversed child (map f, reversed) is rewritten as the forward child f∘X, where X(z) = 1 − z̄. This is not the same curve unless the generator is symmetric (see Plates 68–69).
- **Chevrons.** Plate 64's way of drawing an interval a→b, used again in Plate 67. Let F be the corner the next stage would add and M the midpoint of a b. The interval becomes the quadrilateral a, M + 0.43(F − M), b, M + 0.235(F − M).

## Rendering lessons (all pages)

- **Off-screen points.** Don't clamp points that fall off the screen whenever long edges can cross the view. Clamping moves the edges, which was the "blue triangles out of place" bug. It is safe only when nothing long crosses, as in the Gosper deep zoom.
- **Large paths.** Draw large fills as many small Path2D chunks (about 512–4096 pieces each), not one huge path. Stage 16 chevrons went from 90 s to 0.7 s.
- **Panning.** While panning or zooming, draw a scaled snapshot, then redraw fully about 160 ms after the motion stops.
- **Repeated shapes.** A filled dragon at stage n is 2^K copies of one cached stage-(n − K) dragon, drawn through transforms. Stage 18 went from 3 s to 0.2 s.
- **Seams.** Fill and stroke tiles in the same colour (`solid()`) so tiles that meet edge to edge show no hairline seams.
- **closePath on a large Path2D costs time proportional to the whole path** (measured: 160,000 closed triangles in one path take 86 s to build; the same path left open, 18 ms). For paths that are only filled, skip closePath — `fill()` closes every subpath implicitly and the pixels are identical (unequal-parts' stage colouring went from 11 s to under 1 s). A path that must be closed, because it is stroked, goes in chunks (see "Large paths" and the chevrons).
- **Heavy sliders.** When a control redraw costs more than a frame, draw a coarse pass immediately (a floor on ε) and the full pass about 160 ms after the control settles — the same rhythm as the pan-and-zoom snapshot. Unequal-parts does this for the stage colouring (`nudge()`); controls answer in ~40 ms where they froze for a second.
- **Animated zooms.** Zoom smoothly without rotating, and cap the rate. The user found the spinning tangent zoom dizzying, and saw flicker near the slider's end.
- **Sub-pixel dust.** Rasterising a Cantor dust by coverage (recurse until a piece is under a pixel, then deposit its overlap) leaves horizontal bands wherever the recursion bottoms out one level earlier: the deposited mass jumps by the factor N·r. Deposit a sub-pixel piece of length ℓ with total mass (ℓ/px)^D instead: that is the one weight for which a piece deposits exactly what its N children would (N·r^D = 1), so nothing jumps, and thin cords dim like the dust's D-dimensional density. Plate 81's curtains draw this way; chapters 31–32 (Lévy dusts) will want the same.
- **Touching pieces in random curdling.** When random generators can keep neighbouring cells, the pieces merge and the split stops being countable. Draw each parent's slots (kept in ink, the rest faint) with a hairline gap between them, as chapter 10's record does; chapter 23 will want the same.
- **Layout shift.** Give readouts whose text length changes a fixed height. A caption that changed size moved the graph around.

- **Heavy random rasters: render once, blit while navigating.** Each of brown-relief's figures draws once per parameter change into an offscreen canvas covering a fixed world rectangle; the zoomable view only re-blits that canvas. Pan and zoom never recompute the field, and a random figure magnifies like the printed plate it stands for (its resolution is the simulation grid's).
- **Sub-pixel survivors.** In a nearly saturated random field (disc tremas near D = 1.2), the surviving set's grains are thinner than a pixel and antialiasing blends them invisibly into the covering ink. To show them, build a pixel-center coverage mask while drawing (mark each pixel whose center falls in some disc) and paint the unmarked pixels in an accent colour; the mask costs about the total drawn area in pixel writes.
- **Escape-time rasters recompute per view.** Key the ImageData on (mode, size, view) inside the zoomable's render and deep zooming comes free; the pan-and-zoom snapshot hides the recompute. Render at CSS resolution and scale up — retina-resolution iteration quadruples the cost for little gain.
- **Distance-estimate thresholds live in the dynamical plane.** When the sampled plane is a transform of it (chapter 19's inverted λ-map), convert the pixel size through the transform's derivative, or the estimate paints whole regions as "boundary".
- **Attracting cycles end iteration early.** Find the cycle once per λ (a long warmup — a multiplier of modulus 0.98 needs tens of thousands of steps to settle), then stop any pixel whose orbit comes near the stored cycle point: interior pixels stop in hundreds of steps instead of burning the full budget.
- **Area readouts come from the geometry, not from pixels.** Rasterising sub-pixel needles thickens them, and anti-aliased gray from several needles accumulates past the threshold, so a pixel count understated Plate 323's white area by a third. Measure areas by Monte Carlo against the shapes themselves; keep the raster for texture measures (lacunarity, components), which are observational anyway.
- **Testing page scripts in node: load them as a file, never through `eval(src)`.** Direct eval makes every outer-scope lookup dynamic, which slowed Plate 325's trema generator about 25× and sent two sessions' worth of profiling down the wrong hole. Concatenate the script with its driver into a temp file and `node` that.

## Foundation (shared library and site shell)

- **The shared library is the newest pages' code.** `src/shared/draw.js` and `geometry.js` are the plumbing of snow-sweeps and dragon-sweeps, verbatim; the older pages had drifted copies, and the newest were taken as canonical. The only widenings: `polyPath` takes peano's optional `upto`, `zoomable` takes `{ maxZoom, onTap }` and quadric's `z.ground` override, and `dimension` brackets [0.01, 8].
- **Checked against the published versions by canvas, not bytes.** After the move, every canvas on every page draws byte-identically to the published artifacts (hashes of `toDataURL`, 52 canvases; the one excluded is peano's travelling-salesman demo, which seeds random points). The three oldest pages reproduce their published HTML byte for byte through the template split.
- **Pages extend `PRINT` rather than redefine it.** quadric keeps its warmer red (`#c2552d`) and its light/dark/hatch inks as overrides; koch its sea/swamp/lake/wave; gosper its gain/loss/ground/lake/trace. Old zoom caps are kept as explicit `maxZoom` options (300 on peano and unequal, 1000 on quadric's Plate 54–55).
- **The three oldest pages are not on the library yet.** monkeys-tree, minkowski-sausage and wiener-sausage share almost nothing textual with the newer generation: their figures follow the page theme instead of staying printed paper, minkowski draws its band from a distance field keyed on the view, and all three share their own measuring-chart machinery with each other. Moving them is a rework of markup and behaviour, tracked in TRACKER.md, not a code move.
- **The site build wraps the artifact fragments.** Sources have no doctype, charset or viewport (the artifact service added them when the pages were published); `tools/build.py` adds the skeleton, the site bar (previous/next in book order) and the index with the plate finder, which parses the tables in TRACKER.md. `tools/check_build.py` now checks the committed `site/` by default; the pre-foundation artifacts rebuild byte for byte only from the import commit (`c05f120`).
- **The wrapper must also carry `[hidden] { display: none !important; }`.** The artifact service's stylesheet provided it; without it, any element whose class sets `display` (`.slider`, `.check`, `.key`, …) ignores its `hidden` attribute, which quietly broke show-and-hide controls on nine pages (first seen on peano-sweeps' "angle at the start" slider). The shell stylesheet in `tools/build.py` now provides it for every page; check the computed style, not the attribute, when testing visibility.

## Part I, chapter 1

**Theme (pages 1–5, no plates).**
- The chapter prints no figures at all: every page of the scan was checked, and the PDF's only images are the page scans themselves. It is the book's manifesto — clouds, mountains and coastlines against Euclid; the casebook-and-manifesto framing; Dyson's "gallery of monsters" passage; the coining of *fractal* from the Latin *fractus*; and a restatement of goals.
- Every concept the chapter names is visualized on a later chapter's page: coastlines and mountains (brown-relief, fractal-landscapes), Brownian motion as the "exceptionally simple" case (brown-trails, wiener-sausage), the classical monsters of Cantor, Peano and Weierstrass (cantor-dust, peano-sweeps, mathematical-backup), fractal dimension (chapter 3's concepts and the dimension readouts throughout), scaling (cotton-prices, power-laws), and the history of the ideas (historical-sketches). Following the project rule for chapters without plates, no page was built; the tracker records the chapter as covered across the site.

## Part I, chapter 3

**Dimension, symmetry, divergence (pages 14–19, no figures; page `what-is-a-fractal`).**
- The chapter is running text with not one figure — every page of the scan was checked — so both figures are the page's own illustrations, said so on the page. What it owns: the definition of fractal (D > D_T) and effective dimension (the ball of thread), neither visualized anywhere else on the site. The chapter's other previews are left to the pages that build them (self-similarity → koch-plates, coastline divergence → minkowski-sausage, statistical invariance → brown-trails, covering measure → mathematical-backup, D_T itself → historical-sketches#dimension), per the project's no-duplication rule.
- **The definition section** draws the chapter's own examples exactly (straight segment; triadic Cantor dust; triadic Koch curve; a seeded Brownian trail) with D and D_T on a common 0–3 scale. The D values are the limits' known values (log 2/log 3, log 4/log 3, 2 from chapter 25), never measured from the drawing; the page quotes the chapter's printed four-digit roundings 0.6309 and 1.2618.
- **The ball of thread** (10 cm ball, 1 mm thread) is drawn as a seeded yarn winding: great-circle wraps on two outer layers with a drifting axis, front hemisphere only, depth-sorted into banded Path2D chunks (a render is a few hundred strokes). The stations and their dimensions 0 → 3 → 1 → 3 → 1 → 0 are the chapter's own numbers; the field of view per resolution, the pixelation, the fiber rendering (1 mm thread ≈ 55 fibers of 12 µm) and the logistic crossover widths on the chart are presentation choices, all flagged — the chapter itself insists effective dimension "should not be defined precisely". Deep close-ups recentre on the front-most stitch so the view never lands in a winding gap; past ~100 Å the strands render as dotted "atomlike pinpoints", purely schematic.
- The chart's coastline overlay (a plateau at D ≈ 1.25 across the middle decades, on its own scale) illustrates the chapter's closing bridge — an ill-defined transition widened into a whole fractal zone — and is labelled schematic.

## Part I, chapter 4

**Variations and disclaimers (pages 20–24, no plates).**
- Every page of the scan was checked: the chapter prints no figures at all. It is the book's chapter on its own method — exposition, erudition, graphics ("in the theory of fractals, to see is to believe"), fractal art, and logistics.
- Its one geometric claim — an illustration of a fractal is faithful only between an outer and an inner cutoff, so "the typical fractal curve can be evoked satisfactorily by elementary strokes in large but finite number" (p. 22) — had no explicit visualization on the site, so the page `two-cutoffs` draws it: the triadic Koch curve truncated at ε = 3⁻ᵏ with a pen of positive width, under a scale ledger comparing the drawing's range [ε, Ω] with the screen's range [pixel, frame]; and a per-view pixel-difference test of stage k against stage k + 3 (blue where only stage k inks a pixel, red where only the deeper stage does), which collapses once ε falls below a pixel. The chapter names no curve and draws nothing, so the Koch example and the ledger are this page's own devices, and the page says so.
- The chapter's other threads are cross-links, not new figures: the endpapers born of "faulty computer programming" are the story of Plate 246 (midpoint-displacement page), the Feller random-walk anecdote that seeded chapters 28 and 31 is drawn on brown-trails, and Escher's debt to the Fricke & Klein tilings belongs with chapter 18's self-inverse plates.
- Notation (p. 24): theoretical D is printed as integers, ratios, ratios of logarithms, or to at least four decimals; empirical D to one or two. The site's pages already follow the book's practice; no figure needed.
## Part II, chapters 5–8

**Plate 31, monkeys tree, and Plate 32, Minkowski sausage.**
- Both are computed from the generator. Nothing is traced.
- The sausage page measures length by the ε-neighbourhood area divided by 2ε.

**Wiener sausage (chapter 25 concept, page 32 method).**
- Brownian paths are simulated. The page explains why time scales as ε² and why squared displacements add.

**Plate 33, Richardson's empirical data (page coast-of-britain).**
- A `data` plate: 39 markers digitised from the 600 dpi scan — 29 open rings and the circle's 10 filled dots — each centre taken as the centroid of the marker's interior holes (robust against the through-lines), good to about 0.005 of a decade.
- **The grid is hand-drawn and uneven.** Each rule was fitted with its own tilt; the row pitch differs by 5% (4.0→3.5 spans 665 px, 3.5→3.0 spans 634 px), so values are interpolated rule to rule rather than by one scale. Of the two close horizontal lines at the top, the upper is the 4.0 rule — the "4.0" label centres on it and it ends at the 3.5 vertical — and the lower, gently sloping one is the circle's own fitted line.
- **Printed lines against point refits** (slope, fitted to the drawn ink with 0.4–1.1 px residuals / least squares on the digitised points): Australia −0.1285 / −0.1061; South Africa −0.0059 / −0.0221; German frontier −0.1604 / −0.1411; West Britain −0.2612 / −0.2613 (the caption's "slope of −0.25"); Portugal −0.1257 / −0.1299. The slopes usually quoted from Richardson 1961 are −0.13, −0.02, −0.15, −0.25, −0.14. The page shows both fits.
- **The German frontier prints three yardsticks twice** — two measurements each, 0.04–0.05 apart in log L, at log ε ≈ 2.26, 2.48 and 2.70. Digitised and drawn as printed; the caption does not explain the pairs.
- **One open ring sits inside the circle's dot sequence** at (3.309, 3.957), between the dots at 3.271 and 3.350. It lies on no coastline's line, so the page reads it as a circle measurement and keeps it as the one open marker in that series.
- **The circle.** Fitting the smooth equal-sided-polygon law L(ε) = ε·π/asin(ε/2r) to the ten dots gives circumference 10^3.98 km; the dots' flat part runs about 0.02 of a decade below the 4.0 rule. The page offers the law drawn for a round 10,000 km circle.
- **Page extras.** The divider-walk demo (Plate 51's quadric generator on a straight initiator, D = 3/2 — the value the chapter announces as a first approximation for coastlines) with its live Richardson plot, and the Hausdorff approximate measure N(ε)·ε^d computed from those same walks, are this page's illustrations of the text; chapter 5 prints no figure but Plate 33 (Plates 31–32 have their own pages). Digitisation scripts in `research/ch05/`.

**Plates 42–45, triadic Koch island.**
- These are von Koch's construction (42) and Cesàro's (43), two kinds of self-similarity (44), and the lake (45).
- Plate 45's background is a 7-interval snowflake sweep, all S, at about stage 4 (see Plates 68–69).
- The tangent-free corner zoom repeats with a factor-3 period inside a 30° band.

**Plates 46–47, Gosper island.**
- The flowsnake generator: three pieces of 1/√7, turning by ±φ (φ ≈ 19.1066°), −60° and +60°.
- The Peano–Gosper curve uses the L-system A → A−B−−B+A++AA+B−, B → +A−BB−−B−A++A+B.
- The tiling and "pertiling" view expands any province to fill the island.

**Plates 49–55, quadric Koch islands.**
- Generators were read from the lattice diagrams.
- The critical angle of about 64.4° is our own computation.
- All four square-lattice generators reach the maximum step count: N = b²/2 for even b, (b² + 1)/2 for odd b.

**Plates 56–57, unequal parts.**
- Plate 56's generator is (1/4, 1/2, 1/2, 1/4).
- **Plate 57, top.** This is a reconstruction. It was fitted to the figure, with the apex at 0.328 along the base and every copy flipped inward, then tuned to D = 1.8797.
- **Plate 57, bottom.** This is reconstructed from its bump positions. The printed figure is cropped at both ends; completed, it is symmetric under a half-turn, as the user pointed out.

**Plate 63, Peano's curve.**
- Peano's N = 9 curve, turned 45° to fit the Koch scheme.
- The island with corners cut is a chessboard.

**Plates 64–65, triangle sweeps.**
- **Pólya.** Initiator [0, 1], apex to the left, codes [1, 3].
- **Cesàro.** Initiator [1, 0], apex at [0.5, −h], codes [1, 1].
- **Plate 64 as printed.** The unequal-legs rule (each base angle scaled by (180 − θ)/90 so the triangle stays possible), with φ = 30° at stage 7, drawn with chevrons.
- **Plate 65 as printed.** Four inward Cesàro sweeps, which is the same as two sweeps with a right-angled first stage. The angle is 95°, at stage 14. Draw with a nonzero fill and a pen 0.6 of an interval wide.
- **Kakutani–Gomory.** The bound Σ|PₘPₘ₊₁|² ≤ 4 was checked numerically.
  - For open paths the best constant lies between 3 and 4; Balogh, Clemen and Dumitrescu (2024) conjecture 3. For closed tours, 4 is tight.
- **Cesàro's curve** never crosses itself but traces every grid line twice and passes each grid point four times. "Least efficient" is Mandelbrot's claim; he gives no proof, and the page says so.
- **As a travelling-salesman heuristic** (Platzman–Bartholdi), on random points:
  - Cesàro order came out about 19–26% longer than a 2-opt + Or-opt reference tour, and Hilbert order about 26–36% longer.
  - The worst case is Θ(log n).

**Plates 66–67, square sweep and dragons.**
- **Square sweep.** A two-type rule (S, R, Q), not a uniform one.
  - Each interval carries a type and a side s: S → R Q, R → S(−s) S(s), Q → S(s) S(−s), and S intervals run the generator backwards.
  - This reproduces the book's stages 2, 4 and 6 exactly.
  - At every even stage the squares are visited in Hilbert order (checked to stage 12). Mandelbrot's wording, "midpoints at alternate stages", was not reproduced literally.
- **Plate 67.** The same rule with unequal legs, at φ = 30° and stage 9, drawn with chevrons; it matches the scan.
  - The legs are cos φ and sin φ, and the trapezoid has parallel sides tan φ and cot φ, area 1/sin 2φ.
  - Mandelbrot gives no numbers for this plate; they were fitted.
- **Harter–Heighway dragon.** Initiator [1, 0]; the generator alternates right and left along the teragon, with the first copy always to the right.
  - Alternate dragons replace "always right" by a sequence x_k.
  - The book prints the mature dragon turned half a turn from its caption box; the page keeps one orientation.
- **Twindragon.** [0, 1] followed by [1, 0]. It is Knuth's base −1 + i tile.
  - The skin generator is 0 → (¼, −¼) → (¾, ¼) → 1, all pieces as drawn, giving D ≈ 1.5236 (2^{D/2} solves x³ − x² − 2 = 0).
  - The river is the tree of grid squares inside the rounded closed curve.
- **Base −1 + i.** Every Gaussian integer has exactly one finite expansion, so 1 ≠ 0.111… (which equals −0.4 − 0.2i).
  - Points on seams have two or three expansions.
  - Base 1 + i gives 10.111… = 1, but can't write i, −1 or 2.

**Plates 68–69, snowflake sweeps.**
- **7-interval generator S.** Six legs of 1/3 and one of 1/√3. The codes [1, 3, 3, 3, 2, 1, 3] were read off the book's second stage, which they reproduce exactly.
  - F is S's mirror image in x = ½.
  - All 32 S/F sequences to stage 5 avoid self-contact.
- **13-interval generator.** S with leg 5 replaced by F, reduced by 1/√3. The book uses two rules for the legs that run backward:
  - **Plate 68, the caption's second stage and Plate 69's two small circles.** Backward legs take the other generator: the normalised form, `GEN_13`. Plate 68 is stage 4, all S.
  - **Plate 69's large circle.** Stage 3 with the sequence S, F, F, and no swap (`GEN_13S` / `GEN_13F`). This fits almost everywhere, while the swap rule doesn't. The user spotted the wrong branch directions.
  - All 8 sequences to stage 3 under both rules avoid self-contact.
- **Rounding (Plate 69).** Each interval becomes a 60° arc bulging toward the snowflake it owns. The outline is rounded two ways:
  - **Small circles (stages 1–2).** The Koch outline at the same stage, edges bowed inward.
  - **Large circle (stage 3).** A finer outline, edges as short as the curve's shortest intervals (1/(3√3))ⁿ, bowed outward.
- **Gray and light.** Gray is right of the curve, closed along the outline's lower arc.

**Plates 70–71, Peano–Gosper trees.**
- **Rivers and watersheds.** Lattice triangles with all three corners on the curve, joined across links the curve doesn't use. Each component is a tree.
- **Widths.** In proportion to the straight-line distance to the farthest source.
- **Cascade tree (bottom of Plate 71).** A 7-link generator on Gosper's lattice. The codes [3, 1, 3, 1, 3, 3, 1] were read off the book's second stage; that stage is reproduced once each stream is clipped from its source to its first junction.
  - From stage 2 on, links touch at lattice points, as in the plate.

**Plates 72–73, fudgeflake and quartet.**
- **Fudgeflake tree.** A Y generator (corners of the triangle on [0, 1] to its centre), codes [2, 0, 0].
- **Fudgeflake sweep.** Terdragons inward on the three sides of Δ; area √3/6.
- **Quartet Peano curve.** Five legs on the lattice of u = (1 + 2i)/5 and v = (2 − i)/5, codes [2, 0, 0, 2, 0], read off the book's second stage. The boundary generator is v, u, v.
- **H tree.** It touches itself whatever its codes are, as the book says.
- **F tree.** The book shows no second stage. Four placements avoid self-contact; the page uses [2, 0, 0, 0, 0]. This is a reconstruction.

**Plates 80–81, Cantorian triadic curdling (chapter 8).**
- **Plate 80, the Cantor bar.** Measured at 600 dpi: stages 0–7 as rows of constant thickness 0.035 of the bar's length (the caption's "width/length = 0.03"), row pitch 0.0796 of the length with an extra 0.011 after stage 0; the page uses the measured offsets. Piece positions are triadic exactly. The caption's growing density (×3/2 per stage) is narrative, not drawn: in the scan the stage-7 row's 128 slugs read as 64 gray ones, as the caption says, and the page reproduces that optically when slugs drop below a pixel. The cake and Saturn's-rings drawings illustrate remarks in the caption; the book prints no such figures.
- **Plate 81, the curtains.** Both figures are dusts with N = 2 and r varying with height, square frames, topped by [0, 1]. Told apart by fitting the central gap over ~180 rows each: the top figure is linear in D (from 1 to 0; residual rms 0.02), the bottom linear in r (from 1/2 to 0; rms 0.0008). The printed margin arrows sit a little high of the stated values — about r = 0.347 and D = 0.68 instead of r = 1/3, D = 0.6309 — so the page's arrows mark the exact values, and the note says so.
- **Plate 83, the devil's staircase.** The unit square with the region under the Cantor function in solid ink. The scan's top profile matches the Cantor function to rms 0.005 of the height (max deviation 0.018 at the near-vertical risers, which is ink spread); treads are resolved down to about 3⁻⁷. The page computes M(R) per pixel column, so zooming keeps producing steps. Graph length checked in closed form: 1 − (2/3)ⁿ + √(1 + (4/9)ⁿ) → 2.
- **Generalized dusts (pages 77–78).** The book gives N and r for its example dusts (N = 3, r = 1/5; N = 2, r = 1/4; N = 3, r = 1/9) but never draws them, so the page's evenly spaced arrangement — first piece at 0, last ending at 1, equal tremas — is a reconstruction, flagged on the page. The gap-count law Nr(U > u) stepping across F·u⁻ᴰ was verified and is drawn as a log–log chart.

**Chapter 6 completeness check (pages 34–57).**
- The chapter's scan was re-checked page by page against the tracker: pages 34–41 print no figures, and every figure from page 42 on is one of the tracked plates (42–45, 46–47, 49, 51, 53, 54–55, 56–57), all built on koch-plates, gosper-island, quadric-islands and unequal-parts.
- The one figure not in the tracker sits inside Plate 54–55's caption on page 54: a three-stage ink-dispersion diagram the book reproduces from Corrsin 1959b. It is another publication's artwork, in copyright, so the site does not reproduce it.
- The chapter's concept, similarity dimension, is covered interactively on koch-plates (Plate 44: interval, square and Koch curve cut into N parts of ratio r, with D = log N / log (1/r) live). The remaining prose asides (cutoff scales Ω and ε, Koch arcs and half lines, Koch motion, the Kolmogorov-complexity aside "a Koch curve is simpler than a circle") are narrative, drawn nowhere in the book, and are left to the review pass.

## Part III, chapters 9–11

**Plates 95 and 96, Fournier universes (chapter 9).**
- Both plates are quincunx cascades: five dots — one at the centre, four on the diagonals — repeated at ratio 1/r per order. Plate 95 is three orders at 1/r = 7 (125 dots); Plate 96 is four orders at 1/r = 5 (625 dots), "carried one step further" because it shrinks more slowly.
- **Measured at 600 dpi.** Plate 95's fitted ratio between levels is 7.000 (dot placement scatter rms 5 px ≈ 0.2 mm, which reads as hand drafting). Its dots are the order-0 balls drawn to scale: expected radius (corner offset)/294 ≈ 3.2 px against ≈ 3.1 px measured — the caption's "represents to scale" is literal. Plate 96: all 625 dots match the exact pattern (fitted ratio 4.98, rms 12 px ≈ 0.5 mm); the scan's four extra marks are printing specks, not structure, and the smallest dots print slightly larger than exact scale.
- **Geometry.** Sub-aggregate centres sit at distance d = R − R/ρ from the centre, where each corner copy touches the enclosing sphere; the book's text ("corners of a square whose diagonal is 12 units") leaves the square's turn open and the plates print the corners on the diagonals. The octahedron's two polar balls project exactly onto the centre dot, which is why the projection and the equatorial section are one picture — and why the printed pattern has D = log 5/log 7 ≈ 0.8270 while the universe it depicts has D = 1 (the caption's exception to the "a D < 2 set projects to dimension D" rule: a special structure and viewing axis).
- **Claims verified numerically.** M(R) counted from the model climbs along M = R and sags to M = R/7 between aggregate radii, exactly the band the text describes; non-overlap of the balls needs 1/r > 3, and D in space then runs up to log 7/log 3 ≈ 1.7712, as stated on page 89.
- **Page extras.** The endless zoom (interpolation to orders −1, −2, …), the M(R) chart and the sky-coverage comparison are this page's illustrations of the text; the book prints no such figures.

## Part III, chapter 10

**Geometry of turbulence; intermittency (pages 97–105, no plates).**
- The chapter prints no figures at all — every page of the scan was checked — so the whole page (`turbulence-intermittency`) is labelled as this page's own illustrations of the text. Formulas were verified on the 600 dpi scan: ⟨[v(x) − v(x+r)]²⟩ = |r|^(2/3+B) with B = (3 − D)/3 for fractally homogeneous turbulence, B ≤ (3 − D)/3 for weighted curdling, and the curdling rule "N = r⁻ᴰ out of r⁻³ mth-order subeddies".
- **The record of gusts.** Base-9 curdling of [0, 1] where every kept cell keeps exactly N of its 9 ninths, so d = log N/log 9 exactly and the fixed total dissipation stays uniform on the survivors (density (9/N)ᵐ). Positions are seeded-random per cell; a checkbox reuses one position set everywhere, which is the chapter's "de-randomized" curdling. N = 3 gives d = 1/2, i.e. the measured D ≈ 2.5 in space.
  - Kept ninths often touch (about 60% of random draws of 3 from 9 have a neighbouring pair), and touching pieces merge. The first default seed kept ninths 4, 5 and 6, so stage 1 drew as one block and the user read the figure as cut off. The stage view now draws every parent's 9 slots (kept ones in ink, the rest faint, a hairline apart), the probe strip shows dividers between its windows, and the default seed is 56 (ninths 2, 4, 6; 1, 4, 7 de-randomized), chosen for legibility and said so on the page.
- **The cube.** Base-3 curdling with a seeded generator of N of 27 cells reused at every scale (the chapter's model). Drawn isometrically with painter's order by x + y + z; 4096 cubes redraw in ~45 ms. The partial Fisher–Yates pick makes the generator nest as N grows, so the N slider adds curds without rearranging the rest.
- **The section argument.** Computed exactly, not simulated: randomize the curdling (each subcell kept with probability p = 3^(D−3)); a straight probe's trace is a branching process with Binomial(3, p) offspring, mean 3^(D−2), so it dies out surely for D ≤ 2 and survives with positive probability for D > 2 — extinction iterates q → (1 − p + pq)³. Chapter 23 is cited by the book as proving the theorem for a simple class; the galaxies' contrast (projections must vanish, D < 2, D ≈ 1.23) is drawn on the same chart.
- The chapter's open topology question (dust vs vortex tubes vs sheets; kurtosis tests determine only D) is reported as open on the page.

## Part III, chapter 11

**Fractal singularities of differential equations (pages 106–108, no plates).**
- The chapter prints no figures at all — all three scanned pages were checked — so the whole page (`fractal-singularities`) is labelled as this page's own illustrations of the text. It is pure argument: the conjecture (Mandelbrot 1976c) that the singularities of the Euler and Navier–Stokes solutions are locally scaling fractal sets, with Chorin's and Scheffer's results as support.
- **Numbers verified against the text.** Chorin 1981: D ~ 2.5 and B = 0.17 ± 0.03, unpublished 2.5 < D < 2.6; chapter 10's B = (3 − D)/3 gives exactly 1/6 ≈ 0.167 at D = 2.5, which the exponent-check chart draws. Scheffer's bounds for a finite-energy Navier–Stokes fluid: singular times of dimension at most 1/2, the singular set in space of dimension at most 1 (the first a restatement of an inequality in Leray 1934, as the chapter stresses).
- **Inventions, flagged on the page.** The singular functions (a rational function with three poles; f = 1/dist to a two-piece Cantor dust, distance computed exactly with no stage cutoff), the zoom-test stand-ins (a parabola for the smooth curve; the plane dust C(1/3) × C(1/3), D = log 4/log 3, with the zoom anchored at (1/4, 1/4), a dust point where the base-3 construction repeats with a factor-9 period), the ε-thickened volume chart (ε^(3−D)), and the dissipation record 1/√(dist² + ν²) on singular times of chosen dimension. The book specifies no profiles; only the sets and the exponents are its claims.

## Part IV, chapter 12

**Plate 115, log(perimeter) versus log(area) for clouds and rain areas (page length-area).**
- A `data` plate: 71 points digitised from the 600 dpi scan (55 open-circle clouds, 16 filled rain areas), by ring/disc template matching plus a residual-ink audit, so every marker was accounted for. Centres are good to about 2 px ≈ 0.006 decade.
- Axes calibrated from the decade ticks: 332.5 px/decade in x, 333.3 px/decade in y, consistent to 0.3%.
- A least-squares refit of the digitised points gives slope 0.674, D = 1.349 — Lovejoy's published 1.35, which the caption rounds to 4/3. The line printed on the plate has slope 0.678 (D = 1.356), intercept logP = 0.555 at logA = 0. The page draws the printed line by default and offers the refit.
- Cloud and rain points fit separately give D = 1.348 and 1.366; the page's note keeps only the joint statement.
- **The length–area demo is our construction, not a book figure.** Five similar islands (Koch snowflake D = log 4/log 3, Plate 51's quadric D = 3/2, or circles), coasts walked with genuine dividers at a common G. Checked numerically: circles give slope 0.5000 and length within 0.01% of 2πr; the quadric family returns D = 1.50 ± 0.01 at any G; the Koch family oscillates D ≈ 1.24–1.30 with G (the known log-periodic wobble of divider walks), which the page says on the figure's note.
- **The brain-folds figure is a cartoon** (sinusoidally folded pia in a disc section, wiggle count solved numerically so pia length tracks section area as A ∝ V or ∝ V^0.92). Flagged as such on the page; the book proposes no construction for the pia.

## Part IV, chapter 13 (pages 116–130, islands-clusters)

Chapter 13 prints no numbered plates; its six figures sit in the running text. All were measured on the scan at 600 dpi.

**Figures, pp. 117–118, Koch continent and islands (N = 16, r = 1/8, D = 4/3).**
- p. 117: the coastline generator is 10 links on the 8-lattice, straight except one unit step up over [3/8, 4/8]; the island generator is a 1×2 rectangle loop over x ∈ [1/8, 2/8], floating one unit above the coast. D_c = log 10/log 8 ≈ 1.1073.
- p. 118: straight 8-link coastline plus a 2×2 square loop over x ∈ [1/8, 3/8], one unit up. D_c = 1.
- **Orientation rule.** Land stays on the right of travel everywhere: the coast runs 0 → 1 with land below, island loops run clockwise (sub-islands outside, on the sea side), lake loops counterclockwise. The book draws only each generator and one further stage, so placing every copy as drawn (no mirror, no reversal) is a choice — the simplest consistent with those drawings, and confirmed by the p. 121 teragon.

**Figure, p. 121, islands and lakes (N = 18, r = 1/6, D = log 18/log 6 ≈ 1.6131).**
- Straight 6-link coastline; a 2×1 island loop over [1/6, 3/6], one unit up; a 2×1 lake loop under [3/6, 5/6], one unit down.
- The printed advanced teragon is **stage 3 on a square initiator** (clockwise, land inside). The reconstruction reproduces its pinwheel of four inner lakes, the four islands floating off the sides, the islands inside the lakes and all the satellite fringes. Nesting levels: sea 0, land 1, lake 2, …

**Figure, p. 124, nonlumped curdling (b = 4).** Kept cells, rows top to bottom:
- A `#### / #..# / #..# / ####` N = 12, connected at every stage (carpet relative).
- B `#..# / #... / #.#. / #.#.` N = 7; largest cluster is the left column, exactly 4^k cells at stage k → intervals, D_c = 1 (maximum attained).
- C `#.#. / #... / #### / #...` N = 8; largest component 7 cells, 7^k at stage k → trees with D_c = log 7/log 4 (maximum attained).
- E `###. / #... / ###. / #...` N = 8, one connected F-shape, but its copies split: largest cluster is only 2·4^k cells → D_c → 1, the maximum log 8/log 4 is **not** attained, as the text says.
- F `#..# / .... / .... / #..#` N = 4, dust from stage 2 on.
- All five second stages printed under the generators follow with nothing left to choose.

**Figure, p. 125, cross-lumped curdling (b = 3).**
- Left: `#.# / #.. / #.#` N = 5, D ≈ 1.4650. The columns lump into one spine growing exactly 3× per stage, D_c = 1.
- Right: `#.# / #.. / ###` N = 6, D ≈ 1.6309. The largest cluster's growth ratio climbs to ≈ 5.84 per stage (measured to stage 6), so D_c ≈ 1.60 — the book's fractional b^D_c. The exact value would need the lumping series Σ aₘxᵐ = 1; the page reports the measured value and says so.

**Figure, p. 126, knotted Peano generator (N = 17, r = 1/√17, D = 2).**
- 17 links from (0,0) to (4,−1) on the square lattice tilted by arctan(1/4). Lattice path: (0,0) (1,0) (2,0) (2,1) (1,1) (1,2) (1,3) (2,3) (2,2) (3,2) (3,3) (4,3) (4,2) (3,2) (3,1) (4,1) (4,0) (4,−1); the vertex (3,2) is visited twice — the generator's one self-contact.
- Per-link codes [0,2,2,0,2,0,0,2,0,2,0,0,0,2,2,0,2] (reversals only, no mirrors), fitted to the printed second stage: mean distance 0.01 px at 600 dpi, an exact match.
- Verified at stages 1–3: the teragon repeats no edge and visits no vertex more than twice (contacts 1, 18, 307 = 17·cₙ₋₁ + 1); crossings zero. The page's "knotted-off preclusters" view flood-fills the open components of the complement, which is what the text says the clusters are limits of.

**Percolation (pp. 126–130).** The chapter prints no percolation figure in these pages (the critical-cluster plate is with chapter 14). The page's Bernoulli bond-percolation lattice is a **seeded simulation**, labelled as such, with p_crit = 1/2 and the D_c ≈ 1.89 formulas quoted from the text. The p. 129 sub/supercritical initiators (eight ½ξ squares around a hole; the even-coordinate grid lines) are described in the note rather than drawn.

## Part IV, chapter 14 (Plates 141–146, figures on pages 132 and 138–139)

**Plate 141, Sierpiński arrowhead.**
- Generator: half a hexagon, three legs of ½ at +60°, 0°, −60°; codes [1, 0, 1], read off the caption's second teragon (the outer legs carry mirrored copies). Finite stages were checked to be free of repeated vertices to stage 8.
- **The plate is the "tropical fish":** the piece of the teragon between its two vertices nearest the midpoint of [0, 1] (in the limit, two successive returns to that point of self-contact), closed and filled as one polygon. The filled polygon reproduces the plate's pattern of black and white tremas exactly — which tremas print black falls out of the pinch parity, not from any painting rule. Stage 8 matches the plate's finest texture at print size (fitted by eye).
- Fill rule: even-odd and nonzero agree (the finite polygon is simple).

**Figure p. 132, critical percolation cluster.** Random; rebuilt statistically as bond percolation on a square lattice at p = ½ with a seed control. "Dangling bonds" are trimmed by repeatedly deleting cluster sites that hang by one bond (keeping the electrodes), which matches the caption's description; the true biconnected backbone was not computed.

**Plate 143, fractal skewed web.** The Sierpiński tetrahedron: N = 4, r = ½ on a closed tetrahedron, D = 2 exactly. Drawn as a depth-shaded edge rendering; the preset's viewing angle was fitted by eye (the print's slight perspective is not reproduced). The square-shadow property was verified: the four corners of each tetrahedron project, along the axis joining the midpoints of opposite edges, onto the corners of a square (turned 45° in the natural basis of that plane), and the stage-n shadows pave the initial square.

**Plate 145, carpet and sponge.**
- Carpet: N = 8, r = 1/3 from a filled square; the caption's three printed steps match stages 1–3. The medallion families of the chapter text (large: thin ring of 4(b−1); small, odd b: thick ring of b²−1) are on the page with their D formulas.
- Menger sponge: cell rule "at most one of the three triadic digits equals 1 at every level" (removes the 6 face centres and the centre, keeps 20). The book's photograph is reproduced from Blumenthal & Menger, so ours is a computed re-rendering: outer visible faces, painter-sorted, three print-like tones, rotatable. Level 3 as in the print.
- The fused-islands generators at the bottom of page 144 are described in the carpet section's text only, not rebuilt interactively.

**Figure pp. 138–139, ramification through branches.** N = 5, r = 1/3, the ⊓ generator (middle third lifted onto a square tab), initiator a square per the text. **Every copy is placed as drawn (codes all 0)**: all 1024 code assignments were enumerated against the printed mountain, and the all-as-drawn cascade reproduces it — the 45° staircase flanks and the little square rings emerge from teragons touching tab against tab (the same stick-generator overlap idea as the fused islands). The book prints the curve on one side at stage 4. On the full square, bumps outward (clockwise traversal), the four mountains meet flush along the corner diagonals: the limit silhouette is a plain diamond and all the structure is interior ramification.

**Plate 146, split snowflake halls.** **The same generator and codes as Plate 31's monkeys tree** (eleven legs, six of 1/3 and five of 1/(3√3), codes [1, 3, 0, 3, 3, 1, 2, 2, 0, 2, 0]), cascaded from the plain initiator [0, 1] — the Wise Elders' line — and drawn with straight legs at stage 4, which matches the scan's maze, its empty Great Hall, the line reaching both margins, and the hooks of the finer legs. Plate 31 prints the same construction rounded; Plate 146 does not round. The curve stays inside the Koch snowflake on [0, 1] (sampled: 400 of 400 stage-4 vertices inside, up to boundary rounding) and hugs its boundary, hence the snowflake silhouette. Filling the closed curve shows the North/South division; the page offers it as a mode.

## Part V, chapters 15–17

**Plate 155, fractal umbrella trees (chapter 16).**
- All five trees are one construction: a bare V from an apex (no trunk is drawn), with two children per branch at the same inter-branch angle θ, lengths scaled by one ratio r. Codes are irrelevant: the tree is symmetric.
- **The parameters are round angles at the self-contact threshold.** Free fits of (θ, r) to the 600 dpi scan land on θ = 20°, 36°, 60° (top row, upright), 150° and 200° (bottom row, printed with the axis horizontal), each within ~0.1°, with r at the critical value for that θ. The caption's rule "for each D, θ takes the smallest value compatible with self-avoidance" picks the same curve.
- **The threshold criterion:** a tree first touches itself where an extremal branch tip reaches the axis of symmetry between two sibling subtrees (every ancestor stem lies on such an axis, so this covers branch-vs-stem contact too). The sup is computed by value iteration over the branch direction plus bisection on r; the page computes it live. Checks: θ = 180° gives r = 1/√2 (the caption's plane-filling D = 2 tree) and θ = 120° gives r = 1/φ. Critical r: 0.5076, 0.5232, 0.5534 (top row), 0.6539, 0.6429 (bottom row), so D ≈ 1.023, 1.070, 1.172, 1.632, 1.569. A brute-force segment-crossing test agrees to ~1e-3 (it is the blunter criterion, since tip contact is asymptotic).
- **Fit quality.** With θ and r pinned to the exact values and only apex, scale and depth free, the upright trees match the scan to 0.0–0.3 px at 600 dpi; the 150° tree to ~0.4 px; the 200° tree matches everywhere with ~1.5 px of drift on its longest lines (plotter or print distortion). Printed depths, read off the scan: 10, 10, 9, 9, 11 levels.
- The sub-degree tilts fitted on the scan (≤0.7°) are treated as scan skew; the page uses exactly vertical and horizontal axes.
- Past θ = 180° the critical D falls again (the branches curl backward and touch sooner), which is why the 200° tree has smaller D than the 150° one — the shape of the whole critical curve is drawn on the page.

## Part V, chapter 17

**Plates 164–165, plane-filling recursive bronchi.**
- **The branching rule, decoded from the scans.** A branch is a rectangle of length ℓ and width c·ℓ. At its far end two daughters leave at right angles, one to each side, with ratios r₁ (long) and r₂. The daughters' centre lines sit back from the parent's end face: the short daughter by half its own width, the long daughter by its full width (its outer edge on the short one's axis), so the parent's tip shows past the crossing. The long daughter's subtree flips which side its own long daughter takes; the short daughter's keeps it. This reproduces Plate 165's top figure branch for branch at every level (600 dpi difference image; the residual is a uniform ink-width bias).
- **Fitted parameters.** Plate 165 top: r₁ = 0.718, r₂ = 0.678, c = 0.148 (tips' D ≈ 1.93). Plate 165 bottom: r₁ = 0.726, r₂ = 0.582, c = 0.41 (D ≈ 1.66). Trunk at the top pointing down, long arm west, in both.
- **Plate 164** is the same skeleton rooted at the bottom with widths shrinking per stage. Fitted as geometric decay: widths × 0.66 per stage in the left half, × 0.78 in the right, r₁ = 0.698, r₂ = 0.659, trunk c = 0.17. The large-scale structure matches the plate; the finest twigs only approximately, so the width schedule is a reconstruction and is flagged on the page.
- **Δ against D.** The model's diameter exponent: with fixed c, Δ = D (both solve r₁^x + r₂^x = 1). With width decay q per stage, Δ solves (q·r₁)^Δ + (q·r₂)^Δ = 1 < D — the chapter's Δ < D case, shown in the page's readouts.

**Plate 163, flattened fractal models of plant flowers (with Plate 155's trees).**
- **The umbrella tree is a V, not a trunk-and-forks.** Two sticks of length 1 leave the root with the inter-branch angle θ between them; every stick then forks into two daughters at the same θ, r times shorter. Plate 155's heart tree fits this stroke for stroke (r = 0.562, θ = 60.7°). The first canopy level is drawn a few percent off strict scaling in the plates (fitted factors 0.94–1.06); the page's presets reproduce that.
- **Each stick carries a triangle on *each* side** (angles ½θ at the root, π−θ at the tip, the stick a side). The caption says "an isosceles triangle", but with one triangle per stick the corners around a fork sum to π and the figure cannot be solid; with one per side they sum to exactly 2π, the thickened stems tile with no gap and no overlap, and the rendered figures go solid and scalloped exactly like the plate. The bottom figure's white slits are the caption's "trimmed slightly on one side": one triangle of each pair pulled off its stick.
- **The three figures fit θ = 29.9°, 60.3° and 89.8°** — surely 30°, 60° and 90° — with r = 0.501, 0.544 and 0.566 (pixel agreement 97–98.5% at 600 dpi). Planar D ≈ 1.00, 1.14, 1.22; the spatial originals are D+1.
- **Self-avoidance bound.** Our own computation (bisection on segment crossings to stage 11) gives the largest self-avoiding r at those angles as 0.518, 0.554 and 0.595, so the printed figures sit 2–5% below the bound. The page's slider couples r to the computed bound; the presets use the fitted values, and the note on the page says so.

## Part VI, chapter 18 (pages 166–179, page self-inverse)

All on the page `self-inverse`. Every construction is computed at runtime from a handful of
fitted circles; nothing is traced. Circles were fitted from the 600 dpi scans (RANSAC on ink or
region boundaries, then a least-squares refit), then idealized to exact tangency.

**Figures pp. 169–171, Apollonian packing and the net.**
- **The three given circles** are the same throughout pages 169–171. Fitted from p. 170's
  construction figure and idealized: outer (0, 0, 1), inner (−0.30355, −0.06297, 0.69000) and
  (0.66188, −0.24830, 0.29307) in units of the outer radius (y up). Tangency residuals before
  idealizing were under 1.5 px.
- **The two Apollonian circles are the two Descartes roots k± = k₁+k₂+k₃ ± 2√(k₁k₂+k₂k₃+k₃k₁),
  which differ** (4.440 and 3.283 here) — not one curvature with two centres. In the complex
  centre formula each root pairs with one sign of the square root; the page validates by
  tangency. Deeper triangles use the Soddy reflection k′ = 2(kₐ+k_b+k_c) − k_d, where d must be
  the *other* circle tangent to the triangle's three (for a root triangle, the third given
  circle, not the other Apollonian circle — getting this wrong scatters the packing).
- **The gasket photograph on p. 170** is the packing's lower triangle (below the two inner
  circles): of the two triangles, only it has the photo's three-horned proportions. The preset
  fills its discs black on white inside a gray panel, like the photo.
- **The net really sorts into 4 clans** (p. 171): the page builds the net a second way, as the
  clans of the four Γ circles under reduced words in the four orthogonal C circles, and the two
  constructions coincide visually at every zoom. The C circles are computed as radical-centre
  orthogonal circles of each Γ triplet.

**Figure p. 173, the Poincaré chain, and Plate 177.**
- **The chain** (M = 4) was fitted from p. 173 by distance-transform peaks plus boundary refit
  (rms 2.6 px at 600 dpi), then idealized: C1/C3 (±0.60637, 0.06853, r 0.39348), C2 (0,
  −0.45406, 0.40701), C4 (0, 0.31700, 0.26182), y up. Plate 177 uses the same chain, as its
  caption says.
- **Stages.** Stage s of Poincaré's construction is all reduced words of length s applied to
  the chain circles, 4·3ˢ links; the page draws each stage in ink over the previous stage in
  white on gray, as printed. Stages 1 and 3 match the figure's top and bottom panels.
- **Plate 177's Δ discs behave exactly as captioned**: Δ₁₂₃ and Δ₃₄₁ come out unbounded
  (exteriors of their Γ circles), Δ₂₃₄ and Δ₄₁₂ intersect, and the second approximation adds
  the inverses in C₄/C₂ and C₁/C₃. Γ_ijk passes through the triplet's own tangency points, so
  "γ-free" means free of the *other* chain tangencies, strictly inside or outside.
- The limit render keeps a ~2.6 px disc cutoff so the white thread of L stays visible between
  the black and gray clans, as in the printed plate; mathematically the clans cover everything
  but L.

**Plate 179, Fricke & Klein's Figure 156 corrected.**
- **The five generating circles were recovered from the engraving** (the plate's top-left
  reproduction): RANSAC on the boundary of the blackened central region, idealized to exact
  tangency (rms 0.6 px). In units of ~1/1000 of the reproduction: C1 (−0.829, 0.705, 0.914),
  C2 (0.613, 0.374, 0.565), C3 (0.074, −0.099, 0.152), C4 (−0.286, −0.403, 0.319), C5 (0.344,
  −0.389, 0.243), y up. C1–C2–C3–C4 form the Poincaré chain of the caption; C5 touches C2 and
  C3 only, which is why the fundamental region runs off the engraving at the bottom (the
  "trunk" between C4 and C5).
- **Checked against the plate.** The inside of L* (the 4-chain, bottom right) matches the scan
  at IoU 0.98 after a similarity fit; the full five-circle black shape (top right) matches
  feature for feature at IoU 0.74 — the print sits rotated about 44° from the engraving (the
  bottom figure only about 8°), and the residue is a rim fringe at the print's halftone scale.
- **Fricke's draftsman drew genuine circles of L.** The two large circles across the engraving
  fit as: the circle through the tangency points of C2, C3, C5 (orthogonal to all three — the
  Γ circle of that tangent triplet, residual ~3‰), and a circle orthogonal to C1 and C2 through
  their tangency point. This confirms the caption's "Fricke knew that L incorporates circles".
- **The M ≥ 5 osculating construction** (p. 175) works as described: of the ten Γ triplets,
  four osculate from inside, two from outside (each inside disc internally tangent to an
  outside one), and four intersect L and are discarded.

**Plate 178 is a reconstruction of the idea, not of the plate.** Mumford's group of
homographies is not stated in the book, so the plate cannot be reproduced stroke for stroke.
The page's section composes each chain inversion with a rotation about its circle's centre
(every two-letter word is then a Möbius map) and lets the twist grow from 0°, which leaves the
self-inverse thread and spreads toward plane-filling forms. TRACKER reclassifies 178 as `art`.

**Limit sets as disc coverings.** A reduced-word image of a generator disc always nests inside
the previous disc, so L is drawn by emitting every image disc smaller than a few pixels while
recursing to a sub-pixel cutoff; the emitted discs keep the thread contiguous and the terminal
ones add detail. Rotating an inversion doesn't change image radii, only positions, so the same
covering works for the twisted maps.

## Part VI, chapter 19 (Plates 185–192)

All on the page `self-squared-dragons`. Every figure is a per-pixel escape-time render of z → λz(1−z) or x → x²−μ (μ = λ²/4 − λ/2), with a distance estimate for boundaries and filaments. The scans were matched by eye at 300 dpi; the maps and Plates 185 and 192 follow from their definitions, while the dragons' λ are reconstructions, as noted below.

**Pages 180–182, the inverted V.** The book prints no figure; the cobweb drawing and the survival rows are ours. The map is the tent map stretched to peak 1/(2r).

**Plate 185.**
- **Left.** The five domains (λ = 1, 1.5, 2, 2.5, 3) nest, so rendering a count of containing sets in stepped grays reproduces the print. λ = 2 is the exact circle |z−½| = ½.
- **Right.** The caption's λ = 3.3260680 is a digit transposition. The nuclear λ of the period-2 atom (the caption's own definition: w = 2) solves λ² − 2λ − 4 = 0, i.e. λ = 1 + √5 = 3.2360680…, confirmed by Newton on f²(½) = ½. The page draws the true nucleus, turned 90° as printed, and says so.

**Plate 187, the drape.** Reconstructed, not copied: the book's shaded 3D render is redrawn as a waterfall of exactly-computed horizontal sections (120 slices, silhouette half-heights by bisection), nearer slices occluding farther ones. The caption's wall, its island-molecule corrugations and the backbone tree are described in the page's note but not drawn.

**Plates 188–189, the separators.** Five views, all computed from the definitions: the μ-map (the Mandelbrot set mirrored, cusp μ = −¼, tip μ = 2), the λ-map with its two empty discs, the inverse of the λ-map about λ = 1 (top of 188), the lemniscate detail at the 3-bond 2 − exp(−2πi/3), and the channel near the 100-bond. Checked: the circle |λ|=1 inverts to the line Re λ′ = ½ with the m = 1 sprout roots at cot(π/n)/2 — spacing → 1/(2π), which is why the plate's inverted sprouts look evenly strung. The 100-fold channel needs thousands of iterations before the slow escapers clear; the view warns it is slow.

**Plates 190–191, the dragons.** The book names no λ for any dragon, so all four presets were fitted to the scans by eye (the strongest candidates from families the captions describe):
- **190 top left, starved:** the period-doubling accumulation in the 1/10 sprout, λ ≈ 0.83309563 + 0.60035559i, from Newton nuclei of periods 10·2^k extrapolated by δ.
- **190 top right, twist:** the root of the 1/7 subsprout of the 1/6 sprout, λ ≈ 0.52345446 + 0.86392232i, from a two-variable Newton prescribing the cycle's multiplier σ = e^{2πi/7}.
- **190 bottom, σ-dragon:** the nucleus of a period-102 island in the channel near λ = 1 (where bottom-right Plate 189 looks), λ ≈ 0.99820131 + 0.06156126i, found by grid-searching the channel for bounded parameters outside both discs.
- **191:** λ ≈ 0.96928400 + 0.24774506i, in the period-25 sprout with multiplier 0.98·e^{2πi/8}. The caption places it in an island offshore the bond at θ = 2π/n; the island candidate found there (period 70, λ ≈ 1.03583 + 0.26609i) matched the print worse than the sprout value, so the page uses the sprout value and notes the discrepancy.
- The book printed its thin dragons as inverse-iteration dust, so the page draws the starved, twist and σ figures as the set's skin (distance-estimate line, threshold 0.45 px) rather than filled.

**Plate 192, Fatou dusts.** Exact: a point is black when its first k iterates stay in [0, 1], the complement of the tremas of order ≤ k; the plate is k = 5. Three horizontal subsamples per pixel keep the thin high-λ fingers printing. The mid trema's ends solve λx(1−x) = 1.

**The μ-atom arithmetic (p. 184)** — at most 2^{w−1} atoms of period w, fewer for w > 1 — was not verified numerically; the page quotes none of it.

## Part VI, chapter 20 (Plates 198–199)

Both plates on the page `fractal-attractors`, drawn by the chapter's own algorithm: a long orbit of a "decomposable dynamical system", the determining index chosen pseudo-randomly among the maps' inverses, 64,000 steps with the first few skipped. The book's random sequence is unknowable, so dot-for-dot both plates are this page's own runs with the seed exposed.

**Plate 198, the San Marco dragon.** Random inverse iteration of x → 3x(1−x): z = ½ ± √(¼ − z/3), the sign chosen per step. Verified at 600 dpi: the generated points land a median 0.0 px (mean 0.4) from the plate's ink, and the figure's height/width is 0.5774 against the print's 0.5779. The dragon spans [0, 1] on the real axis; the cusp where the big bulbs meet is the fixed point ⅔, multiplier exactly −1, which is why its neighbourhood fills so slowly (the caption says so, and it shows).

**Plate 199, the Pharaoh's Breastplate.** The book nowhere states the four inversions ("selected to insure that the limit set is a collection of circles"), so they are a reconstruction decoded from the scan:
- The two bounding circles, fitted at 600 dpi (outer rms 0.9 px, inner 1.9 px), are internally tangent at the top; the radius ratio is q = 0.6474 (fitted — the book states no proportions, and no obviously exact value is nearby).
- Sent through the Möbius map that takes the tangency point to ∞, the crescent becomes a strip and the white discs (measured by distance transform) take exact positions: circles of radius ¼ seated on each edge at u = kP, radius-⅛ circles at v = ⅜ between them, and so on, with period P = 1/√2. The tangency of the ¼- and ⅛-families forces P² = ½ exactly.
- The group that produces this: inversions in circles of radius 1/√2 centred at (0, 0) and (0, 1) on the strip's edges, plus two mirrors half a period apart. Chaos-game points from this group land a median 4.2 px from the plate's ink (uniform points in the crescent: 35 px), and the plate's ink lands a median 3.6 px from the model at 400k points — the support matches.
- The page's dots use the symmetric generating set (edge circles + mirrors at u = ±P/2, which in the crescent are four genuine circles): it reaches the horns far better (ink→model median 7.6 px at 64k points against 12.1 for mirrors at 0 and P/2), and both sets draw the same limit set to sub-pixel agreement (median 0–1 px both directions at 400k).
- The dots' texture still differs from the print in detail — Mandelbrot's actual generators and random sequence are unknown — so the dots are a statistical match; the "circles" mode (breadth-first orbit of the two boundary circles under the inversions, down to pixel radius) is exact.
- Open: whether the printed crescent ratio is an exact value, and what Mandelbrot's own four inversions were. His 1983 Intelligencer paper on sigma-discs likely states them; it was not accessible this session (IBM page is paywalled, and the Yale/Scranton pages describe no construction for this figure).

**Pages 194–195, the dust attractor (no plate).** The bifurcation tree is ours — the book prints no figure for these pages. Quoted, not recomputed: D ≈ 0.538 (Grassberger, cited by the book from a preprint) and Feigenbaum's 1/α ≈ 0.3995. Computed: the window magnifier re-centres on (λ∞, ½) and shrinks by (δ, α) per step, mirror-flipping odd steps because α acts with a sign; cycle periods and Lyapunov exponents for tapped λ come from the orbit of ½.

## Part VIII, chapter 23

**Plates 218–219, Hoyle curdling (page 218–219).**
- Random kind: matched statistically, with this page's own seeds. The construction follows the caption exactly: E = 3, base 5, each surviving cube collapses into 5 of its 125 subcubes, drawn as the plane projection of the cubes.
- Plate 219 superposes stages 1–3. The grays were measured at 600 dpi: paper ≈ 197, stage-1 squares ≈ 150, stage-2 ≈ 106, stage-3 ≈ 53, i.e. about 0.27, 0.52 and 0.82 of full ink; the page uses those shades.
- Plate 218 is a fourth stage alone from a different seed, printed full bleed with the square's top cut by the page edge (and empty in the book's instance); the page draws the whole square and says so.

**Plates 220–223, Novikov–Stewart curds and percolation (pages 220–223).**
- The plates are plane b = 5 curdling at **stage 4 on a 625 × 625 grid**: the finest cell pitch measures 9 px at 600 dpi in both axes, and each full-bleed plate window is about 487 × 461 cells, so each is a crop of the full square. The page draws the whole square.
- **Rendering in the book:** every finest whey cell carries one small cross (merging into gray at coarse scales — eddies dead at earlier stages read as solid gray blocks); curd in a percolating contact cluster (touching both top and bottom) is left white; all other contact clusters are solid black. The page reproduces this, drawing the crosses once a cell is at least 7 px on screen.
- **One stacking serves every N** (Plate 223's caption): each eddy's 25 subeddies are stacked in random order once and the top 25 − N are grayed away, so the five curds are nested. Implemented as M(cell) = max stack rank along the ancestry; curd at threshold N is M < N.
- **Plate 220 is a splice** of two prints of the same seed: N = 24 in the lower-right corner, N = 22 elsewhere, divided by a diagonal seam measured at 600 dpi from 0.571 of the width (bottom edge) to 0.742 of the height from the bottom (right edge). The pale diagonal "line" in the scan is the splice seam, not a drawn stroke. The preset reproduces the splice at those fractions.
- **The captions' percolation claims hold for this model at stage 4:** over 60 seeds none percolated at N ≤ 16, two at N = 18 ("a few seeds percolate already"), 51 at N = 19. The default seed (1982) matches the book's seed behaviour: percolation at N ≥ 19 only.
- **The three largest printed dimensions are arithmetically wrong in the book.** The caption's own formula D = log N/log 5 gives 1.9746 (N = 24), 1.9203 (N = 22), 1.8295 (N = 19), but the book prints 1.9973, 1.9426, 1.8505; for N = 16 and 13 the printed 1.7227 and 1.5936 are exact. No alternative reading tried (canonical p, other r, other N) reproduces the printed three. The page shows computed values and notes the discrepancy.

**Canonical curdling (pages 210–212, concept).**
- Rows drawn in the style of Plate 80. Sub-pixel rows deposit true ink coverage per pixel column (the sub-pixel dust lesson). The extinction probability readout is the smallest root of q = (1 − p + pq)^b, by iteration; q = 1 exactly when ⟨N⟩ = pb ≤ 1, Bienaymé's alternative.

## Part VIII, chapter 24 (Plates 228–231, page chains-and-squigs)

**Plate 228, random Koch coastline (D = log 18/log 6 ≈ 1.6131).**
- Both caption-box generators were decoded exactly at 600 dpi (dot centres snapped to the lattice, max residual 0.16 of a step; every edge confirmed against ink). They visit the same 19 lattice points with 18 unit steps on b = 6.
- The second generator is identical to Plate 53's, already in quadric-islands.
- The first is deliberately disconnected: a 12-step path plus a closed 6-edge ring (the 2×1 rectangle above the midline). The ring is what spawns the plate's satellite islands, which then spawn their own.
- The random mixture (a fair coin per interval per stage) was checked exactly on the integer lattice for 20 seeds to stage 3: no vertex is ever visited twice, so the mixture is self-avoiding and islands never touch the coast.
- The square initiator and the even coin are reconstructions; the caption gives neither, only that the initiator's symmetries stay visible.

**Plate 229, random Peano curve (N = 4, r = 1/2, D = 2).**
- Generator read from the box: (0,0) → (1/4, √3/4) → (3/4, √3/4) → (1/2, 0) → (1,0) — up the left side of the interval's equilateral triangle, across, down to the base midpoint, out. The flipped form is its mirror through the perpendicular bisector (equivalently: the two focal points are point-symmetric through the interval's midpoint, which is the caption's "distribution symmetric with respect to the midpoint").
- Each interval carries a shelter triangle (u, v, f); straight visits corner-u, corner-f, middle, corner-v; flipped visits corner-u, middle, corner-f, corner-v. Both keep the children inside the shelter, so shelters tile and the limit sweeps the triangle.
- The caption-box second stage is the deterministic alternation (flipped, straight, flipped, straight along the teragon, the initiator itself straight): reproduced to 0.0 px mean distance at 600 dpi after scoring all 16 form combinations.
- **The full plate is a reconstruction in regime.** The printed sweep wanders outside its triangle: the apex sits ~14% above the equilateral point and the left edge bulges out ~9%, which no within-shelter rule can produce; free re-tossing of shelter sides at every stage (tried in several variants) wanders far too much. The page's "wandering" regime (confined for stages 0–1, shelter side re-tossed from stage 2 on) reproduces the plate's silhouette and texture; "in the triangle" is the cleanest rule fitting both caption diagrams. Logged as undetermined by the caption.
- The spiky rendering follows the caption's detour rule — each interval drawn through the centre of its shelter — with every stage's detour points kept (between the 2nd and 3rd child of their interval). Keeping them is what produces the plate's long multi-scale slivers; the caption's one line does not say either way.

**Plate 230, triangle and squig curve (D = log 2.5/log 2 ≈ 1.3219).**
- Refinement decoded from the text: halve every interface (shared side) and keep one half at random; within a link the subchain is then forced — 1 subtriangle when the kept halves meet at a corner (probability 1/4), 3 otherwise (3/4), mean 2.5, matching the caption's numbers exactly (verified over 10 stages: ratio ≈ 1:3, growth ≈ 2.5).
- The plate's superposition-in-grays is reproduced at one scale (the print enlarges stages 6–10; the page zooms instead). Entry through the left side, exit through the base; the printed sample's own entry/exit and seed are not recoverable.
- The asymmetric squig (text, not plate): with "left" judged by an observer looking downstream, D = log(3 − p² − (1−p)²)/log 2; the page's bias slider implements this convention and says so.
- The branching-squig river tree (the text figure on page 227, no plate number) is built by outlets: each triangle drains across one side; the kept half of the outlet decides which subtriangle inherits it, the rest drain inward, fully determined, as the text says.

**Plate 231, hexa-squig coastline (D ≈ 4/3).**
- Initiator: the ring of six triangles around the hexagon's centre; the six radial sides are the cyclic interfaces; refinement identical to Plate 230's, cyclically. The loop stays self-avoiding by construction.
- Drawn as the print: hexagon in ink, the loop's interior in paper. Matched statistically with the seed shown; the printed sample's seed is not recoverable.

## Part VIII, chapter 25

**Plate 241, a sample random walk and its zeroset.**
- The printed figures are Feller's (reproduced from Feller 1950, Wiley, in copyright), and Feller called them "atypical", selected over wilder-looking samples. The page simulates fresh 10,000-toss games from a seed instead: a statistical match, never a copy.
- Measured from the scan at 600 dpi: the two lower panels plot a dot about every 20 tosses (median dot spacing ≈ 14 px at ≈ 0.65 px/toss), not the caption's "data at intervals of 200 tosses". The page plots every 20th toss and notes the discrepancy.
- Panel arrangement as printed: tosses 0–550 one by one on top; then the whole record in two rows (0–6,000 and 6,000–10,000) with time compressed tenfold and heights by √10, the walk's self-affine ratio. The penny scale is auto-fitted to the sample.
- Zero-gap law checked: Pr(U > u) across 200 games of 10,000 tosses fits slope −0.57 over u in [4, 512] against the asymptotic −1/2 (finite-size steepening); shown as a live readout.

**Pages 233–234, the Brown trail as a randomized Peano curve.**
- The book's example midpoint rule, "the parity of k", works out as the parity of i + k (i the side's index along the curve, k the stage): that choice reproduces the Pólya sweep vertex for vertex (checked against `genFromCodes` with codes [1, 3] through stage 10). The parity of k alone folds the teragon onto itself degenerately.
- All four rules on the page keep E|ΔM|² = Δt/4 (transversal h = √Δt/2; isotropic Gaussian per-coordinate sd √(Δt/8)), so the Pythagorean identity holds exactly for the transversal rules and in the mean for the Gaussian one; the page shows the measured ratio.
- The book draws no figure for this construction; the page's figure follows its recipe and says so.

**Plates 242–243, Brown hulls and islands.**
- The walk is the book's own downsized lattice walk: (X+Y)/√2 and (X−Y)/√2 each move ±1 per step, so P(t) steps to a 4-neighbour. The loop of Plate 243 deals each diagonal coordinate an equal number of +1 and −1 steps, shuffled — a uniformly random closed walk, back at its start.
- Hull, gaps and boundary are classified on the raster by flood-filling the exterior from the border (4-connectivity): Plate 242 is the hull silhouette (trail plus gaps, solid black); Plate 243 is the loop as a net, trail black and gap tremas gray. The raster is sized to the walk's bounding box; the book drew 200,000 steps on (1,200)².
- Checked numerically at 200,000 steps: the boundary's box dimension comes out 1.26–1.32 against the conjectured 4/3 (proved by Lawler, Schramm & Werner 2001 — noted on the page), and the caption's G-length vs G-area test gives slope ≈ 0.68 against D/2 = 2/3. Both run live per sample as readouts.

## Part VIII, chapters 23–26

**Chapter 26, random midpoint displacement (page `midpoint-displacement`).**
- **The displacement formula** 2^(−2(k+1)/D) − 2^(−2(k/D+1)) is the Koch geometry d² = L′² − (L/2)² with nominal side L_k = 2^(−k/D). Checked: with sides alternating by stage and D = log 4/log 3 the deterministic rule reproduces the triadic Koch curve exactly (stage-2 points land on 0, 1/3, (1/2, √3/6), 2/3, 1; verified numerically to stage 8, zero crossings); with a constant side at D = 2 it gives Lévy's C curve.
- **Normalization.** The randomized plane curve uses an isotropic 2D Gaussian whose *total* mean square equals the formula, so ⟨|ΔB*|²⟩ = Δt^(2H) summed over both coordinates; the Peano–Brown case D = 2 is then Brownian motion with E|ΔB|² = Δt (not Δt per coordinate).
- **Line construction.** Midpoint offset variance 2^(−2Hk)(2^(−2H) − 1/4) gives ⟨ΔX²⟩ = Δt^(2H) on dyadic intervals exactly (Monte Carlo agrees to <1%). Over half-slid windows the measured mean square is smaller — at H = 0.85, Δt = 1/32 the ratio is ≈ 0.88 — sitting between the book's lower bound 2^(1−2H) ≈ 0.62 and 1, as the text claims. The page measures this live over 4,000 curves.
- **Strata.** The book fixes the Poisson rates b^k but never the amplitude of a stratum's values; the page uses b^(−Hk), the choice that matches the midpoint scheme stage for stage. Flagged as a reconstruction on the page.
- **Plate 246, the computer bug.** This plate cannot be recomputed: the program and its bug are not recorded anywhere, and the caption itself says "this order is hidden, and no other order is apparent". The caption does say the corrected program's output became Plates 306–309 (chapter 33's round tremas). The page therefore has no "Show Plate 246 as printed" preset — the only plate on the site without one — and shows instead the strict order the program was meant to draw (round tremas, Nr(> u) ∝ u⁻²) and a deliberately invented bug (a pen that lags along each ray from the centre), labelled as a stand-in, not a reconstruction. Tracker kind set to "random / art".

## Part IX, chapter 27

**Plate 255, fractional Brown trails.**
- A random plate: the book's trails came from Mandelbrot & Wallis's 1969 program and an unrecorded seed, so the page matches the plate statistically, never stroke for stroke.
- The noise is exact fractional Gaussian noise by circulant embedding (Davies & Harte 1987), not the periodic fast-Fourier shortcut the chapter criticizes on page 251. The increments' covariance is exact at every lag; the delta variance was checked against |Δt|^2H at lags 1–64 (within 2% at H = 0.9, 0.7, 0.5).
- As in the plate, one Gaussian draw is reused across every H, so the two panels (H = 0.9 and 0.7) share a seed and the trail deforms coherently as H moves. The default seed (2) was picked from twelve candidates for its resemblance to the printed pair; the book's step count is unknown, and the page draws 4,096 steps.
- **Hurst's R/S** is fitted over spans d ≥ 64, but near H = 1 the measured slope still sits low: on exact fGn with true H = 0.9 at 8,192 samples the estimator reads 0.844 ± 0.043 (20 runs; 0.682 ± 0.041 at H = 0.7, 0.530 ± 0.027 at H = 0.5). That is a bias of R/S, said on the page, not an error in the noise.
- **The spectrum** (log-binned periodogram of the increments) matches the theory β = 2H − 1 closely: measured β ≈ 0.79 against 0.80 at H = 0.9.

## Part IX, chapter 28

All six plate groups are random (`random`/`render`), so they are matched statistically, never pixel for pixel; every figure is a fresh simulation with its seed on display (default 1975). Fractional Brown surfaces are synthesized spectrally — white complex Gaussian noise filtered to density k^-(2H+2), inverse FFT over a 256-period, central crop — which is the book's own shortcut for Plates 264 to 267 ("a periodic function computed by fast Fourier methods, then cropped"). The book made Plates 268, 270 and 271 by a Poisson (fault) approximation instead; the pages say so and match statistics only. Surface D = 3 - H, coastline and vertical-section D = 2 - H throughout.

**Plates 264-265, Brown lake landscapes.**
- The caption states only the ends, "D ~ 2.1 to D = 5/2, proceeding clockwise" (265 top, 265 bottom, 264 bottom, 264 top); the middle figures' D = 2.2333 and 2.3667 are evenly interpolated — a guess, flagged on the page.
- Lighting from 60° over the left and the viewer 25° over the base level are from the caption. The light is tipped slightly toward the viewer (y-component 0.16 before normalising) so depth-facing slopes shade too; a strict side light left vertical stripes.
- Sea level (30% of the grid under water), the vertical scale (0.057 of the width per unit sd) and the gradient scale used for shading (0.8 of geometric) are fitted by eye to the plates.
- The synthesized field is periodic, so the crop starts on the row whose leading block is lowest: the viewer looks over low foreground into the massif, as printed, and the block's front face (drawn in solid ink down to the frame, like the plates' black foreground) stays shallow.

**Plates 266-267, Brown coastlines.**
- Land in solid ink above sea level; the field is bilinearly upsampled 4x before thresholding so coasts curve instead of stair-stepping.
- The captions give no sea level; the default (28% land) is fitted by eye. Island counts ignore specks under 3 grid cells.
- Checked: at D >= 5/2 the ocean visibly splits into roundish seas and the islands string, as the caption claims; at 7/3 the effect fades.

**Plate 268, contour lines.**
- Top D ~ 1.3333 and bottom D ~ 1.1667 (coastline), same program and seed, per the caption. H = 2 - D.
- "The side of a huge mountain": a linear slope added down the frame. Its size (5 sd across the frame) and the three contour levels (0 bold, ±1.1 sd at the default slope) are fitted to read like the plate; the caption only says the figures combine "two or three contour lines (the bold lines being coastlines)".

**Plate 269, Brownian Pangaea.**
- Lévy's Bo(P) is built from random great-circle step faults (sign ± across a random great circle), which converges to his definition as the integral of white Gaussian noise over the hemisphere centred at P; 1600 faults on a 121 x 241 grid by default.
- Sea level puts 75% of the sphere's area (cos-weighted) under water, per the caption. Coastline D = 3/2.
- The map is rotated so the land's centroid sits at the Hammer map's centre (latitude 15° N) — the plate frames its Pangaea centrally, and an uncentred sample usually straddles the ±180° seam. A presentation choice, not part of the model. Graticule every 30°, drawn under the land.

**Plate 270, the first Brown coastlines.**
- The caption names "near 1", 1.3000, 3/2 and "closer to 2"; the end panels use D = 1.1 and 1.8 — a choice, flagged on the page.
- One seed for all four panels ("the same programs and seed" family style); panel heights follow the print's unequal panels; land shares 3.5 / 9 / 24 / 42% fitted by eye, since no sea levels are stated (with a fixed threshold on a normalised Gaussian field the land share would not grow with D, but in the print it clearly does).

**Plate 271, fractional Brown islands.**
- D = 2.3000 (H = 0.7) from the caption; six views of one island, sea level falling. The six levels (97.5% to 68% of the sheet under water) are fitted by eye.
- Drawn as the CRT drew it: white raster rows on black, hidden lines removed with a per-column horizon buffer, no simulated side lighting (the caption notes none was needed). The sea rows are the flat raster that "shimmers toward the horizon".
- The relief is tapered toward the sheet's centre (-1.1 r² in sd units) so the island emerges in view rather than at an edge — a presentation choice, flagged on the page.

### Open questions (chapter 28)

- Plates 264-265: can the two middle landscapes' D be pinned from the print (e.g., by variogram of the skyline)? The page interpolates.
- Plate 270: the growing land share down the page suggests the originals did not renormalise variance per D, or chose sea levels per panel; worth a look if the original programs ever surface.

## Part IX, chapter 29

**Chapter 29, "The areas of islands, lakes, and cups" (pages 272–276): no plates.**
- Checked against the scan page by page: all five pages are running text, with no figure, plate or caption box. The tracker's plate inventory for part IX (which ends at page 271) is correct.
- The chapter's concepts went on the "Concepts without a plate" list: Korčak's law for island areas (Pr(A > a) = F·a⁻ᴮ, with 2B = D extended from Koch coastlines to Brown zerosets), the asymmetry between islands, deadvalleys and lakes, cups and the Devil's terraces (the filled relief B\*ₕ, whose vertical cut is a Lévy devil's staircase — the book points to Plates 286–287 in chapter 31), rivers and watersheds losing their symmetry once altitude exists, and the eroded Brown model B\*ₕ with dimension between 2 and 3 − H.
- If a page is ever built for these ideas, the natural home is with chapter 31's Lévy staircases (Plates 286–287): the one-dimensional cup construction — fill every dip of a Brown line-to-line function to its brim — is exactly the staircase those plates draw.

## The colour signature (plates C1–C16) and chapter 30

**Plates C1, C3, C16 (art).** Discussed on the `color-plates` page with links to the holding collections (ÖNB codex 2554; the Royal Collection's deluge drawings; Hokusai's Great Wave); nothing is reproduced, per the project's copyright rule.

**Plate C5, the self-squared dragon.**
- The caption gives λ only as "~1.64 + .96i" (checked on the 600 dpi crop). At exactly 1.64 + 0.96i the critical point z = 1/2 escapes, so there is no attracting cycle and no "stones": the tilde matters. The page shows this as the "as the caption prints it" preset, shaded by escape time.
- The page's λ = 1.6461826781 + 0.9636567466i is the superattracting centre (f₂₅(½) = ½, found by Newton's method over a seeded grid) of a period-25 component near the printed value. Among the two dozen such centres within |Δλ| < 0.08, it is one of the few whose 25-cycle clusters into 5 bunches of 5 (a satellite of the period-5 component at 1.6776 + 0.9885i, which the caption's "5 genera, each made up of 5 species" requires), and the only one of those whose rendered dragon reproduces the plate's smooth multi-armed spirals; the others are dendritic. This is a fit, and the page says so.
- Stones are classified by iterating until the orbit lands within 10⁻⁴ of a cycle point at an iteration count divisible by 25: landing on point m at step n means the pixel's f₂₅ₙ-limit is cycle point (m − n) mod 25.
- Colour mapping: a genus = a bunch (cycle index mod 5, after rotating the index so the critical point's class is 0). The five cycle points of one bunch string along one stretch of the body and their stones meet at a wasp's waist; gold on the critical bunch reproduces the plate's golden main body. The species shade is the index div 5. Mapping genus to index div 5 instead scatters the hues, which contradicts the plate.

**Plate C7, the self-inverse patchwork.**
- The caption's diagram was measured at 600 dpi (line and circle fits): lines x = ±1, y = ±0.7 in units of the rectangle's half-width; circles of radius 0.600 centred on the long lines at (0, ±0.7); side circles of radius ≈ 0.65 centred on the short lines at (±1, 0).
- The raw measurements do not form a discrete group (adjacent circles would cross at ≈ 25°, no π/n), and rendering them gives mush. The plate resolves it: around every white hub the discs accumulate in unending concentric rings — a parabolic point, not a 2n-petal rosette — so adjacent circles are tangent. Side radius = √(1 + 0.7²) − 0.6 ≈ 0.6207, within 4% of the schematic diagram and within the plate's own measurement error.
- The 6 Γ-circles follow exactly from "orthogonal to 3 of the 8 shapes": medallion pair at (±x, 0), x = (1 − B² − r₂² + r₁²)/2 ≈ 0.2424, r ≈ 0.4345 (orthogonal to both long-line circles and one side circle); corners at (±x₀, ±0.7), x₀ = (1 + B² + r₁² − r₂²)/2 ≈ 0.7324, r ≈ 0.42 (orthogonal to one line and two circles). A least-squares fit of the measured plate discs against this model agrees to about 1.5% of scale.
- The plate is printed turned 90° from the diagram, cropped roughly to a square centred on the red medallion disc. The six cloth colours are sampled from the print (medallion red and green; corners blue, yellow, orange, pink); overlaps are drawn with multiply blending, the "transparent cloth" of the caption.
- The page enumerates disc images breadth-first with the dedupe key rounded to ~10⁻⁴ (float noise otherwise duplicates orbits), pruned by on-screen radius.

**Plates C9–C15, the landscapes (`fractal-landscapes` page).**
- Random/render kind: matched statistically with visible seeds, never pixel for pixel; the book doesn't give Voss's seeds.
- Fields are spectrally synthesised (the "numerical Fourier methods" of C15's caption): Gaussian spectrum with amplitude |k|^−(H+1) on a periodic grid. Verified in node at 512²: delta-variance slope/2 ≈ 0.39/0.53/0.77 for H = 1/3, 1/2, 0.8, and coastline dimension by coarsening rulers 1.59–1.61/1.46–1.47/1.24–1.25 against theory 2 − H = 5/3, 3/2, 1.2.
- **Measuring level sets: count crossings at coarsened rulers, not boxes.** Box-covering the pixel-resolution isotherm underestimates D badly (1.25 where theory says 5/3); sampling the field at every s-th grid point and counting sign-change cells recovers it. Chapters that measure coastlines on random fields should reuse this.
- The perspective view follows C11's caption: altitudes on a square grid, flooded flats, the base "rolled around a cylinder" (parallel projection with a droop toward the horizon), lit from 60° over the left. The hypsometric ramp is Times-Atlas-like, per the C9 caption's story.
- C13: same D everywhere, altitude above the valley floor raised to a power; γ = 3 is the caption's cube, the mesa preset's γ = 0.35 is fitted by eye (the caption only says "below 1").
- C9: the planet is the chapter-28 fault model (random great circles, each lifting a hemisphere), sea by quantile; the foreground is a cubed Brown relief per C13's caption. The composition and colours follow the plate; the printed foreground's crater-pocked texture comes from Voss's renderer and is not reproduced. Loosest reconstruction of the set, and flagged on the page.
- Preset seeds were chosen by comparing compositions against the scans (C11: seed 5).

**Chapter 30 (`isothermal-surfaces` page).** No plates of its own (it explains Plates 10–11, which stay with Part I in the tracker). The page builds the chapter's ladder of dimensions — isosurface 3 − H, planar isotherm 2 − H, graph of a linear section 2 − H, zero-set 1 − H — on a planar section with H = 1/3 (Kolmogorov), 1/2 (Burgers), 3/4 (the persistent contrast of Plate 10), with a live ruler-count of the drawn isotherm. The linear section is the first row of the same field.

**Tracker bookkeeping.** Part IX's heading now reads "chapters 27–30": the running heads on pages 278–279 put chapter 30 in Part IX ("FRACTIONAL BROWN FRACTALS ⁂ IX"), and the old "27–29" left chapter 30 shelfless. `tools/build.py` learned to shelve colour-plate pages (plates matching C + digit) under the colour-signature section of the index instead of a numbered chapter range.

## Part X, chapter 31 (linear Lévy dusts, Plates 285–287, page linear-levy-dusts)

**The chapter's trema law, and the page's engine.**
- The construction follows the text: tremas are Poisson, the number centered per unit length with length above u is (1 − Dt)/u, and the survivors form a Lévy dust of D = max(Dt, 0). Implemented rank-wise as on the disc-tremas page: trema p has length κ/p with κ = (1 − Dt)·(sampled length), centers from a per-rank hash, so the sample holds still while Dt and the cutoff vary. The falling-threshold cascade (ε dividing by 3 per row, drawn like Plate 80's bar) and the Lévy-against-Cantor comparison (N = 2, r = 2^(−1/D)) are the page's own illustrations — the chapter prints no figure for the construction itself.

**Plate 285, random streets.**
- Random; matched statistically, seed exposed (page seed 8). The caption gives no numbers, so the street law is the chapter's trema law carried to the plane: street p is an infinite strip of width κ/p, κ = (2 − D)·(range of line offsets) — the strip analogue of Plates 306–309's disc areas, since the offset measure that lets a strip cover a point is its width. A point then survives the widths in (w_min, w_max) with probability (w_min/w_max)^(2−D), so the blocks have dimension D, and a transect holds a Lévy dust of D − 1, as the caption claims.
- Fitted to the scan: the printed figure's frame is 1.366 : 1 with ink share 0.268 at 600 dpi; D = 1.94 with streets cut at the print grain reproduces it (widest street κ ≈ 0.1 of frame height — the plate's one dominant band — and ≈ 250 streets at print resolution).
- The line-cut view (survivors of a horizontal transect, drawn as a dust bar) is the page's own illustration of the caption's "intersection by an arbitrary line".

**Plates 286–287, Lévy staircases.**
- Random; the caption's recipe verbatim: Δy = .002 (500 risers), each abscissa jump with Pr(ΔX > u) = u^(−D) for u ≥ 1, rescaled to end at (1, 1) — the same pareto() as chapter 32's subordinators. Presets D = .9, .3, .6309 with seeds 2, 21 and 56, chosen so the silhouette statistics (largest tread's share, count of visible treads, first riser's abscissa) sit near the printed ones; the samples themselves cannot be recovered.
- Treads sum to the full width and risers to the full height, so the graph's length is exactly 2 at every Δy and its dimension is 1 — the caption's "dimension 1", checked in closed form. The risers'-abscissas tick bar, and the Δy = 1/100 and 1/2500 settings, are the page's additions.

## Part X, chapter 32 (spatial Lévy dusts, Plates 293–300)

**Plate 293, the computer "bug" as artist, opus 2.**
- The plate is the output of the program behind Plate 69 with an unrecorded bug, so it cannot be reproduced; treated as `art`. The page runs the same program — the 13-interval snowflake sweep in Plate 69's large-circle rule (S, F, F, no swap), one side filled — and lets the reader plant a bug (flip the mirror and/or the direction of chosen legs' copies). This is an homage, flagged on the page.

**Plate 295, nonrandom subordination.**
- Decoded exactly. The construction is Plate 49's generator (b = 4, N = 8, D = 3/2) with each leg cut in the middle: 16 children of ratio 1/16 — the two end quarters of each leg, all forward, none mirrored or reversed — so N = 16, r = 1/16, D = 1. Subordinator dimension log 16/log 64 = 2/3 (a piece of spatial scale 1/16 takes time (1/16)^{3/2} = 1/64).
- The printed plate is the stage-2 dust: its 137 marks are the stage-2 pieces clustered at the 9 generator corners of each stage-1 piece, with the 7 interior corners shared between neighbouring pieces (16 × 9 − 7 = 137). Fitted with scale and translation only (unit length = 3642 px at 600 dpi): every mark sits on the computed stage-3 dust to 1.2 px mean.
- The caption's gap law Nr(G ≥ u) ∝ u⁻¹ was verified numerically (fitted exponent −1.0 on the stage-4 gaps; shown in the page's readout).

**Plates 296–297, Lévy flight, D = 1.26.**
- Random; matched statistically with exposed seeds. One 3-D flight (two independent halves from the origin, jump law Pr(U>u) = u^(−D) with cutoff u = 1), projected on the x–y plane (296) and the x–z plane (297). Stopover panels use the caption's grid-cell rendering (mark cells holding ≥ 1 stopover) in negative. The page fits log M(R) against log R around the origin as a live check of M(R) ∝ R^D.

**Plate 298, decrease of D by subordination.**
- A planar Brownian walk of 2²⁰ steps, decimated by successive Lévy subordinators of dimension α = 2^(−1/6) ≈ 0.89, each riding on its predecessor, giving D = 1.78 … 0.89 — the plate's seven panels as seven states of one seeded experiment. Kept counts scale as N^(α^k), as expected. The Lévy staircase inset (time of the previous dust against kept points, filled below) reproduces the plate's black terraced silhouettes.

**Plate 299, zooming toward a Lévy dust.**
- A planar flight with D = 1.26; windows divide by b = 3 between views, centred on the flight's origin (a point of the dust — a window centred on the cluster's centroid can go empty under deep zoom; the book's "center of the cluster" was read this way). Default 2 × 10⁶ positions against the book's 12.5 × 10⁶, with 8 × 10⁶ available; noted on the page. About 3^(−1.26) ≈ 1/4 of the stopovers survive each step, as observed.

**Plate 300, circumnavigation.**
- One 3-D flight with D = 1.3, orthographic projection turning about the vertical axis through the cluster's centroid; the strip's seven views are azimuth steps of 360°/7. The printed sample cannot be recovered; the seed is fixed but arbitrary.

**Rendering.**
- Millions of stopovers draw fast by writing grid cells straight into an ImageData (background and ink together, put with a dirty rect so panels can share a canvas); a Path2D of dots would not keep up. The full redraw stays in the pan-and-zoom snapshot rhythm.

## Part X, chapter 33

**Plates 306–309, disc tremas.**
- **The construction is the caption's rank law.** Trema p is a disc of area K(2−D)/p with centers uniform. Tying K to the sampled area A by K = C·A/2, C = 2−D, this is the text's model Nr(area > a) = C/(2a) per unit area. The four plates are C = 0.01, 0.1 (tremas white, remainder black) and 0.25, 0.5 (tremas black, remainder white).
- **Verified on the scan.** In Plate 306 at 300 dpi, white blob area × rank holds near one constant (~15,000 px²) from rank 2 past rank 250 (rank 1 is a margin strip; overlaps merge blobs). The measured black/white shares of all four plates sit in the band the model predicts at print resolution (about 96–98% black for 306, ~2/3 for 307; white ~30% in 308, ~1.4% in 309).
- **Random plates.** Matched statistically, never dot for dot; the seed is exposed. Page seeds: 13 (Plates 306–307), 4 (308–309), 7 (the Moon sweep).
- **Engine.** Centers come from a per-rank integer hash, so disc p is reproducible and independent of C — the page's sweep section keeps the seed invariant and varies C, as page 303 prescribes. Centers are sampled in the window plus a margin equal to the largest radius (capped at one frame height); discs under half a screen pixel are omitted and the rank walk is capped at 7×10⁶, so deep zooms stay sane. Like the book's own figures, the window is cut from the larger sampled region.
- **Seed-to-seed swings.** The surviving share of one window is decided by the few window-sized tremas and ranges from zero to over 1% at C = 0.8 across seeds; only the seed-average follows exp(−(C/2)·H_P), H_P the harmonic sum over drawn ranks. First measured as an apparent bug (hash scatter passed every dispersion test; a Math.random control reproduced the swing).
- **Caption typo.** The caption of Plates 308–309 reads "proceeds as in Plates 307 and 308"; it means 306 and 307, and the page says so.

## Part X, chapter 34

**Plate 318, carpets' lacunarity.**
- Both generators were read from the caption box at 600 dpi: a 7×7 grid with 9 cells removed — on the left the central 3×3 block, on the right the nine cells at rows and columns {1, 3, 5} (0-indexed from the top left). Both keep N = 40, so D = log 40/log 7 ≈ 1.8957.
- The printed figures are stage 2 of each generator. Rendered and fitted over the scan, both agree with the book in all 2,401 (49×49) cells — an exact match, nothing reconstructed.
- The page's carpets draw from cached exact-occupancy images (stages 1–3, one image pixel per cell), upscaled with smoothing off so zoomed cells stay crisp squares; detail finer than a pixel is dimmed by its area share, 40/49 per missing stage (the carpet analogue of the sub-pixel dust rule).
- **Mid-line dusts.** The chapter's "horizontal mid section" examples (the text says "gasket" but means these carpets) are Cantor dusts with N = 4, r = 1/7: left keeps columns {0, 1, 5, 6} (clumped, one gap of 3/7), right {0, 2, 4, 6} (spread, three gaps of 1/7). The book draws them only inside the carpets; the bar-by-stages figure follows Plate 80's convention.
- **Measures.** The gap-census and mass-in-window figures are this page's illustrations of the text (the book draws no charts). Census prefactors fitted through the stairs' corners: F ≈ 0.351 clumped against 0.546 spread — lacunarity up, prefactor down, as the chapter claims. Exact curiosity, verified numerically: with the book's window 2R = 2/7 the spread dust's window mass is identically 1/4 (zero variance; the {0,2,4,6} generator splits any half of a cell into equal mass), while the clumped dust's ranges 0 to 1/2, confirming the text's "from 0 to 1/2" (the OCR's "4%" is ½).
- Succolarity is raised in the chapter but explicitly left unmeasured; the page says so rather than inventing a measure.

## Part X, chapter 35

**Plates 323 and 325, general tremas (page general-tremas).** Both are random plates, matched statistically.

- **The trema process.** Tremas are Poisson: centers uniform, number with area (volume) above u equal to (E − D)/(E·u) per unit area (volume), between an outer and an inner cutoff. A point then escapes every trema with probability (smallest scale/largest)^(E−D), which depends on the size law alone — El Hélou (1978), and the reason the generator's shape is a free parameter.
- **Plate 323.** Diamonds (L1 balls) of fixed aspect, isotropically rotated per page 321 ("isotropically oriented axes"). The book gives no numbers: the aspects (0.75 for "nearly a square", 0.02 for the needle), D = 1.5 and the area cutoffs (1/20 and 3·10⁻⁵ of the square) were fitted to the printed ink coverage. The caption's claim — identical expected white areas, different lacunarity — is shown live: white area by Monte Carlo, Λ = ⟨M²⟩/⟨M⟩² in boxes of 1/8, white components for the succolarity remark (needles dice the remainder).
- **Plate 325.** Mandelbrot states the plate's precise specification is lost, so the page reconstructs the caption's pipeline, not the picture: 600³ torus, tremas removed, origin moved to a non-removed lattice point, shell R2/1.5 < R ≤ R2 = 600 in brightness shells, each point jittered by [0,1]³, octant x,y,z > 0 through the Hammer projection into the "gothic ogive window". The nonspherical trema shape is our choice: ellipsoids with volume pinned to scale³ (flattened 10:3 default; needle and sphere options), volume pinning per page 320. Scales truncated to 600/2⁸ … 600/2 in octaves, density (3 − D)/r⁴ dr per unit volume. The origin search pre-screens 64³ blocks against the four coarsest octaves, which leans it toward dense regions — the caption allows exactly that. The antipodal octant re-uses the same tremas (same seed), as the caption suggests.
- **Computing the dust.** Testing every shell lattice point (8·10⁷) is hopeless; the page walks an octree, kills any cell whose 8 corners fall in one trema (ellipsoids are convex), carries each cell's reachable tremas down a flat stack, and only tests lattice points inside surviving leaves (~2·10⁶). A slab test across the ellipsoid's axis prunes flat tremas whose bounding spheres reach everything. Whole sky ≈ 1.5–5 s, spread over frames.

## Part XI, chapter 36 (lattice-physics page)

**Figure, p. 329, the spin automaton.**
- The text's rule — S(t, n) = −1 iff S(t−1, n−1) = S(t−1, n+1), started from a single +1 at n = 0 — reproduces the printed figure exactly: rows t = 0 to 13 in a fixed window |n| ≤ 13 (13 signs on even rows, 14 on odd; 189 signs in all, every one matching). The +'s are the odd binomial coefficients (Pascal's triangle mod 2, elementary automaton rule 90).
- Grid measured at 600 dpi, in units of the half-column spacing u: row pitch 1.664u; plus glyph 0.80u × 0.78u, minus 0.70u long, stroke 0.105u.
- Counting check behind D = log 3/log 2: row t carries 2^popcount(t) +'s, so the first 2^k rows hold exactly 3^k. The downsized view overlays the exact gasket (apex at the impurity, base corners (±T, −T)) on T rows of cells.

**The chapter's other sections have no figures in the book; those panels are reconstructions, each flagged on the page.**
- **"Strays by"** (two-kinds-of-convergence demo) is the one-sided Hausdorff distance from the new refinement to the previous one, sampled at an odd vertex step — every 4th vertex of a Koch stage *is* a previous-stage vertex, and sampling only those hides the distance entirely.
- **Self-avoiding walks** are sampled by the pivot algorithm (random joint, random lattice symmetry, keep when self-avoiding; the shorter arm is transformed). The ensemble fit over n = 48 … 768 (16 walks each) gives slope ≈ 0.77–0.79, D ≈ 1.25–1.30 — near, not on, the asymptotic 3/4 and 4/3; the page says so rather than forcing the number.
- **Rivers.** Leopold & Langbein's streams are self-avoiding walks with "various rather arbitrary decisions" against loops and snags, which the book does not specify. The page's streams erase any loop they close (loop-erased walks, dimension exactly 5/4, Hack exponent 5/8 = 0.625); the fit on 32²–64² grids wanders with the seed around 0.62–0.68, against Leopold & Langbein's 0.64. Drainage area and longest upstream length are computed leaves-up over the resulting forest; the fit uses cells draining ≥ 8 squares.

## Part XI, chapter 37

**Plate 340, original evidence for scaling in economics (cotton prices).**
- A `data` plate: six empirical tail curves of changes of log cotton price (a: daily, NY Cotton Exchange 1900–05; b: an index of daily closes 1944–58; c: monthly 1880–1940; + and − tails separately) and one theoretical curve, the symmetric Lévy stable tail of exponent D = 1.7.
- **Digitisation.** All 65 dots were taken from the 600 dpi scan by disk-erosion blob detection; the chain assignment to the six series was checked on a coloured overlay. Axis calibration from the tick marks: bottom (positive) scale .001 at x = 1146 px, 554 px per decade; y scale 1.0 at y = 396 px, 540 px per decade; the top (negative) scale sits exactly two decades right of the bottom one (shift 1109 px ≈ 2 × 554).
- **The printed curve is the stable tail.** Tracing its centerline and fitting a computed symmetric stable survival function gives α ≈ 1.68, scale 0.127, rms 0.009 in log10 F — consistent with a hand-drawn D = 1.7 curve (α fixed at 1.7 fits with scale 0.1305, rms 0.019). The page draws D = 1.7 at scale 0.1305 for "as printed".
- **One scale factor per series suffices**, as the caption claims: at D = 1.7 the fitted scales are a⁺ 0.0098 / a⁻ 0.0098, b⁺ 0.0042 / b⁻ 0.0043, c⁺ 0.0452 / c⁻ 0.0451 (rms 0.04–0.15 decades). The +/− scale asymmetry is tiny; the caption's "slight asymmetry" is in the shapes.
- **The plate prints the erroneous series a.** Pages 339–340 explain that the 1900–05 data behind curves (a) had been read incorrectly (corrected in Mandelbrot 1972b, where a ≈ b); the plate reproduces the 1963 original, so the page shows the misread dots and says so in its note.
- **Stable tail computation.** The page computes Pr(X > x) live by Nolan's integral for β = 0, α > 1, with panels split where λV(θ) crosses 120·0.6^k and 12-node Gauss–Legendre per panel; α = 2 uses erfc. Checked against scipy's levy_stable over α ∈ [1.05, 2]: worst relative error 2e-3 (at α = 1.999), ~1e-5 at α = 1.7. Dragging the curve is a pure horizontal translation in log–log, so the curve shape is cached per α and per-series fits are table lookups.
- **The simulations** (second section) are the page's own illustration — the book prints no figure for the chapter's argument. Stable draws by Chambers–Mallows–Stuck; the Brownian comparison record reuses the same (U, W) draws so the records coincide at D = 2.

## Part XI, chapter 38

**Chapter 38, scaling and power laws without geometry (page power-laws).**
- The chapter prints no plates — checked against the scan, pages 341–348 are text only — so this is a concept page: every figure is computed from the chapter's formulas, and the page says so in the dek, under each figure and in the source line. The tracker row is "(concept)".
- **Zipf prefactor.** The book stops at "approximating ρ through the average of its bounds" plus the normalization F⁻¹ = Σ(ρ + V)^(−1/D). Carrying the average through gives the closed form F = P₀·(V(N + 1)/2)^(1/D), with P₀ = 1 − Nr; the page uses it for the smooth law and labels it our own algebra. ΣP = P₀·Σ(Nr)ᵏ = 1 checks exactly.
- **Words as a dust.** The book's base-(N + 1) digit construction is the case r = 1/(N + 1). The tree figure generalizes to arbitrary r by giving the space a share 1 − Nr and each letter a share r of every live branch, which keeps D = log N/log(1/r) for every r. A reconstruction, flagged on the page.
- **Mixed bag (Mandelbrot 1963e).** The filters are our design: six datasets, each pooled from three batches scaled log-uniformly over ±1 decade; truths are Pareto D = 1.7 against lognormal σ = 1; the apparent tail slope is fitted between quantiles 0.8 and 0.99 of n = 8000 (fitting nearer the extreme order statistics drowned the effect in noise). Measured: the scaling truth's slopes stay within about ±0.1 of −1.7 across datasets and seeds; the lognormal's scatter over ≈0.6.
- **The parables check out.** Lake widths 1600·N^(−0.8) give D = 1/0.8 = 1.25, expected remaining width 5 miles and 5m after sailing m, as the text says; Lotka's D = 2 makes the expected future equal the past.
- **The salary pyramid.** The text's "exact pyramid (base equal to the square of the height)" is rendered as inverse income running down with each level's floor area equal to its head count, so the silhouette half-width grows like depth^(D/2) — straight-sided exactly at D = 2. Both axes are normalized independently to fit; our rendering choice, flagged on the page. The rank view's smooth curve is ρ = −V + (V(N + 1)/2)·U^(−D), the Zipf form with P₀ = 1.

## Part XI, chapter 39 (mathematical backup)

**The chapter has no plates.** All 42 scan pages (book 349–390) were rendered and checked: two-column
reference text throughout, nineteen alphabetical entries, not one figure. The page (mathematical-backup)
is therefore a concept page: every figure is the page's own illustration of an entry's formulas, and each
note says so. Formulas checked on the scan where the OCR mangled them: W₀(t) = (1−w²)^(−1/2) Σ₀^∞ wⁿ exp(2πibⁿt)
with w = b^(−H) = b^(D−2), and W₁(t) − W₁(0) = (1−w²)^(−1/2) Σ_{−∞}^{∞} wⁿ[exp(2πibⁿt) − 1] (pages 388–389 at 200 dpi).

- **Fractional Brown samples** are generated by circulant embedding (Davies–Harte), which gives the fGn
  increments their exact covariance; verified numerically (variance 1.00, lag-1 covariance matches
  2^(2H−1) − 1 across H). Not the book's own algorithm (the book warns every method must depend on the
  horizon T); chosen as the modern exact method, said on the page.
- **Stable densities** are computed by FFT inversion of the characteristic function in the standard S1
  parametrization, which reproduces the book's three closed forms exactly: Gauss at D = 2 (variance 2
  under this scale convention), Cauchy 1/π(1+x²) at D = 1, β = 0, and the Brown recurrence density
  (2π)^(−1/2) e^(−1/2x) x^(−3/2) at D = 1/2, β = 1 (checked to ≤ 2.4·10⁻³, the worst case being the
  steep Lévy peak). The addend demo verifies the entry's claim that the Cauchy conditional density
  bifurcates at |u| = 2. The D slider stops at 0.5 because the FFT grid needed below it gets huge.
- **Covering section:** the drawn cover is one ball per stage-n piece (centre of the piece's box, radius
  to its farthest point), which is a natural cover, not the provably minimal N(ρ); the page says so. The
  measure chart uses γ(d) = Γ(1/2)^d/Γ(1+d/2) via Lanczos; curves pivot exactly at D since Nρ^D is
  constant for these self-similar sets.
- **R/S:** blocks per lag, R from the bridge-detrended cumulative sum, S the block sd, J fitted through
  the means over lags 8–512. On 2,048 samples the fit runs a few hundredths high (white Gauss ≈ 0.55);
  the note flags this small-sample transient rather than hiding it. fGn gives J ≈ H, white Lévy
  (D = 1.5, infinite variance) gives J ≈ 1/2 — the robustness claim reproduced.
- **Weierstrass:** sums are cut only below a pixel's wavelength, so the rescale demo is exact:
  wᵐ[W₁(bᵐt) − W₁(0)] coincides with the unrescaled curve (checked to 3·10⁻³), while W₀ visibly fails —
  the IR-cutoff point of the entry. Graph D = 2 − H is labelled a conjecture as in the book (proved for
  integer b by Shen 2018). The Gauss-randomized variant multiplies coefficients by seeded complex
  Gaussians per the entry.
- **Split with chapter 41:** agreed between threads — the Weierstrass history (Bolzano, Riemann's sum,
  Gerver's point) lives on historical-sketches#weierstrass with one small historical figure; the
  mathematics (spectra, UV/IR catastrophes, W₁, randomized kin) lives here. The pages cross-link;
  this page's link goes live when historical-sketches merges.

## Part XII, chapter 40 (Biographical sketches)

- **A text chapter.** Pages 391–404 print no plates. The only artwork is Jean Effel's drawing on page 404 (dated January 30, 1964, reproduced in the book by his permission), kind `art`: described on the page, not reproduced.
- **The page's one figure is a timeline of the six sketched lives,** computed only from dates and ages printed in the chapter, with a calendar/age-aligned toggle. Dates the chapter gives directly: Bachelier 1870–1946, thesis defended March 19, 1900, the flawed construction 1913, English translation "sixty years later"; Fournier d'Albe 1868–1933, *Two New Worlds* 1907; Hurst 1880–1978, to Egypt 1906; Lévy 1886–1971, Fournier-universe rediscovery 1904; Richardson 1881–1953, *Weather Prediction* 1922, the wind-velocity paper 1926, the coastline paper 1961 (posthumous); Zipf 1902–1950, *Human Behavior* 1949. Years computed from an age the chapter gives are marked ≈ on the page: Bachelier's Dijon candidacy (Lévy's letter says "1928, give or take a year"), Hurst's papers at 71 and 75, Lévy's turn to probability near 40, his books at 50 and 60, his Académie seat when nearly 80, Richardson's doctorate at 47.
- **The whorls verse is quoted in full** (five lines, Richardson 1922, long out of copyright). The chapter stresses it parodies Swift, not De Morgan's little-fleas-have-greater-fleas variant, because Richardson believed only in a direct energy cascade; the page keeps that distinction.
- **Bachelier's error** is paraphrased, not transcribed: the OCR of Lévy's letter garbles the exponent (v = cτ to some negative power as the step τ shrinks), so the page says only that the zigzag's speed was held constant where it must grow as the steps shorten.

## Part XII, chapter 41 (Historical sketches)

**Chapter 41, historical sketches (pages 405–421).**
- The chapter is running text with no plates (checked page by page on the scan). The page is a concept page: the chapter's entries retold briefly, with three figures that are the site's own illustrations, flagged as such on the page — nothing reproduces printed artwork.
- **Lebesgue's bricks.** The chapter quotes the story from Hurewicz & Wallman 1941 but prints no figure; the running-bond paving is our choice of the standard one. Offset courses give at most 3 closed bricks at a point, aligned courses 4, and the probe counts closed bricks exactly by snapping taps to edges and corners.
- **Hyperbolic decay.** An illustration, not a data plot: von Schweidler's numbers (100-second intervals, 1.6 × 10⁷ seconds) are from the chapter's text, and no 1907 data was digitised. The mixture demo uses k log-spaced relaxation times weighted τ⁻ᵞ (the log-discretised gamma integral of the "distributed relaxation times" entry), scaled to the hyperbola by mean log offset over the measured band.
- **Weierstrass figure.** W(t) = Σ b⁻ⁿᴴ cos(2π bⁿt), normalised by Σ b⁻ⁿᴴ; box dimension of the graph 2 − H; nowhere differentiable for H ≤ 1 by Hardy 1916 (ab ≥ 1 with a = b⁻ᴴ). The H slider stops at 0.2 (D ≤ 1.8) because terms past frequency 10⁹ would lose cos() to floating-point error, and at smaller H the dropped tail would be visible. Riemann view draws the partial sum of Σ n⁻² sin(n²t) to n = min(9000, 2.5·px-per-unit); Gerver 1970: derivative −1/2 at t = πp/q with p, q odd (the marked point is t = π, R(π) = 0).
- **Topic split with chapter 39.** Agreed with the chapter-39 thread: this page keeps the Weierstrass *story* and a small historical figure; the mathematics (spectra, modified forms, kin) goes on mathematical-backup#weierstrass. No forward hyperlink from this page (it would be dead until that page merges); the chapter-39 PR may add the links both ways once both pages exist.
- Chapters 40 (biographical sketches) and 42 (epilog) are other threads' work; this page's tracker row covers only chapter 41.

## Update for the second printing (pages 458–468 and front matter, page second-printing)

**The plates, located.** The front matter holds three plates, one facing each of pages ii, viii and x (front-matter page = scan page − 4 in FGN-00): Plate II (quaternion render, "illustrates page 464"), Plate VIII (Julia set, "illustrates page 465") and Plate X (λ-map, "illustrates page 465"). Page i is the half-title, so no Plate I exists; the tracker's provisional "I" row was wrong. The red endpaper fractal inside the covers is uncaptioned and uncredited. Plate 467 sits between the references and the order form.

**Plate X, the λ-map of z → λ(z−1/z) — decoded.**
- The two clean arcs fit circles with r/R = 0.492 and internal tangency (both fits ≈ 0.9 px mean residual at 300 dpi): the unit circle and a disc of half its radius, tangent at a point that lies straight down in the print. So the plate is the λ-map turned 90°, +1 up; the page draws screen x = Im λ, screen y = Re λ, and the "as printed" preset is the fitted window Re λ ∈ [−1.085, 0.119], Im λ ∈ [−0.127, 1.053].
- Computed structure (critical orbit from z = i; the map is odd, so ±i give mirror orbits): everything escapes outside the unit circle; inside it, a disc |λ−½| < ½ where the orbit keeps 1 limit point, a disc |λ+½| < ½ with a 2-point limit cycle, period-4 discs centred near ±0.86i, and between them the corona of sprouted higher-period atoms on a dust of chaotic λ.
- The caption's "white disc |λ+i/2| < 1/2" is wrong as dynamics: λ = −0.4i has an 8-cycle and λ = 0.05−0.55i is chaotic, while λ = −½ has exactly the caption's 2 limit points. The caption read the disc's position off the turned print. Verified on the scan that the text really prints "i/2" (not a 1/2 OCR error).
- The print's colour rule, read off the plate (the fitted big discs identify which is which): paper = escape or exactly 2 limit points; ink = a limit cycle of any other size, the 1-limit-point disc included (its bottom bulge is the plate's top-left scalloped mass, fitted centre 0.466+0.000i); dust = no cycle found. The page reproduces that rule and offers a colour-by-cycle-size alternative.
- The period-4 disc fitted from the plate's big sprouted atom: centre 0.850i (fitted −0.008 ± 0.850i), radius ≈ 0.152.

**Plate VIII, the Julia set — a reconstruction in kind.** The plate shows basins in exactly three grays with star-chain boundaries, the signature of an attracting 3-cycle (no white: |λ| < 1, nothing escapes). The superstable period-3 values of this map (Newton on f³(i) = i) are 0.2213 ± 0.4834i and −0.4713 ± 0.8139i; the first family reproduces the plate's round three-shade domains and star chains, the second does not. The exact printed λ and window were searched for (coarse grid over window, rotation, mirror and shade permutation against a 72×72 shade classification of the scan) and not recovered — agreement peaked at 68% for every candidate, so the page uses λ = 0.2213+0.4834i and says the plate is matched in kind, not stroke for stroke. Basins are shaded by capture phase, (index − step) mod p, which is constant on each component.

**Plates II and 467, quaternions — stand-ins.** The book records no μ and no viewpoint; the caption says only that Plate 467 is "adapted from Norton 1982" with "a cycle of size 4". The page raymarches the distance estimate |q|·log|q| / (2|q′|) of q → q²−μ on the slice through (1, i, j). Preset 467: μ = 0.15652 − 1.03225i (complex section a dragon with an attracting 4-cycle; same swirled segments and belts as the print). Preset II: μ = 0.35 + 0.55i, chosen by eye for the plate's smooth heavy shape. Both are labelled stand-ins on the page.

**Page 461, the fracture diagrams — digitised at 600 dpi.**
- Axes calibrated from the inward ticks (210.7–215 px/decade on the spectrum, 190.5/190.8 on the slit-island plot, both consistent across axes).
- The spectrum's straight fit is a chain of dots with slope −1.768, i.e. D = (4 + slope)/2 = 1.116 against the printed label 1.118; the wiggly curve was traced as 81 column samples with the label region, the dotted verticals and the fitted line masked.
- The slit-island line runs (logP, logA) = (0.57, 0.01) → (3.99, 5.92), slope 1.724, D = 2/slope = 1.160 against the printed 1.164. 32 of the "+" markers were recovered (bar-filter cross detection); a refit of those gives D ≈ 1.13, but markers sitting on the line resist recovery, so the page draws the printed line and offers the refit as an option.
- All six Charpy squares recovered with their temperatures: (D, E) = (1.097, 164 J, 300°C), (1.161, 165, 315°C), (1.153, 139, 360°C), (1.163, 131, 340°C), (1.224, 85, 370°C), (1.280, 32, 430°C).
- **The chart's two energy axes disagree.** The joules ticks (50/100/150) and the ft-lb ticks (20…140) imply the same px-per-joule slope but zero points offset by ≈ 25 J. The page reads energies from the joules axis and notes the discrepancy.

**The rest of the update** prints no figures; its topics are mapped to the site's chapter pages in a closing section (turbulence → ch. 10/36, Lovejoy rain → ch. 12/37, earthquakes → ch. 28, batteries → ch. 12, percolation tests → ch. 13, low lacunarity → ch. 34, cellular automata → ch. 36, Douady–Hubbard and Ruelle → ch. 19).

## Open questions

- **The 13-interval generator.** Why does Plate 69's large circle use a different rule from the caption's second stage? This may be worth a sentence once the rest of chapter 7 is reviewed.
- **Plate 164's width schedule.** The per-stage widths were fitted as geometric decay, which matches the plate's large-scale structure but places the finest twigs only approximately. The true schedule (and whether the book's r is exactly 1/√2 there) is undetermined.
- **Plate 163 and criticality.** The printed trees sit 2–5% below our computed self-avoidance bound on r, furthest at θ = 90°. Either the 1982 computation of the critical value differed, or the figures were drawn deliberately on the safe side.
