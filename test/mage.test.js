import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V } from '../src/enemies.js';
import { resetFireballs, fireballs, FIREBALL_SPEED } from '../src/projectiles.js';
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
    const f = fireballs[0];
    expect(f.vx).toBeLessThan(0); // flies left, toward the player
    expect(f.vy).toBeGreaterThan(10); // grounded player center is below the orb: aims down
    expect(Math.hypot(f.vx, f.vy)).toBeCloseTo(FIREBALL_SPEED, 0); // full speed, any angle
  });

  it('aims level when the player is centered on the orb height', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000;
    p.y = e.y + e.h / 2 - 19.5 - p.h / 2; // player center exactly on the orb line
    const cam = createCamera();
    for (let i = 0; i < 170; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(Math.abs(fireballs[0].vy)).toBeLessThan(0.5); // level shot
  });

  it('aims up at an elevated player', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000;
    p.y = 200; // well above the orb
    const cam = createCamera();
    for (let i = 0; i < 170; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(fireballs[0].vy).toBeLessThan(-50); // flies up-left
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

describe('levitation', () => {
  it('floats to a floatY target with eased motion, then eases back to the ground', () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1200; // out of aggro range: no firing during the test
    const cam = createCamera();
    const home = e.y;
    e.floatY = e.y - 100;
    for (let i = 0; i < 60; i++) updateEnemies([e], p, l, cam, DT, fx([])); // 150 px/s: 100px in ~40 frames
    expect(e.y).toBeCloseTo(home - 100, 5);
    expect(e.levitating).toBe(true);
    e.floatY = e.homeY;
    for (let i = 0; i < 60; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBeCloseTo(home, 5);
    expect(e.levitating).toBe(false);
  });

  it('clamps to the band top and to the arena x range', () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1200;
    const cam = createCamera();
    e.floatY = 0; // far above the band
    for (let i = 0; i < 200; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBeCloseTo(Math.max(150, l.groundY - 400), 5); // band top
    e.minX = 2100; e.maxX = 2300;
    e.x = 2000; // outside the arena on the left
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.x).toBe(2100);
    e.x = 2400; // outside on the right
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.x).toBe(2300);
  });

  it('stays frozen mid-air while staggering', () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1200;
    const cam = createCamera();
    e.floatY = e.y - 100;
    for (let i = 0; i < 60; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    const midY = e.y;
    e.state = 'stagger'; e.t = 5; // long stagger
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBe(midY); // no easing while staggered
    expect(e.levitating).toBe(true); // flag retained
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
