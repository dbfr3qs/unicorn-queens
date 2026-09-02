# Level 8 — "The Sky Citadel" — Phased Build Plan

**Status: PENDING (M1–M8).** Design: LEVEL8-DESIGN.md (confirmed). House format per
LEVEL7-PLAN.md. One phase = one commit.

House gate after every phase: `npm test` green, `npm run smoke` green, and the L1–7
render-snapshot md5s unchanged — **except M8**, which adds the L8 scenarios (a purely
additive snapshot diff, verified against the saved snap).

## Build ledger

Ticked as each phase lands (the commit is the gate's proof):

- [x] **M1** — level data + zones + citadel world pass (walkable to the sealed gear door)
- [x] **M2** — the Great Clock + on-beat traversal (gear platform, bookcase wall, pendulum bridge)
- [x] **M3** — the three mainsprings + intro/hub beats
- [x] **M4** — the Sentinels + the clockwork moths
- [x] **M5** — gear door + astrolabe + arena beat + trapdoor
- [ ] **M6** — the Warden boss
- [ ] **M7** — the ending (rest, the King's silhouette, the flight dive)
- [ ] **M8** — snapshots + headless playthrough + README

## Existing systems (reused unchanged)

- **player.js** — flight (FLIGHT_TIME 10 / FLIGHT_CD 15, carried from L7), the pit rule
  (y > lvl.height → 1 dmg + respawn at safeX/safeY), the bow (carried).
- **arrows.js** — fireArrow / fireStarArrow, viewport culling, star pierce-2, the
  sigil/bush level-block pattern (M3 adds a spring block beside it; M6 adds the
  hit-value hook call — both additive, see deviations 13–14).
- **projectiles.js** — fireFireball (aimed 1-dmg bolt), fireShockwaves (ground waves),
  the reflected-bolt boss path (M6 adds 'warden' to the list + a `cyan` retint flag).
- **door.js** — multi-door state machine + resolveDoor side pushback (M1/M2 add three
  new kinds to STAYS_OPEN).
- **pearl.js** — updatePearl / showWhen / exit unlock, unchanged. L8's `exit.locked`
  gates the trapdoor lid (M5/M7).
- **loot.js / boxes** — the 12-box list, the mystery box, the shield drop (all drop
  kinds already exist).
- **dialogue.js / checkDialogs** — proximity bands, beat-level `when` on the entry
  edge, `repeat`, `onOpen` hooks (L5/L7 precedent).
- **enemies.js / registry** — spawn, roster, updateEnemies, hitPlayer, stomp with the
  L7 per-kind `stompSound` / `stompFx` override.
- **game.js** — update order, reachedExit (standard — no new flag; deviation 1).
- **render/index.js + render-harness.js** — world-pass line; freshGame1–7 unchanged
  (M8 adds freshGame8).

## New systems (and deviations)

1. **`src/clock.js` — the Great Clock** (M2): one accumulator
   `lvl.clock = { t, period, chimeCount, stopped, gearRot }`; the chime on each wrap;
   drives the gear platform, the bookcase panel, and the pendulum rod — all pure
   reads of `t` / `chimeCount` + the carried `gearRot`. Period = 6.0 + 0.8·cuts.
2. **`src/springs.js` — the mainsprings** (M3): three severable springs (touch or
   arrow), +50 each, each cut lengthens the period; exports the pure reads
   `periodFor`, `gearSpeed`, `lightLevel`, `chimePitch`.
3. **`src/enemies/sentinel.js`** (M4): 40×44, hp 2, shield up for the 1.0 s after each
   chime (front arrows spark off via a new registry hook `arrowBlocked`), chest bolt
   fired on the chime, stompable.
4. **`src/enemies/moth.js`** (M4): 20×16, hp 1, Lissajous drift around its lamp anchor,
   dart attack, stompable.
5. **`src/enemies/warden.js`** (M6): 60×64, hp 16, arrow-only, 16 pips (two rows of 8,
   spiderboss pattern), clock-locked attacks, 0.6 s post-chime reset window (arrows
   deal 3), two phases at 8.
6. **World pass `src/render/citadel.js`** (M1): island edge + rainbow tail, bookcase
   forest and wall, gear door, pendulum arm + rod, astrolabe, the King's silhouette
   (M7), the Warden's statue (M6+).
7. **Zone `drawCitadelZone`** (M1): four kinds (skybridge / citadel / citadel-deep /
   observatory) — twilight sky, sea of clouds, clock face, great gear (rotation from
   `clock.gearRot`), light level = 1.0 − 0.2·cuts.
8. **New platform kinds**: `gear` / `shelf` / `pend` / `pedestal` / `trapdoor`
   (render/level.js).
9. **New pit kinds**: `grate` / `shaft` (render/level.js recolor path).
10. **New FX**: `FX.springUnspool`, `FX.gearBurst`. **New sfx**: `chime` (bell + low
    drone, pitch −6% per cut), `chimeFar` (skybridge variant, bell only), `spring`,
    `toll`.

### Deviations from the design (documented up front)

1. **Flight-only exit = geometry, not a flag.** No `flightOnly` flag exists anywhere
   (L4 precedent: the ceiling hole is pure geometry). The shaft lip is a
   **trapdoor-lid platform** `{5820, 554, 120, 'trapdoor'}`; on pearl-taken it becomes
   `hidden: true` and the standard pearl path sets `exit.locked = false`. A walker
   into the open shaft takes the standard pit rule. `reachedExit` is unchanged.
2. **The bookcase wall = three door entries.** Two static full-height `bookwall` doors
   (2520–2600, 2720–2760; always locked → solid side-walls via resolveDoor) + one
   `shelfpanel` door (2600–2720, full height) whose state the clock flips between
   `locked` and `open`. The 0.4 s slides are render-only (frac from `clock.t`);
   solidity is binary at the window edge; **no-crush**: if the player overlaps the
   opening when the window ends, the panel holds open (`lvl.shelfPanel.held`) until
   they clear. `bookwall`, `shelfpanel`, `geardoor` join STAYS_OPEN.
3. **The gear platform slides 70 px** (slots 1700 ↔ 1770); the design's "60 px" line
   is superseded by its own slot x's.
4. **Warden death = `onZero` registry hook.** `damageEnemy` calls
   `k.onZero(e, fx, cam)` when present, else the standard death. Warden's onZero:
   `e.dead = true` immediately (pearl showWhen + hitPlayer skip work), `e.dyingT = 3.3`
   (1.5 s core-dim → 0.8 s bow → 1.0 s rest), the clock stops, no burst, no shake.
   `updateClock` decays `e.dyingT`; the toll plays at the 1.0 crossing; the pearl's
   showWhen = `e.dead && e.dyingT <= 0`. **The statue is drawn by the world pass**
   (drawEnemies skips dead entities).
5. **The Warden is "awake but calm"** = roster `sleeping: true` (no update, no
   contact) + the arena beat's `onOpen` wakes him. The draw shows him standing at
   attention (not coiled) — the intro's "I am still wound" is carried by the beat,
   not the pose.
6. **Shockwave ttl parameter**: `fireShockwaves(x, groundY, fx, ttl = SHOCK_TTL)`;
   the Warden's slams pass 2.5. Arena-edge culling comes free from the ttl (a 400
   px/s wave from 5300 reaches 4850/5750 and expires).
7. **`sfx(name, arg)`** — `arg` is an optional pitch multiplier (the `chime` case
   uses it; every existing case ignores it). `fx.play` is already the `sfx` alias.
8. **Chime bolts / sentinel bolts = fireFireball with a `cyan` flag** (retint in
   drawFireballs; no gameplay change).
9. **The pendulum sweep travels 240 px toward the player** (120 px blade @ 400 px/s
   for 0.6 s); the telegraph draws that 240 px floor band, not the whole arena.
10. **M1 draws the bookcase wall with the panel open** (non-solid until M2; the
    visual is passable from day one).
11. **Spring 2 sits on its dais**: `{2620, 516, 20, 20}` (dais top 536, spring bottom
    536 — standing on the dais touches it).
12. **Boxes 1800 and 2300 float over pits** (design as-is): pickups from the gear
    platform (slot 1770) and the 2260 shelf respectively — the timing pickups,
    intended.
13. **`arrowBlocked` registry hook** (M4): checked in updateArrows after the
    weak-point check; a true return consumes the arrow + deflect sfx + spark
    (stars: remember the hit and keep flying, weak-point pattern).
14. **`hitValue` registry hook** (M6): `damageEnemy(e, fx, cam, k.hitValue(e, a.star))`
    where `damageEnemy(e, fx, cam, mult = 1)` subtracts `mult` — default 1 keeps every
    existing kind byte-identical.
15. **M1's one-line snapshot diff**: registering level 8 flips the L7 win-overlay
    text from "press Space to play again" to "press Space for next level" (the
    overlay branches on a next level existing). Same structural diff as the
    L6→L7 transition; the L1–7 snapshots are otherwise byte-identical.
16. **(Superseded by 17) Bookcase-bay floor arch**: deviation 2's full-height bays
    (h = 560) made the panel opening (2600–2720) geometrically unreachable — the
    solid west bay (2520–2600) held the player at 2492 before the wall. The first
    fix proposed an 80 px floor arch (collision h = 480); it was never built.
17. **Bookcase bays removed from the doors array — scenery only**: the two `bookwall`
    bay entries (2520–2600, 2720–2760) are dropped entirely; `citadel.js` draws the
    bays from hardcoded geometry, independent of `lvl.doors`. The `shelfpanel`
    (2600–2720) is the wall's sole collision door: locked it holds the player at the
    panel face (2600 − w = 2572), open the player passes 2600–2720 and continues
    through the (now non-solid) 2720–2760 to open floor. All M1 render coordinates
    and the M2 test spec (2650 passes open; 2590 → 2572 locked) are preserved.
18. **M3 reuses clock.js's `clockCuts`/`lightLevel` and draws the springs in the
    world pass.** The M3 sketch defines `cuts()` and `lightLevel()` inside
    `springs.js`, but the plan's own note ("re-exported from clock.js (M3 switch)")
    points to clock.js as the single source of truth. So `springs.js` exports
    `cuts` as a thin alias of `clockCuts`, and the zone pass imports
    `lightLevel` + `clockCuts` from clock.js (identical output). Separately, the M3
    checklist omits drawing the springs, but M8's scenarios name "spring 1 on its
    shelves" / "dais + spring 2" and fairness-first requires a severable object to
    be visible — so M3 adds `drawSprings` to the `citadel.js` world pass (a pure
    read of `s.cut`: uncut = bright brass + cyan core charge, cut = dim slack coil).
19. **M4 deterministic seeding is from `e.x`, not a "reseeded spawn RNG".** The
    M4 sketch says the Sentinel `boltCd` and the moth's Lissajous A/B/T/φ are
    "seeded from the reseeded spawn RNG (house determinism)", but no such mechanism
    exists in the codebase — the house pattern is seeding from the spawn `e.x` via
    modular arithmetic (the hare's `e.dartCd = e.x % DART_CD`, the bee's
    `e.phase = e.x * 0.17`). So the Sentinel seeds `e.boltCd = (e.x % 40) / 10`
    (0–3.9 s, desyncing the four guards) and the moth seeds
    `A = 40 + (e.x % 31)`, `B = 18 + (e.x % 13)`, `T = 4 + (e.x % 21) / 10`,
    `φ = (e.x % 63) / 10`, `dartCd = (e.x % 25) / 10` — all at first update, no
    `Math.random`, fully reproducible per spawn x. (The moth's wing flap is likewise
    a pure function of the moth's own drift clock `e.t`, not `gameTime`.)

---

## M1 — level data + zones + world pass

**Goal**: the citadel exists, renders, and is walkable end-to-end to the sealed gear
door. No clock tick yet (static reads), no enemies, no springs active.

### - [x] 1. `src/levels/level8.js` — `createLevel8(viewH = 600)`

- width **6000**, groundY = viewH − 40 = **560**.
- zones (screen-space, parallax in the zone pass):

  | kind | span |
  |---|---|
  | `skybridge` | 0–600 |
  | `citadel` | 600–3300 |
  | `citadel-deep` | 3300–4600 |
  | `observatory` | 4600–6000 |

- ground (all `kind: 'stone'`):

  | span | area |
  |---|---|
  | 0–1700 | island + gate hall |
  | 1850–2200 | past the gear crossing |
  | 2350–2900 | library floor |
  | 3050–3800 | hub + atrium |
  | 4200–5820 | observatory deck |
  | 5940–6000 | the rim |

- pits (the lava list, each with a `kind`):

  | x | w | kind |
  |---|---|---|
  | 1700 | 150 | `grate` |
  | 2200 | 150 | `grate` |
  | 2900 | 150 | `grate` |
  | 3800 | 400 | `grate` |
  | 5820 | 120 | `shaft` |

- platforms (y = top):

  | x | y | w | kind | note |
  |---|---|---|---|---|
  | 1700 | 554 | 60 | `gear` | M2 slides it between slots 1700 ↔ 1770 |
  | 1380 | 450 | 90 | `shelf` | spring-1 shelf 1 |
  | 1470 | 360 | 90 | `shelf` | spring-1 shelf 2 |
  | 2260 | 554 | 70 | `shelf` | bookcase top (west) |
  | 2600 | 536 | 60 | `shelf` | spring-2 dais |
  | 2960 | 554 | 70 | `shelf` | bookcase top (east) |
  | 3830 | 554 | 70 | `pend` | bridge left |
  | 4100 | 554 | 70 | `pend` | bridge right (200 px gap) |
  | 4650 | 480 | 60 | `pend` | rim ledge (step up at the deck's west end) |
  | 5430 | 520 | 60 | `pedestal` | astrolabe plinth |
  | 5820 | 554 | 120 | `trapdoor` | **lid over the shaft** (deviation 1) |

- springs (data placed in M1; M3 activates them):

  ```js
  springs: [
    { x: 1510, y: 334, w: 20, h: 20, cut: false }, // above the second shelf
    { x: 2620, y: 516, w: 20, h: 20, cut: false }, // on the dais (deviation 11)
    { x: 4050, y: 460, w: 20, h: 20, cut: false }, // brass hook over the gap
  ],
  ```

- boxes (12, all 36×36 at groundY−36, `kind: 'box'`, `broken: false`):
  550 bow · 800 gem · 1300 star · 1800 heart (gear-slot pickup, deviation 12) ·
  2300 boots (shelf pickup) · 2800 magnet · 3200 **mystery** · 3700 gem · 4200 heart ·
  4700 star · 5050 shield · 5600 heart.
- doors (multi-door, L7 pattern). M1 carries only the gear door:

  ```js
  doors: [
    { x: 4900, y: 0, w: 40, h: 560, state: 'locked', openT: 0, kind: 'geardoor' },
  ],
  ```

  (M2 adds the three `bookwall` / `shelfpanel` entries — deviation 2.)
- `clock: { t: 1.0, period: 6.0, chimeCount: 0, stopped: false, gearRot: 0 }` —
  static until M2 (t = 1.0 → no chime pulse in M1 renders, panel drawn open per
  deviation 10).
- `shelfPanel: { held: false }`, `trapdoor: { open: false }`, `kingSil: { present: false }`.
- pearl (showWhen lands in M5's Warden work; placed now so the astrolabe reads right):

  ```js
  pearl: {
    x: 5450, y: 504, w: 16, h: 16, visible: false, taken: false,
    showWhen: enemies => enemies.some(
      e => e.kind === 'warden' && e.dead && (e.dyingT ?? 0) <= 0),
  },
  ```

  (sits on the 5430 pedestal: pedestal top 520, pearl bottom 520.)
- exit: `{ x: 5820, y: 560, w: 120, h: 100, locked: true }` — under the lid
  (deviation 1).
- dialogs: **none in M1** (M3: intro + hub; M5: arena; M7: shaft lip).
- roster: **empty in M1** (M4: sentinels + moths; M6: the Warden).
- registration (`src/levels/index.js`, L7 pattern):

  ```js
  import { createLevel8 } from './level8.js';
  // in LEVELS:
  { name: 'sky-citadel', make: viewH => createLevel8(viewH), carry: { hasBow: true, hasFlight: true } },
  ```

### - [x] 2. Zone pass — `drawCitadelZone` in `src/render/zones.js`

Dispatch addition (house pattern, after the peak line):

```js
} else if (z.kind === 'skybridge' || z.kind === 'citadel' || z.kind === 'citadel-deep' || z.kind === 'observatory') {
  drawCitadelZone(c, z.kind, z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
```

All motion is a pure function of (t, cam.x, cuts, clock.t, gearRot) — snapshot-stable.
Starfields are index-hashed (`(i * 173 + 37) % span` style), never Math.random at
draw time.

- **skybridge**: twilight sky #1a1836 → #2c2a52 (clipped to the zone rect), the star
  field, the **rainbow tail** (an arc fading west, parallax 0.05, alpha 0.35), the
  **sea of clouds** (two parallax-0.1 bands near groundY−60, drift
  `(t * 8) % 160`, pale #b8a8d8).
- **citadel**: wall #221c3e; floor lattice (brass lines every 80 px, alpha 0.15,
  world-anchored); **arched windows** every 400 px (world-anchored): through each, the
  twilight sky + a cloud band + a far rainbow wisp; brass trim on the arches; the
  **great pendulum silhouette** (parallax 0.3, 300 px, angle
  `40° · sin(2π · clock.t / clock.period)` — a pure read, static in M1); **dust motes**
  (6 per zone, hashed positions, drift with t, alpha 0.3); **lamps** every 500 px
  (brass sconces, warm #ffd75e glow, alpha 0.25 — the moths' anchors).
- **citadel-deep**: one shade darker #191330; the **clock face** (center 3600, r 100,
  y 180): brass ring, tick marks, one hand at `360° · clock.t / period` (pure read);
  the **great gear** (500 px, center 3600, y 380, parallax 0.5): rotation
  `lvl.gearRot` (M2 accumulates it in updateClock; M1 draws 0), teeth as notched
  rectangles, hub in #b8860b.
- **observatory**: open ceiling (denser stars, 3 bright stars with a cross glint),
  the **star map** (brass lines joining 5 hashed gem points, alpha 0.35), the **cloud
  drop** below the deck edge (the shaft side), **railing** (brass, 12 px posts every
  40 px) along the shaft lip 5660–5820 and the rim 5940–6000.
- **light level + pulse** (all four kinds): `light = 1 − 0.2 · cuts` where
  `cuts = lvl.springs.filter(s => s.cut).length` (M1 inlines this one line; M3's
  springs.js exports `lightLevel(cuts, stopped)` and the zone pass switches to it —
  identical formula); when `clock.t < 0.3 && !clock.stopped` add +0.15 (M1: t = 1.0,
  no pulse).

### - [x] 3. Platform + pit rendering — `src/render/level.js`

Platform kinds (drawn in the existing platform loop; `hidden` platforms are skipped
as today):

- `gear`: 12-tall brass plate #b8860b, gear teeth (8 notches around a central hub
  circle r 20), a faint cyan glow ring (alpha 0.2).
- `shelf`: wood top #4a3220, 12 tall, five 4-px book spines on top (4 muted colors,
  hashed by x).
- `pend`: brass plate, 3 rim rivets.
- `pedestal`: stone base #3a3358, 16 tall, brass ring on top.
- `trapdoor`: flush brass lid (a star motif center, rim handle). When
  `lvl.trapdoor.open` (M7): the lid drawn swung down into the shaft + shaft glow
  below (the platform stays `hidden` for collision).

Pit recolors (the existing lava path gains a `kind` branch):

- `grate`: dark opening #0d0b1e filling the gap; a faint blue-lavender glow band
  #6a5a9a (4 px, alpha 0.4) ~200 px down; 2-px brass rims on both gap edges.
- `shaft`: #0d0b1e at the top fading to #3a3560 (cloud glow) over 100 px; two
  drifting mist bands (3 px, x offset `(t * 12) % 60`, alpha 0.3); brighter brass rim.

Ground kind `stone` is reused as-is (the zone walls behind carry the palette — a
deliberate decision, no retint).

### - [x] 4. World pass — `src/render/citadel.js` (new)

Import + one line in `src/render/index.js` after drawPeak:
`drawCitadel(ctx, level, gameTime)`. Camera-translated world space; every animation a
pure function of state / t:

- the island cliff geometry at 0–600 (the skybridge sky itself is the zone pass).
- the **bookcase forest** (library 2350–2900): full-height bays, 60 px wide,
  alternating #2e2444 shades, rows of 4-px book spines (4 muted colors, hashed by
  bay index).
- the **bookcase wall** (2520–2760): two static bays (2520–2600, 2720–2760) + the
  **panel** (2600–2720) at its slide position: `frac` from clock.t —
  `t < 0.4 → t/0.4` (sliding open), `0.4 ≤ t < 1.6 → 1`, `1.6 ≤ t < 2.0 → (2−t)/0.4`,
  `else 0`; `held` → 1 (deviation 2). M1 inlines this 6-line expression (M2 exports
  `panelFrac(clock, held)` from clock.js; the draw switches to it — identical output).
- the **gear door** (4900–4940, full height): a wall of five interlocking gears (r 30,
  hashed placements), the seal at the hub — a glowing core #7ec8ff (alpha
  0.6 + 0.2·sin(t·3)) while locked; open (M5): gears retract by
  `1 − door.openT / 1.2`.
