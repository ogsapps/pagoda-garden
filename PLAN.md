# Prototype: hand-drawn sketchbook (Rough.js)

Every city as a page in a travel sketchbook: ink lines, hachure washes, paper grain.

## Look
- Warm paper background, subtle fibre noise, faint horizontal ruled lines.
- Scene drawn with `rough.js` primitives: `roughness` 1.2-2, `hachure` fills for shadow
  sides, zigzag for water.
- The pagoda stays but as an ink sketch with a colour wash behind it.
- Slow, subtle animation: the wash gradient shifts a few percent, hatching jitters once
  every few seconds (Rough.js re-seeds), rain/snow drawn as sketch strokes.

## Why it fits relaxing
Feels handmade and analogue; the jitter gives "someone is drawing this" life without
motion sickness.

## City identity
Ink outlines are how people recognise cities from travel sketches:
- Toronto: CN Tower as a couple of confident strokes, skyline hatching behind.
- Vancouver: mountain ridge + conifer sawtooth, whale tail in the pond.
- Hawai'i: Diamond Head ridge, palms, thatched hale.
- Hong Kong: tower cluster with window hatching, junk boat on the water.
- Amsterdam: gabled row houses (2-wide, gaps), bridge, canal hatching.

## Technique
`roughjs` (<9 kB gzipped) + vanilla canvas. Re-drawing every frame is expensive, so:
draw once to an offscreen canvas, then animate only the cheap parts (paper grain offset,
rain). Re-seed the sketch on city change / weather change with a fade.

## Carries over unchanged
`moodAt` (as page tint), weather, audio, card, zoom, prefs.

## Effort
Medium-low. ~350 lines + one small dependency.

## Open questions
- Does the sketch redraw look acceptable during day/night changes, or do we cache per mood
  and fade between two sketches?
