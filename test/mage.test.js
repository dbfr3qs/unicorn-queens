import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V } from '../src/enemies.js';
import { resetFireballs, fireballs } from '../src/projectiles.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const m = x => spawnEnemy({ kind: 'mage', x }, lvl());

describe('spawn', () => {
  it('spawns a 42x54 boss with 5 hp on the ground line', () => {
    const e = m(2200);
    expect(e.kind).toBe('mage');
    expect(e.w).toBe(42);
    expect(e.h).toBe(54);
    expect(e.hp).toBe(5);
    expect(e.y).toBe(560 - 54);
  });
});

describe('attack cycle', () => {
  it('fires a fireball at the player after idle + windup', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000; // 180px away: in aggro range
    const cam = createCamera();
    const calls = [];
    for (let i = 0; i < 170; i++) updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(fireballs.length).toBe(1);
    expect(calls).toContain('fireball');
    expect(fireballs[0].vx).toBeLessThan(0); // flies left, toward the player
    expect(Math.abs(fireballs[0].y + 7 - (p.y + p.h / 2))).toBeLessThan(2); // aimed at player height
  });

  it('keeps at most one fireball in the air', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000;
    const cam = createCamera();
    e.state = 'idle'; e.t = 0; // ready to fire immediately
    fireballs.push({ x: 0, y: 0, w: 14, h: 14, vx: -10, vy: 0, ttl: 1, dead: false });
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(fireballs.length).toBe(1); // refused to fire a second
    expect(e.state).toBe('idle');
    fireballs.length = 0; // clear the air
    for (let i = 0; i < 80; i++) updateEnemies([e], p, l, cam, DT, fx([])); // idle remainder + windup
    expect(fireballs.length).toBe(1); // fires once the air is clear
  });
});

describe('taking damage', () => {
  it('loses one hp per arrow hit, flashes and staggers', () => {
    const e = m(2200);
    const calls = [];
    damageEnemy(e, fx(calls));
    expect(e.hp).toBe(4);
    expect(e.dead).toBe(false);
    expect(e.flash).toBeGreaterThan(0);
    expect(e.state).toBe('stagger');
    expect(calls).toContain('bossHit');
  });

  it('dies on the fifth hit with the boss death fanfare', () => {
    const e = m(2200);
    const calls = [];
    for (let i = 0; i < 5; i++) damageEnemy(e, fx(calls));
    expect(e.dead).toBe(true);
    expect(calls.filter(n => n === 'boss').length).toBe(1);
  });

  it('bounces stomps without damage (arrows only)', () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2210;
    p.y = (l.groundY - 54) - 36 + 8; // bottom 8px below the mage's top
    p.vy = 200;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(e.dead).toBe(false);
    expect(p.hp).toBe(3);
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).not.toContain('hurt');
  });
});
