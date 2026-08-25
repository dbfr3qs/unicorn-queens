# Level 4 design — "The Dragon's Layer"

Status: CONFIRMED (decisions at bottom). K1–K5 done: level data + deep
zones + sludge + boxes/secret + keyless portcullis (K1); shaft pearl beat
+ light + fly-up exit (K2); bats (K3); dragon part 1 — sprite, hover
band, aimed fireballs, stagger, 14 hp pips, sunbeam exemption,
reflected-fireball damage (K4); dragon part 2 — breath perch + fire cone,
dive, phase 2, roar/breath sfx (K5); K6 full playthrough — the no-
soft-lock proof, end to end. Level 4 complete (K1–K6).

## Concept

Deeper into the castle: a dark, damp, moss-eaten warren that leads to a
treasure vault and a vast dragon hall. Green-black stone, puddles,
dripping, dim torches. The boss is a **green dragon** that hovers out of
ground-arrow range, rains aimed fireballs, dives, and breathes a fire cone
from the ground. The exit is a **hole in the ceiling**, sealed until the
dragon dies (pearl beat, same as level 3), reachable **only with the
witch's flight spell** — flight is this level's theme: the gauntlet
rewards it, the boss duel bonus-es it, the exit requires it.

Carried in: bow (re-acquirable, see safety boxes), maxHp (heartcap → 4),
**hasFlight** (permanent since the level 3 witch). Level 5 (the forest,
outdoors) is future work; level 4 is **not** the finale.

## Layout (left → right, 4800 px wide, view 800×600)

```
x:    0        600      1800                2600    2700      3550                    4800
      ┌─────────────┬───────────────────┬────────────────────────┬──────────────────────────────┐
      │ WARREN 1    │ WARREN 2          │ GAUNTLET: 5-platform   │ VAULT (treasure, bones,      │
      │ sludge      │ sludge            │ zigzag over sludge     │ boxes, secret crate)         │
      │ 600–700     │ 1800–2600         │ 1800–2600              │ keyless portcullis 3550      │
      │ zombies     │ bats, ghost       │ bats                   │                              │
      │ bats        │                   │                        │ DRAGON HALL (deep-hall)      │
      │ bow box 450 │ bow box 2650      │                        │ dragon ~4150 · pearl ~4050   │
      └─────────────┴───────────────────┴────────────────────────┴ CEILING HOLE + shaft 4150–4250 ┘
```

Zones: `{0–3550: 'deep'}` (damp warren + vault dressing),
`{3550–4800: 'deep-hall'}` (darker, bigger pillars, denser torches).

### Ground segments & sludge pits

Sludge pits are ground gaps with green sludge in the gap (recolor of the
lava render via a per-pit `sludge: true` flag). Falling in = 1 damage +
respawn at last safe ground (level 2/3 rule, reused).

```
ground:  0–600 | 700–1800 | 2600–4800
sludge:  600–700 (easy jump) | 1800–2600 (the gauntlet)
```

### Warren 1 (0–1800)

- Teaches the damp look: green-black stone, moss tufts, puddles, drips,
  dim torches (~every 320 px), phosphorescent moss glow spots.
- Sludge 600–700: plain jump (no platform — easy opener).
- **Safety bow box** at 450 (ground, `drop: 'bow'`).
- Zombies: (250, patrol 180–420), (950, 850–1150), (1350, 1250–1550).
- Bats: (700, y 280, band 500–900), (1450, y 260, band 1250–1650).
- Ghost: (1150, 250) — mostly a menace to fliers; the dark needs one.

### Warren 2 + the gauntlet (700–2600)

- Long flat stretch, then the **gauntlet**: sludge 1800–2600 crossed by a
  zigzag platform chain (rise ≤ 70 px between neighbours, 70–90 px gaps —
  comfortable for jump or flight):
  `{1800, y−110, 90} → {1980, y−180, 90} → {2160, y−110, 90} → {2340, y−180, 90} → {2500, y−110, 90}`
- This is where flight first *pays*: one S cast glides the whole gauntlet;
  without it, five tight hops over green sludge.
- Bat: (2150, y 240, band 1900–2500) — swoops at platform-hoppers.
- Ghost: (2300, 260) — hangs over the pit, menace in the dark.

### Vault antechamber (2600–3550)

- Solid floor, treasure piles and dragon bones on the ground (dressing
  only, no collision).
- **Safety bow box** at 2650 (ground, `drop: 'bow'`) — restart safety: a
  death-restart drops the carried bow, and this box puts one back before
  the boss (decision 12 pattern from level 3).
- Bat: (2800, y 260, band 2650–3000). Zombie: (3350, patrol 3250–3450).
- **The secret crate** (see below) at ~3150.
- **The portcullis** at 3550 (see below).

