# Loot items refactor — phased plan

Status: all phases P1–P7 complete. See git log (commits `loot-items P1`–`P7`).
Snapshot md5 `d91847dfa46c2b1fdc83d063be5f19ef` stable from before the
refactor through P7.

Goal: split the per-kind loot logic out of `src/loot.js` and
`src/render/loot.js` into one file per item, in a new `src/loot-items/`
subfolder, following the `KINDS` registry precedent from `enemies.js`.

One phase = one commit. After every phase: `npm test` + `npm run smoke`
green, and the render snapshot md5 unchanged (no phase adds or changes a
snapshot scenario — canvas ops move verbatim, they are not rewritten).

## End state

```
src/loot.js                 orchestrator only: loot list, score, bowGiven,
                            resetLoot, drop table (derived), spawnLoot,
                            spawnMystery, updateLoot (registry dispatch)
src/loot-items/index.js     REGISTRY Map + register() + getItem(kind)
src/loot-items/gem.js       one file per kind, same shape:
src/loot-items/boots.js     { kind, weight?, onPickup, update?, draw }
src/loot-items/heart.js     ... (12 files total)
src/render/loot.js          thin loop: bob, save/translate, def.draw, restore
```

Each item file owns three concerns of its kind:
- `onPickup(it, p, lvl, fx, hooks)` — the pickup effect. **Returns the score
  delta (a number, 0 if none)** — `score` stays module state in `loot.js`
  (imported bindings are read-only, so item files can never write it).
- `update(it, p, lvl, dt)` — optional physics override; returning `true`
  suppresses the default gravity/ground pass in `updateLoot`. Only `gem`
  uses it (magnet steering).
- `draw(c, it)` — the sprite, translated to item center (as today).

House rules (decided defaults — flag objections before P1):
- **`src/loot.js` public API is unchanged.** `loot`, `score`, `bowGiven`,
  `resetLoot`, `spawnLoot`, `updateLoot`, `MYSTERY_BOOTS` keep exporting —
  no test or game-side import changes.
- **Item files never import from `src/loot.js`** (avoids extending the
  existing loot ↔ player cycle). All inputs arrive via function parameters.
  They may import `player.js`, `effects.js`, and `../render/theme.js`
  (`palette` is shared data, an acceptable cross-layer dep).
- **Mystery is a box payload, not an item kind.** `spawnMystery` stays in
  `loot.js`; the mystery box sprite stays in `render/level.js`. No
  `mystery.js` file.
- **Drop-table order is preserved** (heart, boots, magnet, sunbeam, star,
  hops, gem-remainder) so seeded-RNG roll outcomes stay byte-identical.
  `rollDrop` derives cumulative weights from registry `weight` fields in
  registration order.
- During migration both chains run in hybrid mode: a registry head
  (`if (def?.onPickup) ... else if (it.kind === ...)`) with legacy branches
  deleted one kind at a time. Both chains collapse to pure dispatch at P6.

## P1 — Skeleton
- Create `src/loot-items/`: `index.js` (REGISTRY Map, `register(def)`,
  `getItem(kind)`) + 12 stub files (gem, bow, grow, heart, boots, magnet,
  sunbeam, star, shield, hops, heartcap, lantern), each a one-line comment,
  no implementation. Nothing imports them yet.
- Gate: green, snapshot unchanged.

## P2 — Reference item (gem) + registry dispatch
- `gem.js` complete: `weight: 0` (absorbs remainder), `onPickup`
  (returns 1, sfx `gem`, FX.gem burst), `update` (magnet steering moved
  verbatim from `updateLoot`; returns `true` only while steering), `draw`
  (moved verbatim).
- Wire the three dispatch points:
  - `loot.js` pickup: `const def = getItem(it.kind); if (def?.onPickup)
    { score += def.onPickup(it, p, lvl, fx, hooks) || 0; } else if (...)`.
  - `loot.js` physics: `if (!(def?.update?.(it, p, lvl, dt))) { default
    gravity/ground pass }`.
  - `render/loot.js`: `if (def?.draw) def.draw(c, it); else if (...)`;
    delete the legacy gem branch.
- Establishes the pattern for P3–P6. Gate: green, snapshot unchanged.

## P3 — Classics: heart, bow, grow
- Three files, each `onPickup` + `delete legacy branch in both chains`:
  - heart: heal to `maxHp`, sfx `heart`, FX.heart.
  - bow: `p.hasBow = true`, sfx `bow`, FX.bow.
  - grow: grow-from-feet reposition with `BIG_W`/`BIG_H` from player.js,
    sfx `grow`, FX.grow.

## P4 — Timed powers: boots, magnet, lantern
- boots: `p.boots = it.short ? MYSTERY_BOOTS : BOOTS_TIME` — **move the
  `MYSTERY_BOOTS` constant into boots.js** (re-export from loot.js to keep
  `mystery.test.js` imports valid); sfx `boots`.
- magnet: `p.magnet = MAGNET_TIME`, sfx `magnet`.
- lantern: `p.lantern = LANTERN_TIME`, sfx `lantern`.
- Delete all six legacy branches.

## P5 — Consumables: hops, star, shield
- hops: `p.hops = min(3, +3)`, sfx `hop`, FX.hopPuff.
- star: `p.stars = min(10, +5)`, sfx `star`, spinning-star sprite.
- shield: `p.shield = min(3, +3)`, sfx `reflect`, FX.reflect.
- Delete all six legacy branches.

## P6 — Specials + chain collapse + derived table
- sunbeam: sfx `sunbeam`, FX.sunbeam, calls `hooks.onSunbeam` if present
  (hook wiring stays in game.js).
- heartcap: `maxHp = 4` if not capped; `onPickup` returns 1 (gem payout)
  when already capped, sfx `heartcap`/`gem` accordingly; FX.heart burst.
- **Collapse**: every legacy branch is now gone — the pickup section of
  `updateLoot` and the body of `drawLoot` are pure registry dispatch.
- `rollDrop`: derive the cumulative table from registry `weight` fields in
  registration order (fixed order per house rule); gem stays the fallback.
- Gate: green, snapshot unchanged.

## P7 — Verification + docs
- New `test/loot-items.test.js`:
  - every registry def has `kind`, `draw`, `onPickup`;
  - weighted kinds are exactly heart/boots/magnet/sunbeam/star/hops, in
    table order, cumulative ≤ 1;
  - every `box.drop` kind used in `level.js`/`level2.js` is registered.
- Final gate: `npm test`, `npm run smoke`, snapshot md5 identical across
  two runs.
- README: loot-items file map (kind → file; where effect, sprite, weight
  live). Mark this plan complete.

## Out of scope
- No behavior changes: effects, weights, sfx, and sprites are all moved
  verbatim. Balance changes belong to a separate plan.
- `spawnLoot`/`spawnMystery` internals are untouched (they build item
  objects; that is the orchestrator's job).
