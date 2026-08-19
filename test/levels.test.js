import { describe, it, expect, afterEach } from 'vitest';
import { LEVELS } from '../src/levels.js';
import { game, startGame, restartTarget } from '../src/game.js';

describe('level registry', () => {
  it('starts with level 1', () => {
    expect(LEVELS.length).toBe(2);
    const lvl = LEVELS[0].make(600);
    expect(lvl.width).toBe(2400);
    expect(lvl.groundY).toBe(560);
    expect(lvl.goal.x).toBe(2340);
  });
});

describe('startGame + restartTarget', () => {
  const initialLength = LEVELS.length;
  afterEach(() => {
    while (LEVELS.length > initialLength) LEVELS.pop();
    startGame(600, 0);
  });

  it('defaults to level 0', () => {
    startGame(600);
    expect(game.levelIndex).toBe(0);
    expect(game.level.width).toBe(2400);
  });

  it('R restarts the level on a loss, and on a win with no next level', () => {
    startGame(600);
    game.player.dead = true;
    expect(restartTarget()).toBe(0); // loss: restart level 1
    game.player.dead = false;
    game.player.won = true;
    expect(restartTarget()).toBe(1); // level 1 win: a next level exists
    startGame(600, 1);
    game.player.won = true;
    expect(restartTarget()).toBe(1); // final level win: restart itself
  });

  it('R advances on a win when a next level exists', () => {
    startGame(600, 0);
    game.player.won = true;
    expect(restartTarget()).toBe(1); // advance to level 2
    startGame(600, 1);
    game.player.dead = true;
    expect(restartTarget()).toBe(1); // loss: restart, never advance
    game.player.dead = false;
    game.player.won = true;
    expect(restartTarget()).toBe(1); // final level: win restarts itself
  });
});
