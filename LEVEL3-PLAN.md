# Level 3 — "The Undercroft" — phased implementation plan

Status: not started. Design: `LEVEL3-DESIGN.md` (confirmed).

One phase = one commit. After every phase: `npm test` + `npm run smoke` green,
and the level-1/level-2 snapshot md5s unchanged — until P9 intentionally adds
level-3 snapshots.

Existing systems reused unchanged: ground segments + fall respawn (lava
fissures are just gaps with lava drawn in them), zones, zombies, ghosts,
boxes/loot, pearl + seal + `level.exit` stairs, cross-level carry object.

Dependency order: P4 needs P1 (spell grant), P2 (dialogue) and P3 (key);
P5 needs P3; P7 needs P6 (its projectiles); P8 needs everything; P9 last.

## P1 — Flight spell (witch's gift)
- Input: `input.up` (ArrowUp) and `input.down` (ArrowDown) added alongside
  existing keys — ArrowUp still counts as jump when not flying; S is
  edge-triggered (keydown sets a one-frame `cast` flag consumed by
  `player.update`).
- Carry: `hasFlight: !!prev?.hasFlight` in `startGame` (the heart-cap
  pattern, NOT the bow's advance-only pattern — the gift is permanent for
  the run and must survive a death-restart inside level 3).
- Flight: while active, gravity off; Up = rise 220 px/s, Down = descend
  200 px/s, neutral = sink 50 px/s, Left/Right = 260 px/s (A/D + arrows).
  Jump suspended. X still fires. Clamped below dungeon ceiling (y ≥ 60).
  One-way platforms passed freely; touching any solid surface ends flight
  (landing-cancels) and starts the cooldown.
- Timer: 10 s flight → 15 s cooldown, rechargeable. HUD wing icon + meter
  (drains in flight, refills on cooldown); hidden until `hasFlight`.
- Audio: cast chime, loop-free whoosh blips, end-of-flight soft thud.
- Tests: cast requires hasFlight + cooldown done; 4-way physics vectors;
  sink; landing cancels + starts cooldown; 10 s expiry → 15 s → recast;
  jump suspended while flying; arrows fire while flying; carry persists
  into the next level; level 1/2 player physics unchanged.

## P2 — Dialogue system
- `level.dialogs = [{ id, x, y, w, h, beats: [...] }]` — proximity trigger
  rect; first beat auto-shows on enter (once, per `id` — state in game),
  subsequent beats only re-fire if the level data says so (cell uses two
  distinct beats keyed on key possession, see P4).
- Text box: bottom-center panel, speaker line + text, world paused (player,
  enemies, projectiles, particles, camera) while open; Space/Enter/any
  arrow advances; last line closes.
- Tests: trigger fires once, world frozen while open, advance + close,
  beat selection callback, re-approach does not re-trigger finished dialog.

## P3 — The key
- Key as a world pickup (16×16, golden, glint animation): `game.key` boolean,
  HUD key icon while carried. Pickup = burst + chime.
- Marker brick: one out-of-pattern brick on the corridor wall (~1480) with a
  faint glint; glint brightens briefly if an arrow hits it (purely visual).
- Tests: pickup sets state + HUD, one-time pickup, marker glint on hit.

## P4 — Jail cell & the witch
- Cell: brick alcove with iron bars (70×100) at ~2100; witch sprite inside
  (cowl, staff, hopeful eyes).
