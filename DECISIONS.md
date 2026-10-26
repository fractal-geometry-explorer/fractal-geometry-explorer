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

## Part XII, chapter 40 (Biographical sketches)

- **A text chapter.** Pages 391–404 print no plates. The only artwork is Jean Effel's drawing on page 404 (dated January 30, 1964, reproduced in the book by his permission), kind `art`: described on the page, not reproduced.
- **The page's one figure is a timeline of the six sketched lives,** computed only from dates and ages printed in the chapter, with a calendar/age-aligned toggle. Dates the chapter gives directly: Bachelier 1870–1946, thesis defended March 19, 1900, the flawed construction 1913, English translation "sixty years later"; Fournier d'Albe 1868–1933, *Two New Worlds* 1907; Hurst 1880–1978, to Egypt 1906; Lévy 1886–1971, Fournier-universe rediscovery 1904; Richardson 1881–1953, *Weather Prediction* 1922, the wind-velocity paper 1926, the coastline paper 1961 (posthumous); Zipf 1902–1950, *Human Behavior* 1949. Years computed from an age the chapter gives are marked ≈ on the page: Bachelier's Dijon candidacy (Lévy's letter says "1928, give or take a year"), Hurst's papers at 71 and 75, Lévy's turn to probability near 40, his books at 50 and 60, his Académie seat when nearly 80, Richardson's doctorate at 47.
- **The whorls verse is quoted in full** (five lines, Richardson 1922, long out of copyright). The chapter stresses it parodies Swift, not De Morgan's little-fleas-have-greater-fleas variant, because Richardson believed only in a direct energy cascade; the page keeps that distinction.
- **Bachelier's error** is paraphrased, not transcribed: the OCR of Lévy's letter garbles the exponent (v = cτ to some negative power as the step τ shrinks), so the page says only that the zigzag's speed was held constant where it must grow as the steps shorten.

## Part XII, chapters 40–42

**Chapter 41, historical sketches (pages 405–421).**
- The chapter is running text with no plates (checked page by page on the scan). The page is a concept page: the chapter's entries retold briefly, with three figures that are the site's own illustrations, flagged as such on the page — nothing reproduces printed artwork.
- **Lebesgue's bricks.** The chapter quotes the story from Hurewicz & Wallman 1941 but prints no figure; the running-bond paving is our choice of the standard one. Offset courses give at most 3 closed bricks at a point, aligned courses 4, and the probe counts closed bricks exactly by snapping taps to edges and corners.
- **Hyperbolic decay.** An illustration, not a data plot: von Schweidler's numbers (100-second intervals, 1.6 × 10⁷ seconds) are from the chapter's text, and no 1907 data was digitised. The mixture demo uses k log-spaced relaxation times weighted τ⁻ᵞ (the log-discretised gamma integral of the "distributed relaxation times" entry), scaled to the hyperbola by mean log offset over the measured band.
- **Weierstrass figure.** W(t) = Σ b⁻ⁿᴴ cos(2π bⁿt), normalised by Σ b⁻ⁿᴴ; box dimension of the graph 2 − H; nowhere differentiable for H ≤ 1 by Hardy 1916 (ab ≥ 1 with a = b⁻ᴴ). The H slider stops at 0.2 (D ≤ 1.8) because terms past frequency 10⁹ would lose cos() to floating-point error, and at smaller H the dropped tail would be visible. Riemann view draws the partial sum of Σ n⁻² sin(n²t) to n = min(9000, 2.5·px-per-unit); Gerver 1970: derivative −1/2 at t = πp/q with p, q odd (the marked point is t = π, R(π) = 0).
- **Topic split with chapter 39.** Agreed with the chapter-39 thread: this page keeps the Weierstrass *story* and a small historical figure; the mathematics (spectra, modified forms, kin) goes on mathematical-backup#weierstrass. No forward hyperlink from this page (it would be dead until that page merges); the chapter-39 PR may add the links both ways once both pages exist.
- Chapters 40 (biographical sketches) and 42 (epilog) are other threads' work; this page's tracker row covers only chapter 41.

## Open questions

- **The 13-interval generator.** Why does Plate 69's large circle use a different rule from the caption's second stage? This may be worth a sentence once the rest of chapter 7 is reviewed.
