# unicorn queens

A tiny horizontal-scrolling platformer. Vanilla JS ES modules, no build
step. Serve over http — the modules won't load from `file://`.

## Run

    npm run serve     # http://localhost:9000/
    npm test          # unit tests (vitest)
    npm run smoke     # 300-frame headless wiring check

Booting with `?level=N` (1-based) jumps straight to that level — e.g.
`http://localhost:9000/?level=5`. The player arrives with the gear a run
would have carried in at that point (bow from level 3, flight from the
witch in level 3), so each level is testable as designed. Death and level
advance still follow the normal carry rules.

`?difficulty=easy|medium|hard` picks the difficulty for that session
(combine with `?level=`); without it the game uses the last choice
remembered, else hard. See DIFFICULTY-PLAN.md.

A plain start (no `?level=`) opens on the difficulty card — **Easy**
(five hearts, no pit damage, revive where you fall, gentler bosses),
**Medium** (four hearts, gentler bosses) or **Hard** (three hearts, the game
as designed); ←/→ and Space. The choice is remembered, and the end card's
Space comes back to it. Then the story: the Queen and the King
out walking in the wood of level 5 when the sorcerer arrives, takes the
realm in a sentence, and the King in a scuffle — nineteen seconds on the
game's own sheets, any key to skip. `src/intro.js` is the scene as a pure function of its clock;
`src/render/intro.js` draws it through the same passes the level uses.

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
3. **The Undercroft** — a brown-brick dungeon lit by torches, crossed
   by lava fissures (falling in costs a heart and respawns you).
   A marker brick on the wall glints toward a hidden key set into a
   nook ledge above the second fissure — a tight two-hop chain. The
   key unlocks a jail cell; the witch inside grants you the flight
   spell (permanent for the run). The same key opens the troll's
   door: it is consumed there, and the portcullis drops shut behind
   you, so the fight is a one-way commit. The troll has 8 hp and a
   stone shield that bounces arrows (the top of his head is open, and
   he sometimes rolls it away); he slams the floor into shockwaves
   and lobs boulders you can't shoot down. Below 4 hp he winds up
   faster, throws three boulders, and his eyes glow. Beat him to make
   the pearl appear, take it, and walk the four steps down to the
   exit.

   **Flight spell (S):** for 10 s you fly — up/down/left/right with
   the arrow keys (A/D still run, X still shoots); landing on anything
   ends it early. 15 s recharge, forever. No invulnerability while
   airborne.
4. **The Dragon's Layer** — deep in the castle: green-black stone, moss,
   puddles, dim torches. Cross the sludge pits (falling in costs a heart
   and respawns you) and the zigzag platform gauntlet over the big one,
   then through the keyless portcullis into the vault — a secret crate
   waits above the treasure, reachable by a jump-arrow. The green dragon
   has 14 hp, hovers out of ground-arrow range, rains aimed fireballs,
   dives, and breathes a fire cone from the floor; below 7 hp it gets
   quicker. Beat it to make the pearl appear, then take it to the seal —
   the exit is a hole in the ceiling, open only to flight.
5. **The Enchanted Forest** — outdoors at last: blue sky, a low sun,
   tree canopy, wildflowers. Three hidden relics, each hidden a different
   way: a golden horseshoe in a bush (shoot the bush to make it rustle
   open), a sapphire in the hollow of a tree (climb the branch chain above
   the pond — the drop into the hollow passes straight through the gem),
   and a royal acorn on a lone lily pad floating high over the pond (fly
   to it). Each is +50 score, and the Unicorn Queen, in her glade, counts
   them as you approach. The pond's lily pads are the safe crossing
   (falling in costs a heart and respawns you); the bees in the canopy are
   the new regular enemy — they bob over their flower and dash straight
   across the path when you come near, stompable, one arrow each. Hand
   over all three and the Queen tells the truth: the Unicorn King was
   kidnapped by an evil wizard who rides a flying pig and keeps him atop
   a snow-topped mountain. The mist gate at the east end brightens and
   opens. Level 5 is not the finale.
