# Level 7 design — "The Peak"

Status: CONFIRMED (all 12 decisions; first of the 7–9 trilogy — see the
trilogue spine below).

## Trilogy spine (context)

The wizard is a mid-boss, not the final villain: his magic was borrowed.
The true source is the **Frost Queen**, the realm's first queen, who a
century ago tried to freeze the realm in a single day to stop a plague;
the spell turned into her prison and the realm's slow sickness (retro-
actively: the castle's dark magic, the mire's black water). She wanted the
King's horn — the realm's last thaw — to finish the freeze; the wizard was
her warder. Levels 7–9 break her three works: **7 the Rune** (this level),
**8 the Anchor** (the Sky Citadel), **9 the Throne** (the Frozen Throne,
the finale with the `ending` state). The bound-creature motif closes the
arc: the pig released here, the Warden rested in 8, the Queen brought
down in 9.

## Concept

The stairway out of level 6's exit arch leads **up and over**: the player
arrives at the top of the snow-topped mountain — the **wizard's lair**.
Level 7 is the game's first **starlit** level (deep blue-black sky, stars,
a silver moon, falling snow) and its first level with **weather as a
mechanic**: the mountain's wind. A gust cycle — telegraphed by a **wind
vane**, pushing west (against progress) every ~10 s, with every 4th gust
an **updraft** that lifts flight and pauses the flight timer. Short **ice
patches** (near-zero friction) line the run-up to each crevasse, and the
bridge over the big one is ice itself. A **sigil** sleeps in an ice block
(arrow to wake it) and unseals the **spire** at the mountain's crown; the
spire holds the cauldron, the bound spirits, and a porthole where the
**King** (caged on the summit dais) gives the tactical beat. Past the
spire, an open-air **throne** arena above the clouds: the **wizard on his
flying pig**, a two-stage fight (the rune on the pig's flank, then the
sorcerer on foot). Kill him and the pig wanders off west — it was bound,
not evil — the cage opens, and a **rainbow** spirals up out of the arena:
the way to the next work she left behind.

Carried in: bow, big, maxHp 4, hasFlight — all permanent.
`LEVELS[6] = { name: 'peak', make, carry: { hasBow: true, hasFlight: true } }`.

### Why this one is more interesting

- **Weather is the signature mechanic**: the wind is a pure time function
  (no state), telegraphed by a vane, and it inverts the flight rule — the
  10 s flight is the escape from the gust, and the 4th gust is a *gift* to
  the flyer. The L6 web-slow's "flight is the designed escape" pattern,
  turned into a whole level.
- **Ice as an ingredient** (the L9 full mechanic in embryo): slide,
  momentum into jumps, a headwind on a frictionless bridge — one set
  piece (the ice bridge crossing) where gust + slide + gap interlock.
- **The boss is a duet**: stage 1 you shoot a *rune on a flying pig* while
  the mounted wizard is invulnerable (arrows spark — feedback); the swoop
  telegraph is the attack *and* the shot window (the pig exposes itself).
  Stage 2 is the classic ground duel. 16 hp total; the difficulty is the
  stage change, not the count.
- **The villain is a lock, not a key**: the King's porthole beat names the
  rune as *not the wizard's work* — the twist lands mechanically (aim
  here) and narratively (the Frost Queen exists).
- **A visible bound-creature release**: the pig walks off west; the two
  bound wraiths in the arena sparkle free — the game's recurring mercy
  beat, played on camera.
- **Starlight**: the palette break from six dark/cold levels is the
  opening statement; the only warm colors in the whole level are the
  spire's floating orbs (the cold's counterpoint).

## Layout (left → right, 6300 px wide, view 800×600, groundY 560)