### Dragon hall (3550–4800)

- Arena: dragon x-band 3700–4600, home x 4150, hover band y 140–260.
- Pillars, denser torches, darker wall, bone dressing.
- Pearl pedestal at x≈4050 (pearl appears when the dragon dies).
- **The shaft** (ceiling hole) at x 4150–4250 (see below). Visible from
  the hall floor the whole level: the goal you can see but not use.

## The dragon — "meatier than the troll"

60×44 horizontal flying body, **green** (body `#3a7a4a`, belly lighter,
wings darker with membrane). **14 hp**, phase 2 below **7** (troll was
8). Unstompable, arrow-only (consistent with every boss; the safety bow
boxes keep it soft-lock-free). White flash 0.15 s + stagger 0.3 s (wings
crumple, it hangs for a beat). 14 hp pips, two rows of seven, above the
dragon (world space, mage pattern). Reflected fireballs (mirror shield)
damage it, as they do the mage. Exempt from the sunbeam (like the mage).

**The range rule** (this is what makes it a different fight from the
mage): ground arrows fly at y ≈ 406 (jump apex) to 536 (standing). The
dragon's hover band is y 140–260 — **unreachable from the ground**. You
can only shoot it (a) while it has descended, or (b) while flying.

**State machine** (idle 1.0–1.5 s → pick → execute):

- **Hover** (default): eased float in the band (mage floatSpeed
  pattern), x clamped to the arena, faces the player, occasional slow
  drift toward the player's x. **Aimed fireball** at the player's center
  with lead (reuse the mage's aim code): one in the air in phase 1,
  **two** in phase 2.
- **Breath perch** — the main ground window: the dragon **descends to the
  ground**, inhales 0.5 s (chest glows, head back, low roar), then a
  **fire cone** toward the player's position at cone start (fixed angle,
  0.9 s), recovers 0.5 s on the ground (vulnerable), then flies back up.
  ~2 s of ground-arrow exposure per cycle. The cone is a fixed-angle
  beam: you sidestep it, you don't outlast it.
- **Dive** — from hover, swoops in a low arc at the player's x down to
  y 505 (body bottom 11 px off the floor — inside the ground-arrow band),
  sweeps ~280 px at 400 px/s (500 in phase 2), rises back to the band.
  Contact damage. Its low pass spends ~1 s inside the ground-arrow band —
  the secondary window. (Design originally said ~y 470; that leaves the
  body 22 px above the arrow band, so the window would not exist.)

**Fire cone** (the one new projectile): a beam from the mouth, fixed
angle set at cone start, 0.9 s duration, widening width — implemented as
a row of ~8 small hitbox segments along the cone in `projectiles.js`
(text-snapshot friendly, no gradients). ~30° spread: at 200 px the beam
is ~100 px wide — dodgeable with a quick sidestep or jump.

**Attack pick weights** — phase 1: perch 40 % / fireball 35 % / dive 25 %.
Phase 2 (hp ≤ 7): perch 30 % / fireball (double) 30 % / dive 40 %,
idle 0.8–1.2 s, dive speed +25 %, inhale 0.4 s, cone 1.0 s.

**Difficulty shape**: more hp and a flying body, but *beatable on the
ground* — patient players farm the breath perches (14 hp ≈ 6–7 perches)
and dive windows; flight is a bonus (shoot during hovers, dodge from the
air), never a requirement for the duel. It must be brutal, not
impossible — and it is not the final boss (level 5+ can still escalate).

## Bats (new regular enemy)

24×18, **1 hp**, **stompable** (bounce + death puff) and arrow-killable —
no bow dependency anywhere before the boss. Contact damage.

AI: hovers at its home point (roster `x`, `y`) with a fast wing-beat and
a small bob. When the player is within aggro (350 px horizontal, 280
vertical — 280 so bats threaten a ground-only player below a y~250–280
roost) and the swoop cooldown (2.5–4 s, seeded per roost) is done, it
**swoops**: a sine-curve dive at the player's position (180 px/s, 1.4 s),
then eases back to roost. Swoop start: quiet flap sfx. Sprite: dark body,
four wing bars flapping off a sin phase, ears, eye glint.

New file `src/enemies/bat.js`, self-registers in the enemy registry,
roster entries as above (four bats).

## The secret — crate in the wall (option b)

A wooden **crate** (the existing box look) built into the vault wall at
(3150, y−120): wood against green-black stone, high and slightly out of
line with the brick courses — visible if you look at the wall, easy to
miss otherwise. No marker, no glint.

- Reachable by a standing jump (120 px rise vs ~130 px apex — tight, the
  level-3 nook-hop feel): land on top / stomp it, or hit it with a
  jump-arrow. Breaks like any box (stomp or arrow).
