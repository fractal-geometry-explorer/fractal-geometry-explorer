# Tracker

Every plate in *The Fractal Geometry of Nature* (W. H. Freeman, updated printing), grouped by chapter. Plates are numbered by the page they sit on. The inventory was built from the scan's text and a check of every page with a figure. A "Figure, p. N" row is a numbered drawing inside the running text rather than a plate. Titles are shortened from the captions. Confirm details against the scan when the chapter's session starts.

Update this file in the same pull request as the work it records.

**Status**
- `done`: built and checked against the scan.
- `partial`: some of the group is built, or the build is not yet checked.
- `todo`: not started.

**Kind**
- `exact`: deterministic, and can be matched to the plate stroke for stroke.
- `random`: a random construction; match it statistically and use seeds.
- `render`: a shaded 3D landscape or surface that needs WebGL or similar.
- `data`: an empirical chart; rebuild it as an interactive chart from digitised points.
- `art`: an artwork; discuss it and link out, but don't reproduce it.

**Scan page mapping:** book page = PDF page − 16 up to book page 276. The 16 colour plates C1–C16 follow, then book page = PDF page − 32.

## Foundation (do first, one session, sequential)

| Task | Status |
| :- | :- |
| Pull a shared library out of the ten existing pages: geometry (similarity maps, decorated generators, cascades, tree cascades, chevrons, rounding), drawing (zoomable canvas, chunked paths, controls) and style | done |
| Site shell: chapter index, plate finder, navigation between pages, cross-links | done |
| Move the ten existing pages onto the shared library; check each against its published version (`tools/check_build.py`) | done |
| Automated checks in CI: build, smoke test (`tests/smoke.cjs`), phone width | done |
| Hosting: GitHub Pages, published by `.github/workflows/pages.yml` on every merge to `main` | done |
| Move the three oldest pages (monkeys-tree, minkowski-sausage, wiener-sausage) off their own stylesheet and canvas machinery onto `base.css` and the shared library — their markup and theme-following figures predate the conventions, so it is a rework, not a deduplication (see DECISIONS.md, Foundation) | todo |

## I Introduction (chapters 1–4)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 10–11 | 10–11 | Artificial fractal flakes (surface dimensions 7/3 and 5/2) | random / render | todo | |
| 13 | 12–13 | Jean Perrin's classic drawings of physical Brownian motion | data | todo | |

## II Three classic fractals, tamed (chapters 5–8)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 31 | 31 | Monkeys tree | exact | done | monkeys-tree |
| 32 | 32 | An example of Minkowski sausage | exact | done | minkowski-sausage |
| 33 | 33 | Richardson's empirical data on coastline lengths | data | todo | |
| 42 | 42 | Triadic Koch island or snowflake: original construction (von Koch) | exact | done | koch-plates |
| 43 | 43 | Triadic Koch island: alternative construction (Cesàro) | exact | done | koch-plates |
| 44 | 44 | Two kinds of self-similarity: standard and fractal | exact | done | koch-plates |
| 45 | 45 | Triadic Koch lake | exact | done | koch-plates |
| 46–47 | 46–47 | Alternative Koch island and lake (Gosper island) | exact | done | gosper-island |
| 49 | 48–49 | Alternative Koch islands and lakes | exact | done | quadric-islands |
| 51 | 50–51 | A quadric Koch island (D = 3/2) | exact | done | quadric-islands |
| 53 | 52–53 | A quadric Koch island (D = log 18/log 6) | exact | done | quadric-islands |
| 54–55 | 54–55 | Quadric Koch islands (D = 5/3, log 98/log 14) | exact | done | quadric-islands |
| 56–57 | 56–57 | Generalized Koch curves with unequal parts | exact | done | unequal-parts |
| 63 | 62–63 | Peano's original curve, a square sweep | exact | done | peano-sweeps |
| 64–65 | 64–65 | Cesàro's and Pólya's triangle sweeps, and variants | exact | done | peano-sweeps |
| 66–67 | 66–67 | A square sweep and the dragon sweep; twindragon | exact | done | dragon-sweeps |
| 68–69 | 68–69 | The snowflake sweeps | exact | done | snow-sweeps |
| 70–71 | 70–71 | The Peano–Gosper curve, its trees, and a cascade tree | exact | done | snow-sweeps |
| 72–73 | 72–73 | Plane-filling fractal trees, fudgeflake and quartet | exact | done | snow-sweeps |
| 80–81 | 80–81 | Cantorian triadic curdling (Cantor bar, Cantor cake) | exact | done | cantor-dust |
| 83 | 82–83 | Cantor function, or devil's staircase; Cantor motion | exact | done | cantor-dust |
| (concept) | 74–79 | Cantor dust and its dimension | exact | done | cantor-dust |

