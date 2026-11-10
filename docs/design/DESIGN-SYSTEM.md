# Bonbon Boing! Design system

**Sources of truth**:
- `design/tokens.json`: every colour, size, spring, timing, particle and sound value. Generate CSS variables and a TS `tokens.ts` from it at build time and never hand-copy numbers.
- `design/lib/bonbon.js`: the reference SVG character renderer. Port its geometry 1:1 to Canvas2D.
- `design/design-system-sheet.png`: the visual reference (rendered from `design/sheet.html`).
- `mockups/`: screens at six real viewports.

## 1. Pillars
1. **Squishy first.** Everything that can be touched responds with squash, wobble and a sound. Nothing is perfectly still for 3 s.
2. **Pastel world, saturated characters.** The world is milky pastel (sky blue, lilac, strawberry milk). The characters and buttons carry the saturation. Never use desaturated or grey UI.
3. **Glossy candy finish.** Every body and button has a light top, a dark bottom, an inner glow, a specular blob plus a dot, and a rim light.
4. **Baby schema.** Big round heads, low-set big eyes, tiny mouths, blush. The Kirby rule: **faces never stretch**. A face only moves and scales uniformly (0.92–1.08) while the body squashes.
5. **Readable at a glance.** Dark flavour outlines separate characters from the pastel world, and every flavour has a unique accent silhouette, so colour is never the only cue.
6. **Kind feedback.** There are no fail sounds harsher than a falling two-note pentatonic "aww", and game over is cute: the friends float up into the cloud.

## 2. Palette (tokens `color.*`)
Each flavour has 7 stops: `base`, `light`, `dark`, `outline`, `blush`, `glow` and `inner`.

| flavour | base | light | dark | outline | accent |
|---|---|---|---|---|---|
| Berry Kitty | #FF4F93 | #FFA3CB | #D9206A | #7A1446 | cat ears |
| Peachy Bear | #FF8A3D | #FFC48F | #E25E12 | #7F3209 | bear ears |
| Lemon Chick | #FFCC29 | #FFF0A0 | #EBA200 | #7D5600 | tuft |
| Minty Bun | #2ED69A | #9BF4CD | #10A874 | #0B5A41 | bunny ears |
| Blu Pup | #3F8CFF | #A2CBFF | #1E5FDB | #123377 | floppy ears |
| Grape Axolotl | #A262FF | #D5B5FF | #7338E3 | #3C1A84 | gills |

- **World**: sky gradient #B9E4FF → #E7D5FF → #FFD6EC. Clouds are white with a #E9DCFF shade. The strawberry milk sea runs #FFC2DF → #FF9CCB with #FFF3FA foam. Candy-cane walls are white/#FF8FC0 with a #C94A86 outline. The icing line is #FF5C9E (warn: #FF2F6E).
- **UI**:
  - Ink #3A1F4D, never pure black. It's used for all outlines, faces and text.
  - Paper #FFF9F3.
  - Primary pink, secondary sky, gold and tertiary (white→lilac) buttons, each with a darker "lip".
  - The scrim is a lilac→pink gradient at 30%, never grey.
- **Contrast rules** (`contrast.*`, verified on the sheet): flavour outline vs sky ≥ 7:1, outline vs base ≥ 3.3:1, ink on paper ≥ 12:1. White text on buttons needs ≥ 3:1 *plus* the ink sticker stroke.

## 3. Character construction (`bonbon.js`, unit box 100×100)
- **Body**: the mochi-egg path `M50,6 C80,6 98,28 98,56 C98,80 78,94 50,94 C22,94 2,80 2,56 C2,28 20,6 50,6 Z`. It's wider at the bottom, like a sitting plush. The drawn width is 2.05 × collision radius.
- **Layers, back to front**:
  1. ground shadow (ink at 18%, squashes with sx)
  2. accent (behind)
  3. body vertical gradient: light at 0, base at 0.45, dark at 1
  4. inner glow (radial light at 0.46/0.38, 60%)
  5. bottom shade (radial dark at 0.5/1.15, 55%)
  6. rim light (a light stroke on the lower-right edge, 60%)
  7. Pip cream cap (wavy white top, coated Pip only)
  8. outline (flavour outline colour, 4.5 units, round joins)
  9. specular blob (ellipse at 29,25, 16×7.5, rotated −28°, white at 85%) plus a dot at (51,15) r 3.6 and a small dot at (16,42)
  10. floppy ears (the one front accent)
  11. face
