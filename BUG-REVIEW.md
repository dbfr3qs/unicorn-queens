# Bug review — 2026-11-15

A review of the whole codebase at commit `c280e6d`, starting from two known
bugs (the on-screen controller getting stuck, and the music slowing down).
Nothing was changed; this file is the only output.

**How to read the "Checked" column**

- **Reproduced** — run directly: either in headless Chromium against the real
  game (with touch emulation where relevant), or by a Node script driving the
  real `src/` modules.
- **Script only** — a Node script written during the review showed it, but it
  was not re-run a second time as a cross-check.
- **Read only** — follows from reading the code; not run.

Not covered: Safari / iOS was never tested (WebKit could not be launched on the
review machine), and the repo's own vitest suite was not run.

---

## 1. The two known bugs

### 1.1 Stuck on-screen control — Reproduced

**Cause.** Two things combine:

- `openDialogue()` (`src/dialogue.js:27-29`) clears every held input.
- `onKeyDown` (`src/input.js:28-35`) swallows keys while a dialogue is open.

A keyboard recovers on its own because auto-repeat re-sends the held key once
the box closes. Touch buttons (`src/touch.js`) and gamepads (`src/gamepad.js`)
send exactly one keydown per press and never repeat.

**Effect.** Hold ▶, walk into a dialogue trigger, tap JUMP to dismiss it. ▶ is
still lit and still physically held, but `input.right` is false and the player
stands still until the thumb lifts and presses again. Measured: 0 px moved in
0.8 s with ▶ held after the box closed; lift and re-press recovers.

**Fix.** Track physically held keys separately from game input: update that
set on every keydown/keyup, dialogue or not, and re-apply the movement keys
when the box closes. Keep the "needs a fresh press" rule for jump and fire
only, the way the restart path already does with `jumpHeld`.

### 1.2 Two related d-pad faults — Reproduced

- **Thumb slides don't register.** Each button captures its pointer
  (`src/touch.js:65`), so sliding ◀ → ▶ without lifting keeps running left.
  The comment above `wire()` says wandering off the button releases the key;
  with pointer capture it does not.
- **The centre of the cross is dead.** `#touch` is `pointer-events: none` and
  the hub inherits it, so a thumb that lands on the hub and rolls onto ▶
  presses nothing.

**Fix for both.** Treat the d-pad as one surface: one pointer handler on the
cluster, hit-testing the pointer position on `pointerdown` and `pointermove`.

### 1.3 Music slowing down — Reproduced

**Cause.** The music is synthesised live by Strudel, and the audio thread runs
out of real-time budget. When that happens the audio clock itself falls
behind, and since every note is scheduled against that clock, the tempo drops.

**Evidence.**

- With the browser pinned to one CPU core, level 7's track played at 0.86×
  speed over a minute, and the audio thread sat at ≥95% of its budget for 16
  of the 60 seconds.
- On an unpinned but busy 8-core desktop the same track averaged 39% of the
  budget with peaks at 99%, and the clock dipped to about 0.84× during the
  densest bars.

**What costs the most.** The pieces that run as JavaScript audio worklets,
instantiated per note:

- `.coarse()` on every voice in `src/music/chip.js`
- `.distort()` on kick and snare
- the `pulse` oscillator (itself a worklet)

Swapping those out cut mean load from 39% to 7% (peak 99% → 26%), and that
lightened track held tempo on one core.

| Variant (level 7 track) | Mean load | Peak | Worklets/s |
|---|---|---|---|
| As shipped | 0.39 | 0.99 | 55 |
| No `coarse()` | 0.27 | 0.70 | 22 |
| No `coarse()` / `distort()` | 0.22 | 0.59 | 20 |
| …and `pulse` at `pw(.5)` → native `square` | 0.12 | 0.77 | 17 |
| …and all `pulse` → native `square` | 0.07 | 0.26 | 0 |

**Why "over time".** Load rises as each track's layers enter, and later levels
are denser:

| Level | Track | Worklets/s mean | Worklets/s peak | Densest bar |
|---|---|---|---|---|
| 1 | meadow | 10 | 15 | 9 |
| 2 | bridge-castle | 26 | 36 | 9 |
| 3 | undercroft | 19 | 23 | 17 |
| 4 | dragons-layer | 31 | 39 | 17 |
| 5 | enchanted-forest | 18 | 24 | 9 |
| 6 | blackmire | 38 | 54 | 16 |
| 7 | peak | 55 | 96 | 25 |
| 8 | sky-citadel | 51 | 63 | 17 |
| 9 | frozen-throne | 21 | 67 | 25 |

**Ruled out.** Nothing leaks: live audio nodes and load were flat over a
5-minute soak, worklet processors shut down properly in Chromium, and the
renderer's per-frame cost is flat as well.

**Fixes.**

- *Quick:* drop per-note `coarse` / `distort`, and use the native `square`
  oscillator where a voice is `pulse` at `pw(.5)` (it is the same waveform).
  This changes the gritty timbre, so it is a judgement call.
- *Robust:* render each 32-bar loop to an audio buffer once (an
  `OfflineAudioContext`, or shipped audio files) and loop that. Playback cost
  becomes negligible. Ducking and mute become one `GainNode`.

**Related waste.** `resumeAudio()` (`src/music.js:136-150`) calls Strudel's
`initAudio()` on every key press and tap. In the vendored 1.3.0 bundle that
re-registers the worklet modules each time (1,400 `addModule` calls for 698
key presses) and logs two console lines per press. It made no measurable
difference to load, but it should be called once, with later gestures only
calling `ctx.resume()`.

---

## 2. Can end or block a run

| # | Where | What happens | Checked |
|---|---|---|---|
| 1 | `src/player.js:276`, `:132`; `src/loot-items/grow.js:10-13` | Take the grow pickup in mid-air, then fall in a pit: `safeY` was stored for the old height (36), so the respawn puts the now-50 px player's feet 14 px inside the floor and she falls straight through. Easy loops forever (reload only); hard dies from one mistake. On level 1 the grow box's bounce carries you into the pit. | Reproduced |
| 2 | `src/player.js:267`; `src/levels/level2.js:31-34`; `level3.js:29-32` | The bottom step of the level 2/3 exit stairs (y 640) is below the pit line (`lvl.height` 600), so a small player is "falling" while standing on it. Hard: 3 → 0 hp in about 0.5 s. Easy: bounced back forever. Big form is unaffected. | Reproduced |
| 3 | `src/player.js:248-249`, `:48`; `src/game.js:125` | The safe spot is recorded before `resolveDoor` pushes the player out, so it overlaps the door and `respawnX`'s door guard fails. Level 9: respawn lands east of the first frost seal, hearth A becomes unreachable, the Queen never wakes. Level 6: respawn lands inside the spider hollow, skipping the winch puzzle. | Reproduced |
| 4 | `src/cell.js:25-36` | The witch's cell trigger is only 140 px tall and can be jumped over when big or with boots. The troll door then consumes the key and shuts behind you, and level 4's ceiling exit needs flight you never got. | Reproduced |
| 5 | `src/enemies/queenboss.js:482-490`, `:191-195`; `src/main.js:89` | The Frost Queen's bolts and shockwaves stay lethal for the 3.8 s between the final blow and the ending. On one heart you die, the ending plays under GAME OVER, and Space restarts level 9. Her blizzard also never clears if she dies during it, so the storm is drawn through the "spring returns" ending. | Reproduced |
| 6 | `src/main.js:31-36`; `src/touch.js:33` | ⛶ makes the `<canvas>` the fullscreen element, which hides every touch button including ⛶ itself. | Reproduced |
| 7 | `src/render/enemies.js:22-33` | Once an enemy's sprite sheet has decoded, one static cell is drawn and the kind's own `draw()` never runs. Boss hp pips, hit flashes, attack tells, and live hazards (spider boss web pillars, wizard seal columns, Warden sweep band) are not drawn. 17 kinds are affected; the tests pass because they run without sprites. | Reproduced (mage, warden, spider boss) |

**Suggested fixes**

1. Respawn at `(p.safeSurf?.y ?? lvl.groundY) - p.h` in both the pit branch
   and `revivePlayer`.
