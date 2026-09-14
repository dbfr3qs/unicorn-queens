// Harness for render snapshot tests.
//
// IMPORT ORDER MATTERS: this module must be imported before any src/
// module in the test file. src/background.js generates its stars with
// Math.random at import time, and that must be the seeded PRNG from
// ./seeded-rng.js — which is why it is this file's first import (and
// must stay first).
import { reseed } from './seeded-rng.js';
import { game, startGame, update } from '../../src/game.js';
import { startIntro } from '../../src/intro.js';
import { draw } from '../../src/render/index.js';
import { input } from '../../src/input.js';
import { createRecordingCtx, pretty } from './recording-ctx.js';

export const VIEW_W = 800, VIEW_H = 600, DT = 1 / 60;

const noopFx = { play: () => {} }; // audio is never exercised in these tests

// The opening scene, at time t of its clock (the scene is a pure function
// of it; the cues before t are skipped, not fired — a snapshot has no ears).
export function freshIntro(t = 0, viewH = VIEW_H) {
  reseed();
  startIntro(viewH);
  game.intro.t = t;
  game.intro.cue = Infinity;
  return game;
}

export function freshGame(viewH = VIEW_H) {
  reseed(); // each test gets the same RNG sequence
  game.intro = null; // a scenario's game never starts inside the opening
  startGame(viewH);
  game.gameTime = 0; // per-test deterministic animation phase (bob/twinkle/flicker)
  return game;
}

// Level 2 (bridge-castle) entry: same seeding, level index 1.
export function freshGame2(viewH = VIEW_H) {
  reseed();
  startGame(viewH, 1);
  game.gameTime = 0;
  return game;
}

// Level 3 (undercroft) entry: same seeding, level index 2.
export function freshGame3(viewH = VIEW_H) {
  reseed();
  startGame(viewH, 2);
  game.gameTime = 0;
  return game;
}

// Level 4 (dragon's layer) entry: same seeding, level index 3.
export function freshGame4(viewH = VIEW_H) {
  reseed();
  startGame(viewH, 3);
  game.gameTime = 0;
  return game;
}

// Level 5 (enchanted forest) entry: same seeding, level index 4.
export function freshGame5(viewH = VIEW_H) {
  reseed();
  startGame(viewH, 4);
  game.gameTime = 0;
  return game;
}

// Level 6 (the Blackmire) entry: same seeding, level index 5.
export function freshGame6(viewH = VIEW_H) {
  reseed();
  startGame(viewH, 5);
  game.gameTime = 0;
  return game;
}

// Level 7 (the peak) entry: same seeding, level index 6.
export function freshGame7(viewH = VIEW_H) {
  reseed();
  startGame(viewH, 6);
  game.gameTime = 0;
  return game;
}

// Level 8 (the sky citadel) entry: same seeding, level index 7.
export function freshGame8(viewH = VIEW_H) {
  reseed();
  startGame(viewH, 7);
  game.gameTime = 0;
  return game;
}

// Level 9 (the frozen throne) entry: same seeding, level index 8.
export function freshGame9(viewH = VIEW_H) {
  reseed();
  startGame(viewH, 8);
  game.gameTime = 0;
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
