# Level 9 design — "The Frozen Throne"

Status: CONFIRMED (all 14 decisions; third and last of the 7–9 trilogy.
Spine in `LEVEL7-DESIGN.md`: the Frost Queen is the true source; L7 broke
the Rune, L8 the Anchor, **L9 the Throne** — the finale, the game's first
level that ends in a dedicated `ending` state instead of an overlay.)

## Concept

The shaft dive out of the Sky Citadel drops the player onto a **glacier**
at first light that never quite comes: a sky locked in pre-dawn indigo,
the cloud sea frozen to a line on the horizon, the whole realm's slow
sickness concentrated in one place. On the glacier's face sits the
**Frozen Palace** — the Frost Queen's throne, where a century ago she
fired her world-freeze to stop a plague, and the spell turned to her
prison. Everything here is frozen mid-motion: a fountain caught in its
splash, a wave caught in its crash, the realm's people caught mid-step.
The Queen is frozen on her own throne, mid-cast, holding the winter one
last time. The **Unicorn King** — freed on the Peak, come down the shaft
with the rainbow — is already waiting at the spawn; he walks ahead of the
player all the way to her throne, and at the end he uses what she spent a
century trying to take: **the horn, the realm's last thaw**.

The level is the game's **thaw level**: three **sun seeds** (relics, +50,
each hidden a different way — L5's relic pattern) are planted in the
palace's three frozen **hearth braziers**, and each ignition **warms the
level around you**: the frozen hum rises a step, the sky warms a shade
toward dawn, a ring of frost melts off the ground (ice becomes walkable
wet stone), one frozen creature is released, and one of the Queen's three
**frost seals** cracks and flows away. The ice mechanic that was L7's
ingredient is the level's grammar (the full version: the slide is the
crossing, the **boots grip ice**, and the boss's own breath *makes new
ice* under your feet). Behind the third seal, on an arena floor of ice,
the **Frost Queen** wakes. She has 24 hp and three thaws; the player's
three fires become her three wounds. At zero she is not killed — she is
**released**: the ice shatters off her, the century catches up, and she
dissolves into snow and light. The King's horn then sweeps the palace,
the frozen figures fade into warm light, the fountains flow, the wave
crashes, the sun rim crests the glacier, and the game ends: **the
`ending` state** — the dawn palace held behind the end card, Space for a
new game from level 1.

Carried in: bow, big, maxHp 4, hasFlight — all permanent.
`LEVELS[8] = { name: 'frozen-throne', make, carry: { hasBow: true, hasFlight: true } }`.

### Why this one is more interesting

- **The level is the climax of its own mechanic**: ice (L7's embryo) →
  hearths (L8's puzzle inverted — L8's level died around you; this one
  heals) → a boss whose phase structure *is* the thaw (her wounds are the
  player's fires). One word, three depths, the whole trilogy in one
  level.
- **The palette is the progress bar**: the sky's thaw is the first time
  the level's *atmosphere* is a function of player progress — a 4-step
  dawn (frozen indigo → violet → mauve → peach) plus stars that fade as
  the world warms. The level is visibly getting better as you play it.
- **The boss is thawed, not killed**: the game's first non-kill finale.
  Her difficulty curve is a *warming* — each thaw burst makes her faster
  and more desperate (a dying woman, not a machine), and her death is a
  release: no burst, no rage — the ice comes off her and she is gone.
  The bound-creature motif closes here: the pig walked, the wraiths
  sparkled, the Warden bowed, the Queen melts.
- **The arena is the mechanic**: the throne room floor is ice, and her
  frozen breath *leaves new ice patches* under your feet — the level's
  traversal language becomes the boss's attack language. The game's first
  time the player's own footing is a weapon pointed at them.
- **The horn pays off the L5 hook**: the kidnapped King and "the realm's
  last thaw" have been the story's engine since the enchanted forest.
  He walks with you from spawn, stands at her throne, and ends the
  winter with his own horn — the end card is a state, not a screen: the
  last image of the game is the level it just played, healed.
- **The mercy beats are the fauna**: the level's "regular enemies" are
  the palace's own machines of cold (frost sprites, glacier golems),
  while the biome's real animals — a hare, a wraith, a robin — are
  *frozen*, released one per hearth. The thaw is who the level is for.

## Layout (left → right, 6000 px wide, view 800×600, groundY 560)

```
x:     0     650   950  1600        2400   2600  3200  3800            5200                6000
       ┌──────┬────────┬──────┬──────────┬────────┬───────┬───────────┬─────────────────┐
       │GLACIER│ GATE   │ HEARTH│ COURTYARD│ WAVE   │ HEARTH│ FROSTFALL │ HALL            │ THRONE ROOM     │
       │shaft, │ seal1  │ A 950 │ seal2→  │ 2300–   │ B     │ GAP 3200– │ fountains,      │ ice floor,      │
       │fount. │ 1600,  │ hare  │  wave,  │ 2700,   │ 2600, │ 3450,     │ figures, bird   │ King 5300,      │
       │650,   │ crevas-│ 880,  │ seed 2  │ crest   │ wraith│ bridges,  │ 4250, hearth C  │ QUEEN 5700,     │
       │seed 1 │ se     │ boots │ 2420    │ 2420,   │ 2750  │ run-up    │ 4400, seal3 5200│ dais 5620,      │
       │       │ 1400–  │ 1200  │         │ hearth  │       │ 2800–    │                 │ thaws → ENDING  │
       │       │ 1550   │       │         │ B       │       │ 3200     │                 │                 │
       └──────┴────────┴──────┴──────────┴────────┴───────┴───────────┴─────────────────┘
```

Zones: `{0–1600: 'glacier'}, {1600–3800: 'palace'}, {3800–5200: 'hall'},
{5200–6000: 'throne'}`.

Ground / pits (falling in = 1 damage + respawn at last safe ground, the
standard pit rule; pits use the L7 `crevasse` recolor):

```
ground:  0–1400 ('ice') | 1550–3200 ('ice') | 3450–3800 ('ice') |
         3800–5200 ('stone', frost film) | 5200–6000 ('ice', throne room)
pit:     1400–1550 (150, `crevasse: true`) — crevasse 1 (plain-jumpable)
         3200–3450 (250, `crevasse: true`) — the frostfall gap (slide or
              bridges or flight), bridges `{3240, y groundY−6, w 40, kind: 'ice'}`
              and `{3380, y groundY−6, w 40, kind: 'ice'}`
seals:   1600 (`frostseal`, full height) — melts on hearth A
         3800 (`frostseal`) — melts on hearth B
         5200 (`frostseal`) — melts on hearth C
```

### The glacier (0–1600)

- The landing shelf: the **cloud shaft glow** streams off behind the
  spawn (west, a swirling mist band fading out of frame — the L8 shaft
  you just came down; a three-frame visual callback, the L7 stairway
  pattern). The glacier's ice underfoot (pale blue-white, glint streaks,
  crack lines), the frozen sea line on the horizon, the **palace
  silhouette** ahead (parallax 0.2 — the visual goal from spawn).
- Player spawns at x 60. **The King** is already here (see the King
  section): his silhouette walks ~100 px ahead of the player — no
  collision, a faint warm glow (the first warm thing the player sees).
- **Intro beat** (one-shot, rect 40–240, fires on frame 1 — the spawn
  band), speaker **The Unicorn King**:
  - "The glacier keeps what she froze. Three fires slept here when she came."
  - "Wake them, and the ice will tell you the way. I will meet you at her throne."
  Sets up the hearths (the puzzle), the seals (the path), and his
  presence at the end (the horn) in two lines — the L6/L8 intro pattern.
- **The frozen fountain** at 650 — **seed 1** (see the seeds section):
  a raised stone pedestal `{620, y groundY−24, w 120, kind: 'dais'}`
  with a frozen water column (40×100, y groundY−124 → groundY−24) —
  a splash caught in ice, a warm glint deep in the water every ~4 s
  (seeded, the bush pattern — "something is in here").
- **Hearth A** at 950 (the first brazier — see the hearths section).
- **The frozen hare** in an ice block at 880 (a 56×56 block, a hare
  silhouette visible in the ice — a mercy beat; released by hearth A,
  see the thaw section).
- **Safety bow box at 300** (ground, stomp-breakable): a death-restart
  drops the carried bow; the seed blocks need arrows.
- Boxes: 800 gem (fountain → hearth A run), 1200 **boots** (on the ice,
  before crevasse 1 — the grip teach: while the boots' window lasts,
  the ice behaves like stone; when it expires, the real sliding begins).
- **Crevasse 1** (1400–1550, 150 px): the ice *teach* — run up the
  patch, feel the slide, jump off it. A plain running jump clears it
  anyway; the slide just makes it bigger.

### The palace gate and courtyard (1550–2300)

- **Seal 1** at 1600 (door kind `frostseal`, full height): a 40 px wall
  of pale blue ice, a dark seal glow at its hub (the L8 gear-door
  language). Sealed: solid. Melts on hearth A's ignition — see the seals
  section. The palace's facade beyond: carved ice wall, frozen windows
  with a faint blue glow (parallax 0.3), frozen banners hanging still.
- The gate court (1600–1900): the long drop from the glacier's rim to
  the courtyard (a 20 px step-down, a world-pass lip, no platform).
- **The courtyard** (1900–2300): open ice, the facade's corner turning
  right, the frozen wave ahead. A **glacier golem** patrols 1900–2150
  (see the enemies section) — the first fight on open ice, where the
  slide is already a dodge.
- Box: 1800 gem.

### The frozen wave (2300–2800)

- The set piece: the realm's sea, caught mid-crash against the glacier's
  cliff — a **great wave frozen at its crest** (2300–2700, ~200 px tall,
  the foam frozen white, the water a clear blue-green ice). The cliff
  face drops from the crest to the courtyard floor at 2700. Embedded in
  the wave's face: three **ice shelves** (the seed-2 route, each rise ≤
  55 px — inside the jump apex):
  - `{2250, y groundY−50, w 80, kind: 'ice'}`
  - `{2330, y groundY−105, w 80, kind: 'ice'}`
  - `{2420, y groundY−160, w 70, kind: 'ice'}` — the crest ledge, where
    **seed 2** sits (see the seeds section).
  The shelves are *ice*: a fast slide carries you off the back (fall to
  the floor — harmless, the point is the momentum is real). Flight is
  the comfort route to the crest.
