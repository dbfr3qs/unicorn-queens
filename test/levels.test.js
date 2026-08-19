import { describe, it, expect, afterEach } from 'vitest';
import { LEVELS } from '../src/levels.js';
import { game, startGame, restartTarget } from '../src/game.js';
import { createLevel } from '../src/level.js';

describe('level registry', () => {
  it('starts with level 1', () => {
    expect(LEVELS.length).toBe(1);
    const lvl = LEVELS[0].make(600);
    expect(lvl.width).toBe(2400);
    expect(lvl.groundY).toBe(560);
    expect(lvl.goal.x).toBe(2340);
  });
});

describe('startGame + restartTarget', () => {
  afterEach(() => {
    while (LEVELS.length > 1) LEVELS.pop();
    startGame(600, 0);
  });

  it('defaults to level 0', () => {
    startGame(600);
    expect(game.levelIndex).toBe(0);
    expect(game.level.width).toBe(2400);
  });

  it('R restarts the level on a loss, and on a win with no next level', () => {
    startGame(600);
    game.player.won = true;
    expect(restartTarget()).toBe(0);
    game.player.won = false;
    game.player.dead = true;
    expect(restartTarget()).toBe(0);
  });

  it('R advances on a win when a next level exists', () => {
    LEVELS.push({ name: 'stub', make: viewH => createLevel(viewH) });
    startGame(600, 0);
    game.player.won = true;
    expect(restartTarget()).toBe(1);
    startGame(600, 1);
    game.player.dead = true;
    expect(restartTarget()).toBe(1); // loss: restart, never advance
    game.player.dead = false;
    game.player.won = true;
    expect(restartTarget()).toBe(1); // final level: win restarts itself
  });
});
