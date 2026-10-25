# Silhouette parallax — pagoda garden

`index.html` is the whole prototype: one file, no imports, runs from `file://`.
Style: layered silhouette parallax (lo-fi flat-vector background), not 3D.

## What it is

- **Sky** — vertical gradient from the shared `MOOD` table (copied verbatim from
  `pagoda/relax.html`), sun/moon disc with glow, stars at night, three soft cloud
  bands drifting at 0.10/0.13/0.16×.
- **Far** — the city silhouette, faded 55% / 42% toward the sky colour (two tones
  give the range depth): Vancouver's coastal ridge, Toronto's lake skyline +
  Rogers Centre dome, Hawai'i's notched Diamond Head, Hong Kong's dense stepped
  tower cluster, Amsterdam's row of narrow gabled houses with gaps + church spire.
- **Water** — horizontal shimmer lines scrolling at 0.35×, a soft reflection
  column under the sun/moon, plus one signature actor per city: Vancouver's whale
  fluke, Hong Kong's junk, Hawai'i's outrigger canoe.
- **Mid** — *the same pagoda garden in every city*: identical pagoda, torii,
  stepping path, pond, two conifers, rocks, bushes, stone lantern, beach/quay
  band. The city landmark (CN Tower, hibiscus, lantern posts, canal + bridge +
  boat) is added in front of it.
- **Near** — the darkest foreground: grass edge with tufts + city trees (conifers,
  maples, palms, elms) with tulip dots in Amsterdam; rain/snow/fireflies on top.
- **Motion** — every layer drifts horizontally at its own speed (far 0.22, mid
  0.40, near 0.70, water 0.35, clouds 0.10–0.16); nothing rotates. `prefers-
  reduced-motion` freezes all drift/clouds/shimmer/fireflies (rain and snow keep
  falling slowly, since that is the weather itself).
- **UI** — bottom bar: time slider + clock + `cycle` (full day in 7 minutes) +
  own time + the five cities + clear/rain/snow. Top-left card is the relax.html
  card: place, real local time via `Intl`, condition/temperature from Open-Meteo,
  `↻` refresh, collapsible, degrades to "Offline · last known". Prefs persist in
  `localStorage` (hour, cycle, weather, city, card open).

## Cache strategy (the 60 fps claim rests on this)

Three offscreen canvases — far, mid, near — hold the static art. They are
repainted only when the city, the canvas size or a *quantised* palette bucket
changes, and then only **one layer per frame** (a change queue). Between changes
a frame is: 1 tiny gradient-strip fill, 1 full-screen stretch blit, 3 layer
blits ×2 (for the seamless horizontal wrap), water + shimmer + reflections,
≤30 cloud sprite blits, the city actor, weather particles and a cached vignette.
DPR is capped at 1.5 (Chromium) / 1.25 (Firefox) exactly like `relax.html`.

## Verified (no browser)

- `node --check` on the extracted inline `<script>`: **PASS**.
- The extracted script was evaluated in a stubbed DOM and `render()` was called
  for 6 scenes × 3 weather states × 7 hours (0.05 weather steps to converge the
  crossfade): **no exceptions** (`SMOKE: PASS`).
- Garden constancy was asserted from the generated geometry: **18/18 mid-layer
  subpaths are byte-identical in all six scenes**, and the pagoda's base is at
  the same x/y in every city (`x = 0.341 DW`, `y = 684`). Near-layer grass ground
  + tufts are also identical (17/21 subpaths; Amsterdam differs because its
  foreground is two canal banks).
- Silhouettes were checked as ASCII rasters of every path (hand-authored points,
  no noise), and — after the Lead's suggestion — as 1280×720 rasteriser renders
  of each city at day and night using the page's own palette functions. That pass
  caught three real problems: a pagoda that read as a fir tree (fixed by making
  the eave tips upturned and the overhang wide), a washed-out mid layer (fade
  ladder retuned), and a beach band that glowed at night (night fade added).
  Those throwaway files were deleted.

## Estimated, not verified

- 60 fps at 2560×1440 in Chromium: designed for it (see cache strategy) but not
  measured — no browser was used.
- Live Open-Meteo fetch from `file://`: the code path is shared with
  `relax.html`, but the validation harness was offline, so only the failure path
  was exercised.
- Firefox DPR cap and `prefers-reduced-motion` were read but not run in a browser.

## Unfinished / would change next

1. **The pagoda at small sizes.** It is a 3-tier approximation and reads clearly
   from roughly 150 px tall; at ~100 px it can still be mistaken for a decorated
   conifer. Next: one more tier and slightly shallower roof wedges, plus a curved
   ridge line (more points per roof) once the silhouette budget allows.
2. **One-directional repeat.** Each layer is one screen wide, so a pagoda exits
   left and re-enters right every screen-width (very slow at these speeds, but
   visible after a few minutes). A 2-screen-wide mid tile, or a slow ping-pong
   ease at the ends, would remove it.
3. **Dusk colour.** Colours are mixed toward the sky rather than given relax's
   multiply grade, so the sunset reads flatter than the voxel page. A cheap
   full-screen multiply pass only during the 0.2 < ta window would bring the
   warm grade back without affecting the steady state.
4. City water actors are static silhouettes (no ripple trail); the whale could
   get a two-line wake that fades, and the junk a lantern reflection.
5. Amsterdam's canal/houses are the least readable at a glance; narrower houses
   with larger stepped/bell gables and a more obvious humpback bridge would help.

## Worth keeping for the real page

- The **ink → sky fade ladder** (`0.55 / 0.42 / 0.26 / 0.12 / 0.055 / 0` plus the
  water mix): one colour per city produces every depth band, and it stays right
  through rain, snow and night without any per-layer grades.
- The **one-dirty-layer-per-frame cache pump**: the palette can cross-fade
  continuously while each 4K layer is repainted at most once per frame.
- The **constant garden**: same pagoda/torii/path/pond/trees in all five cities
  is what makes the series feel like one place; city identity belongs in the far
  layer, the water and the foreground trees.
- The **1-D sky gradient strip** stretched to full screen — the cheapest way to
  keep a smooth, always-changing sky.