- **Hearth B** at 2600 (the courtyard floor, in front of the cliff base):
  fetch the seed from the crest, drop down, plant it — one continuous
  beat.
- **The frozen wraith** in an ice block at 2750 (a wraith silhouette in
  the ice — the second mercy beat; released by hearth B).
- Box: 2300 star (at the wave's base, under the shelves).

### The long ice and the frostfall (2800–3800)

- **The long ice** (2800–3200, 400 px): the committed slide. A running
  start reaches the 1.3× slide in ~1 s (≈260 px); the gap ahead needs
  it. A **frost sprite** hovers at 2850 (see the enemies section).
- **The frostfall gap** (3200–3450, 250 px) — the level's traversal
  climax, three routes:
  1. **The slide**: from a full 1.3× slide, the jump carries ≈260 px —
     clean, one motion (the designed route).
  2. **The bridges**: two thin ice bridges in the gap (`{3240, w 40}`,
     `{3380, w 40}`): hop on (40 px), a 100 px running jump between them
     (clearable at run speed — the fallback for anyone who killed their
     slide), hop off (30 px). Slower, but walkable — no soft-lock.
  3. **Flight**: over, as always (the house comfort rule).
  A plain running jump from the lip (≈150–200 px) falls short — the gap
  is the level's one true speed gate, and the bridges are the honesty.
- **Box 2900 heart** (before the run-up), **3150 boots** (on the run-up —
  the pre-gap comfort: the boots' grip window is the anti-slide safety
  net; re-time it before the gap if you like).
- **Box 3500 mystery** (purple, swirled — one per level, the house
  rule), just past the gap, on the hall approach.
- The hall approach (3450–3800): the ice flattens, the palace wall
  closes in, and **seal 2** waits at the door (3800).

### The hall (3800–5200)

- The throne hall's interior: stone under a **frost film** (the overlay
  that thaws with the hearths — the hall's visual progress bar), tall
  arched **high windows** every ~300 px showing the thaw sky — at three
  thaws the peach dawn band is visible *inside* the hall (the payoff you
  walked toward).
- **The frozen figures** (five, world pass, no collision — the realm's
  slow sickness made visible: silhouettes caught mid-motion in matte
  blue ice): the queen's guard (4050), a scholar (4200), a couple
  (4650), a child (4750), an attendant (4900). They do nothing for the
  level; at the ending they crack, drip, and fade into the warm light
  (see the ending).
- **The frozen fountains** (two, 4100 and 4600): ice water sculptures
  (frozen splashes, 60×100) — the fountain at 650's siblings. At the
  ending they crack and flow.
- **Seed 3 — the frozen bird** at 4250: a small **robin** frozen mid-
  flight in an ice block (56×56) on a shelf `{4230, y groundY−124, w 60,
  kind: 'ice'}` (the block spans y groundY−180 → groundY−124). A warm
  glint in the ice every ~4 s (the bush pattern). **Arrow-only shatter**
  (any arrow, the L7 sigil rule — a jump-arrow's apex line passes the
  block's lower half; flight players shoot too): `crack`, 0.4 s shard
  burst, the bird **thaws** (0.5 s shake), **flies up and away** (1.5 s
  rising fade, despawns), and **drops seed 3** onto the shelf below
  (visible → pickup, or flight). (The robin returns at the ending — see
  there.)
- **Hearth C** at 4400 (the hall's center): plant → the third thaw →
  **seal 3** melts at 5200. After the third ignition the hall's frost
  film is gone and the dawn is in the windows — the interior has fully
  thawed before the player even reaches the throne.
- **Golem 2** patrols 3900–4200 (in the antechamber, before the bird's
  shelf — a fight in the hall's stone, the first non-ice floor of the
  level). Frost sprites at 4300 (band 4200–4450) and 4900 (band
  4800–5050).
- **Seal 3** at 5200 (`frostseal`): the throne door. Melts on hearth C.
  No re-lock — the hall stays an off-ramp behind the fight (the L6
  retreat-pocket rule).
- Boxes: 3950 gem (antechamber), 4700 star (mid-hall), 5050 heart (just
  before seal 3 — the pre-fight approach boon).

### The throne room (5200–6000)

- The glacier's heart: a vaulted ice ceiling (dark blue, a **vein of
  light** — a frozen spiral of time, a faint pulse; the vein traces a
  pendulum arc, the L8 Great Clock's echo: the Anchor's shadow in the
  Throne). The arena floor is **ice** (the whole room slides — see the
  arena note under the boss). The east wall (5950–6000) is glacier ice.
- **The dais** `{5620, y groundY−40, w 160, kind: 'dais'}` (5620–5780)
  with **the throne** on it: carved dark blue ice, 100×140, the vein of
  light through it. On the throne: **the Frost Queen, frozen mid-cast** —
  arms raised, an ice staff, the frost crown — her silhouette the level's
  visual goal, visible through the hall's high windows from 4400.
- **The King** stops at 5300 (just inside the door), stands facing her.
  He stays there until the ending (see the King section).
- **The gate beat** (one-shot, trigger band 5250–5400, fires on first
  entry `when: thaws === 3`), speaker **The Frost Queen** (her first and
  only voice before the ending — cold, a century's weariness):
  - "A hundred years I held the winter. A hundred years the ice held me."
  - "You have lit my fires and broken my seals. Then stand, little queen — and feel what a century of winter costs."
  → **the unfreezing**: big `crack` + shard burst + shake(8, 0.5), her
  frozen shell shatters (1 s), she **steps down** from the dais (0.5 s),
  `boss` sfx — the fight begins. Once begun she never re-freezes (the
  L7/L8 boss-entrance rule; the hall is the retreat pocket behind her).
- **Box 5400 heart** (pre-fight boon, in the arena, the L4/L6/L8
  pattern). No shield box (L8's was the mirror shield's final
  appearance — the house rule holds), no boots box (the arena is the
  last ice; flight is the escape).

## The thaw (signature mechanic)

`lvl.thaw = { thaws: 0, skyT: 0, rings: [{x: 950, t: 0}, {x: 2600, t: 0}, {x: 4400, t: 0}] }`
— a small honest state (the L8 clock pattern): `thaws` counts 0–3,
`skyT` is a 1.5 s lerp toward the palette index, each ring is a brazier's
melt anim (0 → 1 over 1.5 s, then settled).

### The sun seeds (the puzzle's keys)

Three warm amber seeds (16×16, a soft pulsing glow — the first warm
things the player touches; L5's relic pattern: +50, `relic` chime,
sparkle, one hide method each):

- **Seed 1 — the fountain** (650): any arrow (a ground arrow's chest-
  height line passes the column's band) shatters the frozen water column
  (0.4 s, `crack`, ice shards) → the seed falls to the pedestal top
  (0.3 s) → pickup by overlap. (The L7 sigil-block pattern, retinted:
  arrow-only wake.)
- **Seed 2 — the crest** (2420): sits on the wave-crest ledge — a
  standing pickup after the ice-shelf climb (or flight). The hide method
  is *height*, L5's branch-chain pattern retinted.
- **Seed 3 — the robin** (4250): inside the frozen bird (see the hall
  section) — arrow shatters the block, the bird thaws and flies off
  dropping the seed. The hide method is *a creature*, and the creature
  is the mercy beat (see below).

Pickup: overlap → held (removed from the world), +50, `relic`, sparkle.
Only the **next** brazier glints warm while a seed is held (the L6 glint
pattern; the sequential rule — the L3 one-key-one-door, strict): a seed
over a later brazier does nothing (a soft `pop`, the feedback). Planting
is overlap on the next brazier's base (auto-consumed — the key is
consumed at the door, no input).

### The hearths (the three braziers)

Iron braziers (48×56) on the floor at **A 950, B 2600, C 4400**, each
holding a **frozen flame** — a sculpted blue-white flame, still, a faint
cold shimmer. While hungry (seed held + it's next): a warm ember glint
inside the ice flame (the "plant me here" cue). **Ignition** (on
planting): the ice flame cracks (0.3 s, `crack`), the real flame rises
(0.8 s, `fire` sfx — the existing blip, played twice), a warm glow
radius 120 px (flicker, pure time function), and **the level warms** —
each ignition, in order:

1. **The hum rises a step**: the level's ambient is a deep frozen drone
   (55 Hz sine, very quiet, a pure time function) that rises **+6% pitch
   per thaw** (55 → 58 → 62 → 66) — the exact mirror of L8's hum
   dropping a step. Sparse **ice creaks** (seeded every ~7 s, `creak`,
   quiet — the ice is alive) stop at the third thaw (only the hum
   remains, warmer).
2. **The sky warms a shade** (`skyT` lerps 1.5 s to the new palette
   index — the 4-step dawn, see the art section): the player's progress
   is visible in the sky from anywhere, the level's progress bar.
3. **A frost ring melts**: a 140 px radius around the brazier over 1.5 s
   — the white frost film recedes (water-drip particles at the ring's
   edge) and **the ground kind inside the ring changes `ice` → `thaw`**
   (the ground-kind lookup: base kind, overridden by a settled ring). The
   slide is *a state the level can fix* — the hearths are tools against
   the ice, and the melted rings are the safe path back (a retreat that
   literally improves as you go).
4. **A frozen creature is released** (the mercy beats, one per hearth):
   - A (950): the **frozen hare** (block 880) cracks out, shakes (0.5 s),
     and runs east at 50 px/s (despawns past 1600) — the L7 frost hare's
     answer: this one is real, and it goes home.
   - B (2600): the **frozen wraith** (block 2750) sparkles free (`grant`
     chime, 1 s fade) — the L7 bound-wraith pattern, the same mercy.
   - C (4400): the **robin** already left with seed 3 — but the third
     thaw's release is the hall's: one **frozen figure** (the scholar,
     4200) cracks and drips, a pre-taste of the ending's release.
5. **A frost seal melts**: seal k (A → 1600, B → 3800, C → 5200) — see
   below. The path to the throne opens one door at a time.

No soft-lock: every seed is backtrack-reachable (the rings don't gate,
the seals only ever open), and every state has a reachable next hearth.

### The frost seals (door kind `frostseal`)

Full-height 40 px ice walls (palace gate 1600, hall door 3800, throne
5200), a dark seal glow at the hub (the L8 gear-door language). On the
matching ignition: the seal **cracks** (0.5 s — crack lines race down, a
`crack`), then **melts** (1.2 s — the wall slides down into the floor in
blue slabs, water-drip particles, a low `melt`), leaving a 20 px gap.
**No re-lock**: the hall and courtyard stay off-ramps (the L6 retreat-
pocket rule). All three are required to reach the Queen — the finale
keeps the full puzzle (the L8 required-spring rule, played at the
trilogy's scale), but the *seeds* are backtrackable, so no state is
stuck.

## Ice v2 (the full mechanic)

L7's ice spec stands (near-zero friction, 0.6× steering, 1.3× max
|vx|, momentum into jumps). L9 completes it:

- **The boots grip ice** (L9's teach — deferred from L7 by design): while
  the boots' 10 s window is active, `ice` behaves like `stone` (normal
  friction/steering/max). The boots boxes at 1200 (the teach) and 3150
  (the pre-gap comfort) are grip windows the player can re-time — the
  anti-slide safety net for the frostfall and the throne room.
- **`thaw` (new ground kind)**: wet stone — dark blue-grey, a water
  sheen, a receding frost edge where a ring settled, **normal friction**
  (it's what ice becomes, and it stays). Render-only difference from
  stone: the sheen + the ring's edge.
- **The frostfall gap** (3200–3450): the slide is the crossing (≈260 px
  from 1.3× speed), the bridges are the fallback (hop / 100 px run jump /
  hop), flight is the comfort. A running jump from the lip falls short —
  the level's one true speed gate.
- **Frost patches** (`lvl.frostPatches = []`, entries {x, w, t}): the
  golem's spit and the Queen's frozen breath **leave new ice** — an
  80–100 px ground-level film (14 px tall, a glossy sheen + glint, 6 s
  life, 1 s fade). While the player stands on one, ground friction
  switches to the `ice` behavior. Patches don't stack (a new patch
  within x±40 refreshes t). This is the boss's tool, not level geometry:
  the arena floor starts clean, and by phase 3 the Queen has made her
  own ice under the player's feet — the level's traversal language
  turned into a weapon. (The Queen herself is unaffected: her movement
  is her own velocity, no friction — noted so the build doesn't add it.)
- **The throne room is ice**: the whole arena slides — the player slides
  into and out of shockwaves (a new dodge language for the finale), the
  King's stop-point and the dais are the only non-ice in the room, and
  there is no boots box in the arena (the last is 3150 — the flight is
  the escape, the house rule one last time).

## The King (companion, not a mechanic)

The L8 rim-ledge silhouette, made present: the King **walks with the
player** from the spawn — a small warm-lit silhouette (a faint glow —
the horn; the first warm thing near the player) that drifts ~100 px
ahead at 200 px/s (never slower than the player, never ahead of a wall:
he waits at seals, never blocks — **no collision, no damage, no input**).
At 5300 (the throne room) he stops and stands facing the Queen until the
ending. Then he walks to the dais rim (5580 → 5620, a 0.4 s hop up),
raises the horn, and delivers the thaw beam (see the ending). A world-
path decoration with a 10-line state machine (walk / wait / stand /
raise / beam) — the story made walkable, the L7 cage-silhouette and the
L8 rim silhouette, resolved.

## The beats

Four beats total — the finale speaks rarely, and each voice once:

1. **The King's intro** (spawn, one-shot, frame 1): "The glacier keeps
   what she froze. Three fires slept here when she came. / Wake them, and
   the ice will tell you the way. I will meet you at her throne." (Sets
   up the hearths, the seals, the horn.)
2. **The Queen's gate beat** (throne band 5250–5400, `when: thaws === 3`,
   `onOpen`): "A hundred years I held the winter. A hundred years the ice
   held me. / You have lit my fires and broken my seals. Then stand,
   little queen — and feel what a century of winter costs." (The fight
   begins; the unfreezing plays behind the second line.)
3. **The Queen's last words** (the ending, as her dissolve begins):
   "The plague was a century gone. I froze the world to stop a ghost. / It
   is warm again, little queen. Let it stay warm." (The motive, the
   apology, the release — the tragedy lands in two lines.)
4. **The King's last words** (the ending, after the thaw beam):
   "The realm thaws. The winter is done. / Walk home, little queen. The
   realm is yours to keep — warm." (The arc closes: the L5 hook, the L7
   cage, the L8 shaft — all of it, answered.)

