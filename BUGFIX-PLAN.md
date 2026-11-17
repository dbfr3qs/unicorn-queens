# Bug Review Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the defects listed in `BUG-REVIEW.md` (review of commit `c280e6d`), each pinned by a test, without changing how the game plays at 60 fps.

**Architecture:** The fixes are grouped into *lanes*. A lane owns a fixed set of files and nobody else edits them, so lanes in the same wave run as parallel subagents in separate git worktrees and merge without conflicts. Tasks inside a lane run in order. Three waves: Wave 1 (nine lanes, logic), Wave 2 (the shell and the enemy renderer, which consume Wave 1's exports), Wave 3 (optional rendering performance), then one integration pass.

**Tech Stack:** Vanilla JS ES modules, canvas 2D, WebAudio + vendored Strudel 1.3.0, vitest 4 in the Node environment (no DOM, no jsdom).

**Spec:** `BUG-REVIEW.md` (same folder). Section numbers below (`§2.3`, `§3 zombie`) refer to it. Executors read both.

## Global Constraints

- **Edit, never rewrite.** `AGENTS.md`: change existing files with targeted edits only; `write` is for new files. One task per turn, then stop for review.
- **File ownership.** A lane edits only the files in its row of the lane map. If a fix needs another lane's file, stop and report; do not edit it.
- **60 fps is the reference.** At `dt = 1/60` nothing may behave differently except the bug being fixed.
- **Tests are Node-only.** Code that touches the DOM is split so the logic is a pure function taking plain objects; tests never need a document.
- **Render snapshot.** `test/__snapshots__/render.test.js.snap` may be regenerated (`npx vitest run test/render.test.js -u`) only by tasks marked **[snapshot]**, and the commit message says which draw calls changed. For every other task a snapshot diff is a regression.
- **Baseline.** At `c280e6d`: `npm test` → 100 files, 1351 tests, all passing; `node smoke.mjs` prints `smoke OK`. Every task ends with both still green.
- **Commits.** One per task, in the repo's style: `Bug review <id>: <what changed>` (compare `Boss ladder B8: a ladder test in npm test`).
- **No pushes to GitHub** (`origin`) as part of this plan.

**The cycle every task follows** (written once here, not repeated per task):

1. Add the task's test. Run `npx vitest run test/<file>` and see it fail for the stated reason.
2. Make the change described under *Implement*.
3. Run the same file, then `npm test` and `node smoke.mjs`. All green.
4. Commit only the task's files.

## Decisions taken where the review left a choice

| Review item | Choice | Why |
|---|---|---|
| §3 jump apex: "`½·g·dt²`, or a fixed timestep" | Sub-step the frame: no simulation step longer than 1/60 s (task D1) | Exact integration would raise the 60 fps jump from 126 px to 131 px and change the feel of every level. Sub-stepping leaves ≥60 fps untouched and makes slow frames behave like 60 fps. |
| §3 troll slab / boulder floor (≤21 fps), spider (<35 fps) | Covered by D1; only the one-line spider clamp is also applied (F3). No swept tests for troll or boulders. | With D1 no step is long enough to trigger them. |
| §2.2 pit line: "below the lowest floor, or raise `height`" | Compute the pit line from the lowest floor (C2) | `lvl.height` also sizes ground slabs in `render/level.js`; raising it would change the render snapshot. |
| §1.3 music: quick vs robust | Quick fix (M3), as its own commit, to be judged by ear in `music-lab.html` before the lane merges | The robust fix (pre-rendering each loop with `OfflineAudioContext`) needs a spike against the vendored Strudel bundle and is a separate plan. |
| §5 rendering performance | Wave 3, optional | The review says none of it grows over time or explains the music. |

**Not in this plan:** §7 (the Mage's bot-fight times; no defect was found), the robust music fix, and Safari/iOS device testing (WebKit cannot be launched on the dev machine; see Review Focus).

## Review Focus

Inputs the review implies but does not test. Each has a test in the task named.

1. **Two thumbs on the d-pad, or a thumb sliding off it entirely.** A direction stays down while any pointer is on it and releases when the last one leaves (B1).
2. **A dialogue closed by a restart, not by a key.** `startGame` → `resetDialogue()` must hand held movement keys back the same way a key-dismissal does (A1).
3. **120/144 Hz displays.** A frame shorter than 1/60 s must run exactly one update with its own `dt` (D1).
4. **Respawn with no recorded surface, or on a raised platform.** A player who has never landed, or whose last footing was a platform, comes back standing on it at her current size (C1).
5. **A browser with no Fullscreen API on the page** (iPhone Safari). The toggle must still fall through to the existing "Add to Home Screen" toast (S1).

## Lane map

| Wave | Lane | Files owned | Tasks | Review items |
|---|---|---|---|---|
| 0 | Setup (orchestrator) | — | 0 | — |
| 1 | **A** Input core | `src/input.js`, `src/dialogue.js`, `test/held-keys.test.js` (new) | A1, A2 | §1.1, §4 input.js ×3 |
| 1 | **B** Touch | `src/touch.js`, `test/touch.test.js` (new) | B1, B2 | §1.2, §4 touch.js |
| 1 | **C** Player & respawn | `src/player.js`, `src/levels/level.js`, `test/respawn.test.js` (new) | C1–C4 | §2.1, §2.2, §2.3, §3 game.js:137, §4 player.js |
| 1 | **D** Game loop & triggers | `src/game.js`, `src/cell.js`, `src/levels/level7.js`, `level8.js`, `level9.js`, `test/game-loop.test.js` (new), `test/cell.test.js` | D1–D4 | §2.4, §3 jump apex, blizzard, triggers, arrows, sunbeam, §4 game.js:108 |
| 1 | **E** Enemy core & bosses | `src/enemies.js`, `src/enemies/queenboss.js`, `src/enemies/warden.js`, `test/enemy-core.test.js` (new) | E1–E3 | §2.5, §3 stomp, bounce, Warden chime, Queen clocks |
| 1 | **F** Enemy kinds | `src/enemies/sentinel.js`, `zombie.js`, `hare.js`, `dragon.js`, `spider.js`, and their `test/<kind>.test.js` | F1–F3 | §3 sentinel, zombie, hare, dragon, spider; §6 sentinel test |
| 1 | **G** Projectiles & render state | `src/projectiles.js`, `src/render/intro.js`, `src/render/hud.js`, `src/render/background.js`, `test/shield.test.js`, `test/render-state.test.js` (new), render snapshot | G1–G3 | §3 mirror shield, textAlign, parallax |
| 1 | **M** Music & audio | `src/music.js`, `src/music/chip.js`, `src/music/tracks.js`, `src/audio.js`, `test/music*.test.js`, `test/audio.test.js` (new) | M1–M4 | §1.3, §4 music/audio ×5 |
| 1 | **T** Tooling | `server.mjs`, `smoke.mjs`, `tools/bosslab.mjs`, `test/server.test.js` (new) | T1, T2 | §6 server, smoke, bosslab |
| 2 | **S** Shell | `src/main.js`, `src/shell.js` (new), `index.html`, `test/shell.test.js` (new) | S1, S2 | §2.6, §3 loading keys, §4 main.js ×5 |
| 2 | **R** Enemy overlays | `src/render/enemies.js`, the `draw` functions in `src/enemies/*.js`, `test/enemy-overlay*.test.js` (new) | R1, then R2 ‖ R3 | §2.7 |
| 3 | **P** Render performance (optional) | `src/sprites.js`, `src/render/level.js`, `forest.js`, `zones.js`, `sprite.js`, `door.js`, `player.js`, `src/render/cull.js` (new), assets, manifest, render snapshot | P1–P3 | §5 |
| 4 | Integration (orchestrator) | — | V | — |

Wave 2 waits for Wave 1 to merge: S imports `releaseAllKeys` (A2) and `stepFrame` (D1); R edits `draw` functions in files lanes E and F change.

---

## Wave 0 — Setup

### Task 0: Working copy and baseline

The rig has no `node` on the PATH of a non-interactive SSH shell (it lives at `~/.nvm/versions/node/v24.19.0/bin`), and no browser, so the work is done in a local clone.

- [ ] `git clone inference-rig:dev/qwen3.8-expr/unicorn-queens ~/dev/unicorn-queens && cd ~/dev/unicorn-queens && git remote rename origin rig && npm ci`
- [ ] `git switch -c bugfix/review-2026-11-15 main` (main is `c280e6d`).
- [ ] Copy the two untracked documents from the rig (`BUG-REVIEW.md`, `BUGFIX-PLAN.md`) and commit them: `Bug review: the review and the fix plan`.
- [ ] `npm test` → 100 files / 1351 tests pass. `node smoke.mjs` → `smoke OK`.
- [ ] One worktree and branch per Wave 1 lane (A, B, C, D, E, F, G, M, T), e.g. `git worktree add ../uq-lane-a -b fix/lane-a`. Each lane's agent is given this plan, the spec, and its lane letter.

---

## Wave 1 — nine parallel lanes

### Lane A — Input core

#### Task A1: Physically held keys are tracked apart from game input (§1.1, §4 `input.js:14`)

**Interfaces — produces** (in `src/input.js`):

- `setKey(code: string, down: boolean): void` — signature unchanged; now records the code in the held set and calls `syncInput()`.
- `syncInput(): void` — recomputes every `input` flag from the held set.
- `freezeInput(): void` — a dialogue is opening: mark every held code stale, set all flags and `cast` false.
- `resetInput(): void` — forget every held and stale code, all flags false.

- [ ] **Test** — `test/held-keys.test.js`, `beforeEach(() => { resetInput(); resetDialogue(); })`, `ev(code)` as in `test/input.test.js`:

```js
const LINE = [{ speaker: 'x', text: 'y' }];
it('a movement key held through a dialogue moves again when the box closes', () => {
  onKeyDown(ev('ArrowRight'));
  openDialogue(LINE);
  expect(input.right).toBe(false);
  onKeyDown(ev('Space')); // dismisses the box
  expect(isDialogueOpen()).toBe(false);
  expect(input.right).toBe(true);  // still physically held
  expect(input.jump).toBe(false);  // the dismissing Space is not a jump
  onKeyUp(ev('Space')); onKeyDown(ev('Space'));
  expect(input.jump).toBe(true);   // a fresh press is
});
it('a key pressed during the dialogue is held when it closes; one released is not', () => {
  onKeyDown(ev('ArrowRight')); openDialogue(LINE);
  onKeyUp(ev('ArrowRight')); onKeyDown(ev('ArrowLeft')); onKeyDown(ev('Enter'));
  expect(input.right).toBe(false); expect(input.left).toBe(true);
});
it('fire held through a dialogue needs a fresh press', () => {
  onKeyDown(ev('KeyX')); openDialogue(LINE); onKeyDown(ev('Enter'));
  expect(input.fire).toBe(false);
});
it('releasing ArrowUp while Space is held does not cancel the jump', () => {
  onKeyDown(ev('Space')); onKeyDown(ev('ArrowUp')); onKeyUp(ev('ArrowUp'));
  expect(input.jump).toBe(true); expect(input.up).toBe(false);
});
it('releasing A while D is held keeps running right; releasing J keeps X firing', () => {
  onKeyDown(ev('KeyD')); onKeyDown(ev('ArrowRight')); onKeyUp(ev('ArrowRight'));
  onKeyDown(ev('KeyX')); onKeyDown(ev('KeyJ')); onKeyUp(ev('KeyJ'));
  expect(input.right).toBe(true); expect(input.fire).toBe(true);
});
it('a restart that closes the box hands held movement back (Review Focus 2)', () => {
  onKeyDown(ev('ArrowLeft')); openDialogue(LINE); resetDialogue();
  expect(input.left).toBe(true);
});
```

- [ ] **Implement.** Two module-level sets in `input.js`: `held` (codes physically down) and `stale` (codes whose jump/fire needs a fresh press). One table drives the mapping: `left: ArrowLeft, KeyA` · `right: ArrowRight, KeyD` · `up: ArrowUp` · `down: ArrowDown` · `jump: ArrowUp, KeyW, Space` · `fire: KeyX, KeyJ`. `syncInput()` sets a movement flag (`left/right/up/down`) when any of its codes is held, and `jump`/`fire` when any of its codes is held **and not stale**. Rules:
  - keydown while a dialogue is open: add to `held` and `stale`, do not sync (flags stay false), then advance as today; if `advanceDialogue()` returns true, `syncInput()`.
  - keyup, always: remove from `held` and `stale`; sync only when no dialogue is open.
  - `openDialogue()` (`dialogue.js:27-29`) calls `freezeInput()` instead of clearing flags itself.
  - `resetDialogue()` calls `syncInput()` when the box was open.
- [ ] **Verify + commit:** `Bug review 1.1: held keys survive a dialogue; jump and fire need a fresh press`

#### Task A2: Focus loss, and the mute keys (§4 `input.js` no blur handler, `:26-27`)

**Interfaces — produces:** `releaseAllKeys(): void` in `src/input.js` (calls `resetInput()`). Lane S registers it on `blur`.

- [ ] **Test** (same file):

```js
it('releaseAllKeys drops everything held', () => {
  onKeyDown(ev('ArrowRight')); onKeyDown(ev('Space')); releaseAllKeys();
  expect(input.right).toBe(false); expect(input.jump).toBe(false);
});
it('holding M toggles once', () => {
  onKeyDown(ev('KeyM')); onKeyDown({ ...ev('KeyM'), repeat: true });
  expect(audio.muted).toBe(true);
});
it("M does not overwrite N's music-only mute", () => {
  onKeyDown(ev('KeyN'));                      // music off, sfx on
  onKeyDown(ev('KeyM')); onKeyDown(ev('KeyM')); // master off, then on again
  expect(audio.muted).toBe(false); expect(music.muted).toBe(true);
});
```

- [ ] **Implement.** Both mute keys ignore `e.repeat`. `input.js` keeps a module flag `musicOnly` (N toggles it); after either key, `setMusicMuted(muted || musicOnly)`. `resetInput()` does not touch it; export `_resetMute()` for the tests' `beforeEach`.
- [ ] **Verify + commit:** `Bug review 4: keys release on focus loss; M no longer repeats or clobbers N`

### Lane B — Touch

#### Task B1: The d-pad is one surface (§1.2, both faults)

**Interfaces — produces** (in `src/touch.js`):

- `padCodeAt(x: number, y: number, rect: {left, top, width, height}): string | null` — the arrow code under a point in the 3×3 cross; `null` for the hub, the corners and anywhere outside `rect`.
- `createPad(dispatch: (type, code) => void): { point(pointerId, code | null), lift(pointerId), liftAll() }`.

- [ ] **Test** — `test/touch.test.js`:

```js
const R = { left: 100, top: 200, width: 174, height: 174 }; // three 58 px cells
const log = () => { const l = []; return [l, (t, c) => l.push(`${t}:${c}`)]; };
it('maps the cross; hub, corners and outside are nothing', () => {
  expect(padCodeAt(187, 210, R)).toBe('ArrowUp');
  expect(padCodeAt(110, 287, R)).toBe('ArrowLeft');
  expect(padCodeAt(264, 287, R)).toBe('ArrowRight');
  expect(padCodeAt(187, 364, R)).toBe('ArrowDown');
  for (const [x, y] of [[187, 287], [110, 210], [264, 364], [50, 50]]) expect(padCodeAt(x, y, R)).toBe(null);
});
it('sliding left to right without lifting swaps the key', () => {
  const [l, d] = log(); const pad = createPad(d);
  pad.point(1, 'ArrowLeft'); pad.point(1, 'ArrowLeft'); pad.point(1, 'ArrowRight');
  expect(l).toEqual(['keydown:ArrowLeft', 'keyup:ArrowLeft', 'keydown:ArrowRight']);
});
it('landing on the hub and rolling onto a key presses it', () => {
  const [l, d] = log(); const pad = createPad(d);
  pad.point(1, null); pad.point(1, 'ArrowRight');
  expect(l).toEqual(['keydown:ArrowRight']);
});
it('two thumbs on one key release it only when both are gone; sliding off the pad releases (Review Focus 1)', () => {
  const [l, d] = log(); const pad = createPad(d);
  pad.point(1, 'ArrowUp'); pad.point(2, 'ArrowUp'); pad.lift(1);
  expect(l).toEqual(['keydown:ArrowUp']);
  pad.point(2, null);
  expect(l).toEqual(['keydown:ArrowUp', 'keyup:ArrowUp']);
});
it('liftAll releases each held key once', () => {
  const [l, d] = log(); const pad = createPad(d);
  pad.point(1, 'ArrowLeft'); pad.point(2, 'ArrowUp'); pad.liftAll(); pad.liftAll();
  expect(l.filter(s => s.startsWith('keyup'))).toHaveLength(2);
});
```

- [ ] **Implement.** `createPad` keeps a `Map` of pointerId → code; a code is down while at least one pointer is on it. In `initTouch`, the left cluster gets one set of listeners (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`) that call `pad.point(e.pointerId, padCodeAt(e.clientX, e.clientY, cluster.getBoundingClientRect()))` or `pad.lift`. Pointer capture goes on the **cluster**, inside `try/catch`. The pad buttons are no longer wired individually; the `.down` class is set on the button whose `aria-label` is the code. CSS: `#touch .left { pointer-events: auto; touch-action: none; }` and `#touch button.pad, #touch .hub { pointer-events: none; }`. Correct the comment above `wire()`.
- [ ] **Verify + commit:** `Bug review 1.2: the d-pad is one surface — slides and the hub register`

#### Task B2: A missed release cannot latch a button (§4 `touch.js:61-80`)

**Interfaces — produces:** `wire(btn, code, dispatch): { release() }` (now exported) and `releaseAllTouch(): void`.

- [ ] **Test** — a fake button `{ listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, classList: { add() {}, remove() {} }, setPointerCapture }`:

```js
it('a second pointer takes over a button whose release was missed', () => {
  const [l, d] = log(); const b = fakeBtn(); wire(b, 'Space', d);
  b.listeners.pointerdown({ pointerId: 1 });          // never released
  b.listeners.pointerdown({ pointerId: 2 }); b.listeners.pointerup({ pointerId: 2 });
  expect(l).toEqual(['keydown:Space', 'keyup:Space']);
});
it('setPointerCapture throwing does not latch the button', () => {
  const [l, d] = log(); const b = fakeBtn(() => { throw new Error('no'); }); wire(b, 'KeyX', d);
  b.listeners.pointerdown({ pointerId: 1 }); b.listeners.pointerup({ pointerId: 1 });
  b.listeners.pointerdown({ pointerId: 3 });
  expect(l).toEqual(['keydown:KeyX', 'keyup:KeyX', 'keydown:KeyX']);
});
it('release() lets go of a held button once', () => {
  const [l, d] = log(); const b = fakeBtn(); const w = wire(b, 'KeyS', d);
  b.listeners.pointerdown({ pointerId: 1 }); w.release(); w.release();
  expect(l).toEqual(['keydown:KeyS', 'keyup:KeyS']);
});
```

- [ ] **Implement.** In `wire`: capture inside `try/catch`; a `pointerdown` while already held adopts the new pointer id without a second keydown. `releaseAllTouch()` calls `pad.liftAll()` and every wired button's `release()`. `initTouch` registers it on `window` `blur` and `pagehide`, and on `document` `visibilitychange` when `document.hidden`.
- [ ] **Verify + commit:** `Bug review 4: touch buttons cannot latch, and let go when the page is hidden`

### Lane C — Player & respawn

All tests in `test/respawn.test.js`; `DT = 1/60`, `fx = { play() {} }`, `cam = createCamera()`, `noInput` = every `input` flag false (`left, right, jump, fire, up, down, cast`). Any test that calls `setDifficulty` restores `'hard'` in `afterEach`.

#### Task C1: Respawn stands on the surface at the player's current size (§2.1)

**Interfaces — produces:** `respawnY(p, lvl): number` in `src/player.js`.

- [ ] **Test:**

```js
it('growing in mid-air then falling in a pit respawns on the floor, not in it', () => {
  const l = createLevel(600), p = createPlayer(l);
  for (let i = 0; i < 5; i++) updatePlayer(p, noInput, l, cam, DT, fx); // lands: safe spot recorded at h 36
  p.big = true; p.w = BIG_W; p.h = BIG_H;                               // the grow pickup, taken in the air
  p.y = l.height + 1; updatePlayer(p, noInput, l, cam, DT, fx);
  expect(p.y + p.h).toBe(l.groundY);
});
it('easy revive uses the same height', () => {
  setDifficulty('easy');
  const l = createLevel(600), p = createPlayer(l);
  p.safeSurf = l.ground[0]; p.h = BIG_H; revivePlayer(p, l, fx);
  expect(p.y + p.h).toBe(l.groundY);
});
it('no recorded surface: the ground line; a platform: its top (Review Focus 4)', () => {
  const l = createLevel(600), p = createPlayer(l);
  expect(respawnY(p, l)).toBe(l.groundY - p.h);
  p.safeSurf = l.platforms[0];
  expect(respawnY(p, l)).toBe(l.platforms[0].y - p.h);
});
```

- [ ] **Implement.** `respawnY` returns `(p.safeSurf?.y ?? lvl.groundY) - p.h`. Use it at `player.js:132` and `:276` in place of `p.safeY`.
- [ ] **Verify + commit:** `Bug review 2.1: respawn at the surface, at the size she is now`

#### Task C2: The pit line sits below the lowest floor (§2.2)

**Interfaces — produces:** `pitLine(lvl): number` in `src/levels/level.js` — the larger of `lvl.height` and the lowest ground segment's top.

- [ ] **Test:**

```js
it.each([[1, 3550], [2, 4350]])('small player standing on the bottom exit step of level %i is not falling', (idx, x) => {
  const l = LEVELS[idx].make(600), p = createPlayer(l);
  p.x = x; p.y = l.groundY + 80 - p.h;
  for (let i = 0; i < 60; i++) updatePlayer(p, noInput, l, cam, DT, fx);
  expect(p.hp).toBe(3); expect(Math.abs(p.x - x)).toBeLessThan(1);
});
it('level 1 is unchanged', () => { const l = createLevel(600); expect(pitLine(l)).toBe(l.height); });
```

- [ ] **Implement.** `player.js:267` tests `player.y > pitLine(lvl)`.
- [ ] **Verify + commit:** `Bug review 2.2: the pit line is below the exit stairs`

#### Task C3: The safe spot is taken after the door has pushed the player out (§2.3)

- [ ] **Test:**

```js
const frostDoor = l => solidDoors(l)[0];
it('level 9: a safe spot recorded against a solid door respawns on the side she was on', () => {
  const l = LEVELS[8].make(600), p = createPlayer(l), d = frostDoor(l);
  p.safeSurf = l.ground.find(g => g.x <= d.x && g.x + g.w >= d.x + d.w);
  p.safeX = d.x - p.w + 6;                       // overlapping the door, as today's order records it
  expect(respawnX(p, l) + p.w).toBeLessThanOrEqual(d.x);
});
it('walking into a solid door never records a spot inside it', () => {
  const l = LEVELS[8].make(600), p = createPlayer(l), d = frostDoor(l);
  p.x = d.x - p.w - 4; p.y = l.groundY - p.h;
  for (let i = 0; i < 30; i++) updatePlayer(p, { ...noInput, right: true }, l, cam, DT, fx);
  expect(p.safeX + p.w).toBeLessThanOrEqual(d.x);
});
```

- [ ] **Implement.** In `updatePlayer`, call `resolveDoor(lvl, player)` (import from `./door.js`) after `resolveGroundCollision` and before the safe spot is recorded (`player.js:246-249`); `game.js`'s later call stays and becomes a no-op. In `respawnX` replace the door loop (`:47-50`) with a comparison of centres:

```js
const c = p.safeX + p.w / 2;
for (const d of solidDoors(lvl)) {
  const dc = d.x + d.w / 2;
  if (dc > c && d.x < x + p.w) x = Math.min(x, d.x - p.w); // door to the east: stay west of it
  if (dc < c && d.x + d.w > x) x = Math.max(x, d.x + d.w); // door to the west: stay east of it
}
```

- [ ] **Verify + commit:** `Bug review 2.3: a respawn never lands on the far side of a door`

#### Task C4: A player who has won cannot be hurt; easy's free pit fall grants no invulnerability (§3 `game.js:137`, §4 `player.js:267-279`)

- [ ] **Test:**

```js
it('hurtPlayer does nothing once the level is won', () => {
  const p = createPlayer(createLevel(600)); p.won = true;
  expect(hurtPlayer(p, cam, fx)).toBe(false); expect(p.hp).toBe(3);
});
it('easy: a pit fall that costs nothing grants no invulnerability', () => {
  setDifficulty('easy');
  const l = createLevel(600), p = createPlayer(l);
  p.y = l.height + 1; updatePlayer(p, noInput, l, cam, DT, fx);
  expect(p.invuln).toBe(0);
});
```

- [ ] **Implement.** `hurtPlayer` returns false when `p.won`. The pit branch sets `invuln` only when `difficulty().pitDamage > 0`.
- [ ] **Verify + commit:** `Bug review 3/4: no damage behind LEVEL CLEAR; no free invulnerability from pits on easy`

### Lane D — Game loop & triggers

Tests in `test/game-loop.test.js` unless stated; `fx = { play() {} }`. `beforeEach` sets difficulty `'hard'` and every `input` flag false by plain assignment (they remain plain fields after Lane A), so this lane needs nothing from Lane A.

#### Task D1: No simulation step longer than 1/60 s (§3 jump apex; also covers troll, boulder, stomp at low frame rates)

**Interfaces — produces** (in `src/game.js`): `MAX_STEP = 1 / 60`; `stepFrame(dt, viewW, fx): void` — splits `dt` into `n = max(1, ceil(dt / MAX_STEP − 1e-6))` equal parts and calls `update(dt / n, viewW, fx)` `n` times. Lane S switches `main.js` to it.

- [ ] **Test:**

```js
const apex = dt => {
  startGame(600, 0); const y0 = game.level.groundY - game.player.h; let top = y0;
  input.jump = false; for (let i = 0; i < 10; i++) stepFrame(dt, 800, fx); // settle
  input.jump = true;
  for (let t = 0; t < 1.2; t += dt) { stepFrame(dt, 800, fx); top = Math.min(top, game.player.y); }
  input.jump = false; return y0 - top;
};
it('the jump is as high at 24 fps as at 60', () => {
  expect(Math.abs(apex(1 / 24) - apex(1 / 60))).toBeLessThan(1.5);
  expect(apex(1 / 24)).toBeGreaterThan(121); // level 3's key ledge is +120
});
it('a 144 Hz frame is one update with its own dt (Review Focus 3)', () => {
  startGame(600, 0); const t0 = game.gameTime;
  stepFrame(1 / 144, 800, fx);
  expect(game.gameTime - t0).toBeCloseTo(1 / 144, 10);
});
it('a 50 ms frame still advances 50 ms of game time', () => {
  startGame(600, 0); const t0 = game.gameTime; stepFrame(0.05, 800, fx);
  expect(game.gameTime - t0).toBeCloseTo(0.05, 10);
});
```

- [ ] **Implement** as the interface states. `update` itself is unchanged.
- [ ] **Verify + commit:** `Bug review 3: slow frames are sub-stepped, so the jump does not depend on frame rate`

#### Task D2: The level 9 blizzard actually pushes (§3 `game.js:132-136`)

- [ ] **Test:**

```js
it('the blizzard moves a standing player', () => {
  startGame(600, 8); for (let i = 0; i < 5; i++) update(1 / 60, 800, fx);
  game.level.blizzard = { t: 5, next: 99 };
  const x0 = game.player.x, t = game.gameTime + 1 / 60;
  update(1 / 60, 800, fx);
  expect(game.player.x - x0).toBeCloseTo(BLIZZ_DRIFT * difficulty().hazard * blizzardWobble(t) / 60, 5);
  expect(game.player.x).not.toBe(x0);
});
```

- [ ] **Implement.** Move the block above `updatePlayer` (so the player's own collision pass resolves the push) and change it to `game.player.x += …` with the same expression. If `blizzardWobble` is zero at the sampled time, run frames until it is not before asserting.
- [ ] **Verify + commit:** `Bug review 3: the blizzard's drift is a position push`

#### Task D3: Triggers cannot be jumped or flown over (§2.4, §3 `game.js:219-223`)

- [ ] **Test** — `test/cell.test.js` (update any assertion on the old 140 px zone) and `test/game-loop.test.js`:

```js
it('the cell zone reaches the ceiling', () => {
  const l = LEVELS[2].make(600), a = cellApproach(l);
  expect(a.y).toBe(0); expect(a.y + a.h).toBe(l.cell.y + l.cell.h);
});
it.each([[6, 'l7-king-end'], [7, 'l8-arena'], [8, 'l9-gate']])('level %i trigger %s is full height', (idx, id) => {
  const l = LEVELS[idx].make(600), d = l.dialogs.find(x => x.id === id);
  expect(d.y).toBe(0); expect(d.h).toBe(l.groundY);
});
it('a beat whose condition comes true while she stands in the rect still fires', () => {
  startGame(600, 6);
  const d = game.level.dialogs.find(x => x.id === 'l7-king-end');
  game.player.x = d.x + 20; game.player.y = game.level.groundY - game.player.h;
  update(1 / 60, 800, fx); expect(isDialogueOpen()).toBe(false);
  for (const e of game.enemies) if (e.kind === 'wizardboss') e.dead = true;
  update(1 / 60, 800, fx); expect(isDialogueOpen()).toBe(true);
});
```

- [ ] **Implement.** `cellApproach` returns `{ x: c.x - 60, y: 0, w: c.w + 60, h: c.y + c.h }`. The three dialog rects become `y: 0, h: groundY`. In `checkDialogs`, add the rect to `game.dialogsIn` only after a beat has been found. If another level 7 beat opens first in the third test, close it and continue; the assertion is on `l7-king-end`.
- [ ] **Verify + commit:** `Bug review 2.4: the witch's cell and the boss thresholds are full height`

#### Task D4: Three small loop fixes (§3 `game.js:113-120`, `:240`; §4 `game.js:108`)

- [ ] **Test:**

```js
it('arrows in flight are cleared when the level 9 ending starts', () => {
  startGame(600, 8); fireArrow(game.player); game.level.ending9.started = true;
  update(1 / 60, 800, fx); expect(arrows).toHaveLength(0);
});
it('a cast pressed during the revive beat does not fire on revival', () => {
  setDifficulty('easy'); startGame(600, 0);
  game.player.reviving = 0.5; input.cast = true; update(1 / 60, 800, fx);
  expect(input.cast).toBe(false);
});
it('the sunbeam spares the troll and does not throw', () => {
  startGame(600, 2);
  const troll = game.enemies.find(e => e.kind === 'troll'); game.camera.x = troll.x - 100;
  expect(() => fireSunbeam(game.player, game.level, fx, 800)).not.toThrow();
  expect(troll.dead).toBe(false);
});
```

Start the ending in the first test the way `test/ending9.test.js` does if setting the flag alone leaves its state incomplete.

- [ ] **Implement.** `resetArrows()` inside the `ending9.started` branch; `input.cast = false` at the top of `updateRevive`; add `e.kind === 'troll'` to the exemption and pass the camera: `damageEnemy(e, fx, cam)`.
- [ ] **Verify + commit:** `Bug review 3/4: arrows clear at the ending, no cast through a revive, the troll is sunbeam-exempt`

### Lane E — Enemy core & bosses

Tests in `test/enemy-core.test.js`.

#### Task E1: A stomp is a stomp at any frame rate and with two enemies underfoot (§3 `enemies.js:121`, `:131-132`)

- [ ] **Test** — `rig()` returns `{ l: createLevel(600), p: createPlayer(l), e: spawnEnemy({ kind: 'slime', x: 400 }, l) }`:

```js
it('a fast fall at 30 fps is still a stomp', () => {
  const { l, p, e } = rig(); p.vy = 800;
  p.x = e.x; p.y = e.y + 20 - p.h;            // feet 20 px into the slime after a 26 px step
  hitOnly([e], p, l, 1 / 30);
  expect(e.dead).toBe(true); expect(p.hp).toBe(3);
});
it('two overlapping enemies under one stomp: neither hurts', () => {
  const { l, p, e } = rig(); const e2 = spawnEnemy({ kind: 'slime', x: e.x + 6 }, l);
  p.vy = 300; p.x = e.x; p.y = e.y + 4 - p.h;
  hitOnly([e, e2], p, l, 1 / 60);
  expect(p.hp).toBe(3);
});
it('the bounce off an unstompable is not cut short', () => {
  const { l, p } = rig(); const g = spawnEnemy({ kind: 'ghost', x: p.x }, l);
  p.vy = 300; p.cuttable = true; p.y = g.y + 4 - p.h;
  hitOnly([g], p, l, 1 / 60);
  expect(p.vy).toBe(E_STOMP_V); expect(p.cuttable).toBe(false);
});
```

`hitOnly` calls `updateEnemies` with each enemy's kind `update` stubbed for the test (`vi.spyOn(getKind(kind), 'update').mockImplementation(() => {})`) so only the contact rule runs.

- [ ] **Implement.** `updateEnemies` reads `const vy0 = p.vy` before the loop and passes it and `dt` to `hitPlayer(e, p, cam, fx, vy0, dt)`. The stomp test becomes swept: `vy0 > 0 && (p.y + p.h - vy0 * dt) - e.y < 16`. The unstompable branch also sets `p.cuttable = false`.
- [ ] **Verify + commit:** `Bug review 3: stomps use the fall speed from before the enemy loop, swept over the frame`

#### Task E2: A boss's last hit clears what it had in the air (§2.5)

- [ ] **Test:**

```js
it.each(['queenboss', 'warden'])('%s: the final blow empties the air', kind => {
  const l = LEVELS[kind === 'warden' ? 7 : 8].make(600);
  const e = spawnEnemy(l.roster.find(s => s.kind === kind), l); e.sleeping = false;
  for (const list of [fireballs, boulders, cones, shockwaves]) list.push({ dead: false }); // projectiles.js exports all four
  l.blizzard = { t: 5, next: 1 };
  damageEnemy(e, fx, createCamera(), e.hp, l);
  for (const list of [fireballs, boulders, cones, shockwaves]) expect(list).toHaveLength(0);
  if (kind === 'queenboss') expect(l.blizzard).toBe(null);
});
```

- [ ] **Implement.** Both `onZero` hooks call `resetFireballs()`, `resetBoulders()`, `resetCones()`, `resetShockwaves()`. The Queen's takes `lvl` as its fourth parameter (it is already passed, `enemies.js:75`) and sets `lvl.blizzard = null` when `lvl` is given.
- [ ] **Verify + commit:** `Bug review 2.5: nothing a boss threw outlives her last hit`

#### Task E3: The Warden's first breath; the Queen's unscaled clocks (§3 `warden.js:131,138`, `enemies.js:104-105`)

**Interfaces — produces:** the `env` passed to every kind's `update` gains `rawDt` (the frame's unscaled `dt`); `dt` stays tell-scaled.

- [ ] **Test:**

```js
it('the Warden never reads a stale chime on waking', () => {
  for (let wakeAt = 0; wakeAt < 16; wakeAt++) {       // sweep the clock phase he wakes on
    const { l, e, p } = wardenRig(); e.sleeping = true; const x0 = e.x;
    for (let i = 0; i < 200 + wakeAt * 20; i++) { tickClock(l); updateEnemies([e], p, l, cam, 1 / 60, fx); }
    e.sleeping = false; tickClock(l); updateEnemies([e], p, l, cam, 1 / 60, fx);
    expect(e.state).toBe('idle'); expect(e.x).toBe(x0);
  }
});
it("easy: the Queen's spike lasts as long as on hard while she winds up", () => {
  setDifficulty('easy');
  const { l, e, p } = queenRig(); e.sleeping = true;   // she casts nothing new; her spikes still run
  vi.spyOn(getKind('queenboss'), 'isTell').mockReturnValue(true); // every frame is tell-scaled
  updateEnemies([e], p, l, cam, 1 / 60, fx);           // first update creates her state
  const sp = { x: 5000, t: 0, cracked: false }; e.spikes.push(sp);
  for (let t = 0; t < SPIKE_LIFE + 0.1; t += 1 / 60) updateEnemies([e], p, l, cam, 1 / 60, fx);
  expect(e.spikes).not.toContain(sp);                  // gone after SPIKE_LIFE, not SPIKE_LIFE × bossTell
});
```

`wardenRig` and `queenRig` build the level, boss and player the way `test/warden.test.js` and `test/frostqueen.test.js` do. `tickClock` advances `l.clock.t` and wraps it at the chime period the way `updateClock` does (use the real function if its side effects allow).

- [ ] **Implement.** Warden: keep `e.lastT` current while asleep — `if (e.sleeping) { e.lastT = lvl.clock ? lvl.clock.t : 0; return; }`. `enemies.js`: `env` carries `rawDt: dt`, and the tell-scaled copy keeps it. `queenboss.js`: `updateSpikes` and the blizzard block (`:190-195`) run on `rawDt ?? dt`.
- [ ] **Verify + commit:** `Bug review 3: the Warden's opening breath; the Queen's spikes and storm ignore tell scaling`

### Lane F — Enemy kinds

#### Task F1: The sentinel's shield faces forward (§3 `sentinel.js:77-78`, §6 `sentinel.test.js:91-112`)

- [ ] **Test** — in `test/sentinel.test.js`, both existing cases keep their arrow direction and flip `e.dir`: "front arrow … deflect, no damage" uses `e.dir = 1` (facing the arrow that flies left at him); "rear arrow … lands" uses `e.dir = 1` with the arrow flying right into his back. Fix the comments to match.
- [ ] **Implement.** `arrowBlocked: (e, a) => e.shieldUp && ((a.vx > 0 && e.dir < 0) || (a.vx < 0 && e.dir > 0))`.
- [ ] **Verify + commit:** `Bug review 3: the sentinel's shield blocks from the front`

#### Task F2: The zombie and the hare walk back to their band (§3 `zombie.js:23-26`, `hare.js:47-50`)

- [ ] **Test** — `test/zombie.test.js` and `test/hare.test.js`, same shape:

```js
it('outside its band and no longer chasing, it walks back — never jumps', () => {
  const { l, e, p } = rig(); e.x = e.maxX + 158; p.y = e.y - 400;     // player out of aggro height
  let prev = e.x;
  for (let i = 0; i < 600 && e.x + e.w > e.maxX; i++) {
    getKind('zombie').update(e, { p, lvl: l, dt: 1 / 60, fx, cam });
    expect(Math.abs(e.x - prev)).toBeLessThan(5); prev = e.x;
  }
  expect(e.x + e.w).toBeLessThanOrEqual(e.maxX + 1);
});
```

- [ ] **Implement.** In both files: when the overshoot past the band edge is no more than one frame's travel (`Math.abs(e.vx) * dt`), keep today's snap-and-turn exactly (this is the ordinary patrol turn, and 60 fps must not change). When it is more, only set `e.dir` toward the band and let it walk.
- [ ] **Verify + commit:** `Bug review 3: the zombie and the hare walk home instead of teleporting`

#### Task F3: The dragon eases back up; the spider cannot overshoot its anchor (§3 `dragon.js:142-146,156`, `spider.js:82-88`)

- [ ] **Test:**

```js
it('a dragon hit on its perch rises at float speed, not in one frame', () => {
  const { l, e, p } = dragonRig(); const k = getKind('dragon');
  e.state = 'perch'; e.y = l.groundY - e.h; k.onHit(e);
  let prev = e.y, rose = false;
  for (let i = 0; i < 90 && (e.state === 'stagger' || e.state === 'idle'); i++) {
    k.update(e, { p, lvl: l, dt: 1 / 60, fx });
    expect(Math.abs(e.y - prev)).toBeLessThanOrEqual(k.floatSpeed / 60 + 0.01);
    rose ||= e.y < prev; prev = e.y;
  }
  expect(rose).toBe(true);
});
it('at 20 fps a climbing spider still reaches its anchor and hangs', () => {
  const { l, e, p } = spiderRig(); e.state = 'climb'; e.x = e.anchorX + 3; e.y = e.anchorY + 46 + 5;
  for (let i = 0; i < 40; i++) getKind('spider').update(e, { p, lvl: l, dt: 1 / 20, fx });
  expect(e.state).not.toBe('climb');
});
```

- [ ] **Implement.** Dragon: delete the hard clamp `e.y = Math.max(top, Math.min(bottom, e.y))` (`dragon.js:156`); the eased move two lines above already heads for the clamped target. Spider: move by `Math.min(S_CLIMB_SPEED * dt, d)`.
- [ ] **Verify + commit:** `Bug review 3: the dragon rises instead of teleporting; the spider's climb is clamped`

### Lane G — Projectiles & render state

#### Task G1: A reflected bolt goes back the way it came (§3 `projectiles.js:52-57`)

- [ ] **Test** — `test/shield.test.js`:

```js
it('a reflected bolt reverses both axes and reaches the shooter', () => {
  const { l, p, cam } = rig(); p.shield = 1; resetFireballs();
  const sx = p.x + 200, sy = p.y - 100;                     // the shooter, up and to the right
  fireFireball(sx, sy, -240 * 0.894, 240 * 0.447, fx);      // aimed at the player
  let closest = Infinity;
  for (let i = 0; i < 240; i++) {
    updateFireballs(p, l, cam, 1 / 60, fx);
    const f = fireballs[0]; if (f?.reflected && !f.dead) closest = Math.min(closest, Math.hypot(f.x - sx, f.y - sy));
  }
  expect(closest).toBeLessThan(20);
});
it('a reflected bolt never hits the player who reflected it', () => {
  const { l, p, cam } = rig(); resetFireballs();
  fireFireball(p.x, p.y, 0, 0, fx); fireballs[0].reflected = true;
  updateFireballs(p, l, cam, 1 / 60, fx);
  expect(p.hp).toBe(3);
});
```

- [ ] **Implement.** On reflect negate `f.vy` as well as `f.vx`; the player-collision test (`:50`) also requires `!f.reflected`.
- [ ] **Verify + commit:** `Bug review 3: the mirror shield sends a bolt back to its shooter`

#### Task G2 [snapshot]: The intro does not leak `textAlign` into the HUD (§3 `render/intro.js:115-119`, `hud.js:20,129`)

- [ ] **Test** — `test/render-state.test.js`. `stateCtx()` is a `Proxy` like `smoke.mjs`'s `ctxStub` (unknown methods are no-ops returning `{ width: 0 }`) with real `save`/`restore` that push and pop `textAlign`:

```js
it('drawIntro leaves textAlign as it found it', () => {
  const c = stateCtx(); c.textAlign = 'left'; drawIntro(c, 800, 600); expect(c.textAlign).toBe('left');
});
it('the HUD sets its own alignment', () => {
  const c = stateCtx(); c.textAlign = 'right'; const seen = [];
  c.fillText = () => seen.push(c.textAlign);
  startGame(600, 0); drawHud(c, 800, 600);
  expect(seen[0]).toBe('left');                            // the first heart
});
```

- [ ] **Implement.** Wrap the body of `drawIntro` in `c.save()` / `c.restore()`. In `drawHud` set `ctx.textAlign = 'left'` after each of its two `ctx.save()` calls (`hud.js:15`, `:123`). Regenerate the snapshot; the diff should be only the added `save`/`restore`/`textAlign` records.
- [ ] **Verify + commit:** `Bug review 3: the intro restores the canvas state; the HUD sets its own alignment`

#### Task G3: Parallax falls back unless all three layers are ready (§3 `render/background.js:65-71`)

- [ ] **Test** — same file, `vi.mock('../src/sprites.js', …)` so the readiness accessor `drawTiled` uses returns a fake sheet only for the names in a test-controlled set:

```js
it('one missing ridge sheet means no layer is drawn and the caller falls back', () => {
  ready = new Set(['bg_night_sky', 'bg_night_near']);      // far ridge failed to load
  const c = stateCtx(); let draws = 0; c.drawImage = () => draws++;
  expect(drawParallax(c, createLevel(600), { x: 0 }, 800)).toBe(false);
  expect(draws).toBe(0);
});
```

- [ ] **Implement.** `drawParallax` checks `sprite()` for all three names before drawing any. Apply the same rule to `drawZoneParallax` and `drawThawParallax` (sky, warm sky when used, and ridge when named).
- [ ] **Verify + commit:** `Bug review 3: a missing ridge sheet falls back to the vector parallax`

### Lane M — Music & audio

#### Task M1: Strudel's audio is initialised once, and the first notes wait for the worklets (§1.3 "Related waste", §4 `music.js:207-219`)

- [ ] **Test** — `test/music.test.js`, a fake backend whose `initAudio` returns a promise the test resolves, and a fake context `{ state: 'suspended', resume() { resumes++; } }`:

```js
it('initAudio runs once however many gestures arrive; resume runs each time', () => {
  _setBackend(fake); for (let i = 0; i < 5; i++) resumeAudio();
  expect(fake.initAudioCalls).toBe(1); expect(resumes).toBeGreaterThanOrEqual(5);
});
it('the pattern is not evaluated until the worklets have loaded, and then only the current track', async () => {
  _setBackend(fake); setTrack('meadow'); setTrack('peak');
  expect(fake.evaluated).toHaveLength(0);
  fake.resolveInit(); await Promise.resolve(); await Promise.resolve();
  expect(fake.evaluated).toHaveLength(1);
});
it('a backend with no initAudio still evaluates at once', () => {
  _setBackend({ ...fake, initAudio: undefined }); setTrack('meadow');
  expect(fake.evaluated).toHaveLength(1);
});
```

- [ ] **Implement.** A module-level `audioReady` promise, created on the first `resumeAudio()`/`setTrack()` from `backend.initAudio()` (rejections swallowed) and cleared in `_reset()`. `resumeAudio()` afterwards only calls `ctx.resume()` when the state is not `'running'`. `setTrack` evaluates once `audioReady` has settled, and only if `music.track` is still the level it was asked for. Use the track names `tracks.js` actually registers.
- [ ] **Verify + commit:** `Bug review 1.3: one initAudio; the track starts after the worklets load`

#### Task M2: The music stops while the tab is hidden (§4 `music.js` no visibility handling)

**Interfaces — produces:** `onVisibility(hidden: boolean): void` in `src/music.js`.

- [ ] **Test:** with a fake context exposing `suspend()`/`resume()` counters: `onVisibility(true)` calls `suspend` once; `onVisibility(false)` calls `resume` once; neither throws with no backend.
- [ ] **Implement.** Suspend and resume the Strudel audio context (its clock stops, so nothing is scheduled late). `loadStrudel()` registers `document.addEventListener('visibilitychange', () => onVisibility(document.hidden))`.
- [ ] **Verify + commit:** `Bug review 4: the music pauses with the tab`

#### Task M3: Lighter voices (§1.3 quick fix; §4 `chip.js` delay settings) — **by-ear gate**

- [ ] **Test** — `test/music-chip.test.js`, over the source of every level's track (`LEVELS.map(l => trackFor(l.name))`):

```js
it.each(tracks)('%s uses no per-note worklet effects', (_, src) => {
  expect(src).not.toMatch(/\.coarse\(/); expect(src).not.toMatch(/\.distort\(/);
  expect(src).not.toMatch(/s\("pulse"\)\.pw\(\.5\)/);
});
it.each(tracks)('%s gives each delay time its own orbit', (_, src) => {
  const want = { '.125': 2, '.1875': 3, '.375': 4 };
  for (const [, time, orbit] of src.matchAll(/\.delaytime\(([.\d]+)\)[^\n]*?\.orbit\((\d)\)/g)) expect(Number(orbit)).toBe(want[time]);
  expect((src.match(/\.delaytime\(/g) ?? []).length).toBe((src.match(/\.orbit\(/g) ?? []).length);
});
```

Replace the existing assertion that expects `coarse(` (`music-chip.test.js:183`).

- [ ] **Implement** in `chip.js` and any voices written inline in `tracks.js`: remove `.coarse(n)` and `.distort(n)` from every shipped voice; replace `.s("pulse").pw(.5)` with `.s("square")`; append `.orbit(2|3|4)` after `.delayfeedback(…)` for delay times `.125 | .1875 | .375`. Narrow pulses (`pw(.125)`, `.25`, `.375`) stay. `VARIANTS` (audition material) is left alone. Update the header comment's "Also kept: coarse()" paragraph to say why it went.
- [ ] **Verify + commit:** `Bug review 1.3: voices without per-note worklets; one delay line per delay time`
- [ ] **Gate:** the lane does not merge until the result has been heard in `music-lab.html` (levels 1, 7 and 8). The review's table puts this at mean load 0.12, peak 0.77. If that is not enough on the target device, the remaining step is narrow pulses → `square` (mean 0.07, peak 0.26), which changes the timbre more and is a separate decision.

#### Task M4: The sfx context on iOS (§4 `audio.js:19`, `:38`)

**Interfaces — produces** (in `src/audio.js`): `silentWav(rate = 44100, seconds = 0.1): string` (a data URI, 16-bit mono PCM); `isIOS(nav = globalThis.navigator): boolean`.

- [ ] **Test** — `test/audio.test.js`:

```js
it('the unlock loop is 44.1 kHz 16-bit', () => {
  const b = Buffer.from(silentWav().split(',')[1], 'base64');
  expect(b.readUInt32LE(24)).toBe(44100); expect(b.readUInt16LE(34)).toBe(16);
});
it('isIOS: iPhone and touch-Mac iPads only', () => {
  expect(isIOS({ userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
  expect(isIOS({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
  expect(isIOS({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
  expect(isIOS({ userAgent: 'X11; Linux', platform: 'Linux x86_64', maxTouchPoints: 0 })).toBe(false);
});
it("an 'interrupted' context counts as suspended and is resumed", () => {
  let resumed = 0; class Ctx { state = 'interrupted'; resume() { resumed++; } }
  vi.stubGlobal('AudioContext', Ctx); initAudio();
  expect(audioSuspended()).toBe(true); expect(resumed).toBe(1);
});
```

Load `audio.js` fresh for the third test (`vi.resetModules()` and a dynamic `import`), since the module keeps its context.

- [ ] **Implement.** `SILENCE` becomes `silentWav()`; `unmuteIOS()` returns early unless `isIOS()`; `initAudio` resumes whenever the state is not `'running'`; `audioSuspended()` is true for `'suspended'` and `'interrupted'`.
- [ ] **Verify + commit:** `Bug review 4: the iOS unlock loop is full-rate and iOS-only; an interrupted context resumes`

### Lane T — Tooling

#### Task T1: The dev server survives a bad URL (§6 `server.mjs:25`)

- [ ] **Test** — `test/server.test.js` spawns `node server.mjs <port>` (a port in 20000–29999), waits for its stdout line, and kills it in `afterAll`:

```js
it('GET /% is a 400 and the server is still up', async () => {
  expect((await fetch(`${base}/%`)).status).toBe(400);
  expect((await fetch(`${base}/`)).status).toBe(200);
});
it('serves the manifest with its own type', async () => {
  expect((await fetch(`${base}/manifest.webmanifest`)).headers.get('content-type')).toBe('application/manifest+json');
});
it('still refuses path traversal', async () => {
  expect([403, 404]).toContain((await fetch(`${base}/..%2f..%2fetc%2fpasswd`)).status);
});
```

- [ ] **Implement.** `decodeURIComponent` inside a `try`; failure answers `400 bad request`. Add `'.webmanifest': 'application/manifest+json'`. `listen(port, '127.0.0.1', …)`.
- [ ] **Verify + commit:** `Bug review 6: the dev server answers a bad URL, binds to localhost, types the manifest`

#### Task T2: The smoke test runs level 1; bosslab runs from any path (§6 `smoke.mjs:19-30`, `bosslab.mjs:272`)

- [ ] **Implement `smoke.mjs`.** One helper `run(label)` replaces the nine copied loops; it drives `FRAMES` frames and throws `smoke: <label> did not advance` unless `game.gameTime` grew. The first run calls `startGame(600, 0)` before its frames, which takes the difficulty card down.
- [ ] **Check:** `node smoke.mjs` prints `smoke OK`. Then, temporarily deleting the new `startGame(600, 0)` line, it must fail with `smoke: level 1 did not advance`; restore the line.
- [ ] **Implement `bosslab.mjs`.** `if (import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();` with imports from `node:url` and `node:fs`.
- [ ] **Check:** `d="$(mktemp -d)/uq space" && cp -r . "$d" && node "$d/tools/bosslab.mjs" why mage` prints the `mean fight` line; `npm run bosslab -- why mage` still does.
- [ ] **Verify + commit:** `Bug review 6: smoke really runs level 1; bosslab runs from a path with a space or a symlink`

---

## Wave 2 — after Wave 1 is merged

Merge the nine lane branches into `bugfix/review-2026-11-15` (they share no files), run `npm test` and `node smoke.mjs`, then start lanes S and R from the merged branch.

### Lane S — Shell

#### Task S1: Fullscreen is the page, not the canvas (§2.6, §4 `main.js:36,64`)

**Interfaces — produces** (in new `src/shell.js`): `fullscreenApi(doc): { request(): Promise<void>, exit(): Promise<void>, active(): boolean } | null` — built on `doc.documentElement`, with the `webkit` fallbacks; `null` when the page has no Fullscreen API.

- [ ] **Test** — `test/shell.test.js`:

```js
it('targets the page, so the touch controls stay on screen', async () => {
  let target = null;
  const doc = { documentElement: { requestFullscreen() { target = this; return Promise.resolve(); } }, exitFullscreen: () => Promise.resolve(), fullscreenElement: null };
  await fullscreenApi(doc).request();
  expect(target).toBe(doc.documentElement);
});
it('falls back to the webkit names', () => {
  const doc = { documentElement: { webkitRequestFullscreen() {} }, webkitExitFullscreen() {}, webkitFullscreenElement: {} };
  expect(fullscreenApi(doc).active()).toBe(true);
});
it('no API (iPhone Safari): null, so the caller shows the toast (Review Focus 5)', () => {
  expect(fullscreenApi({ documentElement: {} })).toBe(null);
});
it('a refused request does not reject', async () => {
  const doc = { documentElement: { requestFullscreen: () => Promise.reject(new Error('denied')) }, exitFullscreen() {} };
  await expect(fullscreenApi(doc).request()).resolves.toBeUndefined();
});
```

- [ ] **Implement.** `toggleFullscreen()` in `main.js` uses `fullscreenApi(document)` and keeps the toast for `null`. The touch button's orientation lock moves into `request().then(…)`. In `index.html` replace the two `canvas:fullscreen` rules and `canvas::backdrop` with `:root:fullscreen` / `:root:-webkit-full-screen` rules: `body { background: #0d0815; }`, `canvas { width: 100vw; height: 100vh; object-fit: contain; image-rendering: pixelated; border: 0; border-radius: 0; }`, `footer { display: none; }`. `body.touch canvas`'s existing max-width/height rules still apply in fullscreen and keep the buttons off the picture.
- [ ] **Verify + commit:** `Bug review 2.6: fullscreen takes the page, so the touch buttons come with it`

#### Task S2: The shell's key rules, and wiring Wave 1's exports (§3 `main.js:20-21`, §4 `main.js:56,81,89`)

**Interfaces — consumes:** `releaseAllKeys()` (A2), `stepFrame(dt, viewW, fx)` (D1), `resetGamepads()` (`gamepad.js`). **Produces** (in `src/shell.js`): `CARD_GUARD = 0.4`; `isFullscreenKey(e): boolean`; `skipsIntro(e): boolean`; `cardOpen(t: number): boolean`.

- [ ] **Test:**

```js
const key = (code, extra = {}) => ({ code, repeat: false, isTrusted: true, ctrlKey: false, metaKey: false, altKey: false, ...extra });
it('F toggles fullscreen; Ctrl+F, Cmd+F, a repeat and a synthetic F do not', () => {
  expect(isFullscreenKey(key('KeyF'))).toBe(true);
  for (const x of [{ ctrlKey: true }, { metaKey: true }, { repeat: true }, { isTrusted: false }]) expect(isFullscreenKey(key('KeyF', x))).toBe(false);
});
it('M, N, F and modified keys do not skip the intro; Space and arrows do', () => {
  for (const c of ['KeyM', 'KeyN', 'KeyF']) expect(skipsIntro(key(c))).toBe(false);
  expect(skipsIntro(key('KeyR', { ctrlKey: true }))).toBe(false);
  expect(skipsIntro(key('Space'))).toBe(true); expect(skipsIntro(key('ArrowRight'))).toBe(true);
});
it('the end card ignores Space for its first 0.4 s', () => {
  expect(cardOpen(0.016)).toBe(false); expect(cardOpen(0.4)).toBe(true);
});
```

- [ ] **Implement** in `main.js`:
  - the fullscreen listener (`:56`) uses `isFullscreenKey(e)`;
  - the game keydown listener (`:78-98`) is registered **after** `await spritesLoaded()`; inside it the intro branch requires `skipsIntro(e)`, and the restart branch requires `cardOpen(cardT)`;
  - the frame callback keeps `cardT` (`+= dt` while `player.dead || player.won`, else `0`) and calls `stepFrame` instead of `update`;
  - `addEventListener('blur', () => { releaseAllKeys(); resetGamepads(); })`.
- [ ] **Verify + commit:** `Bug review 3/4: no game keys during loading; F, the intro skip and the end card take only the keys meant for them`

### Lane R — Enemy overlays (§2.7)

**Contract (all three tasks).** A kind may register `drawOverlay(c, e)`: everything that depends on the enemy's state — hp pips, hit flash, attack tells, shields, and world-space hazards it owns (web pillars, seal columns, the sweep band, spikes). It sets up its own transform. The kind's existing `draw(c, e)` becomes "vector body, then `drawOverlay`", issuing the same canvas calls in the same order as today, so **the render snapshot must not change** in this lane. `render/enemies.js` calls `drawOverlay` after a sprite body and `draw` when there is no sprite.

#### Task R1: The contract, and the three kinds the review reproduced (mage, warden, spiderboss)

- [ ] **Test** — `test/enemy-overlay.test.js`, with `vi.mock('../src/sprites.js')` making `spriteReady` true and `vi.mock('../src/render/sprite.js')` making `drawSpriteFeet` return true. `recordingCtx` is `test/helpers/recording-ctx.js`; `spawnOne(kind)` spawns from the roster of the level that kind appears in:

```js
it.each(['mage', 'warden', 'spiderboss'])('%s: its overlay is drawn over the sprite', kind => {
  const k = getKind(kind), spy = vi.spyOn(k, 'drawOverlay');
  const e = spawnOne(kind); k.update(e, envFor(e));       // one update, so its state exists
  drawEnemies(recordingCtx(), [e]);
  expect(spy).toHaveBeenCalledWith(expect.anything(), e);
});
it('the mage shows hp pips over his sprite', () => {
  const e = spawnOne('mage'); e.hp = 3; const c = recordingCtx();
  drawEnemies(c, [e]);
  expect(c.calls.filter(x => x.name === 'fillRect').length).toBeGreaterThanOrEqual(3); // adapt to the recorder's record shape
});
it('a kind with no overlay still draws its sprite alone', () => {
  expect(() => drawEnemies(recordingCtx(), [spawnOne('slime')])).not.toThrow();
});
```

- [ ] **Implement.** `render/enemies.js`: after a successful sprite draw, `getKind(e.kind).drawOverlay?.(c, e)`, then `continue`. Split the three kinds' `draw` per the contract and register `drawOverlay`.
- [ ] **Verify + commit:** `Bug review 2.7: bosses keep their pips, tells and hazards when the sprite is drawn`

#### Tasks R2 and R3 (parallel, after R1 merges)

- **R2 — the other bosses:** `troll.js`, `dragon.js`, `wizardboss.js`, `queenboss.js`.
- **R3 — the rest:** `sentinel.js`, `zombie.js`, `hare.js`, `bat.js`, `bee.js`, `moth.js`, `ghost.js`, `slime.js`, `snake.js`, `spider.js`, `wraith.js`. A kind whose `draw` has nothing conditional on state gets no overlay; say so in the commit message.

- [ ] **Test** — the same `it.each` as R1 over the task's kinds that gain an overlay, in the task's own file so the two do not collide: `test/enemy-overlay-bosses.test.js` (R2), `test/enemy-overlay-kinds.test.js` (R3). R2 also adds:

```js
it('every boss has an overlay', () => {
  for (const kind of ['mage', 'troll', 'dragon', 'spiderboss', 'wizardboss', 'warden', 'queenboss'])
    expect(typeof getKind(kind).drawOverlay).toBe('function');
});
```

- [ ] **Implement** per the contract, one kind per commit-sized edit.
- [ ] **Verify + commit:** `Bug review 2.7: overlays for <kinds>`

---

## Wave 3 — Lane P: rendering performance (optional, §5)

### Task P1: Sheets are decoded before the first frame (`sprites.js:60-80`)

- [ ] **Test** — stub `Image` before a fresh import (`vi.stubGlobal`, `vi.resetModules()`, dynamic `import`): each fake image fires `load` and exposes `decode()` returning a promise the test controls. `spritesLoaded()` must still be pending after `load` and resolve once every `decode()` has.
- [ ] **Implement.** On `load`, settle after `img.decode()` (resolved or rejected) when the method exists, else at once.
- [ ] **Verify + commit:** `Bug review 5: sprite sheets decode before the first frame`

### Task P2 [snapshot]: Nothing wholly off-screen is drawn

**Interfaces — produces:** `inView(x, w, cam, viewW, margin = 64): boolean` in new `src/render/cull.js`.

- [ ] **Test:** unit cases for `inView` (inside, straddling each edge, just outside each margin); and through `test/helpers/render-harness.js`, level 5 at its start draws fewer than 60 % of the calls it does today (today: 468, of which 373 are off-screen).
- [ ] **Implement.** Guard the per-item draws in `render/level.js:26-235`, `forest.js:138-174`, `zones.js`, `sprite.js:127-141` and `door.js:22-30`. Regenerate the snapshot; the diff must contain removals only.
- [ ] **Verify + commit:** `Bug review 5: the renderer skips what the camera cannot see`

### Task P3: The small ones

- [ ] `render/player.js:56` — build the lantern gradient once per radius and reuse it. Test: two draws at the same radius call `createRadialGradient` once.
- [ ] `render/sprite.js:55-65` — tiles at `Math.round`ed x and width. Test: recorded `drawImage` x and width are integers. **[snapshot]**
- [ ] `render/level.js:257` — set `lineWidth = 1` before the crate outline. **[snapshot]** (vector path only)
- [ ] Delete `assets/sprites/sprites.json` and the `bg_glacier_ice` manifest entry and file after `grep -rn "sprites.json\|bg_glacier_ice" src index.html` shows no reader. `test/sprites.test.js` stays green.
- [ ] `manifest.webmanifest` — add a 512 px icon: `convert assets/favicon-192.png -filter point -resize 512x512 assets/favicon-512.png` (ImageMagick). If it is not installed, skip and report.
- [ ] **Verify + commit:** one commit per bullet, `Bug review 5: <what>`

---

## Wave 4 — Task V: integration

- [ ] Merge the remaining lanes into `bugfix/review-2026-11-15`. `npm test`, `node smoke.mjs`, `npm run bosslab -- fight` (every boss still 8/8 on hard except the Mage's known easy-preset figure, §7).
- [ ] Headless Chromium against `npm run serve` (Playwright's Chromium works on the dev machine), touch emulation on, repeating the review's own reproductions:
  - §1.1 hold ▶ into a dialogue, tap JUMP: the player moves within 0.1 s of the box closing, without lifting.
  - §1.2 slide ◀ → ▶ without lifting: direction changes; land on the hub and roll onto ▶: moves.
  - §2.6 tap ⛶: `document.fullscreenElement === document.documentElement` and the JUMP button's bounding box is on screen.
  - §2.7 `?level=8`: the Warden's hp pips and sweep band are visible once the sheets have loaded (screenshot).
  - §3 normal boot: the "tap or click for sound" hint starts at x = 12.
  - §1.3 one console line per session for audio start, not two per key press; no `Failed to construct 'AudioWorkletNode'` at track start.
- [ ] Report anything that could not be checked (Safari/iOS in particular) rather than marking it done.
- [ ] `git push rig bugfix/review-2026-11-15` — the branch only; `main` on the rig and GitHub are left for review.
