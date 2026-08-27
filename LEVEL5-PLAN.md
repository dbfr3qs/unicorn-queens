# Level 5 — "The Enchanted Forest" — phased implementation plan

Status: not started. Design: `LEVEL5-DESIGN.md` (confirmed).

One phase = one commit. After every phase: `npm test` + `npm run smoke`
green, and the level 1–4 snapshot md5s unchanged — until M6 intentionally
adds level 5 snapshots.

Existing systems reused unchanged: ground segments + fall respawn (water is
just gaps with water drawn in them, like lava/sludge), zones, slimes,
boxes/loot, proximity dialogue (beats + `when` + `repeat`), the
`level.exit` locked-rect pattern, cross-level carry (bow/big/maxHp/flight).

Dependency order: M2 needs M1 (level data); M3 needs M2 (relicsTaken for
the beat `when`s); M6 needs M1–M5; M7 last.

## M1 — Level 5 data + daylight rendering

- `createLevel5(viewH)` in `src/levels/level5.js` per the design: 5600
  wide; zones `{0–500: 'gate'}, {500–5600: 'forest'}`; ground segments
  (kind `stone` for 0–500, plain grass beyond); water entries in
  `lava: [{x: 2650, w: 600, water: true}, {x: 4200, w: 100, water: true}]`
  (the existing gap render, falling in = the existing pit rule);
  platforms including the new kinds (`branch`, `lily`, `log`) at the
  design positions; the 11 boxes (incl. the 540 safety bow); roster: the 6
  slimes only (bees join in M5 — a roster entry for an unregistered kind
  would crash `createEnemies`); `relics` (3), `bushes` (1), `queen`,
  `mistgate`, `exit: {x: 5470, y: 430, w: 60, h: 130, locked: true}`, and
  `dialogs: []` for now (intro beat lands with M3, Queen beats M3).
- Register as the fourth entry in `src/levels/index.js` (index 4); the
  HUD `LEVEL n` picks up the count automatically.
- `src/render/zones.js` — two new kinds:
  - `gate`: paint the day sky (sun, clouds, daylight ridges — shared
    helpers with `forest`) clipped to the zone, then the castle wall (the
    `hall` purple stone) over it with the arch cut out: wall rects 0–280
    and 460–500 plus a lintel above the arch top (y 300), arched
    top. Sun and hills read through the opening.
  - `forest`: day sky `#7ec8f0`; warm sun disc `#ffe9a3` + two low-alpha
    halo rings (parallax 0.05, fixed screen position); 4 white cloud
    blobs drifting slowly (pure time function, like the deep zone's
    drips — no particle state); far ridge `#79b86a` (parallax 0.35) and
    near ridge `#4e9a4e` (0.6) via the existing `drawRidge`; a seeded
    tree-line row along the near ridge. World x ≥ 3700: the same
    decoration one shade darker (the deep-woods band).
- `src/render/level.js`:
  - ground kind `stone`: cobbled grey-blue blocks (the gate courtyard).
  - platform kinds: `branch` (brown limb + leaf tuft), `lily` (12 px
    green disc with a notch), `log` (horizontal log, rings on the end).
    Default kind unchanged.
  - lava loop: `water: true` → body `#0d2b4e`, surface `#1d4e8e`, a slow
    shimmer line instead of bubbles, no glow.
- New `src/render/forest.js` (world pass, after `drawLevel`): seeded
  deterministic dressing (pure functions of world x — snapshot stable):
  trees (18 px trunks, two-tone canopies), flowers/grass tufts along the
  ground, the **hollow tree** at 2300 (big trunk + full canopy + dark
  round hollow centered 2330,280), tall home flowers at each bee roster
  entry's x (read from `lvl.roster`, guarded — none until M5), pond/stream
  banks. Wired into `src/render/index.js` after `drawLevel`.
- Smoke: add a fifth run (`startGame(600, 4)`, 300 frames).
- Tests (`test/level5.test.js`): data invariants — width 5600, zones
  tile 0–5600, ground ∪ water covers every x exactly once (no overlap,
  no gaps), every box rests on ground/platform, slime rosters inside
  ground bounds, relic/bush/queen/mistgate shapes, exit locked, the 540
  bow box stomp-reachable (on ground).
- Verify by hand (browser): walk left→right end to end — arch into the
  light, lily-pad crossing (or take the hit), the mist gate drawn dim and
  locked at the east edge, exit not winnable while locked.

## M2 — The three relics + the bush