6. **The Blackmire** — night again, but this is a swamp under a low
   moon: fog bands, black water, dead roots. The heron's nest in the
   cypress is sealed in web — an arrow melts the threads and the
   heron's cog rests on the rim. Cross the log pool and the lily pool
   (falling in costs a heart and respawns you); adders slither the
   banks and ceiling spiders drop to pounce, both one arrow or a stomp
   each. The winch temple takes the cogs one at a time: the first
   wakes the mud vent in the lily pool — every 10 s it belches one big
   bubble; jump-shoot it at the top and the adder's cog floats at the
   pop point (out of jump reach, so the wings carry it). The second
   socket makes the elder adder's egg sac appear on the altar dais —
   stomp it, or shoot it — and the weaver's cog tumbles out. The third
   lowers the stone bridge over the last pool and melts the web wall at
   the hollow's mouth. Inside, the Weaver Queen waits: 16 hp, not
   stompable, and she never leaves her half of the hollow. She crawls
   at you, lunges, spits web globs (a hit slows you for 2.5 s), and
   raises web pillars at your feet — the glint shows where, so walk off
   it. Below 8 hp she also throws a volley of three web eggs. Beat her
   and the pearl appears on her altar; take it and the exit arch lights
   up. The mire is not the end.
7. **The Peak** — the snow-topped mountain the mist gate carried you up
   to. The wind is the level's weather: every 10 s the vane howls and a
   gust shoves grounded players west across the snowfield; every fourth
   gust turns into an updraft that lifts a flyer. Ice patches are
   slippery — you keep your speed through them, which is how you clear
   the two crevasses (falling costs a heart and respawns you); the ice
   bridge over the second one is comfort, not a gate. The Queen's riddle
   is real: the old sigil sleeps inside an ice block — an arrow shatters
   the block, the pickup is +50, and the iron gate at the spire's mouth
   opens remotely. Inside, cross the storm's cauldron pit over its little
   dais (hop-hop), and look through the porthole: the caged King gives
   you the plan. Snow hares hop the fields (one arrow, or a stomp that
   puffs them to fluff); frost wraiths drift the air and pass under
   arrows aimed at the ground (one arrow to the chest). The throne gate
   dissolves when you first approach it — and that is what wakes the
   wizard. He rides a war-pig with 10 hp, in two stages of 5. Stage one
   the pig hovers out of ground-arrow reach: only the rune on the flank
   facing you takes hits (arrows to the body deflect), he lofts lead-aimed
   dark bolts, swoops at you and sits on the ground for most of a second
   after (the designed arrow window), and snorts a violet cone from the
   bottom of his arc. At 5 hp the rune shatters and the pig crashes; the
   wizard is stunned on the floor for 2 s, full body. Then he rises as
   the sorcerer: he drifts, fires bolts, slams the floor into shockwaves,
   and raises seal columns where the circle glints — walk off it. At 3
   hp his bolts spread into a fan. This one is not killed. When the
   wizard is done, the bound spirits are freed, the cage door swings
   open, the war-pig stands up and walks back down the mountain, and the
   King's word lights the rainbow — the game's first good chord. Walk
   through it.
8. **The Sky Citadel** — the rainbow out of the throne arena lands you
   on a cloud island adrift in twilight, the game's first sky that is
   neither day nor night: deep blue-violet, stars out in the "day", the
   cloud sea far below, the rainbow's tail still streaming off the
   spawn island. This is the Frost Queen's **Anchor** — the Great Clock
   at its heart keeps the realm's freeze beating, and the Queen has cut
   its three mainsprings loose as she withdraws. It is a rhythm level:
   everything mechanical moves on the clock's beat, and you learn the
   tempo by ear — the gear platform that shuttles between its two slots
   (ride the slide across the first pit, feet still), the bookcase
   panel that opens for a 2 s window (it holds rather than crushes if
   you're caught in it), and the pendulum bridge (the rod hangs at the
   chime and swings to its extremes at the quarters of the beat; time
   the crossing to the swing). Cut all three springs, each a different
   puzzle — one waits on a shelf chain above the gate hall, one on the
   dais below the panel, one over the pendulum's arc — and each cut
   drops the hum a notch, dims the light a shade, slows the gears, and
   stretches the chime's period: the citadel winds down around you.
   Clockwork moths dart between the lamps (one arrow each), and the
   sentinels patrol: their shields come up for a second on each chime
   and block arrows that fly the way the sentinel faces — a shot from
   behind always lands. The third cut opens the gear door, and the
   observatory beyond holds the **Warden**, an automaton of brass and
   starlight bound to the machine — the game's third bound creature.
   Sixteen hits, not stompable. In his first phase he attacks on the
   beat — a floor slam into shockwaves, or a bolt of starlight — and
   steps forward with every chime; but 0.6 s after each chime his core
   glows as he resets, and arrows in that window do triple damage. At
   8 he also attacks off the beat and sweeps a floor band with a long
   telegraph: camp the west edge of his reach, fire the windows, jump
   the shockwaves. He is not destroyed — the core dims to ember, he
   bows, and the clock tolls its last beat. The gears stop, the lights
   dim one final shade, and a pearl appears on the astrolabe. Take it
   and the King's silhouette steps onto the rim, the shaft trapdoor
   swings open, and he tells you the anchor is broken and the way down
   is open. Fly down through the cloud shaft — the ceiling hole of
   level 4, inverted — to the ice below. The citadel stands still.