2. Put the pit line below the lowest floor, or raise `height` for levels 2
   and 3.
3. Record the safe spot after `resolveDoor`, and compare centres in
   `respawnX`.
4. Make the cell zone full height, or refuse to open the troll door until
   `cell.open`.
5. In `onZero`, reset fireballs / boulders / cones / shockwaves and set
   `lvl.blizzard = null`. The Warden's `onZero` has the same gap (there it
   only costs a re-fight).
6. Call `document.documentElement.requestFullscreen()` (or wrap canvas and
   controls in one container) and adjust the `:fullscreen` CSS.
7. Do not `continue` after the sprite: always run a per-kind overlay draw
   (pips, tells, world-space hazards) and swap only the body, as `golem.js`
   and `sprite.js` already do.

---

## 3. Wrong behaviour

| Where | What happens | Fix | Checked |
|---|---|---|---|
| `src/projectiles.js:52-57` | Mirror shield: the reflect negates `vx` only, so the bolt keeps travelling away vertically and fizzles on the floor. 0 of 396 reflected bolts reached the mage, 0 of 83 the dragon, 1 of 125 the wizard. A player running at the shooter outruns her own reflected bolt and is hit by it. | Negate `vy` too; skip the player-collision test for reflected bolts. | Reproduced |
| `src/enemies/sentinel.js:77-78` | Sentinel shield is inverted: it blocks arrows into his back and never the player he is facing. `test/sentinel.test.js:91-112` locks the inversion in. | `e.shieldUp && ((a.vx > 0 && e.dir < 0) \|\| (a.vx < 0 && e.dir > 0))`; fix the tests. | Reproduced |
| `src/enemies.js:121` | Stomps are scored as side hits at 30 fps (76 of 301 drops hurt instead) and when two enemies overlap (the first dies, the second hurts). | Capture `vy` before the enemy loop and use a swept test. | Reproduced |
| `src/render/intro.js:115-119`; `src/render/hud.js:20`, `:129` | The intro leaves `textAlign = 'right'`. On a normal boot the hearts shift left and the "tap or click for sound" hint is drawn almost entirely off the left edge for the rest of the session. A `?level=N` boot is unaffected. | Wrap `drawIntro` in `save()`/`restore()`; set `textAlign = 'left'` in the HUD. | Reproduced |
| `src/main.js:20-21`, `:78-98`, `:143` | Key handlers are live during "loading…": one Space picks and saves the highlighted difficulty and starts the intro unseen; a second key skips it. | Register the game keydown handler after `await spritesLoaded()`. | Reproduced |
| `src/game.js:132-136` | The level 9 blizzard drift moves the player 0 px: `vx` is written after `updatePlayer` and overwritten on the next frame. | Apply it as a position push, like the level 7 gust. | Reproduced |
| `src/player.js:237-240` | Jump apex depends on frame rate (126 px at 60 fps, 119 at 24). At 24 fps or below level 3's key ledge (+120 px) is out of reach. | `y += vy*dt + 0.5*g*dt*dt`, or a fixed timestep. | Reproduced |
| `src/enemies/zombie.js:23-26` | A zombie that followed the player out of its band teleports back (158 px in one frame) the moment she jumps. | Turn and walk back; never assign `x`. | Reproduced |
| `src/enemies/dragon.js:142-146`, `:156` | A dragon hit on its perch or dive teleports about 250 px up in one frame, ending the ground window. | Resume via the ascend state, or drop the clamp. | Reproduced |
| `src/enemies/warden.js:131`, `:138` | The Warden reads a stale chime on his first awake frame about 1 time in 8: he lunges 40 px and attacks immediately, skipping the 1.5 s breath. | Move `e.lastT = c.t` above the sleeping return. | Reproduced |
| `src/render/background.js:65-71`, `:89-99` | `drawParallax` only checks the sky layer, so if a ridge sheet fails to load neither the sprite nor the fallback ridges are drawn. | Check all three layers before drawing any. | Reproduced |
| `src/enemies/hare.js:47-50` | The hare snaps back about 100 px after its dart. | Same as the zombie fix. | Script only |
| `src/game.js:219-223`; `level8.js:145`, `level9.js:143`, `level7.js:111` | Boss-wake and story triggers are 140 px tall and fire only on entry. Fly over them and the level 8 Warden stays asleep / the level 9 Queen stays frozen; stand inside the level 7 rect when the wizard dies and the King's beat never fires until you leave and return. Not hard locks. | Full-height rects; mark `dialogsIn` only when a beat fires. | Script only |
| `src/game.js:137` | Enemies keep hurting a player who has already won. Hard: dead behind LEVEL CLEAR. Easy: a revive fires and a death is added to the clear card. | Guard `hurtPlayer` on `p.won`. | Script only |
| `src/enemies/spider.js:82-88` | Below about 35 fps a spider can step over its anchor repeatedly and never hang or pounce again. | `Math.min(S_CLIMB_SPEED*dt, d)`. | Script only |
| `src/enemies.js:131-132` | The bounce off an unstompable (ghost, boss) is cut short unless jump is held, because `p.cuttable` is not cleared. | `p.cuttable = false`. | Script only |
| `src/game.js:113-120` | Arrows in flight hang in the air for the whole level 9 ending. | `resetArrows()` when the ending starts. | Script only |
| `src/enemies.js:104-105` | Difficulty tell-scaling also slows the Queen's spike and blizzard clocks, which DIFFICULTY-PLAN D5 says are not scaled (a spike lasts 3.32 s on easy vs 2.2 s). | Run those clocks on unscaled dt. | Script only |
| `src/enemies/troll.js:63-77`; `src/projectiles.js:195-197` | At ≤21 fps only: front arrows pass the troll's raised slab, and boulders skip the floor line without landing. | Swept tests. | Script only |
| `src/game.js:240` | Latent: the troll is missing from the sunbeam exemption, and `damageEnemy(e, fx)` passes no camera, so `troll.onDeath` would throw. Not reachable with the shipped level 3 boxes. | Add the troll to the exemption. | Script only |

