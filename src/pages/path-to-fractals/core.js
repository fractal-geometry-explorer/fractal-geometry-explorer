// Chapter 42 ("Epilog: The Path to Fractals") prints no figures. The page's one figure is a
// route map of the chapter's own itinerary: every station is an event the epilog narrates, with
// its year and field as the chapter gives them, linked to the site page that treats it.

// lanes, top to bottom
const LANES = ['words', 'economics', 'noises & turbulence', 'earth & sky', 'synthesis'];
// stations in the chapter's order: [year, lane index, short label, note, site page or null]
const STATIONS = [
  [1951, 0, "Zipf's law", 'A book review fished from a mathematician\'s wastebasket, read on the Paris subway, starts it all: word frequencies prove easy to account for by a scaling argument — a self-terminating enterprise with lifelong aftereffects.', 'power-laws'],
  [1956, 1, 'scaling regularities', 'Sensitized to analogous empirical regularities in diverse fields, beginning with economics: astonishingly many, all dismissed as inconsequential by the established fields.', null],
  [1961, 1, 'commodity prices', 'The scaling principle applied to price records captures their two striking traits, discontinuity and nonperiodic "cycles" — perhaps economics\' only invariance argument in the style of physics.', 'cotton-prices'],
  [1961, 2, 'scaling noises', 'The same notion of scaling extends to several noise phenomena, in near total isolation from physicists and mathematicians.', null],
  [1963, 2, 'turbulence', 'At Harvard, Birkhoff points to Richardson\'s and Kolmogorov\'s turbulence; Stewart\'s lectures introduce Kolmogorov 1962, whose preprint and Berger & Mandelbrot 1963 are weeks apart. The tools adapt "in no time" — the substance of chapters 10 and 11.', 'turbulence-intermittency'],
  [1965, 2, '1/f noises and Hurst', 'Awareness spreads to 1/f noises and to Hurst\'s anomalous ranges of 1951–1955: description first, models later, by deliberate policy.', 'fractional-trails'],
  [1966, 3, 'coastlines', 'Richardson 1961 surfaces — the empirical coastline law behind "How long is the coast of Britain?".', 'coast-of-britain'],
  [1967, 3, 'galaxy clustering', 'The issue of galactic clustering joins the list: conditional cosmography and the fractal dusts of chapters 9 and 22 to 35.', 'conditional-cosmography'],
  [1964, 4, 'first overview', 'An early overview at the International Congress of Logic and Philosophy of Science.', null],
  [1971, 4, 'Trumbull Lectures', 'Overviews grow: the Trumbull Lectures at Yale.', null],
  [1973.5, 4, 'Collège de France', 'The Collège de France lectures of 1973 and 1974 — the theory now grows "from a modest bottom to an increasingly (dizzyingly!) ambitious top".', null],
  [1975, 4, 'the Essays', 'The 1975 French and 1977 English Essays on fractals: no preface, no conclusion — and a new word, fractal.', null],
  [1982, 4, 'this book', 'The Fractal Geometry of Nature: the geometric face of scaling, grown into fractal geometry — a new concept arrived through a branch of low competitiveness, "an historical anomaly".', null],
];
const YEAR0 = 1949, YEAR1 = 1984;
