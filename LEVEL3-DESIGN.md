# Level 3 design — "The Undercroft"

Status: CONFIRMED (decisions at bottom).

## Concept

A dungeon beneath the castle: brown brick corridors lit by flickering wall
torches, with lava fissures as the kill-floor. The level's spine is a
**key chain**: find the hidden key → free the witch (who grants a permanent
flight spell) → use the key to open the door to the troll hall.

## Layout (left → right, 4400 px wide, view 800×600)

```
x:    0        700      1400    1650     2100      2850     3250   3550              4400
      ┌────────────┬───────────────────────┬──────────────────┬────────────────────────┐
      │ CORRIDOR 1 │ KEY ALCOVE + JAIL     │ CORRIDOR 2       │ TROLL HALL             │
      │ lava       │ hidden key ~1600,     │ deeper: more     │ door 3550 (key,        │
      │ 600–700    │ above lava 1550–1650  │ lava, ghosts,    │ consumed, closes)      │
      │ zombies    │ jail cell ~2100       │ boxes            │ troll ~3950            │
      │            │ (witch prisoner)      │                  │ pearl ~4210            │
      └────────────┴───────────────────────┴──────────────────┴ stairs down 4250–4400 ┘
```

All interior. Zones: `{0–3550: 'dungeon'}`, `{3550–4400: 'dungeon-hall'}`
(bigger pillars, denser torches, slightly darker brick).

### Ground segments & lava fissures

Fissures are ground gaps with lava visible in the gap (glowing, bubbling).
Falling in = 1 damage + respawn at last safe ground (level 2 rule, reused).

```
ground:  0–600 | 700–1550 | 1650–2850 | 2950–3250 | 3350–4400 (incl. hall floor)
lava:    600–700      1550–1650      2850–2950      3250–3350
```

### Corridor 1 (0–1400)

- Teaches the dungeon look: brick, torch sconces (~every 250 px), zombie patrols.
- Lava fissure 1 at 600–700, crossed by a jump or via platform {480, y−140, 110}.
- Zombies: (250, patrol 180–420), (900, patrol 800–1100). Ghost: (1300, 240).

### Key alcove & jail cell (1400–2600)

- **The nook is hidden in the wall** above lava fissure 2 (1550–1650):
  the dungeon wall is drawn across the fissure, so that stretch reads as
  solid — no ledge, no key, no signpost. Pre-reveal the nook ledge is not
  drawn and not solid, and the key is not drawn or pickable.
- **Marker brick** at ~1590 (y≈groundY−150): one of the bricks IN that wall
  section, slightly out of pattern with a faint glint (brightens when shot).
  It is the weak brick: **3 arrow hits** crumble the section (~0.5 s, brick
  dust) and open the nook — the ledge becomes solid and the key appears,
  twinkling, inside a dark recess. It sits at chest height from the west lip
  (arrow y = p.y + 12), so a plain standing shot from the lip hits it —
  the puzzle is *finding* the brick, not timing the shot.
- **The key** (~1620, y≈groundY−240): rests on the nook ledge {1600,
  y−240, 90}, reached by a precise two-hop chain: platform at the west lip
  {1460, y−120, 100} → the nook ledge. Each hop is a 120 px rise (the jump
  apex is ~130 px, so both are tight but fair). Missing the ledge = lava.
- **Jail cell** (~2100, ground level): a brick alcove with iron bars, ~70×100,
  witch visible inside. Two dialogue beats (see below).
- Zombie: (2000, patrol 1900–2100). Ghost: (2250, 230).

### Corridor 2 (2600–3500)

- The danger ramp — where flight starts to pay off before the boss.
- Lava fissures at 2850–2950 and 3250–3350; staggered platforms over both
  {2800, y−110, 110}, {3100, y−140, 120}, {3300, y−110, 110} (heights kept
  within the ~130 px jump apex of the ground or a neighbouring platform).
- Zombies: (2700, 2600–2800), (3100, 3000–3200), (3450, 3400–3520).
  Ghosts: (2950, 250), (3300, 230) — "ghosts in the dark".
- **The door** at 3550 (see below).

### Troll hall (3550–4400)

- Same shape as the mage's hall: arena with walls at both ends, pearl
  pedestal, sealed staircase down.
- Troll arena: x 3660–4180, troll home x≈3950.
- Pearl pedestal at x≈4210 (appears when the troll dies).
- Staircase down at 4250–4400: four 20 px steps (level 2 pattern), exit zone
  {x: 4300, y: groundY−10, w: 100, h: 95, locked: true} — standard seal:
  barrier on the first step until the pearl is taken.

## The key chain

1. **Reveal + Key** — shoot the marker brick 3 times to crumble the wall
   and open the nook, then grab the key (HUD key icon while carried). Two
   encounter orders:
   - *Missed first pass:* player reaches the cell keyless → witch's hint
     ("hidden to the west, above the fire") → short backtrack → forward,
     linear from there.
   - *Found first pass:* no backtracking at all.
