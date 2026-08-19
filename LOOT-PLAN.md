# New loot — phased implementation plan

Status: not started.

One phase = one commit, one loot type per phase. After every phase:
`npm test` + `npm run smoke` green, and the snapshot md5 unchanged — unless
the phase lists a snapshot scenario it intentionally adds (P1, P4, P7, P9).

House rules for this plan (decided defaults — flag objections before P1):
- **Timed powers** (boots, magnet, lantern): a seconds counter on the player,
  decayed in `updatePlayer`; gone when it hits 0.
- **Consumables** (hops, star arrows, shield): counters consumed on use;
  dropped items add to the counter.
- **Nothing carries across levels** except P4's heart cap (the one
  permanent-for-the-run reward, via the existing `createPlayer` carry).
- New player fields are flat and explicit (`boots`, `hops`, ...) — no shared
  power-slot abstraction; matches the existing `big`/`hasBow` style.
- Each drop type gets: a `kind` in the loot drop table, a sprite, one sfx in
  `audio.js`, unit tests, and 1–2 designated boxes (`box.drop`) in level data.

Random drop table (rolls after the one-time bow drop). Starts:
`20% heart / 80% gem`. Gains per phase; gem absorbs the remainder:

| phase | adds                        | table after phase                          |
|-------|-----------------------------|--------------------------------------------|
| P1    | boots 5%                    | heart 20, boots 5, gem 75                  |
| P2    | magnet 5%                   | heart 20, boots 5, magnet 5, gem 70        |
| P3    | sunbeam 3%                  | + sunbeam 3, gem 67                        |
| P5    | stararrow 4%                | + stararrow 4, gem 63                      |
| P6    | hops 4%                     | + hops 4, gem 59                           |
| P4/P7/P8/P9 | designated boxes only, no table weight | table unchanged     |

Implementation order is chosen so each phase stands alone: P1 establishes the
timed-power pattern; P2 extends loot physics; P3 extends the enemy side; P4
extends the carry; P5 the arrows; P6 the jump code; P7 the fireballs; P8 the
ghost AI; P9 reuses `spawnLoot`'s seeded `rng`.

## P1 — Bounce boots (timed super-jump)
- `kind: 'boots'`: pickup sets `player.boots = 10` (s), sfx `boots`, FX burst.
  Decay in `updatePlayer`.
- Jump: while `boots > 0`, jump uses `BOOT_JUMP_V = P_JUMP_V * 1.6`
  (both small and big use the same multiplier of their own base).
- Sprite: golden shoes + a faint sparkle trail while active (render/player).
- Drops: 5% table weight; designated box level 1 (mid-meadow), level 2
  (interior, before the chasm).
- Snapshot: one level-1 scenario, boots active (intentional addition).
- Tests: pickup sets timer; jump velocity differs while active; decays to 0;
  fresh start / advance does not carry it; sfx name.

## P2 — Magnet (timed gem attraction)
- `kind: 'magnet'`: `player.magnet = 8` (s), decay in `updatePlayer`,
  sfx `magnet`.
- `updateLoot`: while active, untaken **gems only** (hearts/boots etc. keep
  normal physics) steer toward the player: accelerate toward player center,
  speed cap ~320 px/s. No gravity while steering.
