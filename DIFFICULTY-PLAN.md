# Difficulty levels — Phased Build Plan

**Status: IN PROGRESS (D1–D8).** One phase = one commit, one turn.

House gate after every phase: `npm test` green, `npm run smoke` green, and the
render snapshots unchanged unless the phase says otherwise.

## Decisions

- **Hard is today's game, exactly.** It is the default, so every existing test
  keeps pinning it. Medium and Easy loosen from it.
- **Easy revives in place.** Hearts running out does not restart the level: a
  short beat, then the player is back at the last safe spot (the pit rule's
  `respawnX`, pulled back from the edge) with full hearts, ~3 s of
  invulnerability, and everything they carried — bow, flight, heart cap, big,
  boots/magnet/lantern/shield/stars/hops as they were. The level's progress
  (keys, cogs, springs, hearths, boss damage) stands.
- **Medium restarts the level** on death, as Hard does. No boss-door checkpoint.
- **Score is untouched.** Easy counts deaths; the end card shows the count.
- **Chosen per run.** Picked at the start; changeable only from the end card.

## Presets

| Field | Easy | Medium | Hard | Meaning |
|---|---|---|---|---|
| `hearts` | 5 | 4 | 3 | starting max hp (the heart cap still adds 1) |
| `invuln` | 2.0 | 1.75 | 1.5 | s of invulnerability after a hit |
| `pitDamage` | 0 | 1 | 1 | hearts a pit/lava fall costs |
| `revive` | true | false | false | out of hearts → revive in place |
| `bossHp` | 0.6 | 0.8 | 1.0 | boss hp multiplier (rounded, min 1) |
| `bossCd` | 1.4 | 1.2 | 1.0 | boss attack cooldown multiplier |
| `bossTell` | 1.5 | 1.2 | 1.0 | boss telegraph/wind-up multiplier |
| `projSpeed` | 0.8 | 0.9 | 1.0 | enemy projectile speed multiplier |
| `hazard` | 0.7 | 0.85 | 1.0 | level-hazard strength (wind, web slow, …) |

## Build ledger

- [x] **D1** — `src/difficulty.js`: presets, current setting, `?difficulty=`,
  remembered choice (storage guarded). Nothing reads it yet.
- [x] **D2** — player survival: `hearts`, `invuln`, `pitDamage`.
- [x] **D3** — Easy revive: one death path for hits and pits; revive beat,
  respawn, hazard clear (fireballs, boulders, shockwaves, cones, seal columns,
  ice spikes); death counter.
- [x] **D4** — boss phase thresholds as fractions of max hp (all seven bosses).
  No behaviour change at Hard.
- [ ] **D5** — boss scaling: `bossHp`, `bossCd`, `bossTell`, `projSpeed`
  (may take two turns).
- [ ] **D6** — hazards and regular enemies: `hazard` (wind gust, web slow,
  bookcase window, flight recharge); Hard-only roster tags.
- [ ] **D7** — picker on the title card; HUD label; change it from the end card.
  A change must start a fresh run (no `prev`): a carried `maxHp` is sized to
  the old preset's hearts.
- [ ] **D8** — playtest tuning pass.

Afterwards: boss-vs-boss balance, as a per-boss adjustment table in
`difficulty.js` tuned at Hard.