```
x:     0     500              2400        3600          4500    5400              6300
       ┌──────┬───────────────────────────┬────────────┬───────────┬─────────────────┐
       │ GATE │ SNOWFIELD                 │ SPIRE      │ PORTHOLE  │ THRONE          │
       │ arch │ wind, vane 700, ice,      │ (interior) │ 4500      │ (open air,      │
       │      │ crev. 1400–1550,          │ irongate   │ King's    │ above the       │
       │      │ crev. 2400–2550 + ice     │ 3600,      │ beat      │ clouds)         │
       │      │ bridge, sigil 3100        │ cauldron   │           │ cage 5990–6120, │
       │      │ hares ×4, wraiths ×3      │ 3900–4050  │           │ wizard 5850,    │
       │      │                           │            │           │ rainbow 6220    │
       └──────┴───────────────────────────┴────────────┴───────────┴─────────────────┘
```

Zones: `{0–500: 'peakgate'}, {500–3600: 'snowfield'}, {3600–5400: 'spire'},
{5400–6300: 'throne'}`.

Ground / pits (pit = the lava render with a new recolor flag; falling in =
1 damage + respawn at last safe ground, the standard pit rule):

```
ground:  0–500 ('stone') | 500–1250 ('snow') | 1250–1400 ('ice') |
         1550–2250 ('snow') | 2250–2400 ('ice') | 2550–3600 ('snow') |
         3600–3900 ('stone') | 4050–5400 ('stone') | 5400–6300 ('snow')
pit:     1400–1550 (150, `crevasse: true`) | 2400–2550 (150, `crevasse: true`) |
         3900–4050 (150, `cauldron: true`)
```

### The gate (0–500)

