> **Superseded.** The live game is Squish Chain (see the README). This brief describes the rejected bounce-and-pop prototype.

# Bonbon Boing! Build brief for the Cursor cloud agent

You are building **Bonbon Boing!**, a squishy bounce-and-pop puzzle web game, from a finished design package. Do not redesign it. Implement it faithfully, then polish the feel.

## 0. Read first (in this order)
1. `docs/GDD.md`: rules, modes, scoring, juice timings, audio plan, tech.
2. `docs/design/DESIGN-SYSTEM.md` plus `docs/design/tokens.json` (**the numbers live here**) and `docs/design/design-system-sheet.png`.
3. `docs/design/lib/bonbon.js`: the reference character renderer (SVG). Port its geometry and layer order to Canvas2D *exactly*. `docs/design/_test/chars.png` shows the result.
4. `docs/mockups/*.png`: the target layouts for screens play, combo, title and results at 360x640, 390x844, 430x932, 844x390, 932x430 and 1280x800. Also read `docs/mockups/html/` (mock.js, screens.js, mock.css), which hold the exact layout math and an overlap checker.
5. `docs/mockups/keyart/*.jpg`: mood and finish targets (gloss, saturation, cuteness). They're not literal layouts.
6. `assets-src/audio/` plus `assets-src/audio/SOURCES.md`: all CC0 audio, already chosen.
7. `docs/research/RESEARCH.md`: background reading (why things are the way they are).

If something is ambiguous: **tokens.json > this brief > GDD > mockups > key art**.

## 1. Stack (no substitutions)
- **Stack**: Vite 6+, TypeScript strict, Canvas2D for the field, DOM/CSS for menus and HUD. Use no game engine and no physics library.
- **Fonts**: `@fontsource-variable/fredoka` and `@fontsource/nunito`, self-hosted.
- **Offline**: `vite-plugin-pwa` (precache everything; works offline after the first load).
- **Tests**: Vitest for unit tests, `@playwright/test` for layout QA.
- **Hosting**: GitHub Pages via GitHub Actions, with base `/bonbon-boing/`.
- **Tokens**: generate `src/tokens.ts` and `src/tokens.css` from `docs/design/tokens.json` with a node script (`npm run tokens`, which runs on prebuild). Never hard-code token numbers.

## 2. Architecture
```
src/
  main.ts            boot, screen router, resize/uiScale, ?qa handling
  tokens.ts/.css     generated
  sim/               deterministic gameplay (no DOM, no Math.random)
    rng.ts           sfc32 seeded
    world.ts         lattice, bonbons, rise, row generation (GDD §6.1)
    shot.ts          fixed-step 1/120 s Pip integration, contacts, rules (GDD §5)
    preview.ts       same code path as shot.ts, stops at first contact
    scoring.ts       GDD §7
    levels.ts        Trail generator plus levels.json (30)
    bot.ts           headless random/greedy players for balance tests
  render/
    materials.ts     cached offscreen body materials per flavour×size×type×DPR
    bonbon.ts        Canvas port of bonbon.js (body path, layers, faces, accents, expressions)
    softring.ts      16-node Verlet pressure ring per bonbon (visual only, tokens.physics.softRing)
    scene.ts         sky, clouds, walls, icing, milk sea, Puff, cup, aim dots
    fx.ts            pooled particles, big words, score pops, shake, hitstop, slow-mo clock
  audio/             WebAudio engine: sprite loader, ladder synth, buses, ducking, voice limits
  ui/                DOM screens: title, play HUD, pause, results, trail map, book, settings, credits, tutorial tips
  store.ts           localStorage (versioned): bests, daily, book progress, settings
```
- **Clocks**: keep *sim time* (freezable for hitstop, scalable for slow-mo) separate from *real time* (particles, UI and input always run).
- **Rendering**: the world is 1000×1600u, scaled to fit (DESIGN-SYSTEM §6). Draw at devicePixelRatio, capped at 2 (3 on desktop if fps holds).

