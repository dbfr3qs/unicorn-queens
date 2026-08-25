// The shaft beat: sealed until the pearl breaks the exit seal, then the
// lattice retracts over SHAFT_OPEN s (one rumble) and the shaft stays open.
// The exit rect only triggers from the air above the hole.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update, reachedExit } from '../src/game.js';
import { input } from '../src/input.js';
import { SHAFT_OPEN } from '../src/shaft.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const frames = (n) => { for (let i = 0; i < n; i++) update(DT, 800, fx); };

beforeEach(() => {
  startGame(600, 3);
  calls.length = 0;
});
afterEach(() => { input.left = input.right = input.jump = input.fire = false; });

it('stays sealed while the exit is locked', () => {
  frames(30);
  expect(game.level.shaft.state).toBe('sealed');
  expect(calls).not.toContain('rumble');
});

it('the full pearl beat: pickup breaks the seal, gate retracts, one rumble', () => {
  game.level.pearl.visible = true; // as if the dragon had died
  const g = game;
  g.player.x = g.level.pearl.x - 8;
  g.player.y = g.level.pearl.y - 4; // jump for it: the pearl floats above head height
  frames(5); // overlap -> pearl taken, exit unlocked, shaft starts opening
  expect(g.level.pearl.taken).toBe(true);
  expect(g.level.exit.locked).toBe(false);
  expect(g.level.shaft.state).toBe('opening');
  expect(calls.filter(c => c === 'rumble').length).toBe(1);
  frames(Math.ceil((SHAFT_OPEN + 0.1) / DT));
  expect(g.level.shaft.state).toBe('open');
  expect(calls.filter(c => c === 'rumble').length).toBe(1); // rumble only at the start
});

it('retracts linearly: openT counts down and the state never re-seals', () => {
  game.level.exit.locked = false;
  frames(1);
  const s = game.level.shaft;
  expect(s.state).toBe('opening');
  const t0 = s.openT;
  frames(10);
  expect(s.openT).toBeCloseTo(t0 - 10 * DT, 5);
  game.level.exit.locked = true; // even if the seal came back, no re-seal
  frames(Math.ceil(SHAFT_OPEN / DT));
  expect(s.state).toBe('open');
});

it('the exit rect only triggers from the air above the opened shaft', () => {
  const g = game;
  g.level.exit.locked = false; // unlocked but the player is on the floor
  g.player.x = g.level.exit.x + 30;
  g.player.y = g.level.groundY - g.player.h;
  expect(reachedExit(g.player, g.level)).toBe(false); // floor: no overlap
  g.player.y = 40; // flying up through the hole (y 0-70)
  expect(reachedExit(g.player, g.level)).toBe(true);
  g.level.exit.locked = true;
  expect(reachedExit(g.player, g.level)).toBe(false); // locked again
});