No hearth beats: the ignition's feedback is the level's body (the hum,
the sky, the melt, the seal) — the L8 "the world responds" rule, and the
finale's contrast with the chatty citadel: the ice doesn't talk, it
thaws.

## The Frost Queen (boss)

kind `queenboss`, spawn (5700, on the dais at y groundY−40), arena band
5400–5900 (the King stands at 5300, outside her band — she never crosses
him). 56×60, **24 hp**, **arrow-only** (stomp bounces off her ice — the
dragon rule), **pips in three rows of 8** (world space above the arena,
the spiderboss pattern — the first 3-row pip display: the finale's
scale). She is a *ground* boss (the Weaver's, the Warden's language —
lateral movement and spacing), but she is the **winter**, and the
fight's structure is the level's: **three thaws** — the player's three
fires become her three wounds.

### Structure

- **Frozen** (until the gate beat): the world-pass pose on the throne
  (arms raised, staff, crown, a faint blue glow). The gate beat fires →
  unfreezing (shell shatters 1 s, `crack` + shards + shake(8, 0.5)) →
  she steps down to the arena floor (0.5 s) → `boss` sfx → phase 1.
- **Thaw 1** (at 16 hp): `crack` + shard burst + shake(6, 0.4) + a 1.5 s
  pause; the ice on her shatters (the crown cracks, a shard falls — a
  world-pass state). **The level answers**: the hall's frost film steps
  down, a frozen figure in the hall cracks and drips (1 s, a pre-taste
  of the ending), the drone steps up. She emerges faster.
