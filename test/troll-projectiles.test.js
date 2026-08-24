// Troll projectiles: boulders (solved gravity arc, land-dust, TTL fizzle,
// shared hurt, not shootable) and shockwaves (twin ground-bound fronts,
// one hit each, fizzle at range).
import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import {
  boulders, shockwaves, fireBoulder, fireShockwaves,
  updateBoulders, updateShockwaves, resetBoulders, resetShockwaves,
  SHOCK_SPEED,
} from '../src/projectiles.js';
import { arrows, updateArrows, resetArrows } from '../src/arrows.js';
import { particles, resetParticles } from '../src/particles.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };

function rig() {
  const l = createLevel(600);
  const p = createPlayer(l);
  p.x = 500; p.y = l.groundY - 44;
  const cam = createCamera();
  return { l, p, cam };
}

beforeEach(() => {
  resetBoulders(); resetShockwaves(); resetArrows(); resetParticles();
  calls.length = 0;
});

describe('boulders', () => {
  it('lobs in a solved arc and lands in a dust puff', () => {
    const { l, p, cam } = rig();
    p.x = 2000; // out of the way
    fireBoulder(100, 300, 300, l.groundY - 44, fx);
    expect(boulders.length).toBe(1);
    for (let i = 0; i < 120 && boulders.length; i++) {
      updateBoulders(p, l, cam, DT, fx);
    }
    expect(boulders.length).toBe(0);
    expect(calls).toContain('thud'); // landed
    // exactly one clatter = the throw itself, so it never fizzled on TTL
    expect(calls.filter(c => c === 'clatter').length).toBe(1);
    expect(particles.length).toBeGreaterThan(0); // dust puff
  });

  it('falls into a fissure silently (no ground below)', () => {
    const { l, p, cam } = rig();
    p.x = 2000;
    // Low skimming arc: stays below the 410 jump-platform that spans the
    // 820-940 gap, so the only thing missing below is the gap itself.
    fireBoulder(830, 500, 890, l.groundY + 60, fx);
    for (let i = 0; i < 240 && boulders.length; i++) updateBoulders(p, l, cam, DT, fx);
    expect(boulders.length).toBe(0);
    expect(calls).not.toContain('thud');
  });

  it('deals the shared hurt when it reaches the player', () => {
    const { l, p, cam } = rig();
    p.x = 300; p.y = l.groundY - 44; // standing where it is aimed
    const hp0 = p.hp;
    fireBoulder(100, 300, 300, l.groundY - 44, fx);
    for (let i = 0; i < 120 && p.hp === hp0; i++) updateBoulders(p, l, cam, DT, fx);
    expect(p.hp).toBe(hp0 - 1);
    expect(calls).toContain('hurt');
    expect(p.invuln).toBeGreaterThan(0);
  });

  it('arrows pass straight through a boulder (not shootable)', () => {
    const { l, p, cam } = rig();
    p.x = 400;
    boulders.push({ x: 500, y: 300, w: 18, h: 18, vx: 0, vy: 0, ttl: 60, dead: false });
    arrows.push({ x: 400, y: 306, vx: 520, dead: false }); // arrow band crosses the boulder
    for (let i = 0; i < 15; i++) {
      updateArrows([], l, cam, DT, fx);
      updateBoulders(p, l, cam, DT, fx);
    }
    expect(arrows.length).toBe(1);
    expect(arrows[0].x).toBeGreaterThan(518); // flew clean through
    expect(boulders.length).toBe(1); // and so did the boulder
    expect(calls).not.toContain('thud');
  });
});

describe('shockwaves', () => {
  it('spawns two ground-bound fronts rolling opposite ways at 180 px/s', () => {
    const { l, p, cam } = rig();
    p.x = 2000;
    fireShockwaves(500, l.groundY, fx);
    expect(shockwaves.length).toBe(2);
    expect(calls).toContain('rumble');
    const [left, right] = [...shockwaves].sort((a, b) => a.vx - b.vx);
    expect(left.vx).toBe(-SHOCK_SPEED);
    expect(right.vx).toBe(SHOCK_SPEED);
    for (const s of shockwaves) expect(s.y).toBe(l.groundY - s.h); // riding the ground
    const lx = left.x, rx = right.x;
    updateShockwaves(p, cam, DT, fx);
    expect(left.x - lx).toBeCloseTo(-SHOCK_SPEED * DT, 5);
    expect(right.x - rx).toBeCloseTo(SHOCK_SPEED * DT, 5);
  });

  it('fizzles at range with a clatter, both fronts', () => {
    const { l, p, cam } = rig();
    p.x = 2000;
    fireShockwaves(500, l.groundY, fx);
    for (let i = 0; i < 75 && shockwaves.length; i++) updateShockwaves(p, cam, DT, fx); // 1.2 s + margin
    expect(shockwaves.length).toBe(0);
    expect(calls.filter(c => c === 'clatter').length).toBe(2);
  });

  it('hits the player once per wavefront, then rides through harmlessly', () => {
    const { l, p, cam } = rig();
    p.x = 560; p.y = l.groundY - 44; // just east of the slam point
    const hp0 = p.hp;
    fireShockwaves(500, l.groundY, fx);
    for (let i = 0; i < 60 && p.hp === hp0; i++) updateShockwaves(p, cam, DT, fx);
    expect(p.hp).toBe(hp0 - 1); // the east front caught the player
    const hp1 = p.hp;
    for (let i = 0; i < 40; i++) updateShockwaves(p, cam, DT, fx); // overlap + after
    expect(p.hp).toBe(hp1); // one hit per wave
  });
});
