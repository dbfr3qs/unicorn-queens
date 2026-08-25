import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createPlayer, P_H, BIG_W, BIG_H } from '../src/player.js';
import { loot, score, bowGiven, resetLoot, spawnLoot, updateLoot } from '../src/loot.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const lcg = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const box = (over = {}) => ({ x: 100, y: 200, w: 32, h: 32, broken: false, ...over });
// an item resting on the ground, overlapping a player standing at (500, groundY-36)
const item = (kind, l) => ({ x: 505, y: l.groundY - 16, w: 16, h: 16, vx: 0, vy: 0, onGround: true, kind, taken: false, t: 0 });

describe('spawnLoot', () => {
  it('a designated drop wins', () => {
    resetLoot();
    spawnLoot(box({ drop: 'grow' }), lcg(1));
    expect(loot[0].kind).toBe('grow');
  });

  it('the first undesignated box always drops the bow', () => {
    resetLoot();
    spawnLoot(box(), lcg(1));
    expect(loot[0].kind).toBe('bow');
    expect(bowGiven).toBe(true);
  });

  it('later boxes drop heart/gem deterministically per seed', () => {
    const roll = seed => {
      resetLoot();
      spawnLoot(box(), lcg(seed)); // consume the one-time bow
      spawnLoot(box(), lcg(seed));
      return { kind: loot[1].kind, vx: loot[1].vx };
    };
    expect(roll(42)).toEqual(roll(42)); // reproducible
  });

  it('drops a heart roughly 20% of the time', () => {
    resetLoot();
    const r = lcg(123);
    spawnLoot(box(), r); // consume the one-time bow
    let hearts = 0;
    for (let i = 0; i < 2000; i++) {
      spawnLoot(box(), r);
      if (loot[i + 1].kind === 'heart') hearts++;
    }
    expect(hearts).toBeGreaterThan(300);
    expect(hearts).toBeLessThan(500);
    resetLoot();
  });

  it('spawns centered on the box, popping upward', () => {
    resetLoot();
    spawnLoot(box({ x: 100, y: 200, w: 32 }), lcg(9));
    expect(loot[0].x).toBe(100 + 16 - 8);
    expect(loot[0].y).toBe(200 - 4);
    expect(loot[0].vy).toBe(-350);
  });
});

describe('updateLoot pickups', () => {
  const setup = kind => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 500;
    p.y = l.groundY - P_H;
    const calls = [];
    return { l, p, calls, fx: fx(calls) };
  };

  it('a gem adds a point and plays "gem"', () => {
    resetLoot();
    const { l, p, calls, fx } = setup('gem');
    loot.push(item('gem', l));
    updateLoot(p, l, DT, fx);
    expect(loot[0].taken).toBe(true);
    expect(score).toBe(1);
    expect(calls).toContain('gem');
  });

  it('a bow grants hasBow without scoring', () => {
    resetLoot();
    const { l, p, calls, fx } = setup('bow');
    loot.push(item('bow', l));
    updateLoot(p, l, DT, fx);
    expect(p.hasBow).toBe(true);
    expect(score).toBe(0);
    expect(calls).toContain('bow');
  });

  it('grow makes a small player big, centered on the feet', () => {
    resetLoot();
    const { l, p, calls, fx } = setup('grow');
    const x0 = p.x, y0 = p.y;
    loot.push(item('grow', l));
    updateLoot(p, l, DT, fx);
    expect(p.big).toBe(true);
    expect(p.w).toBe(BIG_W);
    expect(p.h).toBe(BIG_H);
    expect(p.x).toBe(x0 - (BIG_W - 28) / 2);
    expect(p.y).toBe(y0 - (BIG_H - 36));
    expect(calls).toContain('grow');
  });

  it('grow on an already-big player changes nothing', () => {
    resetLoot();
    const { l, p, calls, fx } = setup('grow');
    p.big = true; p.w = BIG_W; p.h = BIG_H;
    const x0 = p.x, y0 = p.y;
    loot.push(item('grow', l));
    updateLoot(p, l, DT, fx);
    expect(p.x).toBe(x0);
    expect(p.y).toBe(y0);
    expect(calls).toContain('grow'); // still plays
  });

  it('a heart heals, capped at 3', () => {
    resetLoot();
    const { l, p, calls, fx } = setup('heart');
    p.hp = 2;
    loot.push(item('heart', l));
    updateLoot(p, l, DT, fx);
    expect(p.hp).toBe(3);
    expect(calls).toContain('heart');
    loot.push(item('heart', l));
    updateLoot(p, l, DT, fx);
    expect(p.hp).toBe(3); // capped
  });

  it('a dead player picks up nothing', () => {
    resetLoot();
    const { l, p, fx } = setup('gem');
    p.dead = true;
    loot.push(item('gem', l));
    updateLoot(p, l, DT, fx);
    expect(loot[0].taken).toBe(false);
    expect(score).toBe(0);
  });
});

describe('updateLoot physics', () => {
  it('a dropped item falls and lands on the ground', () => {
    resetLoot();
    const l = lvl();
    const p = createPlayer(l);
    p.x = 900; // far away: no pickup
    loot.push({ x: 505, y: l.groundY - 50 - 16, w: 16, h: 16, vx: 0, vy: 0, onGround: false, kind: 'gem', taken: false, t: 0 });
    for (let i = 0; i < 30; i++) updateLoot(p, l, DT, fx([]));
    expect(loot[0].onGround).toBe(true);
    expect(loot[0].y).toBe(l.groundY - 16);
    expect(loot[0].vy).toBe(0);
  });
});
