# Results stars (timed / daily)

Scoring uses combo chains, bombs, and rainbows (see `release()` in `src/sim.ts`).

| Stars | Score (approx.) | Notes |
|------:|----------------:|-------|
| 1 | any finish | Completed the round |
| 2 | 15,000+ | Solid round |
| 3 | 30,000+ | Combos, long chains, specials |

Greedy longest-chain bot averages **~16–22k**; combo/special-priority bot **~30k+**.

Scoring per clear: `7×(i+1)` per piece, **×2.45** chain length at 6, **×3.2** at 7+, length bonus `+42×len` at 5+, bomb +58 and rainbow +150 (×1.5 each when extending a combo at 5+ links), combo up to ×5.
