import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, E_STOMP_V, HURT_INVULN } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const g = (x, y) => spawnEnemy({ kind: 'ghost', x, y }, lvl());

describe('spawn', () => {
  it('spawns a 28x26 ghost at the given height', () => {
    const e = g(800, 300);
    expect(e.kind).toBe('ghost');
    expect(e.w).toBe(28);
    expect(e.h).toBe(26);
    expect(e.y).toBe(300);
  });
});

describe('hovering', () => {
  it('bobs at its home point while the player is far', () => {
    const e = g(800, 300);
    const l = lvl();
    const p = createPlayer(l); // x 60 — far away
    const cam = createCamera();
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 120; i++) { // one full bob period
      updateEnemies([e], p, l, cam, DT, fx([]));
      minY = Math.min(minY, e.y);
      maxY = Math.max(maxY, e.y);
    }
    expect(maxY).toBeLessThanOrEqual(300 + 14.05);
    expect(minY).toBeGreaterThanOrEqual(300 - 14.05);
    expect(maxY - minY).toBeGreaterThan(20); // really oscillating
  });

  it('drifts toward the player while in range', () => {
    const e = g(800, 480);
    const p = createPlayer(lvl());
    p.x = 600; // centers 614 vs 814: dx -200 in range; dy 49 in range
    updateEnemies([e], p, lvl(), createCamera(), DT, fx([]));
    expect(e.x).toBeLessThan(800); // moving left, toward the player
    expect(e.y).toBeGreaterThan(480); // and down
  });

  it('eases back to home when the player leaves range', () => {
    const e = g(800, 480);
    const p = createPlayer(lvl());
    p.x = 600;
    const l = lvl();
    updateEnemies([e], p, l, createCamera(), DT, fx([])); // drifting left
    const xAfterAggro = e.x;
    p.x = 2000; // far right: out of range
    updateEnemies([e], p, l, createCamera(), DT, fx([]));
    expect(e.x).toBeGreaterThan(xAfterAggro); // easing back right, toward home
  });
});

describe('contact', () => {
  it('side contact damages the player', () => {
    const e = g(560, 524);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 570;
    p.y = l.groundY - 36;
    p.vy = 0;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(p.hp).toBe(2);
    expect(p.invuln).toBe(HURT_INVULN);
    expect(e.dead).toBe(false);
    expect(calls).toContain('hurt');
  });

  it('stomping bounces the player off without damage or kill', () => {
    const e = g(560, 520);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 570;
    p.y = 520 - 36 + 8; // bottom 8px below the ghost's top
    p.vy = 200;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(e.dead).toBe(false);
    expect(p.hp).toBe(3);
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).not.toContain('hurt');
    expect(calls).not.toContain('stomp');
  });
});