- The L2/L6 gate shape, mirrored: stone 0–240 west of the opening, stone
  420–500 east, a **stone arch at 240–420** (10 px jambs, trim r 100 around
  centre (330, 390), arch top 300) with the **starlit snowfield** visible
  through it (the inverse of L5's daylight-through-stone). Behind the
  spawn (x 0–100) the **stairway from L6** recedes up and out of frame to
  the west — a three-frame visual callback that you just came up it.
- Player spawns at x 60. Ground kind `stone`.
- **Intro beat** (one-shot, rect 40–240, fires on frame 1 — the spawn
  band), speaker **The Unicorn Queen** (from far below — the last time
  her voice is heard until the ending):
  - "The wind is hard tonight. The vane will tell you its mind."
  - "The spire's seal answers to the old sigil — it sleeps in the ice, and it wakes to an arrow."
  - "Free him, and the rainbow will show you the way home."
  Sets up the vane (mechanic), the sigil (puzzle), and the rainbow
  (ending) in three lines — the L6 winch-intro pattern.
- **Safety bow box at 550** (ground, stomp-breakable): a death-restart
  drops the carried bow; the sigil block needs an arrow.

### The snowfield (500–3600)

- **The wind vane** on a post at 700 (top at y ≈ groundY−120): the
  level's tell (the L6 glint pattern, standing in for it). States are
  pure functions of the wind phase: calm — rooster points east, still;
  telegraph — the tail flaps; gust — points east, the post shivers 1 px;
  updraft — points straight up.
- **The ice bridge crossing** (the set piece): ice patch 2250–2400 →
  crevasse 2400–2550 with the **ice bridge** (platform kind `ice`,
  `{2400, y groundY−6, w 150}`) at water level → snow 2550. Slide on,
  gust pushes back, gap below. A plain running jump or flight clears the
  150 px crevasse anyway — the bridge is comfort and spectacle, not the
  gate (the L6 bridge rule).
- **Crevasse 1** (1400–1550, 150 px) with the ice patch 1250–1400 in
  front — the ice *teach*: run up it, feel the slide, jump off it.
- **The sigil in the ice block** at 3100 — see the Sigil section.
- Hares (4) and mountain wraiths (3) — see the enemies section.
- Boxes: 750 gem, 1200 boots (on the snow, *before* the first ice patch —
  the boots' 10 s window is the comfort teach; when they expire, the real
  sliding begins), 1700 star, 2200 heart, 2700 magnet, 3200 mystery.

### The spire (3600–5400)

- Interior: purple-black stone (a deeper `hall` palette), **floating
  light orbs** (7, seeded Lissajous drifts, warm amber, alpha pulse — the
  only warm color in the level, the cold's counterpoint), bookshelves,
  the **cauldron pit** (3900–4050: dark purple liquid, glow, bubble
  particles, a stone rim) with a **stone dais** `{3925, y groundY−6,
  w 60}` mid-pit (a hop-hop; a running jump also clears 150 px).
- **The iron gate** at 3600 (door kind `irongate`, full height): solid
  while locked, a dark seal glow at its hub. **Opens remotely when the
  sigil is picked up** (the L3 key pattern, one key, one door): the seal
  breaks (`seal` chime), the portcullis rises over 1.0 s (`gate` clank) —
  visible from the snowfield 500 px away, a payoff you can watch.
- **The porthole** at 4500: a round iron-rimmed window (r 40) in the wall,
  the starlit sky through it, and — far above, small — **the King's cage
  on the summit dais** (the visual goal made visible before it's
  reachable). A faint glint on the glass while the beat is unspent.
- **The King's beat** (one-shot, rect 4380–4620, fires on first entry),
  speaker **The Unicorn King**:
  - "I see you, little queen. When you face the wizard — aim for the rune on the pig's flank."
  - "It is not his work. It holds the magic that keeps him in the sky. Break it, and he falls."
  The level's tactical hint: it names the stage-1 target *and* seeds the
  twist (the rune is not the wizard's work — the L5 Queen-beat pattern,
  mid-level).
- **The throne gate** at 5400 (door kind `thronegate`, full height): a
  dark iron wall with a purple seal glow. **Unopenable by anything** —
  no key, no beat. When the player first enters the trigger band
  5280–5400: the seal flares (0.8 s, `boss` sfx), the gate **dissolves**
  (1.0 s, the web-wall-melt pattern), and **the wizard lands on his pig**
  (entering from the east, x 6600 → his band) — the fight starts. After
  it dissolves the arena is open behind (no wall re-forms — the L6
  retreat-pocket rule: the arena's west end stays an off-ramp).
- Boxes: 4300 gem, 4700 heart, 5050 star, 5350 **shield** (designated;
  west of the gate — visible on the approach, the L4/L6 pre-fight boon;
  the mirror shield's penultimate appearance: reflected bolts damage the
  rune).

### The throne (5400–6300)

- Open air above the clouds: the starlit sky (clearer, more stars —
  higher is thinner air), a **sea of clouds** far below (soft white-
  lavender band, parallax 0.1, slow drift, pure time function), and the
  spire's outer wall at the west edge (x 5400–5500 stone, the entrance
  behind the dissolved gate).
- **The King's cage** on a **dais** (platform kind `dais`, snow-capped
  stone) at 5990–6120: an iron cage (64×74) with the King's silhouette
  inside, the lock glinting while sealed. When the wizard dies the door
  swings open (`gate` clank) — see the ending.
- **The rainbow** at 6220 (exit rect `{6220, y 430, w 60, h 130}`, kind
  `rainbow`): sealed — a faint dim arc, barely visible (the mistgate
  sealed pattern); on the wizard's death it **lights up**: a full
  rainbow spiraling up and out of the top of the frame, shimmer,
  `rainbow` sfx + `seal` chime, and the exit unlocks. Walk in → standard
  level-complete overlay → level 8. (No `ending` state — that is L9.)
- Box: 5900 heart (pre-fight boon, in the arena, the L6 5950 pattern).
- **No pearl**: the seal breaks on the boss's death, not on a pearl
  pickup (the L5 precedent — the story, not a seal, ends the level's
  chain). The rainbow replaces the pearl+arch pair.

## The wind (signature mechanic)

A **pure time function** — no level state (the L6 fly-by/fog pattern).
`t` is level time in seconds.

```
cycle = t mod 10        gustN = floor(t / 10)
[0, 6)  calm            updraft ⇔ gustN mod 4 === 3   (the 4th, 8th, … gust:
[6, 7)  telegraph                                            first at t ∈ [30, 40))
[7,10)  gust
```

- **Calm**: light snow drift (the base fall), vane still.
- **Telegraph** (1 s): the vane's tail flaps, the snow streaks thicken,
  `gust` sfx (a low howl) — played only when the player is in the
  snowfield zone (500–3600; ambient, not global).
- **Gust** (3 s): strong push **west** (against progress — the mountain
  blows against you): ground player vx −100 px/s (run is 260 px/s, so a
  headwind costs ~40% — progress slows, the bridge crossing fights you).
  **Flying: no push at all** — flight is the clean escape.
- **Updraft** (the 4th gust): on the ground, same 100 px/s push;
  **flying**: a gentle lift (net +40 px/s rise while up/down are unheld)
  and **the flight timer pauses** (`flightT` stops decrementing — 10 s of
  flight becomes ~13 s if you catch the updraft). The vane points up:
  the flyer's reward is telegraphed 1 s ahead.
- **Wraiths** (mountain, snowfield only): alpha calm 0.45 → telegraph
  0.7 → gust 1.0, with a frost rim during the gust (the L6
  "solidifies" rule — the telegraphs double as visibility; a visual
  function of the phase, no state). Bound wraiths (arena) are always
  solid: bound things are dense.
- **Arrows are unaffected** (house decision — the bow stays honest).
  Hares, the pig, and the wizard are unaffected (the wind is a
  snowfield-zone effect; the arena is above the weather).

## Ice (ground kind `ice`)

The L9 full mechanic in embryo — three spans in L7, no ramps or speed
gates (those are L9).

- Ground kind `ice`: **near-zero friction** (vx decays ~0.02/s — you
  slide until you steer), **steering accel 0.6×** (you turn, not stop),
  **max ground |vx| 1.3 × P_SPEED** (≈338 px/s). Momentum carries into
  jumps (existing vx persistence — the slide makes it bigger).
- Spans: 1250–1400 (crevasse-1 run-up, the teach), 2250–2400 (bridge
  run-up), the **ice bridge** platform `{2400, y groundY−6, w 150, kind:
  'ice'}` over crevasse 2.
- Boots do **not** grip ice in L7 (the boots-grip-ice comfort is L9's
  teach; here the boots box at 1200 is a generic 10 s comfort window
  that happens to make the first slide easy).

## The sigil (key) and the iron gate

`lvl.sigilBlock = { x: 3090, y: groundY − 76, w: 56, h: 56, state: 'intact', shatterT: 0 }`
`lvl.sigil = { x: 3112, y: groundY − 16, w: 16, h: 16, visible: false, taken: false }`

- **The ice block**: a snow-capped stone cube on the ground, a **black
  crystal** set in its face, glinting white every ~4 s (seeded, the bush
  pattern — the "something is in here" cue).
- **Arrow-only wake**: any arrow (stars too) hits the block (its window
  spans the full 56 px height, so a chest-height ground arrow lands) →
  `crack`, 0.4 s shatter (ice shard particles) → `state: 'gone'`, the
  sigil falls to the ground and is **visible**.
- **Pickup** (overlap): `taken`, `relic` chime, sparkle, **+50 score**
  (the relic pattern).
- **On pickup, the iron gate (3600) opens remotely**: `state: 'opening'`,
  the seal breaks (`seal`), the portcullis rises over 1.0 s (`gate`). No
  beat, no return trip — the L3 key→door payoff, watched from a distance.

## The Wizard and his Pig (boss)

kind `wizardboss`, spawn (5850), patrol band 5500–6200. **16 hp total in
two stages of 8**; arrow-only (stomp bounces off the pig's hide — the
dragon rule); pips in two rows of 8 — stage 1 shows the **rune's** pips,
stage 2 the wizard's. He is a *flying* boss for stage 1 (the dragon's
territory) and a *ground* boss for stage 2 (the Weaver Queen's) — both
languages in one fight, the stage change *is* the finale moment.

### Stage 1 — the Flight (the rune, 8 hp)

- **The pig** (64×48) hovers in slow arcs: x a slow sine over the band
  (period ~8 s), y = groundY−160 + 50·sin(t/2) (≈ 350–450, bottom ≈
  398–498 — **above the ground-arrow line** at the top of the arc, the
  dragon rule). The **rune** (24×24, the pig's near flank, dark violet,
  a faint pulse) is the only hittable thing:
  - **jump-arrows** reach it at the bottom of the arc (apex ≈ 130 px),
  - the **swoop and its 0.5 s recover** bring it to ground-arrow level —
    the swoop telegraph is the attack *and* the shot window (the pig
    exposes itself; the dragon never did),
  - **flight** is the comfort route.
- **The mounted wizard is invulnerable**: arrows spark off him (`deflect`
  ping + a small spark, no damage) — the feedback cue that says *not him,
  the rune*.
- **Dark bolt**: aimed (the fireball pattern: 240 px/s, 14 px, the mage's
  lead), 1 damage. **Reflectable by the mirror shield** → the reflected
  bolt damages the rune for 1 (the L2 mage rule; the shield box at 5350
  is the designed tool).
- **Swoop**: 0.5 s crouch telegraph (`snort`) → a fast pass at 420 px/s
  toward the player's x, a shallow arc sinking to y ≈ groundY−70 mid-
  pass, contact 1 damage, 0.5 s recover at the far end (the rune window).
- **Snort cone**: a ground-level cone from the pig (the L4 fire-cone
  pattern, retinted dark violet), 140 px reach, 0.8 s, 1 damage.
- Tempo: idle 1.0–1.5 s between attacks; weights **bolt 50 / swoop 30 /
  cone 20**.
- **Rune shatter**: burst + `crack` + shake(6, 0.4) → the pig **crashes**
  to the ground (`thud` + snow puff) → the wizard is **stunned 2 s**
  (the stage transition — a free moment to reposition) → stage 2 begins.

### Stage 2 — the Sorcerer (the wizard, 8 hp, on foot)

56×56, standing with his staff, on the arena floor (the L6 ground-boss
language — lateral movement and spacing).

- **Bolt**: aimed, as in stage 1.
- **Slam**: 0.5 s wind-up (staff planted, crouch) → ground slam → two
  radial **magic shockwaves** run the floor (the troll pattern, 1
  damage each).
- **Seal circle**: a glint at the player's x for 0.6 s (the web-pillar
  pattern) → a **dark column** (40×140, dark violet) rises, stands 0.8 s,
  decays 0.5 s; contact 1 damage. The column x is **clamped to the
  wizard's band (5500–6160)** — the L6 build-note rule: it can never
  rise outside the arena, and in the duel it still lands where the glint
  showed.
