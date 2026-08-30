# Level 8 design — "The Sky Citadel"

Status: CONFIRMED (all 14 decisions; second of the 7–9 trilogy — the
**Anchor**. Spine context in `LEVEL7-DESIGN.md`).

## Concept

The rainbow out of the throne arena lands the player on a cloud island
above the cloud sea: the **Sky Citadel**, a vast stone-and-glass castle
adrift in **twilight** — the game's first non-night, non-day sky (deep
blue-violet, stars visible in the "day", the cloud sea far below). The
L7 rainbow's tail still streams off behind the spawn island. The citadel
is the Frost Queen's **Anchor**: the **Great Clock** at its heart keeps
the realm's freeze beating. The Queen has cut the clock's three
**mainsprings** loose (she is withdrawing from the sky, preparing to
come down); the **Warden** — an automaton of brass and starlight, bound
to the machine, the game's third bound creature — is still wound, and he
keeps the heartbeat.

The level is the game's first **rhythm level**: one global clock (a
chime on every beat, audible across the interior, the great pendulum
visible behind the walls). Everything mechanical moves *on-beat* — the
sliding gear platform, the sliding bookshelf, the pendulum bridge, the
sentinels' shields, the Warden's advance. The player learns the tempo by
ear and eye — and the Warden's weakness window is **off-beat** (0.6 s
after each chime his core glows as he resets). Sever the three springs
(the puzzle, each method different: aim / shelf-timing / arc-timing);
each one drops the hum a pitch, dims the lights a notch, slows the
gears — **the citadel winds down around you**. The Warden waits in the
observatory behind the gear door. Lay him to rest, take the pearl from
the astrolabe, and the floor trapdoor opens: a **flight dive** down
through the cloud shaft to the glacier below.

Carried in: bow, big, maxHp 4, hasFlight — all permanent.
`LEVELS[7] = { name: 'sky-citadel', make, carry: { hasBow: true, hasFlight: true } }`.

### Why this one is more interesting

- **A rhythm level**: one clock, everything on-beat, combat and
  traversal both read the same tempo. The dodge language the game has
  never had: *timing*, not just spacing. The chime is audible wherever
  the player is in the interior — the level keeps time for you, and the
  player learns to keep time with it.
- **A machine hub, inverted**: L6's winch *woke* the mire; here the
  puzzle *winds the citadel down*. Each severed spring drops the hum a
  pitch, dims the lights a notch, slows the background gears, and
  stretches the period — the level is dying around you, and the death
  is the point (the Queen is pulling her magic out of the sky).
- **The most interior level yet**: island, gate hall, library,
  clockwork atrium, observatory — one continuous walkthrough with the
  clock visible (the pendulum silhouette, the great gear, the clock
  face) or audible at every step.
- **The Warden is tragic, and his death is new**: he serves the machine,
  not the Queen; his beats are warnings, not taunts. On death he doesn't
  explode — he stops, his core dims to ember, he bows his head. A single
  low `toll`: the clock's last beat. The machine at rest.
- **The required spring**: the sliding bookshelf is a full-height wall —
  the *only* crossing of the library is the 2 s chime window, and the
  second spring sits on the dais just inside. One of the three springs
  is unskippable by design (the rhythm peak); the other two can be
  skipped and backtracked (no soft-lock).
- **The exit inverts L4**: L4's exit was a ceiling hole, open only to
  flight going *up*; L8's is a floor trapdoor, open only to flight going
  *down* — a flight dive into the cloud shaft. Walking in costs a heart
  (the standard pit rule); flying in ends the level.

## Layout (left → right, 6000 px wide, view 800×600, groundY 560)

```
x:     0     600            1900            3300             4600              6000
       ┌──────┬────────────────┬─────────────┬────────────────┬─────────────────┐
       │ISLAND│ GATE HALL      │ LIBRARY     │ CLOCKWORK      │ OBSERVATORY     │
       │rain- │ pendulum,      │ shelves,    │ ATRIUM         │ star-chamber,   │
       │bow 550│ spring 1 1510 │ grate 2200, │ clock face     │ gear door 4900, │
       │      │ (shelf 1470),  │ shelf wall  │ 3600, hub,     │ WARDEN 5300,    │
       │      │ sentinel 1300  │ 2520–2760,  │ pendulum       │ astrolabe 5450, │
       │      │ grate 1700 +   │ spring 2    │ bridge 3800–   │ trapdoor 5820,  │
       │      │ gear platform, │ 2620, moths │ 4200, spring 3 │ King 4650       │
       └──────┴────────────────┴─────────────┴────────────────┴─────────────────┘
```

Zones: `{0–600: 'skybridge'}, {600–3300: 'citadel'},
{3300–4600: 'citadel-deep'}, {4600–6000: 'observatory'}`.

Ground / pits (all ground kind `stone`; pit = the lava render with a new
recolor flag; falling in = 1 damage + respawn at last safe ground, the
standard pit rule):

