> **Superseded.** The live game is Squish Chain (see the README). This document describes the rejected bounce-and-pop prototype and is kept for history.

# Bonbon Boing! Game design document

Version 1.0, 10 Nov 2026. Author: game art director (research + design phase). Builder: Cursor cloud agent (Composer 2.5, non-fast).
Companion files: `design/DESIGN-SYSTEM.md`, `design/tokens.json`, `design/design-system-sheet.png`, `design/lib/bonbon.js` (reference character renderer), `mockups/*.png` (exact layouts at six viewports), `mockups/keyart/*.jpg` (mood), `research/RESEARCH.md`, `audio-src/` (CC0 audio + SOURCES.md), `BUILD-BRIEF.md`.

**Precedence**: if this doc and `tokens.json` disagree on a number, tokens.json wins. If a mockup and this doc disagree on layout, `BUILD-BRIEF.md §Layout` wins.

---

## 1. Pitch

**Bonbon Boing!** is a squishy bounce-and-pop puzzle for phones. You aim a tiny mochi called **Pip** from a smiling cloud, and it boings through a sky full of glossy plush-candy animals (the **Bonbons**). Pip *borrows the colour* of every friend it bumps, and when it bumps a friend of its own colour, that friend pops, along with every same-colour friend touching it, in a hug chain that plays a rising melody. Each Bonbon's squishiness changes how hard it throws Pip back, so the real puzzle is reading the bounce and setting up the colour, all while the Bonbons float up out of a strawberry-milk sea towards the icing line.

One-line rule a child gets in 10 seconds: *"Pip turns the colour of whoever it bumps. Bump your own colour and they pop!"*

## 2. Concept exploration (3 candidates)

Every candidate had to make gravity, wobble and deformation part of the mechanic, not just decoration. Scores run 1–5.

| | **A. Bonbon Boing!** (chosen) | B. Wobble Jar | C. Snug Stack |
|---|---|---|---|
| Core | Aim Pip, Peggle-style, into anchored soft Bonbons. Pip takes on the colour of what it touches. Same colour pops plus a hug chain. The field rises each shot. | Drop squishies into a jar, then swipe to rotate the jar 90°. Gravity re-sorts the soft pile. Groups of 3+ same-colour bodies in contact pop (Puyo-style chains). | Drop soft plushies into a gift box. They squash to fill it. Press the lid down: fill ≥ 92% for "Snug!", but over-stuff and the lid pops open. |
| Why deformation is core | Each Bonbon's stiffness sets the rebound (jelly launches, marshmallow absorbs). Bonbons dent and shrink when tickled. Pip squashes. Gravity bends every path. | Squash lets bodies squeeze into gaps and touch more neighbours. Pile weight matters. | Compression tolerance *is* the puzzle (a volume knapsack). |
| First-10-s appeal | 5: drag, release, boing-boing-boing with notes, a pop chain and confetti on shot 1 | 4: very tactile, but rotation is less obvious | 4: stuffing cuties in a box is adorable |
| Depth | 4: bank shots, colour priming, type routing, cup catches, rise pressure | 4: rotation planning, chains | 3: per-box optimisation, less replay tension |
| Phone, one thumb | 5: drag/aim/release anywhere | 4: swipe rotations plus drop | 5: drag/drop plus a hold |
| Novelty vs market | 4: the combination of Peggle aim, bubble-shooter colour, soft bounce types, borrowed colour and a rising tide isn't on the market as far as I can find | 2: *Tilting Jar* and *Candy Shake Shake* already exist | 1: *Squish It Out*, *PACK IT* and *Squish Jam* (2026) already do squishy box/jar lids |
| Overnight browser build | 5: circle-vs-circle gameplay physics is deterministic and robust, with soft rings as a visual layer | 3: soft-vs-soft piles are the riskiest physics to stabilise | 3: soft-vs-soft packing plus a lid solver |
| Distance from the user's games | 5: no grid, no placement, no slicing | 4 | 4 (close to Gloop Pop's "fit the pieces") |
| **Total** | **33** | 25 | 23 |

I also rejected *Seesaw + Suika merge* because *Tilt Merge* already exists.