## 3. Milestones (commit after each; keep `main` deployable)
1. **Skeleton**: Vite, TypeScript, tokens pipeline, Pages workflow deployed, a blank sky and fonts.
2. **Characters**: Canvas bonbon renderer matching `chars.png` (all 6 flavours, Pip with coat and cap, 7 expressions, 5 types), with a `?gallery` page showing them all. Compare against the sheet screenshot side by side and iterate until it matches.
3. **Sim core**: lattice, shot physics, contact rules, hug chain, preview, rise and game over, plus Vitest tests:
   - determinism (same seed and inputs give the same result)
   - the preview equals the real path up to the first contact
   - chain BFS
   - scoring
4. **Play screen**: aim/launch input (touch, mouse, keyboard), HUD, Next/swap, cup, the Sweet Rise loop playable end to end.
5. **Juice**: everything in GDD §10 (squash, soft rings, hitstop, particles, big words, shake, idle life, Puff). Tune it by eye in a real browser; it must *feel* squishy.
6. **Audio**: sprite build (ffmpeg in a node script → `public/audio/sfx.ogg` + `.m4a` + JSON), ladder synth, music crossfades and ducking, settings.
7. **Menus**: title (animated heap), results, pause, settings, credits, Bonbon Book, tutorial (GDD §8).
8. **Modes**: Daily Treat (seed, share text, streak) and Sweet Trail (30 levels, stars, Sweet Fever).
9. **Balance**: a bot harness (`npm run balance`) printing median shots survived for random and greedy bots over 300 seeds. Tune until the GDD §6.1 targets hold, and commit the report to `docs/balance.md`.
10. **QA and polish**: layout QA at all six viewports, perf (60 fps target; low-power mode), PWA install/offline check, README, CREDITS, screenshots.

## 4. Layout (must match mockups; zero overlaps)
- **Portrait**:
  - The HUD band is clamp(VH·0.08, 60, 76) px. The field (1000×1600u) is top-aligned under it at width min(VW, (VH−hud)·1000/1600) and centred.
  - Extra height below is filled by the milk sea (extend the sea gradient).
  - The Next bubble is drawn in-field at world (800,182) r 44.
- **Landscape and desktop** (VW > VH):
  - The field is height-fit (VH) and centred.
  - Left panel: score, best, stage, streak.
  - Right panel: the Next card plus Swap plus pause.
  - Panel widths are min(26% VW, 300 px × uiScale). The panels must never overlap the field. If they would, shrink uiScale.
- **uiScale**: portrait clamp(VW/430, 1, 1.2); landscape clamp(VH/430, 1, 1.6). The logo is excluded (`data-nozoom`; width 0.44 VW in landscape and 0.86 VW in portrait, max 640 px).
- **Title**: logo at the top, heap in the centre, Play / Daily+Trail / icon row at the bottom (portrait). In landscape: logo and heap on the left half, the buttons stack on the right half (see `title_844x390.png`).
- **Results**: a paper card with four Bonbon heads peeking over the top edge (see `results_*.png`).
- **Overlap checker**:
  - All interactive and text UI carries the class `.ui`.
  - Implement `window.__checkOverlaps()`, which returns a list of pairs of `.ui` elements whose rects intersect (with a 2 px tolerance), plus any `.ui` element outside the viewport or safe area.
  - Port the mockups' version from `docs/mockups/html/mock.js`.

## 5. QA harness (`?qa`)
- **`?qa` mode**:
  - Seeds every RNG with `qa`.
  - Never creates an AudioContext and never fetches audio.
  - Disables tutorial tips unless `&tut=1`.
  - Sets `window.__ready = true` when the screen is idle.
  - Supports `&screen=title|play|combo|results|pause|book|settings|trail|gallery`, where `combo` is a frozen mid-hug-chain frame.
  - Supports `&freeze=1`, which stops idle animation for stable screenshots.
- **Playwright** (`npm run qa:layout`): for each of the 6 viewports × each screen:
  - capture `qa/shots/<screen>_<w>x<h>.png` at deviceScaleFactor 2
  - assert `__checkOverlaps()` is `[]`
  - assert no console errors
  - assert the canvas isn't blank (sample pixels)
  - Upload the shots as a CI artifact.