---

## 4. Smaller input and audio items

| Where | What happens | Checked |
|---|---|---|
| `src/touch.js:61-80` | If a pointer release is ever missed, `pointer` stays latched and that button ignores every later press until reload. `setPointerCapture` throwing after `pointer` is assigned would do the same. Nothing releases keys on `blur`, `visibilitychange` or `pagehide`. | Mechanism seen with a synthetic touch that never ended; no real-device case |
| `src/input.js` (no blur handler) | A keyboard key held through alt-tab stays held. | Read only |
| `src/music.js` (no visibility handling) | Music keeps playing in a background tab with dropped notes; Strudel logs "skip query: too late". | Log line observed under main-thread stalls |
| `src/music/chip.js` (delay settings) | Every voice shares Strudel's one delay line per orbit but asks for different delay times (.125, .1875, .375), so the setting jumps note to note. Give each delay setting its own `.orbit(n)`. | Confirmed in the bundle; audible effect not verified |
| `src/music.js:207-219` | Each track start logs "Failed to construct 'AudioWorkletNode'": the pattern starts before the worklets have loaded, so the first notes are dropped. | Seen in every run |
| `src/audio.js:19` | The silent unlock loop for the iPhone ring switch is 8 kHz 8-bit mono and is started on every platform. A low-rate media element can degrade the shared audio session on iOS. | Header decoded; iOS effect unverified |
| `src/audio.js:38` | The sfx context is only resumed from `'suspended'`, not from iOS's `'interrupted'` state, and the HUD would then say "sound on". | Read only |
| `src/input.js:14` | `input.jump` is shared by ArrowUp, W and Space: releasing ▲ (or the stick) while holding JUMP cancels the jump. Left/right and fire share flags the same way. | Read only |
| `src/input.js:26-27` | Holding M auto-repeats the mute toggle; M also overwrites N's music-only mute state. | Read only |
| `src/main.js:81` | "Any key" skips the intro, including M, N and F, so muting or going fullscreen during the opening ends it. | Read only |
| `src/main.js:56` | F has no modifier check, so Ctrl/Cmd+F also toggles fullscreen. | Read only |
| `src/main.js:89` | No delay guard on the win/death card: a Space press one frame after winning skips LEVEL CLEAR. | Read only |
| `src/game.js:108` | A cast pressed during easy's revive beat fires the instant she revives. | Read only |
| `src/player.js:267-279` | On easy a pit fall costs no hearts but still grants invulnerability, repeatably. | Read only |
| `src/main.js:36`, `:64` | `requestFullscreen()`'s promise is never caught, and `screen.orientation.lock` is called before it resolves. | Read only |

