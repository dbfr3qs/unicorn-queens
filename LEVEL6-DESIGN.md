# Level 6 design — "The Blackmire"

Status: CONFIRMED (all 14 decisions; plan in `LEVEL6-PLAN.md`).

## Concept

The mist gate spits the player out **not at the peak but below it** — into a
valley at the foot of the snow-topped mountain that the wizard's dark magic
has curdled into a swamp: the **Blackmire**. It is the game's first
genuinely *scary* level: sickly green-black gloom, a pale moon, drifting
fog, fireflies, dead cypress silhouettes — and the mountain looming large in
the background, with the wizard on his flying pig crossing its face every
so often (a small background easter egg, a reminder of who is behind all
this). The pass up the mountain is sealed by an **old winch and its stone
bridge**, built by the mire's first weavers (a heron, an adder, a spider
queen). **Three cogs** are lost in the mire; setting them in the winch's
runes lowers the bridge and melts the web wall that seals the **spider
hollow**, where the wizard's beast — the **Weaver Queen**, a giant spider —
guards the way up. Kill her, take the pearl from her altar, and the exit
arch (a stairway climbing toward the peak) opens.

The mountain itself is **level 7** (the wizard's lair, the flying pig, the
kidnapped King — the real finale). Level 6 is the last *journey* level:
collect + puzzle + one more boss, then the peak.

Carried in: bow, big, maxHp (4), hasFlight — all permanent.
`LEVELS[5] = { name: 'blackmire', make, carry: { hasBow: true, hasFlight: true } }`.

### Why this one is more interesting

- **The mire wakes**: the level visibly responds to progress — a dormant
  mud vent starts burbling when socket 1 fills, a sleeping elder adder
  stirs when socket 2 fills and the egg sac spins into being, the dead
  winch's wheel starts turning after the third cog. The swamp feels alive,
  not just walkable.
- **A status effect, not just damage**: the boss's web glob applies
  **web-slow** (speed ×0.45 for 2.5 s). Every hit in the game so far is
  plain damage; this makes fights about *mobility*, and flight is the
  designed escape (the slow binds the legs, not the wings).
- **A ground boss**: the dragon hovers; the Weaver Queen *crawls* — a
  telegraphed lunge, aimed spit, and a **web pillar** that rises at your
  feet (zone control). The dodge language is lateral movement and
  spacing, not vertical.