## 3. Name

**Bonbon Boing!** (repo `bonbon-boing`). Web search on 10 Nov 2026 found no game with this name. Taken names I avoided: Boing Boing (Switch dessert-merge), Boingle (itch pinball), Wobble Garden (iOS), SnugBox (gift service). The characters are **Bonbons**, the hero is **Pip**, the launcher is **Puff** (the cloud), and the cup is the **Cuddle Cup**.

## 4. Characters

Six flavours share one mochi-egg body. Identity comes from colour plus one soft accent silhouette, so the game is playable without telling colours apart. Construction rules are in DESIGN-SYSTEM §3.

| id | name | accent | unlock |
|---|---|---|---|
| berry | Berry Kitty | pointy cat ears | start |
| mint | Minty Bun | long bunny ears | start |
| lemon | Lemon Chick | two-curl tuft | start |
| blueberry | Blu Pup | floppy ears (drawn in front) | start |
| peach | Peachy Bear | round bear ears | Sweet Rise stage 2 / Trail 4 |
| grape | Grape Axolotl | frilly gills | Sweet Rise stage 5 / Trail 12 |

- **Pip**: white mochi with a green sprout and 1.15× eyes. Its coat is the current colour, with a white cream cap so it always reads against same-colour Bonbons.
- **Puff**: the cloud with a face at the top centre. It holds Pip in its mouth, inhales while you aim and goes "ptoo!" on launch.
- **Cuddle Cup**: a glossy sky-blue teacup with a heart, floating on the milk sea. It drifts left and right.

### Bonbon types (orthogonal to flavour; the soft-body properties are the puzzle)

| type | look | rule | restitution e |
|---|---|---|---|
| Plush (default) | normal | — | 0.80 |
| Jelly | extra-glossy, dotted sparkle ring | Launches Pip harder (adds energy). Speed is capped at maxSpeed. | 1.18 |
| Marshmallow | matte, 5 white powder-sugar dots, 20% less gloss | Pip *sinks in* for 110 ms (the body visibly dents 0.3), then plops out slowly | 0.42 |
| Chonk | size 3, sleepy face, 1.3× body | 3 puffs: wakes up grumpy-cute on its first tickle. Heavy: Pip barely moves it. | 0.72 |
| Bubble | soap bubble around a size-1 Bonbon | Any hit pops the bubble (it doesn't change Pip's coat). The Bonbon inside becomes a normal Bonbon. | 1.0 |
| Heart (Trail only) | small heart badge top-right | A level goal: pop every heart | as its type |

**Sizes**: s1 radius 44u, s2 58u, s3 74u; Pip 30u (tokens.physics). Two s3 are never lattice neighbours (they would overlap). A Bonbon's size equals its puffs (hit points).

## 5. Core rules (every mode)

1. **Aim**: drag anywhere below the HUD. The aim direction runs from Puff's mouth (500, 235)u towards the finger. The preview dots follow the exact simulated path up to the first contact, then show a dashed ghost Pip, and the first-contact Bonbon looks at you with a "wow" face. The aim angle is clamped to ±84° from straight down.
2. **Launch**: on release, Pip leaves at 1650 u/s. Gravity is 2400 u/s², walls bounce at e 0.88, there's a little air drag, and speed is capped at 2600.
3. **Contact with a Bonbon** (circle vs circle, resolved analytically):
   - **Same colour as Pip → Sweet pop.** The Bonbon pops regardless of size. Then the **hug chain** runs: BFS over same-colour Bonbons that are **hex-lattice neighbours** (tokens.layout.lattice.neighbours) of an already-popped one, popping one every 60 ms. Each pop climbs the pentatonic ladder.
   - **Different colour → Tickle.** The Bonbon loses 1 puff: it shrinks a size with outBack over 160 ms, giggles and dents. A size-1 Bonbon that's tickled pops ("tiny pop", no chain). **Pip's coat becomes that Bonbon's colour** with a coat splat.
   - Pip bounces off with that Bonbon's restitution either way. Popped Bonbons stop colliding after their hitstop.
