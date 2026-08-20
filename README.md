# unicorn queens

A tiny horizontal-scrolling platformer. Vanilla JS ES modules, no build
step. Serve over http — the modules won't load from `file://`.

## Run

    npm run serve     # http://localhost:9000/
    npm test          # unit tests (vitest)
    npm run smoke     # 300-frame headless wiring check

## Levels

1. **Meadow** — a flat night meadow. Slimes, loot boxes, and a goal
   flag. Teaches movement, jumping, box-breaking, and picking up the
   bow.
2. **The Bridge & The Castle** — you start with the bow. Cross the
   plank bridge over two moat gaps (falling costs a heart), pass the
   stone gate, and fight zombies and ghosts through the torch-lit
   interior — mind the chasm. In the boss hall the mage has 5 hp and
   fires fireballs you can't shoot down; dodge them. Beat him to make
   the magic pearl appear, take it to break the seal, and walk the
   four steps down to the exit.

Win a level and press R to play the next one.

## Loot

Boxes break with a bow arrow. The first box you break in a level drops the
bow — the meadow teaches it, and the castle starts with one, so its first
box is a spare. Random boxes roll the table below; special items (shield,
lantern, heart cap, mystery) only come from their designated boxes.

| item | effect | duration / uses | where it drops |
|---|---|---|---|
| gem | +1 score | — | table (59%), mystery fountain, castle bridge box |
| heart | +1 hp up to your max | — | table (20%), mystery (40%), castle room-2 box |
| grow | big form: bigger body, 1.35× jump; lasts the rest of the level and carries into the next | permanent | meadow, castle platform |
| bounce boots | 1.6× jump | 10 s | table (5%), mystery (25%, 5 s version), meadow + castle box |
| magnet | gems fly to you | 8 s | table (5%), meadow + castle box |
| sunbeam | instant burst that defeats every non-mage enemy | instant | table (3%), meadow platform, castle room-1 box |
| star arrows | +5 arrows that pierce up to 5 enemies each (reserve cap 10) | until fired | table (4%), meadow + 2 castle boxes |
| levitation | +3 mid-air jumps (cap 3) | until used | table (4%), meadow + castle box |
| mirror shield | reflects up to 3 fireballs; a reflected shot damages the mage. Doesn't block enemy contact | 3 uses | castle boss-hall box |
| lantern | ghosts within ~160 px flee the light (they still hurt on touch) | 8 s | two castle-interior boxes, among the ghosts |
| heart cap | +1 max hp (3 → 4); permanent for the run — survives death and level change | permanent | castle boss-hall box |
| mystery | hidden payload: heart (40%), three-gem fountain (25%), 5 s boots (25%), dud (10%) | — | one box per level (purple, swirled) |

Timed powers and use-counters never carry across levels — the heart cap is
the only exception. Score and the one-time bow reset each level.

## Controls

- Move: arrows or A/D
- Jump: Space / W / up arrow
- Shoot: X or J
- Sound: M
- Restart (after win/loss): R

## Layout

- `src/` — game logic (player, level, enemies, loot, arrows, particles,
  camera, game state). No canvas calls.
- `src/render/` — all drawing, split per entity, plus a shared `theme.js`
  (palette/fonts) and `background.js`.
- `test/` — unit tests for the logic, plus render snapshot tests.

## Render snapshot tests

`test/render.test.js` drives the real `update`/`draw` loop against a
recording canvas context (`test/helpers/recording-ctx.js`) and snapshots
the draw-call log. Floats are rounded to 3 dp and all randomness is
seeded, so snapshots are identical on every machine — no native canvas
dependency, no font-rendering variance.

They catch visual regressions (reordered draws, dropped entities,
changed coordinates, missing effects) that the logic tests can't see.

### Intentional visual change

    npx vitest -u     # regenerate snapshots

Then review the git diff of `test/__snapshots__/render.test.js.snap` —
the diff *is* the eyeball check for your change. Logs are indented
between `save()`/`restore()` pairs so the review stays local to the
block that changed.

### Adding a scenario

Each test is a *state*, not a playthrough: `freshGame()` resets to a
known state (and re-seeds the RNG so tests don't depend on order), then
either mutate game state directly or hold keys for N frames with
`step({ right: true }, 90)`. See the existing scenarios for the pattern.