2. **Jail cell / witch** — proximity dialogue, two beats:
   - *No key:* "Guards locked me here for curing their king. / A secret key
     hides to the west — above the fire." (player can walk on)
   - *With key:* auto-unlock on approach — clank, bars swing open.
     "Free at last — you have a kind heart. / Take this: press S and you
     will soar." → the witch hops out, wanders a step or two, fades in a
     puff of sparkles. The **flight spell is granted** (permanent).
3. **Door** (3550–3590, **full height** — floor to ceiling, since a
   y≈200 top would be flyable over and the key must not be skippable):
   iron-banded stone portcullis with a glowing lock.
   - *No key:* solid barrier — the troll hall cannot be entered.
   - *With key:* auto-opens on approach (rumble, slides up) and **the key is
     consumed** (icon disappears). Once the player passes x > 3600 the
     portcullis **drops shut behind them** — commit to the fight.

## The witch's gift — flight spell (permanent)

- **Carried across levels** exactly like the bow: `hasFlight` added to the
  `carry` object in `startGame` (`hasFlight: advancing ? !!prev.hasFlight :
  false`). Level 3 is where it's learned; future levels may require it.
- **Cast: S** (new input; only when `hasFlight`, not already flying, and the
  cooldown is done). Works from the ground or mid-air.
- **While flying (10 s):**
  - **Arrow keys = full 4-way control**: Up = rise (~220 px/s), Down =
    descend (~200 px/s), Left/Right = horizontal (A/D also work, run speed
    260 px/s). Neutral vertical = gentle sink (~50 px/s).
  - Jump (Space/W) is suspended while flying.
  - X still fires arrows.
  - **Landing on any solid surface (ground or platform) ends flight early**
    and starts the cooldown. One-way platforms are passed freely while
    flying (no landing resolve until the descent touches them).
  - Still takes damage from contact and projectiles — no invulnerability.
  - Clamped below the dungeon ceiling (y ≥ ~60).
- **Cooldown: 15 s** after the 10 s expires (or after landing early).
  Rechargeable forever.
- **HUD**: wing icon + meter that drains during flight and refills during
  cooldown. Only shown once the spell is learned (not before the cell).

## The troll — "harder than the mage"

52×64, **grounded** (no levitation — easier to hit than the mage, but with
more HP, more simultaneous threats, and it *reacts to your attacks*).
HP 8, white flash 0.15 s + stagger 0.3 s (crouch-frozen), 8-pip HP bar.

**Attack set** (idle 1.0–1.6 s → pick one → execute):

- **Rock shield** — raises a stone shield in front of the player for
  1.6–2.2 s. Front arrows **bounce off** (spark + deflection sound); the
  **overhead is open** — fly up and shoot over it, or wait it out.
  **Reactive**: if the player fires within 300 px, the troll raises the
  shield with a 150 ms delay 45 % of the time (65 % in phase 2) — it punishes
  arrow spam the way the mage's dodge did.
- **Slam** — windup 0.8 s (club raised, crouch), hops up to 220 px toward
  the player, pounds the floor: screen shake + a **ground shockwave** that
  rolls both ways from the impact point (180 px/s, ~140 px each side,
  ~1.2 s). Jump or fly over it.
- **Boulder lob** — windup 0.6 s, lobs **2 boulders** in arcs toward the
  player (gravity, apex above head height). Boulders fizzle in a dust puff
  on landing. **Not shootable** (fireball rule).

**Phase 2** (hp ≤ 4): windups −30 % (slam 0.6, lob 0.45), **3 boulders**,
shield up more often, reactive-shield chance 65 %.

**Difficulty shape (confirmed)**: more HP + more concurrent attacks, with
flight as the intended counter — but **beatable without flight** (the troll
never dodges; patient players can wait out shields, jump shockwaves, and
time arrow shots into windups). It must be brutal, not impossible.

**Tuning** (kind entry in `src/enemies/troll.js`): idleMin 1.0 / idleMax 1.6,
shieldDur 1.6–2.2, shieldCd 1.2–2.0, shieldChance 0.45, slamWindup 0.8,
slamHop 220, waveSpeed 180, waveRange 140, lobWindup 0.6, lobCount 2,
reactDelay 0.15, reactChance 0.45, staggerT 0.3. Phase-2 overrides listed
above.

## Player state across levels

- Level 3 starts with the bow and maxHp carried from level 2 (heartcap → 4).
  HP resets to maxHp at level start (existing behaviour).
- `hasFlight` joins the carry object; false until the witch grants it in
  level 3, then permanent for all subsequent levels.

## Ending sequence

1. Troll dies → big burst + shake → pearl appears on the pedestal.
2. Player picks up the pearl → burst + chime → seal on the staircase breaks
   (glowing barrier fades out).
