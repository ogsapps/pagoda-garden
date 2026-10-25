# Prototype: silhouette parallax

A poster that moves: flat layers drifting at different speeds, nothing modelled in 3D.

## Look
- Sky: vertical gradient (reuses the existing `MOOD` table) + sun/moon disc + soft
  cloud bands.
- Far layer: city skyline silhouette, tinted 40% toward the sky colour (atmospheric
  fade), built from `sum-of-sines` ridges and hand-authored icon paths.
- Mid layer: the pagoda garden as a flat illustration + the city's landmark.
- Near layer: foreground trees/grass/water, darkest, with rain/snow/fireflies.
- Water: horizontal shimmer lines scrolling very slowly.

## Why it fits relaxing
Nothing rotates, nothing is "modelled" — motion is parallax drift, clouds, water shimmer,
particles. This is the lo-fi-background grammar people already leave on all day.

## City identity
Silhouettes read where geometry doesn't:
- Vancouver: coastal mountain ridge, conifers, whale fluke breaking the water.
- Toronto: CN Tower skyline (thin shaft + pod reads perfectly in silhouette).
- Hawai'i: Diamond Head's notched ridge + palms.
- Hong Kong: dense tower cluster with stepped tops, harbour reflection.
- Amsterdam: row of narrow gable houses with visible gaps, canal, bridge.

## Technique
Vanilla canvas 2D, no libraries. Each layer is a path filled once and translated by a
slow offset; the whole stack is cached and only re-blitted while drifting. Day/night =
existing tint grades over the composed frame.

## Carries over unchanged
`moodAt`, weather state + particles, audio engine, location/weather card, zoom, prefs.

## Effort
Medium. ~500 lines: layer generators, city silhouette paths, composition loop.

## Open questions
- Keep the slow auto-rotation as a horizontal drift instead?
- Do we still want a ground plane at all, or a pure layered view?
