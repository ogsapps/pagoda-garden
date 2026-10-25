# Pixel window — prototype notes

A single-file ambient page: the same little pagoda garden, seen through a window, with five
cities as the backdrop. `index.html` runs from `file://`, no build step, no imports.

Open it and pick a city from the bottom bar. `shots/` holds headless renders of the real
framebuffer (every PNG is the page's own 480×270 output, upscaled 2× with nearest neighbour)
so the art can be reviewed without a browser.

## How it is drawn

**One framebuffer, integer scale.** The scene is painted into an offscreen canvas of roughly
480×270 *art pixels* — the pixel size is chosen so the buffer lands near that size on any
window (`p = round(min(cssW/480, cssH/270) * dpr)`), then blitted with
`imageSmoothingEnabled = false` at an integer multiple. At 1920×1080 that is exactly 480×270;
at 2560×1440 it is 512×288 at 6 device px per art pixel. On portrait windows the buffer keeps
a landscape 1.62:1 shape and is letterboxed onto a dark "wall", because a window has a shape.

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
them. Windows, neon and lanterns are drawn *after* the colour grade so they glow at night; the
lit-window list (with per-window blink phase) is collected while baking.

**One grade over the whole frame.** The MOOD table's multiply tint (plus cloud cover and rain
multiply, snow lighten) is applied as full-frame composite fills. That is why the art can be
baked once in daylight colours and still follow the hour continuously — the palette stays
limited instead of being re-quantised every frame.

**The window itself.** Frame bars, two mullions (2 art px, 66% opaque so the city shows
through) and a stone sill are baked into one overlay with a bottom-weighted vignette. The
top-left stays clean because the corner card sits there.

**The garden.** Every city gets the same island at the same screen position
(`buildGarden()`, around 0.215 of the width): three-tier pagoda with red eaves and a gold
finial, a conifer, two canopies, a stone lantern and a few path stones, on a shared near bank.
It is deliberately city-independent — the pagoda's windows and lantern join the same lit-window
list, so the garden is what stays warm while the city lights up behind it.

## Shared with the spec

- `MOOD` table + `moodAt()` copied verbatim from `relax.html`; same hour/7-minute cycle model.
- Weather: `clear` / `rain` / `snow`, cross-faded (rain/snow amounts ease toward targets, and
  drive the particle alpha and the grade). Same three buttons.
- Corner card: same markup/CSS/ids (`#info`), Open-Meteo fetch for the selected city, `Intl`
  city clocks, `↻` refresh, collapsible, "Offline · last known" when the fetch fails.
- Five cities + own-time mode (`own` button: your clock, weather by hand).
- Prefs in `localStorage` under `pagoda-pixel-window.v1`.
- `prefers-reduced-motion`: no parallax, no drifting clouds, no bird flock, and the day cycle
  starts off. Firefox caps DPR at 1.25 (as `relax.html` does).

## Cost

Measured on the real draw path (headless, counting canvas calls per frame):

| state | fillRect/drawImage ops per frame |
| --- | --- |
| clear day, most cities | ~250 |
| clear night, Hong Kong | ~800 |
| rain or snow | ~500–1200 |

The sky is rebuilt only when the hour crosses a 0.05 h bucket (~1/s while cycling), the water
only on city switch or resize. City layers bake once (a one-frame hitch on switching city).
Buffer size is capped at ~300k art pixels.

## Unfinished / weak spots

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
- No audio (deliberately out of scope for the prototypes).

## Ideas worth keeping

1. **Bake the city in daylight colours, grade the whole frame afterwards.** Sky colour, hour,
   weather and cloud cover all collapse into two or three full-frame composite fills, so the
   expensive art is built once and the frame stays cheap and continuous. This is what makes 5
   cities × time of day × weather affordable in a single file.
2. **A shared foreground anchor buys the "one place" feeling for free.** Identical pagoda
   island + shared near bank at a fixed screen position, city only behind it — the five
   skylines read as five views from the *same* window, and it cost one builder function.
3. **Dither with ImageData into a temp canvas, then blit.** Ordered-dither haze, mist bands and
   halos bake in milliseconds and render for one `drawImage` per frame — the whole atmospheric
   look without per-pixel work in the loop.