- **Fan** (≤4 hp): a three-bolt fan (aimed ±20°, the spiderboss egg-volley
  geometry retinted).
- Tempo: idle 0.7–1.1 s; **≤4 hp**: 0.5–0.9 s, his staff-tip glow
  intensifies (the phase-cue house pattern).
- **Stagger on hit** (house rule, both stages): 0.3 s pause + flash —
  the attack window, made explicit.

### Death and the release

The wizard **crumbles to ash**: big burst + low `growl` + `crumble` +
shake(9, 0.6). Then, in order:

1. **The pig stands**, the rune gone (it fades with a soft sparkle),
   shakes off snow (0.5 s), and **walks west at 40 px/s** (a small time-
   function walk, head down), despawning past x 5450 — the bound creature
   released (the L6 pig-fly-by easter egg's answer).
2. **The bound wraiths** (5550, 5950) **sparkle free**: a `grant` chime,
   a sparkle burst, a 1 s fade, then gone (the bound-creature motif, on
   camera — the arena's only enemies, freed by the very kill that ends
   the fight).
3. **The cage opens** on the dais (`gate` clank, the door swings).
4. **The King's ending beat** (one-shot, `when: wizardboss dead`, rect
   5900–6200):
   - "The wizard was only a lock."
   - "His magic was never his own — the rune on the pig was not his work."
   - "Look up. The rainbow will carry you to the next work she left behind."
