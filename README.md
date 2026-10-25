# Voxel pagoda garden

A single-file, no-library, relaxing canvas scene: one voxel pagoda garden with a slow
day/night cycle, weather and procedural ambient audio.

**Live:** https://stansz.github.io/pagoda-garden/

## Controls

| What | How |
| --- | --- |
| Look around | drag (arrow keys not used) |
| Zoom | scroll wheel, pinch, the `−` / `+` buttons, `+` / `-` keys, double-click to reset |
| Time of day | the time slider, or `cycle` to let a full day pass in seven minutes |
| Location | `location` picks a city: the scene jumps to that city's local time and its current weather |
| Weather | `clear` / `rain` / `snow` — picking one by hand leaves location mode, because a location always shows its real weather |
| Ambience | `sound` (browsers need one click before audio can start), volume slider |
| Corner card | top-left card shows the place, its real local time, the condition, the temperature and where it came from; click its header to collapse it |

Time, location, weather, volume, zoom and the corner card's state are remembered in
`localStorage`. The controls fade out when you stop touching them; move the pointer to bring
them back.

### Location mode

Vancouver, Toronto, Hawai'i, Hong Kong and Amsterdam. The clock comes from `Intl` with the
city's IANA time zone, so DST is handled and no request is needed. Conditions come from
[Open-Meteo](https://open-meteo.com/) (`current=weather_code,temperature_2m,cloud_cover`),
which needs no API key and allows browser requests; the WMO code picks clear / rain / snow
and the cloud cover flattens the light. It refreshes every 15 minutes and the clock re-syncs
every 30 seconds. Only the fixed city coordinates are sent — nothing about you. Offline, the
clock still works and the weather simply stays where it was.

## What is in the scene

- ~870 voxels: a three-tier pagoda on a stone platform, pond with lily pads and flowers,
  a stone path, four trees, spire, doorway step.
- Day/night: sky gradient, sun/moon with a halo, a full-screen tint grade, stars, warm
  lantern glow at the doorway and two path lamps at night, fireflies over the pond.
- Weather: rain (streaks plus a cooler, darker wash) and snow (drifting flakes plus a
  soft lift), both cross-faded.
- Audio: a slow four-chord ambient progression (Dmaj9 - Bm7 - Gmaj7 - Aadd9) played by a
  five-voice pad and a sub bass, with sparse sine "music box" plucks in a D-major pentatonic
  through a convolution reverb (impulse generated in the page), plus air and a rain bed.
  Everything runs through a compressor and a soft high shelf, and the default level is quiet
  (about -49 dBFS RMS at 18% volume) so it can sit in the background all day.

## Notes on the rendering

Faces are painter-sorted by face-centre depth. The original scene had the `-z` normal as
`(0,0,0)` instead of `(0,0,-1)`, so that face's neighbour probe tested the cube itself and
every `-z` face was culled — that was the "missing side / see-through" bug.

Performance: the voxel layer (sky, faces, grades, stars, sun/moon, lanterns) is painted into
an offscreen canvas and only rebuilt when the camera, the clock or the weather actually
changes; the animation loop blits that layer and draws only the moving things (fireflies,
rain, snow, vignette). Glows are pre-rendered sprites rather than per-frame radial
gradients. This keeps the page pinned at 60 fps even when it is left open all day.

`pagoda/render-test.mjs` in the authoring workspace runs the page's script against a stubbed
canvas and asserts the face normals, the neighbour table (`occ`) and the number of faces
drawn from five camera angles.