- the **pendulum arm + rod** (bridge 3800–4200): the pivot housing (4000, 80–120,
  brass box), the arm 420 px at `θ = 40°·sin(2π·t/period)` (M1: static at the t = 1.0
  angle), the blade (14×40) at the tip. M2 reads `pendulumPose(lvl)` (deviation:
  single source of truth with the collision).
- the **astrolabe** on the 5430 plinth: a 60×40 brass disc, etched rings + star
  points. (The pearl itself is the existing drawPearl pass — verify the index.js call
  site at build time.)
- the **King's silhouette** (M7): at (5950) on the rim — a 28×44 #0a0918 silhouette,
  one white glint (4×4 at the shoulder); drawn when `lvl.kingSil.present`.
- the **Warden's statue** (M6+): `game.enemies.find(e => e.kind === 'warden' && e.dead)`
  → drawn at his (static) e.x/e.y: the 60×64 brass figure, bow angle from
  `e.dyingT` (bows over 1.8 → 1.0, holds), core ember (glow alpha 0.15 once
  `dyingT ≤ 1.8`, dimming ramp 3.3 → 1.8). drawEnemies skips dead entities, so the
  world pass owns this (deviation 4).
- the **trapdoor open state** (M7): drawn by the platform renderer (section 3), not
  here.

