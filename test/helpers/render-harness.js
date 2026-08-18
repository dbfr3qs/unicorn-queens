// Harness for render snapshot tests. See RENDER-TEST-PLAN.md.
//
// IMPORT ORDER MATTERS: this module must be imported before any src/
// module in the test file. src/background.js generates its stars with
// Math.random at import time, and that must be the seeded PRNG from
// ./seeded-rng.js — which is why it is this file's first import (and
// must stay first).
import { reseed } from './seeded-rng.js';
import { game, startGame, update } from '../../src/game.js';
import { draw } from '../../src/render/index.js';
import { input } from '../../src/input.js';
import { createRecordingCtx, pretty } from './recording-ctx.js';

export const VIEW_W = 800, VIEW_H = 600, DT = 1 / 60;

const noopFx = { play: () => {} }; // audio is never exercised in these tests

export function freshGame(viewH = VIEW_H) {
  reseed(); // each test gets the same RNG sequence
  startGame(viewH);
  return game;
}

// Simulate `frames` updates with the given keys held, then draw one
// frame to a fresh recording context. Returns the draw-call log.
// Input is reset afterwards so scenarios don't leak keys.
export function step(keys = {}, frames = 1) {
  input.left = !!keys.left;
  input.right = !!keys.right;
  input.jump = !!keys.jump;
  input.fire = !!keys.fire;
  for (let i = 0; i < frames; i++) update(DT, VIEW_W, noopFx);
  const { ctx, lines } = createRecordingCtx();
  draw(ctx, VIEW_W, VIEW_H);
  input.left = input.right = input.jump = input.fire = false;
  return pretty(lines); // indented between save/restore for readable diffs
}
