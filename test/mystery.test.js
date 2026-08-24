// Mystery box: seeded wildcard payload.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createLevel2 } from '../src/level2.js';
import { createPlayer, P_H, updatePlayer } from '../src/player.js';
import { loot, resetLoot, updateLoot, spawnLoot, MYSTERY_BOOTS } from '../src/loot.js';
import { resetArrows, fireArrow, updateArrows } from '../src/arrows.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });
const box = (over = {}) => ({ x: 100, y: 200, w: 32, h: 32, broken: false, ...over });
// deterministic rng: cycles the given values
const rngAt = (...vs) => { let i = 0; return () => vs[i++ % vs.length]; };

afterEach(() => {
  resetLoot();
  resetArrows();
});

describe('payload bands (seeded rng)', () => {
  it('below 0.40: a heart', () => {
    expect(spawnLoot(box({ mystery: true }), rngAt(0.10))).toBe('heart');
    expect(loot.length).toBe(1);
    expect(loot[0].kind).toBe('heart');
  });

  it('below 0.65: a three-gem fountain with spread velocities', () => {
    expect(spawnLoot(box({ mystery: true }), rngAt(0.50))).toBe('gem');
    expect(loot.length).toBe(3);
    for (const it of loot) expect(it.kind).toBe('gem');
    const vxs = loot.map(it => it.vx).sort((a, b) => a - b);
    expect(vxs[0]).toBeLessThan(vxs[1]);
    expect(vxs[2]).toBeGreaterThan(vxs[1]);
  });

  it('below 0.90: short boots; pickup grants 5 s (not the full 10)', () => {
    expect(spawnLoot(box({ mystery: true }), rngAt(0.80))).toBe('boots');
    expect(loot[0].short).toBe(true);
    const l = createLevel(600);
    const p = createPlayer(l);
    p.x = loot[0].x - 4; p.y = loot[0].y - 4;
    updateLoot(p, l, DT, fx([]));
    expect(p.boots).toBe(MYSTERY_BOOTS);
    // decays at the short duration
    for (let i = 0; i < Math.ceil(MYSTERY_BOOTS / DT) + 2; i++) updatePlayer(p, {}, l, createCamera(), DT, fx([]));
    expect(p.boots).toBe(0);
  });

  it('at 0.90 and up: a dud - no item, null return', () => {
    expect(spawnLoot(box({ mystery: true }), rngAt(0.95))).toBeNull();
    expect(loot.length).toBe(0);
  });
});

describe('integration', () => {
  it('an arrow breaking a dud mystery box plays the fizzle', () => {
    const l = createLevel(600);
    l.boxes.push({ x: 820, y: l.groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true });
    const p = createPlayer(l);
    p.hasBow = true;
    p.x = 740; p.y = l.groundY - P_H; p.facing = 1;
    const realRandom = Math.random;
    Math.random = () => 0.95; // force the dud band through the unseeded arrows path
    const calls = [];
    const cam = createCamera();
    cam.x = 340; // box at 820..856 sits on screen (arrows cull off-screen)
    try {
      fireArrow(p);
      for (let i = 0; i < 30; i++) updateArrows([], l, cam, DT, fx(calls));
    } finally {
      Math.random = realRandom;
    }
    expect(l.boxes[l.boxes.length - 1].broken).toBe(true);
    expect(calls).toContain('box');
    expect(calls).toContain('fizzle');
  });

  it('a mystery box does not consume the one-time bow', () => {
    expect(spawnLoot(box({ mystery: true }), rngAt(0.95))).toBeNull();
    expect(spawnLoot(box(), rngAt(0.5))).toBe('bow'); // bow still pending
  });

  it('regular boxes: designated drop and table rolls are untouched', () => {
    expect(spawnLoot(box({ drop: 'star' }), rngAt(0.1))).toBe('star');
    resetLoot();
    expect(spawnLoot(box(), rngAt(0.5))).toBe('bow'); // one-time bow first
    expect(spawnLoot(box(), rngAt(0.5))).toBe('gem'); // then the table: 0.5 -> gem band
  });
});

describe('placement', () => {
  it('one mystery box per level, out of the random table', () => {
    const l1 = createLevel(600).boxes.filter(b => b.mystery);
    const l2 = createLevel2(600).boxes.filter(b => b.mystery);
    expect(l1.map(b => b.x)).toEqual([1000]);
    expect(l2.map(b => b.x)).toEqual([1500]);
  });
});
