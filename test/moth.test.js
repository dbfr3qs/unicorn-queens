// The clockwork moth: a 20×16, 1 hp, stompable flyer that drifts on a
// Lissajous around its anchor (amplitudes/period/phase all seeded from its
// spawn x — no Math.random, so the flight is deterministic). A player within
// 120 px draws a short dart (~200 px/s, 0.4 s) toward the trigger position,
// then a 0.8 s hover to survey, then a re-anchor to a fresh Lissajous drift
// (smooth, no jump). 2.5 s between darts. The wing flap is a pure function of
// the moth's own timer.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLevel8 } from '../src/levels/level8.js';
import { createPlayer, P_H } from '../src/player.js';
import { spawnEnemy, updateEnemies, createEnemies, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { createCamera } from '../src/camera.js';
import { startGame } from '../src/game.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });
const lvl = () => createLevel8(600);

// A moth at its anchor; the player far away (no dart at setup).
const rig = (x = 800, y = 400, over = {}) => {
  const l = lvl();
  const e = spawnEnemy({ kind: 'moth', x, y, ...over }, l);
  const p = createPlayer(l, { hasBow: true, hasFlight: true });
  p.x = x - 500; p.y = l.groundY - P_H;
  const cam = createCamera();
  return { l, e, p, cam };
};

beforeEach(() => {});
afterEach(() => startGame(600, 0));

describe('spawn', () => {
  it('registers a 20×16, 1 hp, stompable moth', () => {
    const k = getKind('moth');
    expect([k.w, k.h, k.stompable, k.hp]).toEqual([20, 16, true, 1]);
  });

  it('the L8 roster spawns 5 moths', () => {
    const m = createEnemies(lvl()).filter(e => e.kind === 'moth');
    expect(m.length).toBe(5);
  });
});

describe('drift', () => {
  it('stays within A+10 / B+10 of its anchor over 10 s (player far: never darts)', () => {
    const { l, e, p, cam } = rig(800, 400);
    updateEnemies([e], p, l, cam, DT, fx([])); // seed the Lissajous params
    const A = e.A, B = e.B, ax = e.ax, ay = e.ay;
    expect(A).toBeGreaterThan(30); expect(A).toBeLessThan(80);
    expect(B).toBeGreaterThan(10); expect(B).toBeLessThan(40);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 600; i++) {
      updateEnemies([e], p, l, cam, DT, fx([]));
      minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x);
      minY = Math.min(minY, e.y); maxY = Math.max(maxY, e.y);
      expect(e.state).toBe('drift'); // the far player never draws a dart
    }
    expect(maxX - ax).toBeLessThanOrEqual(A + 10);
    expect(ax - minX).toBeLessThanOrEqual(A + 10);
    expect(maxY - ay).toBeLessThanOrEqual(B + 10);
    expect(ay - minY).toBeLessThanOrEqual(B + 10);
  });
});

describe('dart', () => {
  it('darts at a player within 120 px (~200 px/s), hovers, then re-anchors and drifts', () => {
    const { l, e, p, cam } = rig(800, 400);
    updateEnemies([e], p, l, cam, DT, fx([])); // seed: the moth sits on its Lissajous
    // put the player 100 px to the right of the moth's CURRENT position
    p.x = e.x + 100; p.y = e.y;
    e.dartCd = 0;
    let frames = 0;
    while (e.state !== 'dart' && frames++ < 10) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('dart');
    expect(Math.hypot(e.vx, e.vy)).toBeCloseTo(200, 0); // the dart speed
    frames = 0;
    while (e.state === 'dart' && frames++ < 100) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('hover'); // the 0.4 s dart ends in a hover
    const hx = e.x, hy = e.y;
    frames = 0;
    while (e.state === 'hover' && frames++ < 100) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('drift'); // the 0.8 s hover ends back in drift
    // the re-anchor is smooth: the drift resumes from where the hover ended
    expect(Math.abs(e.x - hx)).toBeLessThan(2);
    expect(Math.abs(e.y - hy)).toBeLessThan(2);
  });

  it('does not dart again inside the 2.5 s cooldown', () => {
    const { l, e, p, cam } = rig(800, 400);
    updateEnemies([e], p, l, cam, DT, fx([])); // seed: the moth sits on its Lissajous
    p.x = e.x + 100; p.y = e.y;
    e.dartCd = 0;
    let frames = 0;
    while (e.state !== 'dart' && frames++ < 10) updateEnemies([e], p, l, cam, DT, fx([]));
    // let the first dart finish (0.4 s)
    frames = 0;
    while (e.state === 'dart' && frames++ < 100) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('hover');
    // for the next second (still inside the 2.5 s cooldown) it never re-darts
    frames = 0;
    for (let i = 0; i < 60; i++) {
      updateEnemies([e], p, l, cam, DT, fx([]));
      expect(e.state).not.toBe('dart');
    }
  });
});

describe('stomp', () => {
  it('hp 1 -> dead with a mageSpark and the bounce', () => {
    const { l, e, p, cam } = rig(800, 400);
    const calls = [];
    updateEnemies([e], p, l, cam, DT, fx(calls)); // seed first (player far: no dart)
    e.dartCd = 2.5; // no dart: the moth holds its drift for the stomp
    p.x = e.x + e.w / 2 - p.w / 2;
    p.y = e.y + 12 - p.h; // 12 px into the head, falling
    p.vy = 200;
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).toContain('stomp');
  });
});
