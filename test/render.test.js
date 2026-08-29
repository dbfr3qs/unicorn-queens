// Render snapshot tests: pin the draw-call log for representative game
// states, so visual regressions from refactors fail here instead of
// being found by playing the level. Intentional visual change ->
// `npx vitest -u` and review the .snap diff in git.
//
// NOTE: the harness import below must stay first — it seeds
// Math.random before src/background.js generates its stars at import
// time.
import { test, expect } from 'vitest';
import { freshGame, freshGame2, freshGame3, freshGame4, freshGame5, freshGame6, step } from './helpers/render-harness.js';
import { draw } from '../src/render/index.js';
import { createRecordingCtx } from './helpers/recording-ctx.js';
import { loot } from '../src/loot.js';
import { BIG_W, BIG_H } from '../src/player.js';
import { fireFireball, FIREBALL_SPEED, fireBoulder, fireCone } from '../src/projectiles.js';

test('initial frame', () => {
  freshGame();
  expect(step({}, 0)).toMatchSnapshot();
});

test('walking', () => {
  freshGame();
  // 90 frames: walks right, stops against the box at x=450; camera has
  // scrolled a little, so background parallax differs from initial.
  expect(step({ right: true }, 90)).toMatchSnapshot();
});

test('l1 mystery box (purple, swirl)', () => {
  const g = freshGame();
  g.player.x = 1350; // clear of the 980-1260 slime patrol, box at 1000 in view
  g.camera.x = 964; // 1350 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('jumping', () => {
  freshGame();
  // jump fires on frame 2 (needs one frame to land and arm coyote time);
  // snapshot mid-air with the upward stretch still easing out.
  expect(step({ jump: true }, 10)).toMatchSnapshot();
});

test('landed-hard', () => {
  const g = freshGame();
  g.player.y = 300; // drop from above: ~720 px/s impact > 350 threshold
  expect(step({}, 40)).toMatchSnapshot(); // lands frame 37: squash + dust
});

test('win overlay', () => {
  const g = freshGame();
  g.player.x = g.level.goal.x - 10;
  g.camera.x = 1600; // max scroll, as if the player had walked there
  expect(step({}, 10)).toMatchSnapshot(); // win burst + shake + overlay
});

test('game over overlay', () => {
  const g = freshGame();
  g.player.hp = 1;
  g.player.x = 540; // overlaps the first slime's patrol range
  expect(step({}, 10)).toMatchSnapshot(); // side hit -> dead + overlay
});

test('hurt blink', () => {
  const g = freshGame();
  g.player.hp = 2;
  g.player.x = 540; // side hit: hp 2->1, invuln, knockback, hurt burst
  // frame 8: mid knockback, invuln=1.367 -> floor(invuln*12)=16 (even) -> blink on
  expect(step({}, 8)).toMatchSnapshot();
});

test('big mode', () => {
  const g = freshGame();
  g.player.big = true;
  g.player.w = BIG_W; g.player.h = BIG_H;
  g.player.y = g.level.groundY - BIG_H; // standing, grown
  expect(step({}, 1)).toMatchSnapshot(); // scale 1.389 on both axes
});

test('boots active', () => {
  const g = freshGame();
  g.player.boots = 10;
  expect(step({}, 1)).toMatchSnapshot(); // golden shoes on the unicorn
});

test('heart cap (4 hp pips)', () => {
  const g = freshGame();
  g.player.maxHp = 4;
  g.player.hp = 4;
  expect(step({}, 1)).toMatchSnapshot(); // fourth pip filled in the HUD
});

test('bow + arrow in flight', () => {
  const g = freshGame();
  g.player.hasBow = true;
  step({ fire: true }, 1); // fires on the first frame, cd 0.22s
  expect(step({}, 9)).toMatchSnapshot(); // bow on the queen, arrow ~78px out
});

