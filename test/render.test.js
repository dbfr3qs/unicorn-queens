// Render snapshot tests: pin the draw-call log for representative game
// states, so visual regressions from refactors fail here instead of
// being found by playing the level. Intentional visual change ->
// `npx vitest -u` and review the .snap diff in git.
//
// NOTE: the harness import below must stay first — it seeds
// Math.random before src/background.js generates its stars at import
// time.
import { test, expect } from 'vitest';
import { freshGame, freshGame2, step } from './helpers/render-harness.js';
import { loot } from '../src/loot.js';
import { BIG_W, BIG_H } from '../src/player.js';
import { fireFireball, FIREBALL_SPEED } from '../src/projectiles.js';

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
