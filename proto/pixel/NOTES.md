# Pixel window — prototype notes

A single-file ambient page: the same little pagoda garden, seen through a window, with six
cities as the backdrop. `index.html` runs from `file://`, no build step, no imports.

Open it and pick a city from the bottom bar, or link straight to one with `?city=sydney`.
`shots2/` holds headless renders of the real framebuffer (every PNG is the page's own
480×240-ish output, upscaled with nearest neighbour) so the art can be reviewed without a
browser; they are produced by `../scripts/render-pixel.mjs` (see *Harness* below).

## City records

There is one `CITIES` array of records. Everything that differs between cities is a field,
and every lookup — palette, landmark art, clock, weather fetch, drift, per-city rules — goes
through the record. The builders are still a plain table keyed by `id`.

```js
{
  id:       "sydney",              // stable key: DOM data-city, prefs, ?city=, DRIFT key
  name:     "Sydney",              // shown in the corner card and city bar
  seed:     61,                    // mulberry32 seed for the baked layers
  lat:      -33.8688,              // real coords for Open-Meteo and hemisphere rules
  lon:      151.2093,
  tz:       "Australia/Sydney",    // Intl clock / local-date source
  palette:  PAL.sydney,            // colour object used by the art and drift
  landmark: "sydney",              // key into BUILD{} (the landmark art function)
  drift:    "sydney",              // key into DRIFT{} (usually the id)
  noSnow:   ["summer"],            // optional per-city rule; absent = snow anywhere
  tree: {                          // the seasonal source tree (see "Source trees")
    kind: "jacaranda", layer: "near",
    x: [0.680, 0.810], baseY: 0.925, h: [36, 29],
    form: { w: 28, h: 27, clusters: 3, trunk: 2, lean: -1, shape: "tall" },
    crowns: { spring: {...}, summer: {...}, autumn: {...}, winter: { bare: true, ... } }
  }
}
```

Helpers: `CITY_BY_ID` map, `CITY_IDS`, `cityRecord(id)` (falls back to Vancouver so an
unknown id can never crash a render).

| id | name | tz | palette | landmark | drift | tree | per-city rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vancouver | Vancouver | America/Vancouver | `PAL.vancouver` | vancouver | vancouver | cherry (mid) | — |
| toronto | Toronto | America/Toronto | `PAL.toronto` | toronto | toronto | 2 maples (near) | — |
| hawaii | Hawai'i | Pacific/Honolulu | `PAL.hawaii` | hawaii | hawaii | plumeria shrub (mid) | — |
| hongkong | Hong Kong | Asia/Hong_Kong | `PAL.hongkong` | hongkong | hongkong | bauhinia (mid) | — |
| amsterdam | Amsterdam | Europe/Amsterdam | `PAL.amsterdam` | amsterdam | amsterdam | 2 elms (mid) | — |
| sydney | Sydney | Australia/Sydney | `PAL.sydney` | sydney | sydney | 2 jacarandas (near) | `noSnow: ["summer"]` |

## Seasons

Hemisphere-aware, using the city's **local** calendar date (same `Intl` machinery as the
clock, one `Intl.DateTimeFormat(...).formatToParts()` call per refresh — the corner card's
1 s interval already pays for it):

- `hemisphereOf(lat)` → `"north" | "south"` (sign of latitude).
- `seasonOf(month, lat)` → `"spring" | "summer" | "autumn" | "winter"`, month 1–12.
  - North: Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter.
  - South: the same shifted by two seasons (Sep–Nov spring, Dec–Feb summer, Mar–May autumn,
    Jun–Aug winter).
- `localParts(tz)` → `{year, month, day, hour, minute}` in the city's zone; `localHour(tz)`
  stays the clock. `refreshSeason()` writes `state.season` (or the harness override).
- The current season is exposed as `state.season`, printed in the corner card
  (`#infoSeason`, e.g. "Autumn · northern hemisphere"), and on the harness hook as
  `PIXEL.seasonNow()`, `PIXEL.citySeason(id, month?)`, `PIXEL.seasonOf()`,
  `PIXEL.hemisphereOf()`.

Season table produced by the harness (first letters, month Jan→Dec):

```
vancouver  N  W W S S S S S S A A A W
toronto    N  W W S S S S S S A A A W
hawaii     N  W W S S S S S S A A A W
hongkong   N  W W S S S S S S A A A W
amsterdam  N  W W S S S S S S A A A W
sydney     S  S S A A A W W W S S S S
```

