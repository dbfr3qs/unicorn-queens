# Level 7 — "The Peak" — phased implementation plan

Status: PENDING (M1–M8). Design: `LEVEL7-DESIGN.md` (confirmed). One phase =
one commit. After every phase: `npm test` + `npm run smoke` green and the
level 1–6 snapshot md5s unchanged — until M8, which intentionally adds the
level 7 scenarios.

The design's M1–M8 phasing is kept as-is; this plan is the detailed build
spec (exact files, exact functions, exact test assertions). Where the plan
deviates from the design, the deviation is called out in the milestone and
in the **Deviations** list below.

---

## Existing systems reused unchanged

- Ground segments + pits (`lava` array + pit respawn in `src/player.js`),
  extended only by recolor flags on pit entries (`crevasse`, `cauldron`) and
  two new ground kinds (`snow`, `ice`) — the lava-loop recolor pattern is the
  L4 water / L6 sludge flags.
- Zones + parallax painters (`src/render/zones.js`, new kind branch
  `drawPeakZone`).
- Boxes / loot / mystery (`src/boxes.js`, `src/loot.js`; `addScore(50)` from
  `loot.js` is the sigil's +50 path).
- Dialogue beats with `when`/`repeat`/`onOpen` (`src/dialogue.js`).
- Doors (`src/door.js`) — **refactored to multi-door** (Deviation 1); the
  state machine and `DOOR_OPEN`/`DOOR_CLOSE` constants are untouched.
- Enemy registry + spawn (`src/enemies/index.js`, `src/enemies.js`);
  `spec.sleeping` is copied onto the spawn (adder precedent) and guards
  contact damage in `hitPlayer`.
- `damageEnemy` (per-kind `onHit`/`onDeath`), fireballs (lead-aimed),
  shockwaves, cones, sunbeam (with the boss-exemption list).
- The `LEVELS` array + carry (`src/levels/index.js`), pearl (absent in L7 —
  the rainbow replaces it; `updatePearl` already no-ops without one).
- `src/effects.js` FX presets (three new ones), `src/audio.js` (three new
  sfx), the render harness + `smoke.mjs` patterns.

## New systems (and deviations from the design)

1. **Multi-door** — `door.js` assumes one `lvl.door`; L7 has two (the iron
   gate, the throne gate). `updateDoor`/`resolveDoor` iterate
   `lvl.doors ?? (lvl.door ? [lvl.door] : [])`; levels 1–6 data is untouched
   and tests must pass unmodified.
2. **Wind** — `src/wind.js`: pure phase function of time + a per-frame
   `updateWind` that stores the phase in `lvl.wind` and plays the one-shot
   gust SFX (a tiny bit of state: `phase`/`lastPhase`, otherwise pure —
   Deviation 3).
3. **Ice momentum** — the player's vx model changes on ice
   (accel/decel constants + `iceAir` carry into jumps); snow is unchanged.
4. **Sigil** — `src/sigil.js` (the relics.js pattern): shatter the block,
   pick up the key, open the iron gate remotely.
5. **Weak-point hook** — `arrows.js`: enemies may expose `weakPoint(e)`;
   stage-1 wizardboss uses it (body hits deflect, only the rune damages).
6. **Wizardboss** — two-stage boss on one entity (pig → sorcerer), the
   dragon.js pattern (state machine, pips, `onHit`, `onDeath`).
7. **Peak ending** — `src/peakending.js` + `src/pig.js`: the release
   sequence (pig walk-off, wraiths freed, cage opens). The rainbow exit
   opens with the King's end beat, not at release (Deviation 11).
8. **M1 verification is "to the iron gate", not the throne gate**
   (Deviation 2): the iron gate is locked in M1 and full height (flight
   cannot skip it), so the design's "walkable end-to-end to the throne gate"
   is unreachable in M1. The spire interior is verified by state-mutated
   snapshots in M8 (the L6 M8 pattern).
9. **Wraith stomp** — the design says "stomp passes through"; the codified
   ghost rule in `enemies.js` is *bounce* (`p.vy = E_STOMP_V`, no enemy
   damage). The wraith uses the codified bounce (Deviation 4).
10. **Wizard dormant flag** — the design's `dormant` roster flag is
    implemented as the generic `sleeping` flag (the elder-adder precedent,
    already copied by `spawnEnemy`).
11. **The exit opens with the King's word, not at release** — the design
    says the rainbow lights at release. But the stage-2 contact-safe camp
    (x ≥ 6216, the sorcerer's clamp 6160 + 56) overlaps the exit rect
    (6220–6280): an unlock at the death edge would win the player on the
    release frame and skip the King's end beat (its `when` gate is only
    re-checked on band entry). So `peakending.js` no longer touches
    `exit.locked` (the `rainbow` chord still plays at release — the storm
    breaking) and the `l7-king-end` beat carries
    `onOpen: g => { g.level.exit.locked = false; }` (the level-5
    hand-over pattern). The lit rainbow and the passable exit both arrive
    with the line "The rainbow is open — walk through".

---

## M1 — Level data + peak rendering

`src/levels/level7.js` — `createLevel7(viewH)` (the level6.js shape):

- `width: 6300`, `height: viewH`, `groundY: 560` (the L4–L6 constant).
- `zones` (the `{x0, x1, kind}` shape, the level6.js pattern):
  ```js
  zones: [
    { x0: 0,    x1: 500,  kind: 'peakgate' },
    { x0: 500,  x1: 3600, kind: 'snowfield' },
    { x0: 3600, x1: 5400, kind: 'spire' },
    { x0: 5400, x1: 6300, kind: 'throne' },
  ],
  ```
- `ground` segments (exact, from the design's ground/pit table):
  `{0,500,'stone'}` `{500,1250,'snow'}` `{1250,150,'ice'}` `{1550,700,'snow'}`
  `{2250,150,'ice'}` `{2550,1050,'snow'}` `{3600,300,'stone'}`
  `{4050,1350,'stone'}` `{5400,900,'snow'}`.
- `lava` (pits, with new recolor flags):
  `{x:1400, w:150, crevasse:true}`, `{x:2400, w:150, crevasse:true}`,
  `{x:3900, w:150, cauldron:true}` (each `y: groundY`).
- `platforms`: the ice bridge `{2400, groundY-6, 150, kind:'ice'}`; the
  cauldron dais `{3925, groundY-6, 60, kind:'dais'}`; the cage dais
  `{5990, groundY-40, 130, kind:'dais'}`.
- `boxes` (12, from the design): `{550 bow}, {750 gem}, {1200 boots},
  {1700 star}, {2200 heart}, {2700 magnet}, {3200 mystery}, {4300 gem},
  {4700 heart}, {5050 star}, {5350 shield}, {5900 heart}` — ground boxes
  at `y: groundY-36`, 36×36; the 5350 shield in the pre-arena band, the
  5900 heart on arena snow. (Bow = first-of-trilogy, no repeat later.)
- `doors` (multi-door, Deviation 1):
  ```js
  doors: [
    { x: 3600, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'irongate' },
    { x: 5400, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'thronegate' },
  ],
  ```
- `throneTrigger: { x: 5280, y: 0, w: 120, h: groundY }` (consumed in M5).
- Sigil (consumed in M3): `sigilBlock: { x: 3090, y: groundY-76, w: 56,
  h: 56, state: 'intact', shatterT: 0 }`, `sigil: { x: 3112, y: groundY-16,
  w: 16, h: 16, visible: false, taken: false }`.
- `cage: { x: 5998, y: groundY-114, w: 64, h: 74, open: false, openT: 0 }`
  (sits on the dais: dais top `groundY-40`, cage h 74).
- `wind: { phase: 'calm', lastPhase: 'calm' }` (M2 consumes).
- `throneGateOpen: false` (M5 sets it; the wizard reads it in M6),
  `pig: null`, `ending7: { started: false }` (M7 consumes).
- `dialogs: []` (M3/M5/M7), `roster: []` (M4/M6).
- **No pearl** (L7 has none — the rainbow is the exit).
- `exit: { x: 6220, y: 430, w: 60, h: 130, locked: true, kind: 'rainbow' }`.

`src/levels/index.js` — register at index 6:
`{ name: 'peak', make: viewH => createLevel7(viewH), carry: { hasBow: true, hasFlight: true } }`.

`src/door.js` — multi-door refactor:
- `const doors = lvl.doors ?? (lvl.door ? [lvl.door] : []);` in both
  `updateDoor` and `resolveDoor`; loop bodies unchanged.
- The webwall stays-open guard (`webwall: stays open forever`) becomes a
  kind set; M1 adds only the iteration (M3 adds `'irongate'`, M5
  `'thronegate'` to the set).
- Tests: all of `door.test.js` passes unmodified (single-door shim); new
  multi-door test — two locked full-height doors each clamp the player
  independently at their own x; opening one leaves the other solid.

`src/render/zones.js` — new kinds → `drawPeakZone(c, kind, x, w, level,
cam, t, viewW)` (the L6 two-call pattern: back + world-anchored where
needed). Per the design's art section:
- `peakgate`: the stone arch (L2/L6 shape) with the snowfield starfield
  showing through the opening; the spire beyond, a little left of center.
- `snowfield`: starfield gradient `#0a1428 → #1a2c4a`; ~40 small stars
  (seeded, parallax 0.05, twinkle); the silver moon `#e8f0f8` (parallax
  0.05, halo); the spire silhouette (parallax 0.2, right of center,
  dark violet-black, faint dim glow at the peak); two snow layers
  (parallax 0.3 ~40 small slow flakes; 0.5 ~24 large fast flakes; flake
  tilt reads `windPhase(t)` — M2; pure function of t); the far pine line
  (0.5) and near pine line (0.7), dark blue-black `#0e1a30`.
- `spire`: interior purple-black stone `#1a1026` (a lighter variant of the
  L6 interior); the seven floating orbs (seeded Lissajous, warm amber
  `#ffd9a0`, alpha pulse ~2s) — the interior's only light; the porthole at
  4500 (r 40, iron rim, the starfield through the glass with the cage
  silhouette, a faint glint while the king beat is unspent — the peak
  world pass checks `game.dialogsFired`); the throne gate's dim seal glow
  is the door render's job.
- `throne`: the open starfield (deeper blue, more stars); the cloud sea
  below (white-lavender band, parallax 0.1, slow drift, pure in t); the
  spire's outer wall at the west edge (5400–5500, stone).

`src/render/level.js` — new ground kinds + pit recolors + platform kinds:
- ground `'snow'`: the base fill + a 10px white cap with a faint blue
  shadow line; ground `'ice'`: glossy pale blue `#bfe4f0`, a glint streak,
  a thin crack line.
- the lava loop: `crevasse: true` → deep blue-black `#0a1220` (a faint
  glow at the bottom, white ice lips at the surface); `cauldron: true` →
  dark purple `#2a1245` with a purple glow, bubbles as a pure function of
  t (the water/slug flag pattern).
- platform kinds: `'ice'` (the bridge — glossy ice, 6px tall), `'dais'`
  (stone with a snow cap and a rim trim).

`src/render/peak.js` (new world pass, wired in `render/index.js` after the
mire pass, guarded by `level.ground?.some(g => g.kind === 'snow')`):
- the stair silhouette (3 steps receding up-west behind the spawn, 0–500);
- the wind vane (post at x 700, head at `groundY-120`; four pure-in-t
  states from `windPhase(t)`: calm — rooster facing east, still;
  telegraph — tail wagging (sin of t); gust — facing east, 1px jitter;
  updraft — pointing straight up);
- the ice block (snow-capped cube; the black crystal glint on a ~4s seed
  while `state === 'intact'`; the shatter anim while `shatterT > 0`; the
  broken stub once `gone`) and the sigil on the ground (amber crystal +
  glint) while `visible && !taken`;
- the cauldron: the stone rim + dark purple liquid + bubbles (the liquid
  itself is the recolor flag in `render/level.js`, under the dais);
- the King's cage on the dais (iron bars, the King's silhouette inside,
  the lock glint while sealed; the door-swing anim from `cage.openT` —
  always sealed until M7);
- the rainbow exit (a dim sealed arc while `exit.locked`; the full spiral
  + shimmer (pure in t) once `locked === false` — reachable in M1 only by
  state mutation, for the M8 snapshots);
- the iron gate / throne gate renders move to `render/door.js` kind
  branches: `irongate` sealed (iron portcullis over stone, a dim seal glow
  at the hub) and `thronegate` sealed (dark iron wall, purple seal glow).
  The rise (M3) and flare→dissolve (M5) come later.

No `game.update` wiring in M1 (doors/pearl already run; `updatePearl`
no-ops without `lvl.pearl`).

`smoke.mjs` — a seventh run: `startGame(600, 6)`, 300 frames.

Tests — `test/level7.test.js` (data invariants, the L5/L6 test pattern):
width 6300; zones tile 0–6300 in order; ground ∪ pits cover every x in
[0, 6300) exactly once; every box sits on ground or a platform; two doors,
both `locked`, full height, kinds `irongate`/`thronegate`; `throneTrigger`
rect; sigil block `intact` + sigil hidden; cage sealed; exit `locked`,
kind `rainbow`, rect; no `lvl.pearl`; `wind` shape; carry in
`LEVELS[6]` = bow + flight.

Hand-check: `?level=7` — walk left → right to the iron gate (fly over the
crevasse 1400, the ice-bridge gap, the cauldron dais hop). The starfield
sky, moon, snow, pines, the calm vane, the sealed solid iron gate at 3600.
The spire interior and throne gate are behind the locked gate — verify by
state-mutating `doors[0].state = 'open'` in the console (M8 snapshots cover
it permanently).

---

## M2 — Wind + ice physics

`src/wind.js` (new):

```js
export const WIND_CYCLE = 10;
export function windPhase(t) {
  const c = t % WIND_CYCLE, n = Math.floor(t / WIND_CYCLE);
  if (c < 6) return 'calm';
  if (c < 7) return 'telegraph';
  return n % 4 === 3 ? 'updraft' : 'gust';   // every 4th gust updrafts
}
export function updateWind(lvl, p, dt, fx, t) {
  const ph = windPhase(t);
  lvl.wind.phase = ph;
  if (ph !== lvl.wind.lastPhase) {
    if (ph === 'telegraph' && p.x + p.w / 2 >= 500 && p.x + p.w / 2 < 3600
        && !p.dead) fx.play('gust');   // one howl per cycle, zone-gated
    lvl.wind.lastPhase = ph;
  }
}
```

- `game.update` (game.js): `updateWind(game.level, game.player, dt, fx,
  game.gameTime)` **before** `updatePlayer` (the player reads
  `lvl.wind.phase` this frame); guarded by `game.level.wind`.
- Ice physics in `src/player.js`:
  - `src/levels/level.js` gains `export function standingKind(p, lvl)` —
    the kind of the surface under the player's feet: when `p.onGround`,
    scan `lvl.ground` for the segment whose x-range contains
    `p.x + p.w/2` and whose `y` is within 8px of the feet; then
    `lvl.platforms` the same way; else `null`.
  - Constants: `ICE_ACCEL = 900`, `ICE_DRAG = 0.02`, `ICE_MAX = 1.3 *
    P_SPEED` (=338). New player field `iceAir: false`.
  - Replace the vx snap line with:
    ```js
    const iceGround = !player.flying && player.onGround &&
      standingKind(player, lvl) === 'ice';
    const target = ((inp.right ? P_SPEED : 0) - (inp.left ? P_SPEED : 0)) * slow;
    if (iceGround || (player.iceAir && !player.flying)) {
      // ice: momentum. Steer toward the input at ICE_ACCEL, never brake
      // below ICE_MAX while holding; with no input, almost no friction.
      if (target !== 0 &&
          (Math.sign(target) !== Math.sign(player.vx) ||
           Math.abs(target) > Math.abs(player.vx))) {
        player.vx = Math.max(target - ICE_ACCEL * dt,
                             Math.min(target, player.vx + ICE_ACCEL * dt));
      } else if (target === 0) {
        player.vx *= Math.max(0, 1 - ICE_DRAG * dt);
        if (Math.abs(player.vx) < 2) player.vx = 0;
      }
      player.vx = Math.max(-ICE_MAX, Math.min(ICE_MAX, player.vx));
    } else {
      player.vx = target; // normal ground/air/flight: snap, as today
    }
    ```
  - `iceAir` lifecycle, at the end of `updatePlayer` (after the pit check):
    `if (player.onGround) player.iceAir = false;`
    `else if (!player.flying && iceGround) player.iceAir = true;`
    (leaving ice in a jump keeps the slide through the air; landing clears
    it).
- Wind push (ground only, snowfield only), in `updatePlayer` after the vx
  model:
  ```js
  if (lvl.wind?.phase === 'gust' && !player.flying && player.onGround &&
      player.x + player.w / 2 >= 500 && player.x + player.w / 2 < 3600)
    player.x -= 100 * dt;   // headwind: position push, vx untouched
  ```
  (A position push, so an ice slide through a gust keeps its 338 vx and
  the net drift is slide − 100 — the design's "costs ~40%" at run speed.)
  Flight is never pushed — the clean escape.
- Updraft lift + flight-timer pause, in the flight branch of
  `updatePlayer` (where `player.flightT -= dt` and the vy decisions live):
  while `lvl.wind?.phase === 'updraft'` and the player is in
  [500, 3600): `flightT` does **not** decrement; and when `up`/`down` are
  not held, `vy = -40` (a gentle lift; up/down still override).
- sfx `gust` (audio.js): a low howl — sawtooth 140→60 Hz, 0.6s, gain 0.12.
- The snowfield zone flakes tilt with `windPhase(game.gameTime)` (the
  zone render already receives `t`).

Tests — `test/wind.test.js`:
- `windPhase` boundaries: t=0–5.99 calm; 6–6.99 telegraph; 7–9.99 gust;
  cycles 1–3 normal gusts; cycle 4 (t 37–39.99) updraft; cycle 5 gust again.
- `updateWind`: stores the phase; the 'gust' sfx plays exactly once per
  cycle and only with the player in [500, 3600) (player at x 300 → no sfx;
  at x 700 → sfx on the calm→telegraph edge).
- Push: with `lvl.wind.phase = 'gust'` forced, a grounded player at x 700
  loses ~100px over 60 frames; no push while flying; no push at x 400 or
  x 3700; a 338 vx ice slide keeps its vx through the gust (position moves,
  vx unchanged).
- Updraft: a neutral flying player in the zone keeps `flightT` constant
  over 60 frames (control: without the updraft it drops 1.0); `vy === -40`
  while up/down unheld; outside the zone the timer runs.

Tests — `test/ice.test.js` (the L4 ice-spawn helper pattern, L7 spans):
- `standingKind`: on the 1250 span → 'ice'; on the 750 snow span → 'snow';
  on the ice bridge → 'ice'; airborne → null; on the dais → 'dais'.
- Slide: holding right on ice reaches 338 and holds it for 300 frames
  (|vx − 338| < 2); the same input on snow gives exactly 260.
- No input on ice: vx decays ~2%/s (338 → ≈331 after 60 frames ±3) and
  settles to 0 below 2.
- Reverse: from +338 holding left, vx after 0.2s ≈ 158 ± 10 (900 px/s²),
  and reaches −260 within 0.7s ± 0.05.
- Jump carry: on ice at vx 338, jump — first airborne frame |vx| > 300
  (iceAir); with no input, |vx| after 60 airborne frames ≈ 331; landing on
  snow snaps vx to the input model next frame (no input → 0).
- Flight over ice: vx snaps to the input model (260) — the ice model never
  applies while flying.
- Boots: a booted player still slides on ice (boots don't grip yet — L9).

Hand-check: `?level=7` — run up the 1250–1400 ice span (feel the slide,
jump off it into the crevasse-1 run-up), cross the bridge; stand at the
vane and wait a full 10s cycle: tail wag at 6s, the howl, the snow tilts
and the gust pushes a grounded player west; flying (S) during the gust —
no push; on the updraft (4th gust, ~37s) the lift and the frozen HUD
flight timer are visible.

---

## M3 — The sigil + the iron gate

`src/sigil.js` (new, the relics.js pattern):

```js
export function updateSigil(lvl, p, dt, fx) {
  const block = lvl.sigilBlock, sig = lvl.sigil;
  block.shatterT = Math.max(0, block.shatterT - dt);
  if (sig.visible && !sig.taken && !p.dead && rectsOverlap(p, sig)) {
    sig.taken = true;
    addScore(50);            // from loot.js, the relic-chime path
    fx.play('relic');
    burst(sig.x + 8, sig.y + 8, FX.relic);
    const gate = lvl.doors[0];            // the iron gate, by index
    gate.state = 'opening';
    gate.openT = DOOR_OPEN;
    fx.play('seal'); fx.play('gate');     // the remote unlock, audible 500px off
    burst(gate.x + 20, gate.y + gate.h / 2, FX.relic);
  }
}
```

- Wired in `game.update` next to `updateCogs` (guarded by `game.level.sigilBlock`).
- Arrow pass in `updateArrows` (after the box loop, the L6 nest pattern):
  a live arrow crossing `lvl.sigilBlock` while `state === 'intact'` →
  `state = 'gone'`, `shatterT = 0.4`, `sig.visible = true`, `crack` sfx,
  `FX.iceShatter` at the block center; a normal arrow is consumed, a star
  shatters it and keeps flying (the box rule: `if (!a.star) a.dead = true`).
- `door.js`: add `'irongate'` to the stays-open kind set (the portcullis
  never drops again).
- `render/door.js`: the `irongate` rise — while `opening`, the portcullis
  grid slides up: offset `= (1 - openT / DOOR_OPEN) * h` (pure in openT);
  while `open`, only the retracted top band.
- `render/peak.js`: the block's states (glint while intact, shatter anim
  while `shatterT > 0`, the stub once gone) + the sigil on the ground.

Tests — `test/sigil.test.js`:
- Intact: the sigil is not pickable while `!visible`; a second arrow after
  shatter is a no-op.
- Shatter: fire an arrow from x 2950 facing right, step frames until it
  crosses 3090 — block `gone`, `shatterT ≈ 0.4`, sigil `visible`, the
  normal arrow consumed; a star shot: block gone **and** the star
  survives (still in `arrows`).
- Pickup: player overlapped on the visible sigil → `taken`, +50 score
  (asserted the L6 cog way), `relic` sfx, `doors[0].state === 'opening'` +
  `openT === 1.0`, `seal` + `gate` sfx.
- Gate: after `DOOR_OPEN` the state is `open`; a player walking east
  passes (no clamp); 5s of further updates — still open (never re-seals).

Hand-check: `?level=7` — walk to the ice block, shoot it (shards), pick up
the sigil; the portcullis at 3600 rises (watch from the snowfield — the
gate glow is visible across the spire mouth); walk in: the orbs, the
porthole, the sealed throne gate.

---

## M4 — The hare + the wraith

`src/enemies/hare.js` (new, self-registering): `hare`, 24×20, 1hp,
stompable. Roster shape `{ kind, x, minX, maxX }`.

- AI (the slime patrol shape + a dart):
  - `patrol`: 30 px/s, turn at `minX`/`maxX` (the L1–L6 patrol constant).
  - Player within 160px and `e.dartCd <= 0` → `crouch` 0.3s (ears back,
    no movement) → `dart`: a 100px ballistic hop **away** from the player —
    `vx = ±150`, `vy = -300` (apex ≈ 50px, air time ≈ 0.67s), `puff` sfx;
    lands at `groundY - h`, then `recover` 0.4s, then `patrol`;
    `e.dartCd = 3` (per-hare seeded offset in `spawnEnemy` is not needed —
    set from `x % 3` so they don't sync).
  - Stompable **mid-hop** (the shared stomp path works airborne); soft
    death: `FX.fluffPuff` (new preset, white/grey fluff), `puff` sfx — the
    game's softest death.
- Contact: 1 damage, the shared path.

`src/enemies/wraith.js` (new, self-registering): `wraith`, 26×30, 1hp,
`stompable: false` (the codified ghost bounce — Deviation 4). Roster shape
`{ kind, x, y, bound }` (`bound` copied like `sleeping` — extend
`spawnEnemy` with `bound: spec.bound ?? false`).

- AI (the ghost.js drift-close pattern, re-anchored):
  - Hover at the anchor (±6px sine bob on `anchorX/anchorY`).
  - Player within 260px → `drift`: 45 px/s toward the player; within 120px
    descend to chest height `y = groundY - 44` (the ground-arrow band
    reaches it); hold until the player is > 320px → return to the anchor.
  - `bound: true` (the arena wraiths): same AI, always solid — see alpha.
- Wind alpha (the mountain wraiths only): export
  `wraithAlpha(e, phase)` — unbound: calm 0.45 / telegraph 0.7 / gust 1.0
  (+ a frost rim in the draw during gust); bound: 1.0 always. The draw
  computes the phase via `windPhase(game.gameTime)` — a lazy `game` import
  inside the kind file is safe (used only in `draw`, never at module eval;
  the render path already imports game).
- Release (M7 sets the flag): `if (e.freed)` → `e.freeT += dt`; at 1s →
  `e.dead = true`; draw fades the alpha with a `FX.relic` sparkle while
  `freeT` runs (one `grant` sfx at release, played by M7).
- New FX: `fluffPuff` (the hare). The wraith release reuses `FX.relic`.

`src/levels/level7.js` roster (M4 entries):

```js
roster: [
  { kind: 'hare', x: 800,  minX: 700,  maxX: 1100 },
  { kind: 'hare', x: 1750, minX: 1650, maxX: 2050 },
  { kind: 'hare', x: 2900, minX: 2800, maxX: 3200 },
  { kind: 'hare', x: 3300, minX: 3250, maxX: 3550 },
  { kind: 'wraith', x: 1100, y: 420 },
  { kind: 'wraith', x: 2100, y: 410 },
  { kind: 'wraith', x: 3000, y: 430 },
  { kind: 'wraith', x: 5550, y: 420, bound: true },
  { kind: 'wraith', x: 5950, y: 430, bound: true },
],
```

Tests — `test/hare.test.js`:
- Registry: 24×20, 1hp, stompable; the roster shape spawns all four.
- Stomp kills (bounce + `fluffPuff` + `puff`); arrow kills.
- Dart: player within 160 with the cooldown ready → 0.3s crouch (no
  movement), then vx sign = away from the player, `vy === -300`, lands
  ≈100px away ±20, 0.4s recover, patrol resumes; a second approach within
  3s does not re-dart (cooldown); mid-hop stomp kills.
- Contact does 1 damage (the shared path — one assertion).

Tests — `test/wraith.test.js`:
- Registry: 26×30, 1hp, `stompable: false` — the stomp bounces the player
  (`vy = E_STOMP_V`), no enemy damage, the wraith survives.
- Arrow-only: arrow kills (arrow is the only kill path — no stomp, no
  sunbeam exemption: the sunbeam **does** kill wraiths, the L5/L6 house
  rule — assert one sunbeam kill to pin the house rule).
- Drift: player 200px away → moves toward the player at 45 px/s (Δx over
  10 frames); player 100px away → descends to `y === groundY - 44` and
  holds; player 400px away → returns to the anchor ±2px.
- `wraithAlpha`: unbound calm 0.45 / telegraph 0.7 / gust 1.0; bound →
  1.0 for every phase (the pure helper — the draw's frost rim is covered
  by the M8 snapshot).

Hand-check: `?level=7` — approach a hare (crouch → dart away, stompable
mid-hop); the wraiths drift to chest height and pop to one ground arrow;
watch the alpha change through a gust cycle (the 1100 wraith near the
vane is the reference).

---

## M5 — The spire story (porthole, king beat, cage, throne gate)

`src/levels/level7.js` — two dialog beats (the design's dialogue verbatim):

```js
dialogs: [
  { id: 'l7-intro', x: 40, w: 200, repeat: false, speaker: 'The Unicorn Queen',
    lines: [
      'The Peak. I did not want to come here.',
      'The wind knows me. The ice remembers. That is all.',
      'Find what fell from the sky. The spire will open for it.',
    ] },
  { id: 'l7-king', x: 4380, w: 240, repeat: false, speaker: 'The Unicorn King',
    lines: [
      '(through the porthole) I am sorry. I could not carry you out of that storm.',
      'Free me and I will wait no longer. The rainbow is ready — it only needs its storm broken.',
    ] },
],
```

(The ending beat — `l7-king-end` — lands in M7 with its `when` guard.)

`src/door.js` — the throne-gate trigger (kind hook inside the `locked`
branch of the loop):

- While `state === 'locked'` and `door.kind === 'thronegate'`: if the
  player rect overlaps `lvl.throneTrigger` and `!door.flare` →
  `door.flare = true; door.flareT = 0.8; fx.play('boss');`.
- While `door.flare`: `door.flareT -= dt`; when ≤ 0 → `state = 'opening'`,
  `openT = DOOR_OPEN`, `lvl.throneGateOpen = true` (the level flag the
  wizard reads in M6). `flare`/`flareT` are door-local (the L6 vent
  one-shot pattern).
- Add `'thronegate'` to the stays-open kind set.

`render/door.js` — the throne gate render:
- sealed: dark iron wall, a purple seal glow (a slow ~3s pulse, pure in t);
- while `flare` (0.8s): the seal flares brighter, an alpha ramp with
  `flareT`;
- while `opening` (1.0s): **dissolve** — overall alpha
  `openT / DOOR_OPEN`, rising dark motes (pure in t + openT, the L6
  webwall-melt pattern); while `open`: nothing (the gap is open).

`render/peak.js` — the porthole glint: while
`!game.dialogsFired.has('l7-king')`, a faint glint on the glass (seeded
~5s); gone once the beat fires. The cage stays sealed (M7 opens it).

No new game.update wiring (the door loop + dialogue already run).

Tests — `test/peak-story.test.js`:
- Intro: fires on frame 1 (spawn inside the 40–240 rect), 3 lines, no
  repeat (the dialogue.test.js pattern).
- King beat: teleports the player to x 4400 → fires once (2 lines);
  re-entering the rect does not refire; `game.dialogsFired.has('l7-king')`
  flips false→true (the porthole glint condition).
- Throne gate: player at x 5200 (outside the trigger) — locked, no flare;
  move into 5280–5400 → `boss` sfx, `flare` 0.8s; after 0.9s of updates →
  `opening` and `lvl.throneGateOpen === true`; after `DOOR_OPEN` → `open`;
  a player walking east passes; 5s later still open (never re-seals);
  the iron gate is unaffected by the throne trigger (multi-door
  independence — the same trigger rect does not touch `doors[0]`).

Hand-check: `?level=7` (with the M3 sigil) — walk into the spire; the
King's beat at the porthole (the cage silhouette in the glass, the glint
disappears after); approach 5280: the seal flares, the wall dissolves
into motes, the arena opens behind it; walk back west — the gate stays
gone (the off-ramp is real).

---

## M6 — The wizard and his pig (the boss)

`src/enemies/wizardboss.js` (new, self-registering, the dragon.js pattern)
: `wizardboss`, stage-1 rect = the pig 64×48, **16 hp**, two stages of 8,
`stompable: false` (the stomp bounces — the dragon rule). 16 pips, 2 rows
of 8 (the dragon draw), tinted violet in stage 1 (the rune's pips).

Roster (added to level7.js in M6):

```js
{ kind: 'wizardboss', x: 6500, minX: 5500, maxX: 6200, sleeping: true },
```

- `sleeping` (Deviation 10): while sleeping — no update, no contact
  (the `hitPlayer` guard), drawn off-screen east of the arena (x 6500 >
  level width 6300; the camera's max scroll keeps it off-view).
- Wake: in `update`, `if (e.sleeping) { if (lvl.throneGateOpen) { e.sleeping = false; e.state = 'entering'; e.t = 1.0; } return; }` —
  `entering` (1.0s ease): descend from y 200 to the hover start, x 6500
  → 6200 (the "enters from the east" beat; the `boss` sfx already played
  on the gate flare in M5).

**Stage 1 — the flight (the rune, 8 hp).** The entity IS the pig; the
mounted wizard is invulnerable (arrows spark off him — see the weak-point
hook below).

- Hover (pure in `e.age`, accumulated in update): 
  `e.x = 5850 + 350 * Math.sin(2*Math.PI * e.age / 8 + e.phase0)` (slow sine
  across the band, period ~8s; `phase0 = (e.x0 / 7) % (2π)` desyncs
  replays); `e.y = (lvl.groundY - 160) + 50 * Math.sin(e.age / 2)`
  (350–450; the pig's bottom 398–498 — above the ground-arrow line at the
  top of the arc: the dragon rule).
- `weakPoint(e)` (the new hook, stage 1 only): the rune (24×24) on the
  pig's near flank (the side facing the player): 
  `const fx = (p.x < e.x) ? 8 : e.w - 32; return { x: e.x + fx, y: e.y + 12, w: 24, h: 24 };`
  Stage 2 returns `null` (full body).
- Attacks (tempo: idle 1.0–1.5s between; the dragon's `pickAttack` pattern):
  - **Dark bolt (50%)**: `windup` 0.4s (staff raise + glow) → the
    mage's lead-aimed fireball (the dragon.js tFlight lead pattern),
    1 damage. A reflected bolt (player shield) hits the pig body → the
    rune's pool (1) — via the reflected-boss path (see below).
  - **Swoop (30%)**: `swoopTele` 0.5s crouch, `snort` sfx → `swoop`: a
    fast 420 px/s pass in the player's x direction, a shallow arc sinking
    to `y ≈ groundY - 70` at the midpoint (a parabola over the pass
    length, capped inside the band 5500–6264), 1 damage on contact;
    `swoopRec` 0.5s at the far end — the pig sits at ground-arrow height
    for 0.5s (the rune's window; the design's "sits at ground-arrow
    height").
  - **Snort cone (20%)**: a ground-level cone from the pig toward the
    player — `fireCone` with a new `violet: true` flag (the cone render
    draws it dark violet, the L6 web-glob recolor pattern), fired only
    when the pig is at the bottom of the arc or in `swoopRec` (ground
    level); 1 damage, the L4 fire-cone contact rules.
- **Rune shatter (hp ≤ 8)**: `crack` sfx, `FX.runeShatter` (new, dark
  violet shards), `shake(cam, 6, 0.4)` → `crash` 0.4s: the pig falls to
  the ground (eased), `thud` + `FX.snowPuff` (new, white flakes) → the
  wizard is `stunned` 2s (standing on the floor, dazed — the free
  repositioning window; contact stays live, the dragon-stagger
  precedent) → **stage 2**: set `e.w = 56; e.h = 56; e.y = lvl.groundY - 56;`,
  state `idle`, the pips re-tint to the sorcerer.

**Stage 2 — the sorcerer (8 hp, on foot).**

- Movement: idle drift toward the player at 60 px/s (the ground-boss
  language), clamped to the band 5500–6160.
- Attacks (idle 0.7–1.1s; **≤4 hp**: 0.5–0.9s + the staff-tip glow
  intensifies in the draw — the phase cue):
  - **Bolt**: as stage 1 (staff aim + lead).
  - **Slam**: `slamTele` 0.5s (staff plants, crouch, `creak`) → `thud` +
    `shake(cam, 4, 0.2)` → `fireShockwaves(e.x + e.w/2, lvl.groundY, fx)`
    — the existing troll helper (two radial waves, SHOCK_SPEED 180, 1
    damage each, the L4 shockwave rules).
  - **Seal circle**: `sealTele` 0.6s — a glint on the floor at the
    player's x, **clamped to the band 5500–6160** (the L6 build-note rule)
    → a dark column rises at the glint. Boss-owned `e.columns = [{ x, w:
    40, h: 140, t }]` (the spiderboss pillar pattern); a new export
    `updateColumns(e, p, dt, fx, cam)` wired in `game.update` next to
    `updatePillars` (guarded by a live wizardboss): 0.3s rise, 0.8s stand
    (1 damage contact), 0.5s decay; `FX.sealColumn` (new, dark violet
    motes).
  - **Fan (≤4 hp)**: 3 bolts in a spread (±20° around the lead-aimed
    line — three `fireFireball` calls with angle offsets), 1 damage each.
- Stagger on hit, both stages: the shared `onHit` pattern (0.3s + flash,
  the house rule).
- **Death (hp ≤ 0)**: `onDeath` — `growl` sfx, `FX.ashBurst` (new, large
  grey-violet ash), `shake(cam, 9, 0.6)`. The ending sequence itself is
  M7 (driven off `e.dead`).

Shared wiring (M6):

- **`arrows.js` weak-point hook** (inside the per-enemy overlap test,
  before `damageEnemy`):
  ```js
  const weak = e.weakPoint ? e.weakPoint(e) : null;
  if (weak && !(a.x < weak.x + weak.w && a.x + 14 > weak.x &&
                a.y < weak.y + weak.h && a.y + 4 > weak.y)) {
    // struck the body, not the rune: it sparks off (the dragon rule)
    fx.play('deflect');
    burst(a.x + 7, a.y + 2, FX.mageSpark);
    if (!a.star) { a.dead = true; }  // stars keep flying (the box rule)
    if (a.dead) break; else continue; // note: must skip damageEnemy
  }
  ```
  (Implement as an early `continue`/`break` inside the enemy loop — the
  exact control flow is written in the PR; the behavior spec above is the
  contract. The hook is generic: only wizardboss stage 1 defines
  `weakPoint`.)
- **`projectiles.js`**: add `'wizardboss'` to the reflected-boss find
  (`e.kind === 'mage' || e.kind === 'dragon' || e.kind === 'wizardboss'`).
- **`game.js` `fireSunbeam`**: add `'wizardboss'` to the exemption list.
- **sfx**: `snort` (a pig snort — square 200→90 Hz, 0.2s, + a soft puff).
- **New FX**: `runeShatter`, `ashBurst`, `snowPuff`, `sealColumn`.

Tests — `test/wizardboss.test.js` (the dragon.test.js pattern):
- Registry: 64×48, 16hp, not stompable (stomp bounces, no damage).
- Dormant: `sleeping` — no movement over 60 frames, no contact damage;
  `lvl.throneGateOpen = true` → `entering` 1.0s → the hover begins (x
  ends at 6200, y on the arc).
- Stage 1: over 10s of frames `e.y` stays in [350, 450] and `e.x` in the
  band ± the pass; `weakPoint` returns a 24×24 rect on the flank facing
  the player (both directions).
- Weak point: an arrow crossing the body but missing the rune → `deflect`
  sfx, the normal arrow consumed, **no hp change**; a star: `deflect`, no
  hp change, star survives; an arrow through the rune → hp −1 + the
  stagger flash (0.3s).
- Bolt: a stationary player — the bolt's path crosses the player's box;
  a moving player — the lead targets ahead (the dragon lead test shape).
- Swoop: `snort` sfx on the telegraph; the pass moves ~420 px/s (Δx over
  0.1s ±10); the midpoint y ≈ `groundY - 70` ±10; a player in the path
  takes 1 damage; after the pass, 0.5s of `swoopRec` with the pig at
  ground-arrow height — a ground arrow fired then hits the rune (hp −1;
  the designed window).
- Cone: a `cones` entry with `violet: true`, the L4 contact rules (1 dmg,
  one hit each).
- Rune shatter: at hp 8 — `crack` + `runeShatter` + shake; the crash
  lands the pig at the ground (`thud` + `snowPuff`); 2s of `stunned`
  (no attacks issued in that window); then stage 2 (e.w 56, e.h 56,
  y `groundY - 56`).
- Stage 2: bolt; slam → the `shockwaves` array gains 2 waves; seal
  circle → the column x is clamped (player at x 5450 → column x ≥ 5500;
  player at x 6250 → ≤ 6160), the column's contact does 1 damage, the
  life ≈ 0.3+0.8+0.5s; the fan at hp ≤ 4 → 3 fireballs spread ±20°;
  tempo: the idle window is shorter at ≤4 (0.5–0.9s observed over 5
  cycles).
- Reflected bolt: a player with `shield > 0` standing in the bolt's path
  → the bolt reflects (`reflected: true`), then hits the boss → hp −1
  (stage-1 pool).
- Sunbeam exempts the boss (the `fireSunbeam` test pattern).
- Death: hp 0 → `ashBurst` + `growl` + shake, `e.dead === true`.

Hand-check: `?level=7` (full chain) — the flare, the dissolve, the pig
swoops in from the east; duel stage 1 (rune-only hits, the swoop window,
the snort cones), the shatter + crash + 2s stun (land 2–3 hits), stage 2
(slam shockwaves, seal columns, the fan at ≤4, the staff glow);
shield-reflected bolts work; kill him — the ash burst (the ending is
M7's).

---

## M7 — The ending (release, not a kill)

`src/pig.js` (new, the bridge.js pattern):

```js
export function updatePig(lvl, dt, fx) {
  const pig = lvl.pig;
  if (!pig) return;
  if (pig.state === 'stand') {
    pig.t -= dt;
    if (pig.t <= 0) pig.state = 'walk';
  } else if (pig.state === 'walk') {
    pig.x -= 40 * dt;
    if (pig.x < 5450) { pig.state = 'gone'; lvl.pig = null; }
  }
}
```

`src/peakending.js` (new) — the one-shot release sequence:

```js
export function updatePeakEnding(lvl, enemies, dt, fx) {
  const wiz = enemies.find(e => e.kind === 'wizardboss');
  if (!lvl.ending7.started && wiz && wiz.dead) {
    lvl.ending7.started = true;
    for (const e of enemies) {                 // the bound wraiths release
      if (e.kind === 'wraith' && e.bound && !e.freed) { e.freed = true; e.freeT = 0; }
    }
    fx.play('grant');
    lvl.cage.open = true; lvl.cage.openT = 1.2; fx.play('gate');
    lvl.pig = { x: wiz.x, y: lvl.groundY, state: 'stand', t: 0.5, w: 64, h: 48 };
    lvl.exit.locked = false;                    // the rainbow lights
    fx.play('rainbow'); fx.play('seal');
  }
  lvl.cage.openT = Math.max(0, lvl.cage.openT - dt);
  updatePig(lvl, dt, fx);
}
```

- Wired in `game.update` (guarded by `game.level.ending7`, next to
  `updateSigil`).
- `src/levels/level7.js` — the ending beat (third dialog):
  ```js
  { id: 'l7-king-end', x: 5900, w: 300, repeat: false, speaker: 'The Unicorn King',
    when: game => game.enemies.some(e => e.kind === 'wizardboss' && e.dead),
    lines: [
      'You did it. I am… free. The storm breaks.',
      'Thank you. The rainbow is open — walk through, and the Sky Citadel is yours.',
    ] },
  ```
- `src/wind.js` sfx — `rainbow` (a bright rising major arpeggio + shimmer,
  ~0.8s — the game's first "good" chord).
- `src/enemies/wraith.js` — the freed fade (from M4's spec, wired now):
  `freed` → `freeT` runs to 1s → `dead`; the draw sparkles + fades.
- `render/peak.js` — the cage door swing (pure in `cage.openT`), the
  pig (stand/walk, a small walk bob; the M1 pig draw is repurposed), the
  lit rainbow (already drawn from M1 when `exit.locked === false`).
- The exit is unchanged: `reachedExit` honors `exit.locked` — walk east
  into the rainbow → `p.won` → the standard win overlay → the carry to
  level 8 (index 7, when it exists; until then the win restarts the same
  level, as with every level today).

Tests — `test/peakending.test.js`:
- Death edge: a fake wizardboss (`sleeping`, hp 1) is killed by one arrow
  → next `updatePeakEnding`: `ending7.started === true` exactly once
  (a second call is a no-op); the bound wraiths `freed` (+ `grant`);
  `cage.open` + `openT === 1.2` (+ `gate`); `lvl.pig` exists at the
  boss's x, state `stand`; `exit.locked` still `true` (Deviation 11)
  (+ `rainbow` + `seal`).
- The pig: stand 0.5s → walk (x decreasing ≈ 40 px/s) → past 5450 →
  `lvl.pig === null`.
- Wraith release: a freed wraith fades over 1s → `dead`; no contact
  damage during the fade.
- The king-end beat: fires with the boss dead and the player in
  5900–6200; does **not** fire while the boss is alive (the `when` guard);
  no repeat.
- The exit: locked while the boss is alive **and at the release**
  (standing in the dim arc → no `p.won`); the King's end beat's `onOpen`
  unlocks it, and walking into the lit rainbow → `p.won === true`
  (Deviation 11).

Hand-check: `?level=7` (full chain) — kill the wizard: the ash, the pig
shakes off the snow and walks off west, the wraiths sparkle away, the
cage door swings open, the King's beat, the rainbow lights (the first
sunrise of the game — no, the first *good chord*), walk in → the win
overlay.

---

## M8 — Snapshots, playthrough, polish

- `test/helpers/render-harness.js` — `freshGame7` (index 6).
- `test/render.test.js` — new level 7 scenarios (8, the L6 pattern; some
  state-mutated, verified manually first, then the md5s committed):
  1. the gate: the spawn passage — starfield through the arch, the moon,
     the stairs, the calm vane.
  2. the snowfield mid-gust: `game.gameTime` offset to t ≈ 7.5 — tilted
     snow, the vane east + jitter, the 1100 wraith at alpha 1.0 with the
     frost rim.
  3. the ice bridge: a player sliding on the 2400 bridge (state-mutated
     vx 338), the crevasse lips, the cauldron with the dais in mid-pit.
  4. the sigil: (a) the intact block mid-glint, (b) shattered + the
     sigil on the ground.
  5. the spire: the interior — orbs, the porthole with the cage in the
     glass + the glint (beat unspent), the iron gate mid-rise
     (state-mutated openT 0.5).
  6. the throne gate: (a) sealed + purple glow, (b) mid-flare (flareT
     0.4), (c) mid-dissolve (openT 0.5, motes).
  7. the arena: stage 1 — the wizard on the pig mid-hover, the rune's
     8/16 pips, a swoop telegraph (state-mutated); stage 2 — the
     sorcerer, a seal column mid-rise (state-mutated), a bound wraith
     with the rune collar.
  8. the ending: the lit rainbow, the open cage, the pig walking west,
     the freed wraith mid-fade (state-mutated), and the win overlay.
- `test/level7-playthrough.test.js` (the L5/L6 playthrough pattern;
  `startGame(600, 6)` — carry gives the bow + flight; `p.maxHp = 4;
  p.hp = 4` as the L6 test does; clear the roamers (hares, wraiths) and
  the boxes first — the boss is the exception, it is the chain):
  1. The intro beat fires on frame 1 (the Queen, 3 lines) → close.
  2. Walk to the ice block at 3090 — the 1250 ice span (slide + jump
     into the crevasse-1 run-up), the 2250 run-up → bridge, the 2400
     crevasse.
  3. Fire the arrow at the block → the sigil appears → pick it up (+50).
  4. Wait 1.1s (the gate rise) → walk into the spire.
  5. The King's porthole beat (4380–4620) → close.
  6. The cauldron pit: hop onto the dais (3925), across.
  7. Enter the throne trigger (5280–5400) → flare 0.8s → dissolve 1.0s →
     the arena.
  8. The wizard enters (1.0s) → the duel (the L4 dragon spacing pattern,
     adapted): stand at the arena edge ~300px off the pig; fire at the
     rune during `swoopRec` / the arc bottom (a jump arrow at the bottom);
     jump the swoop on the telegraph; sidestep the snort cones; expect
     hp 8 → the crash + the 2s stun (land 2–3 hits in the window);
     stage 2: jump the slam shockwaves, step off the seal glints, time
     the fan; fire during staggers; cap 10800 frames; expect
     `boss.dead` and `p.hp >= 1`.
  9. The ending: the pig walks off (wait for `lvl.pig === null`), the
     freed wraiths fade (no contact), the cage opens, the King's ending
     beat (walk 5900–6200) → close → walk east into the rainbow (6220) →
     `p.won === true`, `p.hp >= 1`.
- The audio pass: every `fx.play` name in `src/` has a case in
  `audio.js` (the new ones: `gust`, `snort`, `rainbow`) — the L5 M7 diff
  check.
- README: the level 7 entry (the house table row).
- Final snapshot commit; the level 1–6 md5s must be unchanged.

---

## Dependency order

- M2 (wind/ice) is independent of M3 (sigil) — either order.
- M4 (roamers) is independent of M3/M5 (it only needs M1's data + the
  M4 `spawnEnemy` `bound` extension).
- M5 needs M1 (the multi-door) and M3 (the sigil must exist to get past
  the iron gate in a hand-check; the throne-gate logic itself only needs
  M1).
- M6 needs M5 (the `throneGateOpen` wake flag) and M4 (the bound wraiths
  exist for the arena — not strictly required for the boss tests).
- M7 needs M6 (`e.dead`), M4 (the wraith fade), M3 (the cage/ending art
  is M1's).
- M8 is last (the playthrough needs everything).
- The `arrows.js` weak-point hook and the `projectiles.js`/`game.js`
  kind-list edits are M6-internal (they touch shared files — land them in
  the M6 commit, tests for both shared paths included).
