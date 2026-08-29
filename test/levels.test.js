import { describe, it, expect, afterEach } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { game, startGame, restartTarget } from '../src/game.js';
import { BIG_W, BIG_H, P_W, P_H } from '../src/player.js';

describe('level registry', () => {
  it('starts with level 1', () => {
    expect(LEVELS.length).toBe(6);
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

  it('Space restarts the level on a loss, and on a win with no next level', () => {
    startGame(600);
    game.player.dead = true;
    expect(restartTarget()).toBe(0); // loss: restart level 1
    game.player.dead = false;
    game.player.won = true;
    expect(restartTarget()).toBe(1); // level 1 win: a next level exists
    startGame(600, 5);
    game.player.won = true;
    expect(restartTarget()).toBe(5); // final level win: restart itself
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
    expect(restartTarget()).toBe(2); // level 2 win: advance to level 3
  });
});

describe('permanent state across levels', () => {
  afterEach(() => {
    startGame(600, 0);
  });

  it('advancing carries big + bow; hp resets to 3', () => {
    startGame(600, 0);
    game.player.big = true;
    game.player.w = BIG_W; game.player.h = BIG_H;
    game.player.hasBow = true;
    game.player.hp = 1;
    startGame(600, 1, game.player); // as the R-advance handler calls it
    expect(game.player.big).toBe(true);
    expect(game.player.w).toBe(BIG_W);
    expect(game.player.h).toBe(BIG_H);
    expect(game.player.y).toBe(game.level.groundY - BIG_H); // spawns standing, big
    expect(game.player.hasBow).toBe(true);
    expect(game.player.hp).toBe(3); // hp always resets
  });

  it('a fresh start (no prev) is small', () => {
    startGame(600, 0);
    game.player.big = true;
    game.player.w = BIG_W; game.player.h = BIG_H;
    startGame(600, 0); // death-restart: no prev
    expect(game.player.big).toBe(false);
    expect(game.player.w).toBe(P_W);
    expect(game.player.y).toBe(game.level.groundY - P_H);
  });

  it('flight spell is permanent: survives advance AND death-restart', () => {
    startGame(600, 0);
    game.player.hasFlight = true;
    startGame(600, 1, game.player); // advance
    expect(game.player.hasFlight).toBe(true);
    game.player.dead = true;
    startGame(600, 1, game.player); // death-restart: the witch's gift stays
    expect(game.player.hasFlight).toBe(true);
  });

  it('heart cap survives advance AND death-restart; big survives neither a death', () => {
    startGame(600, 0);
    game.player.maxHp = 4;
    game.player.hp = 1;
    startGame(600, 1, game.player); // advance
    expect(game.player.maxHp).toBe(4);
    expect(game.player.hp).toBe(3); // hp always resets
    // death-restart: same level, prev is dead -> cap kept, big reset
    game.player.big = true;
    game.player.w = BIG_W; game.player.h = BIG_H;
    game.player.dead = true;
    startGame(600, 1, game.player);
    expect(game.player.maxHp).toBe(4);
    expect(game.player.big).toBe(false);
    expect(game.player.w).toBe(P_W);
    expect(game.player.hp).toBe(3);
  });
});
