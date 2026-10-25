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
  noSnow:   ["summer"]             // optional per-city rule; absent = snow anywhere
}
```

Helpers: `CITY_BY_ID` map, `CITY_IDS`, `cityRecord(id)` (falls back to Vancouver so an
unknown id can never crash a render).

| id | name | tz | palette | landmark | drift | per-city rule |
| --- | --- | --- | --- | --- | --- | --- |
| vancouver | Vancouver | America/Vancouver | `PAL.vancouver` | vancouver | vancouver | — |
| toronto | Toronto | America/Toronto | `PAL.toronto` | toronto | toronto | — |
| hawaii | Hawai'i | Pacific/Honolulu | `PAL.hawaii` | hawaii | hawaii | — |
| hongkong | Hong Kong | Asia/Hong_Kong | `PAL.hongkong` | hongkong | hongkong | — |
| amsterdam | Amsterdam | Europe/Amsterdam | `PAL.amsterdam` | amsterdam | amsterdam | — |
| sydney | Sydney | Australia/Sydney | `PAL.sydney` | sydney | sydney | `noSnow: ["summer"]` |

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

## Seasonal drift

The old Toronto-only falling leaves are now one `DRIFT` table keyed by `(city id, season)`.
Each entry is `{ cols, rate, wobble, n, shape, tree? }`: sprite colours (hex, or palette
values so the sprite stays inside the city's limited palette), fall rate in art px/s,
sideways sway in px/s, how many of the shared 28-particle pool to use, and the sprite shape
(`leaf`, `petal`, `seed` or `mote`). A season mapped to `null` means no drift at all.

| city | spring | summer | autumn | winter |
| --- | --- | --- | --- | --- |
| vancouver | cherry petals | fir needles | leaves | — |
| toronto | blossom petals | seeds | maple leaves (from the baked crowns) | — |
| hawaii | plumeria | plumeria | plumeria | plumeria |
| hongkong | bauhinia petals | haze motes | — | — |
| amsterdam | tulip petals | elm seeds | leaves | — |
| sydney | jacaranda petals | — (clear beach light) | — | — |

Motion is one shared pool (`drift`), integrated once per frame with the current spec's rate
and wobble, so switching city or season costs nothing and never leaks state. `tree: true`
makes the particles fall from `scene.trees` crowns instead of scattering across the frame
(Toronto's maples, autumn).

**Suppression.** `driftAmount()` scales the whole layer by
`clamp(1 - rainAmt*2.4 - snowAmt*5, 0, 1)`, and the night grade dims it. At full rain or any
real snow it is zero: drift never fights the weather, and petal colours never sit on top of
a snowfall. Light rain keeps a little drift, which reads like wind.

## Sydney

`BUILD.sydney` paints the harbour view: a low blue-grey north shore under dither haze, the
distant CBD behind the point, the **Harbour Bridge** (steel arch + hangers, deck running off
the left edge to a sandstone abutment, two granite pylons with deck lamps and beacons), and
the **Opera House** (sandstone podium, glazed foyer, four leaning white shells, foyer glow at
night, all with water reflections). The near layer holds a sandstone quay with two
jacarandas, a beach umbrella, a towel and a strip of sand, plus a harbour ferry in the water
(`drawFerry`). Palette is `PAL.sydney`.

Season behaviour: *spring* = jacaranda petals drifting through the frame (Oct–Nov in the
south), *summer* = clear beach light (December), *winter* = the grey cast above, no drift.
Sydney's drift colours are `PAL.sydney.jac*`, so the petals match the canopy art.

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

**Three baked layers per city.** `far` / `mid` / `near` transparent canvases are painted once
per city and resize, and are `PAD = 16` art px wider than the frame so they can be blitted at
a slowly drifting offset (±6 / ±4 / ±2 px on sine curves) for parallax. A frame only blits
them. Windows, neon and lanterns are drawn *after* the colour grade so they glow at night;
the lit-window list (with per-window blink phase) is collected while baking.

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

`node scripts/render-pixel.mjs` (from `pagoda/`):

1. extracts every inline `<script>` block and compiles each with `new vm.Script` (a parse
   failure fails the run);
2. runs the page against a minimal canvas/DOM shim and asserts: six city records, the
   hemisphere/season table (incl. October north vs south and December south = summer), the
   `DRIFT` rules from the brief, Sydney's summer snow refusal, Sydney winter being measurably
   greyer than summer, the pagoda-link markup + its computed box, and `?city=` boot parsing
   (known, unknown and mixed params);
3. renders all six cities × day / dusk / night / rain / snow to `shots2/sheet-*.png`,
   two season sheets (`sheet-seasons-a/b.png`), full-size `sydney-spring.png`,
   `sydney-summer.png`, `sydney-winter.png`, `sydney-summer-snow.png` (proves no snow),
   `toronto-autumn.png`, `vancouver-spring.png` and one night still per city.

Exits non-zero on any failed check.

## Cost

Measured on the real draw path (headless, counting canvas calls per frame):

| state | fillRect/drawImage ops per frame |
| --- | --- |
| clear day, most cities | ~250 |
| clear night, Hong Kong | ~800 |
| rain or snow | ~500–1200 |
| plus seasonal drift | +≤ ~40 fillRects (24 particles × 1–3 px) |

The sky is rebuilt only when the hour crosses a 0.05 h bucket (~1/s while cycling), the water
only on city switch or resize. City layers bake once (a one-frame hitch on switching city).
Buffer size is capped at ~300k art pixels.

## Unfinished / weak spots

- **City art is not season-aware.** Layers bake once per city in daylight colours; only the
  drift layer and the grade know the season. So Toronto's baked maple crowns stay orange in
  spring/summer while blossom petals fall, Sydney's jacaranda canopies stay purple all year,
  and there is no snow accumulation on any skyline. A `buildScene()` re-bake when the season
  changes (at most a few times per session) is the obvious next step.
- **The quilted seasonal mapping is only per city, not per hemisphere-of-view.** The season is
  a property of the city, which is right for this page, but there is no UI to force a season
  for comparison outside the harness (`PIXEL.render(..., {season})` only).
- **Sydney composition is tight.** At 16:9 the art buffer is ~427 art px wide, so the Opera
  House sits near the right edge and the fourth shell can graze it; the Harbour Bridge had to
  be pulled left to fit. At 4:3/portrait the centre crop hides the garden and part of Sydney
  (the garden link hides itself in that case).
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
  Chrome/Safari/Firefox and a static server.
- **Live Open-Meteo.** The harness is offline, so Sydney's fetch path was only exercised as a
  rejected promise (the "Offline · last known" branch). Coordinates/timezone come from the
  record but no real response was seen.
- **Non-16:9 layouts.** The link box was computed and asserted at 1280×720; portrait phones
  crop the garden off-screen (link hides) by arithmetic, not by eye.
- **Firefox/Safari rendering.** Only the headless path was inspected; the Firefox DPR cap and
  `image-rendering: crisp-edges` were not exercised.
- **Long-run season rollover.** The season is refreshed each second, but a page left open
  across a season boundary (e.g. Nov→Dec) was not run in real time; the logic is the same
  `seasonOf` call, just not observed live.

## Ideas worth keeping

1. **One record per city, everything off the record.** Palette, landmark builder, clock zone,
   coordinates, drift and per-city rules in one object removed every scattered
   `if (city === "...")`; adding Sydney touched one array plus one builder (and one sill
   branch that is dead anyway).
2. **Bake the city in daylight colours, grade the whole frame afterwards.** Sky colour, hour,
   weather, season cast and cloud cover all collapse into two or three full-frame composite
   fills, so the expensive art is built once and the frame stays cheap and continuous.
3. **A shared foreground anchor buys the "one place" feeling for free.** Identical pagoda
   island + shared near bank at a fixed screen position, city only behind it — the six
   skylines read as six views from the *same* window, and it cost one builder function.
4. **One particle pool, table-driven.** Separating *what is falling* (`DRIFT`) from *how
   particles move* (one shared pool) made six cities × four seasons pure data, and made
   "suppress in heavy weather" a single scalar instead of per-city branches.
5. **Dither with ImageData into a temp canvas, then blit.** Ordered-dither haze, mist bands
   and halos bake in milliseconds and render for one `drawImage` per frame — the whole
   atmospheric look without per-pixel work in the loop.
