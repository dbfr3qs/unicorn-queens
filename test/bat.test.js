// Bat: hovers at its roost, swoops at the player in a sine curve on aggro
// (with a quiet flap), returns to roost; stompable and arrow-killable.
import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, E_STOMP_V, HURT_INVULN } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';
import { resetArrows, fireArrow, updateArrows } from '../src/arrows.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const g = (x, y) => spawnEnemy({ kind: 'bat', x, y, minX: x - 150, maxX: x + 150 }, lvl());

beforeEach(() => resetArrows());

describe('spawn', () => {
  it('spawns a 24x18 bat at the given height with 1 hp', () => {
    const e = g(800, 300);
    expect(e.kind).toBe('bat');
    expect([e.w, e.h, e.hp, e.y]).toEqual([24, 18, 1, 300]);
  });
});

describe('hovering', () => {
  it('bobs at its roost while the player is far away', () => {
    const e = g(800, 300);
    const l = lvl();
    const p = createPlayer(l); // x 60 — far away
    const cam = createCamera();
    let minY = Infinity, maxY = -Infinity, maxDrift = 0;
    for (let i = 0; i < 120; i++) { // one full bob period
      updateEnemies([e], p, l, cam, DT, fx([]));
      minY = Math.min(minY, e.y); maxY = Math.max(maxY, e.y);
      maxDrift = Math.max(maxDrift, Math.abs(e.x - 800));
    }
    expect(minY).toBeGreaterThanOrEqual(300 - 10);
    expect(maxY).toBeLessThanOrEqual(300 + 10);
    expect(maxDrift).toBeLessThan(5); // stays at its roost x
  });
});

describe('swooping', () => {
  it('swoops down at a player below, with a quiet flap', () => {
    const e = g(800, 300);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 790; p.y = l.groundY - 36; // on the ground below the roost
    const cam = createCamera();
    const calls = [];
    for (let i = 0; i < 30 && e.state !== 'swoop'; i++) {
      updateEnemies([e], p, l, cam, DT, fx(calls));
    }
    expect(e.state).toBe('swoop');
    expect(calls).toContain('flap');
    const y0 = e.y;
    for (let i = 0; i < 20; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBeGreaterThan(y0 + 10); // descending toward the player
  });

  it('returns to roost after the swoop once the player is gone', () => {
    const e = g(800, 300);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 790; p.y = l.groundY - 36;
    const cam = createCamera();
    for (let i = 0; i < 120; i++) updateEnemies([e], p, l, cam, DT, fx([])); // swoop + return starts
    p.x = 100; // the player walks away
    for (let i = 0; i < 300; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('hover');
    expect(Math.abs(e.x - 800)).toBeLessThan(4);
    expect(Math.abs(e.y - 300)).toBeLessThan(12); // bob amplitude + ease
  });

  it('does not aggro a player well above the roost', () => {
    const e = g(800, 300);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 790; p.y = 300 - 36 - 320; // 320 px above: outside aggroDy 280
    const cam = createCamera();
    for (let i = 0; i < 60; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('hover');
  });
});

describe('contact', () => {
  it('side contact damages the player', () => {
    const e = g(560, 524);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 570; p.y = l.groundY - 36; p.vy = 0;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(p.hp).toBe(2);
    expect(p.invuln).toBe(HURT_INVULN);
    expect(e.dead).toBe(false);
    expect(calls).toContain('hurt');
  });

  it('stomping kills the bat and bounces the player', () => {
    const e = g(560, 520);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 570;
    p.y = 520 - 36 + 8; // falling, bottom 8px below the bat's top
    p.vy = 200;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(p.hp).toBe(3); // no damage
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).toContain('stomp');
  });
});

describe('arrows', () => {
  it('an arrow kills the bat (1 hp)', () => {
    const l = lvl();
    // bat in front of the first box (450): a stray arrow would break it first
    const e = g(400, 522); // bat spans 522-540: overlaps the arrow band (536-540)
    const p = createPlayer(l);
    p.x = 300; p.y = l.groundY - 36; p.hasBow = true;
    p.facing = 1;
    fireArrow(p);
    const calls = [];
    for (let i = 0; i < 40 && !e.dead; i++) {
      updateArrows([e], l, createCamera(), DT, fx(calls), 800);
    }
    expect(e.dead).toBe(true);
    expect(calls).toContain('thwack');
  });
});