- **Thaw 2** (at 8 hp): the bigger burst (`crack` ×2 + `crumble` +
  shake(8, 0.5)); the crown shatters fully (a second shard falls); her
  glow shifts from cold blue to a **sickly pale** (the thaw-sickness —
  the phase-cue house pattern, played as illness, not power).
- **Death — the release** (at 0 hp): see below.

### Phases and attacks

**Phase 1 — the Winter Queen (24→16)**: 60 px/s lateral drift; idle
0.8–1.3 s; weights **bolt 40 / slam 35 / spike 25**:
- **Frost bolt**: aimed (the fireball pattern: 240 px/s, 14 px, 1
  damage, `fireball` sfx, retinted pale blue).
- **Glacier slam**: 0.5 s wind-up (crouch, staff planted, `creak`) →
  `thud` + shake(4, 0.2) → two radial **shockwaves** run the arena floor
  (180 px/s, 14 px, 1 damage, 2.5 s life, despawn at the arena ends
  5200/5950 — the troll pattern).
- **Ice spike**: a glint at the player's x for 0.6 s (the seal-column
  pattern, retinted) → a spike (20×140) rises in 0.3 s, stands 0.8 s,
  decays 0.5 s, contact 1 damage, `crack`. The spike x is **clamped to
  the arena band 5250–5900** (the L6 build-note rule: it can never rise
  outside the arena, and in the duel it still lands where the glint
  showed).

