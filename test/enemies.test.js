import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { createEnemies, spawnEnemy, updateEnemies, E_H, E_STOMP_V, HURT_INVULN } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });

describe('createEnemies', () => {
  it('spawns five slimes on the ground line', () => {
    const l = lvl();
    const es = createEnemies(l);
    expect(es.length).toBe(5);
    for (const e of es) {
      expect(e.kind).toBe('slime');
      expect(e.y).toBe(l.groundY - E_H);
      expect(e.dead).toBe(false);
    }
  });
});

describe('patrol', () => {
  it('turns around at the patrol bounds', () => {
    const l = lvl();
    const e = spawnEnemy({ kind: 'slime', x: 580, minX: 560, maxX: 800 }, l); // walks left from 580
    const p = createPlayer(l); // x 60, far from the enemy
    const cam = createCamera();
    let minX = Infinity;
    for (let i = 0; i < 16; i++) {
      updateEnemies([e], p, l, cam, DT, fx([]));
      minX = Math.min(minX, e.x);
    }
    expect(minX).toBeGreaterThanOrEqual(559.99); // never left the bound
    expect(e.dir).toBe(1);                       // bounced off the left edge
  });

  it('is inert once dead', () => {
    const l = lvl();
    const e = spawnEnemy({ kind: 'slime', x: 580, minX: 560, maxX: 800 }, l);
    e.dead = true;
    updateEnemies([e], createPlayer(l), l, createCamera(), DT, fx([]));
    expect(e.x).toBe(580);
  });
});

describe('stomp vs side contact', () => {
  it('stomping kills the slime and bounces the player', () => {
    const l = lvl();
    const e = spawnEnemy({ kind: 'slime', x: 560, minX: 560, maxX: 800 }, l);
    const p = createPlayer(l);
    p.x = 570;
    p.y = (l.groundY - E_H) - 36 + 8; // bottom 8px below the slime's top (< 16)
    p.vy = 200;                       // falling
    const calls = [];
    const cam = createCamera();
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).toContain('stomp');
    expect(cam.mag).toBe(5);
    expect(cam.shake).toBe(0.18);
  });

  it('side contact damages the player and grants invulnerability', () => {
    const l = lvl();
    const e = spawnEnemy({ kind: 'slime', x: 560, minX: 560, maxX: 800 }, l);
    const p = createPlayer(l);
    p.x = 570;
    p.y = l.groundY - E_H; // same top: bottom offset 36 >= 16 -> not a stomp
    p.vy = 0;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(p.hp).toBe(2);
    expect(p.invuln).toBe(HURT_INVULN);
    expect(p.vy).toBe(-250); // knockback
    expect(e.dead).toBe(false);
    expect(calls).toContain('hurt');
  });

  it('kills the player at zero hp', () => {
    const l = lvl();
    const e = spawnEnemy({ kind: 'slime', x: 560, minX: 560, maxX: 800 }, l);
    const p = createPlayer(l);
    p.x = 570;
    p.y = l.groundY - E_H;
    p.vy = 0;
    p.hp = 1;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(p.hp).toBe(0);
    expect(p.dead).toBe(true);
    expect(calls).toContain('die');
  });

  it('an invulnerable player takes no damage', () => {
    const l = lvl();
    const e = spawnEnemy({ kind: 'slime', x: 560, minX: 560, maxX: 800 }, l);
    const p = createPlayer(l);
    p.x = 570;
    p.y = l.groundY - E_H;
    p.vy = 0;
    p.invuln = 1;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(p.hp).toBe(3);
    expect(calls).not.toContain('hurt');
  });
});
