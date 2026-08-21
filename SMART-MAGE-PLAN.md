# Smart mage — phased plan

Status: all phases P1–P5 complete. Render snapshot md5
`d91847dfa46c2b1fdc83d063be5f19ef` stable across every phase — the pinned
poses are all grounded, and the new visuals (floor shadow, foot sparks)
only draw while levitating, so no pinned scene changed.

Goal: make the level-2 boss (the mage, `src/enemies/mage.js`) genuinely
harder to kill. Two behaviors, per the request:

1. **Levitation to dodge arrows** — the mage floats vertically to get
   out of the way of incoming player arrows.
2. **Angled fireballs while levitating** — while floating, the mage
   aims at the player's actual position, so shots travel at any angle,
   not just horizontally at the player's height.

Plus a light proactive-hover phase so the player can't camp on the
ground, and a final juice/balance pass.

One phase = one turn = one commit. After every phase: `npm test` +
`npm run smoke` green. The render-snapshot md5 must stay stable unless
the phase says otherwise (see "Snapshot rule" below).

## Current behavior (baseline facts)

- Mage: 5 hp, unstompable, fixed at `x: 3250` on the boss-hall floor
  (hall floor spans x 2700–3450; `groundY = viewH - 40` = 560 at the
  default 600). State machine `idle → windup (0.7s) → fire → idle
  (1.6–2.4s)`, stagger 0.25s on hit, aggro 500px, at most one
  fireball in the air.
- Fire: `fireFireball(orbX, pCenterY - 7, dir * 240, 0, fx)` — always
  horizontal, aimed at player height only.
- Fireballs (`src/projectiles.js`): **already accept a `vy`**, no
  gravity, speed 240, TTL 3s, fizzle on surface contact (coarse
  "band crosses the surface top line" test), reflectable by the mirror
  shield, reflected shots damage the mage via box overlap.
- Player arrows (`src/arrows.js`): horizontal only, 4px-tall band at
  `p.y + p.h - 24`, speed 520, fire cooldown 0.22s, vanish at the
  viewport edge.
- Levitation precedent: the ghost (`src/enemies/ghost.js`) eases its
  position toward a target point each frame — the mage reuses this
  pattern (no gravity; it *floats*, it never falls).
- Camera follows horizontally only; the whole hall is vertically on
  screen, so levitation is fully visible.
- The render snapshot `l2 boss hall (mage mid-windup, ...)` pins the
  mage's draw calls in a **grounded** pose (test/render.test.js).
- The mage is exempt from the sunbeam (`game.js`), the pearl/exit key
  off `e.dead`, and `updateEnemies` already passes `lvl` in the brain
  env — all unchanged by this plan.

## House rules (decided defaults — flag objections before P1)

- **No gravity for the mage.** Levitation is eased vertical motion
  toward a target Y (ghost pattern). It never falls; the existing
  "fell into a pit" check stays as dead-code safety.
- **5 hp, stagger, flash, unstompable, one-fireball-at-a-time, 500px
  aggro all stay.** Only the *position* and the *aim* get smarter.
  Pearl/exit/sunbeam/reflection wiring is untouched.
- **Arena is clamped.** Horizontal: roster gains `minX: 2760,
  maxX: 3380` (stays on the hall floor, clear of the exit steps at
  x ≥ 3450 and the approach from x ≤ 2700). Vertical: band
  `[max(150, groundY - 400), groundY - h]` → [160, 506] at viewH 600.
  The camera never follows vertically, so the top of the band keeps
  the mage on screen.
- **Fire from the staff orb, at the player's center, normalized to
  `FIREBALL_SPEED`.** `fireFireball` already supports `vy`; P1 only
  changes the call site in `mage.js`.
- **New mage→arrows import is a safe cycle** (`arrows.js` imports
  `enemies.js` at module init; `enemies.js` imports `mage.js`;
  `mage.js` would import `arrows.js`). Same shape as the documented,
  working mage↔projectiles cycle: every cross-reference is used inside
  function bodies at runtime, never at module init.
- **The coarse `hitsSurface` band test is safe in the hall**: the boss
  hall has no platforms, and a shot aimed at the player's center
  crosses the floor line only *after* it has overlapped the player's
  body (player band sits above the floor line). Do not move the mage
  into a platformed area.