```
ground:  0–1700 | 1850–2200 | 2350–2900 | 3050–3800 | 4200–5820 | 5940–6000
grate:   1700–1850 (150, `grate: true`)  — the gear platform
         2200–2350 (150, `grate: true`)  — the bookcase-top platform
         2900–3050 (150, `grate: true`)  — the bookcase-top platform
         3800–4200 (400, `grate: true`)  — the pendulum bridge
shaft:   5820–5940 (120, `shaft: true`)  — the trapdoor (solid while sealed)
```

### The island (0–600)

- The rainbow's **tail** streams off behind the spawn (upper-left of the
  sky, parallax 0.05, shimmer — the L7 rainbow's end point). The island
  rim: a stone edge with cloud wisps at its base. The cloud sea glows
  far below.
- Player spawns at x 60.
- **Intro beat** (one-shot, rect 40–240, fires on frame 1 — the spawn
  band), speaker **The Warden** (his first voice — the omen):
  - "YOU WALK THE CITADEL. THE ANCHOR IS WOUND DOWN. THREE SPRINGS LIE CUT LOOSE."
  - "I KEEP THE HEARTBEAT. I AM STILL WOUND."
  Two lines: the state of the level (springs cut — the Queen's doing)
  and the boss's presence (he is awake, and bound).
- **Safety bow box at 550** (ground, stomp-breakable): a death-restart
  drops the carried bow; springs 1 and 3 are arrow methods (spring 2
  can be touched).

### The gate hall (600–1900)

- The great hall: tall arched windows with the twilight sky, the
  **great pendulum silhouette** (parallax 0.3) swinging behind the
  walls at the clock's period — the visual metronome before the player
  meets anything mechanical. Floor lattices: a faint (alpha 0.15)
  pendulum silhouette visible through them — the metronome underfoot.
- **Spring 1** (the **first mainspring**: a thin wound brass coil,
  20×20, glinting) on the **high shelf** at (1510, groundY−226),
  reached by the chain `{1380, y groundY−110, w 90, kind: 'shelf'}` →
  `{1470, y groundY−200, w 90, kind: 'shelf'}` (each rise ≤ 110 px —
  inside the 130 apex), or flight. **Method: aim** — a jump-arrow from
  the second shelf, or a touch-pickup if you fly up.
- **Grate 1** (1700–1850): the **gear platform** — the first on-beat
  crossing. Two slots (x 1700 and x 1770, 60 px wide, y groundY−6): on
  each chime the platform slides one cell over 0.5 s (carrying the
  player if they stand on it), holds until the next chime, then slides
  back. Cross while it is still (or ride the slide — 60 px in 0.5 s is
  gentle). A running jump also clears the 150 px grate — the platform
  is the teach, not the gate.
- **Sentinel at 1300** (band 1150–1650) — the chime teach: its shield
  comes up *on* the chime, so the first thing the player learns is
  "the tick means something."
- Boxes: 800 gem, 1300 star, 1800 heart.

### The library (1900–3300)

- The bookshelf forest: tall shelf silhouettes with book spines
  (dressing), lamps every ~300 px (the moths' anchors).
- **Grate 2** (2200–2350): a bookcase-top platform `{2260, y groundY−6,
  w 70, kind: 'shelf'}` (static). **Grate 3** (2900–3050): the same at
  `{2960, y groundY−6, w 70, kind: 'shelf'}`.
- **The bookshelf wall** (2520–2760, full height): solid bookcase
  except a 120 px opening (2600–2720) covered by a **sliding bookcase
  panel** (120 px wide). On each chime the panel slides open over 0.4 s,
  holds open 1.2 s, slides shut over 0.4 s — a 2 s window, then closed
  until the next chime. **This is the library's only crossing** (the
  wall is full height — flight does not help): the level's one
  **required** spring beats here. **Spring 2** (the **second
  mainspring**) sits on a low bookcase dais `{2600, y groundY−24,
  w 60, kind: 'shelf'}` just inside the opening — step through the
  window, take it (touch or point-blank arrow), step out. **Method:
  shelf-timing.** No crush (house rule): if the panel is closing while
  the player overlaps the opening, its close is delayed until they clear.
- The clock-hub beats live just past the library — see Beats.
- Boxes: 2300 boots, 2800 magnet, 3200 **mystery** (purple, swirled —
  one per level, the house rule).

### The clockwork atrium (3300–4600)

- Darker (the `citadel-deep` palette), machinery close: the **great
  gear** (a 500 px brass gear silhouette, parallax 0.5, rotating at a
  speed ∝ (4 − springs cut) — the gears slow as the springs are cut),
  and the **clock face** on the far wall at 3600 (a 200 px brass face;
  its hand sweeps one revolution per period — the hub's anchor).
- **The clock hub** (beat zone 3550–3850, in front of the clock face) —
  see Beats.
- **The pendulum bridge** (3800–4200, the set piece):
  - Two static platforms: `{3830, y groundY−6, w 70, kind: 'pend'}` and
    `{4100, y groundY−6, w 70, kind: 'pend'}` (a 200 px gap between them
    — a full jump; flight is the comfort).
  - The **arm**: pivot at (4000, y 100), a 420 px rod (brass, 14 px
    wide) with a blade at the tip. It swings ±40° with the clock's
    period — **the chime rings at the bottom of the swing** (the master
    clock's own pendulum, made visible). At the bottom the rod hangs
    vertical over the gap's center — a moving wall that blocks the
    crossing (a jump through x ≈ 4000 near the chime hits the rod);
    at the ends (±40°, a quarter and three-quarters into each period)
    the rod is out at x ≈ 3722 / 4278 and the crossing is clear. The
    pendulum slows at the ends — the **end dwells (~0.8 s each) are the
    safe beats**.
  - **Spring 3** (the **third mainspring**) on a fixed brass hook at
    (4050, 460): a **jump-arrow from either platform's inner edge, at
    the apex** (apex ≈ 430 — the arrow's line at y ≈ 450–460 clears the
    rod when it is at an end; near the chime the rod crosses the line
    and the arrow sparks off it, `deflect`), or flight. **Method:
    arc-timing.**
- A running jump cannot clear the 400 px gap — the two platforms are
  the path (or flight). The bridge is the level's rhythm climax: the
  chime says *danger* (rod vertical), the end dwells say *go*.
- Box: 4200 heart (just past the bridge).

### The observatory (4600–6000)

- The glass star-chamber: open ceiling (the twilight sky, denser stars
  — higher is clearer), the **star map** inlaid in the floor (brass
  lines, gem points, a faint glow), the cloud sea dropping away beyond
  the rim, brass railings at the rim (4600–4650, 5940–6000). The
  astrolabe's pedestal and the Warden are the only things in the room.
- **The rim ledge** `{4650, y groundY−80, w 60, kind: 'pend'}`: after
  the pearl is taken, **the King's silhouette** appears on it (a small
  figure, `grant` chime — he has come with the rainbow; he waits at the
  shaft's lip — see the Ending). A world-pass decoration, no collision.
- **The gear door** (4900, full height, door kind `gearDoor`):
  interlocking brass gears, a dark seal at its hub. **Sealed until
  spring 3 is cut**: on the cut, the seal breaks (`seal` chime), the
  gears mesh and retract into the wall's edges over 1.2 s (`gear` +
  `clank`), and the door never re-locks (the L6 retreat-pocket rule —
  the arena's west end stays an off-ramp). Walking up to a sealed door:
  nothing (the seal's faint glow is the cue; the hub beats say what
  feeds it).
- **The arena** (4900–5950, ~1050 px): the **Warden** at 5300 (patrol
  band 5100–5800) — see the boss. His arena beat (c3) fires in the
  trigger band 4900–5150 on first entry with all three springs cut.
- **The astrolabe** (5450): a brass ring instrument on a pedestal
  `{5430, y groundY−40, w 60, kind: 'pedestal'}`; the **pearl** appears
  on it (5450, groundY−56) when the Warden is laid to rest —
  `pearl.showWhen: enemies => warden dead` (the L2/L4 pearl pattern;
  the machine level keeps the seal language).
- **The trapdoor** (5820–5940, a 120 px floor section, brass rim with a
  star pattern): sealed (flush, a faint glow) until the pearl is taken;
  then the lid swings down into the floor (`seal` chime) and the shaft
  below is open — a cloud-shaft glow (`shaft: true` recolor, swirling
  mist). **A walker falling in = the standard pit rule** (1 damage +
  respawn); **the exit is entering the shaft rect while flying** (the
  L4 ceiling-hole rule inverted: a flight dive down). Exit rect
  `{5820, y groundY, w 120, h 100, flightOnly: true}`.
- Boxes: 4700 star (at the rim, on the approach), 5050 **shield**
  (designated — just inside the gear door, visible as it grinds open:
  the last boon before the Warden; reflected chime bolts damage him —
  the mirror shield's **final appearance** in the game), 5600 heart
  (pre-fight boon, in the arena, the L4/L6 pattern).

## The Great Clock (signature mechanic)

One global clock — `lvl.clock = { t: 0, period: 6.0 }` — a small
accumulator, not a pure function (the L6 `vent.t` pattern):

```
each frame:  clock.t += dt
when clock.t >= clock.period:
    clock.t -= clock.period
    chime:  sfx (see below) + visual pulse
    clock.period = 6.0 + 0.8 · cuts      // cuts = mainsprings severed
beat = clock.t / clock.period            // 0 at the chime, 1 just before
```

- **The chime** (new sfx): a two-note bell (1244 Hz + 622 Hz, sine,
  0.3–0.4 s decay) over a low drone (55 Hz · (1 − 0.06·cuts), 0.5 s,
  quiet) — the hum, carried by the chime itself. Audible in the three
  interior zones; in the skybridge a distant variant (the drone
  omitted). **The pitch drops 6% per spring cut** — the hum dropping a
  pitch, audible everywhere.
- **Visual pulse**: window glow and brass trim brightness +0.15 for
  0.3 s after each chime (a pure read of `clock.t < 0.3`).
- **The period stretches with each cut**: 6.0 → 6.8 → 7.6 → 8.4 s.
  The player re-adapts by ear, not by memorized seconds — the chime is
  the teacher. By the third cut the citadel's heartbeat has slowed
  almost to a crawl (and at the Warden's death it stops — see the
  Ending).
- **Everything mechanical reads the clock** (one source of truth —
  `beat`, `clock.t`, `clock.period`):
  - the **gear platform** (grate 1): slides one cell in the first 0.5 s
    after each chime, holds, slides back next chime (carries the player);
  - the **bookshelf panel** (library): open 0.4 s + 1.2 s hold after
    each chime, closed the rest;
  - the **pendulum arm** (bridge): angle = 40°·sin(2π·beat) — vertical
    (blocking) at the chime, at its ends (clear) a quarter and
    three-quarters into the period, the end dwells ~0.8 s;
  - the **sentinels**: shields up for the 1 s after each chime;
  - the **Warden**: advances on each chime; P1 attacks start on the
    chime; his reset window is the 0.6 s after the chime.
- **The living don't keep time**: the moths drift on their own Lissajous
  — the contrast is the point (machines keep time, creatures don't).

## The mainsprings (the puzzle)

`lvl.springs = [false, false, false]` — `cuts = springs.filter(Boolean).length`.

Three thin wound brass coils (20×20, glinting — the L6 glint pattern),
**one arrow severs each** (or a touch-pickup while adjacent — both
sever): the coil unspools in a spiral of brass particles, `spring` sfx
(new: three short descending square blips 880→660→440 + a `pop` tail),
sparkle burst, **+50 score**, `relic` chime (the relic pattern).

- **Spring 1** (gate hall, 1510, the high shelf): method **aim**
  (jump-arrow or touch from the shelf; skippable — backtrack allowed).
- **Spring 2** (library, 2620, the dais inside the bookshelf wall):
  method **shelf-timing** (the wall is the only crossing — **the
  required spring**; taking it is a step through the window you must
  time anyway).
- **Spring 3** (atrium, 4050, the pendulum hook): method **arc-timing**
  (jump-arrow on the end dwells, or flight; skippable — the gear door
  is the real gate, so skipping it costs a backtrack to the atrium).

**Each sever winds the citadel down** (all pure reads of `cuts`):
the chime pitch −6%, the light level dims a notch (window/trim glow
alpha 1.0 − 0.2·cuts), the great gear and background machinery slow
(speed ∝ (4 − cuts)/4), the period stretches +0.8 s. The third cut
grinds the gear door open (the observatory is reachable) — the world
responds to progress, the L6 "the mire wakes" beat inverted: **the
citadel dies**.

No soft-lock: every state has a reachable next spring (or a backtrack);
the hub beats always say where (see Beats).

## The beats

**Intro** (island, one-shot, frame 1): the Warden — see the island
section.

**The Great Clock hub** (zone 3550–3850, speaker **The Great Clock** —
a low mechanical voice, the winch pattern):

- `c0` — `repeat`, `when: cuts === 0`:
  - "THE HEARTBEAT FADES. THREE SPRINGS LIE CUT LOOSE — THE QUEEN'S HANDS, OR HER WARDEN'S. I CANNOT TELL."
  - "THE FIRST SLEEPS HIGH IN THE GATE HALL. THE SECOND BEHIND THE LIBRARY SHELF — THE SHELF OPENS WITH THE CHIME. THE THIRD IN MY OWN SWEEP."
- `c1` — once, `when: cuts === 1`:
  - "ONE SPRING ANSWERS. THE HUM DROPS. THE LIGHT DIMS. THE HEARTBEAT SLOWS."
- `c2` — once, `when: cuts === 2`:
  - "TWO. THE PENDULUM STRETCHES ITS SWING. SOON THE CITADEL SLEEPS — AND SO DO I."

**The Warden's arena beat** (zone 4900–5150, speaker **The Warden**,
once, `when: cuts === 3`, `onOpen`: the Warden becomes hostile, `boss`
sfx — his eyes light):

- "THREE SPRINGS. THE ANCHOR IS BROKEN. BELOW, SOMETHING MORTAL WAKES — AND I AM STILL WOUND."
- "THEN FIGHT, LITTLE QUEEN. I AM STILL WOUND."

## The Warden (boss)

kind `warden`, spawn (5300), patrol band 5100–5800. 60×64, **16 hp**,
**arrow-only** (stomp bounces off brass — the dragon rule), 16 pips in
two rows of 8. He is a *ground* boss who **moves only on the clock**: a
slow 0.3 s slide of **40 px toward the player on each chime** (60 px in
phase 2) — metronomic, eerie; you cannot out-run him over a long fight,
which paces the duel. Between chimes he stands and attacks. He is the
machine, not the Queen's creature — his beats are warnings, and his
rest is mercy.

### The reset window (the rhythm's payoff)

For **0.6 s after each chime** the Warden resets: his core glows bright
cyan (a soft pulse — readable from anywhere in the arena), and **arrow
hits deal 3 damage instead of 1** (the core is exposed). Outside the
window arrows deal 1 (the house rule) — the brass takes them. **A
reflected chime bolt deals 1 at any time** (his own magic bypasses his
brass — the L2 mirror rule; the shield box at 5050 is the steady-damage
route, timing is the burst route). **Star arrows are full power at any
time** (the house star rule). The window is 0.6 s of a 6–8.4 s period —
7–10% uptime — so the fight is a rhythm: wait for the tick, strike the
glow, retreat.

### Attacks

- **Gear slam** (the troll pattern): 0.5 s wind-up (crouch, arm raised,
  a `clank` tick) → ground slam (`thud`, shake(4, 0.2)) → two radial
  **shockwaves** run the floor (180 px/s, 14 px tall, 1 damage, 2.5 s
  life, despawn at the arena ends).
- **Chime bolt**: 0.8 s charge (arm extends, the core glows building —
  started 0.8 s before a chime) → **fires ON the next chime**: a
  three-bolt fan aimed at the player (±15°, 240 px/s, 14 px, 1 damage
  each — the fireball pattern, retinted cyan; the tick tells you the
  shot is coming). **A stagger during the charge cancels it** (the
  charge fades) — the house stagger rule made tactical.
- **Pendulum sweep** (phase 2 only): 0.8 s telegraph (his arm extends a
  120 px brass blade; a brass arc line glows across the arena at floor
  level) → the blade sweeps the arena in 0.6 s (400 px/s, 1 damage) →
  0.5 s retract. The arc line tells you exactly what to stand off.
- **Phases**: phase 1 (16→9): gear slam 45 / chime bolt 55, idle 1.0–
  1.5 s, **attacks start on the chime** (he is a machine — he acts on
  the beat). Phase 2 (≤8 hp): gear slam 30 / chime bolt 35 / pendulum
  sweep 35, idle 0.6–1.0 s, **attacks start on the off-beat** (a quarter
  and three-quarters into the period — the double tempo), and the
  chime-advance grows to 60 px. His core's idle glow intensifies (the
  phase-cue house pattern).
- **Stagger on hit** (house rule): 0.3 s pause + flash — the micro-
  window inside the rhythm.

### Death — the machine at rest

No burst, no shake. He **stops mid-pose**; his core **dims to ember
over 1.5 s**; he **bows his head** (0.8 s); a single low **`toll`** (new
sfx: 110 Hz sine 1.4 s decay + 55 Hz square undertone 1.6 s — the
clock's last beat). Then the level answers: the background gears stop
(angular speed → 0), the lights dim one final notch, the pendulum
silhouette behind the hall slows to a halt (the period → ∞; `clock.t`
freezes — the chimes stop). He remains as a **statue** (slumped pose,
ember core, non-solid — arrows pass through; the player walks past him
to the astrolabe). The **pearl appears** on the astrolabe 1 s after the
bow (`pearl` sfx). The bound-creature motif, third note: the pig was
released, the Warden is laid to rest.

## New regular enemies

**Sentinel** — 40×44 hitbox (drawn as a small brass automaton, a starlight
core in the chest), **2 hp**, **stompable** (gear-burst death) and
arrow-killable, contact 1 damage. Walks its band at 25 px/s (turns at
bounds, the slime shape). **The shield phase**: for the **1 s after each
chime** a brass shield is raised in front (front arrows spark off —
`deflect`, no damage; a stomp or a rear arrow still lands). Off-beat the
shield is down (exposed). **Chest bolt**: on each chime, if the player
is within 140 px and the cooldown (4 s, seeded) is done, a bolt fires
from his chest over the shield's edge 0.3 s after the shield rises
(240 px/s, 14 px, aimed, 1 damage) — *the chime is danger*: the tick,
the shield, the bolt, all on the same beat. New `src/enemies/sentinel.js`,
self-registers. Roster (4): (1300, band 1150–1650, **the teach**),
(2150, band 1950–2400), (2750, band 2550–3000), (3450, band 3350–3750).

**Clockwork moth** — 20×16 hitbox (drawn as a brass-and-silk moth, a
faint cyan glow in the wings), **1 hp**, **stompable** (spark burst) and
arrow-killable, contact 1 damage. A lazy **Lissajous drift** around its
lamp (seeded amplitudes 40–70 px — the living-don't-keep-time contrast);
when the player is within 120 px: **dart** (0.4 s at 200 px/s aimed at
the player), 0.8 s hover, cooldown 2.5 s (seeded). New
`src/enemies/moth.js`, self-registers. Roster (5): (1000, y 380),
(2000, y 360), (2500, y 350), (3100, y 370), (3950, y 360 — the last
over the pendulum bridge, its lamp on the pivot housing: the crossing's
extra beat).

No slimes, bees, hares, wraiths, or anything from any earlier biome —
citadel machines and the machines' own fauna only (the L5/L6/L7 biome
rule).

## Twilight and gears — art, not mechanics

Four new zone kinds in `src/render/zones.js`:

- **`skybridge`** (0–600): the **twilight** sky gradient (deep
  blue-violet `#1a1836` → `#2c2a52`) — stars visible in the "day" (the
  level's signature); **the rainbow tail** (a faint multicolored band
  across the upper-left sky, parallax 0.05, shimmer — the L7 rainbow's
  end point, streaming off west behind the spawn); **the cloud sea** far
  below (a soft white-lavender band at the view's bottom, parallax 0.1,
  slow horizontal drift, pure time function); the island rim (a stone
  edge, cloud wisps at its base).
- **`citadel`** (600–3300): the interior — deep blue-violet stone
  (walls `#221c3e`), tall arched windows (every ~400 px) with the
  twilight sky and cloud sea visible; brass trim; **the great pendulum
  silhouette** (parallax 0.3: a huge dark arm + a brass weight, swinging
  behind the hall at the clock's period — the visual metronome; its
  angle is a pure read of `clock.t`); floor lattices (a faint alpha 0.15
  pendulum silhouette through them — the metronome underfoot); floating
  dust motes (6, seeded slow drifts, faint warm).
- **`citadel-deep`** (3300–4600): the same one shade darker
  (`#191330`), machinery close: **the great gear** (a 500 px brass gear
  silhouette, parallax 0.5, rotating at speed ∝ (4 − cuts)/4 — slowing
  as the springs are cut; stopped at the Warden's death), **the clock
  face** on the far wall at 3600 (a 200 px brass face, its hand sweeping
  one revolution per period), the pivot housing (4000), the bridge's
  platforms and arm.
- **`observatory`** (4600–6000): the glass star-chamber — open ceiling
  (the twilight sky, denser stars: higher is clearer), **the star map**
  inlaid in the floor (brass lines, gem points, a faint glow), the cloud
  sea dropping away beyond the rim (vertigo), brass railings at the rim
  (4600–4650, 5940–6000), the astrolabe.

World pass (dressing, no collision), new `src/render/citadel.js`: the
island rim + rainbow tail (skybridge); the windows + the bookshelf
forest (tall shelf silhouettes with book spines — the library); **the
bookshelf wall** (2520–2760, the sliding panel, the spring dais);
**the lamp** (a small brass lantern — the moths' anchors, every ~300 px
in the library, one on the bridge's pivot housing); **the gear door**
(4900, a full-height wall of interlocking brass gears, a dark seal at
the hub; open state: the gears meshed and retracted into the wall's
edges, the 1.2 s `gear` anim); **the astrolabe** (5450, brass ring
instrument on the pedestal); **the trapdoor** (5820–5940, brass rim +
star pattern; sealed: flush with a faint glow; open: the lid swung down
into the floor, the `shaft` cloud-shaft glow + swirling mist below);
**the King's silhouette** (on the rim ledge 4650, a small figure,
appears after the pearl, `grant`); **the Warden's statue** (slumped
pose, ember core, non-solid); the pendulum arm + rod (the bridge's
moving wall); the dust motes.

Ground/platform kinds: `stone` (reused; the zone palette tints it). New
platform kinds: **`gear`** (a brass plate, gear teeth on its edges, a
faint glow — the sliding grate platform), **`shelf`** (a bookcase top:
wood + spines — the grate-2/3 crossings and the spring dais), **`pend`**
(a brass plate with rim rivets — the bridge platforms and the rim
ledge), **`pedestal`** (a stone base with a brass ring — the
astrolabe's plinth). New pit recolor flags on the lava render:
**`grate: true`** (a dark opening `#0d0b1e`, a pale blue-lavender glow
far below — the cloud sea 200 px down, a brass rim at the edge) and
**`shaft: true`** (a deep cloud-shaft glow `#3a3560`, swirling mist —
the trapdoor's open state).

**No visibility penalty** — the twilight is atmosphere, not a
light-radius mechanic (the L5/L6/L7 "fairness first" rule): the interior
is lit, and the light level tracks *spring progress* (a reward for
breaking the anchor, dimming toward rest), never hiding a threat. Every
mechanical hazard is telegraphed on the clock the player can hear.

## Loot boxes

Existing pool only, 12 boxes. No heartcap (owned), no shield beyond the
designated one (its final appearance), no bow beyond the safety box.

550 **bow** (safety #1, the island), 800 gem, 1300 star, 1800 heart,
2300 boots, 2800 magnet, 3200 **mystery** (purple, swirled — one per
level, the house rule), 3700 gem, 4200 heart, 4700 star, 5050
**shield** (designated — reflects the chime bolts; the mirror shield's
final appearance), 5600 heart (pre-fight boon, in the arena).

## Enemies summary

- Sentinels ×4 (2 hp, chime-shield, chest bolt; stompable).
- Clockwork moths ×5 (1 hp, Lissajous + dart; stompable).
- The Warden (16 hp, on-beat advance, reset window, power-down death).
- No fauna reuse from any earlier biome.

## Ending sequence

1. The Warden's last hit → he stops, the core dims to ember (1.5 s), he
   bows his head (0.8 s), the single low `toll`. The background gears
   stop, the lights dim one final notch, the chimes stop — the machine
   at rest.
2. The **pearl appears** on the astrolabe (1 s after the bow, `pearl`
   sfx).
3. Take the pearl → the seal breaks → **the King's silhouette appears**
   on the rim ledge (`grant`) → the **shaft-lip beat** (one-shot, rect
   5700–5820, fires on first entry with the pearl taken), speaker **The
   Unicorn King**:
   - "The anchor is broken. Her magic is her own again — smaller, mortal."
   - "Go down. Finish it."
   (He is coming with you now — the silhouette on the rim is him; L9 is
   the glacier below.)
4. **The trapdoor opens** at 5820 (the lid swings down, `seal` chime).
5. **Fly down** into the shaft (a flight dive — the L4 ceiling-hole
   inverted) → standard level-complete overlay → level 9, the Frozen
   Throne.

## New systems (input to the phased plan)

1. Level 8 data (`createLevel8`) + `LEVELS` registration (index 7,
   `carry: { hasBow, hasFlight }`)
2. Zones `skybridge`/`citadel`/`citadel-deep`/`observatory` (twilight
   sky, stars, rainbow tail, cloud sea, pendulum silhouette, great gear,
   clock face, star map) + platform kinds `gear`/`shelf`/`pend`/
   `pedestal` + pit recolors `grate`/`shaft` + world pass
   (`src/render/citadel.js`)
3. The Great Clock (`lvl.clock` accumulator, the period stretch, the
   chime sfx + pitch drop, the visual pulse) + the on-beat platform
   kinds (the gear platform slide + carry, the bookshelf panel + no-
   crush, the pendulum arm/rod + end dwells)
4. The mainsprings (sever on arrow/touch, +50, the unspool particles,
   the citadel-dim state: chime pitch, light level, gear speed, period)
5. The beats (the Warden's intro, the Great Clock hub c0–c2, the Warden's
   arena beat c3 + the hostility flip)
6. Sentinel + clockwork moth (chime-shield + chest bolt; Lissajous +
   dart)
7. The Warden boss (`src/enemies/warden.js`: the chime advance, the
   reset window, gear slam/shockwaves, chime bolt (fires on the chime,
   stagger cancels), pendulum sweep (P2), the off-beat P2 tempo, the
   power-down death + the level's clock-stop)
8. The gear door (sealed → gears retract on the third cut) + the
   astrolabe + the pearl (`showWhen: warden dead`)
9. The trapdoor exit (sealed → open on the pearl; the `flightOnly` win
   check; the standard pit for walkers) + the King's silhouette + the
   shaft-lip beat
10. FX + audio: new `chime`, `spring`, `toll`; reuses `gear`, `clank`,
    `clatter`, `thud`, `deflect`, `seal`, `pearl`, `boss`, `bossHit`,
    `crack`, `fireball`, `hurt`, `land`, `relic`, `grant`, `dialog`
11. Tests + render snapshots + headless full playthrough

## Phased build (one subsystem per turn, tests + smoke green after each)

1. **M1** level data + zones + ground/grates + boxes + world pass (the
   pendulum silhouette swings, the gear turns, the star map glows) + the
   gear door sealed + the trapdoor sealed — walkable end-to-end to the
   gear door (flight over the grates; the bookshelf wall temporarily
   non-solid until M2); no clock mechanics, springs, or enemies
2. **M2** the Great Clock (accumulator, the chime, the pulse) + the on-
   beat crossings: the gear platform (grate 1), the bookshelf panel
   (grate wall, the required crossing, no-crush), the pendulum bridge
   (arm/rod, the end dwells) — the bookshelf wall becomes solid (the
   only way through is the window)
3. **M3** the mainsprings (the three coils, sever/touch, +50, the
   unspool, the citadel-dim state) + the beats (the Warden's intro, the
   Great Clock hub c0–c2)
4. **M4** sentinels + moths
5. **M5** the gear door's open (third cut) + the astrolabe + the Warden's
   arena beat + the trapdoor (sealed → open on the pearl) — the Warden
   is a static placeholder until M6
6. **M6** the Warden boss (both phases, all attacks, the reset window,
   shield reflection, the off-beat P2 tempo, the power-down death + the
   clock stop, the pearl `showWhen`)
7. **M7** the ending (the toll, the gears stop, the King's silhouette +
   the shaft-lip beat, the `flightOnly` dive, the overlay)
8. **M8** polish: headless playthrough (spawn → intro → s1 → hub c1 →
   s2 (the wall) → hub c2 → bridge → s3 → gear door → Warden beat →
   fight both phases → death → toll → pearl → lip beat → fly down),
   scripted clock/spring tests (the period stretch, the panel window,
   the rod's blocking arc, the reset window's damage), final snapshots,
   README level list

## Decisions (all confirmed)

1. **Theme B as level 8**: the Sky Citadel — a floating castle in
   twilight; title **"The Sky Citadel"**; 6000 px; four zones
   (skybridge/citadel/citadel-deep/observatory). L8 breaks the
   **Anchor** of the trilogy.
2. **The Great Clock is the signature**: one accumulator (`t`,
   `period = 6.0 + 0.8·cuts`), the chime at `t = 0` (two-note bell +
   low drone, pitch −6% per cut, audible across the interior), the
   visual pulse; every mechanical element reads the same clock (the
   gear platform, the bookshelf panel, the pendulum rod, the sentinels,
   the Warden's advance/attacks). The living (moths) don't keep time —
   the contrast is the point.
3. **On-beat is danger, off-beat is the window**: the rod blocks the
   bridge near the chime (the safe beats are the ~0.8 s end dwells a
   quarter and three-quarters into the period); the bookshelf opens on
   the chime; the sentinel's shield is up for the 1 s after the chime
   (and its bolt fires with it); the Warden advances on the chime and
   his reset window is the 0.6 s after the chime (core glows, arrow
   damage 3; else 1; a reflected bolt 1 any time; stars full power
   any time).
4. **The puzzle is three mainsprings**: 1 arrow each (or touch), +50,
   the `relic` chime, the unspool particles; methods **aim** (s1, high
   shelf, skippable), **shelf-timing** (s2, the bookshelf wall — the
   level's one required spring, the library's only crossing), **arc-
   timing** (s3, the pendulum's end dwells, skippable). Each sever:
   chime pitch −6%, light level −0.2 alpha, gear speed ∝ (4−cuts)/4,
   period +0.8 s — the citadel winds down around you.
5. **The Warden**: 60×64, 16 hp, arrow-only (stomp bounces — the dragon
   rule), the chime-advance (40 px; 60 in P2), gear slam + shockwaves,
   chime bolt (a three-bolt fan on the next chime; a stagger cancels
   the charge), pendulum sweep (P2), P2 at ≤8 hp (off-beat attacks +
   sweep + the 60 px advance), the 0.3 s stagger, the **power-down
   death** (stop, ember fade 1.5 s, bow 0.8 s, a single low `toll`, the
   gears stop, the chimes stop, the final dim — no burst, no shake; he
   remains a non-solid statue).
6. **Regular enemies**: sentinel ×4 (2 hp, stompable, the chime-shield,
   the chest bolt at 1 s after the chime when close + cooldown done) and
   clockwork moth ×5 (1 hp, stompable, the Lissajous around its lamp,
   the 120 px dart); no fauna reuse — citadel machines and the
   machines' own fauna only.
7. **The hub is the Great Clock** (a machine voice, the winch pattern:
   c0 repeat / c1 / c2, the hub zone 3550–3850); the Warden's voice is
   the intro (the omen: "I AM STILL WOUND") and the arena beat (c3,
   when 3 springs cut — `onOpen` flips him hostile, `boss` sfx).
8. **The gear door** (4900, kind `gearDoor`): sealed until the third
   cut → the seal breaks, the gears retract over 1.2 s (`gear` +
   `clank`), never re-locks (the retreat pocket).
9. **The pearl stays on the astrolabe** (5450, `showWhen: warden dead`
   — the machine level keeps the seal language; L7 and L9 drop the
   pearl, L8 keeps it).
10. **The exit is a floor trapdoor** (5820–5940): sealed (solid) until
    the pearl → opens; a walker falling in = the standard pit rule (1
    damage + respawn); the win check is the shaft rect + `flightOnly`
    (the L4 ceiling-hole inverted: a flight dive down).
11. **The ending**: the toll → the gears stop → the pearl → take it →
    the King's silhouette on the rim + the shaft-lip beat ("The anchor
    is broken… Go down. Finish it.") → fly down → overlay → level 9.
12. **Loot**: 12 boxes — 550 **bow** (safety), 5050 **shield**
    (designated; reflected chime bolts damage the Warden; the mirror
    shield's final appearance in the game), 5600 heart (pre-fight boon),
    3200 **mystery** (one per level), no heartcap (owned).
13. **Twilight, not night**: the first twilight level (deep blue-violet,
    stars visible in the "day", the cloud sea below, the rainbow tail
    behind) — the palette break after L7's starlit night; no visibility
    penalty (the light level tracks spring progress, never hides a
    threat; every mechanical hazard is telegraphed on a clock the player
    can hear).
14. **The trilogy holds**: L8 breaks the Anchor; the Warden is the third
    bound creature (laid to rest, not destroyed — the motif: the pig
    released, the Warden rested, the Queen brought down in L9); the
    King's line sets up L9 (her magic is her own again — smaller,
    mortal).
