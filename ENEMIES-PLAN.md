# Enemies refactor — phased plan

Status: all phases P1–P6 complete. Snapshot md5
`d91847dfa46c2b1fdc83d063be5f19ef` stable from before the refactor
through the end (verified across two final runs).

Goal: split the four enemy kinds out of the `KINDS` object in
`src/enemies.js` and the `DRAW` map in `src/render/enemies.js` into one
file per kind, in a new `src/enemies/` subfolder — the same shape as the
loot-items refactor (`LOOT-ITEMS-PLAN.md`, complete).

One phase = one commit. After every phase: `npm test` + `npm run smoke`
green, and the render snapshot md5 unchanged (baseline
`d91847dfa46c2b1fdc83d063be5f19ef` — canvas ops move verbatim, they are
not rewritten).

## End state

```
src/enemies.js            orchestrator only: spawnEnemy, damageEnemy,
                          createEnemies, updateEnemies (brain dispatch),
                          hitPlayer (stomp vs side), pit death, E_STOMP_V,
                          re-exports (E_W, E_H, HURT_INVULN)
src/enemies/index.js      REGISTRY Map + register() + getKind(kind)
src/enemies/slime.js      one file per kind: the whole KINDS entry
src/enemies/zombie.js     (w, h, tuning, stompable, update brain,
src/enemies/ghost.js      plus hitSound/deathSound/deathFx/onHit where
src/enemies/mage.js      applicable) and its draw() sprite
src/render/enemies.js     thin loop: skip dead, def?.draw(c, e)
```

Each kind file owns both halves of its kind — brain and sprite — exactly
as loot-items files own effect and sprite. `src/enemies.js` keeps the
shared parts every kind gets for free: spawn sizing, one-point damage
with per-kind reaction, stomp vs side-contact, pit death.

## House rules (decided defaults — flag objections before P1)

- **`src/enemies.js` public API is unchanged.** `E_W`, `E_H`,
  `E_STOMP_V`, `HURT_INVULN`, `spawnEnemy`, `damageEnemy`,
  `createEnemies`, `updateEnemies` keep exporting — no test or game-side
  import changes.
- **Kind files never import from `src/enemies.js`.** Not just to avoid
  cycles: `E_W`/`E_H` are referenced in the kind entry object literals,
  which evaluate at module init — importing them back from the
  mid-evaluation orchestrator would throw a TDZ error. Instead `E_W`/
  `E_H` move to `slime.js` (its only user) and `enemies.js` re-exports
  them (the `MYSTERY_BOOTS` precedent).
- **Brains keep the `this` convention.** Dispatch calls `def.update(e,
  env)`, so `this` is the kind entry and brains read their tuning off
  `this` exactly as they do today. The `env` object
  (`{ p, lvl, cam, dt, fx }`) keeps its shape.
- **Draw functions keep owning their own `save()`/`translate()`/
  `restore()`** (as they do today — the mage even draws hp pips outside
  its save). The render loop adds no frame of its own.
- **The mage↔projectiles cycle is safe and documented.** `mage.js`
  imports `fireFireball`/`fireballs`/`FIREBALL_SPEED` from
  `projectiles.js`, which imports `damageEnemy` from `enemies.js`. All
  cross-module references sit in function bodies executed at runtime,
  never at module init, so the extended cycle evaluates cleanly.
- **FX presets stay in `effects.js`, sfx in `audio.js`** — the kind
  files reference `FX.enemyDeath`/`FX.mageDeath` and sound-name strings,
  same as today.
- **Hybrid dispatch during migration**: a registry head at each dispatch
  point (`getKind(e.kind) ?? KINDS[e.kind]`), with the migrated kind's
  `KINDS` entry and `DRAW` function deleted the same phase. All five
  dispatch points collapse at P5 when `KINDS` and `DRAW` are gone.
- **Adding a kind afterwards** = one new file in `src/enemies/` with a
  `register(...)` call + one import line in `src/enemies.js` + roster
  entries in level data. No shared-file edits.

## P1 — Skeleton
- Create `src/enemies/`: `index.js` (REGISTRY Map, `register(def)`,
  `getKind(kind)` — small enough to be real, not a stub) + 4 comment-only
  stubs (slime, zombie, ghost, mage). Nothing imports them yet.