- `drop: 'heartcap'`: maxHp 4, permanent. If the player already has it
  (level 3 hall box), the existing heartcap code pays out a gem instead —
  no edge case.
- It is a real `lvl.boxes` entry, so no new mechanic: one box, placed
  high and in the wall.

## The shaft — ceiling hole + exit

- `lvl.shaft = { x: 4150, y: 0, w: 100, h: 70, state: 'sealed', openT: 0 }`
  (small new module `src/shaft.js`, ~20 lines).
- **Sealed**: an iron lattice gate across the hole (portcullis styling),
  dim green seal glow — the same "sealed" language as the level 3
  staircase barrier. **Decorative only**: the engine has no solid
  ceiling, and the flight clamp (y ≥ 60) already keeps the player from
  leaving the level. The player can fly up and hover at the gate and see
  it shut — that's the point.
- **The beat (level 3 pattern, confirmed)**: dragon dies → pearl appears
  on the pedestal (reuses `pearl.js` `showWhen`, `e.kind === 'dragon'`) →
  player picks it up → `exit.locked = false`, shaft `state: 'opening'`,
  **1.2 s retract** (lattice slides up into the ceiling, `rumble` sfx) →
  **golden light shaft**: a vertical low-alpha gold column from ceiling
  to floor at the hole + rising ember particles (seeded, text-snapshot
  friendly). "Outside is up there."
- **The exit rect is the shaft rect** `{x: 4150, y: 0, w: 100, h: 70}`;
  `reachedExit` + the locked flag do the rest. Ground → hole is ~450 px ≈
  2.1 s of the 10 s flight: one calm, aimed ascent.
- No soft-lock: flight is permanent (granted in level 3, survives
  restarts); the pearl sits on the open hall floor; the hole is in the
  same room as the boss.

## The portcullis (vault → hall)

The level 3 portcullis (`door.js`) with one small generalization: a
`noKey: true` flag — it auto-opens on approach (rumble, slides up)
without consuming anything, and **drops shut behind** the player once
past (commit to the fight, same as level 3). Full height, so flight
cannot skip it. `lvl.door = { x: 3550, y: 0, w: 40, h: groundY, state:
'locked', noKey: true, openT: 0, closeT: 0 }`.

## Dark & damp — art, not mechanics (confirmed)

New zone kinds `deep` / `deep-hall` in `src/render/zones.js`, mirroring
`dungeon` / `dungeon-hall`:

- **Wall**: green-black stone `#141d16`, mortar courses `#0c130e`,
  staggered joints (same course rhythm as the dungeon so the code
  reuses).
- **Moss**: seeded tufts (2–4 px clumps, `#2e4a2a`) along a subset of the
  mortar courses; phosphorescent spots: a few faint green glow circles
  (low alpha `#4a7a3a`) — the layer's own dim light.
- **Puddles**: dark floor ellipses at seeded x in the `deep` zone, with a
  faint warm reflection streak under nearby torches.
- **Drips**: seeded x every ~140 px; a 2×6 px droplet falls on a seeded
  phase (pure time function, no particle state), small splash line at
  the floor. Optionally a very quiet plop sfx, throttled.
- **Torches**: ~every 320 px (hall: 250), same sconce, dimmer glow alpha.
- **Deep-hall**: darker wall `#101712`, pillars in dark green-grey, bone
  dressing on the floor.
- **Sludge pits**: lava render with a `sludge: true` flag → body
  `#14200e`, surface line `#3a5a1e`, slow bubbles `#5a7a2e`.
- **No visibility penalty, no slow zones**: darkness is palette and
  light, not a light-radius mask. A flying boss you can barely see is
  where atmosphere stops being fun.

## Loot boxes

Existing pool only (no new loot items). 14 boxes:
warren 1 (450 **bow**, 800 gem, 1050 sunbeam, 1300 mystery, 1550 star),
vault approach (1750 heart, 2650 **bow**), vault (2850 lantern, 3000
grow, 3250 magnet, 3400 mystery), **secret crate** (3150, y−120,
heartcap), hall (3700 shield, 4650 heart).

- The two **bow boxes** (450, 2650): `drop: 'bow'`, both ground-level and
  stomp-breakable. 450 arms a first-pass run early; 2650 is the
  death-restart safety net before the boss (restarts drop the carried
  bow — level 3 decision 12). Redundant pickups are harmless
  (`onPickup` re-sets `hasBow`).
- The sunbeam at 1050 can never see the dragon (arena ≥ 3700); the
  dragon is also sunbeam-exempt by kind, like the mage.

## Enemies

- **Zombies + ghosts + bats** (bats new; the others reused as-is).
- Roster: zombies (250: 180–420), (950: 850–1150), (1350: 1250–1550),
  (3350: 3250–3450); ghosts (1150, 250), (2300, 260); bats (700, 280,
  band 500–900), (1450, 260, band 1250–1650), (2150, 240, band 1900–2500),
  (2800, 260, band 2650–3000); dragon (4150, y 200, band 3700–4600).