- **Every test or browser command** must have a hard timeout (it's a lesson from a previous project, where hangs blocked the agent). Use Playwright's `timeout: 30000` per test plus a global timeout, and never wait on audio.
- **Unit tests** (Vitest): determinism, preview fidelity, chain BFS on hand-made lattices, scoring table, row generator constraints (no s3–s3 neighbours, no single-colour rows), Daily seed stability, and level generator determinism.
- **A manual feel checklist** in `docs/feel-checklist.md`, ticked off with screenshots or short notes:
  - the launch stretch reads
  - a pop freezes the bodies but not the particles
  - faces never stretch
  - chain notes climb
  - jelly visibly launches and marshmallow visibly absorbs
  - the cup catch is satisfying
  - nothing is still for 3 s

## 6. Acceptance criteria
- [ ] Sweet Rise, Daily Treat and Sweet Trail (30 levels) are playable end to end on a phone (touch), desktop (mouse) and keyboard.
- [ ] The Canvas characters match `chars.png` and the mockups (outline, gloss layers, eyes with two catchlights, accents, cream cap on coated Pip).
- [ ] Every juice item in GDD §10 is implemented with token timings. Hitstop never freezes particles or input.
- [ ] Audio follows GDD §11: the pentatonic ladder in key with the play loop, the first tap is never silent (synth fallback), and the toggles persist.
- [ ] The six-viewport layout QA passes with zero overlaps, and the screenshots resemble the mockups.
- [ ] 60 fps on a mid-range phone (Chrome DevTools 4× CPU throttle: ≥ 50 fps during a 6-chain).
- [ ] PWA: installable, works offline after the first visit, with icons at 192/512 plus maskable.
- [ ] `prefers-reduced-motion` is honoured, and there are settings for shake, haptics, colour-assist and left-handed mode.
- [ ] Balance targets are met and `docs/balance.md` is committed.
- [ ] README, CREDITS.md, LICENSE and repo topics are done (§7). Pages is live at `https://<owner>.github.io/bonbon-boing/`.

## 7. Credits, licences and repo metadata
- **README.md**:
  - a pitch (from GDD §1), a GIF or screenshots (from `qa/shots`), how to play, controls and modes, tech, and run/build
  - an **Inspirations** section (GDD §13, worded as "inspired by")
  - the **no-affiliation note** (GDD §13, verbatim)
  - an asset credits summary that links to CREDITS.md
- **CREDITS.md**: every audio file, author, URL and licence (copy from `assets-src/audio/SOURCES.md`); fonts (Fredoka and Nunito, SIL OFL 1.1); inspirations.
- **LICENSE**: MIT for code. Note that the audio is CC0 and the fonts are OFL.
- **Repo description**: "Bonbon Boing! — a squishy, glossy bounce-and-pop puzzle for phones. Inspired by Peggle, Puzzle Bobble, Suika Game & Squishmallows (not affiliated)."
- **Topics**: `puzzle-game html5-game browser-game typescript vite canvas pwa kawaii cute physics soft-body peggle-like bubble-shooter cc0-audio mobile-game`. Set them with `gh repo edit --add-topic` if the token allows; otherwise list them in the README.
- **In-game Credits screen**: the same content, scrollable.

## 8. Audio implementation notes
- Use only the files listed in `assets-src/audio/SOURCES.md` and `tokens.sound.events`. Copy only the Kenney files you use, along with their pack License.txt.
- **Sprite build**:
  1. Trim silence (−50 dB).
  2. Normalise to −1 dBTP.
  3. Mono for SFX, 44.1 kHz.
  4. Encode OGG q5 plus AAC 96k.
- **Music**: transcode to OGG q4 plus M4A 128k. Loop points are the file ends (these are seamless loops); use a 50 ms crossfade on wrap if a click is audible.
- **Ladder**: pop rung k sets the playback rate of the sliced pop sample so its fundamental sits near the rung's Hz (or leave it unpitched), plus the synth marimba at rung Hz, plus an octave-up sine at −10 dB.
- **Unlock**: unlock on the first pointerdown, and resume on `visibilitychange`.

## 9. Do not
- Do not use any trademarked names, characters or art from the inspirations in-game.
- Do not add ads, analytics or network calls beyond static assets.
- Do not use fast mode, and do not skip the screenshot-and-eyeball iteration on characters (M2) and juice (M5).