- Gate: green, snapshot unchanged.

## P2 — Slime (reference) + all five dispatch points
- `slime.js` complete: the `KINDS.slime` entry moved verbatim (patrol
  brain, `stompable: true`), `drawSlime` moved verbatim, and `E_W`/`E_H`
  defined here. `enemies.js` re-exports `E_W`/`E_H` from it.
- Wire the registry head at all five dispatch points:
  `updateEnemies`, `spawnEnemy`, `damageEnemy`, `hitPlayer`
  (`stompable`), and the `render/enemies.js` loop
  (`if (def?.draw) def.draw(c, e); else DRAW[e.kind](c, e)`).
- Delete the `KINDS.slime` entry and `drawSlime`.
- Establishes the pattern for P3–P4. Gate: green, snapshot unchanged.

## P3 — Zombie + ghost
- `zombie.js`: chase/aggro brain moved verbatim (`aggroRange`,
  `aggroDy`, `chaseSpeed`, bounds while not chasing), `drawZombie`
  (leg shuffle from position).
- `ghost.js`: hover/bob/drift brain moved verbatim (home point,
  `bobAmp`/`bobPeriod`, lantern-flee with flicker), `drawGhost`
  (alpha flicker, skirt wobble). `stompable: false` on both entries.
- Delete both `KINDS` entries and both `DRAW` functions.
- Gate: green, snapshot unchanged.

## P4 — Mage (boss)
- `mage.js`: state machine moved verbatim (idle → windup → fire,
  stagger on hit, `fireballs.length === 0` gate), plus `hp: 5`,
  `stompable: false`, `onHit`, `nextIdle`, `hitSound: 'bossHit'`,
  `deathSound: 'boss'`, `deathFx: FX.mageDeath`. Imports
  `fireFireball`/`fireballs`/`FIREBALL_SPEED` from `projectiles.js`
  (cycle-safety house rule applies) and `FX` from `effects.js`.
  `drawMage` moved verbatim, including the hp pips drawn outside the
  save and the windup orb glow / hit flash.
- Delete `KINDS.mage` and `DRAW.mage`.
- Gate: green, snapshot unchanged.

## P5 — Collapse
- `KINDS` and `DRAW` are now empty: delete both objects and the legacy
  half of every dispatch point (`updateEnemies` becomes
  `getKind(e.kind).update(e, env)`, `spawnEnemy`/`damageEnemy`/
  `hitPlayer` become plain `getKind(...)` lookups, render loop becomes
  `if (def?.draw) def.draw(c, e)`).
- Drop imports from `enemies.js` that only the brains used
  (`P_GRAVITY`, `P_TERM_VY`, `resolveGroundCollision`,
  `fireFireball`, `fireballs`, `FIREBALL_SPEED`). Keep what the
  orchestrator itself still uses (`burst`, `FX`, `shake`, `hurtPlayer`).
  Drop the `DRAW`-only imports in `render/enemies.js` if any remain.
- Update the "adding a kind" header comments in both files to point at
  `src/enemies/`.
- Gate: green, snapshot unchanged.

## P6 — Verification + docs
- New `test/enemies-registry.test.js`:
  - every registry def has `kind` (matching its key), `w`, `h`, boolean
    `stompable`, `update`, `draw`;
  - registered kinds are exactly {slime, zombie, ghost, mage} (catches a
    stub that never calls `register`);
  - every `roster` kind in `level.js` and `level2.js` is registered
    (the spawn path would throw otherwise);
  - `spawnEnemy` produces a live enemy of the right size for each roster
    kind (spawn wiring stays intact after the collapse).
- README Layout section: `src/enemies/` file map (kind → file, brain +
  sprite + tuning per file; shared stomp/damage/pit in `enemies.js`;
  note the mage↔projectiles runtime cycle).
- Final gate: `npm test`, `npm run smoke`, snapshot md5 identical across
  two runs and to the pre-refactor baseline. Mark this plan complete.

## Out of scope
- No behavior changes: AI tuning, sizes, stomp rules, hp, sounds, FX,
  and sprites all move verbatim. Balance or AI changes belong to a
  separate plan.
- Level rosters and the sunbeam mage-exempt in `game.js` are untouched —
  they read `e.kind` strings, not the registry.