- **Face**: eyes at (50 ± 18, 57), ellipse rx 7 ry 9, in ink. Each eye has 2 catchlights (big upper-left, small lower-right). Pip's eyes are at ±16 with rx 8, ry 10. The blush is two ellipses below the outer eye corners. The mouth is tiny (≤ 10 units wide); Berry Kitty uses a cat "ω" mouth.
- **Expressions**: `idle`, `happy` (closed ^ ^ eyes plus an open smile), `tickled` (>< eyes plus a wobbly mouth), `wow` (round eyes with big catchlights, 'o' mouth), `love` (heart eyes), `worried` (raised brows plus a sweat drop), `sleepy` (closed arcs, used by chonks and new rows).
- **Squash** pivots around bottom-centre. The face is a rigid decal that rides down by (94−60)(1−sy) and scales uniformly within 0.92–1.08.
- **Pip**: white body with outline #3A1F4D and a green sprout. When coated, the body takes the flavour gradient and the white wavy cap stays, so Pip reads against same-colour Bonbons.
- **Type markings**:
  - Jelly: extra specular plus a dotted inner sparkle ring.
  - Marshmallow: 20% less gloss plus 5 white powder dots.
  - Chonk: size 3, sleepy face until first touched.
  - Bubble: a translucent white sphere with a rainbow rim highlight around an s1 Bonbon.
  - Heart: a small heart badge at top-right, in ink outline.

Reference renders: `design/_test/chars.png` and `design/design-system-sheet.png`, the "Characters" and "Expressions" sections.

## 4. UI components
- **Candy buttons** (pill, radius 999):
  - Gradient top→bottom with a 6 px solid lip (`elevation.lip`), a white gloss strip over the top 28% (left 14% → right 30%) and a soft coloured drop shadow.
  - Pressed: translateY(5px), lip 1 px and scale (1.06, 0.90), with the `uiPress` spring. On release it overshoots to 1.08 with `uiPop`.
  - Sizes: Play 64–72 px tall, secondary 52 px, round icon buttons 52 px.
  - Hit targets are ≥ 48 px with an 8 px gap.
- **Icons**: inline SVGs with 3 px ink strokes and round caps, in a 24-unit box (book, gear, heart-card share, pause, swap, sound). No emoji.
- **Panels and cards**: paper #FFF9F3, radius 30 (modals 34), shadow `elevation.panel`. Stat chips sit on #F3E6F7 with radius 22.
- **HUD (portrait)**: a top band, height clamp(VH·0.08, 60, 76) px:
  - left: a pause button
  - centre: the score in Fredoka 40 with a sticker stroke
  - right: a best/mode chip
  - Next bubble: on the field, under Puff, to the right (world (800,182) r 44)
  - Stage chip and streak: small chips under the score
- **HUD (landscape and desktop)**: the field is centred at full height. The left panel has the score, best and stage; the right panel has the Next card, the Swap button and pause. The panels never overlap the field.
- **Toasts**: a paper pill at the top of the field with a 1.6 s life and the `uiPop` spring in.
- **Big words**: Fredoka 52/72, rainbow or tier colour fill, a 0.14em ink stroke plus a white inner stroke, rotated −6°. They scale 0 → 1.15 → 1 (`uiPop`) and hold for 900 ms.
- **Score pops**: Fredoka 26, white fill with an ink stroke. They rise 60u over 650 ms and fade over the last 200 ms.
- **Toggles**: track #D9CBEA (on: #2ED69A), with a white knob that squashes while sliding.
- **Focus**: a 3 px #3FB8F5 ring with a 3 px offset, on all focusable items.

## 5. Typography (`typography.*`)
- **Fredoka** (variable, weights 600/700, `@fontsource-variable/fredoka`): logo, score, buttons, titles, big words.
- **Nunito** (700/800/900, `@fontsource/nunito`): labels, body, captions. Labels are uppercase with 0.08em tracking.
- **Scale**: phone/desktop sizes per token. Display text on the sky always gets the sticker stroke.
- **Logo**: "Bonbon / Boing!". Each letter is a flavour colour with an ink outline and a light top gloss; the letters sit on a slight wave (±4°, ±3 px). The logo is *excluded* from uiScale zoom (`data-nozoom`) and sized by viewport width.

## 6. Layout and scaling
- **The world is fixed at 1000×1600u** and scaled to fit, so aiming geometry is identical everywhere.
  - Portrait: the field is top-aligned under the HUD at width = VW (or less, if height-limited), and the extra space below is milk sea.
  - Landscape: the field is height-fit and centred, with side panels.