- Two beats via the dialogue system, selected by `game.key`:
  - No key: hint line ("…a secret key hides to the west — above the fire.").
    Non-blocking: re-triggers each approach until unlocked (the one
    exception to P2's fire-once rule).
  - With key: auto-unlock — clank, bars swing open animation (~0.8 s),
    thank-you + spell lines, then **`hasFlight = true`**, witch hops out,
    wanders a step or two, fades in a sparkle puff. One-time; the cell
    stays open afterwards.
- Tests: beat 1 hint keyless; with key → unlock, spell granted, witch gone
  after fade; unlock persists; dialogue state does not leak across levels.

## P5 — The door (troll-hall gate)
- Portcullis at 3550–3590 (floor to y≈200): solid side-collision rect for
  the player (seal-style), iron-banded stone, glowing lock.
- No key: impassable. With key: auto-opens on approach — rumble, slides up
  over ~1 s, **key consumed** (icon disappears).
- Once the player passes x > 3600 the portcullis drops shut behind them
  (1 s), re-locking the hall.
- Tests: blocks keyless; opens + consumes key; drop-shut triggers after
  crossing; hall exit impossible once shut.

## P6 — Troll projectiles: boulders & shockwaves
- Extend `src/projectiles.js` with two kinds (fireball untouched):
  - **Boulder**: 18×18, gravity arc (lob velocity aimed at the player),
    dust puff on landing, ~4 s TTL, hits player → shared hurt. Not
    shootable (arrows pass through, fireball rule).
  - **Shockwave**: ground-bound, spawned by the slam; two wave fronts roll
    opposite ways at 180 px/s for ~1.2 s, 12×18 dust/rock shards, hit
    player → shared hurt (one hit per wave), fizzle at range.
- FX presets (`boulder-fizzle`, `shockwave`) + audio (thud, rumble, clatter).
- Tests: boulder arc + landing fizzle + player hit + arrows pass through;
  shockwave both directions, range, one-hit, player hit.

## P7 — Troll boss
- KINDS entry in `src/enemies/troll.js`: 52×64, **grounded**, `stompable:
  false`, **hp 8**; per hit: white flash 0.15 s + stagger 0.3 s (crouch-
  frozen). 8-pip HP bar in world space (mage pattern).
- State machine (idle 1.0–1.6 s → pick → execute), seeded timing:
  - **Shield** (chance 0.45, cd 1.2–2.0 s): raise stone shield 1.6–2.2 s;
    front arrows bounce (spark + deflection sound); overhead open.
    **Reactive**: arrow fired within 300 px → shield up after 150 ms,
    45 % (65 % phase 2).
  - **Slam**: windup 0.8 s, hop ≤220 px toward player, floor pound →
    camera shake + P6 shockwave.
  - **Lob**: windup 0.6 s → 2 boulders (P6).
- **Phase 2** (hp ≤ 4): windups −30 %, 3 boulders, shield more often.
- Death: big burst + shake + `onDeath` (pearl spawn trigger, P8 reuses the
  level-2 pearl path).
- Sprite: bulky grey-green troll, stone shield, club; windup poses per
  attack; phase 2 tint/ember eyes.
- Tests: hp → 0, stagger blocks attacks, each attack executes (deterministic
  under seeded RNG), shield deflects front arrows / not overhead, reactive
  shield fires, phase 2 thresholds, death event, stomp bounces without kill.

## P8 — Dungeon rendering + lava + level 3 data
- Zones: `'dungeon'` (brown brick courses, torch sconces ~every 250 px —
  seeded per-torch flicker + warm radial glow, dark alcoves) and
  `'dungeon-hall'` (bigger pillars, denser torches, darker brick).
- **Lava** in ground gaps where `level.lava` marks them (dungeon only;
  level 2 chasm/moats render as before): dark red, slow bubble animation,
  soft glow on the brick above. Falling in = existing fall-respawn rule.
- `createLevel3(viewH)` per the design doc: 4400 wide, ground segments +
  4 lava fissures, key alcove + nook platforms, marker brick, key, cell +
  witch, door, troll (minX 3660, maxX 4180), pearl pedestal (~4210),
  staircase down + locked exit, ~13 boxes (existing pool), full roster.
- Register in `src/levels.js` as the third entry.
- Smoke extended to run level 3 for 300 frames.
- Verify by hand: full left→right playthrough in the browser (key → witch →
  door → troll → pearl → stairs), both encounter orders for the key.

## P9 — Level 3 render snapshots
New scenarios in `test/render.test.js` (level-3 harness entry):
- corridor start: brick + two torches + zombie ahead
- key alcove: marker brick, nook ledge, key glinting over lava
- jail cell with witch (bars closed) and with it open
- troll hall: troll mid-slam windup + boulder in flight + HP bar
- flight: player mid-air with wing meter at half
- pearl on pedestal + unsealed stairs
Verify visual markers by hand, then commit the new snapshot sections.

## P10 — Polish
Audio pass (key glint/clink, unlock clank, door rumble, spell whoosh
tuning, troll hit/clatter), FX tuning, README update (levels, S + arrow-key
flight, key/witch/door/troll), final full verification (tests, all smoke
runs, snapshot md5).