test('loot on ground (all four kinds)', () => {
  freshGame();
  for (const [i, kind] of ['gem', 'heart', 'bow', 'grow'].entries()) {
    loot.push({
      x: 150 + i * 70, y: 544, w: 16, h: 16, // groundY - h
      vx: 0, vy: 0, onGround: true, kind, taken: false, t: 0.5, // mid-bob phase
    });
  }
  expect(step({}, 1)).toMatchSnapshot();
});

test('far camera', () => {
  const g = freshGame();
  g.player.x = 2280; // just short of the goal (2308 < 2340, no win)
  g.camera.x = 1600; // max scroll: level.width - viewW
  expect(step({}, 1)).toMatchSnapshot(); // goal flag + max parallax
});

test('dead slime skipped', () => {
  const g = freshGame();
  g.enemies[0].dead = true; // drawEnemies must skip it
  expect(step({}, 1)).toMatchSnapshot(); // four slimes, not five
});

// ---- level 2 (bridge-castle) scenarios ----
// Camera values are player.x + w/2 - viewW/2 (or the max-scroll clamp),
// so updateCamera holds them still; state is set directly where reaching
// it through play would take longer than the snapshot is worth pinning.

test('l2 bridge start (planks, both moats, gate ahead)', () => {
  const g = freshGame2();
  g.player.x = 500; // mid-bridge, on the second plank span
  g.camera.x = 114; // 500 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l2 interior (zombie aggro + ghost drift, room 1 platforms)', () => {
  const g = freshGame2();
  g.player.x = 1100; // zombie 100px ahead (aggros), ghost ~150px (drifts)
  g.camera.x = 714; // 1100 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l2 boss hall (mage mid-windup, fireball in flight, hp pips)', () => {
  const g = freshGame2();
  g.player.x = 3000; // 250px short of the mage: aggroed, no contact
  g.camera.x = 2614; // 3000 + 14 - 400
  const mage = g.enemies.find(e => e.kind === 'mage');
  mage.state = 'windup'; mage.t = 0.35; mage.flash = 0; // mid the 0.7s windup
  mage.hp = 3; // pips: 3 red, 2 dim
  fireFireball(3180, 535, -FIREBALL_SPEED, 0, { play: () => {} }); // in flight, heading at the player
  expect(step({}, 1)).toMatchSnapshot();
});

test('l2 boss hall with shield active (moon disc + charge pips)', () => {
  const g = freshGame2();
  g.player.x = 3000;
  g.camera.x = 2614;
  g.player.shield = 3; // full charge
  expect(step({}, 1)).toMatchSnapshot();
});

test('l3 key in alcove + marker glint', () => {
  const g = freshGame();
  g.level.key = { x: 1620, y: g.level.groundY - 240, w: 16, h: 16, taken: false };
  g.level.marker = { x: 1480, y: g.level.groundY - 200, w: 36, h: 12, glintT: 0.3 };
  g.player.x = 1500;
  g.camera.x = 1114; // 1500 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // glint decays one frame during the step
});

test('l3 door locked (glowing lock)', () => {
  const g = freshGame();
  const gy = g.level.groundY;
  g.level.door = { x: 1000, y: 0, w: 40, h: gy, state: 'locked', openT: 0, closeT: 0 };
  g.player.x = 900;
  expect(step({}, 1)).toMatchSnapshot();
});

test('l3 door open (lattice retracted)', () => {
  const g = freshGame();
  const gy = g.level.groundY;
  g.level.door = { x: 1000, y: 0, w: 40, h: gy, state: 'open', openT: 0, closeT: 0 };
  g.player.x = 1100;
  expect(step({}, 1)).toMatchSnapshot(); // no lock, 30 px header remains
});

test('l3 jail cell with witch (bars closed)', () => {
  const g = freshGame();
  const gy = g.level.groundY;
  g.level.cell = { x: 500, y: gy - 100, w: 70, h: 100, open: false, opening: false, unlockT: 0, witch: 'inside', wx: 525, wy: gy - 32, wvy: 0, wanderT: 0, fadeT: 0, puffT: 0 };
  g.player.x = 300; // far enough not to trigger anything
  expect(step({}, 1)).toMatchSnapshot();
});

