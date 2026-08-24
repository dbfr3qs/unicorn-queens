// Mirror shield: 3 fireball reflects.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createLevel2 } from '../src/level2.js';
import { createPlayer, P_H } from '../src/player.js';
import { loot, resetLoot, updateLoot } from '../src/loot.js';
import { fireFireball, fireballs, updateFireballs, resetFireballs } from '../src/projectiles.js';
import { spawnEnemy, updateEnemies } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';
import { game, startGame } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const itemAt = (kind, x, y, onGround = true) => ({ x, y, w: 16, h: 16, vx: 0, vy: 0, onGround, kind, taken: false, t: 0 });
// player standing at x=500 with a fireball approaching from the left at
// chest height; run until it reaches the player (~7 frames)
const approach = (p, l) => {
  p.x = 500; p.y = l.groundY - P_H;
  fireFireball(460, p.y + p.h / 2 - 7, 240, 0, fx([]));
  const calls = [];
  for (let i = 0; i < 8; i++) updateFireballs(p, l, createCamera(), DT, fx(calls));
  return calls;
};

afterEach(() => {
  resetLoot();
  resetFireballs();
  startGame(600, 0);
});

describe('pickup', () => {
  it('sets the shield to 3 and plays the sfx', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 500; p.y = l.groundY - P_H;
    const calls = [];
    loot.push(itemAt('shield', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx(calls));
    expect(p.shield).toBe(3);
    expect(calls).toContain('reflect');
  });

  it('refills to the cap of 3', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 500; p.y = l.groundY - P_H;
    p.shield = 1;
    loot.push(itemAt('shield', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx([]));
    expect(p.shield).toBe(3);
    p.shield = 3;
    loot.push(itemAt('shield', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx([]));
    expect(p.shield).toBe(3); // capped
  });

  it('the shield resets on a fresh start', () => {
    startGame(600, 1);
    game.player.shield = 3;
    startGame(600, 1);
    expect(game.player.shield).toBe(0);
  });
});

describe('reflect', () => {
  it('reflected: vx flips, flag set, charge spent, no damage', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.shield = 3;
    const calls = approach(p, l);
    expect(fireballs.length).toBe(1); // still flying, now away
    expect(fireballs[0].reflected).toBe(true);
    expect(fireballs[0].vx).toBe(-240);
    expect(p.shield).toBe(2);
    expect(p.hp).toBe(3);
    expect(calls).toContain('reflect');
  });

  it('a reflected shot damages the mage and despawns', () => {
    startGame(600, 1);
    const g = game;
    const mage = g.enemies.find(e => e.kind === 'mage');
    g.player.x = 3100;
    g.player.y = g.level.groundY - P_H;
    g.player.shield = 1;
    fireFireball(3300, g.player.y + P_H / 2 - 7, -240, 0, fx([])); // from behind the mage, heading at the player
    const calls = [];
    for (let i = 0; i < 150; i++) updateFireballs(g.player, g.level, g.camera, DT, fx(calls), g.enemies);
    expect(mage.hp).toBe(4); // staggered by the reflected shot
    expect(mage.dead).toBe(false);
    expect(fireballs.length).toBe(0);
    expect(calls).toContain('reflect');
    expect(calls).toContain('bossHit');
  });

  it('at 0 shield the same contact is a normal hit', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.shield = 0;
    approach(p, l);
    expect(fireballs.length).toBe(0);
    expect(p.hp).toBe(2); // 3 -> 2
  });

  it('reflect wins over the invulnerability window', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.shield = 1;
    p.invuln = 1.0;
    approach(p, l);
    expect(fireballs.length).toBe(1);
    expect(fireballs[0].reflected).toBe(true);
    expect(p.hp).toBe(3);
  });

  it('zombie contact is not blocked by the shield', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 500; p.y = l.groundY - P_H;
    p.shield = 3;
    const z = spawnEnemy({ kind: 'slime', x: 505, minX: 500, maxX: 520 }, l);
    updateEnemies([z], p, l, createCamera(), DT, fx([]));
    expect(p.hp).toBe(2); // hit straight through
    expect(p.shield).toBe(3); // not consumed
  });
});

describe('placement', () => {
  it('one designated box, level 2 boss hall only', () => {
    expect(createLevel(600).boxes.some(b => b.drop === 'shield')).toBe(false);
    const b = createLevel2(600).boxes.find(b => b.drop === 'shield');
    expect(b).toBeTruthy();
    expect(b.x).toBeGreaterThanOrEqual(2700); // hall zone starts at 2700
  });
});
