# Level 5 design — "The Enchanted Forest"

Status: CONFIRMED (all 13 decisions; plan in `LEVEL5-PLAN.md`).

## Concept

The player exits the castle through the doorway they flew out of at the end
of level 4: a short dark stone passage, a big arch, then open sky. It opens
out into a **sunlit forest — the first daytime level** (every level so far
has been night or underground). There is **no boss fight**. The objective
is exploration: find the **three hidden relics of the realm** and bring
them to the **Unicorn Queen** in the glade at the heart of the wood — the
game's final boss, who here is a *friendly* NPC and story gate. When all
three are presented, she tells the quest: **the Unicorn King has been
kidnapped by an evil wizard who rides a flying pig and lives on top of a
snow-topped mountain.** A mist gate at the wood's east edge (locked until
the story is told) carries the player out. The mountain is level 6
(future work); level 5 is not the finale.

Carried in: bow, big, maxHp, hasFlight — all permanent since L3/L4.

### Why this one is more interesting

- **Objective exploration**: a 0/3 relic counter on the HUD instead of a
  pure left-to-right gauntlet; the player can explore in any order.
- **A hub NPC**: the Queen is reachable at any time and reports progress —
  the first level with a recurring character interaction.
- **Three distinct hiding mechanics** (shoot-a-bush / hollow tree /
  floating lily pad) — none used in any previous secret.
- **Verticality**: branch-canopy routes; flight (permanent since L3)
  becomes a traversal tool, not just a puzzle tool.
- **Daylight**: sky, sun, drifting clouds, green hills — the palette break
  from three dark castle levels is the level's opening statement.
- **A new regular enemy**: the bee (daytime forest fauna); slimes are
  reused, castle creatures stay in the castle.

## Layout (left → right, 5600 px wide, view 800×600, groundY 560)

```
x:     0     500           1900          2650    3250   3700              5450  5600
       ┌──────┬───────────────┬──────────────┬──────────┬──────┬────────────────┬──────┐
       │ GATE │ MEADOW EDGE   │ WOODS        │ POND     │QUEEN'S│ DEEP WOODS     │ MIST │
       │ arch │ relic 1: bush │ relic 2:     │ relic 3: │GLADE │ stream + logs  │ GATE │
       │ 280–460│ (1150)       │ hollow tree  │ lily pad │queen │ (4200–4300)    │ exit │
       │      │ slimes, canopy│ (2300), bees │ pads,    │ 3480 │ bees, slimes   │      │
       └──────┴───────────────┴──────────────┴──────────┴──────┴────────────────┴──────┘
```

Zones: `{0–500: 'gate'}, {500–5600: 'forest'}`.

Ground / water (water = lava render with a new `water: true` recolor flag;
falling in = 1 damage + respawn, the existing pit rule):

```
ground:  0–500 ('stone') | 500–2650 | 3250–4200 | 4300–5600
water:   pond 2650–3250 (600 px) | stream 4200–4300 (100 px)
```

### The gate (0–500)

- The doorway from level 4: dark castle wall (the `hall` purple stone), a
  **stone arch at 280–460** with the day sky visible through it, then a
  cobbled courtyard (ground kind `stone`). Player spawns at x 60 in the
  passage and runs out into the light.
- **Intro beat** (one-shot dialogue, rect 40–240 at the spawn: the player
  starts inside it, so it fires on frame 1 — the world freezes while the
  objective is read). First level with an intro beat.
- **Safety bow box** at 540 (ground, `drop: 'bow'`, stomp-breakable): a
  death-restart drops the carried bow (only maxHp and flight survive), and
  the horseshoe relic *requires an arrow* — so every restart can re-arm
  before the secret (the L3/L4 decision-12 pattern).

### Meadow edge (500–1900)

- Rolling grass, scattered trees, flowers. Canopy introduction: branch
  platforms `{800, y 450, 110}` → `{1010, y 370, 100}` (teaches the branch
  look; nothing on them yet — an invitation to fly).
