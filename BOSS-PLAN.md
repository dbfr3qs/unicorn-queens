# Boss ladder — Phased Build Plan

**Status: IN PROGRESS (B1–B8).** One phase = one commit.

House gate after every phase: `npm test` green, `npm run smoke` green, and
`npm run bosslab fight` re-run with the table pasted into the commit message.

## Goal

The bosses get harder in level order, and each one teaches one thing and
then tests it with what came before:

| # | Boss | Level | Teaches |
|---|---|---|---|
| 1 | Mage | 2 | dodge shots while shooting a moving target |
| 2 | Troll | 3 | read a shield, jump shockwaves |
| 3 | Dragon | 4 | wait for the opening (perch, dive) |
| 4 | Weaver Queen | 6 | floor telegraphs, a slow |
| 5 | Wizard | 7 | a weak point, phases |
| 6 | Warden | 8 | rhythm |
| 7 | Frost Queen | 9 | everything |

Playtest feedback (2026-09-24): levels 3, 6 and 8 are "really dumb"; the
wizard (7) is the hardest, harder than the final boss; he should keep his
flight, attacks and teleport but take far less to kill.

## The lab (tools/bosslab.mjs, tools/bot.mjs)

`npm run bosslab` — reach map: hits/min at each spot for a player who
stands still. `npm run bosslab fight` — 30 bot fights per boss (¼ s
reaction, 0.8 s lookahead, no flight): kills, median kill, hits taken,
3-heart wins, time staggered. The bot is a ruler, not a player: it ranks
the bosses; playtests set the feel.

Baseline (hard, before B1):

```
boss          kills  median kill  hits taken  3-heart wins  staggered
Mage   (L2)   30/30      7 s          2.2          70%           8%
Troll  (L3)   30/30      4 s          0.0         100%          48%
Dragon (L4)   30/30      9 s          0.5         100%          32%
Weaver (L6)   30/30      4 s          0.0         100%          78%
Wizard (L7)   14/30    131 s        114.9           0%           1%
Warden (L8)   30/30      5 s          0.0         100%          75%
Queen  (L9)   30/30     15 s          5.0           0%           0%
```

**Why 3, 6 and 8 are dumb:** each arrow staggers them 0.3 s and the bow
fires every 0.22 s, so held fire stun-locks them from the first hit to the
last. **Why 7 is hard:** only a 24 px rune in short windows, 16 hp.

**Target ladder** (bot, hard): hits taken rising ~1 → ~7, median kill
~10 s → ~60 s, the wizard below the warden and the queen, no boss
staggered more than ~20% of its fight, every boss killed 30/30.

## Build ledger

- [x] **B1** — poise: after a stagger a boss can't be staggered again for
  2 s (hits still land and flash). The Frost Queen keeps her own; the mage
  has `poise: 0` (with it he went 7 s → 34 s and 70% → 3% 3-heart wins —
  his stagger was never a lock, 8%, and he is boss #1). After:

  ```
  boss          kills  median kill  hits taken  3-heart wins  staggered
  Mage   (L2)   30/30      7 s          2.2          70%           8%
  Troll  (L3)   30/30      8 s          0.0         100%           9%
  Dragon (L4)   30/30     28 s          0.9          93%           8%
  Weaver (L6)   30/30      4 s          0.3         100%          14%
  Wizard (L7)    7/30    114 s        119.8           0%           1%
  Warden (L8)   30/30      5 s          0.0         100%          13%
  Queen  (L9)   30/30     15 s          5.0           0%           0%
  ```

  **What B1 taught:** the lock is gone, but the Weaver Queen and the Warden
  still die in ~4 s. Held fire is ~4.5 hp/s, and both can be hit at any
  time from anywhere — the Warden's triple window takes 9 hp a chime. They
  need a defence (openings), not just pressure. The troll's shield is the
  only thing that slows his kill.
- [ ] **B2** — wizard: 16 → 10 hp (two stages of 5), a longer swoop window.
- [ ] **B3** — troll: walks the player down; more slams between shields;
  a kill that takes long enough for him to attack.
- [ ] **B4** — Weaver Queen: a defence — openings (e.g. her armoured front,
  soft after a lunge or a spit) — then presses into the middle in phase 2.
- [ ] **B5** — Warden: brass that deflects outside the reset window (the
  window is the only opening), the window worth less; more pressure.
- [ ] **B6** — Frost Queen: the last phase escalates; fewer heart boxes.
- [ ] **B7** — mage's west-end safe zone; mage and dragon touch-ups.
- [ ] **B8** — a ladder test: a short bot run in `npm test` that pins the order.
