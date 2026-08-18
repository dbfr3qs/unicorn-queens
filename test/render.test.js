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