4. **Rule in kids' words**, shown on the first run: "Bump a friend to borrow their colour. Bump your colour to POP!"
5. **The shot ends** when Pip falls below the milk surface (y > 1480u) or lands in the Cuddle Cup. A shot is force-ended after 14 s, and the stuck rescue applies (tokens.physics.stuckRescue).
6. **Pip queue**: the current Pip plus one next Pip. Tap the Next bubble (or Swap) to swap; free swaps are unlimited. Coat colours are drawn by a seeded RNG, weighted by how many Bonbons of each colour are on the field. A colour that isn't on the field is never dealt.
7. **Cuddle Cup**: 240u wide, at y 1430u. It drifts sinusoidally across x 180–820 with a 7 s period (the phase is seeded), It keeps moving while you aim, and the aim preview never shows it, so a catch is a skill-plus-luck bonus. Catching Pip = **"Catch!"**: +500, no rise this turn, and a bath of hearts.

## 6. Modes

### 6.1 Sweet Rise: endless (the **Play** button)
- **Start**: 4 colours (berry, mint, lemon, blueberry) and 5 rows. Even rows have 6 slots at x = 92 + 163c; odd rows have 5 slots at x = 173.5 + 163c. The row pitch is 122u, and the lowest row sits at y ≈ 1340u. About 18% of slots are empty.
- **After every shot that isn't caught**: every Bonbon rises 122u (520 ms, outBack, a 20 ms stagger per column), and a new row wakes up out of the milk.
- **Warning**: if any Bonbon's top is within one row pitch of the icing line (y 330u), the icing turns `frostingWarn` and pulses, the top Bonbons look worried, and the warn sound plays once.
- **Game over**: after a rise, a Bonbon's top is above y 330u. Everything freezes for 200 ms. Then the Bonbons float up into Puff one by one (gentle and cute, not sad), Puff puffs up, and Results appear.
- **One free "Sugar Rush" per run** (no ads, ever): at the first game over, a card says "Sugar Rush? Pop the top 2 rows!". Accepting poofs those rows in a cascade and play continues.
- **Stages every 12 shots**, each with a toast:
  - Stage 2 adds peach and Jelly.
  - Stage 3 adds Marshmallow.
  - Stage 4 adds Chonks.
  - Stage 5 adds grape and Bubbles.
  - From stage 6, every 2 stages the empty-slot share drops 2% (floor 8%) and the specials share rises 2% (cap 24%).
- **Row generation** (seeded): each slot copies the colour of its upper-left or upper-right neighbour with p = 0.45 (this forms clusters), otherwise it takes a weighted random active colour. Sizes are s2 70%, s1 22% and s3 8% (s3 only from stage 4, never adjacent to another s3). Specials follow the stage weights. It never deals a row that's 100% one colour.
- **Balance targets** (verify with the headless bot, BUILD-BRIEF §QA): a random-aim bot survives a median of 35–60 shots, and a greedy bot (it tries 64 angles and picks the best simulated result) survives more than 150. A typical casual run lasts 4–8 minutes.