test('l3 cell open after the witch is gone', () => {
  const g = freshGame();
  const gy = g.level.groundY;
  g.level.cell = { x: 500, y: gy - 100, w: 70, h: 100, open: true, opening: false, unlockT: 0, witch: 'gone', wx: 490, wy: gy - 32, wvy: 0, wanderT: 0, fadeT: 0, puffT: 0 };
  g.player.x = 300;
  expect(step({}, 1)).toMatchSnapshot(); // no bars, empty interior
});

test('l3 key HUD icon (carried)', () => {
  const g = freshGame();
  g.level.key = { x: 1620, y: g.level.groundY - 240, w: 16, h: 16, taken: true };
  expect(step({}, 1)).toMatchSnapshot(); // icon top-left, key itself gone
});

test('dialogue box (bottom center)', () => {
  const g = freshGame();
  g.level.dialogs = [{
    id: 'd', x: 0, y: 0, w: 800, h: 600,
    beats: [{ id: 'b', lines: [{ speaker: 'Witch', text: 'You woke me, queen. The key is west, above the fire.' }] }],
  }];
  expect(step({}, 1)).toMatchSnapshot(); // opens during the step, world frozen
});

test('l2 pearl on pedestal + unsealed stairs', () => {
  const g = freshGame2();
  const mage = g.enemies.find(e => e.kind === 'mage');
  mage.dead = true; // dead bosses are not drawn
  g.level.pearl.visible = true; // appears on the mage's death
  g.level.exit.locked = false; // seal broken (the pearl is taken in play)
  g.player.x = 3400; // boss floor, just before the stairs
  g.camera.x = 2800; // max scroll: level.width - viewW
  expect(step({}, 1)).toMatchSnapshot();
});

// ---- level 3 (undercroft) scenarios ----
// Camera values are player.x + w/2 - viewW/2 (or a clamp), so updateCamera
// holds them still; boss/flight state is set directly (reaching it through
// play would take longer than the snapshot is worth pinning).

test('l3 corridor start (brick, torches, zombie, lava fissure 1)', () => {
  const g = freshGame3();
  g.player.x = 150; // just past the first zombie (250, patrols 180-420)
  g.camera.x = 0; // level start clamp
  expect(step({}, 1)).toMatchSnapshot();
});

test('l3 key alcove (hidden nook: only the marker brick glints)', () => {
  const g = freshGame3();
  g.player.x = 1470; // at the west lip, looking at the nook
  g.camera.x = 1084; // 1470 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // no ledge, no key — the wall over the fissure is intact
});

test('l3 nook mid-crumble (shards falling, glint widening)', () => {
  const g = freshGame3();
  g.level.marker.hits = 3;
  g.level.keyNook.crumbleT = 0.25; // mid the 0.5 s crumble
  g.player.x = 1470;
  g.camera.x = 1084; // 1470 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // section darkened, shards partway down
});

test('l3 nook revealed (framed recess, ledge, key)', () => {
  const g = freshGame3();
  g.level.keyNook.revealed = true;
  g.level.platforms.find(p => p.x === 1600 && p.w === 90).hidden = false;
  g.player.x = 1470;
  g.camera.x = 1084; // 1470 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // dark recess, ledge + twinkling key inside
});

test('l3 jail cell (bars closed, witch inside)', () => {
  const g = freshGame3();
  g.player.x = 1950; // outside the approach zone (2040-2170): no hint beat
  g.camera.x = 1564; // 1950 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // bars + witch, ghost behind
});