- **The winch is a machine, not an NPC**: L5's hub was the Queen; L6's hub
  is a dead stone wheel with engraved runes — same beat-driven structure,
  different soul. The puzzle is a key chain ×3 (the L3 key→door pattern,
  iterated), with the beats giving poetic directional hints ("the mud in
  the east is burbling").
- **Three different hiding mechanics again**, each a mini-puzzle:
  shoot-a-web (nest), time-a-bubble (vent), crack-a-sac under guard (altar).
- **Vertical pressure in a ground level**: small spiders hang on threads
  from webs overhead and pounce — the bat's territory, re-tooled as an
  ambush, contrasted with the ground-hugging snakes.
- **A retreat pocket**: the bridge is an off-ramp from the fight — you can
  back out across the pit, breathe, and re-enter. Boss arenas in this game
  have been sealed rooms; this one has a door that stays open.
- **The easter egg**: every ~40 s the wizard on his flying pig crosses the
  mountain sky (pure time function, small and dim). Story callback, zero
  mechanics.

## Layout (left → right, 6800 px wide, view 800×600, groundY 560)

```
x:    0    400   1100  1450  1900  2300        4600  5500  5800   6800
      ┌──────┬─────────┬─────┬────────┬───────┬───────────────┬───────┬──────────┬─────────┐
      │ARCH  │ HERON   │POOL │ MARSH  │ POOL  │ MARSH EAST +  │ WINCH │ PIT +    │ SPIDER  │
      │      │ GROVE   │logs │ west   │ VENT  │ DEAD FERN     │ TEMPLE│ BRIDGE   │ HOLLOW  │
      │ 60   │ nest    │     │        │ 2100  │ GROVE         │ 4900  │ 5500–5800│ boss    │
      │      │ 950     │     │        │       │ sac 4300,     │       │ webwall  │ 6100,   │
      │      │         │     │        │       │ elder 3900    │       │ 5800     │ altar   │
      │      │         │     │        │       │               │       │          │ 6400    │
      └──────┴─────────┴─────┴────────┴───────┴───────────────┴───────┴──────────┴─────────┘
```

Zones: `{0–400: 'miregate'}, {400–3800: 'mire'}, {3800–6800: 'mire-deep'}`.

Ground / water (water = the lava render with the `water` recolor from L5;
falling in = 1 damage + respawn at last safe ground, the existing pit rule):

```
ground: 0–400 ('stone') | 400–1100 | 1450–1900 | 2300–5500 (marsh east + winch temple) | 5800–6800
water:  1100–1450 (350, log crossing) | 1900–2300 (400, the vent) | 5500–5800 (300, the bridge pit)
```

### The arch (0–400)

- Dark stone wall (the `hall` purple stone) with a **stone arch at 240–420**
  through which the mire gloom is visible — the inverse of L5 (darkness
  through the arch instead of sunlight). Ground kind `stone`, player spawns
  at x 60.
- **Intro beat** (one-shot, rect 40–240, fires on frame 1), speaker
  "The Old Winch" (a whisper):
  - "The mist gate spat you out below the peak, not on it — in the mire the wizard's shadow blackened."
  - "The pass up the mountain is sealed: an old winch, a stone bridge, a wall of web."
  - "Three cogs are lost in the mire — the heron's, the adder's, the weaver's. Set them in the runes, and the bridge will remember how to fall."
- **Safety bow box at 500** (ground, stomp-breakable): a death-restart drops
  the carried bow, and the nest web and the bubble both need arrows.

### The heron grove (400–1100)

- Dead cypress silhouettes, the **great cypress at 950** (tall black trunk
  to y 150). **The nest** (platform kind `nest`, 60 wide) sits on top at
  y 170, wrapped in web.
- **Cog 1 — the heron's cog** (bone-white, feather engraving), in the nest
  at (1022, 154). Reach: root chain `{780, y 440, 90}` → `{900, y 350, 90}`
  → `{1010, y 250, 90}` (each rise 100/100 — inside the 130 jump apex),
  then an in-place short hop onto the nest, which sits directly above root
  3's west edge (a full jump overshoots it); or flight.
- The **nest web is shootable**: any arrow (stars too) → the web unravels
  (puff + `pop`), the cog appears in the nest and is pickable. The web
  glints white every ~4 s (seeded, the bush pattern) — the "something is in
  here" cue.
- Boxes: 750 gem, 1180 star (on the log at 1150). Snake (650, band
  500–1050). Spider thread at 800.

### The pools (1100–1450, 1900–2300)

- **Pool 1** (350): log crossing `{1150, y 554, 80}`, `{1310, y 554, 80}` —
  80/60 px gaps, plain jumps.
- **Pool 2** (400): the **mud vent** at 2100, mid-pool (a stone rim in the
  water). Lily pads `{1950, y 554, 70}`, `{2210, y 554, 70}` flank it.
- **Cog 2 — the adder's cog** (copper, serpent-eye engraving), inside the
  vent's **bubble**: when the vent is active (socket 1 filled — see the
  winch), the mud burbles and a 36 px bubble with the cog visible inside
  rises from the water (~1.2 s) to y ≈ 480, bobs there ~5 s, sinks back,
  and the cycle repeats every ~10 s. **Shoot the bubble** while it's out of
  the water → pop + `puff` → the cog stays floating at the pop point
  (soft bob) and is pickable from the lily pads (a standing jump reaches
  it) or flight. The vent is **dormant until socket 1 fills** (a visible
  but silent rim — a curiosity hook for early explorers; when it wakes,
  the first burble plays `puff` and the winch's w2 beat points east).

### The marsh east + dead fern grove (2300–4600)

- The densest mire: darker band from 3800 (`mire-deep`), bigger dead ferns,
  webs strung between cypress trunks (dressing).
- **The elder adder** (a 3 hp snake, 44×26) **sleeps coiled** on the ground
  at 4150. When socket 2 fills (and the egg sac appears) she stirs (`slither`)
  and patrols 3550–4450 — the guardian wakes with her prize.
- **The altar** (platform kind `altar`, a mossy stone dais 150 wide, top
  at y 520) at 4250. **Cog 3 — the weaver's cog** (black-purple, web
  engraving) inside an **egg sac** (28×24, web-wound, on the dais at
  (4310, 496)): **absent until socket 2 fills** (a faint glint marks the
  empty altar), then it spins into being (web puff + `spin`). Pop it: a
  stomp **or** an arrow cracks the sac → `pop` + the cog drops onto the
  dais, pickable. The elder adder makes the approach a small fight, not a
  walk-past (she can be skipped: the sac pops from a jump-arrow).
