# Level 2 design — "The Bridge & The Castle"

Status: CONFIRMED (decisions at bottom). See LEVEL2-PLAN.md for the phased build.

## Layout (left → right, ~3600 px wide, view 800×600)

```
x:    0       400    800      1200        1600        2000        2400        2800          3200          3600
      ┌─────────────┐  ┌────────────────────────────────────────────────────────────────────────────────────────┐
      │  BRIDGE     │  │ GATE   room 1            pit            room 2           BOSS HALL      pearl    ╲ steps
      │ planks, 2   │  │        platforms        1900–1980      platforms        mage ~3250    ~3350    ╲ down
      │ moat gaps   │  │        zombie  ghost    (chasm)        zombies ghosts   fireballs              exit
      │ 380–460     │  │        ~1100  ~1250                     ~1700 ~1650/2450                                │
      │ 640–720     │  │                                             ghost ~2300                                  │
      └─────────────┘  └────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Bridge (0–900)**: outdoor, existing night-sky background. Plank deck on the
  ground line with two gaps over a moat (dark water drawn below the deck).
  Falling in the moat = lose 1 hp + respawn at last safe spot.
- **Gate (≈880–940)**: stone arch over the deck — the visual/audible transition
  into the castle.
- **Castle interior (900–2700)**: stone-wall background (arched windows showing
  the night sky, flickering torches).
  - Room 1 (900–1500): high platforms (y≈360, 280); zombie patrols 1100–1400;
    ghost hovers near (1250, 240); one box (gem).
  - Chasm (1900–1980): floor gap, deep; a platform above (y≈380) as an option
    to hop across; falling = 1 hp + respawn.
  - Room 2 (2000–2700): staggered platforms; zombies 2100–2300 and 2500–2650;
    ghosts near (2200, 220) and (2550, 260); one box (heart).
- **Boss hall (2700–3600)**: open hall, walls at both ends (camera clamps).
  Mage at x≈3250. Pearl pedestal at x≈3350. Staircase down at 3450–3560:
  four 20 px steps, floor ends 80 px below the ground line (y=540 — still
  on screen, so the camera stays horizontal-only). Bottom step = exit zone
  = level clear.

## New level model: ground segments

Today the level has one `groundY` plus floating platforms. Bridge gaps, the
chasm, and the stairs-down all need **variable ground**, so:

- `level.ground = [{ x0, x1, y }, ...]` — ground segments (level 1 becomes a
  single segment; its behaviour and snapshots must not change).
- A segment is just a very thick platform → `resolveGroundCollision` works as
  is for player, enemies, arrows, loot.
- **Falling below the view** (moat/chasm) = 1 damage + respawn at the last
  safe ground position (recorded while `onGround`, not over a gap).

## Enemies

### Zombie (new kind, ground)
- 34×40, shambles at 40 px/s within patrol bounds (slime-style).
- **Smarter than slime**: if the player is within 220 px and roughly level
  (|dy| < 60), it turns and walks toward the player at 70 px/s, ignoring its
  bounds until the player leaves range.
- **Stompable** (shared stomp kill) or one arrow hit.
- Sprite: green body, darker patch, outstretched arms, red eyes, leg
  shuffle while walking.

### Ghost (new kind, flying)
- 28×26, ignores the ground entirely (no ground resolve).
- Hovers at its home point with a sine bob (±14 px, ~2 s period).
- If the player is within 260 px it drifts toward them at up to 60 px/s,
  otherwise eases back to its home point.
- **Arrows only**: stomping bounces the player off (no kill, no damage).
  Contact deals the shared side-hit damage.
- Sprite: pale blue-white, ~75% opacity, wavy skirt, dark eyes, slow drift
  wobble.

Kind-level flags in the KINDS table: `stompable` (slime/zombie: true;
ghost: false), `grounded` (ghost: false). `hitPlayer` checks `stompable`
before the stomp branch.

### Mage (boss, new kind) — "the smart mage"
- 42×54, **levitating** boss at the hall end. Stays within a fixed arena
  (x 2760–3380, so it never leaves the hall floor) and a vertical band
  (y 160–506 at the default 600 view) — it floats, it never falls.
- **HP 5**: each arrow hit = hp−1, white flash 0.15 s + 0.25 s stagger
  (frozen mid-air while staggered — no dodging or attacking). HP bar: 5 pips
  above the mage, drawn in world space while alive.
- **Levitation**: eased vertical motion toward a `floatY` target (150 px/s,
  ghost pattern). A soft floor shadow fades/shrinks with height and
  foot-spark particles trail while floating.
- **Arrow dodge** (the "avoid being hit" behaviour): when an approaching
  arrow's band would cross the mage's body, it floats out of the way (64 px
  up, or down if cramped) and holds the altitude until the arrow stream has
  cleared the grounded band, so a 0.22 s-cooldown stream can't catch the
  descending mage. 0.6 s dodge cooldown; no dodging while staggered.
- **Attack cycle**: idle 1.2–1.9 s → windup 0.7 s (staff gem glows, tells
  the player) → fires one fireball **from the staff orb at the player's
  predicted position, at any angle** (leads a moving player by the flight
  time) → back to idle. One fireball in flight at a time.
- **Proactive hover**: after a shot the mage may hover at a random band
  height for 0.8–1.4 s (35 % at full hp, 70 % at ≤2 hp) so the player can't
  camp on the ground, then settles back down.
- **Fireballs**: 14×14, straight-line (no gravity), 240 px/s, fizzle in a
  small flame burst on surface contact or after 3 s. Hit player: shared hurt
  (1 damage + knockback). **Not shootable** — arrows pass through; the
  mirror shield reflects one (reflected shots damage the mage); dodging is
  the counter-play.
- **On death**: big burst + shake → the magic pearl appears on its pedestal.
- Sprite: purple robe, wide hat, staff with a glowing gem; windup brightens
  the gem; levitation adds the floor shadow + foot sparks.
- **Tuning** (on the kind entry in `src/enemies/mage.js`): idleMin 1.2 /
  idleMax 1.9, windupT 0.7, staggerT 0.25, aggroRange 500, floatSpeed 150,
  dodgeLook 280, dodgeCooldown 0.6, dodgeHeight 64, threatMargin 8,
  hoverChance 0.35, hoverLowHpChance 0.7, hoverMin 0.8, hoverMax 1.4.
  Difficulty target: hard but beatable — the mage dodges ~80 % of arrows;
  a skilled player wins by timing shots into the dodge cooldown, matching
  hover heights, and reflecting fireballs.

## Ending sequence

1. Mage dies → pearl appears on the pedestal (glowing, bobbing, sparkles).
2. Player picks up the pearl → burst + chime; the **seal on the staircase is
   broken** (before pickup a glowing barrier blocks the first step; after, it
   fades out).
3. Player walks the four steps down.
4. Bottom step = exit zone (same trigger style as level 1's goal flag) →
   level clear overlay.

## Player state across levels

- Level 2 **starts with the bow already owned** (level 1 taught shooting; the
  mage requires arrows). Level data carries `startItems: ['bow']`.
- HP resets to 3 at each level start.

## New systems (input to the phased plan)

1. Ground segments + fall damage + respawn
2. Zone backgrounds: outdoor / castle interior / boss hall; moat water; gate
3. Enemy projectiles (`projectiles` list: update, draw, hit player/arrows/
   ground, fizzle)
4. Boss: hp, flash/stagger, hp bar, attack state machine
5. Zombies + ghosts (KINDS entries, sprites, `stompable` flag in hitPlayer)
6. Pearl item + staircase seal/exit zone
7. Level progression: `levels` array, win → next level (level 1 unchanged),
   HUD shows level number
8. New FX presets + audio blips (fireball, boss hit, pearl, seal break)

## Decisions (confirmed)

1. **Zombies stompable** (shared stomp kill), ghosts not (arrows only).
2. **Fireballs not shootable** — arrows pass through them.
3. Mage HP: **5**.
4. Level 2 win: standard **level complete screen** (no special finale).
5. **Lots of loot boxes** in level 2.
