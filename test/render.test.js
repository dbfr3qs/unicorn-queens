// Render snapshot tests: pin the draw-call log for representative game
// states, so visual regressions from refactors fail here instead of
// being found by playing the level. Intentional visual change ->
// `npx vitest -u` and review the .snap diff in git. See
// RENDER-TEST-PLAN.md.
//
// NOTE: the harness import below must stay first — it seeds
// Math.random before src/background.js generates its stars at import
// time.
import { test, expect } from 'vitest';
import { freshGame, step } from './helpers/render-harness.js';
import { loot } from '../src/loot.js';
import { BIG_W, BIG_H } from '../src/player.js';

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