test('l3 troll hall (slam windup, boulder in flight, hp pips)', () => {
  const g = freshGame3();
  g.player.x = 3660; // arena left edge, past the door
  g.player.hasBow = true; // carried from level 2 in real play
  g.camera.x = 3274; // 3660 + 14 - 400: locked door + hall in frame
  const troll = g.enemies.find(e => e.kind === 'troll');
  troll.state = 'slamWindup'; troll.t = 0.4; // mid the 0.8 s windup
  troll.hp = 5; // pips: 5 green, 3 dim
  fireBoulder(3930, 500, 3720, 545, { play: () => {} }); // lobbed toward the player
  expect(step({}, 1)).toMatchSnapshot(); // boulder just launched
});

test('l3 flight (player mid-air over lava, wing meter half)', () => {
  const g = freshGame3();
  g.player.hasFlight = true;
  g.player.flying = true;
  g.player.flightT = 5; // half of the 10 s spell
  g.player.x = 2900; // over fissure 3 (2850-2950): flight's reason to exist
  g.player.y = 300; g.player.vy = 0;
  g.camera.x = 2514; // 2900 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // wings flapping, meter ~half
});

test('l3 pearl on pedestal + unsealed stairs (troll dead)', () => {
  const g = freshGame3();
  const troll = g.enemies.find(e => e.kind === 'troll');
  troll.dead = true; // dead bosses are not drawn
  g.level.pearl.visible = true; // appears on the troll's death
  g.level.exit.locked = false; // seal broken (the pearl is taken in play)
  g.player.x = 4100; // hall floor, just before the stairs
  g.camera.x = 3600; // max scroll: level.width - viewW
  expect(step({}, 1)).toMatchSnapshot();
});

// ---- level 4 (dragon's layer) scenarios ----
// Camera values are player.x + w/2 - viewW/2, so updateCamera holds them
// still (same convention as the level 3 scenarios).

test('l4 deep warren (moss wall, drips, puddle, sludge pit, bow box)', () => {
  const g = freshGame4();
  g.player.x = 150; // just past the first zombie (250, patrols 180-420)
  g.camera.x = 0; // level start clamp
  expect(step({}, 1)).toMatchSnapshot();
});

test('l4 gauntlet (platform zigzag over the sludge, ghost above)', () => {
  const g = freshGame4();
  g.player.x = 1830; // on the first gauntlet platform (1800-1890)
  g.player.y = g.level.groundY - 110 - g.player.h; // standing on it
  g.camera.x = 1444; // 1830 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // zigzag over the green pit, ghost at 2300
});

test('l4 dragon hall (portcullis, pillars, bones, sealed shaft)', () => {
  const g = freshGame4();
  g.player.x = 3850; // hall floor, past the portcullis
  g.camera.x = 3464; // 3850 + 14 - 400: door at 3550, shaft 4150-4250 in frame
  expect(step({}, 1)).toMatchSnapshot(); // sealed lattice + green seal glow
});

test('l4 shaft opening (lattice retracted halfway)', () => {
  const g = freshGame4();
  g.level.shaft.state = 'opening';
  g.level.shaft.openT = 0.6; // halfway through the 1.2 s retract
  g.level.exit.locked = false;
  g.player.x = 4080; // hall floor, just west of the shaft
  g.camera.x = 3694; // 4080 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // lattice half gone, seal glow faded
});

test('l4 shaft open (golden light shaft, embers, pearl pedestal empty)', () => {
  const g = freshGame4();
  g.level.shaft.state = 'open';
  g.level.exit.locked = false;
  g.level.pearl.taken = true;
  g.player.x = 4200; // under the hole
  g.camera.x = 3814; // 4200 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // gold mouth, light column to the floor
});

test('l4 bat (mid-swoop at the player, wings flapping)', () => {
  const g = freshGame4();
  const bat = g.enemies.find(e => e.kind === 'bat'); // first roost: 700, 280
  bat.state = 'swoop'; bat.swoopT = 0.5;
  bat.tx = 700; bat.ty = 500; // diving at the ground
  g.player.x = 690; // just under the bat's line
  g.player.y = g.level.groundY - g.player.h;
  g.camera.x = 304; // 690 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // wings flapping, eye glint
});