## Ending sequence

1. Dragon dies → big burst + shake + roar → pearl on the pedestal.
2. Pearl pickup → chime → shaft gate retracts (rumble) → golden light
   shaft + embers.
3. Cast flight (S), fly straight up into the hole → exit rect → standard
   level-complete overlay. Level 5 (the forest) is future work.

## New systems (input to the phased plan)

1. Level 4 data (`createLevel4`) + `LEVELS` registration + HUD level name
2. `deep` / `deep-hall` zone render: moss, puddles, drips, dim torches,
   phosphorescent glow, bone/treasure dressing; sludge pits (lava flag)
3. Portcullis `noKey` generalization (`door.js`)
4. Shaft: sealed gate → 1.2 s retract → light shaft + embers + exit
   (`src/shaft.js` + pearl wiring)
5. Bat enemy: AI, sprite, sfx, tests
6. Dragon part 1: sprite (hover/stagger poses, wing flap), hover float +
   aimed fireballs, stagger, 14 hp pips, sunbeam/reflection wiring
7. Dragon part 2: breath perch + fire cone projectile, dive, phase 2,
   roar sfx
8. FX + audio: roar, breath whoosh-crackle, flap, (quiet drip plop),
   reuse `rumble`/`pearl`/`seal`/`deflect`
9. Tests + render snapshots: level data, bat AI, shaft beat, scripted
   dragon duel, headless full playthrough (run → gauntlet → vault →
   portcullis → dragon → pearl → fly up)

## Phased build (one subsystem per turn, tests + smoke green after each)

1. **K1** level data + zones + sludge + boxes/secret + keyless portcullis
   (walkable end-to-end; sealed gate drawn, no bats/dragon/shaft logic)
2. **K2** shaft: pearl beat, gate retract, light shaft, fly-up exit
3. **K3** bats
4. **K4** dragon part 1: hover + fireballs + stagger + pips
5. **K5** dragon part 2: perch + fire cone + dive + phase 2
6. **K6** polish: headless playthrough, scripted boss test, final snapshots

## Decisions (confirmed)

1. The dragon is **beatable on the ground**: breath perches (~2 s) and
   dive arcs give ground-arrow windows; flight is a bonus (shooting
   during hovers), not a requirement for the duel.
2. **Two fire attacks**: aimed fireballs from the hover (mage aim reuse;
   one in phase 1, two in phase 2) + a fixed-angle **fire cone** from the
   ground breath (new projectile: segment row, 0.9 s, ~30° spread).
3. **Dampness is art only**: moss, puddles, drips, dim torches. No slow
   zones, no damage zones, no visibility penalty.
4. **Bats** join the regular enemies: 24×18, 1 hp, stompable and
   arrow-killable, sine swoop on aggro (350×280 px, so they threaten
   ground players), hover-bob otherwise. Four bats in the warren/vault.
5. **Secret**: a wooden crate in the vault wall (3150, y−120), reachable
   by a standing jump (tight) or a jump-arrow; `drop: 'heartcap'`
   (duplicate pays a gem — existing behaviour). Visually found (wood
   against stone, high, slightly out of line), no marker.
6. **Level 3 pearl beat kept**: dragon dies → pearl on pedestal → pickup
   → shaft gate retracts (1.2 s) + light shaft → fly up to the exit.
7. **Dragon: 14 hp, phase 2 below 7** (meatier than the troll's 8).
8. **Level 4 is not the finale** (level 5 = the forest, then more): the
   dragon is tuned as a strong mid-game boss — brutal but with generous
   windows, leaving headroom for future bosses.
9. **4800 px wide**, two zones: `deep` (0–3550), `deep-hall`
   (3550–4800). Sludge pits: 600–700 (easy) and the 1800–2600 gauntlet
   (5-platform zigzag, rise ≤ 70 px, 70–90 px gaps).
10. **Two safety bow boxes** (450 and 2650): a death-restart drops the
    carried bow (carry only happens on an advance, `game.js`); both boxes
    are ground-level, stomp-breakable, before the boss — no item
    dependency to reach either.
11. **Keyless full-height portcullis** at 3550: `noKey` flag on the level
    3 door (auto-open on approach, drop-shut behind). Flight cannot skip
    it.
12. **The shaft gate is decorative** (no solid ceiling exists in the
    engine; the flight clamp already bounds the player); the exit rect is
    gated by the pearl-locked flag, not by the gate.
13. **The dragon is sunbeam-exempt** (like the mage) and takes reflected
    fireballs (mirror shield), reusing the existing `reflected` path.