So in October Toronto is in autumn and Sydney is in spring; in December Sydney is in summer
and may not snow (`noSnow` rule, enforced in `setWeather`, in `syncSnowButton` — the snow
button is disabled with an explanatory title — and again in `PIXEL.render` so a headless
"summer + snow" capture comes out clear by construction).

Sydney also carries a small per-season colour cast on top of the hour grade
(`SEASON_CAST` in `grade()`): winter multiplies towards a dimmer grey-blue (mild grey harbour
light), summer towards a barely-there warm white. No other city is season-cast yet.

**A season rollover re-bakes the scene once.** `refreshSeason()` notices the change (it is
already called once a second by the corner card) and calls `buildScene()`; the bake is cached
by `(city, season, buffer size)`, so every other frame is a pure blit. The framebuffer draws a
cheap guard (`scene.id/season/BW/BH`) as well, so *any* path that changes the season repaints
exactly once — switching city is the same one-off cost.

## Source trees

Every city now has one tree species on its record (`city.tree`) that is part of the baked art
and is the source of the drift particles. It lives in the near layer when it is a foreground
tree (Toronto's maples, Sydney's jacarandas) and in the mid layer when it stands on the far
shore / canal bank (Vancouver, Hawai'i, Hong Kong, Amsterdam), so its trunk roots at the
waterline and the water pass hides the foot.

The spec is data, not code: `kind`, `layer`, `x` (fraction of BW; an array means a small group
of trunks of the same species), `baseY` (fraction of BH, `0.665` = waterline), `h` (trunk
length in art px at the 480×270 reference; array for groups), `form` (crown box, cluster count,
trunk width, lean, `shape`: broad / tall / shrub) and `crowns` (per season: size multipliers,
blossom `dots`, `gap` for the sky holes, or `bare: true`). Crown *colours* live in
`PAL[city].tree[season]` as `{ c, hi, lo, dot }`; `PAL[city].tree.trunk/branch/snow` are the
constant bark and the settled-snow colour. Tree art is always scaled off `BW / 480`, so it
holds up at 427×240 (1280×720 window) and at the nominal 480×270.

`drawTree()` spins up to five crown clusters around a taller main lobe (side lobes in a
half-shade so the mass has internal edges), roughens the outline with a few leaf clumps, and
punches `gap` clear-rects so autumn reads as thinned out. Winter draws a recursive bare-branch
skeleton instead of a crown. Each tree bakes its own settled-snow sprite (`scene.treeSnow`,
winter only) that `drawFrame` fades in with `snowAmt` — so weather never triggers a re-bake.

| city | kind | layer | x (fraction of BW) | spring | summer | autumn | winter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vancouver | cherry | mid (far shore) | 0.865 | pale pink blossom + white petal dots | dark fir-green canopy | amber with gaps | bare branches |
| toronto | maple | near (island bank) | 0.762, 0.868 | pale pink blossom | full green | amber/rust with gaps | bare branches + snow hint |
| hawaii | plumeria shrub | mid (beach) | 0.470 | heavy pink bloom | full green + cream blooms | olive with gaps, sparse blooms | evergreen, darker green, a few blooms |
| hongkong | bauhinia | mid (promenade) | 0.720 | orchid-pink blossom | full green | amber, sparse | bare-ish (a few twig tufts) |
| amsterdam | elm | mid (canal bank) | 0.400, 0.585 | pale samara green | deep green | amber with gaps | bare branches |
| sydney | jacaranda | near (sandstone quay) | 0.680, 0.810 | **purple** blossom (Oct) | green | thinned olive, big gaps | bare-ish + 2 tufts |

Two compromises are deliberate and worth flagging:

- **Hawai'i stays evergreen.** A tropical plumeria/hibiscus in a beach scene going bare in
  January would be wrong, and its drift rule is plumeria in every season — petals out of a bare
  tree would be worse. Its four looks are bloom density + green tone, not a bare crown. It is
  the one city whose winter `treeInfo.bare` is false.
- **Vancouver's cherry is bare in winter**, so the "fir otherwise" idiom is carried by colour
  (summer/autumn crown in the dark fir/green/amber sets) rather than by a second species. A
  real cherry is deciduous; the fir-needle drift just falls from a fir-green canopy.

The garden island is deliberately *not* season-driven: it is the constant anchor, so only the
city tree carries the season.

## Seasonal drift

Falling things are still one `DRIFT` table keyed by `(city id, season)`. Each entry is
`{ cols, rate, wobble, n, shape, ambient? }`: sprite colours (hex, or palette values so the
sprite stays inside the city's limited palette), fall rate in art px/s, sideways sway in px/s,
how many of the shared 28-particle pool to use, and the sprite shape (`leaf`, `petal`, `seed` or
`mote`). A season mapped to `null` means no drift at all.

**The source is the baked tree, not the sky.** The tree bake hands back `scene.treeEmitters`:
three points inside each crown (crown centre-top, left lobe, right lobe; 2–3 per trunk — 3 for
the single trees, 3 each for Toronto's/Sydney's/Amsterdam's pairs) plus a `spread` radius.
`seedDrift()` gives every particle an emitter (`ex`, `ey`) and its own lateral offset (`ox`) and
seeds it *mid-fall*, using the same wind+wobble equation integrated over the fall time — so a
fresh city or season opens as a wind-blown fan under the crown instead of a burst at the crown
or a thread from the sky. `updateWeather()` respawns a particle that leaves the bottom/right at
its own emitter, so the layer keeps a believable source forever and never leaks state.
`PIXEL.treeEmitters()` / `PIXEL.driftParticles()` expose the two ends of that for the harness.

Only **Hong Kong's summer haze motes** are still ambient (`ambient: 1`): sea haze has no
canopy, and it is a `mote` sprite rather than a petal, so it cannot read as blossom falling out
of an empty sky. Nothing else scatters from the top of the frame.

| city | spring | summer | autumn | winter |
| --- | --- | --- | --- | --- |
| vancouver | cherry petals (pink) | fir needles (dark green) | leaves (amber/rust) | — |
| toronto | blossom petals (pale pink) | seeds | maple leaves (amber) | — |
| hawaii | plumeria | plumeria | plumeria | plumeria (evergreen shrub) |
| hongkong | bauhinia petals | haze motes (ambient) | — | — |
| amsterdam | elm blossom (pale samara green) | elm seeds | leaves (amber) | — |
| sydney | jacaranda petals (purple) | — (clear beach light) | — | — |

Amsterdam's spring drift used to be tulip petals, which have no canopy to fall from now that the
canal-side elm is the source; it is the elm's pale samara/blossom in the same petal sprite. The
red/yellow tulip colours remain in `PAL.amsterdam` for the (dead) window box.

**Suppression.** `driftAmount()` scales the whole layer by
`clamp(1 - rainAmt*2.4 - snowAmt*5, 0, 1)`, and the night grade dims it. At full rain or any
real snow it is zero: drift never fights the weather, and petal colours never sit on top of
a snowfall. Light rain keeps a little drift, which reads like wind.

**Snow on bare branches** is a separate baked sprite (`scene.treeSnow`, built from the winter
branch tips) that `drawFrame` blits at `snowAmt` after the colour grade. It is a hint, not
accumulation, and it costs one `drawImage` only while it is actually snowing.

## Sydney

`BUILD.sydney` paints the harbour view: a low blue-grey north shore under dither haze, the
distant CBD behind the point, the **Harbour Bridge** (steel arch + hangers, deck running off
the left edge to a sandstone abutment, two granite pylons with deck lamps and beacons), and
the **Opera House** (sandstone podium, glazed foyer, four leaning white shells, foyer glow at
night, all with water reflections). The near layer holds a sandstone quay with the two
jacarandas (now drawn by the tree system), a beach umbrella, a towel and a strip of sand, plus a
harbour ferry in the water (`drawFerry`). Palette is `PAL.sydney`.

Season behaviour is the tree system's inverted calendar: *spring* (Oct–Nov) is the purple
jacaranda crown with petals drifting from it, *summer* (December) is green canopy and clear
beach light with no drift, *autumn* (Mar–May) is a thinned olive crown with sky holes, *winter*
(Jun–Aug) is bare-ish with two small tufts plus the grey cast above. Sydney's drift colours are
`PAL.sydney.jac*`, so the petals match the spring canopy art.


## Entering the garden

The pagoda island is a real `<a id="gardenLink" href="../../">` overlay pointing at the site
root (the voxel garden page, `pagoda/index.html`), with `cursor:pointer`, an
`aria-label="Enter the garden"` and an unobtrusive pill that fades in on hover/focus
("enter the garden"). It sits at `z-index: 4`, below the bottom bar (5) and the corner card
(6), so it can never eat a click meant for the controls.

Its box is computed in `layoutGardenLink()` from the same framebuffer geometry as the art
(art-pixel buffer `BW×BH`, integer scale `px`, centre-crop `bx/by`, DPR), because a static
CSS box would drift with the canvas scaling. It is re-run from `measure()` on resize, clamped
to the viewport, and hidden when the centre crop puts the island off-screen (portrait
phones). Keyboard: it is a normal anchor — Tab to it, Enter navigates; the hint also shows on
`:focus-visible`.

`?city=<id>` is read on boot (`urlCity()`; a tiny regex over `location.search`, so it works
from `file://` and needs no URL API). A known id preselects that city and starts on its local
time; an unknown id falls back to the saved/last city. `loadPrefs()` gives the URL priority
over `localStorage`, and a city different from the saved one counts as a fresh selection.

## How it is drawn

**One framebuffer, integer scale.** The scene is painted into an offscreen canvas of roughly
480×270 *art pixels* — the pixel size is chosen so the buffer lands near that size on any
window (`p = round(min(cssW/480, cssH/270) * dpr)`), then blitted with
`imageSmoothingEnabled = false` at an integer multiple. The buffer covers the viewport and
the excess is centre-cropped (a narrow portrait window therefore crops the sides, including
the garden). At 1920×1080 that is 480×270; at 1280×720 it is 427×240.

**Ordered 4×4 Bayer dithering** (`BAYER`, `bay()`) is what makes it read as pixel art rather
than a blurry low-res render. It is used for:
- the sky ramp (14 stops sampled from the MOOD top/bottom pair, dithered per pixel);
- the sun/moon disc and its stipple halo;
- the water depth ramp, the sky reflection hugging the waterline, and the sun/moon glint;
- every haze/mist band (`ditherBand()` writes a dithered alpha field into a throwaway
  ImageData canvas and blits it, so haze costs nothing per frame).

**Three baked layers per city, once per season.** `far` / `mid` / `near` transparent canvases
are painted for each `(city, season, buffer size)` and are `PAD = 16` art px wider than the
frame so they can be blitted at a slowly drifting offset (±6 / ±4 / ±2 px on sine curves) for
parallax. A frame only blits them. Windows, neon and lanterns are drawn *after* the colour
grade so they glow at night; the lit-window list (with per-window blink phase) is collected
while baking. Switching city and rolling over a season cost the same one bake; `PIXEL.bakes()`
counts them (`scene` / `near` / `hits` / `byCity`) for the harness.

**One grade over the whole frame.** The MOOD table's multiply tint (plus the optional
per-season cast, cloud cover and rain multiply, snow lighten) is applied as full-frame
composite fills. That is why the art can be baked once in daylight colours and still follow
the hour continuously — the palette stays limited instead of being re-quantised every frame.

**The garden.** Every city gets the same island at the same screen position
(`buildGarden()`, around 0.215 of the width): three-tier pagoda with red eaves and a gold
finial, a conifer, two canopies, a stone lantern and a few path stones, on a shared near bank.
It is deliberately city-independent — the pagoda's windows and lantern join the same lit-window
list, so the garden is what stays warm while the city lights up behind it.

**Neither frame nor sill are composited.** The framebuffer is edge-to-edge; `buildFrame()`
only bakes a soft bottom-weighted vignette. `buildSill()` still bakes per-city sill dressing
(tulip box, maple leaves, rain beads, a Sydney petal/sail scrap) into `sillCv`, but nothing
blits it — pre-existing dead code, kept in sync rather than removed (see *Unfinished*).

## Shared with the spec

- `MOOD` table + `moodAt()` copied verbatim from `relax.html`; same hour/7-minute cycle model.
- Weather: `clear` / `rain` / `snow`, cross-faded (rain/snow amounts ease toward targets, and
  drive the particle alpha and the grade). Same three buttons.
- Corner card: same markup/CSS/ids (`#info`), Open-Meteo fetch for the selected city, `Intl`
  city clocks, `↻` refresh, collapsible, "Offline · last known" when the fetch fails, plus a
  season line.
- Six cities + own-time mode (`own` button: your clock, weather by hand).
- Prefs in `localStorage` under `pagoda-pixel-window.v1` (still v1: `city` is the record id).
- `prefers-reduced-motion`: no parallax, no drifting clouds, no bird flock, drift and clock
  cycle start off, no hint transition. Firefox caps DPR at 1.25 (as `relax.html` does).

## Harness

`node scripts/check-inline.mjs proto/pixel/index.html` compiles every inline `<script>` block
on its own (a parse failure fails the run). `node scripts/render-pixel.mjs` (from `pagoda/`):

1. extracts the page's inline block and runs it against a minimal canvas/DOM shim;
2. asserts the old contract: six city records, the hemisphere/season table (incl. October north
   vs south and December south = summer), the `DRIFT` rules from the brief, Sydney's summer snow
   refusal, Sydney winter being measurably greyer than summer, the pagoda-link markup + its
   computed box, and `?city=` boot parsing (known, unknown and mixed params);
3. asserts the tree/season contract for every city × season:
   - `city.tree` exists with all four crowns, and the tree is baked into its declared layer;
   - `PIXEL.treeInfo()` reports a drawn tree, its tree/crown boxes fit the frame, 2–3 emitters
     per trunk, and every emitter lies inside the tree box;
   - the tree paints opaque pixels in all four seasons, and all four season crops hash
     differently (four distinct looks);
   - for every non-ambient drift spec, every particle's `ex/ey` is one of the tree emitters and
     it is seeded below that emitter and inside the frame — i.e. the drift comes from a crown,
     not the sky;
   - the winter crowns are bare for the five temperate/cool cities and crowned for Hawai'i;
   - Sydney reads inverted (spring crown measurably purple, summer measurably green), Toronto
     autumn measurably warm, Vancouver spring measurably pale blossom;
   - a season change re-bakes the near layer exactly once (and `setSeason()` updates both
     `state.season` and `scene.season`), a repeat season does not re-bake, two `frame()` calls
     never re-bake, and a city change re-bakes exactly once;
   - the nominal 480×270 buffer is exercised with `PIXEL.setup(480, 270)` and every tree still
     fits and paints (the capture framebuffer is 427×240 from 1280×720, so this guards the
     authored size);
4. renders `shots2/sheet-{day,dusk,night,rain,snow}.png`, one contact sheet per season
   (`sheet-season-{spring,summer,autumn,winter}.png` — six cities each), two tree close-up
   sheets (`sheet-trees-a/b.png`: 4 seasons across × 3 cities down, cropped from each city's
   own baked layer at 4× on a flat backdrop), full-size stills (`sydney-spring/summer/autumn/
   winter`, `toronto-autumn`, `toronto-winter-snow`, `vancouver-spring/winter`,
   `hawaii-summer`, `hongkong-spring`, `amsterdam-spring`, `sydney-summer-snow`) and one night
   still per city.

Exits non-zero on any failed check.

## Cost

Measured on the real draw path (headless, counting canvas calls per frame):

| state | fillRect/drawImage ops per frame |
| --- | --- |
| clear day, most cities | ~250 |
| clear night, Hong Kong | ~800 |
| rain or snow | ~500–1200 |
| plus seasonal drift | +≤ ~40 fillRects (24 particles × 1–3 px) |
| plus snow on bare branches | +1 drawImage while `snowAmt > 0` (a small tree-sized sprite) |

The sky is rebuilt only when the hour crosses a 0.05 h bucket (~1/s while cycling), the water
only on city switch or resize. City layers bake once per (city, season, buffer size) — a
one-frame hitch on switching city **and** on a season rollover, which happens at most a few
times per session and is guarded to fire exactly once. Buffer size is capped at ~300k art
pixels.

## Unfinished / weak spots

- **Only the tree is season-aware, plus the Sydney cast.** Snow does not accumulate on the
  skyline, the garden island stays green all year, and the only snow art is the bare-branch
  hint sprite. A ground/hill snow pass would need a per-weather bake and is out of scope here.
- **Tree silhouettes are stylised.** At 480×270 the five-cluster crowns read as lumpy clouds
  (which is what they are), and the trunks are 1–3 px: they read as trees at 2–3× integer
  scale, less so at 1×. The close-up sheets (`sheet-trees-a/b.png`) are the honest view; the
  bare winter skeletons are the weakest crowns.
- **Two idiom compromises** (also documented above): Hawai'i never goes bare, and Vancouver's
  "fir otherwise" is carried by colour rather than a second species.
- **Season forcing has no UI.** `PIXEL.setSeason(season)` / `state.seasonOverride` and
  `PIXEL.render(..., {season})` can force a season for the harness, and a live page rolls over
  correctly by the local calendar, but there is no button to preview "this city in April" in
  the browser. Keeping it harness-only was deliberate (the brief asks for the real season).
- **Sydney composition is tight.** At 16:9 the art buffer is ~427 art px wide, so the Opera
  House sits near the right edge and the fourth shell can graze it; the Harbour Bridge had to
  be pulled left to fit. At 4:3/portrait the centre crop hides the garden and part of Sydney
  (the garden link hides itself in that case). The jacarandas sit near the right crop edge too.
- Amsterdam's bridge is one low band across the whole frame; a real arch bridge meeting a quay
  wall at one side would read better than a viaduct.
- Hong Kong's far hill is a random stipple of towers rather than a believable second skyline.
- Diamond Head is still close to a silhouette; the faceting helps but the crown is very flat.
- Motion is looped (whale every ~27 s, flock every ~40–90 s, boats bob on sines); nothing
  reacts to the pointer, and there is no weather interaction with the water surface.
- Night grading is a single multiply, so very saturated day colours (Amsterdam brick) drift
  slightly olive after dark. A night-specific palette ramp per city would fix that.
- Live weather only distinguishes clear/rain/snow; fog and overcast are folded into the cloud
  grade.
- `sillCv` is baked and never drawn (pre-existing dead code).
- No audio (deliberately out of scope for the prototypes).

## What I could not verify

- **A real browser.** The harness is a canvas/DOM shim: it proves the JS compiles, runs, and
  paints the framebuffer, but not hover/focus CSS, actual pointer hit-testing on the pagoda
  link, Tab order, `backdrop-filter`, or that `../../` resolves to `pagoda/index.html` when
  served (from `file://` a directory URL shows a listing instead). Those need a manual open in
  Chrome/Safari/Firefox and a static server. The trees were judged from the harness PNGs only.
- **The live animation of drift.** The harness checks seeded positions and re-bakes, but the
  look of the petal fan *moving* (respawn cadence, wobble, how quickly it thins in rain) was
  inferred from the code and the stills; it was not watched over a few seconds in a browser.
- **Live Open-Meteo.** The harness is offline, so Sydney's fetch path was only exercised as a
  rejected promise (the "Offline · last known" branch). Coordinates/timezone come from the
  record but no real response was seen.
- **Non-16:9 layouts.** The link box was computed and asserted at 1280×720; portrait phones
  crop the garden off-screen (link hides) by arithmetic, not by eye. The tree spec is scaled
  off buffer width and the 480×270 size was asserted headlessly, but other buffer widths /
  crops were not inspected.
- **Firefox/Safari rendering.** Only the headless path was inspected; the Firefox DPR cap and
  `image-rendering: crisp-edges` were not exercised.
- **Long-run season rollover.** The season is refreshed each second and a *forced* change was
  asserted to re-bake exactly once, but a page left open across a real season boundary
  (e.g. Nov→Dec) was not run in real time; the logic is the same `seasonOf` call, just not
  observed live. Similarly the rollover was not watched together with live weather.
- **Snow-suppressed drift by eye.** The scalar is checked and the snow sheet shows the bare
  trees, but "no petals under snow" was verified as numbers/one capture, not a live snowfall.

## Ideas worth keeping

1. **One record per city, everything off the record.** Palette, landmark builder, clock zone,
   coordinates, drift and per-city rules in one object removed every scattered
   `if (city === "...")`; adding Sydney touched one array plus one builder (and one sill
   branch that is dead anyway). The seasonal tree is now the same trick one level down: one
   `tree` spec on the record, a shared `drawTree()`, colour sets in `PAL[city].tree[season]`.
2. **Bake the city in daylight colours, grade the whole frame afterwards.** Sky colour, hour,
   weather, season cast and cloud cover all collapse into two or three full-frame composite
   fills, so the expensive art is built once and the frame stays cheap and continuous. A season
   change is the only extra bake, and it is one-off and cached.
3. **A shared foreground anchor buys the "one place" feeling for free.** Identical pagoda
   island + shared near bank at a fixed screen position, city only behind it — the six
   skylines read as six views from the *same* window, and it cost one builder function. The
   city tree stays a city object, so the anchor never changes season.
4. **One particle pool, table-driven, with a data-driven source.** Separating *what is falling*
   (`DRIFT`) from *how* particles move (one shared pool) made six cities × four seasons pure
   data; the tree bake then hands the pool its emitter points, so "where do these petals come
   from?" became a field instead of a rule. Suppressing the lot in weather stays one scalar.
5. **Dither with ImageData into a temp canvas, then blit.** Ordered-dither haze, mist bands
   and halos bake in milliseconds and render for one `drawImage` per frame — the whole
   atmospheric look without per-pixel work in the loop.
6. **A baked snow overlay beats a live one.** The bare branches are always painted; only the
   settled-snow flecks are a separate sprite faded by `snowAmt`, so weather changes stay free
   while the season still changes what is physically there.