- **UI zoom**:
  - portrait uiScale = clamp(VW/430, 1, 1.2)
  - landscape and desktop uiScale = clamp(VH/430, 1, 1.6)
  - Apply `zoom`, or `transform: scale` with layout compensation, to `.ui` groups.
- **Safe areas**: respect `env(safe-area-inset-*)`.
- **Hard rule**: no UI element overlaps another, and none goes offscreen, at 360×640, 390×844, 430×932, 844×390, 932×430 and 1280×800. The QA hook `window.__checkOverlaps()` must return `[]` (see BUILD-BRIEF).

## 7. Motion (`motion.*`)
- **Springs** are specified as ω (rad/s) and ζ. Equivalents: tension = ω², friction = 2ζω.

| spring | ω | ζ | use |
|---|---|---|---|
| uiPress | 30 | 0.42 | button press |
| uiPop | 18 | 0.38 | button release, toasts, big words |
| wobbly | 13.4 | 0.45 | Puff, cup, panels in |
| pipSquash | 38 | 0.26 | Pip squash recovery |
| bonbonJiggle | 22 | 0.16 | body jiggle after hits |
| bonbonHome | 9 | 0.55 | ring anchor |
| faceFollow | 16 | 0.7 | eye look-at |
| camera | 7 | 0.9 | zoom during Fever |

- **Easings**: outBack (rises, pop-ins), outCubic (pops), inOutSine (idles), outElastic (rare: logo), inBack (exits).
- **Squash**:
  - Launch: (0.72, 1.39).
  - Hit: along the normal 1−a, perpendicular 1/(1−a), where a = clamp(speed/2600, 0.12, 0.38). Area is conserved.
  - Bonbon dent ≤ 0.30r.
- **Hitstop** (ms):

| event | ms |
|---|---|
| sweet pop | 45 |
| hug chain end | 70 |
| chonk pop | 90 |
| bank boing | 50 |
| new best | 120 |
| last heart | 160 |

  The cap is 400 ms per shot. During hitstop **only the bodies freeze**; particles, UI and input keep running.
- **Slow-mo**: last-heart approach at 0.25×, ramping back over 400 ms.
- **Shake**: trauma² with a max of 1% of screen height, decaying 1.8/s, field layer only. It can be turned off.
- **Reduced motion**: see GDD §10.14.

## 8. Particles (`particles.*`; the exact counts, speeds and lives are in tokens and win over this summary)

| particle | shape | count | life | notes |
|---|---|---|---|---|
| sugarSparkle | 4-point star | 6–10 | 500 ms | spins, white/gold |
| juiceDrop | teardrop | 5–8 | 600 ms | flavour colour, stretched along velocity, splats on the floor |
| confetti | rounded rect plus a heart | 40 | 1.4 s | flutters, rainbow |
| heartSpark | heart | — | 140 ms | flies between hug-chain members |
| puffRing | ring | — | 280 ms | 0.6 → 1.7 scale, white |
| cloudPoof | round puff | — | 400 ms | — |
| coatSplat | droplets | 6 | 120 ms wipe | — |

- Budget: 260 live particles (120 in low-power mode).
- Particles are pooled, with no allocation per frame.

## 9. Sound tokens (`sound.*`)
- **Buses** (dB): master 0, music −14, sfx −4, ui −12.
- **The pentatonic ladder** (G4…A6, 12 rungs, Hz in tokens) maps pop index → pitch.
- **Every event** in `sound.events` names its source file(s) in `audio-src/`, its gain, pitch variation and voice limit.
- **Music**: title *Happy Vibes*, play *Cozy Puzzle In-Game 1*, zen *Cozy Puzzle In-Game 2*. Duck −9 dB under stingers.
- **Haptics** patterns are in tokens.
- Provenance and licences: `audio-src/SOURCES.md` (all CC0).

## 10. Do / don't
- **Do**:
  - Use ink outlines on everything.
  - Use two catchlights per eye.
  - Squash around the bottom.
  - Use saturated buttons on pastel.
  - Pick one hero colour per screen (pink).
  - Use rounded everything.
  - Use sparkles as punctuation.
- **Don't**:
  - Use grey or black scrims.
  - Use pure black.
  - Stretch faces.
  - Use thin 1 px lines.
  - Use emoji icons.
  - Use sharp corners.
  - Use text over a busy field without a paper chip.
  - Use more than 2 big words per shot.
  - Use red "fail" colours. Warnings use frostingWarn pink plus worried faces.