9. **The Frozen Throne** — the shaft drops you onto a glacier under a
   sky that has not seen dawn in a hundred years, with an ice palace on
   the horizon and the King walking beside you. Three frost seals bar
   the way east, and three hearths sleep under them: find each **sun
   seed** — one caught inside a frozen fountain, one on the crest of a
   frozen wave, one in the block of ice a robin is trapped in (both
   shells open to an arrow) — and carry it to its hearth. Each fire you
   light steps the sky one shade toward dawn, thins the frost film in
   the hall, raises the drone a semitone, melts a ring of floor from ice
   to wet stone, and cracks its seal open. It also frees something the
   winter caught: a hare runs home, a wraith goes out like a held
   breath, a frozen scholar drips for a second. **Bounce boots grip the
   ice here** — the peak's slide, finally answered — but the glacier
   golems spit beads of frost that land as fresh slick patches, and a
   patch slides in boots or out of them. Frost sprites hover and throw
   darts. In the hall behind the third seal, five people stand frozen
   mid-step.

   Past the last seal the **Frost Queen** sits on her throne with a
   century of winter in her. Speak to her and the shell comes off: 24
   hits, arrow-only, three rows of pips over the arena. She keeps
   spacing rather than chasing — a frost bolt, a floor slam into two
   waves that die at the arena walls, an ice spike that glints for a
   beat before it rises (too tall to jump: walk out of the glint). At
   16 she stops for a second, her staff flares, and a frozen guard in
   the hall cracks and drips; then she breathes a short cone that
   leaves a patch where it lands, and doubles the spikes. At 8 the same
   again with the child, and the last winter lunges in bursts and calls
   a three-second blizzard — dense snow, a gentle drift on your footing,
   three slow waves. The King's pad is the only floor in the room that
   does not slide; the arena's two heart boxes are worth leaving on the
   floor until you need them.

   The last arrow does not kill her. Her staff shatters, her armour
   peels, she kneels, and she becomes light and goes. While that light
   is still rising the King walks to the dais, raises the horn, and a
   warm beam sweeps the whole level west to east: the sun crests the
   glacier, the fountains run, the wave finally breaks, the five in the
   hall crack and fade into the light, and a robin flies back in and
   perches on the throne rim. She gets the last word — she froze the
   world to stop a plague that was already a century gone — and he gets
   the one after. Then the card: **THE REALM THAWS**. Space starts a new
   run at level 1, with nothing carried.

Win a level and press Space to play the next one — except the last one,
which has no goal line and no exit: the ending state is the only way out,
and Space at the end card starts the game over.

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
| sunbeam | instant burst that defeats every non-mage enemy on screen | instant | table (3%), meadow platform, castle room-1 box |
| star arrows | +5 arrows that pierce up to 5 enemies each (reserve cap 10); they shatter boxes in their path too | until fired | table (4%), meadow + 2 castle boxes |
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
- Flight spell (once learned, level 3): S — fly for 10 s; while
  flying, up/down arrows rise and descend
- Sound: M mutes everything; N mutes just the music
- Next level / retry (after win/loss): Space
- Fullscreen: F, or the link under the game (Esc leaves). The game stays
  800x600 inside and is scaled to the biggest 4:3 box the screen allows.

### Controller

Any pad the browser reports with the standard mapping works — a
DualShock 4 over USB or Bluetooth, an Xbox pad, most others. Buttons are
named for the PlayStation layout:

- Move: left stick or d-pad
- Jump: Cross (also advances dialogue and restarts, as Space does)
- Shoot: Square, Circle, R1 or R2
- Flight spell: Triangle, L1 or L2
- Fly up / down: stick or d-pad up / down
- Advance dialogue: Cross or Options

The pad drives everything but cannot unlock the sound: browsers only
open audio on a real key, tap or click, and a pad's presses arrive as
none of those. The HUD says *tap or click for sound* until you do; one
tap on the page and it stays open.

### Phone or tablet

On a touchscreen the page puts up its own buttons — ◀ ▶ and ▲ ▼ on the
left, FLY / FIRE / JUMP on the right, ⛶ for fullscreen — and shrinks the
game to fit the screen, keeping its 4:3. Landscape is the intended way
round: the game fills the height and the buttons sit in the space either
side. Each button is a key underneath (JUMP is Space, so it advances
dialogue too), and two thumbs at once are two keys at once. Adding the
page to the home screen gets rid of the browser bars; the manifest asks
for fullscreen and landscape when launched that way.