- Slimes: (700, 600–950), (1400, 1300–1700).
- **Relic 1 — the golden horseshoe**, hidden in a **bush** at 1150 (see
  Relics).

### The woods (1900–2650)

- Denser trees. **Hollow tree** at 2300 (big trunk, dark round hollow
  centered at (2330, 280), full canopy).
- **Relic 2 — the sapphire**, resting in the hollow at (2322, 286).
  Reach: branch chain `{2120, y 450, 90}` → `{2250, y 340, 90}` (rises
  110 — inside the 130 px standing-jump apex) then a small hop into the
  hollow; or flight at y ≈ 290. **Not reachable from the ground** (jump
  apex puts feet at y 430; the relic's bottom is 302).
- Slime (2050, 1950–2300). Bee (2450, y 320, band 2400–2600).
- Box: 2500 star.

### The pond (2650–3250)

- 600 px of water. **Lily pads** (platform kind `lily`, 12 px green discs
  floating 10 px above the water): `{2700, y 554, 70}`, `{2850, 554, 70}`,
  `{3000, 554, 70}`, `{3150, 554, 70}` — 80 px gaps, plain jumps cross.
- **Relic 3 — the royal acorn** on a **solitary pad that floats higher**:
  `{2940, y 390, 60}` — 164 px above the crossing pads. Plain jump apex
  (130) can't reach it; **bounce boots (208) or flight** can. The acorn
  glints gold on its pad.
- Bees: (2750, y 320, band 2650–2950), (3100, y 300, band 2950–3250) —
  they hover over the pond flowers and sting at the crossing.

### The queen's glade (3250–3700)

- An open clearing: big canopy tree at 3650, a ring of flowers, a low
  stone dais. No enemies in the glade (a safe haven, by placement).
- **The Queen** on the dais at (3480, 488, 48×72) — see The queen.
- Box: 3600 heart.

### Deep woods (3700–5450)

- The densest part: darker background canopy band, the most bees.
- **Stream** 4200–4300 with a fallen **log** platform `{4195, y 546, 110}`
  (a plain jump also clears the 100 px gap — the log is comfort, like the
  L4 easy sludge pit).
- Canopy: `{3800, y 440, 100}`, `{4650, y 450, 110}`, `{4900, y 370, 100}`.
- Bees: (3850, y 300, band 3750–4050), (4400, y 280, band 4300–4600),
  (4850, y 310, band 4750–5050).
- Slimes: (4100, 4000–4190), (4700, 4600–4900), (5150, 5050–5350).
- Boxes: 3900 boots, 4450 mystery, 4650 hops, 5100 magnet, 5300 heart.

### The mist gate (5450–5600)

- A stone arch (same styling as the entry arch) with a shimmering mist
  field inside. **Locked**: dim blue-grey, faint seal glow (the level 3
  "sealed" language). After the Queen's story: 1.5 s brighten to a glowing
  pale-blue field + rising sparkle motes + `seal` chime.
- `lvl.mistgate = { x: 5450, y: 400, w: 100, h: 160, openT: 0 }`;
  `lvl.exit = { x: 5470, y: 430, w: 60, h: 130, locked: true }` — the
  standard locked-rect pattern does the rest.

## The three relics

`lvl.relics = [{ id, x, y, w: 16, h: 16, taken, visible }]`. Pickup =
overlap (the `key.js` pattern): `taken`, sparkle burst, `relic` chime
(two-tone sine), **+50 score**, HUD icon lights up. New `src/relics.js`
(owns pickup + a `relicsTaken(lvl)` helper for the dialogue `when`s) and
`src/render/relics.js` (the three sprites + their glints).

| # | relic | at | find cue | how to get it |
|---|---|---|---|---|
| 1 | **golden horseshoe** | (1142, 514), on the bush top at 1150 (rests on the mound, not buried in it — the bush would paint over it) | a 2×2 white glint in the bush every ~4 s (seeded by x, 0.3 s) — visible only if you look at the bush | **shoot the bush**: any arrow (stars too) → rustle puff + `rustle` sfx → the horseshoe pops out onto the bush and is pickable |
| 2 | **sapphire** | (2322, 286), in the hollow tree | a dark round hollow in a big tree, a faint pulsing teal glint inside | branch chain (2120@450 → 2250@340, small hop into the hollow) **or flight** |
| 3 | **royal acorn** | (2956, 374), on the floating pad | a lone lily pad floating well above the others, a small gold glint on the acorn | **flight** (or bounce boots) to the pad at 2940@390 — the water below is a hazard |

The **bush** is a new object: `lvl.bushes = [{ x: 1122, y: 530, w: 56,
h: 30, relicId: 'horseshoe', state: 'hiding', rustleT: 0 }]`. Arrows get a
new collision pass in `updateArrows` (after the box loop, same shape):
hit → `state: 'revealed'`, `rustleT = 0.4` (leaf-puff render), the linked
relic's `visible = true`. Decorative bushes elsewhere are a seeded pure
function (no state), so only the glinting one is special.

Each relic is a **different kind of hidden**: 1 is concealed (glint in the
bush), 2 is in plain sight but high (the hollow), 3 is in plain sight but
in the water. Finding order is free — the Queen's beats track the count.

## The queen — the final boss

**Non-combat.** She is the game's final boss in narrative weight — the
last major character, the one who hands over the quest — but she has no hp
and no attacks; the fight is the whole level's exploration. The actual
combat finale (the wizard) is level 6.

- Sprite: a regal white unicorn, **48×72** (taller than the player — she
  should feel important): golden horn with a periodic sparkle glint,
  flowing lavender mane, gold collar, a gentle bob (sin, 0.5 Hz), faces
  the player. New `src/render/queen.js`, drawn in the world pass after the
  player. Walk-through (no collision), on a stone dais (decoration).
- `lvl.queen = { x: 3480, y: 488, w: 48, h: 72, toldStory: false }`.
- **Dialogue** (existing proximity system, rect 3400–3660 ground band).
  Beats are mutually exclusive by count, so the first eligible fires:
  - `q0` — `repeat: true`, `when: count === 0`:
    - "You seek the relics — the horseshoe, the sapphire, the acorn."
    - "They hide in plain sight. Look closely, champion."
  - `q1` — `repeat: true`, `when: count === 1`:
    - "One of the three. The wood still holds the other two."
  - `q2` — `repeat: true`, `when: count === 2`:
    - "Two of the three. One more, and I will tell you what ails the kingdom."
  - `q3` — once, `when: count === 3`, **`onOpen`**:
    - "At last — horseshoe, sapphire, acorn. The realm's relics are whole again."
    - "Now hear why the kingdom trembles: it is the king."
    - "An evil wizard has kidnapped the Unicorn King. He rides a flying pig, and has carried the king to the top of a snow-topped mountain."
    - "The mist gate at the wood's edge will carry you to the peak. Free the king, champion."
  - `count` = `relicsTaken(g.level)` (imported by level5.js, like the
    pearl's `showWhen` imports no state).
- **Giving the objects is implicit**: `q3` can only fire with all three
  collected — walking up to her *is* the hand-over.
- **The `onOpen` hook** (small generalization, ~2 lines in `game.js`
  `checkDialogs`): a beat may define `onOpen(game, fx)`, called when the
  beat fires. For `q3` it sets `exit.locked = false`, `mistgate.openT`
  running, `queen.toldStory = true`, plays `seal`. The gate brightens
  while the story is still on screen (the world is frozen) — closing the
  box reveals a glowing path east.

### Intro beat (at spawn, one-shot)

- "You slip out of the dragon's lair, into the sunlight."
- "The realm's three relics are lost in this forest: the golden horseshoe, the sapphire, the royal acorn."
- "Find all three and bring them to the Unicorn Queen in the glade at the heart of the wood."

## The bee (new regular enemy)

18×14, **1 hp**, **stompable** (death puff, bat pattern) and
arrow-killable; contact = a sting. Sunbeam kills it (normal non-boss
rule). No bow dependency anywhere.

AI (same roster shape as the bat: `x, y, minX, maxX` home + band, but
straight-line motion instead of the bat's sine swoop):

- **Idle**: hovers at its home flower (roster x/y — a tall flower is drawn
  at each bee's home as a "lives here" cue) with a fast wing-beat and a
  small circular bob.
- **Sting**: when the player is within 260 px horizontal / 200 px vertical
  and the sting cooldown (3–4 s, seeded per home) is done: a **straight
  horizontal dash** at the player's height, 450 px/s, up to 220 px, then
  ease back home. `buzz` sfx (low square wobble) at dash start. A straight
  line is readable and dodgeable — but you can't sit still while it
  cools down.

New file `src/enemies/bee.js`, self-registers. Roster (six): 2450 (y 320,
band 2400–2600), 2750 (320, 2650–2950), 3100 (300, 2950–3250), 3850
(300, 3750–4050), 4400 (280, 4300–4600), 4850 (310, 4750–5050).

## Daylight — art, not mechanics

Two new zone kinds in `src/render/zones.js`:

- **`gate`** (0–500): the day sky is painted across the zone (same bands
  as `forest`), then the castle wall (the `hall` purple stone) is drawn
  over it **with the arch cut out** — two pillars + an arched lintel, so
  sun and hills show through the opening before you walk under it. Ground
  kind `stone`: cobbled grey-blue blocks.
- **`forest`** (500–5600): day sky `#7ec8f0`; a warm sun disc `#ffe9a3`
  with a two-ring low-alpha halo (parallax 0.05, fixed position); 3–4
  white cloud blobs drifting slowly (a pure time function, like the deep
  zone's drips — no particle state); far hills `#79b86a` (parallax 0.35)
  and near hills `#4e9a4e` (0.6) — the existing `drawRidge` shapes reused
  in daylight colors; a seeded tree-line row along the near ridge. From
  x 3700 the background shifts one shade darker (the deep woods band).

World pass (dressing, no collision): trees (18 px trunks to y ~180,
two-tone canopy circles; the hollow tree gets its dark hollow), seeded
flowers and grass tufts along the ground, the **pond/stream** (lava render
with `water: true`: body `#0d2b4e`, surface `#1d4e8e`, a shimmer line, no
bubbles), and three new platform kinds: `branch` (a brown limb with a leaf
tuft), `lily` (a 12 px green disc with a notch), `log` (a horizontal log,
rings on the end). The bee's home flower. No visibility penalty — the
point is that everything is bright.

## Loot boxes

Existing pool only, 11 boxes. No shield (no fireballs in this level —
bees sting at your height, a mirror is useless), no heartcap (already
owned from L3/L4; a duplicate would just pay a gem), no bow other than
the safety box.

540 **bow** (safety), 900 gem, 1500 sunbeam, 1700 mystery, 2500 star,
3600 heart, 3900 boots, 4450 mystery, 4650 hops, 5100 magnet, 5300 heart.

The sunbeam at 1500 clears slimes/bees on screen (standard rule) — a
comfort item for the deep woods. The boots at 3900 (after the glade) is
the second way to reach the acorn pad — an optional item-gated shortcut,
never a requirement.

## Enemies

- **Slimes × 6** (reused as-is — green slimes fit the forest; they were
  the night meadow's fauna): (700, 600–950), (1400, 1300–1700),
  (2050, 1950–2300), (4100, 4000–4190), (4700, 4600–4900),
  (5150, 5050–5350).
- **Bees × 6** (new): see above.
- No ghosts, zombies, bats, or bosses — castle creatures stay in the
  castle.

## Ending sequence

1. Third relic collected → HUD counter full.
2. Return to the Queen (she's mid-level, so any order works) → `q3` story
   (four lines) → the mist gate brightens.
3. Walk east through the deep woods (final boxes, the heart at 5300 as
   the send-off) → step into the glowing mist → standard level-complete
   overlay.
4. Level 6 — the snow-topped mountain, the wizard, the flying pig — is
   future work.

## New systems (input to the phased plan)

1. Level 5 data (`createLevel5`) + `LEVELS` registration
2. `gate` + `forest` zones (day sky, sun, clouds, daylight ridges, tree
   line, arch cut-out); ground kind `stone`; platform kinds
   `branch`/`lily`/`log`; water flag; world-pass trees/flowers/bee
   flowers
3. Relics: `lvl.relics`, `src/relics.js` (pickup, +50 score,
   `relicsTaken`), `src/render/relics.js` (three sprites + glints), HUD
   3-icon counter (top-center, left of the LEVEL text)
4. Bush: `lvl.bushes`, the arrow-hit reveal pass in `arrows.js`, rustle
   puff + `rustle` sfx
5. Queen: `lvl.queen`, `src/render/queen.js`, dialogue beats q0–q3, the
   `beat.onOpen(game, fx)` hook in `game.js`, exit unlock
6. Mist gate: `lvl.mistgate`, `src/render/mistgate.js` (arch + shimmer
   field, locked → brighten), the exit rect
7. Bee: AI, sprite, `buzz` sfx, tests
8. FX + audio: `rustle`, `relic`, `buzz`; reuses `seal`, `dialog`, `gem`
9. Tests + render snapshots: level data, relic pickups, bush reveal,
   Queen beats at counts 0/1/2/3, gate unlock, bee AI, headless full
   playthrough (spawn → intro → shoot bush → branch chain → pond flight →
   Queen ×4 → mist gate)

## Phased build (one subsystem per turn, tests + smoke green after each)

1. **M1** level data + zones (gate/forest daylight) + ground/platform
   kinds + boxes — walkable end-to-end; mist gate drawn locked; no
   relics/Queen/bees
2. **M2** relics: pickup + HUD counter + the three sprites/glints + bush
   reveal (all three collectable)
3. **M3** Queen: sprite, beats, `onOpen` hook, exit unlock
4. **M4** mist gate: render, brighten, exit rect
5. **M5** bee
6. **M6** polish: headless playthrough, scripted Queen test, final
   snapshots

## Decisions (awaiting confirmation)

1. **The final boss is non-combat**: the Unicorn Queen — a friendly NPC,
   no hp, no attacks. She is the story gate and the narrative "boss"; the
   combat finale (wizard + flying pig + mountain) is level 6.
2. **The three relics**: golden horseshoe (in a bush — shoot it),
   sapphire (hollow tree — branch chain or flight), royal acorn (floating
   lily pad in the pond — flight or boots). One concealed, two in plain
   sight but out of reach.
3. **The pond is a hazard**: falling in = 1 damage + respawn (the existing
   pit rule, `water` recolor of the lava render); lily pads make it
   crossable without damage.
4. **The Queen is a hub**: reachable at any time; her beats report the
   relic count (0/1/2/3); the story beat fires only with all three held.
5. **The exit is a mist gate** at the east edge, unlocked by the story
   beat via a new optional `beat.onOpen(game, fx)` hook on dialogue beats
   (~2 lines in `game.js`); the gate brightens while the story is on
   screen.
6. **5600 px wide**, zones `gate` (0–500) + `forest` (500–5600). The first
   daytime level.
7. **Enemies**: 6 slimes (reused) + 6 bees (new); no ghosts/zombies/bats
   (castle creatures stay in the castle).
8. **Safety bow box at 540**: a restart drops the carried bow; the
   horseshoe needs an arrow; the box is stomp-breakable on the ground
   path — no soft-lock.
9. **Intro dialogue at spawn** teaches the objective (one-shot beat; the
   player spawns inside the rect so it fires on frame 1).
10. **No shield/heartcap boxes** (no fireballs this level; the heartcap is
    already owned).
11. **New render kinds**: ground `stone`; platforms `branch`, `lily`,
    `log`; water = a recolor flag on the lava render.
12. **Each relic is +50 score** (the `score` export, `key.js`-pattern
    pickup).
13. **Level 5 is not the finale** (level 6 = the mountain).