**Phase 2 — the Melting Queen (16→8)**: 90 px/s; idle 0.6–1.0 s; weights
**bolt 30 / slam 25 / spike 20 / breath 25**:
- **Double frost bolt**: a two-bolt spread (aimed ±10°).
- Glacier slam, ice spike: as phase 1.
- **Frozen breath** (the signature): 0.7 s telegraph (head down, frost
  gathering at the staff tip, a building `breath` sfx) → a **wide slow
  cone** (160 px reach, 1.0 s, 1 damage, pale blue — the L4 fire cone
  retinted) → **leaves a frost patch** (100 px wide, 6 s) on the ground
  under the cone's reach — the arena floor gains new ice where she
  breathed. The telegraph is the dodge; the patch is the memory of it.

**Phase 3 — the Dying Queen (8→0)**: **erratic bursts** (0.4 s moves at
120 px/s, 0.3 s stalls — a staggering drift, a woman losing her
 footing); idle 0.5–0.8 s; weights **breath 25 / bolt 25 / spike 20 /
blizzard 15 / slam 15**:
- **Double ice spike**: two glints, 0.4 s offset (the L6 volley rule,
  retinted).
- **Frozen breath**: as phase 2 — patches **accumulate** (they refresh,
  never stack): by the end of the phase the arena is half her ice, and
  the player's own footing is the last thing to thaw.