---

## 5. Rendering performance and loading

None of these grows over time, and none explains the music.

| Where | What happens | Checked |
|---|---|---|
| `src/render/level.js:26-235`, `forest.js:138-174`, `zones.js`, `sprite.js:127-141`, `door.js:22-30` | No viewport culling: 47–80% of draw calls per frame land wholly outside the view (level 5: 373 of 468). Constant cost, 740–1205 context calls per frame on levels 3–9. | Script only |
| `src/sprites.js:60-80` | `spritesLoaded()` resolves on `load`, not decode, so each sheet decodes inside its first `drawImage` — a hitch on the first frame of the intro and of each level (up to 2.9 megapixels on level 8). Use `img.decode()`. | Sized by script; hitch not profiled |
| `src/render/player.js:56` | One radial gradient is created per frame while the lantern is active. | Read only |
| `src/render/sprite.js:55-65` | Tiles are placed at fractional x and width, which usually shows hairline seams. | Read only |
| `src/render/level.js:257` | In the vector fallback only, the crate outline inherits `lineWidth = 2` from an earlier draw. | Script only |
| `manifest.webmanifest:10-16` | Only a 192 px icon; Chrome's install criteria also want 512 px. | Read only |
| `assets/sprites/sprites.json`, `bg_glacier_ice` | The JSON is stale (56 of 109 keys) but nothing loads it; one background sheet is downloaded and never drawn. | Script only |

---

## 6. Tooling

| Where | What happens | Checked |
|---|---|---|
| `server.mjs:25` | `GET /%` throws outside the try block and kills the dev server. It also listens on all interfaces rather than localhost, and serves `.webmanifest` as `application/octet-stream`. The path-traversal check itself holds. | Script only |
| `smoke.mjs:19-30` | The smoke test never runs level 1: the difficulty card is up for those 300 frames, yet it prints "levels 1 + 2 + … OK". | Reproduced |
| `tools/bosslab.mjs:272` | `npm run bosslab` prints nothing and exits 0 when the repo path contains a space or is a symlink. Compare against `pathToFileURL(process.argv[1]).href`. | Script only |
| `test/sentinel.test.js:91-112` | The test's "front" case puts the player behind the sentinel, locking in the inverted shield. | Reproduced |

---

## 7. One unexplained observation

The boss-lab bot kills the Mage in a median 8 s on hard, 34 s on medium, and
177 s on easy (6 of 8 kills inside 240 s). `bossTell` and `projSpeed` each
reproduce it alone. No code defect was tied to it — it is probably the bot's
interaction with his dodge — but it may be worth a look by hand. All other
bosses were 8 of 8 on every preset.

---

## 8. Read and found clean

`camera.js`, `particles.js`, `effects.js`, `loot.js` and the loot items other
than the grow interaction, `key.js`, `relics.js`, `cogs.js`, `springs.js`,
`clock.js`, `thaw.js`, `king.js`, `wind.js`, `vent.js`, `bridge.js`,
`shaft.js`, `sigil.js`, `mistgate.js`, `pearl.js`, `pig.js`, `peakending.js`,
`picker.js`, `intro.js` logic, `ending9.js` sequencing, the door state
machine, `startGame` resets and carry rules, `difficulty.js` (boss hp and
phase edges on all three presets), `arrows.js`, and the simple enemies
(slime, ghost, bat, bee, moth, wraith, sprite, golem, snake).

Canvas save/restore is balanced on all nine levels in both sprite and vector
modes; there are no growing caches in `src/render`; all 109 sprite manifest
entries match their PNG dimensions. Random-input fuzzing across all levels,
presets and frame rates produced no exceptions and no NaN.
