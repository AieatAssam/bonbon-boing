/* eslint-disable -- generated from docs/design/tokens.json */
export const tokens = {
  "$schema": "bonbon-boing design tokens v1 (10 Nov 2026). Single source of truth: generate src/render/tokens.ts and CSS variables from this file. Never hard-code hex values in game code.",
  "units": {
    "w": "Bonbon body box width in px; body height = 0.9w. All character geometry is in fractions of w (unit box 100 x 100, body occupies y 6..94).",
    "u": "World unit. The playfield is always 1000u wide; height depends on aspect (portrait ~1800u, landscape uses a 1000u x 1000u square field with side HUD).",
    "ms": "milliseconds"
  },
  "color": {
    "flavour": {
      "berry": {
        "name": "Berry Kitty",
        "accent": "catEars",
        "base": "#FF4F93",
        "light": "#FFA3CB",
        "dark": "#D9206A",
        "outline": "#7A1446",
        "blush": "#FF2F7A",
        "glow": "#FF7AB0",
        "inner": "#FFD0E4"
      },
      "peach": {
        "name": "Peachy Bear",
        "accent": "bearEars",
        "base": "#FF8A3D",
        "light": "#FFC48F",
        "dark": "#E25E12",
        "outline": "#7F3209",
        "blush": "#FF4F5E",
        "glow": "#FFA766",
        "inner": "#FFE0C2"
      },
      "lemon": {
        "name": "Lemon Chick",
        "accent": "tuft",
        "base": "#FFCC29",
        "light": "#FFF0A0",
        "dark": "#EBA200",
        "outline": "#7D5600",
        "blush": "#FF7A59",
        "glow": "#FFDF6B",
        "inner": "#FFF7CF"
      },
      "mint": {
        "name": "Minty Bun",
        "accent": "bunnyEars",
        "base": "#2ED69A",
        "light": "#9BF4CD",
        "dark": "#10A874",
        "outline": "#0B5A41",
        "blush": "#FF6F91",
        "glow": "#5FE6B4",
        "inner": "#D4FBEA"
      },
      "blueberry": {
        "name": "Blu Pup",
        "accent": "floppyEars",
        "base": "#3F8CFF",
        "light": "#A2CBFF",
        "dark": "#1E5FDB",
        "outline": "#123377",
        "blush": "#FF6FA8",
        "glow": "#6EA9FF",
        "inner": "#D9E9FF"
      },
      "grape": {
        "name": "Grape Axolotl",
        "accent": "gills",
        "base": "#A262FF",
        "light": "#D5B5FF",
        "dark": "#7338E3",
        "outline": "#3C1A84",
        "blush": "#FF6FB5",
        "glow": "#BB8BFF",
        "inner": "#EFE3FF"
      }
    },
    "pip": {
      "base": "#FFFFFF",
      "light": "#FFFFFF",
      "dark": "#E2D6F2",
      "outline": "#3A1F4D",
      "blush": "#FF6F9F",
      "sprout": "#43D17F",
      "sproutDark": "#1F9A55"
    },
    "face": {
      "ink": "#3A1F4D",
      "catchlight": "#FFFFFF",
      "mouthInside": "#8A1F4E",
      "tongue": "#FF6F8F",
      "sweat": "#9AD8FF",
      "heartEye": "#FF3D86",
      "starEye": "#FFD23F"
    },
    "light": {
      "specular": "#FFFFFF",
      "specularAlpha": 0.85,
      "dotAlpha": 1,
      "shadow": "#3A1F4D",
      "shadowAlpha": 0.18,
      "rimAlpha": 0.6,
      "innerGlowAlpha": 0.55,
      "bottomShadeAlpha": 0.45
    },
    "world": {
      "skyTop": "#B9E4FF",
      "skyMid": "#E7D5FF",
      "skyBottom": "#FFD6EC",
      "cloud": "#FFFFFF",
      "cloudShade": "#E9DCFF",
      "cloudRim": "#FFE6F4",
      "sparkle": "#FFFFFF",
      "milkTop": "#FFC2DF",
      "milkBottom": "#FF9CCB",
      "milkFoam": "#FFF3FA",
      "milkLine": "#FF7DB8",
      "wallStripeA": "#FFFFFF",
      "wallStripeB": "#FF8FC0",
      "wallOutline": "#C94A86",
      "frosting": "#FF5C9E",
      "frostingWarn": "#FF2F6E",
      "fieldTint": "#FFFFFF",
      "fieldTintAlpha": 0.22
    },
    "ui": {
      "ink": "#3A1F4D",
      "inkSoft": "#6E5487",
      "inkMute": "#9A86B0",
      "paper": "#FFF9F3",
      "paperShade": "#F3E6F7",
      "paperBorder": "#E6D2FA",
      "scrim": "linear-gradient(#8E6BFF, #FF5FA8)",
      "scrimAlpha": 0.3,
      "primaryTop": "#FF7DB4",
      "primaryBottom": "#FF3F8A",
      "primaryLip": "#C2185E",
      "primaryText": "#FFFFFF",
      "secondaryTop": "#7FE3FF",
      "secondaryBottom": "#3FB8F5",
      "secondaryLip": "#1E7FB8",
      "secondaryText": "#FFFFFF",
      "tertiaryTop": "#FFFFFF",
      "tertiaryBottom": "#F1E6FF",
      "tertiaryLip": "#C9B3E8",
      "tertiaryText": "#3A1F4D",
      "goldTop": "#FFE36B",
      "goldBottom": "#FFB420",
      "goldLip": "#C77A00",
      "goldText": "#5A3300",
      "focusRing": "#3FB8F5",
      "toggleOn": "#2ED69A",
      "toggleOff": "#D9CBEA",
      "knob": "#FFFFFF",
      "star": "#FFD23F",
      "starShade": "#F0A400",
      "heart": "#FF3D86",
      "coin": "#FFC93C",
      "$scrimComment": "Never a grey/ink scrim (dull). Lilac-to-pink gradient at 30% over the live game; panels supply the contrast."
    },
    "fx": {
      "comboTiers": [
        "#FFFFFF",
        "#FFD23F",
        "#FF7AB0",
        "#7FE3FF",
        "rainbow"
      ],
      "rainbow": [
        "#FF4F93",
        "#FF8A3D",
        "#FFCC29",
        "#2ED69A",
        "#3F8CFF",
        "#A262FF"
      ],
      "scorePopFill": "#FFFFFF",
      "scorePopStroke": "#3A1F4D",
      "aimDot": "#FFFFFF",
      "aimDotStroke": "#3A1F4D",
      "aimDotAlpha": 0.9,
      "puffRing": "#FFFFFF",
      "heartSpark": "#FF3D86"
    }
  },
  "contrast": {
    "rule1": "Characters separate from the pastel world by VALUE OF THE OUTLINE, not body hue: flavour.outline vs world.skyMid >= 7:1 and outline vs base >= 3.3:1 (all verified in sheet). Body base vs sky can be low (lemon 1.1:1) so the outline is never optional.",
    "rule2": "ui.ink on ui.paper >= 12:1; white text on primaryBottom >= 3:1 with 3px ink text-stroke on display text.",
    "rule3": "Colour is never the only cue: every flavour has a unique accent silhouette (ears/tuft/bumps/gills)."
  },
  "typography": {
    "display": {
      "family": "Fredoka",
      "fallback": "ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, sans-serif",
      "weights": [
        600,
        700
      ],
      "package": "@fontsource-variable/fredoka"
    },
    "ui": {
      "family": "Nunito",
      "fallback": "ui-rounded, system-ui, -apple-system, 'Segoe UI', sans-serif",
      "weights": [
        700,
        800,
        900
      ],
      "package": "@fontsource/nunito"
    },
    "scale": {
      "logo": {
        "font": "display",
        "weight": 700,
        "phone": 60,
        "desktop": 84,
        "lineHeight": 0.95
      },
      "hudScore": {
        "font": "display",
        "weight": 700,
        "phone": 40,
        "desktop": 52,
        "tabular": true
      },
      "hudLabel": {
        "font": "ui",
        "weight": 900,
        "phone": 12,
        "desktop": 13,
        "letterSpacing": "0.08em",
        "case": "upper"
      },
      "title": {
        "font": "display",
        "weight": 700,
        "phone": 34,
        "desktop": 44
      },
      "button": {
        "font": "display",
        "weight": 700,
        "phone": 22,
        "desktop": 24
      },
      "buttonSmall": {
        "font": "ui",
        "weight": 900,
        "phone": 16,
        "desktop": 17
      },
      "body": {
        "font": "ui",
        "weight": 700,
        "phone": 16,
        "desktop": 17,
        "lineHeight": 1.4
      },
      "caption": {
        "font": "ui",
        "weight": 800,
        "phone": 13,
        "desktop": 14
      },
      "scorePop": {
        "font": "display",
        "weight": 700,
        "phone": 26,
        "desktop": 30
      },
      "bigWord": {
        "font": "display",
        "weight": 700,
        "phone": 52,
        "desktop": 72
      }
    },
    "displayTextStroke": "display text on the sky gets a 0.14em ui.ink paint-order stroke + 0.06em white inner stroke (sticker look)"
  },
  "radius": {
    "chip": 999,
    "button": 999,
    "card": 22,
    "panel": 30,
    "modal": 34,
    "field": 28
  },
  "space": {
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "8": 32,
    "10": 40,
    "12": 48
  },
  "elevation": {
    "lip": "0 5px 0 {lip}",
    "lipPressed": "0 1px 0 {lip}",
    "soft": "0 10px 24px rgba(58,31,77,0.18)",
    "panel": "0 6px 0 #E3CDEF, 0 18px 40px rgba(58,31,77,0.22)"
  },
  "hitTarget": {
    "minPx": 48,
    "minGapPx": 8
  },
  "motion": {
    "easing": {
      "outBack": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      "outCubic": "cubic-bezier(0.33, 1, 0.68, 1)",
      "inOutSine": "cubic-bezier(0.37, 0, 0.63, 1)",
      "outElastic": "spring:wobbly",
      "inBack": "cubic-bezier(0.36, 0, 0.66, -0.56)"
    },
    "spring": {
      "$comment": "omega in rad/s, zeta = damping ratio. react-spring equivalent: tension = omega^2, friction = 2*zeta*omega (mass 1).",
      "uiPress": {
        "omega": 30,
        "zeta": 0.42
      },
      "uiPop": {
        "omega": 18,
        "zeta": 0.38
      },
      "wobbly": {
        "omega": 13.4,
        "zeta": 0.45
      },
      "pipSquash": {
        "omega": 38,
        "zeta": 0.26
      },
      "bonbonJiggle": {
        "omega": 22,
        "zeta": 0.16
      },
      "bonbonHome": {
        "omega": 9,
        "zeta": 0.55
      },
      "faceFollow": {
        "omega": 16,
        "zeta": 0.7
      },
      "camera": {
        "omega": 7,
        "zeta": 0.9
      }
    },
    "duration": {
      "tap": 90,
      "buttonPress": 70,
      "buttonRelease": 260,
      "modalIn": 420,
      "modalOut": 200,
      "toast": 1600,
      "scorePopRise": 650,
      "bigWord": 900,
      "blinkClose": 70,
      "blinkOpen": 110,
      "blinkInterval": [
        2400,
        5200
      ],
      "idleBreath": 2600,
      "rowRise": 520,
      "screenFade": 240
    },
    "squash": {
      "pipLaunch": {
        "sx": 0.72,
        "sy": 1.39
      },
      "pipHitMaxAlongNormal": 0.62,
      "pipHitScaleBySpeed": "amount = clamp(speed/2600, 0.12, 0.38); along-normal = 1 - amount; perpendicular = 1/(1-amount)",
      "bonbonDentMax": 0.3,
      "uiPressScale": {
        "x": 1.06,
        "y": 0.9
      },
      "uiReleaseOvershoot": 1.08,
      "facesNeverStretch": true,
      "faceMaxUniformScale": [
        0.92,
        1.08
      ]
    },
    "hitstop": {
      "tickle": 0,
      "sweetPop": 45,
      "hugChainEnd": 70,
      "chonkPop": 90,
      "bankBoing": 50,
      "lastHeart": 160,
      "newBest": 120,
      "maxPerShot": 400
    },
    "slowmo": {
      "lastHeartApproach": {
        "scale": 0.25,
        "triggerDistanceU": 260,
        "maxMs": 1100
      },
      "feverRamp": {
        "in": 180,
        "out": 320
      }
    },
    "shake": {
      "model": "trauma^2",
      "maxAmplitudeFracOfH": 0.01,
      "decayPerS": 1.8,
      "add": {
        "sweetPop": 0.06,
        "chonkPop": 0.14,
        "hugChain5": 0.2,
        "lastHeart": 0.45,
        "wall": 0
      },
      "settingScale": [
        0,
        1
      ],
      "rotationMaxDeg": 0.6
    },
    "reducedMotion": "no shake, no slow-mo (keep hitstop <= 45ms), particles x0.4, squash x0.5, no background parallax"
  },
  "physics": {
    "fixedDt": 0.008333,
    "gravityU": 2400,
    "launchSpeedU": 1650,
    "maxSpeedU": 2600,
    "airDragPerS": 0.04,
    "pipRadiusU": 30,
    "bonbonRadiusU": {
      "s1": 48,
      "s2": 64,
      "s3": 78
    },
    "restitution": {
      "wall": 0.88,
      "plush": 0.8,
      "jelly": 1.18,
      "marshmallow": 0.42,
      "chonk": 0.72,
      "bubble": 1,
      "cup": 0
    },
    "marshmallowHoldMs": 110,
    "tangentialFriction": 0.08,
    "spinFromTangent": 0.35,
    "softRing": {
      "nodes": 16,
      "iterations": 6,
      "edgeStiffness": 0.9,
      "pressureK": 1,
      "shapeMatch": 0.12,
      "anchorOmega": 9,
      "anchorZeta": 0.55,
      "dentFromPip": "push ring nodes inside Pip radius out along Pip normal, then let pressure restore"
    },
    "stuckRescue": {
      "speedBelowU": 70,
      "forMs": 1200,
      "action": "Pip sighs, turns into a soap bubble and floats down at 300u/s ignoring bonbons"
    },
    "maxShotMs": 14000,
    "$comment": "Collision radii. Bonbons are DRAWN at width = 2.05 x radius (BB.bonbon w), Pip at 2.3 x radius incl. cap/sprout. Matches mockups."
  },
  "particles": {
    "sugarSparkle": {
      "shape": "4-point star",
      "count": [
        6,
        10
      ],
      "sizePx": [
        5,
        11
      ],
      "speedU": [
        250,
        700
      ],
      "lifeMs": [
        380,
        620
      ],
      "gravityU": 600,
      "spinDegS": [
        -360,
        360
      ],
      "color": "flavour.light + white 30%",
      "fade": "last 40%"
    },
    "juiceDrop": {
      "shape": "circle",
      "count": [
        5,
        8
      ],
      "sizePx": [
        4,
        9
      ],
      "speedU": [
        300,
        900
      ],
      "lifeMs": [
        500,
        800
      ],
      "gravityU": 2400,
      "color": "flavour.base",
      "squashOnFloor": true,
      "stretchAlongVelocity": 1.6
    },
    "confetti": {
      "shape": "rounded rect 8x5 r2",
      "count": [
        24,
        60
      ],
      "speedU": [
        600,
        1400
      ],
      "lifeMs": [
        1400,
        2200
      ],
      "gravityU": 900,
      "flutter": "sin(t*9)*35deg",
      "color": "fx.rainbow"
    },
    "heartSpark": {
      "shape": "heart",
      "sizePx": 14,
      "path": "quadratic arc from popped bonbon to chained neighbour, 140ms, outBack",
      "color": "fx.heartSpark"
    },
    "puffRing": {
      "shape": "ring",
      "fromScale": 0.6,
      "toScale": 1.7,
      "lineW": [
        8,
        1
      ],
      "lifeMs": 280,
      "color": "fx.puffRing",
      "alpha": [
        0.9,
        0
      ]
    },
    "cloudPoof": {
      "shape": "5 overlapping circles",
      "lifeMs": 420,
      "scale": [
        0.5,
        1.4
      ],
      "color": "world.cloud",
      "alpha": [
        1,
        0
      ]
    },
    "coatSplat": {
      "shape": "6 droplets + 1 blob on Pip",
      "lifeMs": 300,
      "color": "new coat flavour.base"
    },
    "budget": {
      "maxLive": 260,
      "lowPowerMaxLive": 120
    }
  },
  "sound": {
    "busDb": {
      "master": 0,
      "music": -14,
      "sfx": -4,
      "ui": -12
    },
    "ladder": {
      "key": "G major pentatonic",
      "rungs": [
        "G4",
        "A4",
        "B4",
        "D5",
        "E5",
        "G5",
        "A5",
        "B5",
        "D6",
        "E6",
        "G6",
        "A6"
      ],
      "rungHz": [
        392,
        440,
        493.9,
        587.3,
        659.3,
        784,
        880,
        987.8,
        1174.7,
        1318.5,
        1568,
        1760
      ]
    },
    "events": {
      "aimTick": {
        "src": "kenney interface tick_002",
        "db": -26,
        "rule": "every 6 deg of aim change, pitch rung by angle (marimba-menu feel)"
      },
      "launch": {
        "src": "fs542195 wobble (0-260ms) + kenney pluck_001",
        "db": -12,
        "pitchVar": 0.04
      },
      "wall": {
        "src": "kenney impactSoft_medium_00[0-4]",
        "db": -16,
        "pitchVar": 0.06
      },
      "tickle": {
        "src": "fs161122 boing (trim 0-420ms) + fs444494 squeak",
        "db": -12,
        "pitch": "size s1 +4st, s2 0, s3 -4st",
        "pitchVar": 0.03
      },
      "coat": {
        "src": "fs442772 slime squish (short)",
        "db": -18
      },
      "sweetPop": {
        "src": "fs802606 pop variant (6) + synth marimba at ladder rung k",
        "db": -8,
        "rule": "k = consecutive pops this shot, capped 11"
      },
      "hugChain": {
        "src": "same as sweetPop, 60ms apart, rungs continue",
        "db": -10
      },
      "chonkPop": {
        "src": "fs500912 squish impact + pop",
        "db": -8
      },
      "jellyLaunch": {
        "src": "fs463589 jellybounce",
        "db": -10,
        "pitch": "+2st"
      },
      "marshSink": {
        "src": "fs442772 slime squish",
        "db": -12,
        "pitch": "-3st"
      },
      "catch": {
        "src": "kenney confirmation_002 + synth G5-B5-D6 arpeggio 60ms",
        "db": -8
      },
      "rowRise": {
        "src": "synth soft sine glide D4->G4 180ms + bubble blips",
        "db": -22
      },
      "warn": {
        "src": "synth triangle G4,E4 180ms each",
        "db": -16
      },
      "lastHeartFever": {
        "src": "kenney jingles_PIZZI10 (or STEEL) + music duck -9dB 1.6s",
        "db": -4
      },
      "newBest": {
        "src": "kenney jingles_STEEL10",
        "db": -6
      },
      "gameOver": {
        "src": "Cozy Puzzle Failure (Jingle)",
        "db": -6
      },
      "levelClear": {
        "src": "Cozy Puzzle Clear (Jingle)",
        "db": -6
      },
      "uiTap": {
        "src": "kenney click_003",
        "db": -16
      },
      "uiToggle": {
        "src": "kenney toggle_001 / toggle_002",
        "db": -16
      },
      "uiOpen": {
        "src": "kenney maximize_003",
        "db": -18
      },
      "uiClose": {
        "src": "kenney minimize_003",
        "db": -18
      }
    },
    "music": {
      "title": {
        "src": "Happy Vibes (Ruskerdax, CC0)",
        "db": -14,
        "loop": true
      },
      "play": {
        "src": "Cozy Puzzle In-Game 1 (mintodog, CC0) G major 118bpm",
        "db": -15,
        "loop": true
      },
      "zen": {
        "src": "Cozy Puzzle In-Game 2 (mintodog, CC0) 90bpm",
        "db": -15,
        "loop": true
      },
      "duckDb": -9,
      "duckAttackMs": 40,
      "duckReleaseMs": 600
    },
    "haptics": {
      "sweetPop": 8,
      "chonkPop": 18,
      "lastHeart": [
        20,
        40,
        30
      ],
      "catch": 12,
      "warn": [
        10,
        60,
        10
      ]
    }
  },
  "layout": {
    "$comment": "World units (u). World is 1000 x 1600u, fixed aspect; see BUILD-BRIEF Layout.",
    "worldW": 1000,
    "worldH": 1600,
    "lattice": {
      "evenRowSlots": 6,
      "oddRowSlots": 5,
      "x0": 114,
      "colPitch": 154,
      "oddRowOffset": 77,
      "rowPitch": 122,
      "jitterX": 8,
      "jitterY": 6,
      "neighbours": "6 hex-lattice neighbours (same row +/-1 slot, rows above/below the two diagonal slots)"
    },
    "puffCloud": {
      "x": 500,
      "y": 220,
      "w": 290
    },
    "pipSpawn": {
      "x": 500,
      "y": 278
    },
    "nextBubblePortrait": {
      "x": 778,
      "y": 235,
      "r": 40
    },
    "frostingY": 330,
    "seaSurfaceY": 1480,
    "cup": {
      "y": 1470,
      "halfW": 120,
      "driftMinX": 180,
      "driftMaxX": 820,
      "periodS": 7
    },
    "walls": {
      "leftX": 30,
      "rightX": 970
    },
    "startRowsY": "lowest row at ~1340u; new rows emerge from y = 1340 + rowPitch",
    "hud": {
      "portraitHeight": "clamp(VH*0.08, 60px, 76px)",
      "uiScalePortrait": "clamp(VW/430, 1, 1.2)",
      "uiScaleLandscape": "clamp(VH/430, 1, 1.6)"
    }
  }
} as const;
export type Tokens = typeof tokens;
