// Difficulty D3: easy revives in place; medium and hard still die.
import { describe, it, expect, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { hurtPlayer, REVIVE_TIME, REVIVE_INVULN, RESPAWN_MARGIN, P_W } from '../src/player.js';
import { fireballs, boulders, shockwaves } from '../src/projectiles.js';
import { setDifficulty, DEFAULT_DIFFICULTY } from '../src/difficulty.js';

const DT = 1 / 60;
const fx = (calls = []) => ({ play: n => calls.push(n) });

afterEach(() => {
  setDifficulty(DEFAULT_DIFFICULTY);
  startGame(600, 0);
});

// Level 1, standing on the ground west of the pit (820..940): the safe spot.
const boot = d => {
  setDifficulty(d);
  startGame(600, 0);
  const p = game.player;
  p.x = 600;
  for (let i = 0; i < 10; i++) update(DT, 800, fx());
  expect(p.safeX).toBe(600);
  return p;
};
const drain = p => { while (p.hp > 0) { p.invuln = 0; hurtPlayer(p, game.camera, fx()); } };
const run = (s, calls) => { for (let t = 0; t < s; t += DT) update(DT, 800, fx(calls)); };

describe('easy: out of hearts', () => {
  it('holds the world for the revive beat, then puts her back', () => {
    const p = boot('easy');
    p.boots = 6; p.stars = 2; p.hasFlight = true; p.big = true; // carried things
    drain(p);
    expect(p.dead).toBe(false);
    expect(p.reviving).toBe(REVIVE_TIME);
    const t0 = game.gameTime;
    run(REVIVE_TIME / 2, []);
    expect(game.gameTime).toBe(t0); // the world waited
    expect(p.boots).toBe(6); // timers too
    const calls = [];
    run(REVIVE_TIME / 2 + DT * 2, calls);
    expect(p.reviving).toBe(0);
    expect(p.hp).toBe(p.maxHp);
    expect(p.invuln).toBeGreaterThan(REVIVE_INVULN - 0.1);
    expect(calls).toContain('heart');
    expect([p.stars, p.hasFlight, p.big]).toEqual([2, true, true]);
    expect(p.deaths).toBe(1);
  });

  it('a fatal fall revives back from the lip', () => {
    const p = boot('easy');
    game.level.boxes = []; // the grow box at 700 sits in the respawn's way
    p.x = 820 - P_W; // the lip
    update(DT, 800, fx());
    p.hp = 1;
    p.invuln = 0; hurtPlayer(p, game.camera, fx()); // the last heart, standing on the lip
    run(REVIVE_TIME + DT * 2, []);
    expect(p.x).toBe(820 - RESPAWN_MARGIN - P_W);
  });

  it('clears the air of shots when she comes back', () => {
    const p = boot('easy');
    drain(p);
    fireballs.push({ x: 0, y: 0, w: 8, h: 8, vx: 0, vy: 0, ttl: 5 });
    boulders.push({ x: 0, y: 0, w: 8, h: 8, vx: 0, vy: 0, ttl: 5 });
    shockwaves.push({ x: 0, y: 0, w: 8, h: 8, vx: 0, ttl: 5 });
    Object.assign(game.enemies[0], { pillars: [{}], columns: [{}], spikes: [{}] }); // a stand-in for the bosses' lists
    run(REVIVE_TIME + DT * 2, []);
    expect([fireballs.length, boulders.length, shockwaves.length]).toEqual([0, 0, 0]);
    const e = game.enemies[0];
    expect([e.pillars, e.columns, e.spikes]).toEqual([[], [], []]);
  });

  it('keeps the revive count across a level advance', () => {
    const p = boot('easy');
    drain(p);
    run(REVIVE_TIME + DT * 2, []);
    p.won = true;
    startGame(600, 1, p);
    expect(game.player.deaths).toBe(1);
  });
});

describe.each(['medium', 'hard'])('%s: out of hearts', d => {
  it('is dead, as before', () => {
    const p = boot(d);
    drain(p);
    expect(p.dead).toBe(true);
    expect(p.reviving).toBe(0);
    expect(p.deaths).toBe(0);
  });
});
