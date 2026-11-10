# Research notes: a cute, squishy, glossy web puzzle game

Prepared 10 Nov 2026 for Aieat Assam's next game, which follows Gloop Pop. All links were opened or searched on this date. Licences were checked on the source pages, and the audio candidates are downloaded to `../audio-src/` (see `../audio-src/SOURCES.md`).

---

## 0. What the user liked in Gloop Pop (read from the repo `AieatAssam/gloop-pop`)

- **Look ("Gummy Glow")**: saturated, glossy jelly pieces with faces that are lit from inside, set against a deep plum night counter. The pieces are the only saturated thing on screen. There's a vertical gradient light → base → dark, an inner radial glow, a bottom inner shade, a rim light, a 0.05c outline in each flavour's dark colour, and white specular ellipses at the top left plus a dot.
- **Faces**: vertical oval eyes with catchlights, small arc mouths and blush ovals. Eye styles differ per flavour, and each flavour has a "topper" (stem, leaf, bubble) so you can tell them apart by shape as well as colour.
- **Juice**: exact millisecond tables for pick-up, drag, place, pop, hitstop, trauma shake, slow-mo, combo tiers, haptics and reduced motion.
- **Sound**: real wet pops (Freesound CC0), Kenney CC0 impacts and UI sounds, a pitch ladder in key, an in-key synth layer for phone speakers, and stingers with music ducking.
- **Type**: Baloo 2 800 and Nunito 700/800.
- **Process**: the style guide and design docs are exact enough that a coding agent can implement them without inventing anything. *I copy that level of detail here.*

Takeaway: keep the gloss, faces, exact juice tables and in-key audio. Change the mechanic **and** the world: daytime candy sky instead of a night counter, plush-animal "Bonbons" instead of jelly blocks, and bounce physics instead of grid placement.

---

## 1. Why cute works: baby schema / Kindchenschema

