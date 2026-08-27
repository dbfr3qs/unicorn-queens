// The mist gate: locked (standing in the exit does not win), the q3
// onOpen unlocks it, openT decays 1.5 -> 0 over the game update and the
// field stays open, a restart re-locks (fresh level data).
import { describe, it, expect, beforeEach } from 'vitest';
import { game, startGame, update, reachedExit } from '../src/game.js';
import { updateMistgate, MIST_OPEN } from '../src/mistgate.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };

beforeEach(() => {
  calls.length = 0;
  startGame(600, 4);
});

// The queen's story beat (q3) and its onOpen hook.
const q3 = () => game.level.dialogs.find(d => d.id === 'queen').beats[3];

const standInExit = () => {
  const e = game.level.exit;
  game.player.x = e.x + 6;
  game.player.y = e.y + e.h - game.player.h;
};

describe('the locked gate', () => {
  it('starts locked with openT at 0', () => {
    expect(game.level.exit.locked).toBe(true);
    expect(game.level.mistgate.openT).toBe(0);
  });

  it('standing in the exit rect does not win while locked', () => {
    standInExit();
    update(DT, 800, fx);
    expect(reachedExit(game.player, game.level)).toBe(false);
    expect(game.player.won).toBe(false);
    expect(calls).not.toContain('win');
  });
});

describe('the q3 unlock', () => {
  it('onOpen unlocks the exit and starts the brightening', () => {
    q3().onOpen(game, fx);
    expect(game.level.exit.locked).toBe(false);
    expect(game.level.mistgate.openT).toBe(MIST_OPEN);
    expect(game.level.queen.toldStory).toBe(true);
    expect(calls).toContain('seal');
  });

  it('after the unlock, the same position wins', () => {
    q3().onOpen(game, fx);
    standInExit();
    update(DT, 800, fx);
    expect(reachedExit(game.player, game.level)).toBe(true);
    expect(game.player.won).toBe(true);
    expect(calls).toContain('win');
  });
});

describe('the brightening', () => {
  it('openT decays to 0 over 1.5 s of updates; the exit stays open', () => {
    game.player.x = 3300; // out of the intro band, so the world isn't frozen
    game.player.y = game.level.groundY - game.player.h;
    q3().onOpen(game, fx);
    for (let i = 0; i < Math.ceil(MIST_OPEN / DT) + 1; i++) update(DT, 800, fx);
    expect(game.level.mistgate.openT).toBe(0);
    expect(game.level.exit.locked).toBe(false);
    standInExit();
    update(DT, 800, fx);
    expect(game.player.won).toBe(true); // the field stays open after the brighten
  });

  it('decays by direct updateMistgate calls too', () => {
    q3().onOpen(game, fx);
    updateMistgate(game.level, MIST_OPEN / 2);
    expect(game.level.mistgate.openT).toBeCloseTo(MIST_OPEN / 2, 5);
    updateMistgate(game.level, MIST_OPEN); // overshoots to exactly 0
    expect(game.level.mistgate.openT).toBe(0);
  });

  it('a restart re-locks the gate (fresh level data)', () => {
    q3().onOpen(game, fx);
    update(DT, 800, fx);
    startGame(600, 4);
    expect(game.level.exit.locked).toBe(true);
    expect(game.level.mistgate.openT).toBe(0);
    expect(game.level.queen.toldStory).toBe(false);
    standInExit();
    update(DT, 800, fx);
    expect(game.player.won).toBe(false);
  });
});