## III Galaxies and eddies (chapters 9–11)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 95 | 95 | Projection of Fournier's multiuniverse (D ≈ 0.8270) | exact | done | fournier-universe |
| 96 | 96 | A flat Fournier universe with D = 1 | exact | done | fournier-universe |
| (concept) | 97–105 | Geometry of turbulence; intermittency (chapter 10, no plates) | random | done | turbulence-intermittency |

## IV Scaling fractals (chapters 12–14)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 115 | 115 | Log(perimeter) versus log(area) for clouds and rain areas | data | todo | |
| Figure, p. 121 | 121 | Islands and lakes by curdling (generator and advanced teragon) | exact | todo | |
| Figure, p. 124 | 124 | Nonlumped curdling clusters (generators A–F) | exact | todo | |
| Figure, p. 125 | 125 | Cross-lumped curdling clusters; knotted Peano monsters | exact | todo | |
| Figure, p. 132 | 132 | Critical percolation cluster | random | todo | |
| 141 | 141–142 | Sierpiński arrowhead (boundary D ≈ 1.5849) | exact | todo | |
| 143 | 142–143 | A fractal skewed web | exact | todo | |
| 145 | 144–145 | Sierpiński carpet and Menger sponge | exact / render | todo | |
| 146 | 146 | Split snowflake halls (D ≈ 1.8687) | exact | todo | |

## V Nonscaling fractals (chapters 15–17)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 155 | 154–155 | Fractal umbrella | exact | todo | |
| 163 | 163 | Flattened fractal models of plant flowers | exact | todo | |
| 164–165 | 164–165 | Plane-filling recursive bronchi | exact | todo | |