- Konrad Lorenz's *Kindchenschema* (1943) lists the infant features that trigger care and warmth: a large round head, big low-set eyes, a high forehead, a small nose and mouth, chubby cheeks, short plump limbs and soft rounded outlines. Later experiments confirm that these features drive caretaking motivation. Source: "The Cuteness Factor", DIS '23 pictorial, https://doi.org/10.1145/3563657.3596035
- The same pictorial asked artists what makes things cute. Their answers: round plushy heads bigger than the body, pastel **or vibrant** colours, soft/jelly materials, *"not glassy"*, a **mouth, eyes and nose that sit close together**, dumb/innocent/clumsy behaviour, "want to eat or bite it", and floppy ears.
- A mascot-cuteness study (Univ. of Tartu thesis, http://hdl.handle.net/10062/58440) found that roundness was the most-mentioned cue. Its hypotheses: bigger eyes, rounder features and simpler designs are rated cuter (Pusheen cited for roundness and minimalism).
- Envato Tuts+ "Elements of cute character design" (https://design.tutsplus.com/articles/the-elements-of-cute-character-design--vector-3533): the head can be up to half the body length; place **eyes and ears low** for a long forehead; keep eyes wide apart and forward-facing; use a small mouth near the eyes, because big mouths look dangerous; give everything thick, round, soft contours with no sharp angles.
- CLIP Studio "How to draw cute characters" (https://tips.clip-studio.com/en-us/articles/7135): push proportions to extremes, put eyes in the lower half, use clear circular silhouettes and innocent, clumsy poses.
- **Kirby (HAL, GDC 2023, The Verge, https://www.theverge.com/2023/3/31/23663707/kirby-interview-gdc-2023-kirby-and-the-forgotten-land-nintendo)**: Kumazaki says they decided which parts of Kirby may stretch. *They never stretch the eye-to-mouth distance or the distance between the eyes*, because "that cuteness quickly becomes quite scary." → **Rule for us: the body squashes and stretches, but the face is a rigid decal that only translates and scales uniformly.**
- Kirby's simple round form makes him easy to draw and lets him take any shape while staying recognisable (Kirby developer interviews, https://shmuplations.com/kirbysadventure/).

## 2. Squishmallows design language

- One consistent plump, egg- or blob-shaped body with velvety fabric and **simple embroidered faces**. Each character differs only in colour and a few soft accents (ears, horns, fins, a pineapple top), and all accents stay soft. Sources: 1000logos (https://1000logos.net/squishmallows-logo/), The Toy Insider (https://thetoyinsider.com/spring-2021-squishmallows-review/, https://thetoyinsider.com/squishmallows-food-squad-review/).
- Faces: small black embroidered eyes, a "whisper of a smile", and often a blush. The brand palette is pastel green, orange, purple, yellow, teal, pink and grey.
- Jazwares' head of product development (Walgreens interview, https://corporate.walgreens.com/news-and-stories/stories/retail-customer-experience/adorable-bounty/) says the surface is smooth and soft, *so they can't add wrinkles or glossy eyes*. The target reaction is: *"I want one!"*
- Kawaii framing: rounded blob shapes, large soft features, small mouths, no realism, bright or pastel colours even for animals that are normally dull (Jeremy's Home Store, https://jeremyshomestore.co.uk/blog/jellycat-vs-squishmallow-plushies-which-is-right-for-you/).
- → **Our rule: one body template (a mochi egg) and one face template for every character. Identity comes from colour plus one soft "accent" (cat ears, bear ears, bunny ears, chick tuft, frog eye-bumps, axolotl fronds).** Where Squishmallows are matte, we add the Gloop Pop gloss on top, because the user explicitly asked for glossiness.

## 3. Cute games and why they appeal (prior art to learn from and credit)

| Game | What to take | Source |
|---|---|---|
| **Suika Game** | You learn the one input (release) in seconds. Physics makes predictable inputs lead to *less predictable but fair* outcomes, and that comedy is very streamable. There's no timer. Cute fruit with faces appeals to every age, and failing doesn't feel bad because "the fruit seems fine with it". | https://www.kokutech.com/blog/gamedev/design-patterns/unique-mechanics/suika-game · https://waytoomany.games/2023/10/24/review-suika-game/ · https://awards.cesa.or.jp/2024/en/year/prize/15.html · https://www.20minutes.fr/high-tech/by-the-web/4061933-20231112-secret-derriere-succes-soudain-suika-game |
| **Peggle** (PopCap) | One decision ("where do I shoot?") with variable reward. The ascending "bink bink BINK" pitch ladder, menus that play marimba notes, and Extreme Fever (slow-mo zoom on the last peg, then rainbow and Ode to Joy) make it feel like "the game LOVES you". The designers moved from "clear every peg" to "hit the 25 orange pegs" because the last peg was frustrating. A dark Thor theme was tried and dropped for whimsy. | https://trippenbach.org/2009/08/11/anatomy-of-fun-why-peggle-is-a-masterpiece/ · https://www.pcgamer.com/the-making-of-peggle/2/ |
| **Disney Tsum Tsum** | Plush toys turned into a puzzle. Pieces fall and rotate with physics, so the board "feels more like a container of marbles": organic cascades, plus a fever meter and character skills. | https://www.deconstructoroffun.com/blog/2018/10/31/how-disney-tsum-tsum-made-over-a-billion-dollars |
| **Puyo Puyo** | Deliberate chain building, where clearing one group makes the next group connect. Escalating chain voices and rewards. | https://itsfantastic.moe/all-about-puyo-puyo-developer-interview/ |
| **LocoRoco** (Kouno) | Simple controls on purpose (one button, tilt the world) so children and non-gamers could play, while "clear everything" stays deep. Flat, bright, high-contrast 2D blobs with faces. Bold, made-up-language music as part of the identity. "Hey, that's cute, I'd play that." | https://www.gamedeveloper.com/design/the-thoughtful-design-of-locoroco-tsutomu-kouno-speaks |
| **Fall Guys** | Toy-like bean silhouettes and a candy palette (pinks, blues, yellows, pastels) give an inviting, "delicious" world. Bold, simplified colours keep things readable in a crowd. | https://blog.playstation.com/2020/05/25/creating-the-character-designs-of-fall-guys-out-on-ps4-this-summer/ · https://magazine.artstation.com/2020/10/mediatonic-games-fall-guys-art-blast/ |
| **Slime Rancher** | Limbless blobs with one distinguishing trait each (ears, rings, wings). Lightweight expressive faces as masks over a wobbling body, glossy painterly materials and pastel lighting. | https://resources.proceduralpixels.com/resource/r233/ |
| **Neko Atsume / Cats & Soup** | *Iyashikei* (healing) loops: low pressure, no punishing failure, gentle idle animation and collection. Characters should idle and react even when you're not playing. | https://grady.uga.edu/research/book-chapter-neko-atsume-affective-play-and-mobile-casual-gaming/ · https://www.reddit.com/r/CatsAndSoup/comments/163xn13/why_do_you_like_this_game/ |

### 3.1 Novelty check (what already exists; avoid cloning)

I checked these ideas against the market before choosing a concept:
- **Soft-body box packing with a lid that squashes** already exists: *Squish It Out* (Android, Oct 2026, https://appagg.com/android-games/puzzle/squish-it-out-44598714.html), *PACK IT* (iOS), and *Squish Jam* (squishy jar sorting with a lid "slow-rise" squeeze, https://squishjam.com/). → Rejected as a lead concept.
- **Seesaw + Suika merge** already exists: *Tilt Merge* (https://pixelpicked.com/game/3tXmOMniT5H/tilt-merge). → Rejected.
- **Rotating/tilting a jar of candies** already exists: *Tilting Jar* (https://amgsoftwarestudio.com/en/games/tilting-jar) and *Candy Shake Shake*. → Kept only as a runner-up.
- **Jelly-trampoline ball puzzles** exist too: *Wobble Garden* (https://games.grubenhund.com/en/wobble-garden/), handmade levels. **Soft Tetris**: *Softris*.
- Nobody I found combines **Peggle-style aiming + bubble-shooter colour rules + soft-body bumpers whose stiffness changes the bounce + same-colour hug chains + a rising endless tide**, in a plush-candy kawaii style. That's the chosen direction (see GDD).
- Name checks: "Snug Box" is an AI gift service. "Boingle" is an itch.io pinball game. "Wobble Garden" is taken. "Boing Boing" is a Switch dessert-merge game. **"Bonbon Boing" turned up no game** (searched 10 Nov 2026).

## 4. Glossy / jelly / squishy rendering in 2D

- Slime painting recipe (Creative Bloq https://www.creativebloq.com/digital-art/5-steps-creating-photoreal-shine-and-slime-2d-41514653; CG Cookie slime exercise https://www.deviantart.com/cgcookie/art/Exercise-44-Results-Slime-Time-Step-by-Step-595218329):
  1. Start with a saturated base.
  2. Darken the bottom and corners for volume.
  3. Keep the centre denser.
  4. Place **sharp bright specular highlights on the protruding curve facing the key light**.
  5. Add a **thin rim light on the back edge from a secondary light**.
  6. Let background colour show through thin areas (fake translucency).
  7. Add tiny internal bubbles.
- Sweets drawing (CLIP Studio https://tips.clip-studio.com/en-us/articles/8947): candy gloss = one large soft window highlight plus a small hard dot, with colourful reflected light at the bottom.
- Saint11 shading basics (https://saint11.art/pixel_art_articles/article4/): a light direction consistent across the whole scene.
- Gloop Pop's layer stack, proven on phones at 60 fps when cached: shadow → vertical gradient → inner radial glow → bottom inner shade → rim light → outline → specular ellipse + dot → face (live).
- → In Canvas2D, pre-render each body *material* (gradient, glow, shade) into a cached sprite per flavour and size, then deform it at draw time by building the soft-body path and using it as a clip. Speculars are drawn live, offset by squash, so the highlight *slides* over the surface as it deforms (that sliding is what sells "wet jelly").

## 5. Soft bodies, squash & stretch, springs

- **Pressure soft body (ring of point masses + edge springs + gas pressure)**: compute the area with the shoelace formula and push every edge outward along its normal in proportion to how compressed it is. A squashed jelly pushes back harder and springs round again. Draw it as a smooth curve with `quadraticCurveTo` through edge midpoints, with eyes that roll. Sources: Emergent Mind Jelly (https://www.emergentmind.com/visualizations/jelly), Charlotte Dann soft blobs (https://charlottedann.com/article/soft-blob-physics), PressureSoftBodyPhysics (https://github.com/nathanielbrookes/PressureSoftBodyPhysics).
- **Use Verlet + positional constraints, not Euler springs.** Stiff Euler springs explode. Verlet with Gauss-Seidel relaxation passes stays stable, and stiffness becomes "correction factor × iterations". Run a **fixed 1/120 s timestep** with an accumulator and clamp elapsed time. Source: blank0x0/soft-body-sandbox (https://github.com/blank0x0/soft-body-sandbox), plus Kenwright's PBD workshop (https://xbdev.net/physics/workshops/Workshop_11_Position_Based_Dynamics.pdf).
- **Squash & stretch**: preserve volume (sx · sy = 1). Squash on landing and stretch on take-off. Use the bottom as the origin so it squashes *into* the floor. Defaults ≈ 0.3 amount over 0.25 s, scaled by impact speed (debuff.jp game-feel docs https://debuff.jp/docs/game-feel).
- **Springs for motion tokens**: react-spring presets are default {tension 170, friction 26}, gentle {120, 14} and **wobbly {180, 12}** (https://www.react-spring.dev/docs/advanced/config). With mass 1: ω = √tension and ζ = friction / (2ω). Wobbly is ω≈13.4 rad/s, ζ≈0.45.

## 6. Hitstop, shake, particles: impact language tuned for *cute*

- Cue order at 60 fps (GameDesignerX, https://gamedesignerx.com/blog/hit-feedback-in-frames-designing-impact-with-hit-stop-shake-and-knockback): hitstop, SFX and flash on **frame 0**. Particles start on frames 0–1 and last 10–20 frames. Camera shake starts on frames 1–2 and lasts 6–12 frames. **Numbers appear after the freeze**, because during it the eye is locked on the contact point.
- Hitstop durations: light 2–3 frames (33–50 ms), medium 4–6, heavy 8–12, "killing blow" 12–20 frames with a camera push.
- **Freeze the bodies, not the effects.** Let sparks keep flying and shake keep running, or the freeze reads as a dropped frame. Never freeze input (Godot game-feel lab https://github.com/CodingQuests/godot-game-feel-lab; hitstop 0.05–0.2 s).
- Shake: express amplitude as a fraction of screen height (0.4% for light, 1.5% for big). Decay over 8–12 frames, sum and clamp concurrent shakes, and ship a slider down to 0. Use the trauma² model (debuff.jp).
- **For cute**: favour *squash, bounce and scale punches* over shake. Keep shake small and vertical-ish like a jelly table wobble. Use round particles (hearts, sugar sparkles, soft puff rings, candy confetti); hard shards read as violent.

## 7. Colour palettes (cute but not dull)

- Kawaii pastel candy: #FFC8DD #BDE0FE #CDB4DB #FFF1B6 #CAFFBF (https://everyhexcode.com/palettes/kawaii-pastel-candy). Saturated candy-shop: #FF66B2 #FF99E6 #FFC2FF #E6FF99 #B2FF66 (https://www.amazingpalettes.com/palette/candy-shop-whimsy-3/). Kawaii pastel pop: #FFD1DC #B3E5FC #FFF9C4 #B9F6CA (https://designmd.app.br/library/kawaii-pastel-pop).
- Lesson from the user's own history: **desaturated or dull looks fail**, and Gloop Pop's saturated pieces won. Pure pastels everywhere make low contrast mush on phones.
- → **The scheme is "pastel world, saturated characters"**. The background, sky and clouds use high-value, medium-low-chroma pastels. The characters use saturated mid-value candy colours with a dark plum flavour outline and white gloss, so the characters always out-contrast the world (target ≥ 3:1 luminance between body base and the playfield backdrop). Fall Guys and Peggle both use this split.

## 8. Cute SFX and music design

- Cute SFX are short, high, bouncy and rounded off. Pops last 0.1–0.3 s and boings 0.4–0.8 s (fast rise, then a falling wobble). Squeaks last 0.1–0.4 s. Use gentle attacks and avoid harsh metal or rumble. Vary pitch by a few cents or semitones every play. Rising pitch means good; falling pitch means "no". **Use a major pentatonic scale for cascades and rewards** so repeated notes are always consonant (Cotorano Audio https://bgm.cotorano.com/blog/cute-sound-effects-design/).
- Peggle: every peg hit is the next note up a scale ("bink bink BINK"), and menus play marimba notes. The music explodes into a classical melody at Extreme Fever.
- Gloop Pop's proven audio pattern:
  - Real sampled transient plus an in-key synth body (phone speakers cut lows, so add an octave-up sine).
  - Ladder per pop.
  - Duck music under stingers.
  - Pre-mixed sprites.
  - A synth fallback until the audio is decoded.
- Music key detection: I ran a chroma correlation on the candidates. The in-game loop *Cozy Puzzle In-Game 1* reads **G major** (r 0.82, 118 BPM). *Happy Vibes* reads **A major**. *Cozy Puzzle Clear (Jingle)* reads C# minor/E major. → The pop ladder uses **G major pentatonic** during play (G A B D E), and the title screen has no ladder SFX.

### 8.1 CC0 asset shortlist (downloaded to `../audio-src/`; every licence verified on the source page 10 Nov 2026)

| Use | Asset | Author | Licence | URL |
|---|---|---|---|---|
| Pop transients (slice into 6+ variants) | Pops - Mouth | JelloApocalypse | CC0 | https://freesound.org/people/JelloApocalypse/sounds/802606/ |
| Wet pop variants | mouth pops - wet - room | cbenci | CC0 | https://freesound.org/people/cbenci/sounds/325583/ |
| Bounce boing (pitch per size) | Cartoon Boing.wav (jaw harp) | reelworldstudio | CC0 | https://freesound.org/people/reelworldstudio/sounds/161122/ |
| Jelly bounce body | jellybounce_00.wav | Mixtos | CC0 | https://freesound.org/people/Mixtos/sounds/463589/ |
| Giggle-squeak on tickle | Cartoon - Smoochy Squeak + Plop | Breviceps | CC0 | https://freesound.org/people/Breviceps/sounds/444494/ |
| Slingshot stretch / wobble | Cartoon Wobble | Breviceps | CC0 | https://freesound.org/people/Breviceps/sounds/542195/ |
| Squish (catch, marshmallow sink) | Slime Squish | qubodup | CC0 | https://freesound.org/people/qubodup/sounds/442772/ |
| Heavy squish (Chonk hit) | Squish impact | Bertsz | CC0 | https://freesound.org/people/Bertsz/sounds/500912/ |
| Wall bonks, soft impacts | Impact Sounds (130 files) | Kenney | CC0 | https://kenney.nl/assets/impact-sounds |
| UI clicks, toggles, select, drop, pluck | Interface Sounds (100 files) | Kenney | CC0 | https://kenney.nl/assets/interface-sounds |
| Stingers (Fever, new best, level clear) | Music Jingles (85 files: PIZZI, STEEL, SAX, HIT, NES) | Kenney | CC0 | https://kenney.nl/assets/music-jingles |
| **In-game music loop** (G major, 118 BPM, loopable, 2:10) | Cozy Puzzle In-Game 1 | mintodog | CC0 | https://opengameart.org/content/cozy-puzzle-in-game-1 |
| **Title music** (A major, cute, loopable, 0:45) | Happy Vibes | Ruskerdax | CC0 | https://opengameart.org/content/happy-vibes |
| Results clear/fail jingles + loops | Cozy Puzzle Jingle & Result | mintodog | CC0 | https://opengameart.org/content/cozy-puzzle-jingle-result |
| Alt calm loop (Zen/Daily, 90 BPM) | Cozy Puzzle In-Game 2 | mintodog | CC0 | https://opengameart.org/content/cozy-puzzle-in-game-2 |
| Alt cute loop (backup) | Quinklette | Cakeflaps / You're Perfect Studio | CC0 (also CC-BY 4.0 / OGA-BY) | https://opengameart.org/content/quinklette |

Even though attribution isn't required for CC0, credit every author in CREDITS.md and on the in-game Credits screen. The user wants that, and Gloop Pop does the same.

## 9. Typography

- **Fredoka** (Google Fonts, OFL, variable 300–700): very round terminals, a kawaii logo feel, distinct from Gloop Pop's Baloo 2. Get it from `@fontsource-variable/fredoka` or `@fontsource/fredoka`.
- **Nunito** (OFL) for UI/body text: rounded and very legible at 14 px. Get it from `@fontsource/nunito`.

## 10. Key takeaways → design rules

1. **The first 10 seconds must be a toy.** One input (drag to aim, release), something funny happens immediately, the board is already alive, and the first shot is guaranteed to make a musical cascade.
2. **Pastel world, saturated characters, dark plum outlines, white gloss.** Never dull, never all-pastel.
3. **The body squashes, the face never stretches** (Kirby rule). Faces are rigid decals with blink, look-at and reactions.
4. **Bounce is the mechanic.** Squishiness (stiffness) sets how hard each Bonbon launches Pip back. Deformation is visible *and* changes the trajectory.
5. **Sound is a pentatonic instrument.** Every pop is the next note up a G major pentatonic ladder in key with the music. Rising means good, falling means "no". Use real wet pops plus synth bodies.
6. **Freeze the bodies, not the effects.** Hitstop runs 33–160 ms and scales with importance; numbers appear after the freeze; shake stays small.
7. **Credit inspirations openly** (Peggle, Puzzle Bobble / bubble shooters, Suika, Tsum Tsum, Kirby, LocoRoco, Squishmallows, Gloop Pop) with a no-affiliation note.
