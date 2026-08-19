# Graphics extraction refactor — phased plan

Status: all phases complete (phases 0–6). See git log.

Goal: pull all canvas/graphics code out of the logic modules into a
`src/render/` directory, organised one file per visual concern. Logic
modules (`game.js`, `level.js`, `player.js`, `enemies.js`, `loot.js`,
`arrows.js`, `particles.js`) become pure simulation: no `ctx` calls, no
palette literals.

## Current state (where graphics code lives)

| File | Graphics content |
|---|---|
| `src/render.js` | `draw()` orchestration, `drawHud()`, clear color, shake transform |
| `src/level.js` | `drawLevel()` (~40 lines) mixed with layout data + collision |
| `src/player.js` | `drawPlayer()` (~65 lines: unicorn, rider, bow) mixed with physics |
| `src/enemies.js` | `drawEnemies()` mixed with patrol/stomp logic |
| `src/loot.js` | `drawLoot()` mixed with item physics/pickups |
| `src/arrows.js` | `drawArrows()` mixed with flight/hit logic |
| `src/particles.js` | `drawParticles()` mixed with particle sim |
| `src/background.js` | 100% graphics (stars + ridges) |
| `src/main.js` | canvas setup + loop wiring (stays, import path changes) |

Graphics-adjacent data also scattered through logic: `burst(...)` color
arrays in `game.js`, `player.js`, `enemies.js`, `loot.js`, `arrows.js`.

## Target structure

```
src/
  main.js            # unchanged except draw import path
  game.js            # simulation root (unchanged until phase 5)
  level.js           # layout data + collision only
  camera.js          # unchanged
  input.js           # unchanged
  audio.js           # unchanged
  player.js          # state + physics only
  enemies.js         # state + AI only
  loot.js            # loot logic only
  arrows.js          # arrow logic only
  particles.js       # particle sim only
  render/
    index.js         # draw(): clear, shake, world pass, HUD call
    background.js    # moved from src/background.js
    level.js         # drawLevel
    player.js        # drawPlayer
    enemies.js       # drawEnemies
    loot.js          # drawLoot
    arrows.js        # drawArrows
    particles.js     # drawParticles (imports state from ../particles.js)
    hud.js           # drawHud
    theme.js         # palette + fonts shared by 2+ render files (phase 5)
```

Dependency direction: `render/*` imports from logic modules (state,
constants). Logic modules never import `render/*`.

## Rules for every phase

1. **Pure move** — code is relocated verbatim (or with import-path fixes
   only). No signature changes, no behaviour changes, no restyling.
2. **One concern per phase**, one turn per phase.
3. **Verify after each phase**: `npm test && npm run smoke`. The unit
   tests don't touch the canvas; the smoke test drives the real
   update+draw loop and catches wiring regressions (bad import paths,
   missing exports, undefined calls).
4. Delete the old file/function only in the same phase the new one lands,
   so the game is always runnable at phase boundaries.

## Phases

### Phase 0 — Baseline
Run `npm test && npm run smoke`, confirm green. No changes.

### Phase 1 — Skeleton: move background
- Create `src/render/` directory.
- Move `src/background.js` → `src/render/background.js` verbatim.
- Update `src/render.js` import (`'./background.js'` → `'./render/background.js'`).
- Delete `src/background.js`.
- Verify.

### Phase 2 — Orchestration + HUD
- Create `src/render/hud.js` with `drawHud` (moved from `render.js`).
- Create `src/render/index.js` with `draw` (moved from `render.js`);
  imports `drawHud` from `./hud.js`, everything else from the existing
  top-level modules.
- Update `src/main.js` to import `draw` from `'./render/index.js'`.
- Delete `src/render.js`.
- Verify.

### Phase 3 — Level + player drawing
- Create `src/render/level.js` with `drawLevel` (moved from `level.js`).
  Keep its internal `save/translate/restore` exactly as-is (it
  self-applies the camera transform; normalising that is phase 6).
- Create `src/render/player.js` with `drawPlayer` (moved from
  `player.js`). It needs the growth scale, so import
  `{ P_W, P_H, BIG_H }` from `'../player.js'`.
- Remove both functions from the logic modules; update
  `src/render/index.js` imports to the new paths.
- Verify.

### Phase 4 — Enemies, loot, arrows, particles drawing
- Create `src/render/enemies.js` (`drawEnemies`),
  `src/render/loot.js` (`drawLoot`), `src/render/arrows.js`
  (`drawArrows`), `src/render/particles.js` (`drawParticles`).
- `render/particles.js` imports the `particles` array from
  `'../particles.js'` (state stays in the sim module).
- Remove the four draw functions from their logic modules; update
  `src/render/index.js` imports.
- Verify.

**Milestone after phase 4:** no logic module contains a single canvas
call. `src/render/` is the only place that touches a context.

### Phase 5 — Polish: shared theme + FX presets (optional)
- Create `src/render/theme.js`: palette entries for colors used by 2+
  render files (`#ffd75e`, `#cbb8ff`, `#ff6f91`, `#6fe3e1`, `#d9b380`,
  HUD text colors, background clear, fonts). Sweep render files to use it.
- Create `src/effects.js` (leaf module, no imports): named presets for
  the `burst(...)` option objects, e.g. `FX.boxBreak`, `FX.stomp`,
  `FX.hurt`, `FX.landing`, `FX.gem`, `FX.bow`, `FX.grow`, `FX.heart`,
  `FX.win`. Replace the inline literals in `game.js`, `player.js`,
  `enemies.js`, `loot.js`, `arrows.js`. Logic files then contain no
  palette data either.
- Verify.

### Phase 6 — Optional cleanup: normalise the level transform
`drawLevel` self-applies `translate(-camera.x, 0)` (unrounded) while the
world pass in `render/index.js` uses `translate(-Math.round(camera.x))`.
Move `drawLevel` inside the world pass and drop its internal
save/translate for consistency. This is a 1px-at-most visual change —
do it last, in its own commit, and eyeball the game.

## Risks / notes

- **Tests are blind to drawing.** The smoke test is the only
  draw-path check; if a phase ever feels shaky, temporarily log from
  the stub in `smoke.mjs` (e.g. record `fillRect` call counts) rather
  than adding permanent render tests.
- **Name collisions** (`render/player.js` vs `player.js`) are harmless —
  all imports are explicit relative paths.
- **Phase 2 is the only phase that changes `main.js`** (one import line).
- Each phase is a clean commit; phases 1–4 can be reverted
  independently.
