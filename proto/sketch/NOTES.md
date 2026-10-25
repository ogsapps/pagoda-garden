# The Pagoda Sketchbook — notes

A single self-contained `index.html`: a hand-drawn travel-sketchbook page for the
garden. Cream paper, ink line work, colour washes, and the same pagoda garden in
the lower middle of every page while the city changes behind it.

Open it directly (`file://`) or from Pages. No build step, no local imports.

---

## What is in it

**One design space.** Everything is drawn in a 1240 × 700 "paper unit" space and
scaled to the viewport (`K = max(W/1240, H/700)`), so the drawing is composed once
and the same page works at 1440p, 2560 and on a phone. On a narrow portrait phone
the page is cropped sideways, so `layout()` slides the crop over to that city's
landmark (`CITIES[city].focus`) instead of losing it off the edge.

**A shared garden, five backdrops.** `drawGarden()` is identical on every page:
near bank, path with stepping stones, pond with lily pads, two garden trees, a
conifer, a broken hedge, small flowers, two stone lanterns and the pagoda roughly
centred in the lower third (`bx 616, base 674`). Each city adds one small guest
in the garden — ferns and a mossy stone, fallen maple leaves plus an amber tree,
a hibiscus, a lantern post, a tulip bed with a fence — so the garden stays the
anchor while the city is the reason to turn the page.

**The five pages**

| City | How it reads as a sketch |
| --- | --- |
| Vancouver | Two overlapping mountain ridges (flat wash + solid shade wedges + ink edge), a treeline of three-tier conifers, a pale mist band, blue-grey water and a dark whale fluke breaking the surface with ripples and spray ticks. |
| Toronto | Autumn amber glow low in the sky, a skyline of washed blocks with window rules, the Rogers-Centre dome, and the CN Tower as three tapering strokes, a pod, a ring and an antenna with a red beacon (a live warm point at night). Maple leaves float on the lake; live leaves fall in the animated layer. |
| Hawai'i | Diamond Head as a notched, flat-topped ridge (sand wash, shaded seaward flank, contour creases), a turquoise lagoon with reflections, three palms on the far shore with drooping fronds and leaflet ticks, a hibiscus in the garden. |
| Hong Kong | A dense cluster of narrow towers with stepped crowns, a darker shadow side on each tower, a few teal-glass and warm-concrete facades, red neon sign strips, hanging lanterns (glowing at night), harbour water and a junk boat with a battened sail. |
| Amsterdam | Narrow, tall canal houses **with real gaps** (16–31 px of paper between them), brick / warm-ochre washes, white window frames with dark panes, four gable types (step, bell, neck, spout) with hoisting beams, a humped bridge with lamps on the left, a canal boat with flowers on its roof, and tulips in the garden bed. |

**Mood.** The `MOOD` table and `moodAt()` are copied verbatim from
`pagoda/relax.html`. The hour is bucketed on the same keyframe hours
(`BUCKET_H`), and a page is **only re-rendered when the bucket, the city, the
weather state or the cloud bucket changes** — about once every 50 s while cycling.
Two cached pages cross-fade over 0.9 s (smoothstep). Between re-renders the light
still moves: a continuous veil of `moodAt(hour).tint` is laid over the cached page
each frame, so dusk creeps in instead of jumping at the bucket edge.

**Weather.** The same three-state machine as `relax.html`: `rainTarget` /
`snowTarget` eased into `rainAmt` / `snowAmt`, the same particle arrays and the
same cross-fade. Weather is drawn twice — a static pass baked into the page
(darker wet paper and slanted strokes for rain, pale wash + flakes + a snow band
on the garden crest for snow) and a live moving pass on top (sketchy slanted
strokes, flakes as dots and pencil crosses, a few maple leaves for Toronto).
Snow caps are white pencil, not ink, on the tower pod, the skyline, the roofs and
the pagoda eaves.

**Corner card.** The markup, ids, CSS and logic come from `relax.html`
(`id="info"`, `#infoHead`, `#infoRefresh`, collapse, `aria-expanded`): real city
clocks through `Intl` with the city's IANA zone, Open-Meteo `current=` fetch for
`weather_code`, `temperature_2m`, `cloud_cover`, the `condLabel()` / `weatherKind()`
mapping, "loading / offline · last known / Open-Meteo · just now" meta line, a
spinning `↻` and a 15-minute auto-refresh. Offline the clock still works and the
card says so. The card is restyled as a paper slip (slightly rotated, warm paper,
ink border) instead of dark glass.

**Prefs.** `localStorage["pagoda-sketch.v1"]`: hour, cycle, weather, city, own-time,
card open. All reads/writes are in try/catch, so a blocked `localStorage`
(`file://`, private mode) is harmless.

**Performance.** Rough.js line work is expensive, so it is only done on a bucket
change. Steady state is one page blit, one veil fill, the weather strokes (batched
into 2–3 paths), optional glows, and one tiled grain fill. DPR is
`min(devicePixelRatio, isFirefox ? 1.25 : 1.5)` exactly as `relax.html` does, plus
a 6.2 MP cap on the backing store; the page cache holds at most 3 pages.
`prefers-reduced-motion` stops the grain drift, the falling leaves and the mist.

