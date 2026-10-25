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
- **Layout shift.** Give readouts whose text length changes a fixed height. A caption that changed size moved the graph around.

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

## Open questions

- **The 13-interval generator.** Why does Plate 69's large circle use a different rule from the caption's second stage? This may be worth a sentence once the rest of chapter 7 is reviewed.
