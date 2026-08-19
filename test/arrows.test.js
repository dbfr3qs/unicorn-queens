import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer, P_H } from '../src/player.js';
import { spawnEnemy, E_H } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';
import { resetLoot, loot } from '../src/loot.js';
import { arrows, resetArrows, fireArrow, updateArrows, ARROW_SPEED } from '../src/arrows.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });

beforeEach(() => {
  resetArrows();
  resetLoot();
});

describe('fireArrow', () => {
  it('shoots from the front edge at chest height, facing right', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 200;
    fireArrow(p);
    expect(arrows.length).toBe(1);
    expect(arrows[0].x).toBe(200 + p.w);
    expect(arrows[0].y).toBe(l.groundY - P_H + P_H - 24); // chest height
    expect(arrows[0].vx).toBe(ARROW_SPEED);
  });

  it('shoots backward when facing left', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 200;
    p.facing = -1;
    fireArrow(p);
    expect(arrows[0].x).toBe(200 - 14);
    expect(arrows[0].vx).toBe(-ARROW_SPEED);
  });
});

describe('updateArrows', () => {
  it('hits an enemy it overlaps', () => {
    const l = lvl();
    const e = spawnEnemy({ kind: 'slime', x: 560, minX: 560, maxX: 800 }, l);
    const cam = createCamera();
    arrows.push({ x: 555, y: l.groundY - E_H + 10, vx: ARROW_SPEED, dead: false });
    const calls = [];
    updateArrows([e], l, cam, DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(arrows.length).toBe(0); // dead arrows are culled
    expect(calls).toContain('thwack');
    expect(cam.mag).toBe(3);
    expect(cam.shake).toBe(0.12);
  });

  it('misses an enemy it flies over', () => {
    const l = lvl();
    const e = spawnEnemy({ kind: 'slime', x: 560, minX: 560, maxX: 800 }, l);
    arrows.push({ x: 555, y: l.groundY - E_H - 10, vx: ARROW_SPEED, dead: false }); // 10px above the top
    const calls = [];
    updateArrows([e], l, createCamera(), DT, fx(calls));
    expect(e.dead).toBe(false);
    expect(arrows.length).toBe(1);
    expect(calls).not.toContain('thwack');
  });

  it('breaks a box from range and spawns its loot', () => {
    const l = lvl();
    const box = l.boxes[0]; // x 450..486, y groundY-36 .. groundY
    const cam = createCamera();
    arrows.push({ x: 440, y: l.groundY - E_H, vx: ARROW_SPEED, dead: false });
    const calls = [];
    updateArrows([], l, cam, DT, fx(calls));
    expect(box.broken).toBe(true);
    expect(arrows.length).toBe(0);
    expect(loot.length).toBe(1); // spawnLoot(b) was called
    expect(calls).toContain('box');
    expect(cam.mag).toBe(4);
    expect(cam.shake).toBe(0.15);
  });

  it('does not re-break a broken box', () => {
    const l = lvl();
    l.boxes[0].broken = true;
    arrows.push({ x: 440, y: l.groundY - E_H, vx: ARROW_SPEED, dead: false });
    updateArrows([], l, createCamera(), DT, fx([]));
    expect(loot.length).toBe(0);
  });

  it('culls arrows that leave the world, either edge', () => {
    const l = lvl();
    arrows.push({ x: 2415, y: 300, vx: ARROW_SPEED, dead: false });
    arrows.push({ x: -15, y: 300, vx: -ARROW_SPEED, dead: false });
    updateArrows([], l, createCamera(), DT, fx([]));
    expect(arrows.length).toBe(0);
  });
});