test('l4 dragon (hovering in the band, 14 hp pips, fireball in flight)', () => {
  const g = freshGame4();
  const dr = g.enemies.find(e => e.kind === 'dragon');
  dr.y = 200;
  g.player.x = 3850; // facing the arena from the left
  g.camera.x = 3464; // 3850 + 14 - 400
  fireFireball(3950, 260, 120, 40, { play: () => {} }); // lobbed away from the player
  expect(step({}, 1)).toMatchSnapshot(); // wings up, pips full
});

test('l4 dragon (stagger: wings crumpled, hit flash)', () => {
  const g = freshGame4();
  const dr = g.enemies.find(e => e.kind === 'dragon');
  dr.state = 'stagger'; dr.t = 0.15; dr.flash = 0.1;
  dr.hp = 10; // 10 pips lit, 4 dim
  g.player.x = 3850;
  g.camera.x = 3464; // 3850 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l4 dragon (perched, chest glow, fire cone across the hall floor)', () => {
  const g = freshGame4();
  const dr = g.enemies.find(e => e.kind === 'dragon');
  dr.x = 4200; dr.y = 510; // on the ground, inside the arrow band
  dr.state = 'perch'; dr.perch = 'inhale'; dr.t = 0.3;
  g.player.x = 3900; // the cone aims at the player
  g.camera.x = 3514; // 3900 + 14 - 400
  fireCone(4200 + 30 - 30, 510 + 22 - 4, Math.atan2(542 - (510 + 18), 3914 - 4200), { play: () => {} });
  expect(step({}, 1)).toMatchSnapshot(); // folded wings, pulsing chest, flame beam
});

