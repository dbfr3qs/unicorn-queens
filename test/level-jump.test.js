// The ?level=N test jump: the URL parser (levels/index.js) and the design
// carry each level gets on a fresh boot (startGame with no prev). The
// death-restart drop-bow rule must stay untouched.
import { describe, it, expect, afterEach } from 'vitest';
import { game, startGame } from '../src/game.js';
import { LEVELS, levelIndexFromSearch } from '../src/levels/index.js';

afterEach(() => { startGame(600, 0); });

describe('levelIndexFromSearch', () => {
  it('missing or garbage falls back to level 1', () => {
    expect(levelIndexFromSearch('')).toBe(0);
    expect(levelIndexFromSearch('?foo=2')).toBe(0);
    expect(levelIndexFromSearch('?level=')).toBe(0);
    expect(levelIndexFromSearch('?level=abc')).toBe(0);
  });

  it('is 1-based and clamped to the level list', () => {
    expect(levelIndexFromSearch('?level=1')).toBe(0);
    expect(levelIndexFromSearch('?level=3')).toBe(2);
    expect(levelIndexFromSearch('?level=9')).toBe(LEVELS.length - 1);
    expect(levelIndexFromSearch('?level=7')).toBe(6);
    expect(levelIndexFromSearch('?level=0')).toBe(0);
    expect(levelIndexFromSearch('?level=99')).toBe(0);
  });

  it('reads level among other params', () => {
    expect(levelIndexFromSearch('?sound=off&level=4')).toBe(3);
  });
});

describe('design carry on a fresh boot', () => {
  it('level 6 boots with bow + flight (the run gear)', () => {
    startGame(600, 5);
    expect(game.player.hasBow).toBe(true);
    expect(game.player.hasFlight).toBe(true);
    expect(game.level.width).toBe(6800);
  });

  it('level 1 boots bare; level 2 gets its own startItems bow', () => {
    startGame(600, 0);
    expect(game.player.hasBow).toBe(false);
    expect(game.player.hasFlight).toBe(false);
    startGame(600, 1);
    expect(game.player.hasBow).toBe(true);
    expect(game.player.hasFlight).toBe(false);
  });

  it("level 3 carries the bow; flight is still the witch's to earn", () => {
    startGame(600, 2);
    expect(game.player.hasBow).toBe(true);
    expect(game.player.hasFlight).toBe(false);
  });

  it('levels 4 and 5 carry bow + flight', () => {
    startGame(600, 3);
    expect(game.player.hasBow).toBe(true);
    expect(game.player.hasFlight).toBe(true);
    startGame(600, 4);
    expect(game.player.hasBow).toBe(true);
    expect(game.player.hasFlight).toBe(true);
  });

  it('a death-restart still drops the bow (carry is fresh-boots only)', () => {
    startGame(600, 2);
    expect(game.player.hasBow).toBe(true);
    startGame(600, 2, game.player); // same index: not an advance
    expect(game.player.hasBow).toBe(false);
  });
});
