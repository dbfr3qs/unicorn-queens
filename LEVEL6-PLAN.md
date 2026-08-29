# Level 6 — "The Blackmire" — phased implementation plan

Status: PENDING (M1–M8). Design: `LEVEL6-DESIGN.md` (confirmed).

One phase = one commit. After every phase: `npm test` + `npm run smoke`
green, and the level 1–5 snapshot md5s unchanged — until M8 intentionally
adds level 6 snapshots.

Existing systems reused unchanged: ground segments + fall respawn (water =
gaps with the L5 `water` recolor), zones, boxes/loot, proximity dialogue
(beats + `when` + `repeat` + `onOpen`), the `level.exit` locked-rect
pattern, `resolveDoor` (solid while `locked`), the platform `hidden` flag
(L3 nook ledge — non-solid until revealed), the pearl's `showWhen`
(seal-break on pickup), the `LEVELS[i].carry` test-jump gear (bow +
flight), the enemy registry (self-registering kind files), `fireSunbeam`
(boss-exempt list).

Dependency order: M2 needs M1 (winch/cog state + beats); M3 needs M2
(the vent/sac flags are flipped by the winch beats); M4 needs M2 (w5's
`onOpen` drives the bridge + wall); M5 and M6 are independent; M7 needs
M4 (the pearl's `showWhen`); M8 last.

## M1 — Level 6 data + mire rendering

- `createLevel6(viewH)` in `src/levels/level6.js` per the design: 6800
  wide; zones `{0–400 'miregate'}, {400–3800 'mire'}, {3800–6800
  'mire-deep'}`; ground segments `{0, 400, 'stone'}, {400, 700}, {1450,
  450}, {2300, 3200}, {5800, 1000}` (marsh east and the winch temple are
  one segment); water `{1100, 350}, {1900, 400}, {5500, 300}`, all
  `water: true`; platforms: roots `{780, 440, 90}, {900, 350, 90},
  {1010, 250, 90}` (kind `root`), nest `{910, 170, 60}` (kind `nest`),
  logs `{1150, 554, 80}, {1310, 554, 80}`, lilies `{1950, 554, 70},
  {2210, 554, 70}`, altar daises `{4250, 520, 150}` and `{6400, 520,
  120}` (kind `altar`), bridge `{5500, 554, 300, kind: 'bridge', hidden:
  true}`; the 12 boxes (ground boxes at y 524; the 1180 star on its log
  at y 518).
- New level state, all in this data:
  `winch: { x: 4900, sockets: [false, false, false], turning: false }`;
  `cogs`: heron `(942, 154)`, adder `(2092, 490)`, weaver `(4310, 504)` —
  each 16×16, `taken/visible/installed: false`, `stage` 0/1/2 (the
  socket that must be filled first — the gate lives in the hiding spots'
  reveal flags, M3);
  `nest: { x: 910, y: 170, w: 60, h: 24, state: 'webbed', unravelT: 0 }`;
  `vent: { x: 2100, active: false, activated: false, popped: false, t: 0,
  bubbleY: 560 }`;
  `sac: { x: 4310, y: 496, w: 28, h: 24, present: false, popped: false }`;
  `bridge: { x: 5500, y: 554, w: 300, state: 'raised', lowerT: 0 }`;
  `door` (the web wall): `{ x: 5800, y: 0, w: 40, h: groundY, state:
  'locked', openT: 0, kind: 'webwall' }`;
  `pearl: { x: 6440, y: 504, w: 16, h: 16, visible: false, taken: false,
  showWhen: enemies => enemies.some(e => e.kind === 'spiderboss' &&
  e.dead) }`;
  `exit: { x: 6680, y: 430, w: 60, h: 130, locked: true }`;
  `dialogs: []` (M2); `roster: []` (M5/M6/M7).
- Register in `src/levels/index.js` as the index-5 entry:
  `{ name: 'blackmire', make: viewH => createLevel6(viewH), carry: {
  hasBow: true, hasFlight: true } }` (the `?level=6` test jump then
  works, like L3–L5).
- `src/render/zones.js` — three new kinds, all pure seeded functions
  (snapshot-stable, the L5 daylight precedent inverted):
  - `miregate`: the `hall` stone with the arch cut out (the L5 gate
    pattern, dark palette) — the mire gloom shows through the opening.
  - `mire`: sky bands `#0d1a12` → `#16241a`; a pale moon `#cfe8c8`
    (parallax 0.05, fixed screen position, two low-alpha halo rings);
    **the mountain** — a large snow-capped peak silhouette, right of
    center, parallax 0.2 (the story's anchor); **the wizard fly-by** —
    every ~40 s (a pure t function, visible ~6 s of the period) a small
    24×16 dim wizard-on-pig silhouette crosses the sky above the
    mountain; **fog** — three wide soft bands (parallax 0.15/0.3/0.45,
    slow horizontal drift + alpha pulse); **fireflies** — 7 warm specks
    on seeded Lissajous drifts with alpha pulses; far cypress line
    (0.5) and near cypress line (0.7) — bare trunks with drooping
    branch nubs (a `drawRidge` variant).
  - `mire-deep`: the same dressing one shade darker, a fourth fog band,
    the mountain scaled ~1.15× and brighter (you are getting close),
    overhead web lines between the near cypresses.
- `src/render/level.js` — new platform kinds: `root` (a gnarled brown
  limb, knobby), `nest` (a stick nest), `altar` (a mossy stone dais,
  lit top), `bridge` (raised: a vertical timber slab at the west bank;
  lowering: the span pivots on its west end, angle a pure function of
  `1 - bridge.lowerT / 1.2`; lowered: a flat plank span with ropes).
  The existing `hidden`-flag skip keeps it non-solid until lowered.
- `src/render/mire.js` (new, world pass after `drawLevel`, wired in
  `render/index.js` guarded like `drawForest`): dead cypresses (the
  great cypress at 950, trunk to y 150), giant ferns, the sunken temple
  (broken columns at 4700/5400, mossy blocks), the vent's stone rim,
  **the winch** (a stone wheel on a beam, three hub notches; installed
  cogs drawn in the notches; wheel angle `winch.turning ? t * 0.5 : 0`
  — a pure time function; a rune above each socket glows when filled),
  **the nest web** (a web wrap over the nest while `webbed` — a white
  2×2 glint pulsing on a ~4 s seed, the bush pattern; a thread-puff
  while `unravelT > 0`), **the vent bubble** (translucent green disc,
  highlight arc, the cog visible inside; drawn while `active &&
  !popped` and `bubbleY < 554`), **the egg sac** (a web-wound blob +
  glint while `present && !popped`; a broken husk after), **the exit
  arch** (the stone arch with the stairway to the peak beyond — snow
  band on the steps, the mountain face; sealed: dim + faint seal glow,
  the L3 sealed language; `exit.locked === false`: bright + rising
  sparkle motes, a pure t function).
- `src/render/door.js` — the `webwall` kind, sealed state only in M1: a
  dense white lattice (diagonal crosshatch, ~8 px cells) + a slow
  shimmer (an alpha wave, a pure t). The melt animation lands in M4.
  Until M4 the door is never opened, so the sealed render is all M1
  needs.
- No new `game.update` calls (the door/pearl updates already run;
  cogs/vent/bridge updates come in M2–M4).
- Smoke: add a sixth run (`startGame(600, 5)`, 300 frames).
- Tests (`test/level6.test.js`): data invariants — width 6800; zones
  tile 0–6800; ground ∪ water covers every x exactly once (no overlap,
  no gap — the L5 test pattern; this catches the 4600–5500 temple-floor
  gap); every box rests on ground or a platform (the 1180 star on its
  log); the three cogs' shapes + stages + hidden-by-default; the vent
  dormant, the sac absent, the nest webbed, the winch sockets false,
  the bridge raised + its platform `hidden`; the door locked,
  `webwall` kind, full height; the pearl's `showWhen` false with no
  dead boss and true given a fake dead `spiderboss`; the exit locked.
- Verify by hand (browser, `?level=6`): walk left→right end to end
  (flight over the three pits) — the gloom/moon/fog/fireflies render,
  the sealed web wall stops the player solid, the raised bridge slab,
  the dead winch, the sealed exit arch.

## M2 — The cogs + the winch

- `src/cogs.js` (new, the `relics.js` pattern):
  - `cogsSet(lvl)` → count of filled sockets (the beat `when`s).
  - `updateCogs(lvl, p, dt, fx)`: decay the nest's `unravelT`; cog
    pickup on overlap when `visible && !taken && !p.dead` → `taken`,
    `addScore(50)`, `relic` chime, sparkle burst. The sequential chain
    is enforced by the hiding spots (M3) — a cog's `visible` can only
    be set through its own reveal, and reveals 2 and 3 need sockets 0
    and 1.
- `src/levels/level6.js` — `dialogs`:
  - **intro** beat, rect 40–240 ground band (the spawn band, fires on
    frame 1), speaker "The Old Winch", one-shot, 3 lines (the gate spat
    you out below the peak; the sealed pass; the three cogs).
  - **winch** beat set, rect 4780–5080 ground band, speaker "The Old
    Winch":
    - `w0` repeat, `when: cogsSet === 0 && !cogs[0].taken` — 2 lines
      (the runes; the heron's cog in the webbed trees to the west).
    - `w1` once, `when: !winch.sockets[0] && cogs[0].taken`,
      **`onOpen`** — socket 0 fills, `cogs[0].installed = true`,
      `vent.active = true`, `gear` chime. 1 line.
    - `w2` repeat, `when: cogsSet === 1 && !cogs[1].taken` — 1 line
      (the mud in the east is burbling).
    - `w3` once, `when: !winch.sockets[1] && cogs[1].taken`,
      **`onOpen`** — socket 1 fills, `cogs[1].installed = true`,
      `sac.present = true`, `gear` + `spin`. 1 line.
    - `w4` repeat, `when: cogsSet === 2 && !cogs[2].taken` — 1 line
      (the altar in the fern grove; the guardian is waking).
    - `w5` once, `when: !winch.sockets[2] && cogs[2].taken`,
      **`onOpen`** — socket 2 fills, `cogs[2].installed = true`,
      `winch.turning = true`, `bridge.state = 'lowering'` +
      `lowerT = 1.2`, `door.state = 'opening'` + `openT = 1.5`,
      `rumble` + `creak` + `spin` + `seal`. 1 line.
- HUD (`src/render/hud.js`): a `cogs` branch beside the L5 `relics`
  counter, same position (top-center left of the LEVEL text): three
  cog icons (a ring with three spokes each; heron bone-white
  `#e8e0d0`, adder copper `#c98f3d`, weaver black-purple `#7a5fa0`),
  lit when `winch.sockets[i]`, dim `palette.hint` until then.
- sfx `gear` (audio.js): two descending square clunks (120 → 80 Hz,
  0.08 s each).
- Wiring: `updateCogs` in `game.update` (next to `updateRelics`).
- Tests (`test/cogs.test.js`): a cog is pickable only when
  `visible && !taken` (set `visible` directly; the stage gate is M3);
  +50 each, one-shot (no double score); `cogsSet` counts sockets;
  the beats (the queen.test.js pattern): the intro fires on frame 1
  and never again; w0 fires at 0 sockets and repeats while cog0 is
  untaken; w1 fires exactly once on approach with cog0 in hand —
  `onOpen` side effects exactly once (socket 0, cog installed, vent
  active, `gear`); w2 repeats at 1 socket; w3 once (socket 1, sac
  present); w4 repeats; w5 once (socket 2, turning, bridge
  `lowering` + `lowerT 1.2`, door `opening` + `openT 1.5`); no beat
  fires after its socket is filled; an installed cog is not
  re-pickupable.

## M3 — The three hiding spots

- **The nest web** (cog0's reveal): a new pass in `updateArrows`
  (after the box loop, the bush pattern): an arrow crossing `lvl.nest`'s
  rect while `state === 'webbed'` → `state = 'open'`, `unravelT = 0.5`,
  `cogs[0].visible = true`, `pop` sfx, `FX.webPuff` (a new preset: a
  white thread-puff) at the web center; a normal arrow is consumed, a
  star arrow continues (the box rule).
- **The vent** (cog1's reveal): new `src/vent.js` — `VENT_CYCLE = 10`
  (rise 1.2 s / bob 5.0 s / sink 1.2 s / idle 2.6 s), `VENT_TOP = 480`,
  the bubble 36×36 centered on `vent.x`. `updateVent(lvl, dt, fx)`:
  while `!active || popped` return; `t += dt`; phase by `t % 10` —
  rise: `bubbleY = lerp(560, 480, t / 1.2)`; bob: `480 +
  sin((t - 1.2) * 2) * 4`; sink: `lerp(480, 560, (t - 6.2) / 1.2)`;
  idle: 560 (underwater, not drawn). On the first frame the bubble
  breaks the surface after activation: `puff` sfx. The arrow pass
  (next to the nest): an arrow crossing the bubble rect `{x - 18,
  bubbleY, 36, 36}` while `bubbleY + 36 <= 556` (fully out of the
  water) → `popped = true`, `cogs[1].visible = true`, `cogs[1].x/.y`
  set to the bubble center (the pop point), `pop` + `FX.webPuff`; a
  normal arrow is consumed, a star continues. Wiring: `updateVent` in
  `game.update`.
- **The egg sac** (cog2's reveal): pop logic in `updateCogs` (it owns
  the cog reveals) while `sac.present && !popped`:
  - stomp — the player overlaps the sac AND `p.vy > 50` (a real drop,
    not a walk-by on the dais) → `popped`, `cogs[2].visible = true`,
    `cogs[2].x/.y = (4310, 504)` (on the dais), `p.vy = P_BOUNCE_V`,
    `pop` + `FX.webPuff`.
  - the arrow pass (next to the nest/vent): an arrow crossing the sac
    rect while `present && !popped` → the same pop, the arrow
    consumed.
- The elder adder's wake is M5 (it reads `sac.present`, which w3's
  `onOpen` already flips).
- Tests (`test/mire-secrets.test.js`): the nest — a webbed nest hides
  the cog (no pickup), an arrow shot opens it (cog visible, arrow
  consumed), a star opens + continues, a second shot is a no-op; the
  vent — dormant while `!active` (no bubble motion, no pop possible);
  after activation: the cycle timings (mid-rise between 560/480, bob
  ≈ 480 ± 4, sinking, underwater at t ≈ 9), the first-surface `puff`
  plays once per activation; a mid-bob pop places cog1 at the pop
  point and a player standing on a lily pad picks it up (overlap); no
  pop while the bubble is underwater (the `bubbleY + 36 <= 556` guard
  fails); one-shot; the sac — absent while `!present`; a falling
  player (`vy > 50`) pops it — bounce + cog2 on the dais, pickable; a
  walk-by on the dais (`vy <= 50`) does not pop; an arrow pops it;
  one-shot.

## M4 — Bridge, web wall, exit arch, pearl

- `src/bridge.js` (new, the `shaft.js` pattern): `BRIDGE_LOWER = 1.2`;
  `updateBridge(lvl, dt)` — while `lowering`: `lowerT -= dt`; at 0 →
  `state = 'lowered'` and the bridge platform's `hidden = false` (the
  span becomes solid — the existing platform-skip rule does the rest).
  The `creak` plays in w5's `onOpen`. Wiring: `updateBridge` in
  `game.update`.
- `src/door.js` — one guard: the `open → closing` transition is
  skipped when `door.kind === 'webwall'` (the wall melts permanently;
  it never re-seals). Everything else — the `opening → open` decay,
  `resolveDoor`'s solid-while-locked — is reused as-is.
- `src/render/door.js` — the `webwall` melt: while `opening`, the
  sealed lattice dissolves — a global alpha `openT / 1.5` plus three
  rising thread wisps (a pure function of `openT` and t, snapshot
  friendly); `open` draws nothing.
- The exit arch brighten is state-based (the M1 render): sealed = dim +
  the seal glow; `exit.locked === false` = bright + the motes. The
  pearl pickup already plays `seal` + the burst (`pearl.js` unchanged;
  the pearl sits on the boss altar, its `showWhen` from M1).
- Tests (`test/bridge.test.js`): the bridge raised — a player at
  x 5600 falls (pit damage + respawn at last safe ground); w5's
  `onOpen` (called directly) → `lowering` + `lowerT 1.2`; after 1.3 s
  → `lowered`, the platform solid (a player stands on it, `onGround`,
  `y = 554 - h`); the web wall sealed — `resolveDoor` clamps a player
  pushed east at x 5790 to `x = 5800 - p.w`; after the melt (drive
  `openT` to 0) — passable (no clamp); the wall never re-seals (5 s of
  updates, still `open`); the pearl — hidden until a dead `spiderboss`
  is in the enemies array (a fake one), pickup → `exit.locked = false`
  + `seal`; standing in the exit rect while locked does not win; after
  the pearl it does.

## M5 — Snakes + the elder adder

- `src/enemies/snake.js` (new, self-registers **two kinds** off one
  shared brain factory):
  - `snake`: 26×12, **1 hp**, `stompable`, crawl 40 px/s, strike range
    200 px, a 120 px lunge at 380 px/s, cooldown 4 s (±seeded per
    roster x), telegraph 0.25 s, recover 0.5 s.
  - `adder`: 44×18, **3 hp**, `stompable`, crawl 25 px/s, a 180 px
    lunge at 360 px/s, cooldown 6 s, telegraph 0.3 s, recover 0.6 s,
    roster `{ kind: 'adder', x: 4150, minX: 3550, maxX: 4450 }`.
- AI: `patrol` (crawl between minX/maxX; the body wiggle is a render
  sine) → `telegraph` (still; the head rises, a tongue flick, `slither`
  sfx) when the player is within 200 px horizontal AND the cooldown is
  done → `strike` (a horizontal lunge in the player's direction,
  capped at the strike distance) → `recover` → patrol.
- The elder adder starts `sleeping: true` (a roster-entry flag carried
  onto the spawned enemy): coiled sprite, no movement, no contact
  damage — `hitPlayer` in `enemies.js` gains a one-line guard
  `if (e.sleeping) return;` (a generic flag; only the adder uses it).
  Wake: while `sleeping && lvl.sac?.present` → `waking` 0.6 s (a
  stretch, `slither`) → patrol.
- Sprite: an elongated segmented body (dark green-brown, pale belly,
  the head + forked tongue on telegraph, eye glints).
- Roster (`level6.js`): 5 snakes (650: 500–1050; 1600: 1500–1900;
  2500: 2400–3100; 3300: 3200–3600; 4100: 4000–4450) + the adder. Both
  kinds are sunbeam-clearable (not on the exemption list).
- sfx `slither` (audio.js): a short high hiss-trill (a 600 → 900 Hz
  sweep, 0.15 s).
- Tests (`test/snake.test.js`): the registry entries (sizes/hp/
  stompable); a stomp kills (bounce + puff); an arrow kills; the
  strike — in range with the cooldown done, the telegraph plays
  `slither` (the fx recorder) then the dash moves toward the player,
  stops at 120/180 px, recovers, resumes the patrol; no strike while
  the cooldown runs; contact hurts once (the second touch inside the
  invuln window is free); the adder — sleeping: doesn't move and a
  player overlapping it takes no damage (the guard); wakes on
  `sac.present` (the 0.6 s stretch + `slither`); 3 hp (dies on the
  third arrow hit); the 180 px lunge; the 6 s cooldown.

## M6 — The spider

- `src/enemies/spider.js` (new, self-registers): `spider`, 20×14,
  **1 hp**, `stompable`. Roster shape `{ kind, x, y }` — (x, y) is the
  **web anchor** (y 410, on the overhead web).
- AI: `hang` — on its thread (x sways `sin(t * 1.3 + seed) * 4` around
  the anchor, y = anchor + 46 + a small bob; the thread is a 1 px line
  anchor → spider, drawn from `e.anchorX/Y`) → `pounce` when the player
  is within 220 px horizontal AND the cooldown (3.5 s, seeded) is done
  — a ballistic leap: `vx = clamp(dx / 0.7, ±240)`, `vy = -260`,
  gravity 900 → lands (feet at groundY) → `recover` 0.5 s → `climb`
  back to the anchor at 140 px/s → `hang`.
- Sprite: a round dark abdomen (a pale web-pattern glint), a small
  cephalothorax, 8 jointed legs (animated while climbing/pouncing), two
  glowing red eye dots (the spooky cue).
- Roster (`level6.js`): six anchors at 800, 1850, 2250, 2900, 3750,
  4400 (y 410). The overhead webs they hang from are drawn by
  `mire.js` reading the roster (guarded — none before M6; the
  bee-flower pattern).
- Tests (`test/spider.test.js`): the registry entry; a stomp kills; an
  arrow kills; the pounce — in range with the cooldown done, the arc
  goes toward the player (vx sign, an apex above the launch point),
  lands on the ground, recovers, climbs back to the anchor (±2 px); no
  pounce while the cooldown runs; a hanging spider is jump-stomp
  reachable (anchor 410 + thread 46 → its top ≈ 458, inside the 130 px
  jump apex); contact hurts once.

## M7 — The Weaver Queen + the web-slow

- `src/enemies/spiderboss.js` (new, self-registers, the `dragon.js`
  pattern): `spiderboss`, 72×56, **16 hp**, `stompable: false` (a
  stomp bounces the player off, no damage — the shared `hitPlayer`
  rule), pips 16 in two rows of 8 (the dragon's pip pattern). Roster
  `{ kind: 'spiderboss', x: 6100, minX: 5900, maxX: 6650 }`.
- AI — a ground crawler (idle crawls toward the player at 60 px/s,
  clamped to the band), attacks picked by weight:
  - **Lunge**: `lungeTele` 0.5 s (a crouch squash, web-tremor lines,
    `slither`) → `lunge` — a dash in the player's direction as of fire
    time, 380 px/s, up to 260 px → `lungeRec` 0.6 s.
  - **Spit**: a 0.4 s wind-up → `fireWebGlob` (a new helper in
    `projectiles.js`: a fireball with a `web: true` flag), aimed with
    the mage's lead (target = player center + `vx * dist /
    FIREBALL_SPEED`), 240 px/s, 14 px. Hit = 1 damage + **web-slow**
    (`p.webT = 2.5`).
  - **Web pillar**: `pillarTele` 0.6 s — a glint on the ground at the
    player's x → a pillar at the glint's x (lives on the boss:
    `e.pillars = [{ x, w: 40, h: 140, t }]`) rises 0.25 s, stands 0.8
    s, decays 0.5 s. Contact while solid = 1 damage + web-slow. It
    never moves — the dodge is walking off it.
  - **Egg volley** (phase 2 only): three `fireBoulder`s at player
    x − 80 / x / x + 80 (the boulder's solved arc), each `web: true`
    (a white render), 1 damage each, no slow.
  - **Phases**: phase 1 (16→9): lunge 40 / spit 35 / pillar 25, idle
    1.0–1.5 s; phase 2 (≤8): lunge 30 / spit (double) 30 / pillar 25 /
    volley 15, idle 0.7–1.1 s.
  - `onHit`: the stagger + flash (the dragon's). `onDeath`:
    `shake(9, 0.6)`, `FX.spiderbossDeath` (a new preset, the
    dragonDeath pattern), `growl`.
- **The web-slow** (player.js): `webT: 0` in `createPlayer`; decay in
  `updatePlayer`; the speed factor `P_SPEED * 0.45` applied to the `vx`
  line only while `webT > 0 && !flying` (the slow binds the legs, not
  the wings). Render (`render/player.js`): while `webT > 0`, a few
  white thread lines wrapped across the sprite + a thread trail behind
  it, alpha ramping in over the first 0.2 s.
- Projectile renders: a `web` fireball = a pale web ball (a light disc
  + three crosshatch threads) vs the mage's purple; a `web` boulder =
  white vs the troll's grey.
- `game.js` `fireSunbeam`: add `'spiderboss'` to the boss exemption
  list (the `mage`/`dragon` check).
- sfx (audio.js): `spit` (a wet whoosh, a 300 → 150 Hz sine sweep,
  0.15 s), `growl` (a low roar, the dragon-death pattern one octave
  down), `pop` (a 500 Hz square blip 0.05 s + a low thud), `puff` (two
  low sine blips 100/130 Hz), `spin` (a fast rising trill 300 → 900 Hz,
  0.25 s), `creak` (two slow descending sawtooth slides 200 → 90 Hz,
  0.3 s each). (`gear` and `slither` land in M2/M5.)
- Tests (`test/spiderboss.test.js`): the registry entry (72×56, 16 hp,
  not stompable); a stomp does no damage and bounces the player
  (`vy = E_STOMP_V`); an arrow → the stagger + flash, hp − 1; the
  lunge — the telegraph (0.5 s, `slither`), the dash stops at 260 px,
  the recover; the spit — a stationary player: the glob's path crosses
  the player's box; a moving player: the aim leads (the target is
  ahead of the player); a hit → damage + `p.webT === 2.5`; the pillar
  — the glint at the player's x, the pillar rises at the glint,
  contact → damage + slow, gone after ~1.55 s, never moves; the egg
  volley fires only in phase 2 — three `web` boulders, 1 damage each,
  no slow; phase 2 — at hp 8 the idle range shrinks, a double spit
  (two globs in the air); the web-slow — a slowed player's `|vx|` is
  `0.45 * P_SPEED` (a 0.1 s update, measure the dx), flight speed is
  unaffected while slowed (`vy = -FLY_UP`), `webT` decays to 0; the
  sunbeam spares the boss; death — the shake + burst + `growl`, the
  pearl shows (`updatePearl` with a dead boss in the array →
  `visible`).

## M8 — Snapshots, playthrough, polish

New scenarios in `test/render.test.js` (a new `freshGame6` harness
entry, the same seeding pattern):

1. **The gate**: the spawn passage — the gloom sky + the moon + a fog
   band through the arch, the cobbled ground.
2. **The nest**: (a) webbed with the glint mid-pulse, (b) open with
   the heron cog on top (state mutated).
3. **The vent**: the bubble mid-bob, the adder cog visible inside, the
   lily pads.
4. **The altar**: the egg sac present on the dais, the elder adder
   coiled asleep behind it (state mutated).
5. **The winch temple**: one of three sockets filled (the cog in the
   notch, the rune glowed), the wheel still, the fog + the fireflies.
6. **The bridge + the web wall**: (a) the raised slab + the sealed
   lattice, (b) the lowered span + the wall mid-melt (`openT` 0.75).
7. **The spider hollow**: the Queen mid-crawl, pips 12/16, the overhead
   webs, her altar; a web pillar mid-rise (state mutated).
8. **The exit arch**: sealed (dim, the seal glow) and unlocked (the
   bright stairway to the peak).

Verify the visual markers by hand, then commit the new snapshot
sections (the L1–L5 md5s must be unchanged).

- `test/level6-playthrough.test.js` (the L5 playthrough pattern — the
  no-soft-lock guarantee end to end): `startGame(600, 5)` (the bow +
  flight arrive via `LEVELS[5].carry`; `maxHp 4`/`hp 4` set as
  run-specific); clear the roamers and the boxes (their own tests cover
  them — the boss stays, it is the chain). The chain:
  1. the intro beat opens on frame 1 → 3 lines → close.
  2. the root chain (two buffered jumps + a hop onto the nest) → fire
     the arrow at the web → the heron cog appears → descend and pick
     it up.
  3. east to the winch → `w1` (socket 0, the vent wakes).
  4. east to the vent: wait for the bubble to reach its bob (a
     while-loop over frames), fire an arrow at it → pop → lily-pad
     crossing, pick up the adder cog.
  5. back west to the winch → `w3` (socket 1, the sac appears, the
     elder wakes — already cleared in this test).
  6. east to the altar: a jump-stomp on the sac → pop → the weaver
     cog.
  7. west to the winch → `w5` (socket 2, the wheel turns, the bridge
     lowers — wait 1.3 s — the wall melts — 1.6 s).
  8. cross the bridge, through the melted wall into the hollow → the
     duel: the L4 dragon pattern — hold the arena edge ~300 px from
     the boss's center (flip sides at the walls, jitter ±20), jump on
     a glob or pillar threat near the player, fire whenever the boss
     is in a recoverable state (stagger/lungeRec/recover) or at range;
     capped at 10800 frames; expect `boss.dead` with `p.hp >= 1`.
  9. the pearl on the altar → pick it up → the exit brightens → walk
     east into the arch → `p.won === true`, hp ≥ 1.
- Audio pass: every fx name used in `src/` has a case in `audio.js`
  (the L5 M7 diff check — `gear`, `slither`, `pop`, `puff`, `spin`,
  `creak`, `spit`, `growl` are the new ones).
- README: the level 6 entry in the level list.
- Final snapshot commit; verify the L1–L5 md5s are unchanged.
