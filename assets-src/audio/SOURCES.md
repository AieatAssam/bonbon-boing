# Audio sources (downloaded 10 Nov 2026 on the design box)

Every file here is **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/); licences were read on each source page on 10 Nov 2026. Freesound files are the public HQ preview MP3s. Credit every author anyway (CREDITS.md + in-game Credits).

| file | title | author | page | sha256 |
|---|---|---|---|---|
| `freesound/fs802606_pops-mouth_JelloApocalypse.mp3` | Pops - Mouth | JelloApocalypse | https://freesound.org/people/JelloApocalypse/sounds/802606/ | `5ce7fa0ca633b0b7…` |
| `freesound/fs325583_mouth-pops-wet_cbenci.mp3` | mouth pops - wet - room | cbenci | https://freesound.org/people/cbenci/sounds/325583/ | `e45288e49ece3020…` |
| `freesound/fs161122_cartoon-boing_reelworldstudio.mp3` | Cartoon Boing.wav | reelworldstudio | https://freesound.org/people/reelworldstudio/sounds/161122/ | `c354584c0d083c13…` |
| `freesound/fs463589_jellybounce_Mixtos.mp3` | jellybounce_00.wav | Mixtos | https://freesound.org/people/Mixtos/sounds/463589/ | `d0723be8ed43724c…` |
| `freesound/fs444494_smoochy-squeak-plop_Breviceps.mp3` | Cartoon - Smoochy Squeak + Plop | Breviceps | https://freesound.org/people/Breviceps/sounds/444494/ | `feaca3e0069d64d1…` |
| `freesound/fs542195_cartoon-wobble_Breviceps.mp3` | Cartoon Wobble | Breviceps | https://freesound.org/people/Breviceps/sounds/542195/ | `1fcda7712efcc371…` |
| `freesound/fs442772_slime-squish_qubodup.mp3` | Slime Squish | qubodup | https://freesound.org/people/qubodup/sounds/442772/ | `72521df6208f6a93…` |
| `freesound/fs500912_squish-impact_Bertsz.mp3` | Squish impact | Bertsz | https://freesound.org/people/Bertsz/sounds/500912/ | `acddec6cc4462525…` |
| `oga/cozy_puzzle_in-game_1_bpm118_0.ogg` | Cozy Puzzle In-Game 1 (G major, 118 BPM, loop) | mintodog | https://opengameart.org/content/cozy-puzzle-in-game-1 | `afa440cb8814907b…` |
| `oga/cozy_puzzle_in-game_2_bpm90.ogg` | Cozy Puzzle In-Game 2 (90 BPM, loop) | mintodog | https://opengameart.org/content/cozy-puzzle-in-game-2 | `364165e65a7103a1…` |
| `oga/ruskerdax_-_happy_vibes.mp3` | Happy Vibes (A major, loop) | Ruskerdax | https://opengameart.org/content/happy-vibes | `0213de5247b59c46…` |
| `oga/cakeflaps_quinklette.ogg` | Quinklette (backup loop; CC0 option chosen) | Cakeflaps / You're Perfect Studio | https://opengameart.org/content/quinklette | `5f16e2500ef6ada1…` |
| `oga/cozy_jingles/` (4 files, incl. License.txt where shipped) | Cozy Puzzle Jingle & Result (Clear/Failure jingles + loops), mintodog | | https://opengameart.org/content/cozy-puzzle-jingle-result | — |
| `kenney/interface-sounds/` (103 files, incl. License.txt where shipped) | Kenney Interface Sounds (100 files) | | https://kenney.nl/assets/interface-sounds | — |
| `kenney/impact-sounds/` (133 files, incl. License.txt where shipped) | Kenney Impact Sounds (130 files) | | https://kenney.nl/assets/impact-sounds | — |
| `kenney/music-jingles/` (89 files, incl. License.txt where shipped) | Kenney Music Jingles (85 files) | | https://kenney.nl/assets/music-jingles | — |

Kenney packs: only copy the files the game uses (see tokens.json `sound.events`) into `assets-src/audio/kenney/<pack>/` with the pack License.txt. Don't ship whole packs.

Key analysis (chroma correlation, this box): Cozy Puzzle In-Game 1 = G major (r 0.82); In-Game 2 = D# minor (r 0.84); Happy Vibes = A major (r 0.86); Quinklette = A major (r 0.68). The pop ladder (G major pentatonic) is tuned to the play loop. If Zen uses In-Game 2, switch the ladder to D# minor pentatonic (D# F# G# A# C#) for that mode.