### - [x] 5. door.js + render/door.js

- `STAYS_OPEN` gains `'geardoor'`, `'bookwall'`, `'shelfpanel'`.
- `drawDoor` dispatch: all three kinds are **collision-only** — no-op in the door
  render pass; every bit of their visual lives in citadel.js (one source of truth for
  the brass-and-bookcase scenery).

### - [x] 6. Tests — `test/level8.test.js` (new)

- `LEVELS[7].name === 'sky-citadel'`; `make(600)` → width 6000, groundY 560,
  carry flags set.
- 4 zones, exact spans; 6 ground segments, exact spans; 5 pits with kinds
  (4 grate, 1 shaft); 11 platforms with the table above (kinds + x/y/w);
  12 boxes (one mystery, the drop list, all at groundY−36); 1 door (geardoor,
  locked); 3 springs (uncut, exact rects); clock init (t 1.0, period 6.0,
  chimeCount 0, stopped false, gearRot 0); pearl hidden + 16×16 at (5450, 504);
  exit `{5820, 560, 120, 100, locked: true}`; roster empty; dialogs empty;
  `shelfPanel.held === false`, `trapdoor.open === false`, `kingSil.present === false`.

### - [x] 7. Verify

- `npm test` green; `npm run smoke` green (levels 1–8 — smoke.mjs iterates LEVELS);
  L1–7 snapshot md5s unchanged (render.test.js untouched in M1).
- Headless walk (temporary node script, deleted before commit): spawn, flight over
  the grates (the bookcase wall is passable in M1), reach x ≈ 4860, blocked at the
  gear door (x stays < 4900).

**Gate**: commit `L8 M1: level data + zones + citadel world pass`.

---

## M2 — the Great Clock + on-beat traversal

**Goal**: the chime ticks; the gear platform, the bookcase panel, and the pendulum
rod move on the beat; the player can cross all four grates on-beat.

### - [x] 1. `src/clock.js` (new)

```js
// The Great Clock: one accumulator; the chime on each wrap; the period
// lengthens with every mainspring cut (6.0 + 0.8 * cuts).
export const CHIME_SLIDE = 0.5, PANEL_WINDOW = 2.0, GEAR_BASE = 6.0, GEAR_STEP = 0.8;
export const GEAR_X0 = 1700, GEAR_X1 = 1770;

export function clockCuts(lvl) { return (lvl.springs ?? []).filter(s => s.cut).length; }
export function periodFor(cuts) { return GEAR_BASE + GEAR_STEP * cuts; }
export function gearSpeed(cuts, stopped) { return stopped ? 0 : (4 - cuts) / 4; }
export function lightLevel(cuts, stopped) {
  return Math.max(0.2, 1 - 0.2 * (cuts + (stopped ? 1 : 0))); // the final dim (M6)
}
export function chimePitch(cuts) { return 0.94 ** cuts; } // -6% per cut
export function gearPlatX(c) { // slot after each chime; 0.5 s slide (deviation 3)
  const slot = n => (n % 2 === 0 ? GEAR_X0 : GEAR_X1);
  const rest = slot(c.chimeCount);
  if (c.t < CHIME_SLIDE) {
    const from = slot(c.chimeCount - 1);
    return from + (rest - from) * (c.t / CHIME_SLIDE);
  }
  return rest;
}
export function panelFrac(c, held) { // slide 0.4 / hold 1.2 / slide 0.4 (deviation 2)
  if (held) return 1;
  if (c.t < 0.4) return c.t / 0.4;
  if (c.t < 1.6) return 1;
  if (c.t < PANEL_WINDOW) return (PANEL_WINDOW - c.t) / 0.4;
  return 0;
}
export function pendulumPose(lvl) { // pivot (4000, 100), arm 420, ±40 deg
  const c = lvl.clock;
  const th = (40 * Math.PI / 180) * Math.sin(2 * Math.PI * c.t / c.period);
  return { px: 4000, py: 100, tx: 4000 + 420 * Math.sin(th), ty: 100 + 420 * Math.cos(th) };
}
```