- Boxes: 2400 magnet, 3000 sunbeam (clears snakes/spiders on screen — the
  deep-mire comfort), 3400 boots, 4000 hops, 4450 mystery.
- Snakes: (1600, 1500–1900), (2500, 2400–3100), (3300, 3200–3600), (4100,
  4000–4450). Spiders (threads): 1850, 2250, 2900, 3750, 4400.

### The winch temple (4600–5500)

- A sunken temple: broken columns at 4700 and 5400, mossy blocks, the
  **winch** at 4900 — a 120 px stone wheel on a stone beam, hub with three
  socket notches, a counterweight. While dead it is still; after the third
  cog its wheel turns slowly forever (pure time function — "the old machine
  is awake").
- **The winch's beats** (proximity rect 4780–5080, speaker "The Old Winch"):
  - `w0` — `repeat`, `when: sockets === 0 && !cog0.taken`:
    "Three runes: the heron, the adder, the weaver." / "The first is cold. The heron's cog hangs in the webbed trees to the west."
  - `w1` — once, `when: sockets === 0 && cog0.taken`, **`onOpen`** (socket 0 fills, `gear` + `rumble`, the rune glows):
    "The heron's cog turns. The wheel remembers the first weaver."
  - `w2` — `repeat`, `when: sockets === 1 && !cog1.taken`:
    "The second rune stirs: the adder's eye. The mud in the east is burbling."
  - `w3` — once, `when: sockets === 1 && cog1.taken`, **`onOpen`** (socket 1 fills; the vent wakes):
    "The adder's cog turns. The water remembers."
  - `w4` — `repeat`, `when: sockets === 2 && !cog2.taken`:
    "The last rune: the weaver's web. An egg sac waits on the old altar in the fern grove — and its guardian is waking."
  - `w5` — once, `when: sockets === 2 && cog2.taken`, **`onOpen`** (socket 2 fills, the wheel starts turning, `rumble` + `creak`: the bridge lowers, the web wall melts away):
    "All three cogs turn. The old bridge groans down — the pass is open."
- The chain is **sequential**: cog N can only be picked up once socket
  N−1 is filled (the hiding spot is gated — dormant vent, absent sac). No
  soft-lock: every state has exactly one next cog, and the beats say where.
- Boxes: 5200 **bow** (safety #2: a restart drops the bow; the sac can be
  stomped but the web and the bubble need arrows), 5350 heart.

### The bridge and the web wall (5500–5800)

- **The bridge pit** (300 px of water). **The bridge** (platform kind
  `bridge`, a 300 px timber span at y 554): raised (a vertical slab at the
  west bank) while the winch is dead; on `w5`'s `onOpen` it lowers over
  ~1.2 s (`creak`), then stays down. A plain jump or flight also clears
  the 300 px pit — the bridge is comfort and spectacle, not the gate.
- **The web wall** at 5800 (40 px wide, full height, `lvl.door` with a
  `kind: 'webwall'` flag): the real gate — solid while sealed (the
  existing resolveDoor wall pattern, no `noKey`, so nothing opens it but
  the winch), a dense white web lattice with a slow shimmer. On `w5` it
  melts away over ~1.5 s (the shaft-retract pattern) with `spin` + a
  `seal` chime.

### The spider hollow (5800–6800)

- The arena: flat ground, the web wall behind (west), overhead webs
  between dead trunks, a darker fog band. **No enemies but the boss**
  (the arena is its own ecosystem).
- **The Weaver Queen** at 6100 (patrol band 5900–6650) — see the boss.
- **Her altar** (kind `altar`, 120 wide, 40 tall) at 6400. When she dies,
  the **pearl** appears on it (the L2/L4 pearl pattern: `showWhen` = boss
  dead). Taking the pearl breaks the exit seal (`seal` chime, the
  pearl.js logic unchanged).
- **The exit** at 6680: a stone arch (the entry-arch styling) with a
  **stairway climbing out of frame toward the peak** visible beyond it —
  snow on the steps, the mountain face lit by the moon. Sealed (dim, faint
  seal glow) until the pearl; then it brightens (the mistgate pattern).
- Box: 5950 heart (pre-fight boon, visible on the approach — the L4 hall
  pattern).

## The cogs and the winch (the puzzle)

`lvl.cogs = [{ id, x, y, w: 16, h: 16, taken, stage }]` — stage 0/1/2 is
the socket that must be filled before the cog exists (stage 0 from the
start). `lvl.winch = { x: 4900, sockets: [false, false, false], turning: false }`.
`lvl.vent = { x: 2100, active: false, bubbleT: 0, popped: false }`.
`lvl.sac = { x: 4310, present: false, popped: false }`.

- Pickup = overlap when the cog's stage is satisfied and it has been
  revealed (web shot / bubble popped / sac cracked): `taken`, `relic` chime
  (reused), sparkle burst, **+50 score** (the relic pattern).
- A cog is **consumed by the winch** on install (the beat's `onOpen`):
  socket fills, the cog's sprite moves into the hub notch, the HUD counter
  ticks.
- **HUD**: the L5 relic counter generalizes — three cog icons top-center
  (distinct sprites: bone / copper / black-purple), filled = sockets set.
- The install beats (w1/w3/w5) fire on approach with the cog in hand —
  same auto-open feel as the L3 door.

## The Weaver Queen (boss)

72×56, **16 hp**, **arrow-only** (stomp bounces the player off, no damage —
the dragon rule), 16 pips in two rows. She is a *ground* boss: she crawls
toward the player at 60 px/s when idle (the arena is her floor), and her
attacks are telegraphed and dodgeable with lateral movement or flight.

- **Lunge**: crouch telegraph 0.5 s (web-tremor lines + a low `slither`) →
  straight dash toward the player's position at fire time, 380 px/s, up to
  260 px, then a 0.6 s recover. Contact = 1 damage.
- **Spit**: an aimed web glob (the fireball pattern: 240 px/s, 14 px,
  aimed with the mage's lead) → 1 damage + **web-slow**.
- **Web pillar**: a glint appears on the ground at the player's x (0.6 s
  telegraph) → a 40×140 web column rises and stands 0.8 s, decays 0.5 s.
  Contact = 1 damage + web-slow. Forces you off the spot; it also blocks
  arrows (shoot the pillar? no — it's decorative-solid: it just hurts).
- **Egg volley** (phase 2): a three-egg fan, slow arcs (the boulder
  pattern, retinted white), 1 damage each, no slow.
- **Phases**: phase 1 (16→9): lunge 40 / spit 35 / pillar 25, idle tempo
  1.0–1.5 s. Phase 2 (≤8): lunge 30 / spit (double) 30 / pillar 25 / egg
  volley 15, idle tempo 0.7–1.1 s.
- **Stagger on hit** (the dragon's `onHit`), flash, brief pause — the
  attack window.
- **Death**: big burst + low `growl` + shake(9, 0.6) → the pearl appears
  on the altar (`showWhen: enemies => !boss alive`).
- New file `src/enemies/spiderboss.js`, self-registers (the enemy-registry
  pattern); web pillars and eggs ride small module-owned arrays (the
  projectiles.js pattern).

**Web-slow** (new player status, the level's signature mechanic):
`p.webT` seconds; while > 0, walk/air-drift speed ×0.45, a faint web wraps
the sprite and a web-trail particle drags behind. **Flight is unaffected**
(S is the escape — the slow binds the legs, not the wings). Applied by the
boss's spit and pillars (2.5 s). No other enemy applies it.

## New regular enemies

**Snake (adder)** — 26×24 hitbox (drawn as a low arch that rises on the
telegraph), **1 hp**, stompable and arrow-killable, contact = a bite. The
hitbox is 24 tall, not 12: chest-height arrows fly no lower than
groundY−24, so a 12 px flat body could never be arrowable from the ground.
Slithers on the ground (x patrol, sine body wiggle — the slime's roaming
shape, longer and lower). When the player is within 200 px and the
cooldown (4 s, seeded) is done: **strike** — a 0.25 s head-raise telegraph
(`slither`, a high hiss), then a 120 px horizontal lunge at the player,
then ease back. New `src/enemies/snake.js`, self-registers. Roster (5):
650 (500–1050), 1600 (1500–1900), 2500 (2400–3100), 3300 (3200–3600),
4100 (4000–4450).

**Elder adder** — the snake's 3 hp big sister (44×26): same AI, 180 px
strikes, 6 s cooldown, a slower crawl. Starts **asleep** (coiled, no AI)
at 4150; wakes (a `slither` stretch) the moment the egg sac appears.
Roster: 1.

**Spider (small)** — 20×22 hitbox (drawn as a ~16 px body + legs; the
confirmed design said 20×14, but a 14 px spider resting on the ground —
top 546 — is unreachable for a chest-height arrow whose hitbox bottom is
540, and no level platform puts a ground-level arrow in a hanging spider's
band either, so 22 px is the smallest height that keeps "arrow-killable"
true for a landed spider), **1 hp**, stompable and arrow-killable. Each
spider has a **web anchor** (a point on an overhead web, y ≈ groundY−150):
it hangs on its thread (a 1 px line, a gentle sway) — an elevated threat a
standing jump can reach (the thread's low point sits at jump-stomp height;
a hanging spider is a stomp target, a landed one an arrow target). When the
player is within 220 px horizontal (and below the thread, on solid ground)
and the cooldown (3.5 s, seeded) is done: **pounce** — an arced leap at the
player's position (0.7 s air time, readable, dodgeable by standing still or
stepping aside; a pounce aimed at the water ends in a splat); it lands,
recovers 0.5 s, and climbs back to its thread. Roster (6): 800, 1850, 2250,
2900, 3750, 4400. New `src/enemies/spider.js`, self-registers.

No slimes, bees, bats, or ghosts — mire fauna only (the L5 rule: castle
creatures stay in the castle; the forest's stay in the forest).

## Dark and scary — art, not mechanics

Two new zone kinds in `src/render/zones.js` (+ the `miregate` arch zone):

- **`mire`** (400–3800): a sickly green-black sky gradient
  (`#0d1a12` → `#16241a`); a pale green moon `#cfe8c8` (parallax 0.05)
  with a low-alpha halo; **three drifting fog bands** (wide soft rects,
  pure time function: slow horizontal drift + alpha pulse, parallax
  0.15/0.3/0.45 — no state); **the mountain** — a large snow-capped peak
  silhouette (parallax 0.2, right of center, the story's anchor); **the
  wizard's fly-by** — every ~40 s (pure time function) a tiny dim wizard-on-
  pig silhouette (24×16) crosses the sky above the mountain; **fireflies**
  — 7 warm specks on seeded Lissajous drifts with alpha pulses (the
  spooky-light counterpoint); far cypress line (parallax 0.5) and near
  cypress line (0.7) — bare black trunks, sparse drooping branches.
- **`mire-deep`** (3800–6800): the same dressing one shade darker, denser
  fog (a fourth band), the mountain bigger and brighter (you're getting
  close), overhead webs between the near cypresses.
- **`miregate`** (0–400): the `hall` stone over a cut-out arch (the L5
  gate pattern, dark palette) with the mire sky showing through.

World pass (dressing, no collision), new `src/render/mire.js`: dead
cypresses (the great cypress at 950 with its nest perch), giant ferns
(dark fronds), the sunken temple (broken columns, mossy blocks), the mud
vent's stone rim, the altar daises, overhead webs (strung between trunks,
the spiders' anchors), the bridge's west-bank slab, the web wall (the door
render's new `webwall` kind: dense white lattice + shimmer; melts on open),
the egg sac (web-wound blob + glint when present), the nest (sticks + web
wrap; unravels when shot), the vent's bubble (translucent green, highlight
arc, the cog visible inside), the winch (stone wheel + beam + hub sockets;
the filled sockets show the cog sprites; the wheel turns when
`winch.turning`), the exit arch with its stairway-to-the-peak (snow band,
sealed → brightened like the mistgate).

Ground/platform kinds: `stone` (reused from L5); new `root` (a gnarled
brown limb, knobby), `nest` (a stick nest, 60 wide), `altar` (a mossy
stone dais), `bridge` (a timber span; the platform entry carries the
existing `hidden` flag — non-solid until the winch's w5 `onOpen` lowers
it, the L3 nook-ledge pattern; state in `lvl.bridge`).
`log` and `lily` reused from L5 (the lily reads as a swamp pad as-is).

**No visibility penalty** — the gloom is atmosphere, not a light-radius
mechanic (the L5 "daylight is art, not mechanics" precedent, inverted).
Fairness first: every threat is visible.

## Loot boxes

Existing pool only, 12 boxes. No shield (no fireballs — the boss's globs
are web, a mirror is useless), no heartcap (already owned; a duplicate pays
a gem), no bow beyond the two safety boxes.

500 **bow** (safety #1), 750 gem, 1180 star (on the log), 1650 heart,
2400 magnet, 3000 sunbeam, 3400 boots, 4000 hops, 4450 mystery, 5200
**bow** (safety #2), 5350 heart, 5950 heart (pre-fight boon).

The sunbeam at 3000 clears snakes/spiders on screen (standard rule) — the
deep-mire comfort. The boots at 3400 help the root chains and the pool
crossings (optional, never required — flight is the carried solution).

## Enemies summary

- Snakes ×5 + elder adder ×1 (3 hp, sleep→wake).
- Spiders ×6 (thread + pounce).
- The Weaver Queen (16 hp boss).
- No slimes/bees/bats/ghosts/zombies/trolls/dragons.

## Ending sequence

1. Third cog set → the winch's wheel turns, the bridge groans down, the
   web wall melts — the pass is open (the world is frozen while w5 is on
   screen; closing the box reveals the lowered bridge and the hollow
   beyond).
2. Cross the bridge (or flight over the pit) into the spider hollow → the
   Weaver Queen fight (16 hp, arrow-only; the heart at 5950 is the boon).
3. She dies → burst + growl → the pearl appears on her altar.
4. Take the pearl → the seal breaks → the exit arch brightens, the
   stairway to the peak glowing.
5. Walk east into the arch → standard level-complete overlay.
6. Level 7 — the peak, the wizard's lair, the flying pig, the King — is
   future work.

## New systems (input to the phased plan)

1. Level 6 data (`createLevel6`) + `LEVELS` registration (index 5,
   `carry: { hasBow, hasFlight }`)
2. Zones `miregate`/`mire`/`mire-deep` (gloom sky, moon, fog bands,
   mountain, wizard fly-by, fireflies, cypress lines); platform kinds
   `root`/`nest`/`altar`/`bridge`; the `webwall` door kind; world pass
   (`src/render/mire.js`)
3. Cogs + winch: `lvl.cogs` (stage-gated), pickup (the relic pattern, +50),
   `lvl.winch` sockets, the w0–w5 beats (the `onOpen` install), the wheel
   turn, HUD counter generalized to cogs
4. The hiding spots: the nest web (the arrow-hit path, the bush pattern),
   the vent bubble (cycle, shootable, the floating cog), the egg sac
   (stomp/shoot, absent→present), the elder adder sleep→wake
5. Bridge (raise/lower render + collision gating) + web wall (melt) + exit
   arch (stairway, sealed→bright)
6. Snake + elder adder (strike AI, sleep/wake, `slither` sfx)
7. Spider (thread + pounce AI)
8. Web-slow (`p.webT`, speed ×0.45, flight immune, trail render)
9. Weaver Queen boss (state machine, lunge/spit/pillar/egg volley, 2
   phases, pips, stagger, death→pearl)
10. FX + audio: `slither`, `puff`, `pop`, `gear`, `creak`, `spit`, `growl`,
    `spin`; reuses `relic`, `rumble`, `seal`, `pearl`
11. Tests + render snapshots + headless full playthrough

## Phased build (one subsystem per turn, tests + smoke green after each)

1. **M1** level data + zones (miregate/mire/mire-deep) + ground/platform
   kinds + boxes + the winch drawn dead + web wall sealed + bridge raised —
   walkable end-to-end (flight over the pit); the bridge pit; no cogs/
   enemies/boss
2. **M2** cogs + winch: stage-gated pickup, the three sprites + glints,
   HUD counter, the w0–w5 beats, socket fills, the wheel turn
3. **M3** the hiding spots: nest web, vent bubble, egg sac, elder adder
   sleep/wake (all three cogs collectable through the real chain)
4. **M4** bridge + web wall + exit arch: the w5 `onOpen` wiring, the
   lower/melt anims, the stairway exit, the pearl's `showWhen`
5. **M5** snakes + elder adder
6. **M6** spiders
7. **M7** the Weaver Queen + web-slow
8. **M8** polish: headless playthrough (spawn → intro → nest → winch →
   vent → winch → grove → winch → bridge → boss → pearl → exit), scripted
   winch tests, final snapshots, README level list

## Decisions (awaiting confirmation)

1. **Story glue**: the mist gate leads to the *valley below* the peak, not
   the peak itself — the wizard's shadow blackened the valley into the
   Blackmire; the mountain looms in the background and the wizard's fly-by
   easter egg keeps his presence felt. Level 7 is the peak (the wizard's
   lair, the real finale with the King). This retcons L5's "the mountain
   is level 6" note; the story promise (free the King at the peak) is
   intact.
2. **The puzzle is a sequential chain**: cog N is gated until socket N−1
   is filled (dormant vent, absent sac); the winch consumes the cog on
   approach (the w1/w3/w5 `onOpen` beats). Rejected alternative: parallel
   collection + order-matching at the winch (soft-lock/UX risk, and the
   "puzzle" collapses into collecting three things).
3. **The three cogs**: the heron's (nest — shoot the web; root chain or
   flight), the adder's (vent — time and shoot the bubble), the weaver's
   (egg sac on the altar — stomp or shoot, guarded by the waking elder
   adder).
4. **The boss**: the Weaver Queen — 16 hp, arrow-only, unstompable, a
   ground-crawling state machine with lunge / aimed spit (web-slow) / web
   pillar (zone control) / egg volley (phase 2); the pearl appears on her
   altar when she dies.
5. **Web-slow** is the level's new player status: ×0.45 speed for 2.5 s,
   flight immune (S is the escape). Boss-only source.
6. **New regular enemies**: snake (strike) ×5, elder adder (3 hp,
   sleep→wake) ×1, spider (thread + pounce) ×6; no fauna reuse (mire
   creatures only).
7. **The gloom is art, not mechanics**: fog, fireflies, moon, no
   light-radius (fairness; the L5 daylight precedent inverted).
8. **6800 px wide** (the longest level), zones miregate/mire/mire-deep;
   the arena is ~960 px with an open west end (the bridge = a retreat
   pocket; the real gate is the full-height web wall).
9. **The bridge is comfort, the web wall is the gate**: the 300 px pit is
   flight-clearable, so the winch's real payoff is the web wall melting —
   the bridge is the spectacle and the safe crossing.
10. **Safety bow boxes at 500 and 5200**: a restart drops the bow; the web
    and the bubble need arrows (the sac can be stomped).
11. **The HUD counter shows sockets filled** (0/3), not cogs carried —
    the counter tracks the puzzle, not the pockets.
12. **12 boxes, no shield/heartcap** (no fireballs; the heartcap owned).
13. **Each cog is +50 score** (the relic pattern, `relic` chime reused).
14. **Level 6 is not the finale** (level 7 = the peak).

## Build notes (bugs found by the M8 playthrough test)

The headless playthrough (`test/level6-playthrough.test.js`) runs the
whole level with real physics and caught three design faults, all fixed
in M8:

1. **Nest web hitbox** (`src/arrows.js`): the web's hit window sat flush
   with the nest rim, so a chest-height arrow fired level with the
   threads could miss by a pixel. The window now extends 24 px above the
   rim.
2. **Nest reachability** (`src/levels/level6.js`): the nest at x 910 was
   out of range of both the root chain and the flight drift from the
   cypress. The nest (and the heron's cog) moved 910 → 1010, above
   root 3's west edge.
3. **Web pillar clamp** (`src/enemies/spiderboss.js`): the pillar locked
   to the *player's* x, so mid-mire (the Queen idling in her band, the
   player 3600 px west) it rose in the lily pool — an off-screen glint
   and an unreadable hit, and its web-slow made the hop crossings
   impossible. The pillar x is now clamped to the Queen's band
   (5900–6610): it can never rise in the mire, and in the duel it still
   lands where the glint showed.

### Gate arch screen-pinning (found in visual play, fixed post-M8)

`drawMireGateWall` drew the west wall from `sx0` (scrolled) but the
lintel, trim arc, and jamb at raw screen x 256–400 — world coordinates
with `cam.x` never subtracted. The arch looked right at spawn (cam.x =
0, where both formulas agree — which is why the render snapshot missed
it) but then rode along behind the player and vanished mid-screen when
the gate zone culled at cam.x > 560. The lintel, trim, and jamb are now
world-anchored (`- cam.x`); a regression test in `test/render.test.js`
asserts the lintel arc centre tracks 330 − cam.x at two camera
positions, and the spawn snapshot is byte-identical (the spawn view is
untouched).