**Rough.js.** Loaded from `https://unpkg.com/roughjs@4.6.6/bundled/rough.js` with
an `onerror` hook. If it is missing, `installRoughShim()` installs a small
compatible object (`line`, `linearPath`, `polygon`, `rectangle`, `ellipse`,
`circle`, `curve`, `path`; `stroke`, `strokeWidth`, `roughness`, `bowing`, `seed`,
`fill`, `fillStyle` hachure / zigzag / dots / cross-hatch / solid, `hachureGap`,
`hachureAngle`, `fillWeight`) implemented with jittered quadratic strokes and a
clipped hachure filler. The corner card then says
`ink · plain lines — Rough.js unavailable`. The fallback is deliberately simpler
than rough.js: fewer multi-stroke overlaps and slightly cleaner hachure.

All rough primitives get an explicit `seed`, and `_seed` is reset per page from
`(city, bucket, weather)`, so a cached page is pixel-stable and returning to a
mood never re-shuffles the drawing.

---

## Verification

What was actually run:

1. **Syntax.** Inline `<script>` extracted and `node --check` — **exit 0**.
2. **Headless render harness.** The script was executed in Node against a fake
   DOM/canvas (no `rough` present, so the *shim* path was exercised): all
   **5 cities × 8 mood buckets × 3 weather states = 120 pages** rendered with
   **no runtime errors and no NaN / absurd coordinates**; ~585–936 rough records
   per page (the heaviest is Amsterdam at night). The harness also drove
   `selectCity()`, `manualWeather()`, own-time toggling, a resize to a 412 × 915
   phone and a re-render there; and `node --check` was re-run after every change.
3. **Software previews.** To judge composition without a browser I wrote a
   throwaway rasterizer that replays the same drawing calls (solid fills, hachure
   / zigzag scanline fills, strokes with alpha) into PNGs. It caught the real
   problems that shaped this page: washed-out flat hatching, a pagoda lost in the
   corner, a city palette that had gone monochrome, and a `Pen` wired to the raw
   2D context instead of `rough.canvas()` (which silently drew nothing). The
   previews and the harness have been deleted; this folder is only the page.

**Not verified, and therefore guessed:**

- **The real rough.js output.** Everything was validated through the shim and a
  preview rasterizer, not through Chromium with the CDN script. rough.js draws
  each stroke twice with its own bowing, so the real page will look *more*
  hand-drawn and slightly busier than the previews. If a stroke looks too dark or
  too wide in the browser, the scale knobs are the `strokeWidth`s in the drawing
  functions (design units, multiplied by `K`).
- **The CDN load itself.** In an offline or blocked environment the page falls
  back to the shim and says so in the card. Nobody has watched it fail in a real
  browser here.
- **The real frame cost.** No browser, so no fps number. The static page render is
  the one unmeasured cost: ~600–950 rough primitives, rescaled per page. It runs
  once per bucket (~50 s while cycling) and on a city switch or a weather change,
  and it is a synchronous block on the main thread. It should be 20–80 ms; if it
  is worse, lower the hachure counts first (`conifer`, the pagoda eaves, the CN
  Tower pod) and then drop the page cache from 3 to 2.
- **Mobile layout at real sizes.** The crop logic and the wrap on the bottom bar
  are reasoned, not screenshotted.
- **Open-Meteo from `file://`.** A `file://` page has an opaque origin; the fetch
  may be blocked by the browser or allowed because Open-Meteo sends
  `Access-Control-Allow-Origin: *`. Either way the code catches it and the card
  degrades to "offline · last known".
- **The paper grain / ruled lines** are real (a tiled noise pattern and a tiled
  rule pattern, drawn under the ink) but they are not in the previews, which
  skipped canvas patterns.

---

## Unfinished / next

- No sound: per the shared spec the WebAudio engine is out of scope, and the
  `sound` button is left out rather than stubbed.
- Own-time mode keeps the current city's page and drives it with your clock; the
  card says `own clock · Open-Meteo`. There is no separate garden-only page.
- The weather is re-fetched every 15 minutes and on `↻`; there is no manual
  "retry" beyond that, and no attempt to use the API's hourly data.
- The caption (city, page time, rain/snow) is drawn top-right on the page; on a
  portrait phone the crop pushes it off. It is decorative — the card carries the
  same information.
- Bucket boundaries are still visible as a re-draw if you stare at one spot; the
  0.9 s cross-fade and the continuous veil make it read as "the artist redrew the
  page", but a second sketch layer at half-bucket offset would hide it completely.

## Two ideas worth keeping

1. **Cache the picture, animate the light.** A page is drawn once per
   (city, mood bucket, weather) and then kept as an image; the only per-frame
   colour work is one translucent `moodAt(hour).tint` veil plus warm glow sprites
   for lit windows and lanterns. That buys an expensive hand-drawn look at a
   cheap steady-state cost, and it is the trick that makes a 60 fps ink drawing
   plausible at all.
2. **One fixed anchor, five backdrops.** Making the pagoda garden a constant
   foreground object and letting the city be the backdrop gives the series an
   identity (it is always *the same place you are sketching from*) and makes the
   five pages comparable at a glance. The per-city guest in the garden — tulips,
   maple leaves, hibiscus, lanterns, ferns — carries identity without breaking
   the composition.
