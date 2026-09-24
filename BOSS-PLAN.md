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
- [x] **B2** — wizard: 16 → 10 hp (two stages of 5; the fan and quick
  tempo at 3), swoop recovery 0.5 → 0.8 s, stage-1 pick bolt 35 / swoop 45 /
  cone 20 (was 50 / 30 / 20). **And a bug:** the rune's hit rect sat 8 px in
  from the flank, and an arrow (8.7 px a frame) meets the body inside those
  8 px on its first frame of contact — ~11 of 12 true shots sparked off. The
  hit rect now runs to the flank's edge. (Also a lab bug: a heart box
  clamped the bot's 99 hp to maxHp 3 and read as ~94 hits; the baseline's
  wizard 114.9 was mostly that.) Measured in B3 once the lab read each
  boss's real spawn hp (see B3): **wizard 21 s, 2.7 hits taken, 47%
  3-heart wins.** (The B2 commit's table — 42 s, 4.9 — was taken at his
  old 16 hp: the lab started every fight from its own hp table.)

  Still open for the wizard: his stage 2 (the sorcerer) is always hittable
  and melts in ~1 s of held fire — the same fault as the Weaver Queen and
  the Warden (B4, B5); it gets its answer with theirs.
- [x] **B3** — troll. He was a turtle: every arrow raised the reactive
  shield, a shield ended in idle, and the next arrow raised it again — 75%
  of the fight behind the slab and not one attack. Now: **block, then
  punish** (a shield drops straight into an attack, and he can't shield
  again until he has swung); he **walks you down** in idle (60 px/s, stops
  110 px short); picks the slam close (70%) and boulders at range (60%);
  **doesn't flinch mid-swing** (windups and the hop); the hop reaches 300 px,
  his waves run 240 px/s, phase 2 chains half its slams; the reactive shield
  is his lesson (75% / 90%, 0.6 s cooldown); 8 → 16 hp, phase 2 at 8; pips
  in two rows. **Lab fix:** fights and the reach map start from the boss's
  own spawn hp (phases are shares of it), not a table in the lab. After:

  ```
  boss          kills  median kill  hits taken  3-heart wins  staggered
  Mage   (L2)   30/30      7 s          2.2          70%           8%
  Troll  (L3)   30/30      9 s          1.8         100%           6%
  Dragon (L4)   30/30     28 s          0.9          93%           8%
  Weaver (L6)   30/30      4 s          0.3         100%          14%
  Wizard (L7)   30/30     21 s          2.7          47%           3%
  Warden (L8)   30/30      5 s          0.0         100%          13%
  Queen  (L9)   30/30     15 s          5.0           0%           0%
  ```
- [x] **B4** — Weaver Queen. **The carapace:** arrows glance off (the
  `arrowBlocked` hook) except when she is open — the lunge's recovery (0.6 →
  1.0 s) and a new 0.9 s `recover` after a spit, a pillar or the volley, or
  a stagger; the web on her abdomen glows gold while open. Her band starts
  at the web wall (5840; the 5840–5900 doorway strip was out of her lunge
  and pillars' reach). Phase 1's globs fly at 190 px/s at where you stand;
  phase 2's at 240 with the lead, and she crawls at 100 px/s (60). The web
  glob was her main damage (2.2 of 3.9 hits before the slower phase 1).
  The level 6 playthrough's script now shoots her openings and gets six
  hearts for the duel (it tests wiring; the lab measures the fight).
  After: **19 s, 3.3 hits taken, 37% 3-heart wins** (was 4 s, 0.3). A shade
  above the wizard (21 s, 2.7) — his stage 2 is still free; its defence
  (with B5) should lift him past her.
- [x] **B5** — Warden and the wizard's stage 2.
  **Warden:** his brass turns arrows (and stars) outside the 0.6 s reset
  window, which is worth ×2 (was ×3 on an always-open target). P1 attacked
  only on the chime — one attack per 8.4 s at three cuts; now also on the
  half-beat, and P2 on every quarter. After: **25 s, 4.0 hits, 0% 3-heart
  wins** (was 5 s, 0.0).
  **Wizard, stage 2:** the fall (shatter, crash) turns arrows and a hit no
  longer staggers him out of it (that dropped him back into stage-1 logic);
  one hit on the floor wakes him (the stun used to take all of stage 2);
  the sorcerer has a violet ward that drops only while he casts or reels;
  two hits in one opening and he **blinks** to the far end and throws a fan
  (both counts read hp: a poised boss's hits skip onHit). His bolt is the
  fan all stage (280 px/s), his waves 260 px/s; CRASH_AT 5 → 6 (four rune
  hits, six on foot); stage-1 pick bolt 40 / swoop 40 / cone 20.
  **Weaver:** globs 170 / 210 px/s, one glob per spit in phase 2.
  After:

  ```
  boss          kills  median kill  hits taken  3-heart wins  staggered
  Mage   (L2)   30/30      7 s          2.2          70%           8%
  Troll  (L3)   30/30      9 s          1.8         100%           6%
  Dragon (L4)   30/30     28 s          0.9          93%           8%
  Weaver (L6)   30/30     19 s          2.8          37%          10%
  Wizard (L7)   30/30     20 s          2.5          57%           4%
  Warden (L8)   30/30     25 s          4.0           0%           3%
  Queen  (L9)   30/30     15 s          5.0           0%           0%
  ```

  The Weaver and the wizard read as a tie to the bot (2.8 vs 2.5 at 30
  fights); the bot is strong against the sorcerer (it lands ~0.15 hits in
  stage 2). A playtest call between those two.
- [ ] **B6** — Frost Queen: the last phase escalates; fewer heart boxes.
- [ ] **B7** — mage's west-end safe zone; mage and dragon touch-ups.
- [ ] **B8** — a ladder test: a short bot run in `npm test` that pins the order.