Two iPhone particulars, both handled: Safari there has no fullscreen for
anything but video, so ⛶ explains the home-screen route instead (and is
not shown at all once launched from there); and Web Audio on an iPhone
follows the ring/silent switch, so the first tap also starts a looping
inaudible `<audio>` element, which moves the page's audio session to
playback and lets the game's sound through with the switch on silent.

## Music

The soundtrack is live-coded with [Strudel](https://strudel.cc): 8-bit
house/trance, synthesised on the fly rather than streamed, so it costs
~209 KB of code and no audio assets.

- `src/music/chip.js` — the voice palette. Its header records which
  chiptune conventions were kept and which were rejected by ear.
- `src/music/tracks.js` — per-level arrangements. A track is named
  layers, each with a 32-bar mask of ones and zeros, so the form reads
  as text.
- `src/music.js` — the director: which track plays, and how loud.

Patterns are Strudel source strings, so anything here pastes straight
into strudel.cc and back.

All nine levels have a track, each in its own mode; a level whose
name has no entry plays silence rather than failing.

## Layout

- `src/` — game logic (player, level, enemies, loot, arrows, particles,
  camera, game state). No canvas calls.
- `src/render/` — all drawing, split per entity, plus a shared `theme.js`
  (palette/fonts) and `background.js`.
- `assets/sprites/` + `src/sprites.js` — the generated pixel art, and the
  loader for it. Sheets are requested at import and consumed as they decode;
  there is no loading screen and no switch. The vector draws still in the
  renderers are the fallback for the frames before a sheet has decoded and
  for anywhere that cannot decode one at all — which is how the whole test
  suite runs, since Node has no `Image`. That is also why the render
  snapshots record vector calls.
- `src/loot-items/` — one file per loot kind. Each file registers
  `{ kind, weight?, onPickup, update?, draw }` with the registry in
  `index.js`, so a kind's effect, drop weight, and sprite all live in the
  same file (`gem.js` also owns magnet steering in `update`; `sunbeam.js`
  keeps the enemy side decoupled via `hooks.onSunbeam`). `loot.js` keeps
  the loot list, score, box spawning, default physics, and the drop table
  (derived from each item's `weight`, in import order); `render/loot.js`
  is a thin loop over `def.draw`.

  | kind | file | table weight |
  |---|---|---|
  | gem | `gem.js` | remainder (fallback) |
  | heart | `heart.js` | 20% |
  | boots | `boots.js` | 5% (also owns `MYSTERY_BOOTS`) |
  | magnet | `magnet.js` | 5% |
  | sunbeam | `sunbeam.js` | 3% |
  | star | `star.js` | 4% |
  | hops | `hops.js` | 4% |
  | bow, grow | `bow.js`, `grow.js` | none (first box / designated) |
  | shield, lantern, heartcap | `shield.js`, `lantern.js`, `heartcap.js` | none (designated boxes) |

  The mystery box is not a kind: its payload table stays in `loot.js`
  (`spawnMystery`) and its sprite in `render/level.js`.
- `src/enemies/` — one file per enemy kind. Each file registers
  `{ kind, w, h, stompable, tuning..., update, draw, onHit?, hitSound?,
  deathSound?, deathFx? }` with the registry in `index.js`, so a kind's
  brain and sprite live in the same file (`slime.js` also owns `E_W`/
  `E_H`, re-exported from `enemies.js`; `mage.js` imports
  `projectiles.js` — a runtime-only cycle, safe because no kind file
  reads the orchestrator at module init). `enemies.js` keeps spawning,
  the shared stomp-vs-side-contact rule, and one-point arrow damage;
  `render/enemies.js` is a thin loop over `def.draw`.

  | kind | file | brain |
  |---|---|---|
  | slime | `slime.js` | patrol (turns at bounds); stompable; owns `E_W`/`E_H` |
  | zombie | `zombie.js` | shamble + chase in aggro range; stompable |
  | ghost | `ghost.js` | hover/bob, drifts close, flees a lit lantern; unstompable |
  | mage | `mage.js` | boss (level 2): idle→windup→fire, stagger on hit, 5 hp, hp-pip sprite |
  | troll | `troll.js` | boss (level 3): 8 hp, stone shield bounces front arrows (top open, reactive roll), slam → shockwaves + shake, lobs unshootable boulders; phase 2 at hp ≤ 4 (faster windups, 3 boulders, ember eyes) |
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

## Licence

AGPL-3.0-or-later (see `LICENSE`). The game vendors
[Strudel](https://codeberg.org/uzu/strudel) for its soundtrack —
`vendor/strudel/`, unmodified, and AGPL itself — so the combined work
takes the same licence. If it is ever served publicly, players are
entitled to the source.
