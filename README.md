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
| Weather | `clear` / `rain` / `snow` |
| Ambience | `sound` (browsers need one click before audio can start), volume slider |

Time, weather, volume and zoom are remembered in `localStorage`. The controls fade out
when you stop touching them; move the pointer to bring them back.

## What is in the scene

- ~870 voxels: a three-tier pagoda on a stone platform, pond with lily pads and flowers,
  a stone path, four trees, spire, doorway step.
- Day/night: sky gradient, sun/moon with a halo, a full-screen tint grade, stars, warm
  lantern glow at the doorway and two path lamps at night, fireflies over the pond.
- Weather: rain (streaks plus a cooler, darker wash) and snow (drifting flakes plus a
  soft lift), both cross-faded.
- Audio: a slow four-chord pad (never resolves), filtered-noise wind with a gust LFO,
  rain hiss that follows the rain, occasional soft chimes through a delay.

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
