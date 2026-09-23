// Difficulty D2: starting hearts, the hit invulnerability window, pit damage.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createPlayer, updatePlayer, hurtPlayer, P_H } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { loot, resetLoot, updateLoot } from '../src/loot.js';
import { game, startGame } from '../src/game.js';
import { PRESETS, setDifficulty, DEFAULT_DIFFICULTY } from '../src/difficulty.js';

const DT = 1 / 60;
const fx = (calls = []) => ({ play: n => calls.push(n) });
const noInput = { left: false, right: false, jump: false, fire: false };
const itemAt = (kind, x, y) => ({ x, y, w: 16, h: 16, vx: 0, vy: 0, onGround: true, kind, taken: false, t: 0 });

afterEach(() => {
  setDifficulty(DEFAULT_DIFFICULTY);
  resetLoot();
  startGame(600, 0);
});

describe('starting hearts', () => {
  it.each([['easy', 5], ['medium', 4], ['hard', 3]])('%s starts full on %i', (d, n) => {
    setDifficulty(d);
    const p = createPlayer(createLevel(600));
    expect(p.hp).toBe(n);
    expect(p.maxHp).toBe(n);
  });

  it('a fresh game takes the preset; a restart keeps the carried cap', () => {
    setDifficulty('easy');
    startGame(600, 0);
    expect(game.player.maxHp).toBe(5);
    game.player.maxHp = 6; // picked up the heart cap
    game.player.dead = true;
    startGame(600, 0, game.player);
    expect(game.player.maxHp).toBe(6);
    expect(game.player.hp).toBe(5); // hp resets to the preset, as it always reset to 3
  });

  it('the heart cap adds one over the preset', () => {
    setDifficulty('easy');
    const l = createLevel(600);
    const p = createPlayer(l);
    p.x = 500; p.y = l.groundY - 36;
    loot.push(itemAt('heartcap', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx());
    expect(p.maxHp).toBe(6);
  });
});

describe('invulnerability after a hit', () => {
  it.each(['easy', 'medium', 'hard'])('%s uses its preset window', d => {
    setDifficulty(d);
    const p = createPlayer(createLevel(600));
    expect(hurtPlayer(p, createCamera(), fx())).toBe(true);
    expect(p.invuln).toBe(PRESETS[d].invuln);
  });
});

describe('pit falls', () => {
  const fall = () => {
    const l = createLevel(600);
    const p = createPlayer(l);
    const cam = createCamera();
    p.x = 600;
    updatePlayer(p, noInput, l, cam, DT, fx()); // settle: the safe spot
    p.x = 860; p.y = l.height; p.vy = 0; // into the pit (820..940)
    updatePlayer(p, noInput, l, cam, DT, fx());
    return { l, p };
  };

  it('cost nothing on easy, but still respawn', () => {
    setDifficulty('easy');
    const { l, p } = fall();
    expect(p.hp).toBe(5);
    expect(p.dead).toBe(false);
    expect(p.x).toBe(600);
    expect(p.y).toBe(l.groundY - P_H);
    expect(p.invuln).toBe(PRESETS.easy.invuln);
  });

  it.each([['medium', 3], ['hard', 2]])('cost a heart on %s', (d, left) => {
    setDifficulty(d);
    expect(fall().p.hp).toBe(left);
  });
});