- **Blizzard** (the finale set-piece): 0.8 s telegraph (staff raised,
  the arena's frost lifts off the floor, `gust` sfx) → a **3 s
  blizzard**: dense falling flakes (cosmetic — a pure time function
  during the window, the flake layer at ×3 density) + a **gentle drift**
  push on the player (40 px/s, a seeded sine wobble, ground and flight —
  the L7 wind's echo, made local) + **three slow shockwaves** from her
  position (staggered 0.8 s, 140 px/s, 14 px, 1 damage). A pressure
  attack, not a trap: the arena is 750 px — flight to the far end or
  weave; the first wave is visible before the push matters (fairness
  first, the house rule).

**Stagger on hit** (house rule, all phases): 0.3 s pause + flash (a
frost-mist puff, `bossHit`) — the micro-window inside the duel. **Star
arrows** are full power (the house star rule); there is no shield in
L9 (L8's was the mirror shield's final appearance), so there is nothing
to reflect — the finale is dodge-and-aim, not mirror-play.

### Death — the release (the motif closes)

No burst, no rage, no shake-hold. In order:
1. She **stops**; the last crown shard **falls** (a 1 s slow drop, a
   soft `pop`).
2. The ice on her **shatters in a cascade** (2 s: shards fall away in
   waves, `crack` ×3 + `crumble` + shake(10, 0.8)) — the spell comes off
   her.
3. She **sinks to her knees** (0.8 s) — the century catching up: free of
   the spell that was her prison, she is mortal, and a hundred years is
   a hundred years.
4. She **dissolves into snow and light** (2.5 s: a slow rising sparkle of
   snow, a soft `melt` glissando 660→220 over 1.8 s — the level's name
   made audible). No corpse, no remains — the bound-creature motif,
   final note: the pig walked off, the wraiths sparkled free, the Warden
   bowed, **the Queen melts**. The throne is empty; the vein of light in
   the ceiling dims to nothing.
5. → the **ending state** begins (the King's horn — see below).

## New regular enemies

**Frost sprite** — 16×16 hitbox (drawn as a small snow spirit: a pale
blue glow with two trailing wisps, the wisps a pure time function),
**1 hp**, **arrow-only** (stomp passes through — the ghost rule),
contact 1 damage. Hovers around its anchor on a lazy **Lissajous drift**
(seeded amplitudes 30–50 px, the moth pattern — the living don't keep
time); when the player is within 140 px: **frost dart** (0.3 s at 200
px/s aimed at the player, a 14 px pale bolt, 1 damage, `fireball` sfx
retinted), 0.6 s hover, cooldown 3 s (seeded). New
`src/enemies/sprite.js`, self-registers. Roster (4): (2150, y 400, band
2000–2300), (2850, y 380, band 2750–3050), (4300, y 360, band 4200–
4450), (4900, y 380, band 4800–5050).

**Glacier golem** — 48×56 hitbox (drawn as a blocky golem of glacier ice
and grey stone, faint blue crack-glow in the seams), **3 hp**,
**arrow-only** (stomp bounces off the ice — the dragon rule; at 3 hp it
is a chunky target, not a stomp toy), contact 1 damage. Walks its band
at 30 px/s (turns at bounds, the slime shape). Attacks (range-gated:
spit only within 320 px, slam only within 200 px, otherwise it walks;
1.6–2.2 s cooldown between attacks, seeded): weights **slam 55 / spit
45**:
- **Slam**: 0.5 s wind-up (crouch, arms raised, `creak`) → `thud` +
  shake(3, 0.15) → two radial shockwaves (160 px/s, 14 px, 1 damage,
  2 s life — the troll pattern at golem scale).
- **Frost spit**: 0.6 s wind-up (head tips back, a blue bead builds,
  `spit` sfx) → an **arcing spit** (240 px/s horizontal, −180 px/s
  vertical, 18 px, 1 damage — the boulder arc, retinted) → on ground
  contact: a soft `thud` + a **frost patch** (80 px wide, 6 s) at the
  impact point (see Ice v2 — the spit makes the ground slippery where it
  lands; the golem teaches the patch before the Queen weaponizes it).

New `src/enemies/golem.js`, self-registers. Roster (2): (2000, band
1900–2150 — the courtyard, the first fight on open ice), (4050, band
3900–4200 — the antechamber, before the bird's shelf).

**No biome reuse** (the L5/L6/L7/L8 rule): no slimes, bees, snakes,
spiders, bats, ghosts, hares, wraiths, sentinels, or moths as active
fauna. The frozen hare/wraith/robin are mercy beats (world pass), not
roster.

## Dawn and ice — art, not mechanics

Four new zone kinds in `src/render/zones.js`:

- **`glacier`** (0–1600): the **thaw sky** — a 4-step palette driven by
  the thaw count with a 1.5 s lerp (`skyT`): step 0 frozen pre-dawn
  (indigo `#0e1230` → `#1c2342`), step 1 indigo-violet (`#141233` →
  `#2a2450`), step 2 mauve first-light (`#241a44` → `#4a3468`, a faint
  peach tint at the horizon), step 3 dawn (`#2c2250` → `#7a4a78`, a
  peach band `#e8a87c` at the horizon); the sun rim itself crests only
  at the ending (the game's first sun). **Stars** (~40, seeded, parallax
  0.05, slow twinkle) fade with the thaws (alpha 1.0 / 0.75 / 0.45 /
  0.15 — a pure read). The glacier's ice ground (pale blue-white
  `#dceef5`, glint streaks, crack lines), the **cloud shaft glow**
  behind the spawn (a swirling mist band, the L8 shaft's end point —
  the three-frame callback), the **palace silhouette** (parallax 0.2:
  a tall ice palace on the glacier's face — arches, spires, a faint blue
  glow — the visual goal), the **frozen sea line** (parallax 0.1, the
  horizon: a frozen wave band, still), **falling frost flakes** (two
  layers, pure time functions, a gentle fall; ×3 density during the
  blizzard window — a pure read of the boss state).
- **`palace`** (1600–3800): the courtyard — the **ice facade** (parallax
  0.3: a carved ice wall, frozen windows with a faint blue glow, frozen
  banners hanging still with a faint sway), the **frozen wave** set-
  piece (2300–2700: the great wave at its crest, ~200 px tall, the foam
  frozen white, the water a clear blue-green ice, the three shelves
  embedded in its face, the cliff dropping to the floor at 2700), the
  braziers, the long ice, the **frostfall gap** (the `crevasse` recolor
  — deep blue-black `#0a1220`, a faint glow at the bottom, a white ice
  lip at the surface) with the two thin ice bridges (crack lines —
  fragile-looking is *not* promised: they don't break; the house rule
  against implied mechanics).
- **`hall`** (3800–5200): the interior — stone under the **frost film**
  (a white overlay, alpha 0.25 → 0.18 → 0.12 → 0 with the thaws — a
  pure read: the hall's visual progress bar), walls `#1e2438`, the
  **high windows** (every ~300 px: the thaw sky visible through them —
  at three thaws the peach band glows *inside* the hall, the payoff),
  the **frozen fountains** (4100, 4600: ice water sculptures, frozen
  splashes 60×100), the **frozen figures** (five matte blue-ice
  silhouettes — the realm's slow sickness made visible; world pass, no
  collision), the brazier C, the throne door (5200, the `frostseal`
  with its dark seal glow).
- **`throne`** (5200–6000): the glacier's heart — the **vaulted ice
  ceiling** (dark blue `#0d1526`) with the **vein of light** (a frozen
  spiral of time, a faint pulse; the vein traces a pendulum arc — the
  L8 Great Clock's echo, the Anchor's shadow in the Throne; it dims to
  nothing at the Queen's release), the **dais + throne** (the dais
  5620–5780, snow-… no: ice-capped stone with a rim trim; the throne
  carved dark blue ice, 100×140, the vein through it), the **Queen's
  frozen pose** (arms raised, ice staff, frost crown — a world-pass
  silhouette), the **King** (a small warm-lit figure, a faint glow — the
  first warm light near the player), the arena floor ice (gloss, glint
  streaks), the east wall (5950–6000, glacier ice).

World pass (dressing, no collision), new `src/render/frostpalace.js`:
the **fountain** (the pedestal, the frozen water column intact →
shattered state, the seed's fall), the **braziers** (the frozen flame →
the lit flame: a 0.8 s flame-up, a flicker, the warm glow radius;
the hungry warm glint), the **ice blocks** (the frozen hare/wraith
silhouettes in the ice; the crack-out states), the **robin** (frozen in
its block → thaw + fly-away → the seed's drop; at the ending it returns
and perches on the throne rim), the **frozen wave + shelves**, the
**frozen figures** (their ending dissolve states), the **frozen
fountains** (their ending flow states: the crack, the water, the
2 s loop), the **seals** (sealed → crack lines → the melt-down), the
**throne + dais + vein of light**, the **King** (walk / wait / stand /
raise / beam states, the thaw beam's light band), the **palace facade +
banners** (the background pass), the **cloud shaft glow**, the frost
rings' water-drip edges, the frost patches (the glossy film + glint,
the fade).

Ground/platform kinds: **`ice`** (the L7 spec, + boots grip),
**`stone`** (reused), **`thaw`** (new: wet stone — dark blue-grey, a
water sheen, a receding frost edge, normal friction), **`dais`** (the
L7 spec, reused). Platforms: the fountain pedestal (dais), the wave
shelves ×3 (ice), the bird's shelf (ice), the bridges ×2 (ice, thin),
the throne dais (dais). Pits: the `crevasse` recolor (the L7 spec,
reused).

**No visibility penalty** (the L5–L8 fairness-first rule): the pre-dawn
is atmosphere, not a light-radius mechanic — every threat is visible in
every thaw state; the blizzard's flakes are ×3 density but sparse
enough that the telegraphs (the glints, the shockwaves, the staff
raise) read through them; the frost patches are glossy and lit, never a
hidden floor. The dawn is a *reward* for progress, never a hiding place.

## Loot boxes

Existing pool only, 12 boxes. No heartcap (owned), no shield (L8's was
the mirror shield's final appearance — the house rule holds), no bow
beyond the one safety box (the seed blocks need arrows).

300 **bow** (safety #1, the spawn shelf), 800 gem, 1200 **boots** (the
grip teach, before crevasse 1), 1800 gem, 2300 star (the wave's base),
2900 heart (before the run-up), 3150 **boots** (the run-up — the
pre-gap comfort window), 3500 **mystery** (purple, swirled — one per
level, the house rule), 3950 gem, 4700 star, 5050 heart (the pre-fight
approach), 5400 heart (pre-fight boon, in the arena).

## Enemies summary

- Frost sprites ×4 (1 hp, arrow-only, Lissajous + frost dart).
- Glacier golems ×2 (3 hp, arrow-only, slam + frost spit with patch).
- The Frost Queen (24 hp, three phases on three thaws, the release
  death).
- Mercy beats (world pass, not roster): the frozen hare (hearth A), the
  frozen wraith (hearth B), the robin (seed 3; returns at the ending).
- No fauna reuse from any earlier biome.

## Ending sequence (the `ending` state)

The `ending` state is a **new game state** (alongside 'playing' / 'win' /
'lose' in `src/game.js`): input is locked (the scene keeps rendering and
animating; only Space is live, at the card). It renders the level scene
in its thawed end-pose plus the card — the game's last image is the
level it just played, healed. On the Queen's release (step 4 of her
death):

1. **The horn**: the King walks 5300 → 5580 (1 s), hops onto the dais rim
   (0.4 s), raises the horn (0.8 s) → **the thaw beam**: a warm golden
   light band sweeps west → east across the whole level (3 s, a screen-
   space sweep + a parallax shimmer, `sunbeam` sfx — the existing three-
   ascending sines, the realm's thaw made audible).
2. **The level thaws** (staged over 4 s, with/after the sweep — all
   world-pass states, no new AI):
   - the sky **completes the dawn**: the sun rim crests the glacier's
     horizon (the game's first sun), the stars are gone;
   - the **frozen figures** crack, drip, and fade into the warm light
     (staggered 0.3 s, 2 s dissolves, a soft `grant` chime each — the
     realm's people, released from the sickness; the plague is long
     gone, and so are they — the L7 "slow sickness" thread, resolved);
   - the **frozen fountains** crack and flow (`splash` sfx, water
     particles, a 2 s loop);
   - the **frozen wave** cracks and **crashes** (`splash` + `rumble`,
     foam, the crest lowers 40 px, the sea band beneath it begins to
     move — a pure time function);
   - the **hearth flames rise** (taller, warmer, glow radius ×1.5);
   - the **robin** returns (flying in from the west) and **perches on
     the throne rim** (0.8 s settle) — the first warm color in the level
     is a bird, not a fire.
3. **The Queen's last words** (the ending's third beat — as her light
   rises): "The plague was a century gone. I froze the world to stop a
   ghost. / It is warm again, little queen. Let it stay warm." Her light
   rises and is gone.
4. **The King's last words** (the fourth beat): "The realm thaws. The
   winter is done. / Walk home, little queen. The realm is yours to keep
   — warm."
5. **The end card** fades in (1.5 s): **"THE REALM THAWS"** (the title
   card), subtitle "The Unicorn Queens walk home.", the **score** (the
   HUD's running total, the L1 flag pattern's payoff), and "Press Space
   to play again". Behind it: the dawn palace — the sun, the flowing
   fountains, the perched robin, the last flakes (the flake layer at low
   density — snow giving way to thaw).
6. **Space** → full run reset → **level 1** (a true new game: no carry —
   no bow, no flight, small, maxHp back to the L1 default; the L7
   rainbow's "no next level" loop, given a real face instead of the
   overlay).

## New systems (input to the phased plan)

1. Level 9 data (`createLevel9`) + `LEVELS` registration (index 8,
   `carry: { hasBow, hasFlight }`)
2. Zones `glacier`/`palace`/`hall`/`throne` (the 4-step thaw sky + `skyT`
   lerp, the stars' fade, the palace silhouette, the facade, the frozen
   wave, the high windows, the vein of light, the shaft glow) + ground
   kinds `ice`/`thaw` + the frost film + the world pass
   (`src/render/frostpalace.js`)
3. Ice v2 (the L7 spec + **boots grip ice** + the `thaw` ring conversion
   in the ground-kind lookup + the frostfall gap + the bridges + the
   **frost patch** entities: 6 s life, the player-only ice friction, no
   stacking)
4. The sun seeds (the three hide methods: the fountain shatter / the
   crest climb / the robin block + fly-away drop) + pickup (+50, `relic`)
   + the brazier planting (sequential, the warm glint cue, auto-consume)
5. The hearths (the ignition: the flame-up, the `fire` ×2, the glow;
   the hum's +6%/thaw, the creaks' stop at 3, the `skyT` lerp, the
   frost-ring melt anim + water drips, the hall-film step, the creature
   releases) + the **frost seals** (door kind `frostseal`: crack 0.5 s →
   melt 1.2 s, the retreat pocket)
6. The King's companion (walk / wait / stand / raise / beam; no
   collision, no damage) + the four beats (the King's intro, the Queen's
   gate beat + the unfreezing, the last two)
7. Frost sprite + glacier golem (the dart; the slam + the frost spit +
   the patch)
8. The Frost Queen boss (`src/enemies/queenboss.js`: the frozen pose →
   the unfreezing → the step-down; three phases + the two thaw bursts
   (the level's answers: the film step, the figure's drip, the drone
   step); bolt/double, glacier slam, spike/double, the frozen breath +
   patch, the blizzard (the flake ×3, the 40 px/s drift, the three slow
   waves); the erratic P3 bursts; the 3-row pips; the stagger; the
   **release death**)
9. The `ending` state (the new game state: input lock, the scene's
   end-pose render) + the ending sequence (the King's walk + horn, the
   thaw beam, the level-wide thaw states — the sun rim, the figures'
   fade, the fountains' flow, the wave's crash, the flames' rise, the
   robin's perch — the last two beats, the end card, Space → level 1
   full reset)
10. FX + audio: new `melt` (a descending sine glissando 660→220, 1.8 s
    — the Queen's dissolve + the seals' melt), `splash` (a short filtered
    noise burst 0.4 s + a low sine plink 400→200 — the fountains/wave);
    reuses `crack`, `crumble`, `growl`, `thud`, `rumble`, `deflect`,
    `seal`, `gate`, `relic`, `bossHit`, `fireball`, `boss`, `hurt`,
    `land`, `grant`, `gust` (L7), `creak`, `fire`, `spit`, `sunbeam`,
    `pop`, `puff`
11. Tests + render snapshots + headless full playthrough

## Phased build (one subsystem per turn, tests + smoke green after each)

1. **M1** level data + zones (thaw sky at step 0, stars, the silhouette,
   the facade, the vein) + all ground/pit kinds + the bridges + the
   boxes + the world pass (the fountain intact, the wave + shelves, the
   braziers frozen, the seals sealed, the throne + the frozen Queen, the
   King's companion static at the spawn, the frozen figures/fountains)
   + the L7 ice physics — walkable end-to-end to the throne door (flight
   over the crevasse and the gap); no seeds, hearths, enemies, or boss
2. **M2** the sun seeds (the three hide methods, the shatters, the
   +50 pickups) + the hearths (the planting, the ignition: the flame, the
   hum step, the `skyT` lerp, the frost-ring melt + the `thaw` ground
   conversion, the hall-film step) + the frost seals (crack → melt, the
   retreat pocket) — the full puzzle, no enemies/boss (the throne door
   opens at three thaws; the Queen remains the frozen decoration)
3. **M3** the mercy beats (the hare's crack-out + run-off, the wraith's
   sparkle-free, the robin's thaw + fly + drop, the scholar's drip at
   thaw 3) + the King's companion (walk / wait / stand) + the frost
   sprite + the glacier golem (including the frost spit + the patch
   entities)
4. **M4** the beats (the King's intro, the Queen's gate beat + the
   unfreezing + the step-down) + the boots grip ice — the Queen is a
   static placeholder until M5
5. **M5** the Frost Queen, phase 1 (the movement, the frost bolt, the
   glacier slam, the ice spike (clamped), the stagger, the 3-row pips)
6. **M6** the boss, phases 2–3 (the two thaw bursts + the level's
   answers, the double bolt, the frozen breath + the patches, the double
   spike, the blizzard (flakes ×3, the drift push, the three slow waves),
   the erratic bursts, the tempo)
7. **M7** the release death (the shard fall, the cascade, the knees, the
   dissolve, the `melt`, the vein's dim) + the `ending` state + the
   ending sequence (the horn, the beam, the level-wide thaw, the last
   two beats, the end card, Space → level 1)
8. **M8** polish: headless playthrough (spawn → the King's beat → seed 1
   (the fountain) → hearth A (the hare, seal 1) → crevasse 1 → seed 2
   (the shelves) → hearth B (the wraith, seal 2) → the long slide → the
   frostfall (slide or bridges) → the hall → seed 3 (the robin) → hearth
   C (seal 3) → the gate beat → the fight (three phases + two bursts) →
   the release → the ending → the end card → Space → level 1), scripted
   ice/thaw tests (the boots grip window, the ring conversion, the patch
   friction + no-stack, the `skyT` lerp, the hum pitch), final
   snapshots, README level list (the level 9 entry + the "the end" note)

## Decisions (all confirmed)

1. **Theme C as level 9**: glacier → frozen palace → throne hall →
   throne room; title **"The Frozen Throne"**; 6000 px; four zones. The
   trilogy closes: L9 breaks the **Throne**, and the level ends in the
   dedicated `ending` state (the L7/L8 "no `ending` state" deferrals,
   resolved).
2. **The thaw is the signature**: three sun seeds (relics, +50, one hide
   method each — the fountain shatter / the crest climb / the robin
   block) planted sequentially in the three braziers (overlap-plant, the
   warm glint cue, auto-consume — the L3 one-key-one-door, strict). Each
   ignition: the hum rises a step (55 Hz drone, +6% per thaw — the L8
   mirror), the sky warms a shade (a 4-step dawn, `skyT` 1.5 s lerp, the
   stars' alpha fade), a 140 px frost ring melts (`ice` → `thaw` ground),
   the hall film steps down, a frozen creature is released, a frost seal
   melts. The level heals around you — the L8 wind-down's emotional
   inverse.
3. **Ice v2**: the L7 spec stands; L9 adds **boots grip ice** (the
   boots' 10 s window = a grip window — the deferred L7 teach), the
   **`thaw` ground kind** (wet stone, normal friction, the ring
   conversion), the **frostfall gap** (250 px: the slide ≈260 px is the
   crossing, the two 40 px bridges are the fallback — hop / 100 px run
   jump / hop, flight the comfort; a running jump from the lip falls
   short — the level's one true speed gate), and **frost patches** (the
   spit/breath leave 6–8 s ground ice, player-only friction, no stack —
   the boss's tool, the golem's teach).
4. **The three frost seals** (door kind `frostseal`: palace gate 1600 /
   hall door 3800 / throne 5200): sealed → on the matching ignition, crack
   0.5 s → melt 1.2 s (`crack` + `melt`), a 20 px gap, **no re-lock** (the
   retreat pocket). All three required to reach the Queen (the L8
   required-spring rule at the trilogy's scale); the seeds are
   backtrackable — no soft-lock.
5. **The Frost Queen**: 56×60, 24 hp, arrow-only (stomp bounces — the
   dragon rule), **three rows of 8 pips** (the first 3-row display),
   three thaws at 16 and 8 (the burst + the 1.5 s pause + the level's
   answers: the film step, a figure's drip, the drone step — the
   player's three fires become her three wounds). Phase 1 (60 px/s,
   idle 0.8–1.3): bolt 40 / slam 35 / spike 25. Phase 2 (90 px/s, idle
   0.6–1.0): double bolt, + the **frozen breath** (the cone leaves a
   patch; breath 25). Phase 3 (erratic 120 px/s bursts, idle 0.5–0.8):
   double spike, the **blizzard** (0.8 s telegraph → 3 s: the flake ×3,
   the 40 px/s drift push, three slow 140 px/s waves staggered 0.8 s — a
   pressure attack, not a trap), patches accumulate. The 0.3 s stagger
   (house rule). No shield in L9 (L8's was the final appearance) — the
   finale is dodge-and-aim, not mirror-play.
6. **The release death, not a kill**: at 0 hp — the stop, the last crown
   shard's 1 s fall, the 2 s cascade shatter (`crack` ×3 + `crumble` +
   shake(10, 0.8)), the knees (0.8 s), the 2.5 s dissolve into snow and
   light (`melt` glissando) — no corpse, no burst, no rage. The motif
   closes: the pig walked, the wraiths sparkled, the Warden bowed, the
   Queen melts.
7. **The `ending` state** (new, alongside playing/win/lose): input
   locked, the scene renders its thawed end-pose; the King's horn + the
   3 s thaw beam (`sunbeam`), the level-wide thaw (the sun rim crests —
   the game's first sun — the figures crack/fade, the fountains flow,
   the wave crashes, the flames rise, the robin perches on the throne
   rim), the last two beats, the end card ("THE REALM THAWS" / "The
   Unicorn Queens walk home." / the score / "Press Space to play again"),
   Space → full reset → level 1 (a true new game: no carry).
8. **The King's companion**: the L8 rim silhouette resolved — he walks
   ~100 px ahead of the player (200 px/s, never slower, waits at seals,
   **no collision, no damage, no input**), stops at 5300 facing the
   Queen, and at the ending hops the dais and raises the horn. Four
   beats total, each voice once: the King's intro (the setup), the
   Queen's gate beat (the fight begins), the Queen's last (the apology —
   "I froze the world to stop a ghost"), the King's last (the arc
   closes). No hearth beats — the ice doesn't talk, it thaws (the L8
   "the world responds" rule).
9. **Regular enemies**: frost sprite ×4 (16×16, 1 hp, arrow-only — the
   ghost rule, the Lissajous + the 140 px frost dart, 3 s seeded
   cooldown) and glacier golem ×2 (48×56, 3 hp, arrow-only — the stomp
   bounces, the slam + the frost spit that leaves a patch — the golem
   teaches the patch before the Queen weaponizes it); no biome reuse —
   the frozen hare/wraith/robin are mercy beats, not roster.
10. **The mercy beats are the fauna**: the frozen hare (880, hearth A —
    cracks out, runs east, despawns past 1600), the frozen wraith (2750,
    hearth B — sparkles free, 1 s fade), the robin (the 4250 block — the
    arrow's mercy: it thaws, flies off dropping seed 3, and returns at
    the ending to perch on the throne rim — the level's first warm color
    is a bird, not a fire). The thaw is who the level is for.
11. **The dawn, not the night**: the sky is a pure read of the thaw
    count (frozen pre-dawn indigo → violet → mauve → dawn peach; the
    stars fade 1.0 → 0.15; the sun rim only at the ending) — the palette
    break from L7's starlit night and L8's twilight; the hall's high
    windows show the dawn breaking *inside* as the thaws land. No
    visibility penalty (fairness first): the blizzard is pressure, not a
    hide — the telegraphs read through the flakes; the patches are glossy
    and lit; the dawn is a reward, never a hiding place.
12. **Loot**: 12 boxes — 300 **bow** (safety), 1200 + 3150 **boots** (the
    grip teach / the pre-gap comfort window), 5050 + 5400 heart (the
    pre-fight approach / the arena boon), 2300 + 4700 star, 800 + 1800 +
    3950 gem, 2900 heart, 3500 **mystery** (one per level). No heartcap
    (owned), no shield (L8's was the final appearance), no bow beyond the
    safety box.
13. **The arena is ice**: the whole throne room slides — the player
    slides into and out of shockwaves (the finale's dodge language), the
    King's stop-point and the dais are the only non-ice, no boots box in
    the arena (the last is 3150 — the flight is the escape, the house
    rule one last time); the Queen's movement is her own velocity (she
    is unaffected by the patches — noted for the build).
14. **The trilogy holds**: L9 breaks the Throne; the bound-creature
    motif ends (pig released 7, Warden rested 8, Queen brought down 9 —
    all mercy, nothing destroyed on camera); the King's horn — the
    realm's last thaw, the L5 hook — pays off in the ending; the realm's
    slow sickness (the frozen figures) resolves (they fade into the warm
    light — the plague is long gone); the game ends (the `ending` state,
    Space → a new game from level 1).
