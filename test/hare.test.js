// The hare: 30 px/s patrol, the 0.3 s crouch tell, the 100 px dart hop
// AWAY from the player (light gravity: apex ≈ 50 px, air ≈ 0.67 s),
// 3 s cooldown, stompable mid-hop, the softest death in the game
// (fluff puff + puff), 1 contact damage.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLevel7 } from '../src/levels/level7.js';
import { createPlayer, P_H } from '../src/player.js';
import { spawnEnemy, updateEnemies, createEnemies, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { createCamera } from '../src/camera.js';
import { resetArrows, fireArrow, updateArrows } from '../src/arrows.js';
import { startGame } from '../src/game.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });
const lvl = () => createLevel7(600);

// A hare on the snowfield, player far away, settled one frame.
const rig = (x = 800, over = {}) => {
  const l = lvl();
  const e = spawnEnemy({ kind: 'hare', x, minX: x - 150, maxX: x + 350, ...over }, l);
  const p = createPlayer(l, { hasBow: true });
  p.x = x - 500; p.y = l.groundY - P_H; // far enough: no aggro at spawn
  const cam = createCamera();
  updateEnemies([e], p, l, cam, DT, fx([])); // settle: onGround
  return { l, e, p, cam };
};

beforeEach(() => resetArrows());
afterEach(() => startGame(600, 0));

describe('spawn', () => {
  it('registers a 24×20, 1 hp, stompable hare', () => {
    const k = getKind('hare');
    expect([k.w, k.h, k.stompable]).toEqual([24, 20, true]);
    const e = spawnEnemy({ kind: 'hare', x: 800, minX: 700, maxX: 1100 }, lvl());
    expect(e.hp).toBe(1);
  });

  it('the L7 roster spawns its four hares', () => {
    const enemies = createEnemies(lvl());
    const hares = enemies.filter(e => e.kind === 'hare');
    expect(hares.length).toBe(4);
    expect(hares.map(h => h.x).sort((a, b) => a - b)).toEqual([800, 1750, 2900, 3300]);
  });
});

describe('the dart', () => {
  it('crouches 0.3 s without moving, then hops away: vx signed away, vy = −300, lands ≈ 100 px out', () => {
    const { l, e, p, cam } = rig(800);
    p.x = 700; p.y = l.groundY - P_H; // 100 px to the left: the hare darts right
    e.dartCd = 0;
    const calls = [];
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.state).toBe('crouch');
    for (let i = 0; i < 25; i++) {
      if (e.state !== 'crouch') break;
      const before = e.x;
      updateEnemies([e], p, l, cam, DT, fx(calls));
      if (e.state === 'crouch') expect(e.x).toBe(before); // no movement while crouching
    }
    expect(e.state).toBe('hop');
    expect(e.vx).toBe(150); // away from the player (player is left)
    expect(e.vy).toBe(-300);
    expect(calls).toContain('puff');
    const start = e.x;
    for (let i = 0; i < 90 && e.state !== 'recover'; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('recover');
    expect(e.x - start).toBeGreaterThan(80); // ≈ 100 px ± 20
    expect(e.x - start).toBeLessThan(120);
  });

  it('recovers 0.4 s, then patrols again', () => {
    const { l, e, p, cam } = rig(800);
    p.x = 700; p.y = l.groundY - P_H;
    e.dartCd = 0;
    for (let i = 0; i < 120 && e.state !== 'recover'; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('recover');
    for (let i = 0; i < 25; i++) updateEnemies([e], p, l, cam, DT, fx([])); // 0.4 s = 24.x frames
    expect(e.state).toBe('patrol');
    updateEnemies([e], p, l, cam, DT, fx([])); // patrol vx is set on the frame after entry
    expect(e.vx).not.toBe(0);
  });

  it('does not re-dart within the 3 s cooldown', () => {
    const { l, e, p, cam } = rig(800);
    p.x = 700; p.y = l.groundY - P_H;
    e.dartCd = 0;
    updateEnemies([e], p, l, cam, DT, fx([])); // enters the crouch
    expect(e.state).toBe('crouch');
    for (let i = 0; i < 150 && e.state !== 'patrol'; i++) updateEnemies([e], p, l, cam, DT, fx([])); // dart + recover
    expect(e.state).toBe('patrol');
    p.x = e.x - 60; // re-approach within the 160 px sight while the cooldown runs
    for (let i = 0; i < 30; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('patrol'); // seen, but the cooldown holds
  });

  it('is stompable mid-hop (the soft death: stomp + puff)', () => {
    const { l, e, p, cam } = rig(800);
    p.x = 700; p.y = l.groundY - P_H;
    e.dartCd = 0;
    const calls = [];
    for (let i = 0; i < 30 && e.state !== 'hop'; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.state).toBe('hop');
    p.x = e.x + 10; p.y = e.y - 36 + 8; p.vy = 200; // falling onto the hopping hare
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).toContain('stomp');
    expect(calls).toContain('puff');
  });
});

describe('kills', () => {
  it('an arrow kills it with the soft puff (mid-hop: a standing hare sits exactly on the arrow band)', () => {
    const { l, e, p, cam } = rig(800);
    cam.x = e.x - 300; // arrows cull at the viewport edge — keep the hare on screen
    p.x = 700; p.y = l.groundY - P_H; // the hare darts right, away
    e.dartCd = 0;
    const calls = [];
    for (let i = 0; i < 120 && !e.dead; i++) {
      if (e.state === 'hop' && e.vy > 0 && e.y > 522 && e.y < 534) { // low on the descent, into the band
        p.x = e.x - 34; p.facing = 1; fireArrow(p); // spawns overlapping the hare's left edge
      }
      updateEnemies([e], p, l, cam, DT, fx(calls));
      updateArrows([e], l, cam, DT, fx(calls), 800);
    }
    expect(e.dead).toBe(true);
    expect(calls).toContain('puff');
  });
});

describe('contact', () => {
  it('side contact does 1 damage (the shared path)', () => {
    const { l, e, p, cam } = rig(800);
    p.x = e.x + e.w - 4; p.y = e.y; p.vy = 0; p.invuln = 0; // overlapping side, no fall
    const hp0 = p.hp;
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(p.hp).toBe(hp0 - 1);
  });
});