- `src/loot.js`: add `export function addScore(n) { score += n; }` (the
  module-owned `score` can't be reassigned from outside).
- `src/relics.js` (new, `key.js` pattern — pickup logic only):
  - `relicsTaken(lvl)` → count of `taken` relics (the dialogue `when`s).
  - `updateRelics(lvl, p, dt, fx)`: decay each bush's `rustleT`; relic
    pickup on overlap when `visible && !taken && !p.dead` → `taken =
    true`, `addScore(50)`, `relic` chime, gold sparkle burst.
- `src/render/relics.js` (new): three 16×16 sprites — golden horseshoe
  (U shape + nail dots), sapphire (teal faceted diamond), royal acorn
  (gold acorn + cap); each with a soft glint (sin phased by world x,
  like the key's). Drawn only when `visible && !taken`. The bush itself
  is drawn here too (green mound, two tones; a 2×2 white glint pulsing
  on a ~4 s seed while `state === 'hiding'`; a rustle leaf-puff while
  `rustleT > 0`).
- HUD (`src/render/hud.js`): a 3-icon counter top-center, just left of
  the `LEVEL n` text: each icon dim `#5d4a80` until taken, then its
  relic color (gold/teal/gold-acorn).
- The bush: `lvl.bushes = [{ x: 1122, y: 530, w: 56, h: 30, relicId:
  'horseshoe', state: 'hiding', rustleT: 0 }]`. New pass in
  `updateArrows` after the box loop (same shape): arrow crossing a
  `hiding` bush → `state = 'revealed'`, `rustleT = 0.4`, the linked
  relic's `visible = true`, `rustle` sfx, leaf-puff burst; a star arrow
  reveals and keeps flying (box rule), a normal arrow is consumed.
- FX preset `FX.rustle` (green leaf puff); sfx `rustle` (two quick low
  square blips) and `relic` (two-tone sine, the `key` pattern, one step
  brighter).
- Wiring: `updateRelics` in `game.update` (next to `updateKey`);
  `drawRelics` in the world pass (after `drawLevel`/`drawForest`).
- Tests (`test/relics.test.js`): each relic pickable by overlap; one-shot
  (no double score); +50 each; the horseshoe invisible/unsolid-until-
  revealed (no pickup before the bush breaks); a normal arrow reveals the
  bush + consumes; a star arrow reveals + continues; a second arrow does
  nothing; `relicsTaken` counts.

## M3 — The Queen + the story beats

- `src/render/queen.js` (new): the Queen — 48×72 white unicorn: body,
  four legs, neck + head, gold horn with a periodic sparkle glint,
  flowing lavender mane, gold collar, gentle bob (sin, 0.5 Hz), faces the
  player. Drawn in the world pass after `drawPlayer` (she is foreground —
  the player walks "to" her). No collision (walk-through).
- `src/levels/level5.js` — `dialogs`:
  - **intro** beat, rect 40–240 ground band, one-shot, 3 lines (the
    player spawns inside it at x 60 → entry edge on frame 1, the world
    freezes while the objective reads).
  - **queen** beat set, rect 3400–3660 ground band:
    - `q0` repeat, `when: relicsTaken(g.level) === 0` — 2 lines.
    - `q1` repeat, `when: === 1` — 1 line.
    - `q2` repeat, `when: === 2` — 1 line.
    - `q3` once, `when: === 3`, **`onOpen(g, fx)`** — 4 story lines
      (king kidnapped; evil wizard; flying pig; snow-topped mountain;
      mist gate). `onOpen`: `g.level.exit.locked = false`,
      `g.level.mistgate.openT = 1.5`, `g.level.queen.toldStory = true`,
      `fx.play('seal')`.
- `src/game.js` `checkDialogs`: after `openDialogue(beat.lines)` add the
  two-line hook `if (beat.onOpen) beat.onOpen(game, fx);` (existing beats
  are untouched — no `onOpen` means nothing happens).
- Tests (`test/queen.test.js`): intro fires on frame 1 and never again;
  each beat at counts 0/1/2/3 shows the right lines; q0–q2 re-fire on
  re-approach (repeat) while their `when` holds and go silent once it
  stops; q3 fires exactly once even with re-approaches; `onOpen` runs
  exactly once (exit unlocked, openT started, toldStory); no beat fires
  after q3.

## M4 — The mist gate

- `src/mistgate.js` (new, `shaft.js` pattern, ~15 lines):
  `updateMistgate(lvl, dt)` decays `mistgate.openT` 1.5 → 0 (the
  brighten; the field stays open after).
- `src/render/mistgate.js` (new): stone arch at 5450 (same styling as the
  gate arch), mist field between the pillars:
  - locked: dim blue-grey shimmer (slow alpha wave) + faint seal glow —
    the level 3 "sealed" language.
  - opening (`openT > 0`): brightens over the 1.5 s to a glowing
    pale-blue field + rising sparkle motes (pure time function of
    `openT` — snapshot friendly).
- Wiring: `updateMistgate` in `game.update` (next to `updateShaft`);
  `drawMistgate` in the world pass after `drawShaft`.
- Tests (`test/mistgate.test.js`): while locked, standing in the exit
  rect does not win (`reachedExit` false); after the q3 `onOpen` (call
  the beat's `onOpen` directly or drive the dialogue), the same
  position wins; `openT` decays to 0 over 1.5 s and the field stays open;
  restart re-locks (fresh level data).

## M5 — The bee

- `src/enemies/bee.js` (new, self-registers, bat roster shape `{kind, x,
  y, minX, maxX}`): 18×14, **1 hp**, `stompable: true`, contact = sting
  (shared hurt rules; one hit per invuln window as with every enemy).
  Not in the sunbeam exemption list (the sunbeam at 1500 clears them —
  standard non-boss rule).
- AI (straight lines — the bat's sine swoop is too fancy for a bee):
  - **Idle**: hover at home (roster x/y — the tall flower below is the
    "lives here" cue, drawn by `forest.js` in M1) with a fast wing-beat
    and a small circular bob.
  - **Sting**: player within 260 px horizontal / 200 px vertical AND the
    sting cooldown (3–4 s, seeded per home) is done → a straight
    horizontal dash at the player's height (clamped to home y ± 80),
    450 px/s, up to 220 px, then ease back home over ~0.6 s; `buzz` sfx
    at dash start.
- Sprite: golden-brown body with two dark stripes, two flapping wings
  (sin phase), eye glint, stinger.
- sfx `buzz` (low square wobble, two short beeps).
- Roster: add the 6 bees to `level5.js` (2450, 2750, 3100, 3850, 4400,
  4850 per the design).
- Tests (`test/bee.test.js`): registry entry (size/stompable/hp); stomp
  kills with bounce + puff; arrow kills; sting fires when in range with
  the cooldown done (position changes toward the player, `buzz` played
  via fx recorder); no sting while the cooldown runs; dash stops at
  220 px; the bee returns to home; contact hurts the player once
  (second touch inside invuln is free).

## M6 — Level 5 render snapshots

New scenarios in `test/render.test.js` (new `freshGame5` harness entry,
same seeding pattern):

1. **The gate**: spawn in the stone passage — day sky + sun + a cloud
   through the arch opening, cobbled ground.
2. **The bush**: (a) pre-reveal with the glint mid-pulse, (b) revealed
   with the horseshoe picked up beside it (state mutated directly).
3. **The hollow tree**: branch chain + sapphire glinting in the hollow.
4. **The pond**: lily-pad crossing + the solitary floating pad + acorn,
   water shimmer.
5. **The queen's glade**: the Queen mid-bob, horn sparkle, HUD counter
   two-of-three (state mutated).
6. **The mist gate**: locked (dim shimmer) and mid-brighten
   (`openT` mutated to 0.75).
7. **The bee**: mid-sting dash with its home flower (state mutated into
   the dash pose).

Verify visual markers by hand, then commit the new snapshot sections.

## M7 — Playthrough + polish

- `test/level5-playthrough.test.js` (the `level4-playthrough.test.js`
  pattern — the no-soft-lock guarantee end to end): `startGame(600, 4)`
  with `hasBow` + `hasFlight` + `maxHp 4` carried; clear roamers and
  boxes (their own tests cover them) — the chain is:
  1. intro beat opens on frame 1 → advance 3 lines → world runs.
  2. run to the bush, fire an arrow (positioned so the arrow band
     crosses the bush) → rustle → pick up the horseshoe.
  3. branch chain (two buffered jumps) into the hollow → sapphire.
  4. lily-pad crossing (four jumps) → cast flight → up to the floating
     pad → acorn (hp 4 intact: no water touched).
  5. walk to the Queen: beats at counts 1/2/3 (three approach-advance
     cycles) → `onOpen` → exit unlocked.
  6. walk east into the mist gate → `p.won === true`.
- Audio pass: tune `rustle`/`relic`/`buzz` against existing beeps;
  confirm every new sfx name has a case in `audio.js` (a miss is silent —
  the smoke won't catch it).
- README: add the level 5 entry (the forest, the three relics, the
  Queen, the mist gate, the bee) + the loot/levels tables stay accurate
  (no new loot kinds).
- Final verification: `npm test`, `npm run smoke` (five levels), levels
  1–4 snapshot md5s unchanged, one hand playthrough in the browser
  (all three relic orders, the pond hit, a death-restart re-arming the
  safety bow).