- **Snapshot rule:** P1–P3 change no draw calls in the pinned grounded
  pose (P2's floor shadow draws *only while floating*), so the render
  snapshot md5 stays stable. Any phase that changes the sprite itself
  must run `npx vitest -u` and review the `.snap` diff (see
  RENDER-TEST-PLAN.md).
- **Audio:** reuse the existing `'hop'` blip for the levitation whoosh.
  No new audio entries.

## Tuning (initial values, on the kind entry, read via `this`)

```
floatSpeed: 150        // eased levitation speed (px/s)
dodgeLook: 280         // px: scan for approaching arrows this close
dodgeCooldown: 0.7     // s between dodge decisions
dodgeHeight: 64        // px cleared by a dodge hop
threatMargin: 8        // px padding around the mage body for threat tests
hoverChance: 0.35      // proactive hover after each shot
hoverLowHpChance: 0.7  // …when hp <= 2
hoverTime: 0.8–1.4     // s
```

## Phases

### P1 — Angled fireballs

Purpose: shots fly from the staff orb toward the player's center at
any angle. This is the foundation the levitation aims off.

Changes:
- `src/enemies/mage.js`: at windup end, compute the vector from the
  orb (local (15.5, -19.5), scaled by `e.dir`) to the player's center;
  normalize; `fireFireball(orbX, orbY, dirx * FIREBALL_SPEED,
  diry * FIREBALL_SPEED, fx)`.
- `src/projectiles.js`: no changes (already vy-capable).
- `test/mage.test.js`: replace the "aimed at player height" assertion
  (it pins the old behavior: `fireballs[0].y + 7 ≈ pCenter`) with
  angle tests: player level with the mage → `vy ≈ 0`; player elevated
  (set `p.y` high) → `vy < 0`; player on the ground with the mage
  high → `vy > 0`; speed magnitude `≈ 240` in all cases.
- `test/fireballs.test.js`: add one test — an angled fireball keeps a
  constant `vy` (no gravity) over N frames.

Verification: `npm test`, `npm run smoke`. Snapshot md5 **stable**.

### P2 — Levitation foundation (vertical motion + clamps)

Purpose: the mage gains a float position system it can be commanded
from, without dodging yet.

Changes:
- `src/enemies/mage.js`:
  - `e.homeY` (grounded y), `e.floatY` (target y, starts `homeY`),
    eased vertical motion toward `floatY` at `this.floatSpeed`
    (ghost-style `min(speed*dt, dist)` easing); `e.y` clamped to the
    band.
  - `e.x` clamped to `minX..maxX` (spawnEnemy already reads these from
    the spec).
  - `e.levitating = e.y < e.homeY - 1` (visual flag).
  - draw(): while levitating, a small soft shadow ellipse/rect on the
    floor under the mage (alpha ∝ height above ground). Drawn only
    while floating → pinned grounded snapshot unaffected.
- `src/level2.js`: roster entry → `{ kind: 'mage', x: 3250, minX: 2760,
  maxX: 3380 }`.
- `test/mage.test.js`:
  - setting `floatY` moves the mage there over frames and it stays
    within the band (set `floatY` above the band top → clamps);
  - `x` stays within `minX..maxX`;
  - shadow flag: `levitating` false on the ground, true after
    floating up.
  - existing stomp/damage/attack-cycle tests still pass unchanged.

Verification: `npm test`, `npm run smoke`. Snapshot md5 **stable**.

### P3 — Arrow dodge (the "avoid being hit" brain)

Purpose: the mage notices an incoming arrow aimed at its body and
floats out of its way.

Changes:
- `src/enemies/mage.js`:
  - Import `arrows` from `../arrows.js` (safe cycle, house rule).
  - Threat test (per frame, skipped while staggering): an arrow is a
    threat if it moves toward the mage, its leading edge is within
    `dodgeLook`, and its 4px band (± `threatMargin`) intersects the
    mage's body band `[e.y, e.y + e.h]`.
  - On threat (and `dodgeCooldown` elapsed): pick the escape side —
    up if `dodgeHeight` clearance to the band top, else down if
    clearance to the band bottom, else the side with more room; nudge
    the choice with `e.lastDodge` alternation for unpredictability.
    Set `floatY = e.y ∓ dodgeHeight` (clamped). Start `dodgeCooldown`;
    play `'hop'` once per dodge.
  - The target **persists** until the threatening arrow fully clears
    the mage (trailing edge past the far side — releasing earlier lets
    the descending mage re-enter the arrow's band mid x-overlap), and
    **holds altitude while another approaching arrow still crosses the
    grounded band** (`homeThreat`), so a 0.22s-cooldown stream can't
    catch the descending mage; descends once the home band is clear.
  - No dodge while `state === 'stagger'` (already frozen). Firing
  proceeds from whatever height the mage is at — combined with P1,
  that is the "shoot at any angle while levitating" behavior.
- `test/mage.test.js`:
  - scripted arrow approaching at body height → mage's `y` changes,
    the arrow passes, `e.hp` unchanged;
  - no dodge when the arrow moves away or is beyond `dodgeLook`;
  - no dodge during stagger;
  - at the band top, a threat from above dodges down (clamp case);
  - `dodgeCooldown` elapsed → a second threat re-dodges; a threat
    inside the cooldown does not (no jitter);
  - an arrow stream at the player's 0.22s cadence lands no hits (hold),
    and the mage settles back to the ground once the stream stops.

Verification: `npm test`, `npm run smoke`. Snapshot md5 **stable**.

### P4 — Proactive hover + aim lead

Purpose: stop the player from camping on the ground, and make shots
harder to sidestep.

Changes:
- `src/enemies/mage.js`:
  - After each successful fire, with `hoverChance` (`hoverLowHpChance`
    when `e.hp <= 2`), set `floatY` to a random height in the band and
    hold it for `hoverMin..hoverMax` seconds (`e.hover` timer), then
    ease back to `homeY`. (Reuses the P2 float system; no new states —
    the idle/windup machine keeps running while the mage hovers.)
    The release is **transition-based** (only on the hover→0 expiry
    frame), so a `floatY` set for other reasons is never clobbered;
    a dodge cancels the hover (`e.hover = 0`) and owns the target, and
    the roll is skipped while dodging.
  - **Aim lead (the stretch item, cut first if the phase overruns):**
    at fire time, aim at the player's *predicted* position —
    `pCenter + p.vx * (dist / FIREBALL_SPEED)` in x (flight time to
    the player's current position) — clamped to level bounds.
- `test/mage.test.js` (new `hover and aim lead` describe; `reseed()`
  from `test/helpers/seeded-rng.js` for determinism — note the import
  installs the seeded PRNG for the whole file, so all earlier tests
  re-ran green under it):
  - over a simulated 40s duel (no arrows), the mage hovers at least
    once and reaches a real hover height;
  - over a 45s duel, low-hp (hp 1) hover starts > full-hp hover starts
    (seeded: 13 vs 4);
  - with the player moving at constant `vx`, the fired fireball's
    direction points exactly at the predicted point (formula
    reproduced in the test), ahead of the fleeing player;
  - the lead clamps to the level bounds (player at the left edge,
    running off it).

Verification: `npm test`, `npm run smoke`. Snapshot md5 **stable**
(no draw changes).

### P5 — Juice, balance, docs

Purpose: make the new behavior readable and tune the difficulty.

Changes:
- `src/effects.js`: one small FX preset — foot sparks while
  levitating (emitted at the mage's feet, a few particles, short
  life). Only while `levitating`.
- `src/enemies/mage.js`: emit the preset while floating; ensure the
  `'hop'` whoosh fires at the start of both dodges and hovers.
- Balance pass (play with `npm run smoke` / the debug scripts):
  dodgeLook / dodgeCooldown / hoverChance / hoverTime / floatSpeed
  until the fight is hard but beatable for a player with 3 hp, 1.5s
  invuln, arrows, and the mirror-shield reflect. 5 hp stays.
- `LEVEL2-DESIGN.md`: document the boss behavior (dodge, hover,
  angled + leading fireballs, arena bounds).
- If the sprite changed at all: `npx vitest -u`, review the `.snap`
  diff, record the new snapshot md5 here.

As-built notes:
- Foot sparks: `FX.mageSpark` (5 particles, teal/purple/white, 0.35 s),
  emitted at the mage's feet every 0.12 s while `levitating` (throttled via
  `e.sparkT`). The `'hop'` whoosh now plays on both dodge and hover start.
- Final tuning: idleMin 1.2 / idleMax 1.9 (faster fire cycle than the old
  1.6–2.4, for pressure), dodgeCooldown 0.6 (slightly shorter than 0.7,
  harder to punish). floatSpeed 150, dodgeLook 280, dodgeHeight 64,
  hoverChance 0.35 / 0.7, hoverMin 0.8 / hoverMax 1.4 unchanged.
  Fireball speed left at 240 (a shared constant, not in the P5 tuning list;
  a speed sweep showed the perfect bot wins regardless, so the difficulty
  lives in the skill gap, not that constant).
- Balance result (a near-perfect reference bot: keeps a firing lane, matches
  the mage's height with jumps, fires when aligned, banks 3 shield charges
  + 3 hops): kills the mage in ~5.5 s at 3/3 hp, landing only ~5 of ~25
  arrows — the mage dodges ~80 %. Beatability confirmed; the difficulty is
  the human skill gap (tracking random hover heights + timing shots into the
  0.6 s dodge cooldown + reflecting/dodging the leading fireballs).

Verification: `npm test`, `npm run smoke`, manual play of the hall.
Final snapshot md5 recorded in this file's Status line.

## Out of scope (not now)

- New attack types (multi-shot, homing fireballs, AoE).
- A second boss phase at low hp beyond the hover/aggression bump.
- Moving the arena; vertical camera follow.
- Making fireballs shootable down (they stay reflect-only).