`updateClock(lvl, p, enemies, dt, fx)` (enemies needed for the Warden's dyingT from
M6; the parameter lands now so the call site doesn't change again):

- `if (!lvl.clock || lvl.clock.stopped) return;`
- `c.t += dt;` `c.gearRot += gearSpeed(cuts) * dt * 0.6;`
- **chime wrap**: `if (c.t >= c.period) { c.t -= c.period; c.chimeCount++;
  lvl.shelfPanel.held = false;
  fx.play(p.x < 600 ? 'chimeFar' : 'chime', chimePitch(cuts)); }`
- **gear platform**: `const g = lvl.platforms.find(pl => pl.kind === 'gear');`
  `const nx = gearPlatX(c); const dx = nx - g.x;`
  **carry**: `if (dx !== 0 && p.onGround && Math.abs(p.y + p.h - g.y) < 4 &&
  p.x + p.w > g.x && p.x < g.x + g.w) p.x += dx;` then `g.x = nx;`
- **bookcase panel** (deviation 2): `const panel = lvl.doors.find(d => d.kind === 'shelfpanel');`
  `const inOpen = p.x + p.w > panel.x && p.x < panel.x + panel.w;`
  `if (!inOpen) lvl.shelfPanel.held = false;` (re-set on the chime wrap too);
  `panel.state = (c.t < PANEL_WINDOW || lvl.shelfPanel.held) ? 'open' : 'locked';`
  **No-crush**: at the window edge, `if (c.t >= PANEL_WINDOW && inOpen)
  lvl.shelfPanel.held = true;` — order: compute `inOpen`, then the hold, then state.
- **pendulum rod** collision: the pose from `pendulumPose(lvl)`; closest point Q on
  segment (px,py)→(tx,ty) to the player center C; if `dist < 19` (7 px rod half +
  12 px player allowance) push the player along the normalized (C − Q) so
  `dist === 19`. Silent (the rod is the telegraph — fairness-first).
- **Warden dyingT** (M6 fills the body): `const w = enemies.find(e => e.kind === 'warden' && e.dead);`
  `if (w && w.dyingT > 0) { w.dyingT = Math.max(0, w.dyingT - dt); }` (+ toll at the
  1.0 crossing — M6).

**game.js**: insert after the wind line, before updatePlayer:

```js
if (game.level.clock) updateClock(game.level, game.player, game.enemies, dt, fx);
```

(Dialogue freezes the whole update — the clock stops with it, house behavior.)

### - [x] 2. sfx — `src/audio.js`

- `export function sfx(name, arg)` — `const mul = arg ?? 1;` used only by the new
  cases.
- `case 'chime'`: bell `beep(880 * mul, 440 * mul, 0.5, 'sine', 0.18)` + drone
  `beep(110 * mul, 110 * mul, 0.8, 'triangle', 0.08, 0.05)`.
- `case 'chimeFar'`: `beep(880 * mul, 440 * mul, 0.35, 'sine', 0.1)`.
- `case 'spring'`: `beep(1200, 300, 0.25, 'square', 0.2)`.
- `case 'toll'`: `beep(140, 70, 1.6, 'sine', 0.3)`.
- ('clank', 'seal', 'gear', 'grant', 'boss' etc. already exist — verify 'clank' in
  the case list at build time; the fallback for the gear door is 'gear'.)

### - [x] 3. Rendering switches to the live reads

- Zone pass: the pendulum silhouette, the clock-face hand, and the great gear now
  read `lvl.clock` / `lvl.gearRot` (M1 already reads these fields — no code change if
  M1 used the same names).
- World pass: the panel uses `panelFrac(lvl.clock, lvl.shelfPanel.held)`; the rod
  uses `pendulumPose(lvl)` (the M1 inline expressions are replaced — identical output
  at the same inputs).

### - [x] 4. Tests — `test/clock.test.js` (new)

Pure-read tests: `periodFor(0..3)` → 6.0 / 6.8 / 7.6 / 8.4; `chimePitch(3) ≈ 0.83`;
`gearSpeed(2, false) === 0.5`, `gearSpeed(0, true) === 0`; `lightLevel(3, true) === 0.2`.
`gearPlatX`: chimeCount 0, t 1 → 1700; t 0.25 (mid-slide after a wrap) → between
1700 and 1770; t 1 → 1770 (chimeCount 1). `panelFrac`: 0 at t 3.0, 0.5 at t 0.2, 1 at
t 1.0, 0.5 at t 1.8, 0 at t 2.5, 1 when held. `pendulumPose`: t 0 → tip (4000, 520);
t = period/4 → tip x ≈ 4270 (sin 40° · 420 ≈ 270).

Simulation tests (createLevel8 + a fake fx recorder, dt 1/60):

- **chime**: 7.0 s of stepping → chimeCount 1, 'chime' recorded once with pitch 1;
  player at x 300 → 'chimeFar' instead.
- **gear platform**: after one wrap the platform x is 1770 (at t 1.0), back to 1700
  after two.
- **carry**: a player standing on the platform (onGround true, feet 554, x 1710) →
  after a full cycle the player's x has shifted 70 px with the platform.
- **panel**: at t 3.0 `state === 'locked'` and resolveDoor pushes a player at x 2590
  back (< 2520 + clearance); at t 1.0 `state === 'open'` and a player at 2650 passes;
  **no-crush**: a player at 2650 when t crosses 2.0 → `held` true, state stays 'open'
  until the player leaves the opening.
- **rod**: t 0 (tip 4000, 520): a player centered at (4000, 540) is pushed (x or y
  changes, dist ≥ 19 after); at t = period/4 the same player is not pushed.
- **gearRot**: advances while running; frozen when `clock.stopped` (set it, step, no
  change).

### - [x] 5. Verify

- `npm test` green; `npm run smoke` green; L1–7 snapshot md5s unchanged.
- Headless deterministic crossing of all four grates (temporary script, deleted
  before commit): gear slot wait + carry, the shelf step, the panel window, the
  bridge jump timed to the rod's extreme. Print the frame timings; they feed the M8
  playthrough.

**Gate**: commit `L8 M2: the Great Clock + on-beat traversal`.

---

## M3 — the mainsprings + the story beats

**Goal**: the three mainsprings can be severed (touch or arrow); each cut scores, the
period lengthens, the world slows and dims; the intro and the hub beats play their
rhythm lines (c0 repeat at 0 cuts, c1 after one, c2 after two).

### - [x] 1. `src/springs.js` (new)

```js
// The mainsprings: sever by touch (adjacent) or by a single arrow. Each cut
// +50, lengthens the Great Clock's period, slows the gears, dims the light.
import { addScore } from './loot.js';
import { burst } from './effects.js';
import { periodFor } from './clock.js';

export function cuts(lvl) { return (lvl.springs ?? []).filter(s => s.cut).length; }
export function lightLevel(cuts, stopped) { // re-exported from clock.js (M3 switch)
  return 1 - 0.2 * (cuts + (stopped ? 1 : 0));
}

export function updateSprings(lvl, p, dt, fx) {
  for (const s of lvl.springs ?? []) {
    if (s.cut) continue;
    if (p.x < s.x + s.w && p.x + p.w > s.x && p.y < s.y + s.h && p.y + p.h > s.y) {
      cutSpring(lvl, s, fx); // touch-sever when adjacent (the design's either-way)
    }
  }
}

export function cutSpring(lvl, s, fx) {
  s.cut = true;
  const n = cuts(lvl);
  lvl.clock.period = periodFor(n); // the period lengthens NOW (mid-cycle, t keeps running)
  addScore(50);
  fx.play('spring');
  fx.play('relic');
  burst(s.x + s.w / 2, s.y + s.h / 2, FX.springUnspool);
}
```

- `FX.springUnspool` in effects.js: a spiral of 10 brass-cyan particles unwinding
  upward (the FX catalog pattern — a plain object of particle params).
- **Arrow block** in `updateArrows` (beside the sigil/bush blocks, deviation 13's
  sibling pattern):

  ```js
  for (const s of lvl.springs ?? []) { // level 8: one arrow severs a mainspring
    if (s.cut) continue;
    if (a.x < s.x + s.w && a.x + 14 > s.x && a.y < s.y + s.h && a.y + 4 > s.y) {
      cutSpring(lvl, s, fx);
      if (!a.star) { a.dead = true; } // stars sever and keep flying (the box rule)
      break;
    }
  }
  ```

- **game.js**: `if (game.level.springs) updateSprings(game.level, game.player, dt, fx);`
  after updateClock.
- The zone pass switches its inline light formula to `lightLevel(cuts(lvl),
  lvl.clock.stopped)` (identical output).
- The chime pitch already reads `chimePitch(cuts)` in updateClock — verify it uses the
  live cut count (it does: `clockCuts(lvl)` per chime).

### - [x] 2. Beats — the level data gains two dialog groups

```js
dialogs: [
  { // the Warden at the threshold
    id: 'l8-intro', x0: 40, x1: 240, speaker: 'warden',
    lines: [
      { speaker: 'warden', text: 'You climb high, little queen. High enough to hear the clock, and low enough to still be caught by it.' },
      { speaker: 'warden', text: 'I am the Warden. I am still wound. I will not stop until the springs stop. And they will not, until someone severs them.' },
    ],
  },
  { // the hub: the Great Clock speaks on your arrival, and re-voices with each cut
    id: 'l8-hub-0', x0: 3550, x1: 3850, speaker: 'clock', repeat: true,
    when: g => cuts(g.level) === 0,
    lines: [{ speaker: 'clock', text: 'Three springs keep me wound. Sever them, and I will slow. Slow enough for a queen to cross.' }],
  },
  { id: 'l8-hub-1', x0: 3550, x1: 3850, speaker: 'clock',
    when: g => cuts(g.level) === 1,
    lines: [{ speaker: 'clock', text: 'One spring gone. I feel it already — the beat stretches, the gears grow heavy. Two more.' }] },
  { id: 'l8-hub-2', x0: 3550, x1: 3850, speaker: 'clock',
    when: g => cuts(g.level) === 2,
    lines: [{ speaker: 'clock', text: 'Two springs gone. I am almost at rest. One more, and the way to my keeper will open.' }] },
]
```

(Exact line wording follows LEVEL8-DESIGN.md's beats section — this sketch fixes the
data shape: beat-level `when`, `repeat` on c0 only, hub x-band 3550–3850.)

### - [x] 3. Tests — `test/springs.test.js` (new)

- **touch cut**: player overlapped on spring 1 (a level with the clock ticking) →
  `s.cut === true`, score +50, 'spring' + 'relic' recorded, `clock.period === 6.8`.
- **arrow cut**: a fired arrow crossing the spring rect → cut, arrow consumed (a
  normal arrow `dead === true`; a star keeps flying — `pierce` pattern).
- **period chain**: cut all three → period 8.4; `chimePitch` at the next chime
  ≈ 0.94³.
- **gearSpeed / lightLevel**: `lightLevel(2, false) === 0.6`, `gearSpeed(2) === 0.5`.
- **beats**: intro fires at spawn (player in 40–240); hub c0 fires in the hub at
  0 cuts; after cutting spring 1 and re-entering the hub, c1 fires (c0's `when`
  now false, c0 not re-fired); after two cuts, c2; c1/c2 fire exactly once.

### - [x] 4. Verify

- `npm test` green; `npm run smoke` green; L1–7 snapshot md5s unchanged.
- Headless: sever spring 1 by arrow from the second shelf; confirm the chime pitch
  drops at the next chime (fake fx records the arg) and the hub re-voices.

**Gate**: commit `L8 M3: the mainsprings + story beats`.

---

## M4 — the Sentinels + the clockwork moths

**Goal**: the biome's regulars fight — the Sentinels (shield + chest bolt, on-beat)
and the clockwork moths (drift + dart). Stompable, 12-box economy intact.

### - [x] 1. `src/enemies/sentinel.js` (new, registry: `stompSound: 'gear'`… verify
the case name; fallback 'stomp' + `stompFx: FX.gearBurst`)

