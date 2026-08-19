# Level 2 — phased implementation plan

One phase = one commit. After every phase: `npm test` + `npm run smoke` green,
and the level-1 snapshot md5 unchanged — until P9 intentionally adds level-2
snapshots.

Dependency order: P2 needs P1's level data shape; P6 needs P5; P7 needs P6's
death event; P8 needs all mechanics; P9 last.

## P1 — Level framework & progression
- `src/levels.js`: registry of level factories. Level 1 moves in unchanged
  (same numbers); level 2 lands in P8.
- `game.js`: `startGame(viewH, levelIndex)`; `state.levelIndex`; win →
  complete screen; on the complete screen R advances to the next level
  (restarts on the last one).
- HUD: `LEVEL n` readout.
- Tests: advance/restart flow with a throwaway second level (registry still
  has one entry — no behaviour change for level 1).

## P2 — Terrain: ground segments, pits, respawn
- `level.ground = [{x0, x1, y}, ...]` (thick platforms → existing
  `resolveGroundCollision` unchanged in spirit); level 1 = one segment;
  `level.groundY` kept as the main-floor height (spawn/enemy baseline).
- Player falls below the view → 1 damage + respawn at last safe ground spot
  (tracked while `onGround` above solid ground), brief invulnerability.
- Tests: falling in a gap, respawn position, invuln, no change to level-1
  single-segment behaviour.

## P3 — Zombie
- KINDS entry: 34×40, shamble 40 px/s patrol; aggro within 220 px &
  |dy| < 60 → walk toward player at 70 px/s, de-aggro when out of range.
  `stompable: true`.
- Sprite (green, outstretched arms, red eyes, leg shuffle).
- Tests: patrol bounds, aggro engage/release, stomp kill, arrow kill.

## P4 — Ghost
- KINDS entry: 28×26, `grounded: false`, `stompable: false`; sine bob (±14,
  ~2 s) at home; player within 260 px → drift toward at ≤60 px/s, else ease
  home.
- Sprite (pale, ~75% alpha, wavy skirt).
- Tests: bob, drift/return, side-hit damage, stomp bounces without kill.

## P5 — Enemy projectiles (fireballs)
- `src/projectiles.js` + `src/render/projectiles.js`: list updated/drawn in
  the world pass; fireball spec: 14×14, straight, 240 px/s, 3 s TTL,
  fizzle burst on ground/wall/TTL, hit player → shared hurt path.
  Arrows pass through (no interaction).
- FX presets (`fireball`, `fizzle`) + audio blips.
- Tests: travel, TTL, ground fizzle, player hit, no arrow interaction.

## P6 — Mage boss
- KINDS entry: 42×54, hp 5; per hit: white flash 0.15 s + stagger 0.25 s
  (state machine: idle 1.6–2.4 s → windup 0.7 s → fire, one fireball at a
  time, seeded timing); death → big burst + shake + `onDeath` event.
- World-space hp pip bar; sprite (robe, hat, staff; windup glow).
- Tests: hp down to 0, stagger blocks firing, cycle fires (deterministic
  under seeded RNG), death event, arrows pass through fireballs still hold.

## P7 — Pearl, seal, stairs exit
- Pearl: world item on a pedestal (bob + glow), spawn trigger = mage
  `onDeath`; pickup → burst + chime.
- Seal: solid rect over the first stair step (new: player side-collision
  with a solid rect); fades out when the pearl is taken.
- Exit zone: generalize the win trigger to `level.exit` rect (level 1 keeps
  its flag visual); level 2 exit = bottom stair step.
- Tests: pearl spawn on death, pickup, seal blocks then opens, exit triggers
  win, level-1 flag still wins.

## P8 — Level 2 data + zone backgrounds
- Level 2 factory per the design: bridge planks + 2 moat gaps, gate arch,
  interior rooms + platforms + chasm, boss hall, 4 steps down, exit,
  **lots of loot boxes** (gems/hearts/grow, bow start item), roster
  (zombies, ghosts, mage).
- Background: zone renderer keyed on camera x (outdoor / castle interior /
  boss hall); moat water; gate; torches (flicker).
- Level 2 joins the `levels.js` registry.
- Verification: smoke extended to run level 2 for 300 frames; level-1
  snapshots untouched.

## P9 — Level 2 render snapshots
New scenarios in `test/render.test.js` (level-2 harness entry):
- bridge start (planks + moat + gate ahead)
- interior with zombie + ghost on screen
- boss hall: mage mid-windup + fireball in flight + hp bar
- pearl on pedestal + unsealed stairs
Verify visual markers by hand, then commit the new snapshot sections.

## P10 — Polish
Audio pass (boss hit, pearl, seal break, gate chime), FX tuning, README
update (levels), final full verification (tests, both smoke runs, snapshot
md5).