## VI Self-mapping fractals (chapters 18–20)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| Figure, p. 170 | 170 | Apollonian packing | exact | todo | |
| Figure, p. 173 | 173 | Self-inverse construction, stages | exact | todo | |
| 177 | 177 | A self-inverse fractal (Mandelbrot construction) | exact | todo | |
| 178 | 178 | Self-homographic fractal, near the Peano limit | exact | todo | |
| 179 | 179 | A celebrated self-inverse fractal, corrected | exact | todo | |
| 185 | 185–186 | Self-squared fractal curves for real λ | exact | todo | |
| 187 | 187 | (3D rendering; caption with Plates 185–188, confirm) | render | todo | |
| 188–189 | 188–189 | The separators of z → λz(1 − z) and of z → z² − μ (the μ-map) | exact | todo | |
| 190–191 | 190–192 | Self-squared dragons; approach to the "Peano" limit | exact | todo | |
| 192 | 192 | Real self-squared Fatou dusts | exact | todo | |
| 198–199 | 198–199 | Attraction to fractals (San Marco dragon; Pharaoh's breastplate) | exact | todo | |

## VIII Stratified random fractals (chapters 23–26)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 218–219 | 218–219 | Implementation of Hoyle's model by random curdling in a grid | random | done | random-curds |
| 220–223 | 220–223 | Novikov–Stewart random curds; contact clusters | random | done | random-curds |
| 228 | 228 | Random Koch coastline (D = 1.6131) | random | todo | |
| 229 | 229 | Random Peano curve (D = 2) | random | todo | |
| 230 | 230 | Triangle and squig curve | random | todo | |
| 231 | 231 | A hexa-squig coastline | random | todo | |
| 241 | 240–241 | A random walk approximating a Brown line-to-line function, and its zeroset | random | done | brown-trails |
| 242–243 | 242–243 | Brown hulls and islands; self-avoiding Brownian motion | random | done | brown-trails |
| 246 | 246 | The computer "bug" (opus 1) | random / art | done | midpoint-displacement |
| (concept) | 232– | Brownian motion and the Wiener sausage | random | done | wiener-sausage |
| (concept) | 232–239 | The Brown trail as a randomized Peano curve | random | done | brown-trails |

## IX Fractional Brown fractals (chapters 27–29)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 255 | 255 | Fractional Brown trails (D ≈ 1.1111, 1.4285) | random | done | fractional-trails |
| 264–265 | 264–265 | Brown lake landscapes, ordinary and fractional | render | done | brown-relief |
| 266–267 | 266–267 | Brown coastlines, and island "strings" | random | done | brown-relief |
| 268 | 268 | Contour lines in fractional Brown landscapes | random | done | brown-relief |
| 269, C9 (top) | 269 | Brownian Pangaea (coastline D = 3/2) | render | done | brown-relief |
| 270 | 270 | The first known examples of Brown coastlines | random | done | brown-relief |
| 271 | 271 | The first known examples of fractional Brown islands (D = 2.3000) | render | done | brown-relief |

## A book within the book, in colour (C1–C16, before chapter 30)

| Plate | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- |
| C1 | "Here God creates circles, waves and fractals" | art | todo | |
| C3 | The Deluge, by Leonardo da Vinci | art | todo | |
| C5 | Self-squared fractal dragon | exact | todo | |
| C7 | Self-inverse fractal patchwork | exact | todo | |
| C9 | Planetrise over Labelgraph Hill | render | todo | |
| C11 | Gaussian hills that never were | render | todo | |
| C13 | Non-Gaussian hills that never were | render | todo | |
| C15 | Fractal islands that never were, seen from the zenith | render | todo | |
| C16 | The Great Wave, by Hokusai | art | todo | |

## X Random tremas; texture (chapters 31–35)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 285 | 285 | Random pattern of streets | random | todo | |
| 286–287 | 286–287 | Paul Lévy's devilish staircases | random | todo | |
| 293 | 293 | The computer "bug" as artist, opus 2 | art | done | levy-dusts |
| 295 | 295 | Nonrandom subordination: clustered fractal dust | exact | done | levy-dusts |
| 296–297 | 294–297 | Mandelbrot's early model clusters; Lévy flight and its stopovers (D = 1.26) | random | done | levy-dusts |
| 298 | 298 | Decrease of D by subordination | random | done | levy-dusts |
| 299 | 299 | Zooming toward a Lévy dust with D = 1.26 | random | done | levy-dusts |
| 300 | 300 | Circumnavigation of Lévy dusts | random | done | levy-dusts |
| 306–307 | 306–307 | Smallish round tremas, in white; random slices of "Swiss cheese" | random | done | disc-tremas |
| 308–309 | 308–309 | Larger round tremas, in black | random | done | disc-tremas |
| 318 | 318 | Carpets' lacunarity | exact | done | carpets-lacunarity |
| 323 | 323 | Effect of the trema generator upon lacunarity | random | todo | |
| 325 | 324–325 | Fractal dust from nonspherical tremas (one octant on a spherical net) | random | todo | |

## XI Miscellany (chapters 36–39)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| 340 | 340 | Original evidence for scaling in economics (cotton prices) | data | todo | |

## XII Of men and ideas (chapters 40–42)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| (sketches) | 391–404 | Chapter 40, six biographical sketches: Bachelier, Fournier d'Albe, Hurst, Lévy, Richardson, Zipf | data | done | biographical-sketches |
| Drawing, p. 404 | 404 | Jean Effel's lecture drawing, "fournir vos questions à mes réponses" | art | done | biographical-sketches |

## XII Of men and ideas (chapters 40–42)

| Plate | Page | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- | :- |
| (concept) | 405–421 | Historical sketches: chimeras, dimension, Poincaré, old scaling evidence, Weierstrass | — | done | historical-sketches |

## Front matter and the update for the second printing (pages 458–468)

| Plate | Title | Kind | Status | Site page |
| :- | :- | :- | :- | :- |
| I, II, VIII, X | Front-matter plates illustrating pages 464–465 | confirm | todo | |
| 467 | Illustrates page 464 | confirm | todo | |

## Concepts without a plate

Each chapter session should add the chapter's main ideas here, alongside its plates. Candidates so far:
- similarity dimension (chapters 3 and 6);
- coastline length against ruler size (chapter 5; partly on the Minkowski page);
- random midpoint displacement, its creases, and Poisson strata (chapter 26; on the Plate 246 page);
- length–area–volume relations (chapter 12);
- percolation (chapter 13);
- surfaces with positive volume: Cantor dusts of positive measure, Osgood's curve of positive area, and the arteries-and-veins model of flesh (chapter 15, which prints no plates);
- the diameter exponent of trees (chapter 17);
- canonical curdling, the Bienaymé birth-and-death criticality and D* = log ⟨N⟩/log b (chapter 23; on the random-curds page);
- 1/f noise and scaling nets (chapter 27): the Joseph effect, Hurst's R/S and the spectrum are on the fractional-trails page;
- island, lake and cup areas: Korčak's law Pr(A > a) = F·a⁻ᴮ with B = D/2, deadvalleys, cups and the Devil's terraces, the eroded Brown model (chapter 29, pages 272–276 — the chapter prints no figure);
- global dependence in Brown relief, and the horizon (chapter 28);
- Lévy flights and dusts (chapters 31–32);
- disc and ball tremas: saturation, critical dimensions, lunar craters and galactic voids (chapter 33; the Moon-saturation section of the disc-tremas page);
- lacunarity (chapter 34; on the carpets-lacunarity page, with the mid-line dusts, the gap census's prefactor F and the mass-in-a-window measures);
- scaling in prices and in word frequencies (chapters 37–38);
- the prehistory of dimension, scaling and the monsters (chapter 41): done, on the historical-sketches page.
