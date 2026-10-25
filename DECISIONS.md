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
- **Layout shift.** Give readouts whose text length changes a fixed height. A caption that changed size moved the graph around.

- **Heavy random rasters: render once, blit while navigating.** Each of brown-relief's figures draws once per parameter change into an offscreen canvas covering a fixed world rectangle; the zoomable view only re-blits that canvas. Pan and zoom never recompute the field, and a random figure magnifies like the printed plate it stands for (its resolution is the simulation grid's).

## Foundation (shared library and site shell)

- **The shared library is the newest pages' code.** `src/shared/draw.js` and `geometry.js` are the plumbing of snow-sweeps and dragon-sweeps, verbatim; the older pages had drifted copies, and the newest were taken as canonical. The only widenings: `polyPath` takes peano's optional `upto`, `zoomable` takes `{ maxZoom, onTap }` and quadric's `z.ground` override, and `dimension` brackets [0.01, 8].
- **Checked against the published versions by canvas, not bytes.** After the move, every canvas on every page draws byte-identically to the published artifacts (hashes of `toDataURL`, 52 canvases; the one excluded is peano's travelling-salesman demo, which seeds random points). The three oldest pages reproduce their published HTML byte for byte through the template split.
- **Pages extend `PRINT` rather than redefine it.** quadric keeps its warmer red (`#c2552d`) and its light/dark/hatch inks as overrides; koch its sea/swamp/lake/wave; gosper its gain/loss/ground/lake/trace. Old zoom caps are kept as explicit `maxZoom` options (300 on peano and unequal, 1000 on quadric's Plate 54–55).
- **The three oldest pages are not on the library yet.** monkeys-tree, minkowski-sausage and wiener-sausage share almost nothing textual with the newer generation: their figures follow the page theme instead of staying printed paper, minkowski draws its band from a distance field keyed on the view, and all three share their own measuring-chart machinery with each other. Moving them is a rework of markup and behaviour, tracked in TRACKER.md, not a code move.
- **The site build wraps the artifact fragments.** Sources have no doctype, charset or viewport (the artifact service added them when the pages were published); `tools/build.py` adds the skeleton, the site bar (previous/next in book order) and the index with the plate finder, which parses the tables in TRACKER.md. `tools/check_build.py` now checks the committed `site/` by default; the pre-foundation artifacts rebuild byte for byte only from the import commit (`c05f120`).
- **The wrapper must also carry `[hidden] { display: none !important; }`.** The artifact service's stylesheet provided it; without it, any element whose class sets `display` (`.slider`, `.check`, `.key`, …) ignores its `hidden` attribute, which quietly broke show-and-hide controls on nine pages (first seen on peano-sweeps' "angle at the start" slider). The shell stylesheet in `tools/build.py` now provides it for every page; check the computed style, not the attribute, when testing visibility.

## Part II, chapters 5–8

**Plate 31, monkeys tree, and Plate 32, Minkowski sausage.**
- Both are computed from the generator. Nothing is traced.
- The sausage page measures length by the ε-neighbourhood area divided by 2ε.

**Wiener sausage (chapter 25 concept, page 32 method).**
- Brownian paths are simulated. The page explains why time scales as ε² and why squared displacements add.

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

## Open questions

- **The 13-interval generator.** Why does Plate 69's large circle use a different rule from the caption's second stage? This may be worth a sentence once the rest of chapter 7 is reviewed.