3. Player walks the four steps down.
4. Bottom step = exit zone → standard level-complete overlay (level 3 is **not**
   the finale; level 4 is future work).

## Loot boxes

Same "lots of boxes" tradition, existing pool only (no new loot items).
14 boxes: corridor 1 (gem, sunbeam, boots, mystery), the safety **bow**
at ~1250 (see below), around the cell (star, heart, lantern, hops),
corridor 2 (mystery, grow, magnet), troll hall (shield, heartcap) —
visible on the approach like level 2's.
- **Safety bow box** (~1250, ground): `drop: 'bow'`. A death-restart of
  level 3 drops the carried bow (only maxHp and the flight spell survive a
  restart, `game.js` carry rule), which would soft-lock the nook (needs 3
  arrows) and the troll (arrow-only damage). The box sits on the ground
  path before the door, in the calm stretch between the 2nd zombie patrol
  and the west lip, breakable by stomp — so every restart re-acquires a
  bow before the key nook. A redundant pickup (already bow-holding) is
  harmless: `onPickup` just re-sets `hasBow`.

## Enemies

- **Zombies + ghosts only** (level 2 kinds, reused as-is). No new regular
  enemy this level.
- Roster (approx): zombies (250: 180–420), (900: 800–1100), (2000: 1900–2100),
  (2700: 2600–2800), (3100: 3000–3200), (3450: 3400–3520);
  ghosts (1300, 240), (2250, 230), (2950, 250), (3300, 230);
  troll (3950, minX 3660, maxX 4180).

## Torches & dressing

- Torches are **decorative**: sconces on the brick (~every 250 px in
  corridors, denser in the hall), flickering flame (seeded per-torch),
  warm radial glow. Not shootable, not interactive.
- Dark alcoves between torch pairs in corridor 2 sell "ghosts in the dark".
- Lava in fissures: dark red, slow bubble animation, soft glow on the brick
  above.

## New systems (input to the phased plan)

1. Level 3 data (`createLevel3`) + `LEVELS` registration + HUD level name
2. Dungeon rendering: brown-brick zone, torch sconces + flicker + glow,
   dark alcoves; lava fissures
3. Flight spell: `hasFlight` carry, S cast, arrow-key flight physics,
   10 s/15 s cycle, landing-cancels, ceiling clamp, HUD wing meter, audio
4. Dialogue system: proximity triggers, text box, advance on key press,
   per-trigger state (cell beat 1 vs beat 2)
5. Key item: hidden nook (marker-brick crumble reveal) + pickup, HUD key icon
6. Jail cell + witch: two-beat dialogue, unlock animation, spell grant,
   witch exit + fade
7. Door: portcullis barrier, key consumption + auto-open, drop-shut behind
8. Troll boss: HP 8, shield/slam/boulder state machine, reactive shield,
   ground shockwave, boulders, phase 2, HP bar
9. FX + audio: key glint/clink, unlock clank, spell cast + whoosh, slam
   thud, boulder, shield bounce, door rumble
10. Tests + render snapshots for the new systems

## Decisions (confirmed)

1. Flight is **rechargeable**: 10 s flight / 15 s cooldown, forever.
2. **Landing cancels flight** (cooldown then starts); one-way platforms are
   passed freely while flying.
3. The key **is consumed** by the door (cell unlock does not consume it).
4. The door **closes behind the player** once past it.
5. Keyless witch dialogue includes a **directional hint**: "to the west,
   above the fire".
6. Arrow keys control flight (Up rise / Down descend / Left-Right steer);
   S casts; Space/W jump suspended while flying; X still fires.
7. Troll is **beatable without flight** — flight is the intended counter,
   not a hard requirement.
8. The key also gates the **troll-hall door** — the key is required to reach
   the boss, so finding it is mandatory for the level (but never a
   soft-lock: it is always obtainable before the door).
9. Level 3 is **not** the last level; stairs go **down**; same pearl-seal
   mechanic; standard level-complete overlay.
10. Loot boxes from the **existing pool only**; zombies + ghosts are the only
    regular enemies; torches are decorative.
11. The nook is **hidden in the wall** above fissure 2: the marker brick is
    the weak point (3 arrow hits → ~0.5 s crumble → ledge solid, key visible
    and pickable). Pre-reveal the ledge and key are not drawn, the ledge is
    not solid, and the key is not pickable. The marker sits at chest height
    from the west lip so plain standing shots reach it (difficulty lives in
    discovery, not shot timing).
12. A **safety bow box** (~1250, ground path before the door) fixes the
    death-restart soft-lock: restarting level 3 drops the carried bow
    (carry only happens on an advance, `game.js`), but the troll is
    arrow-only damage and the nook needs 3 arrows. The box is on the path,
    ground level, stomp-breakable — no item dependency to reach it.