- Sprite: small pink horseshoe magnet; no player-side aura (keep the frame
  clean — the gems' flight is the effect).
- Drops: 5% table; designated box level 1 (after the first box cluster),
  level 2 (interior).
- Tests: a gem 200 px away flies in and is collected; heart item unaffected;
  steering stops after expiry; sfx name.

## P3 — Sunbeam (instant screen clear)
- `kind: 'sunbeam'`: on pickup, `updateLoot` invokes a new optional
  `onSunbeam` hook (game.js wires it to the enemy list — keeps loot.js
  decoupled). The hook: every non-boss enemy (slime, zombie, ghost) takes
  99 damage through the existing `damageEnemy` path (consistent score/FX/
  sfx); all live fireballs are cleared; 0.4 s golden beam + flash + shake
  (a `lvl.sunbeamT` timer rendered over the screen).
- **The mage is exempt** (boss — he has his own hp and P5/P7 cover him).
- Sprite: a radiant coin/sun disc.
- Drops: 3% table; designated box level 1 and level 2 (interior, before the
  chasm).
- Tests: slime/zombie/ghost on screen die with correct score; mage hp
  unchanged; fireballs cleared; hook absent (unit test) is safe; sfx `sunbeam`.

## P4 — Heart cap +1 (permanent for the run)
- `kind: 'heartcap'`: `player.maxHp = 4` (idempotent — a second pickup is a
  gem's worth of score instead). HUD draws `maxHp` pips (4th pip dim until
  owned); hearts heal to `maxHp` (loot.js currently caps at 3).
- **The one carry**: `maxHp` joins `createPlayer`'s carry and `startGame`'s
  `prev` pass, so it persists level 1 → 2 and survives death-restarts
  (you keep the cap, hp resets to 3).
- Sprite: a golden heart in a crown.
- Drops: no table weight; designated box in the level-2 boss hall (a reward
  for the fight).
- Snapshot: one scenario with `maxHp` 4 (intentional addition).
- Tests: pickup → maxHp 4 + heart heals to 4; idempotent second pickup;
  carried into the next level; hp still resets to 3; sfx `heartcap`.

## P5 — Star arrows (limited piercing ammo)
- `kind: 'stararrow'`: `player.starArrows += 5` (cap 10).
- Firing: if `starArrows > 0` the arrow fired is a star (decrement on fire);
  otherwise the normal arrow. Star arrows fly the same, **pierce** (keep
  flying after a hit, remembering which enemies they've hit), 1 damage each,
  and can hit the mage (normal 1-damage rules).
- Sprite: golden four-point star vs the white arrowhead.
- Drops: 4% table; designated boxes level 1 ×1, level 2 interior ×2.
- Tests: star fires before regular; pierces two zombies in a line; no
  double-hit on one enemy; mage takes 1; counter decrements and falls back
  to regular at 0; sfx on fire.

## P6 — Levitation hops (3 air-jumps)
- `kind: 'hops'`: `player.hops += 3` (cap 3).
- Jump code: a jump press that can't start a ground/coyote jump consumes a
  hop instead — `vy = HOP_V = P_JUMP_V * 0.85`, small cloud puff, sfx `hop`.
  Jump-cut and the existing `jbuf`/`jumpHeld` edge logic apply unchanged.
- Sprite: no standing visual; the cloud puff + a brief wing shimmer is the
  effect (keeps the player sprite stable).
- Drops: 4% table; designated box level 1 (near the goal), level 2 (before
  the interior chasm — its intended use).
- Tests: air hop works 3×, not a 4th; on the ground it's a normal jump;
  reset on fresh start / advance; sfx `hop`.

## P7 — Mirror shield (3 fireball reflects)
- `kind: 'shield'`: `player.shield = 3` (cap 3).
- While `shield > 0`, a fireball overlapping the player is **reflected**
  instead of dealing damage: `vx` flips, `reflected = true`, `shield--`,
  sfx `reflect`, ring FX. Reflected fireballs damage the mage (1, existing
  `damageEnemy` path) and despawn off-screen. Shield does **not** block
  zombie/ghost contact (scope stays tight). Check the existing invuln
  interaction first: reflect wins over hurt whenever `shield > 0`.
- Sprite: a small moon-disc held on the facing side + 3 pips over the head
  (the mage's hp pips are the precedent).
- Drops: no table weight; one designated box in the boss hall, placed so it's
  visible on the approach (a boss tool, kept special).
- Snapshot: one boss-hall scenario with the shield active (intentional).
- Tests: fireball reflected (vx, flag, count); reflected shot damages the
  mage; at 0 shield it's a normal hit; zombie contact unaffected; sfx.

## P8 — Lantern (timed ghost repel)
- `kind: 'lantern'`: `player.lantern = 8` (s), decay in `updatePlayer`,
  sfx `lantern`.
- Ghost AI: while active, a ghost within R = 160 px of the player abandons
  patrol/drift and moves directly away (≤ its drift speed) with a flicker;
  outside R it resumes normally. Ghosts still damage on touch. Zombies and
  slimes are unaffected.
- Sprite: a warm radial glow around the player while active (render/player,
  radial gradient) — this is the visual.
- Drops: no table weight (castle-specific); designated boxes level 2
  interior ×2, among the ghosts.
- Tests: ghost in radius moves away; out of radius patrols; expiry resumes
  patrol; zombie unaffected; sfx.

## P9 — Mystery drop (wildcard)
- Boxes get a `mystery: true` flag (distinct shimmering sprite). In
  `spawnLoot`, a mystery box rolls its payload with the injected seeded
  `rng` — hidden until broken: 40% heart, 25% three gems (fountain: three
  gem items with spread velocities), 25% boots (short, 5 s), 10% dud
  (no item, sfx `fizzle`).
- Sprite: purple box with a slow swirl (gameTime-driven).
- Drops: not in the random table; one mystery box each in level 1 and 2.
- Snapshot: level 1 scenario showing the mystery box (intentional).
- Tests (seeded rng): each branch resolves correctly, including the 3-gem
  fountain and the dud; regular boxes' table untouched.

## P10 — Wrap-up
- README: a full loot table (effect, duration/uses, where it drops) + the
  random drop weights.
- Balance pass: walk the designated boxes on both levels, check pacing
  (nothing critical-path, boss-hall tools reachable before the mage).
- Final verification: `npm test`, `npm run smoke`, snapshot md5 stable
  across two runs; mark this plan complete.