test('l4 dragon (dive: wings spread flat, low over the ground)', () => {
  const g = freshGame4();
  const dr = g.enemies.find(e => e.kind === 'dragon');
  dr.x = 4000; dr.y = 505;
  dr.state = 'dive'; dr.dive = 'low'; dr.t = 0.5; dr.diveDir = 1;
  g.player.x = 3850;
  g.camera.x = 3464; // 3850 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

// ---- level 5 (enchanted forest) scenarios ----
// Camera values are player.x + w/2 - viewW/2 (or the max-scroll clamp),
// so updateCamera holds them still. Animation phases (glints, bob,
// brightening) are set via gameTime / direct state so each snapshot shows
// the marker mid-pulse.

test('l5 gate (spawn: day sky + sun through the arch, intro beat open)', () => {
  freshGame5();
  // the player spawns inside the intro band, so frame 1 opens the beat
  // and freezes the world: the first thing the realm's champion sees.
  expect(step({}, 1)).toMatchSnapshot();
});

test('l5 bush (pre-reveal, glint mid-pulse)', () => {
  const g = freshGame5();
  g.gameTime = 3.7; // sin(4s-seed) at its peak: the 2x2 glint fully lit
  g.player.x = 1050; // just west of the bush at 1122-1178
  g.camera.x = 664; // 1050 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l5 bush (revealed, horseshoe already collected)', () => {
  const g = freshGame5();
  g.level.bushes[0].state = 'revealed';
  g.level.relics[0].taken = true; // horseshoe: gone from the mound
  g.player.x = 1190; // standing just east of the open bush
  g.camera.x = 804; // 1190 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l5 hollow tree (branch chain, sapphire glinting in the hollow)', () => {
  const g = freshGame5();
  g.gameTime = 0.7; // sapphire glint (sin phased by x) near its peak
  g.player.x = 2200; // ground, below the 2120/2250 branch chain
  g.camera.x = 1814; // 2200 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l5 pond (lily-pad crossing, floating pad + acorn, water shimmer)', () => {
  const g = freshGame5();
  g.player.x = 2870; // on the second crossing pad (2850-2920)
  g.player.y = g.level.groundY - 6 - g.player.h; // standing on the pad
  g.camera.x = 2484; // 2870 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test("l5 queen's glade (mid-bob, horn sparkle, HUD two of three)", () => {
  const g = freshGame5();
  g.level.relics[1].taken = true; // sapphire
  g.level.relics[2].taken = true; // acorn: the counter reads two of three
  g.gameTime = 0.5; // bob at its peak (0.5 Hz) and the horn sparkle lit
  g.player.x = 3350; // just outside the beat rect (3400-3660): no dialogue
  g.camera.x = 2964; // 3350 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l5 mist gate (locked: dim shimmer, pulsing seal)', () => {
  const g = freshGame5();
  g.player.x = 5200; // east of the last slime's patrol
  g.camera.x = 4800; // max scroll: level.width - viewW
  expect(step({}, 1)).toMatchSnapshot();
});

test("l5 mist gate (mid-brighten after the Queen's story)", () => {
  const g = freshGame5();
  g.level.exit.locked = false;
  g.level.mistgate.openT = 0.75; // halfway through the 1.5 s brighten
  g.player.x = 5200;
  g.camera.x = 4800; // max scroll
  expect(step({}, 1)).toMatchSnapshot();
});

test('l5 bee (mid-sting dash, home flower behind it)', () => {
  const g = freshGame5();
  const bee = g.enemies.find(e => e.kind === 'bee'); // first home: 2450, 320
  bee.homeX = 2450; bee.homeY = 320; // pre-seed so the update keeps the pose
  bee.phase = 2450 * 0.17;
  bee.state = 'sting'; bee.stingT = 0.3; bee.stingDist = 40; bee.ty = 320;
  bee.x = 2410; bee.y = 320; bee.dir = -1; // 40 px into the dash, westbound (band starts at 2400)
  g.player.x = 2350; // on the ground below its line: safe
  g.player.y = g.level.groundY - g.player.h;
  g.camera.x = 1964; // 2350 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

// ---- level 6 (the Blackmire) scenarios ----
// Camera values are player.x + 14 - 400 (or the max-scroll clamp,
// 6800 - 800 = 6000), so updateCamera holds them still. The intro beat
// only opens inside its 40-240 spawn band, so every scenario but the
// gate places the player outside it.

test('l6 gate (spawn: gloom sky, moon, fog band through the arch, intro beat open)', () => {
  freshGame6();
  // the player spawns inside the intro band, so frame 1 opens the beat
  // and freezes the world: the mire's first words.
  expect(step({}, 1)).toMatchSnapshot();
});

// Regression: the gate arch was once drawn at raw SCREEN x 256–400 while
// the west wall scrolled from sx0 — the arch followed the player until the
// zone culled — and its opening (260–400) had no stone on the right, so it
// read as a floating shelf. The wall is now one world-anchored structure
// 0–500: stone either side of the 240–420 opening, lintel arc centred on
// world (330, 390) r 90, and 10 px jambs centred on each edge.
test('l6 gate arch is world-anchored, with stone on both sides', () => {
  for (const camX of [0, 200]) {
    const g = freshGame6();
    g.player.x = camX + 386; // outside the 40–240 intro band; no update, pure draw
    g.camera.x = camX;
    const { ctx, lines } = createRecordingCtx();
    draw(ctx, 800, 600);
    expect(lines, `lintel arc not at screen x ${330 - camX} (cam.x=${camX})`)
      .toContain(`arc(${330 - camX}, 390, 90, 0, 3.142, true)`);
    expect(lines, `east stone missing (cam.x=${camX})`)
      .toContain(`fillRect(${420 - camX}, 0, 80, 560)`);
    expect(lines, `west jamb missing (cam.x=${camX})`)
      .toContain(`fillRect(${235 - camX}, 390, 10, 170)`);
    expect(lines, `east jamb missing (cam.x=${camX})`)
      .toContain(`fillRect(${415 - camX}, 390, 10, 170)`);
  }
});

test('l6 nest (webbed, glint mid-pulse)', () => {
  const g = freshGame6();
  g.gameTime = 1.571; // sin(t*1.57) at its peak: the 2x2 glint fully lit
  g.player.x = 1050; // ground, below the root chain and the nest
  g.camera.x = 664; // 1050 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l6 nest (open, heron cog resting on top)', () => {
  const g = freshGame6();
  g.level.nest.state = 'open';
  g.level.cogs[0].visible = true; // the heron cog at its data spot (942, 154)
  g.player.x = 1050;
  g.camera.x = 664; // 1050 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l6 vent (bubble mid-bob, adder cog sealed inside, lily pads)', () => {
  const g = freshGame6();
  g.level.vent.active = true;
  g.level.vent.t = 3.0; // bob phase (1.2-6.2 s of the 10 s cycle)
  g.player.x = 1950; // standing on the first crossing pad (1950-2020)
  g.player.y = g.level.groundY - 6 - g.player.h;
  g.camera.x = 1564; // 1950 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l6 altar (egg sac present on the dais, elder adder asleep behind it)', () => {
  const g = freshGame6();
  g.level.sac.present = true;
  g.gameTime = 1.571; // the sac glint at its peak
  g.player.x = 3950; // just west of the dais (4250-4400)
  g.camera.x = 3564; // 3950 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot(); // adder (4150) coiled asleep
});

test('l6 winch temple (socket 0 filled, rune glowed, wheel still)', () => {
  const g = freshGame6();
  g.level.cogs[0].taken = true;
  g.level.cogs[0].installed = true;
  g.level.winch.sockets[0] = true; // the heron cog in its notch
  g.player.x = 4750; // west of the winch (4900), inside the fog
  g.camera.x = 4364; // 4750 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l6 bridge + web wall (raised slab, sealed lattice)', () => {
  const g = freshGame6();
  g.player.x = 5450; // west lip of the pit (5500-5800)
  g.camera.x = 5064; // 5450 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l6 bridge + web wall (span down, wall mid-melt)', () => {
  const g = freshGame6();
  g.level.bridge.state = 'down';
  g.level.door.state = 'opening';
  g.level.door.openT = 0.75; // halfway through the 1.5 s melt
  g.player.x = 5450;
  g.camera.x = 5064; // 5450 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l6 spider hollow (Queen mid-crawl, pips 12/16, web wall at the mouth, pillar mid-rise, her altar)', () => {
  const g = freshGame6();
  const q = g.enemies.find(e => e.kind === 'spiderboss');
  q.x = 6100; q.hp = 12;
  q.state = 'idle'; q.t = 5; q.legPhase = 2.3; // a long idle: the crawl pose
  q.pillars = [{ x: 6260, w: 40, h: 140, gy: g.level.groundY, t: 0.4 }]; // risen, standing
  g.player.x = 6184; // east of the Queen, clear of the pillar
  g.camera.x = 5798; // 6184 + 14 - 400
  expect(step({}, 1)).toMatchSnapshot();
});

test('l6 exit arch (sealed: dim, seal glow pulsing)', () => {
  const g = freshGame6();
  g.gameTime = 1.571; // sin(t*2) mid-pulse on the seal glow
  g.player.x = 6550; // between the boss altar and the arch
  g.camera.x = 6000; // max scroll: level.width - viewW
  expect(step({}, 1)).toMatchSnapshot();
});

test('l6 exit arch (unlocked: bright stairway, rising motes)', () => {
  const g = freshGame6();
  g.level.exit.locked = false;
  g.gameTime = 1.2; // motes at distinct heights
  g.player.x = 6550;
  g.camera.x = 6000; // max scroll
  expect(step({}, 1)).toMatchSnapshot();
});