- 40×44, hp 2, speed 25, patrol band, `dir`, stompable (the L7 stomp override:
  `stompSound`, `stompFx: FX.gearBurst` — a burst of 8 brass shards).
- **The shield**: up for the 1.0 s after each chime — a pure read
  `const shieldUp = lvl.clock && !lvl.clock.stopped && lvl.clock.t < 1.0;`
  (frozen mid-shield after the Warden's death is harmless — the arena is past).
- **`arrowBlocked` hook** (registry, deviation 13): the shield up and the arrow
  coming from the front:
  ```js
  arrowBlocked: (e, a) => e.shieldUp && ((a.vx > 0 && e.dir > 0) || (a.vx < 0 && e.dir < 0)),
  ```
  (`e.shieldUp` set in update; arrows.js: after the weak-point check, `if
  (k.arrowBlocked && k.arrowBlocked(e, a))` → `fx.play('deflect')` +
  `burst(FX.mageSpark)` + consume (stars: `a.hit.add(e)` and keep flying —
  weak-point pattern). The hook lands in arrows.js in this milestone; existing kinds
  have no `arrowBlocked` → byte-identical behavior.)
- **The chest bolt**: on each chime, if the player is within 140 px and the 4 s
  seeded cooldown is up, the Sentinel fires a cyan fireball (deviation 8) from its
  chest (y + h − 28) 0.3 s after the shield rises — i.e. on the clock.t 0→0.3
  crossing. `fireFireball(x, y, vx, vy, fx, cyan)` — aimed at the player, 240 px/s,
  1 dmg (the standard fireball hit path). The cooldown: `e.boltCd` seeded from the
  reseeded spawn RNG (house determinism), 4 s.
- **update**: patrol (turn at band), face the player when close, set `e.shieldUp`,
  the chime-crossing bolt logic (track `e.lastT`).
- **draw**: a small brass automaton (40×44), a chest core (a 10×10 window, warm
  #ffd75e), the shield when up (a 46×30 brass arc in front, alpha 0.85, drawn from
  `e.shieldUp` — a pure read).

### - [x] 2. `src/enemies/moth.js` (new, registry: `stompFx: FX.mageSpark`)

- 20×16, hp 1, stompable (mageSpark — the existing spark).
- **Drift**: Lissajous around its lamp anchor (the spawn x/y): `x = ax + A·sin(2π·t/T
  + φ)`, `y = ay + B·sin(4π·t/T + 2φ)` — A 40–70, B 18–30, T 4–6 s, φ from the reseeded
  spawn RNG; the amplitudes/phase stored on the entity at spawn (deterministic).
- **Dart**: when the player is within 120 px and the 2.5 s cooldown is up: 0.4 s at
  200 px/s toward the player's position at trigger time, then 0.8 s hover (the Lissajous
  resumes from the dart's end point — re-anchor the Lissajous there), cooldown 2.5 s.
  States: `drift` / `dart` / `hover`.
- **draw**: a brass-and-silk moth (20×16), two silk wings (alpha 0.6, a cyan #7ec8ff
  glow rim), the wings flap — a pure function of `gameTime` (sin(t·20) on the wing
  angle), a single eye glint.
- **Lamps**: the zone pass already draws a sconce every 500 px (M1) — the roster
  anchors sit on them (see below); no new render.

### - [x] 3. Roster — the level data gains the regulars

```js
roster: [
  { kind: 'sentinel', x: 2450, band: [2380, 2560] }, // the library, west of the wall
  { kind: 'sentinel', x: 3100, band: [3060, 3300] }, // the hub, west edge
  { kind: 'sentinel', x: 3500, band: [3400, 3800] }, // the hub, the clock's flank
  { kind: 'sentinel', x: 5050, band: [4950, 5250], sleeping: true }, // the arena approach; the beat wakes it
  { kind: 'moth', x: 800, y: 400 }, { kind: 'moth', x: 1400, y: 380 },
  { kind: 'moth', x: 2650, y: 420 }, { kind: 'moth', x: 3300, y: 380 },
  { kind: 'moth', x: 4400, y: 420 },
]
```

The design's x's. The 5050 Sentinel guards the arena approach: it is
`sleeping: true` in the M4 roster and M5's arena beat `onOpen` wakes it alongside
the Warden. The other three Sentinels patrol from M4; the moths are ambient and
never sleep.

### - [x] 4. Tests — `test/sentinel.test.js` + `test/moth.test.js` (new)

Sentinel (a level with the clock ticking, fake fx):
- **shield window**: at clock.t 0.5 `e.shieldUp === true`; at t 2.0 false.
- **deflect**: a front arrow during the shield → consumed, 'deflect' recorded, hp
  unchanged; a rear arrow during the shield → hp 2 → 1; a front arrow at t 2.0 →
  lands.
- **chest bolt**: player within 140 px at the chime → a cyan fireball in
  projectiles after t 0.3; the cooldown suppresses the next chime within 4 s.
- **stomp**: a falling player onto the head → `dead`, gearBurst, the L7 bounce.
- **contact**: a side overlap → `hurtPlayer` once (invuln respected).

Moth:
- **drift bounds**: 10 s of stepping → the moth stays within A+10 / B+10 of its
  anchor (states drift/hover).
- **dart trigger**: player 100 px away → state 'dart' within a frame or two, velocity
  ≈ 200 px/s toward the trigger-time position; after 0.4 s → 'hover' 0.8 s → 'drift'
  (re-anchored).
- **stomp**: hp 1 → dead, mageSpark.

### - [x] 5. Verify

- `npm test` green (733); `npm run smoke` green (levels 1–8; the roster now
  populates L8 and the smoke stays stable); L1–7 snapshot md5
  `17e278a750e7a12d53821c7da26b8344` unchanged (no L8 render scenarios yet).
  Gate also required three test updates: the registry now lists 17 kinds (+ the L8
  roster check), the L8 "roster starts empty" assertion now expects the 9 regulars,
  and the clock Warden-rest test finds the Warden by kind (the roster is no longer
  empty, so it is not `roster[0]`).

**Gate**: commit `L8 M4: the Sentinels + the clockwork moths`.

---

## M5 — the gear door + the astrolabe + the arena beat + the trapdoor

**Goal**: the third cut opens the gear door (and stays open — the retreat pocket);
the arena beat wakes the Warden (and the 5050 Sentinel); the pearl's showWhen is
live; the pearl-taken opens the trapdoor lid over the shaft.

### - [x] 1. The gear door opens on the third cut

In `cutSpring` (springs.js), after the period update:

```js
if (n >= 3) { // the third mainspring: the gear door unseals
  const d = lvl.doors.find(d => d.kind === 'geardoor');
  if (d && d.state === 'locked') {
    d.state = 'opening'; d.openT = 1.2;
    fx.play('seal'); fx.play('clank'); // verify 'clank' exists; fallback 'gear'
  }
}
```

`'geardoor'` is in STAYS_OPEN (M1) → it stays open: the retreat pocket (walk back
west to hunt boxes; the door never re-seals). The world pass already draws the
retraction from `door.openT` (M1).

### - [x] 2. The arena beat + the trapdoor

Level data (M5 adds to `dialogs`):

```js
{ // the Warden, at the threshold of his arena
  id: 'l8-arena', x0: 4900, x1: 5150, speaker: 'warden',
  when: g => cuts(g.level) === 3,
  onOpen: g => {
    const w = g.enemies.find(e => e.kind === 'warden');
    if (w) w.sleeping = false; // M6: the state machine starts
    const s = g.enemies.find(e => e.kind === 'sentinel' && e.sleeping);
    if (s) s.sleeping = false; // the arena Sentinel wakes too
    fx.play('boss');
  },
  lines: [
    { speaker: 'warden', text: 'Three springs gone. The clock stammers. And you are still here.' },
    { speaker: 'warden', text: 'Then hear the last beat, queen. I was wound to keep you out. I will unmake myself before I let you past.' },
  ],
}
```

(M5: the Warden isn't in the roster yet — the `find` is a guarded no-op; M6 adds him
and the beat wakes him for real. The 5050 Sentinel wakes from M4's roster.)

**The trapdoor** (in updateClock, L8-owned — runs every frame):

```js
if (lvl.trapdoor && !lvl.trapdoor.open && lvl.pearl && lvl.pearl.taken) {
  lvl.trapdoor.open = true;
  const lid = lvl.platforms.find(pl => pl.kind === 'trapdoor');
  if (lid) lid.hidden = true; // the lid drops; the shaft is open (deviation 1)
  fx.play('seal');
}
```

(The standard pearl path has already set `exit.locked = false` — a flier through the
shaft wins via reachedExit; a walker takes the pit rule. No game.js change.)

### - [x] 3. The astrolabe + pearl (data live from M1; verify now)

- `updatePearl` is called by game.js when `lvl.pearl` exists (verify the call site —
  L6 pattern: `if (game.level.pearl) updatePearl(...)`; if L6 gates it differently,
  mirror that gate for L8).
- showWhen (M1 data) turns true only when the Warden is dead AND `dyingT <= 0` —
  M6 makes that real; M5 tests it with a fake Warden entity.

### - [x] 4. Tests — `test/citadel-gate.test.js` (new)

- **gear door**: with two cuts, cutting the third → door.state 'opening', openT 1.2,
  'seal' + 'clank' recorded; after 1.2 s → 'open'; a player at x 4890 walks through
  (no pushback); the door never re-locks (step 30 s, still 'open').
- **retreat**: after 'open', a player at 5000 walks back west through 4900 → passes.
- **arena beat**: at cuts 3, a player entering 4900–5150 → the beat fires (fake
  dialogue recorder), the 5050 Sentinel's `sleeping === false`; at cuts 2 the beat
  does not fire on entry.
- **pearl (fake)**: push a fake Warden `{ kind: 'warden', dead: true, dyingT: 0 }`
  into enemies → updatePearl shows the pearl (visible true); a fake with
  `dyingT: 2` → not visible.
- **trapdoor**: with the pearl taken → `trapdoor.open === true`, the lid platform
  `hidden === true`, 'seal' recorded; a walking player entering the shaft rect takes
  the pit rule (1 dmg + respawn) while a flying player in the exit rect wins
  (reachedExit → `game.player.won`) — the flight-only guarantee (deviation 1).

### - [x] 5. Verify

- `npm test` green; `npm run smoke` green; L1–7 snapshot md5s unchanged.

**Gate**: commit `L8 M5: the gear door + astrolabe + arena beat + trapdoor`.

---

## M6 — the Warden (the boss)

**Goal**: the brass-and-starlight automaton — 16 hp, two phases, clock-locked
attacks, the 0.6 s reset window (arrows deal 3), and a death that is a rest, not a
kill (statue + toll + the pearl).

### - [ ] 1. `src/enemies/warden.js` (new; registry entry)

- 60×64, hp 16, `stompable: false` (the dragon rule: the stomp bounces — the
  registry's `stompable` flag is the house mechanism; verify the exact field name
  against the wizardboss/spiderboss entries at build time), 16 pips (two rows of 8,
  drawn in draw() world-space above the head, spiderboss pattern — the pips are his
  "winding", they empty as he unwinds).
- **Roster** (M6 adds to level8.js): `{ kind: 'warden', x: 5300, band: [5100, 5800],
  sleeping: true }` — the arena beat (M5) wakes him (deviation 5: awake-but-calm =
  sleeping flag; the draw shows him standing at attention).
- **The clock coupling** (all reads of `lvl.clock`; he keeps `e.lastT`):
  - **advance on the chime**: on the t wrap, 40 px toward the player (60 px in P2),
    clamped to the band.
  - **reset window**: `e.inWindow = !c.stopped && c.t < 0.6;` the core glows (draw
    reads it); arrows deal 3 (deviation 14). Reflected chime bolts deal 1 always
    (they go through `damageEnemy` with mult 1 — the projectiles path, unchanged
    call). Star arrows deal 3 always.
  - **attack starts**: P1 — on the chime (t wrap) from `idle`. P2 — off-beat: on the
    `t = period/4` and `t = 3·period/4` crossings (track crossings via e.lastT),
    idle 0.6–1.0 s (seeded).
- **State machine**: `idle` → `slamWind` (0.5 s, 'clank') → `slam` (thud +
  `shake(cam, 4, 0.2)` + `fireShockwaves(x, groundY, fx, 2.5)` — deviation 6) →
  `idle`; `charge` (0.8 s, starts at the t = period − 0.8 crossing in P1) → on the
  chime: fire the **chime bolt** — a three-bolt fan ±15° at 240 px/s, cyan
  (deviation 8) → `idle`; P2 adds `sweepTele` (0.8 s — the arm extends a 120 px
  blade; the world pass draws the 240 px floor band in the player's direction,
  alpha pulsing) → `sweep` (0.6 s — the blade rect 120×64 travels 240 px at
  400 px/s toward the player's side, 1 dmg, one hit — deviation 9) → `retract`
  (0.5 s) → `idle`.
- **Attack choice**: P1: 45% slam / 55% bolt (seeded). P2: 30/30/40
  slam/bolt/sweep (seeded). P2 idle is 0.6–1.0 s; P2 advance is 60 px.
- **Phase 2** at hp ≤ 8: the core's idle glow intensifies (the phase cue), the
  off-beat starts, the bigger advance. `phase2At: 8` in the registry (spiderboss
  pattern) or an explicit flag — verify which the pip draw reads.
- **`hitValue` hook** (deviation 14):
  ```js
  hitValue: (e, star) => (star ? 3 : (e.inWindow ? 3 : 1)),
  ```
  arrows.js: `damageEnemy(e, fx, cam, k.hitValue ? k.hitValue(e, a.star) : 1)`;
  projectiles.js (reflected bolts): keep the bare `damageEnemy(boss, fx, cam)` → 1.
  damageEnemy: `function damageEnemy(e, fx, cam, mult = 1) { e.hp -= mult; ... }`
  (default 1 — every existing kind unchanged).
- **`onZero`** (deviation 4):
  ```js
  onZero: (e, fx, cam, lvl) => {
    e.dead = true; e.dyingT = 3.3; e.rested = false;
    lvl.clock.stopped = true; // the chime stops, the gears halt, the final dim
    // no burst, no shake — the rest
  },
  ```
  (damageEnemy needs `lvl` for onZero — extend the call signature
  `damageEnemy(e, fx, cam, mult, lvl)` with the lvl threaded from arrows.js
  (which has it) and projectiles.js (which has it via its lvl param) — verify both
  call sites have lvl in scope; they do.)
  - The toll: updateClock (M2 skeleton) — when `dyingT` crosses 1.0 →
    `fx.play('toll')` once (latch `e.tolled`).
  - The pearl: showWhen `e.dead && (e.dyingT ?? 0) <= 0` (M1 data) — the pearl
    appears 1.0 s after the bow completes (the 3.3 → 0 timeline: 1.5 s dim,
    0.8 s bow, 1.0 s rest).
- **The statue**: drawEnemies skips the dead; the world pass (M1, section 4) draws
  him from `e.dyingT` (deviation 4). No contact, no arrow hits (the `e.hp > 0`
  guard), no reflected-bolt target (`!e.dead` filter) once dead.
- **Sunbeam exemption**: add `'warden'` to the exempt list in game.js (the L7
  line).
- **Reflected bolts**: add `'warden'` to the kind list in projectiles.js's
  reflected path.
- **draw**: the 60×64 brass-and-starlight automaton — a tall frame, a chest core
  (14×14 window: cyan #7ec8ff when `e.inWindow` (glow + a 0.3 s pulse), dim amber
  otherwise, brighter in P2), the head (bows in the dying statue — world pass), the
  arms (the sweep blade extends in sweepTele/sweep — a 120×14 brass blade from the
  hand), 16 pips above. Sleeping: standing at attention, the core at a slow 2 s
  pulse (the "still wound" tell).

### - [ ] 2. FX + sfx

- `FX.gearBurst` (shared with the Sentinel stomp): 8 brass shards + 4 spark motes.
- sfx: 'clank' (verify — the slam windup), 'toll' (M2), the standard 'bossHit' / 'boss'
  paths via the existing damageEnemy/reaction code (verify the boss-hit sfx name
  against the spiderboss flow — reuse whatever it plays).

### - [ ] 3. Tests — `test/warden.test.js` (new)

Setup: createLevel8, push the Warden (awake, hp 16), the clock ticking, cam.x 5500
(the L7 M6 viewport rule — arrows are viewport-culled; the arena spans 5100–5800),
a fake fx recorder, reseeded RNG.

- **reset window**: `inWindow` true at t 0.3, false at t 1.0. An arrow hit at t 0.3 →
  hp −3; at t 1.0 → hp −1; a star at t 1.0 → hp −3; a reflected bolt (a
  `reflected: true` fireball into his rect) at t 0.3 → hp −1 (always 1).
- **chime advance**: on the t wrap he moves 40 px toward the player (P1); in P2, 60.
- **chime bolt**: at t = period − 0.8 he enters 'charge'; at the wrap, three cyan
  fireballs (fan ±15°) in the projectiles list; a stomp… (not stompable — use a
  reflected bolt) during the charge → 'stagger', the charge lost (no bolts at the
  wrap).
- **gear slam**: 'slamWind' 0.5 s → shockwaves with ttl 2.5 in the shockwave list,
  'clank' then 'rumble' recorded, cam shake.
- **phase 2**: hp 9 → 8 (a windowed hit) → the off-beat starts at t = period/4
  (not the chime); the sweep: 'sweepTele' 0.8 s (the band rect exists — expose
  `e.sweepBand` for the test/draw) → 'sweep' 0.6 s (the blade rect travels 240 px;
  a player standing in the path takes 1, once) → 'retract' 0.5 s.
- **onZero / the rest**: hp 1 → 0 via a windowed hit → `e.dead === true`,
  `dyingT === 3.3`, `clock.stopped === true`, no 'die'/'burst' recorded (the rest);
  step 2.3 s → the toll recorded once at the 1.0 crossing; step 1.0 s more →
  `dyingT === 0` → the pearl's showWhen true.
- **stomp bounce**: a falling player → no hp loss, the player bounces (the
  `stompable: false` path), the Warden unharmed.
- **pips**: 16 at spawn; after 5 windowed hits (15 hp… use hp 11) → 11 pips (the
  pip count is a pure function of hp: `16 - (16 - hp)` — assert via a draw-state
  helper `pipCount(e)` exported for the test).
- **idempotent onZero**: a reflected bolt into a dying (hp 0, not yet… he's dead
  immediately) — instead: call onZero twice → dyingT stays 3.3, no double toll.

### - [ ] 4. Verify

- `npm test` green; `npm run smoke` green (the Warden is in the roster — the smoke
  update loop must stay stable with a sleeping boss; the L7 pattern: sleeping bosses
  don't update, so the smoke is quiet); L1–7 snapshot md5s unchanged.
- Headless duel (temporary script, deleted before commit): windowed volleys
  (fire on each chime window: 3 per window; 16 hp → 6 windows) with threat dodges
  (jump the shockwaves, keep 200 px from the sweep band); print the fight's frame
  count + the timing of each phase for the M8 playthrough. Note the L7 onHit quirk
  does NOT apply here (no stage-transition replace — P2 is a glow cue, not a state
  replacement), but the fight script must still avoid wasting arrows on a staggered
  Warden (stagger = 0.3 s of free time; windowed arrows are worth 3× — the script
  only fires in the window or on a stagger that doesn't cross the window).

**Gate**: commit `L8 M6: the Warden (the boss)`.

---

## M7 — the ending: rest, not ruin

**Goal**: the pearl taken → the King's silhouette appears on the rim ('grant'), the
shaft-lip beat plays (two lines), and the level ends with a **flight dive** through
the cloud shaft. The Warden stands where he fell.

### - [ ] 1. The King's silhouette (in updateClock — L8-owned, every frame)

```js
if (lvl.kingSil && !lvl.kingSil.present && lvl.pearl && lvl.pearl.taken) {
  lvl.kingSil.present = true;
  fx.play('grant');
}
```

The world pass draws him from `lvl.kingSil.present` (M1 section 4) — the 28×44
silhouette on the rim (5950) with the single white glint. (Same frame as the
trapdoor opening: the lid drops, the silhouette steps onto the rim — the King's
"thank you" without words.)

### - [ ] 2. The shaft-lip beat (level data)

```js
{ // the King, at the lip of the shaft
  id: 'l8-shaft', x0: 5700, x1: 5820, speaker: 'king',
  when: g => g.level.pearl && g.level.pearl.taken,
  lines: [
    { speaker: 'king', text: 'So the last spring is still. The Warden rests. And the citadel, at last, stands still.' },
    { speaker: 'king', text: 'The way down is open, queen — through the clouds, to the ice. The throne is waiting. Fly true.' },
  ],
}
```

(The beat band ends at the shaft edge 5820 — standing in the band is safe; the
shaft itself is the exit.)

### - [ ] 3. The flight dive (no new code)

- Pearl taken → standard pearl path sets `exit.locked = false`; updateClock drops
  the lid (M5). A **flying** player in the exit rect (5820–5940, y 560–660) →
  reachedExit → win (the standard victory overlay; the level-9 carry lands when L9
  exists — until then, house behavior: same-level restart).
- A **walking** player into the open shaft → the pit rule (1 dmg + respawn at
  safeX/safeY) — the flight-only guarantee, geometrically (deviation 1).
- The dive is the comfort: FLIGHT_TIME 10 / FLIGHT_CD 15 carried from L7; the shaft
  is 120 px wide — a relaxed glide, no precision required.

### - [ ] 4. Tests — `test/citadel-ending.test.js` (new)

- **silhouette**: pearl taken → `kingSil.present === true`, 'grant' recorded (once —
  latch).
- **shaft beat**: with the pearl taken, a player entering 5700–5820 → the beat fires
  (the King's two lines); without the pearl, no fire on entry.
- **flight dive**: a flying player (flight state) inside the exit rect with
  `exit.locked === false` → `game.player.won === true` (the standard win path);
  'win' sfx via the existing victory flow.
- **walker**: a grounded player walking into the shaft → 1 dmg, respawn at
  safeX/safeY, NOT won.
- **the statue remains**: after the win, the Warden entity is still in enemies
  (dead, dyingT 0) — the world pass would still draw him (assert the entity state;
  the draw is covered by M8 scenarios).

### - [ ] 5. Verify

- `npm test` green; `npm run smoke` green; L1–7 snapshot md5s unchanged.
- Headless ending run (temporary script, deleted): kill the Warden (the M6 script's
  strategy), wait the 3.3 s rest + the pearl, take it, watch the silhouette + lid,
  advance the beat, fly the dive → won. Print the frame timeline for M8.

**Gate**: commit `L8 M7: the ending — rest, not ruin`.

---

## M8 — snapshots + playthrough + README

**Goal**: the citadel renders beautifully in saved snapshots; a headless play runs
the whole level end-to-end deterministically; the README documents level 8. The
snapshot diff since M7 must be **purely additive** (L1–7 byte-identical).

Split into three steps, committed together (the L7 M8 pattern):

### - [ ] Step A — render scenarios

- **Harness**: `freshGame8()` in `test/helpers/render-harness.js` (LEVELS index 7,
  the freshGame7 pattern). Camera clamp: [0, 5200] (width 6000 − 800).
- **Scenarios** in `test/render.test.js` (L7 M8 had 14; L8 gets 14):
  1. `the island spawn` — twilight sky, rainbow tail, sea of clouds, the island edge
     (player at spawn, cam 0).
  2. `the gate hall` — the pendulum silhouette, an arched window, the floor lattice,
     a lamp (cam ~700).
  3. `the gear platform mid-slide` — clock.t 0.25 after a wrap (the platform between
     slots, the player standing on it, carried) (cam ~1600).
  4. `spring 1 on its shelves` — the two shelf platforms + the spring above (cam
     ~1400).
  5. `the library` — the bookcase forest, a lamp, a moth mid-drift (cam ~2400).
  6. `the bookcase wall, panel open` — clock.t 1.0 (frac 1), the panel slid up, the
     dais + spring 2 below the opening (cam ~2550).
  7. `the hub` — the clock face (hand at a non-zero angle), the great gear (cam
     ~3550).
  8. `the pendulum bridge, rod vertical` — clock.t 0 (the chime; the tip at 4000,
     520; a player on the left platform) (cam ~3750).
  9. `the pendulum bridge, rod at the extreme` — clock.t = period/4 (the tip at
     ~4270; the crossing is clear) (cam ~3750).
  10. `the observatory` — the star map, the railing, the astrolabe on its plinth
      (cam ~4900).
  11. `the Warden, phase 1, reset window` — clock.t 0.3 (the core glow; a chime
      bolt mid-flight) (cam 5500 — the L7 viewport rule).
  12. `the Warden, phase 2, sweep telegraph` — the 240 px floor band glowing (cam
      5500).
  13. `the Warden, statue` — dead, dyingT 0.5 (the bow, the ember core; the pearl
      still hidden) (cam 5500).
  14. `the shaft open, the King on the rim` — trapdoor open (the lid swung down, the
      shaft glow), the King's silhouette, the pearl taken (cam ~5750).
- **Viewport-verification rule** (L7 M8): every element named in a scenario title is
  confirmed inside the viewport before the snapshot is saved (a scratch assertion
  pass, then deleted).
- Render fixes found during verification land here (the L7 M8 precedent: the
  seal-column draw fix). Expect candidates: the panel slide at held, the rod at the
  exact chime frame (t 0), the statue bow at dyingT 0.5.

### - [ ] Step B — the headless playthrough

`test/level8-playthrough.test.js` (the L7 pattern: deterministic, reseeded RNG,
fake fx, the input-driven player, caps on every wait):

1. **spawn + intro** — advance the 2-line intro (re-assert held keys after — the
   openDialogue clears input, the L7 lesson).
2. **spring 1 (the aim puzzle)** — jump to the shelf chain, fire a bow shot at the
   spring (or fly up and touch it — the script chooses the touch: simpler and
   deterministic). c1 re-voice on the hub return is asserted later.
3. **the gear crossing** — wait for the 1770 slot (or 1700), step on, ride the slide
   (assert the carry moved the player), land at 1850.
4. **the library + spring 2** — the sentinel at 2450 (stomp or two windowed arrows),
   the panel window (wait for t < 2.0 after a chime; the no-crush hold if caught —
   the script simply waits), cross, spring 2 by touch on the dais.
5. **the hub** — re-enter at cuts 2 → c2 fires (assert the dialogue opened).
6. **the pendulum bridge** — wait for the rod's extreme (t near period/4 or
   3·period/4), the full-jump crossing (a 16-frame mid-hop pattern from L7), spring 3
   by a jump from the left platform.
7. **the gear door** — cuts 3 → the door opens (1.2 s), walk through.
8. **the arena beat** — the 5050 sentinel wakes; the Warden wakes (2-line beat,
   advance, re-assert keys).
9. **the duel** — the M6 script: windowed volleys (fire during the 0.6 s window on
   each chime: 3 dmg; 16 hp → six windows), dodge the shockwaves (jump), keep out of
   the sweep band in P2 (camp the west edge 5100–5200, face east and fire; the
   bolt is aimed — a flying reposition between windows if needed). Cap ~2400 frames.
10. **the rest** — the death: no burst; wait dyingT 3.3 (cap 300); the toll; the
    pearl appears.
11. **the pearl + the King** — fly/walk to the astrolabe, take the pearl → the lid
    drops, the silhouette appears, 'grant'.
12. **the shaft-lip beat** — stand in 5700–5820, advance the King's two lines.
13. **the dive** — flight into the shaft → `won === true`.

Assertions throughout: the score (≥ 3 × 50 springs + box/gem contributions),
`exit.locked` flipped only at the pearl, the Warden dead with dyingT 0, the
silhouette present, the clock stopped.

### - [ ] Step C — the audio pass + README + final gate

- **Audio pass**: every `fx.play` name in L8 code (level8.js, clock.js, springs.js,
  sentinel.js, moth.js, warden.js, the arrows/projectiles/door touch points) has a
  case in audio.js; unused new cases flagged; the chime pitch arg verified end-to-end
  (the fake fx records `0.94 ** cuts` at each cut stage).
- **README**: the level-8 entry (the house format: name, the one-line spine role —
  **the Anchor**, the mechanics list, the boss, the ending line).
- **Final gate**: `npm test` green; `npm run smoke` green (levels 1–8); the render
  snapshot diff since M7 is purely additive (L1–7 byte-identical — the saved snap
  comparison, the L7 M8 check).
- Tick the **Build ledger** (all eight) + every `- [ ]` sub-checkbox in this file as
  the work lands; the ledger is the file's own progress record.

**Gate**: commit `L8 M8: snapshots + playthrough + README` — Level 8 complete.

---

## Dependency order

M1 (the shell: data + render) → M2 (the clock — every later timing system reads it)
→ M3 (the springs — the period/pitch/light reads live) → M4 (the regulars — the
Sentinel's shield and bolt are clock-locked) → M5 (the door + the beat + the trapdoor
— the arena becomes reachable) → M6 (the Warden — needs the beat, the window, the
onZero/pearl chain) → M7 (the ending — needs the pearl + the Warden's death) →
M8 (snapshots + playthrough — needs everything).

Nothing in M2+ depends on M4 (the regulars are independent of the springs); M4 could
land before M3 if the queue demands it, but the house order (story systems before
regulars) is kept — it matches how the design's beats gate the arena.

Shared-code touches (backward-compatible, verified by the L1–7 gates at every
milestone):
- door.js: STAYS_OPEN +3 kinds (M1/M2)
- audio.js: `sfx(name, arg)` + 4 cases (M2; 'spring'/'toll' used from M3/M6)
- arrows.js: the spring block (M3), `arrowBlocked` hook (M4), `hitValue` threading (M6)
- projectiles.js: `cyan` flag (M4), `ttl` param (M6), 'warden' in the reflected list (M6)
- game.js: the updateClock + updateSprings calls (M2/M3), the sunbeam-exempt 'warden' (M6)
- enemies registry: 3 kinds (M4/M6) + `onZero` / `hitValue` / `arrowBlocked` hooks (M4/M6)
- render: zones.js (M1), level.js platform/pit kinds (M1), citadel.js (M1), door.js no-ops (M1), index.js line (M1), render-harness freshGame8 (M8), render.test.js scenarios (M8)
