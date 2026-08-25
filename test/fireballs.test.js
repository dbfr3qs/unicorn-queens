import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { fireFireball, updateFireballs, resetFireballs, fireballs, FIREBALL_SIZE, FIREBALL_TTL } from '../src/projectiles.js';
import { resetArrows, updateArrows, arrows, ARROW_SPEED } from '../src/arrows.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const fresh = () => { resetFireballs(); resetArrows(); };

describe('fireballs', () => {
  it('fly straight with no gravity', () => {
    fresh();
    const l = lvl();
    const p = createPlayer(l);
    fireFireball(200, 300, 240, 0, fx([]));
    expect(fireballs.length).toBe(1);
    expect(fireballs[0].w).toBe(FIREBALL_SIZE);
    expect(fireballs[0].ttl).toBe(FIREBALL_TTL);
    const x0 = fireballs[0].x, y0 = fireballs[0].y;
    const calls = [];
    for (let i = 0; i < 10; i++) updateFireballs(p, l, createCamera(), DT, fx(calls));
    expect(fireballs[0].x).toBeCloseTo(x0 + 240 * 10 * DT, 5);
    expect(fireballs[0].y).toBe(y0); // no gravity
  });

  it('keep a constant velocity when fired diagonally (no gravity, no steering)', () => {
    fresh();
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1000; // out of the way
    fireFireball(200, 300, 192, -144, fx([])); // 3-4-5 triangle at full speed
    const f = fireballs[0];
    const x0 = f.x, y0 = f.y;
    const calls = [];
    for (let i = 0; i < 30; i++) updateFireballs(p, l, createCamera(), DT, fx(calls));
    expect(fireballs.length).toBe(1); // still alive: no surface in its path
    expect(fireballs[0].vx).toBe(192);
    expect(fireballs[0].vy).toBe(-144);
    expect(fireballs[0].x).toBeCloseTo(x0 + 192 * 30 * DT, 5);
    expect(fireballs[0].y).toBeCloseTo(y0 - 144 * 30 * DT, 5);
  });

  it('fizzles out after the TTL', () => {
    fresh();
    const l = lvl();
    const p = createPlayer(l);
    fireFireball(200, 300, 240, 0, fx([]));
    const calls = [];
    for (let i = 0; i < 185; i++) updateFireballs(p, l, createCamera(), DT, fx(calls)); // ~3s
    expect(fireballs.length).toBe(0);
    expect(calls).toContain('fizzle');
  });

  it('fizzles when it hits the ground', () => {
    fresh();
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1000; // out of the way
    fireFireball(200, l.groundY - FIREBALL_SIZE + 1, 240, 0, fx([])); // 1px into the ground
    const calls = [];
    updateFireballs(p, l, createCamera(), DT, fx(calls));
    expect(fireballs.length).toBe(0);
    expect(calls).toContain('fizzle');
  });

  it('hurts the player on contact (shared hurt)', () => {
    fresh();
    const l = lvl();
    const p = createPlayer(l); // x 60, on the ground
    const calls = [];
    fireFireball(100, l.groundY - 26, -240, 0, fx(calls)); // flying left, at player height
    for (let i = 0; i < 6; i++) updateFireballs(p, l, createCamera(), DT, fx(calls));
    expect(fireballs.length).toBe(0);
    expect(p.hp).toBe(2);
    expect(calls).toContain('fireball');
    expect(calls).toContain('hurt');
  });

  it('are not shootable: arrows pass through', () => {
    fresh();
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000; // far away
    const calls = [];
    fireFireball(500, 300, 0, 0, fx(calls));
    arrows.push({ x: 500, y: 300, vx: ARROW_SPEED, dead: false }); // same spot
    updateFireballs(p, l, createCamera(), DT, fx(calls));
    updateArrows([], l, createCamera(), DT, fx(calls));
    expect(fireballs.length).toBe(1); // fireball unaffected
    expect(arrows[0].x).toBeGreaterThan(500); // arrow kept flying
  });
});