5. **The rainbow lights up** at 6220 (`rainbow` + `seal`), the exit
   unlocks. Walk in → overlay → level 8.

## New regular enemies

**Frost hare** — 24×20 hitbox (drawn as a small grey-blue hare, ears up),
**1 hp**, **stompable** (a puff of fluff — the game's softest death,
fitting the level's mercy tone) and arrow-killable, contact 1 damage.
Patrols its band at 30 px/s (turns at bounds, the slime shape). When the
player is within 160 px and the cooldown (3 s, seeded) is done: **dart**
— a 0.3 s crouch telegraph (ears back), then a 100 px hop **away** from
the player (arc apex ~50 px — stompable mid-hop if you commit), 0.4 s
recover. New `src/enemies/hare.js`, self-registers. Roster (4):
(800, 700–1100), (1750, 1650–2050), (2900, 2800–3200), (3300, 3250–3550).

**Ice wraith** — 26×30 hitbox (drawn as a frost-veined spirit, a faint
blue glow), **1 hp**, **arrow-only** (stomp passes through — the ghost
rule), contact 1 damage. Hovers at its anchor with a ±6 px sine bob;
when the player is within 260 px it **drifts** toward them at 45 px/s,
descending to chest height (y ≈ groundY−44) within 120 px so a ground
arrow reaches it (the ghost's drift-close pattern). **Alpha is a pure
function of the wind phase** for the three mountain wraiths (0.45 / 0.7 /
1.0, frost rim in gusts — solid when the wind tells you where it is);
the **bound** variant (`bound: true`, a dark rune collar) is always solid
and is freed by the wizard's death (the ending sequence). New
`src/enemies/wraith.js`, self-registers. Roster (5): mountain (1100, y
420), (2100, y 410), (3000, y 430); bound (5550, y 420), (5950, y 430).

No slimes, bees, snakes, spiders, bats, or ghosts — mountain fauna only
(the L5/L6 biome rule: each place keeps its own creatures).

## Starlight and cold — art, not mechanics

Four new zone kinds in `src/render/zones.js`:

- **`peakgate`** (0–500): the starlit sky showing through the L2-shape
  arch (stone 0–240 / 420–500, arch 240–420, the L6 gate-arch world-
  anchoring rule — the lintel, trim, and jambs are world-anchored, not
  screen-anchored; the L6 build-note regression), the stairway
  silhouette receding up-west behind the spawn.
- **`snowfield`** (500–3600): a deep blue-black starlit gradient
  (`#0a1428` → `#1a2c4a`); **stars** (~40, seeded, parallax 0.05, slow
  alpha twinkle); a **silver moon** (`#e8f0f8`, parallax 0.05, low-
  alpha halo); **the spire silhouette** (parallax 0.2, right of center —
  a dark purple-black spire with a faint dark glow at its tip, the
  visual anchor of the goal); **falling snow** — two layers, pure time
  functions (parallax 0.3: ~40 small slow flakes; parallax 0.5: ~24
  larger faster flakes); during telegraph/gust the flakes tilt west and
  speed up ×2.5 (a pure function of the phase); far pine line (parallax
  0.5) and near pine line (0.7) — dark blue-green conifers with sparse
  snow caps.
- **`spire`** (3600–5400): the interior — purple-black stone (a deeper
  `hall` variant: walls `#1a1026`), the **seven floating orbs** (seeded
  Lissajous drifts, warm amber, alpha pulse — the level's only warm
  color), the **porthole** (r 40, iron rim, the starlit sky + the
  cage's silhouette far above in the glass, a glint while the beat is
  unspent), the throne gate's dark seal glow.
- **`throne`** (5400–6300): the starlit sky (clearer — more stars, a
  deeper blue: higher is thinner air), the **sea of clouds** below (a
  soft white-lavender band, parallax 0.1, slow horizontal drift, pure
  time function), the spire's outer wall at the west edge (x 5400–5500).

World pass (dressing, no collision), new `src/render/peak.js`: the wind
vane (post + rooster, the four phase states), the **ice block** (snow-
capped cube, the black crystal glint while intact, the shattered state),
the cauldron (stone rim, dark purple liquid, bubble particles), the
**cage on the dais** (iron bars, the King's silhouette, the lock glint
→ open door), the **rainbow** (sealed dim arc → lit full spiral with
shimmer), the **throne gate** (dark iron wall, seal flare → dissolve),
the **iron gate** (portcullis rise), the **pig's walk-off** (the stage-2
death state), the crevasse lips (white ice edges over the dark water).

Ground/platform kinds: `stone` (reused), `snow` (reused base + a 10 px
white cap with a faint blue shadow), **`ice`** (glossy pale blue
`#bfe4f0`, a glint streak, thin crack lines), **`dais`** (snow-capped
stone block with a rim trim — the cage's plinth). Pits: new recolor
flags on the lava render — `crevasse: true` (deep blue-black `#0a1220`,
a faint blue glow at the bottom, a white ice lip at the surface) and
`cauldron: true` (dark purple `#2a1245`, a purple glow, bubbles).

**No visibility penalty** — the night is atmosphere, not a light-radius
mechanic (the L5/L6 "fairness first" rule): every threat is visible in
every phase; the wraiths' alpha is a *clue* (the wind tells you when
they're solid), never a hide.

## Loot boxes

Existing pool only, 12 boxes. No heartcap (owned), no mystery-payload
change, no bow beyond the one safety box (the sigil block needs an
arrow; the stompable hares are the only stomp-break risk to the bow).

550 **bow** (safety #1), 750 gem, 1200 **boots** (the pre-ice comfort
window — a teach, not a requirement), 1700 star, 2200 heart, 2700
magnet, 3200 **mystery** (purple, swirled — one per level, the house
rule), 4300 gem, 4700 heart, 5050 star, 5350 **shield** (designated —
reflected bolts damage the rune; visible west of the throne gate), 5900
heart (pre-fight boon, in the arena).

## Enemies summary

- Frost hares ×4 (patrol + dart; stompable).
- Ice wraiths ×5: mountain ×3 (drift, wind-phase alpha) + bound ×2 in
  the arena (always solid; freed by the boss's death).
- The Wizard and his Pig (16 hp, two stages: rune 8 / wizard 8).
- No fauna reuse from any earlier biome.

## Ending sequence

1. Rune shatters → the pig crashes → the 2 s stun → the stage-2 duel.
2. The wizard crumbles to ash (burst + `growl` + `crumble` + shake).
3. The pig stands, the rune fades, it walks off west (despawns past
   5450).
4. The bound wraiths sparkle free (`grant`, 1 s fade).
5. The cage door swings open (`gate`) → the King's ending beat (the
   twist: the wizard was only a lock; look up).
6. The rainbow at 6220 lights up (`rainbow` + `seal`); the exit unlocks.
7. Walk east into the rainbow → standard level-complete overlay →
   level 8, the Sky Citadel.

## New systems (input to the phased plan)

1. Level 7 data (`createLevel7`) + `LEVELS` registration (index 6,
   `carry: { hasBow, hasFlight }`)
2. Zones `peakgate`/`snowfield`/`spire`/`throne` (starlit sky, stars,
   moon, snow layers + phase tilt, spire silhouette, pine lines, sea of
   clouds, orbs, porthole) + ground kinds `snow`/`ice`/`dais` + pit
   recolors `crevasse`/`cauldron` + world pass (`src/render/peak.js`)
3. The wind (pure time function: calm/telegraph/gust, the 4th-gust
   updraft, the player push/lift/timer-pause, the vane states, the
   wraith alpha)
4. Ice physics (friction/steering/max on kind `ice`) + the ice bridge
5. The sigil (ice block shatter, the +50 pickup, the remote iron-gate
   open) + the throne gate (sealed wall, flare → dissolve, the boss
   entrance trigger)
6. Frost hare + ice wraith (+ bound variant + release)
7. The Wizard and his Pig boss (two-stage state machine: rune, bolt/
   swoop/cone, slam/shockwave/seal column/fan, shield reflection, the
   crash, stagger, pips per stage)
8. The ending (ash, the pig's walk-off, the wraith release, the cage
   open, the King's beats, the rainbow exit lit → unlocked)
9. FX + audio: new `gust`, `snort`, `rainbow`; reuses `crack`, `crumble`,
   `growl`, `thud`, `puff`, `seal`, `gate`, `relic`, `bossHit`,
   `fireball`, `deflect`, `grant`, `boss`, `hurt`, `land`
10. Tests + render snapshots + headless full playthrough

## Phased build (one subsystem per turn, tests + smoke green after each)

1. **M1** level data + zones + ground/pit kinds + boxes + cauldron pit +
   ice bridge + iron gate locked + throne gate sealed — walkable
   end-to-end to the throne gate (flight over the crevases); no wind,
   sigil, enemies, or boss
2. **M2** the wind (phase function, vane, player push, updraft lift +
   flight-timer pause, snow tilt, `gust` sfx) + ice physics (the three
   spans)
3. **M3** the sigil (block shatter, pickup, +50) + the iron gate's
   remote open (the spire reachable)
4. **M4** hares + wraiths (drift, alpha, bound variant)
5. **M5** the spire's story: the porthole, the King's beat, the cage +
   dais art, the throne gate's flare → dissolve + the boss-entrance
   trigger (the boss itself is a placeholder until M6)
6. **M6** the Wizard and his Pig (both stages, all attacks, shield
   reflection, pips, stagger, the crash transition)
7. **M7** the ending (ash, walk-off, release, cage open, the King's
   ending beat, the rainbow lit → exit unlocked → overlay)
8. **M8** polish: headless playthrough (spawn → intro → ice teach →
   crevases → sigil → gate → spire → porthole → throne trigger → boss
   both stages → ending → rainbow), wind/ice scripted tests, final
   snapshots, README level list

## Decisions (all confirmed)

1. **Theme A as level 7**: snow climb → spire interior → open-air
   throne; title **"The Peak"**; 6300 px; four zones.
2. **Wind as the signature mechanic**: a pure time function — 6 s calm /
   1 s telegraph / 3 s gust on a 10 s cycle, always from the east (a
   100 px/s west push on ground, no push while flying); every 4th gust
   is an updraft (flight lift +40 px/s, flight timer paused). Arrows
   unaffected.
3. **Ice patches in** (the L9 ingredient): near-zero friction, 0.6×
   steering, 1.3× max slide, momentum into jumps; three spans (two
   run-ups + the ice bridge over crevasse 2). The 150 px crevases stay
   plain-jumpable — the bridge is comfort, not the gate.
4. **One two-stage boss**: the rune on the pig's flank (8 hp, the pig
   hovers out of ground-arrow range at the arc top — jump-arrows, the
   swoop window, or flight) + the sorcerer on foot (8 hp: bolt/slam/
   seal column/fan). 16 hp total; the stage change is the finale
   moment.
5. **The pig survives** (bound victim): the rune fades, it walks off
   west and despawns — the bound-creature motif, on camera.
6. **No pearl in L7**: the rainbow (new exit kind, sealed → lit)
   replaces the pearl+arch pair; the `ending` state is L9's (L5
   precedent: the story, not a seal, ends the chain).
7. **The sigil key chain**: the black crystal in the ice block (arrow-
   only wake, +50, the relic pattern) opens the iron gate remotely (the
   L3 one-key-one-door pattern, no beat). The throne gate is unopenable
   — the boss's entrance trigger replaces the key.
8. **Roster**: frost hare ×4 (stompable, dart), ice wraith ×5 (mountain
   ×3 with wind-phase alpha, bound ×2 in the arena, freed by the
   boss's death); no biome reuse.
9. **The King's two beats**: the porthole's tactical hint (aim for the
   rune — it's not his work) and the ending twist (the wizard was only
   a lock; look up). Both mechanical: the first names the target, the
   second names the exit.
10. **The shield's penultimate appearance**: designated box at 5350,
    west of the throne gate, visible on the approach; reflected bolts
    damage the rune (the L2 rule).
11. **Starlight, not darkness**: the first starlit level — stars, a
    silver moon, falling snow, the spire silhouette, the sea of clouds
    under the arena; the only warm color is the spire's orbs. No
    visibility penalty — the wraiths' alpha is a clue, not a hide.
12. **The trilogy framing is set**: L7 breaks the Rune, L8 the Anchor
    (the Sky Citadel), L9 the Throne (the Frozen Throne, the `ending`
    state). The Frost Queen is the true source; the wizard was her
    warder.