### 6.2 Daily Treat
- Sweet Rise with the seed `bonbon-YYYY-MM-DD` (device local date), capped at **40 shots**. The score is final at shot 40 or game over. You get one counted attempt per day (it's tracked); retries are marked "practice".
- **Share text** (copy/share sheet):
  `Bonbon Boing! Daily 2026-11-10 🍓🌿🍋🫐 24,960 · best hug ×9 · 3 catches` plus the URL. The emoji are the four most-popped colours.
- Keep a streak counter, with a freeze token earned every 7 days.

### 6.3 Sweet Trail: levels (30 at launch)
- Fixed boards with no rising. You get 10 Pips, and the goal is to pop every ♥ Heart Bonbon (8–20 per board).
- **Free Pip**: a Cuddle Cup catch, or a single shot scoring ≥ 25,000.
- **Stars**: 1★ for clearing, 2★ with ≥ 3 Pips left, 3★ with ≥ 5 Pips left or a full clear.
- **Boards** come from a seeded generator of shape templates: heart, smile, ring, spiral, zig-zag, two towers, rainbow arch, a cat face, plus a scatter of obstacles. Levels 1–3 are tutorials. Each new type is introduced on its own board, at levels 4 (peach), 6 (jelly), 9 (marshmallow), 12 (grape), 15 (chonk) and 18 (bubble). Ship `levels.json` with 30 seeds plus template ids; the generator must be deterministic.
- **Sweet Fever** (credit Peggle's Extreme Fever):
  1. When Pip is on course to hit the *last* heart (the predicted contact is within 260u), time slows to 0.25× and the camera zooms 1.12× onto the heart.
  2. The music ducks, then comes a 160 ms freeze and the pop.
  3. A rainbow burst, "SWEET FEVER!", and five Fever Cups rise out of the milk (10k · 25k · 50k · 25k · 10k).
  4. Pip falls into one cup, followed by confetti, a stinger and the level-complete card.

### 6.4 Bonbon Book (collection, light meta)
- Each flavour has a page with **5 looks**, unlocked by lifetime pops of that flavour (50, 200, 500, 1,200, 3,000). The looks are cosmetic accessories: bow, flower crown, strawberry hat, star clip, tiny scarf, all drawn on the accent layer.
- Owned looks appear on that flavour's Bonbons at random (20%) in every mode. Tap a Bonbon in the Book to squish it: it plays its squeak and wobbles. This is the Squishmallows collect-them feeling.
- Results show the progress bar to the next look ("Grape Axolotl is almost here!").

### 6.5 Settings, pause, credits
Settings and pause cover:
- Music and SFX volumes
- Screen shake on/off
- Reduced motion (defaults to `prefers-reduced-motion`)
- Haptics
- Colour-assist (puts a faint flavour pattern on bodies and a symbol on Pip's cap)
- Left-handed (mirrors the Next bubble to the left)

Credits list every inspiration and asset author, with the no-affiliation note.

## 7. Scoring

| event | points |
|---|---|
| Tickle | 10 × size (s1 = 1, s2 = 2, s3 = 3) |
| Pop (sweet, chain or tiny) | 100 × size × min(4, 1 + 0.25·(k − 1)), where k is the pop's index within the shot |
| Hug chain bonus (n ≥ 3 in one chain) | 150 · n · (n − 2) (n = 4 gives 1,200; n = 6 gives 3,600) |
| Bank Boing (pop after ≥ 1 wall bounce in the shot) | +250 once per shot |
| Catch | +500 (and no rise) |
| Clean Sweep (field empty) | +10,000 |
| Sweet streak | consecutive shots with ≥ 3 pops raise a multiplier +0.1 per shot (max ×2.0) on that shot's pops; it resets on a 0-pop shot |

The best score is kept per mode (localStorage, with a versioned key). Shot score is shown at the end of each shot if it's ≥ 2,000 ("Sweet shot! +3,240").

## 8. The first 10 seconds (scripted for a brand-new player)

| t | what happens |
|---|---|
| 0.0 s | The title is already alive: the heap breathes and Pip bounces on top. Tap **Play** (one big button). |
| 0.4 s | A wipe brings in the play screen. The Bonbons pop in row by row (40 ms stagger, outBack) with rising plinks. Puff smiles holding a **pink** Pip. |
| 0.9 s | A ghost hand drags down and left. Puff's speech bubble says: "Drag to aim, let go to boing!" The aim preview is already pointing at a big pink cluster (tutorial seed `tut-1`). |
| ~3 s | The player releases. Puff goes "ptoo!", Pip stretches, then hits pink: freeze, pop at G5, then the chain A5, B5, D6, E6 with hearts and "HUG ×5!" confetti. Pip keeps bouncing, tickles a mint (it turns mint, giggle) and bonks a wall. |
| ~6 s | Pip drops into the Cuddle Cup (the tutorial seed guarantees it): "Catch! No rise!" |
| ~7 s | The next Pip is mint, and the aim line already crosses the mint you just tickled. Puff says: "Bump a friend to borrow their colour!" |

Tutorial tips show once each, ≤ 7 words, and are dismissable. Tip 3 (on shot 3, a rise happens): "Friends float up. Don't touch the icing!"

## 9. Controls

- **Touch (primary)**: one thumb, portrait first. Touch-and-drag anywhere in the field aims (a farther finger gives finer control), and release fires. To cancel, release inside the HUD band or on Puff; a small "cancel" ✕ appears when the finger is there. Tap the Next bubble to swap (the hit area is a circle of 56 px). A two-finger tap also swaps.
- **Mouse**: move to aim, click to fire, right-click or `S` to swap.
- **Keyboard**:
  - `←/→` rotate the aim 0.6° per frame (hold `Shift` for 0.15°).
  - `Space`/`Enter` fires.
  - `S`/`Tab` swaps.
  - `P`/`Esc` pauses and `M` mutes.
  - Menus are fully keyboard-navigable with a visible `focusRing`.
- **Haptics** (`navigator.vibrate`, off on iOS Safari, which doesn't support it): sweet pop 8 ms, chonk pop 18 ms, last heart [20, 40, 30], catch 12 ms, warn [10, 60, 10].
- No timers on input, ever. Aiming is never rushed (like Suika: no time pressure).

## 10. Juice (exact). Clock: t = 0 at the contact frame; times in ms

### 10.1 Launch (input release = t0)
- **Puff**: while the finger is down it inhales, scaling to (1.06, 0.94) over 90 ms. At t0 it does a "ptoo": (0.9, 1.1), then springs back with `wobbly`. Its mouth is 'o' for 180 ms. Five cloudPoof particles come out of its mouth.
- **Pip**: stretches to (0.72, 1.39) along its velocity for 80 ms, then returns with the `pipSquash` spring. The launch SFX plays.

### 10.2 Wall bounce
- Pip squashes along the wall normal with amount = clamp(speed / 2600, 0.12, 0.38).
- The candy wall bends 6u at the contact point with the `bonbonJiggle` spring.
- Three white sparkles. The wall SFX plays. No hitstop.

### 10.3 Tickle (wrong colour)
- **t0**: no hitstop. The Bonbon dents: its ring nodes inside Pip's radius are pushed out along the normal, up to 0.30r. Pip squashes and the tickle SFX plays. The face is `tickled` for 260 ms.
- **t0–160**: the Bonbon shrinks a size (outBack). A coatSplat runs: 6 droplets of the new colour, and the coat wipes across Pip from the contact point over 120 ms. Neighbours within 1.6 pitch get a small radial jiggle impulse.
- **t0–700**: the Bonbon jiggles out with `bonbonJiggle` (ω 22, ζ 0.16).

### 10.4 Sweet pop
- **t0**: hitstop 45 ms. Bodies freeze; particles, shake and input do not. The pop SFX plays at the ladder rung. The Bonbon flashes 40% white for 45 ms and its face goes `happy`. Pip squashes. Shake +0.06.
- **t45**: the Bonbon *inflates and poofs*: scale 1 → 1.25 over 60 ms (outCubic) with alpha 1 → 0. One puffRing, 5–8 juiceDrops and 6–10 sugarSparkles. The score pop appears.
- **Neighbours**: within 1.6 pitch they get "wow" faces for 300 ms plus a jiggle impulse.

### 10.5 Hug chain
- For each next member, a heartSpark flies from the previous one over 140 ms (outBack, on a quadratic arc). On landing the member shows a `love` face for 80 ms, then pops with the sweet-pop recipe (the hitstop is skipped on members 2…n−1) and the ladder climbs a rung.
- **The last member, when n ≥ 4**:
  - Hitstop 70 ms and shake +0.20.
  - The big word "HUG ×n!" (rainbow, −6°, 900 ms).
  - 40 confetti.
  - The chain bonus score pop appears under the big word.

### 10.6 Chonk pop
- Hitstop 90 ms, an 8% white screen flash for 90 ms and shake +0.14.
- Its pop scale goes to 1.35, with 2 puff rings and 16 drops. The chonk SFX plays.

### 10.7 Bank Boing
On the first pop after a wall bounce in a shot: hitstop 50 ms and a "Bank Boing!" label (gold, 700 ms).

### 10.8 Catch
- The cup squashes (1.15, 0.87) and springs back with `wobbly`. Pip sinks into the tea with a happy face. Five hearts float up as steam.
- The catch arpeggio plays (G5–B5–D6, 60 ms apart). The "Catch! No rise" label appears (mint, 900 ms).

### 10.9 Milk splash
- 8 milkFoam droplets plus 2 ripple ellipses expanding over 400 ms. "plop" SFX: Kenney `impactSoft_medium` pitched −5 st.
- Pip bobs up and flies back to Puff on a 380 ms arc. Puff "gulps" it with a (1.08, 0.92) squash.

### 10.10 Rise
- 520 ms, outBack, 20 ms per-column stagger.
- The new row wakes: sleepy, then a 300 ms yawn ('o' mouth), then idle. 3–6 bubble blips per Bonbon from the milk. rowRise SFX.

### 10.11 Idle life
- Nothing is ever still for more than 3 s.
- **Blinks**: 70 ms close / 110 ms open, every 2.4–5.2 s at random.
- **Eyes**: they look toward the aim point by up to 0.04w (the `faceFollow` spring).
- **Breathing**: scale 1 ± 0.015 over a 2.6 s period, phased by id.
- **Hops**: every 3 s one random Bonbon does a 6u hop with a squash.
- **Puff**: drifts ±6u.
- **Cup**: bobs ±4u.

### 10.12 Big words and labels
Only one big word shows at a time, queued, with at most 2 per shot. Label priority: HUG ×n > Bank Boing > Catch > Sweet shot.

### 10.13 Last heart, new best, game over
See §6.3 for the last heart and §6.1 for game over.

On a new best: the first frame the score passes the best triggers 120 ms hitstop, a gold banner "New best!", the newBest stinger and 30 gold confetti.

### 10.14 Reduced motion
No shake, no slow-mo, no zoom. Hitstop is capped at 45 ms, particles run at ×0.4, squash at ×0.5, there's no parallax, and big words fade instead of bouncing.

### 10.15 Screen shake
- Use the trauma² model: the max amplitude is 1.0% of screen height, decay is 1.8/s, and rotation is ≤ 0.6°.
- Only the field layer shakes; the HUD never does. There's a settings toggle.
- For cute, prefer squash and jiggle; keep shake small.

## 11. Audio plan

All audio is CC0 and already downloaded to `audio-src/`. The full event table is in `tokens.json → sound`, and the provenance is in `audio-src/SOURCES.md`.

- **Music**:
  - Title: *Happy Vibes* (Ruskerdax).
  - Sweet Rise and Daily: *Cozy Puzzle In-Game 1* (mintodog, G major, 118 BPM).
  - Trail: same as Sweet Rise.
  - Zen variant/backup: *Cozy Puzzle In-Game 2*.
  - Level clear / game over: the *Cozy Puzzle* Clear/Failure jingles.
  - Crossfade 600 ms between screens. Duck −9 dB under stingers (40 ms attack, 600 ms release).
- **The pop ladder is an instrument**: G major pentatonic, 12 rungs from G4 to A6, in key with the play loop. Pop k plays rung min(k, 11). Each note layers:
  - a sampled wet pop transient (6 variants sliced from fs802606 + fs325583)
  - a synth marimba body (sine + triangle 2×, 4 ms attack, 220 ms exponential decay)
  - an octave-up sine at −10 dB for phone speakers
- **Rising pitch means good, falling means "no"**: the warn sound is a falling G4–E4.
- **Variation**: ±3% playback rate and ±1.5 dB on every sample, 6 pop variants, and the same variant never plays twice in a row.
- **Menu buttons play marimba notes** from the ladder (the Peggle trick). Hovering or focusing a menu row ticks one rung up.
- **Voices**: ≤ 6 pop voices (steal the oldest) and ≤ 2 boings. Pops in a chain sit ≥ 25 ms apart.
- **Pipeline** (same pattern as Gloop Pop): pre-render one OGG + M4A sprite with a JSON map in a node build script (ffmpeg). Lazy-decode after the first user gesture. Play a synth fallback for any event whose buffer isn't decoded yet, so the first tap is never silent.
- **Under `?qa`**: the AudioContext is never created and no audio fetches happen. The UI toggles still render. This is the lesson from Hyperbolic Cartographer, where audio during QA caused hangs.

## 12. Accessibility
- Colour-independent identity: accents (ears, tuft, gills) for flavours. With colour-assist on, a symbol on Pip's cap matches the accent of its coat.
- Minimum hit target 48 px. Text ≥ 13 px. Ink on paper contrast is 13.6:1.
- Reduced motion (§10.14), shake toggle, haptics toggle, mute.
- No time pressure on aiming.

## 13. Inspirations to credit (README "Inspirations" section, Credits screen, repo description, topics)
Peggle (PopCap: aim, ladder, Extreme Fever) · Puzzle Bobble / Bust-a-Move (Taito: colour-match shooting, queue and swap) · Suika Game (Aladdin X: cute physics, no timer) · Disney Tsum Tsum (plush toys as a puzzle) · Puyo Puyo (chains) · LocoRoco (soft blobs with faces, simple controls) · Kirby (HAL: "faces never stretch") · Squishmallows (Jazwares: plush design language) · Fall Guys (candy palette) · and the user's own **Gloop Pop** (gloss and juice approach).

**No-affiliation note**: "Bonbon Boing! is an independent fan-made game. It is not affiliated with, endorsed by or sponsored by PopCap/EA, Taito, Aladdin X, Disney, SEGA, Sony, Nintendo/HAL Laboratory, Jazwares or Mediatonic. All names are trademarks of their owners."

## 14. Tech recommendation
- **Vite + TypeScript (strict) + Canvas2D.** No engine is needed: there are ≤ 60 bodies and the effects are custom. PixiJS would add weight without solving the hard part.
- **No physics library.** Use a custom deterministic simulation:
  - Pip is a circle against static circles (Bonbon cores, anchored at home positions that tween during rises), line segments (walls) and the cup's AABB.
  - Fixed dt 1/120 s with an accumulator and a clamp.
  - A seeded RNG (mulberry32 or sfc32), with no `Math.random` in the sim.
  - The **same function** drives the aim preview and the real shot. This makes the preview honest and Daily seeds identical across devices. Avoid order-dependent float drift: iterate Bonbons in id order.
- **Soft bodies as a visual layer**: each Bonbon has a 16-node Verlet ring with edge constraints, area pressure and weak shape-matching to its rest shape, anchored by a spring (tokens.physics.softRing). Contacts push ring nodes, pressure restores the shape, and the body path is drawn through edge midpoints with `quadraticCurveTo`. Only rings that are "awake" (disturbed in the last 1.2 s) simulate; sleeping rings draw from cached sprites with a breathing transform. Pip's squash is a 2-axis spring (`pipSquash`) aligned with its last contact normal.
- **Rendering**:
  - Cache body *materials* (gradient, glow, shade, rim, gloss) per flavour × size × type × DPR into offscreen canvases. Deformed bodies use their path as a clip over the material, so the gloss slides.
  - Faces are drawn live (cheap: ellipses and arcs).
  - Draw the background (sky, clouds, sparkles) into one layer canvas, redrawn only on resize.
  - Target 60 fps on a mid 2021 Android. Low-power mode (auto, when frame time > 22 ms for 2 s) halves the particle budget and disables ring sim on idle Bonbons.
- **DOM UI** for menus, panels and HUD (crisp text, accessibility), using CSS variables generated from tokens.json. The canvas holds the field, Puff, Pip, cup, sea and in-field labels.
- **PWA**: `vite-plugin-pwa` with offline precache of everything (fonts self-hosted via @fontsource, audio sprites). Add a manifest with icons (generate them from `mockups/keyart/keyart-title.jpg` or the logo), a theme colour of `#FFD6EC` and portrait orientation preferred (landscape still supported).
- **CI/CD**: GitHub Actions on push to `main` runs `npm ci` → typecheck → lint → vitest → build → **Playwright layout QA at the six viewports** → deploy to GitHub Pages (`actions/deploy-pages`). Pages base path: `/bonbon-boing/`.
