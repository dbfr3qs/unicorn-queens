// Level 3 data: the undercroft layout matches the design doc — ground
// segments, lava fissures, the key chain (marker/key/cell/door), the troll
// boss, the pearl seal, and the sealed staircase-down exit.
import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { createLevel3 } from '../src/levels/level3.js';
import { createPlayer } from '../src/player.js';
import { resolveGroundCollision } from '../src/levels/level.js';
import { spawnEnemy } from '../src/enemies.js';
import { cellApproach } from '../src/cell.js';

const lvl = createLevel3(600);
const gy = lvl.groundY;

describe('shape', () => {
  it('is registered as the third level', () => {
    expect(LEVELS[2].name).toBe('undercroft');
    expect(LEVELS[2].make(600).width).toBe(4400);
  });
  it('is 4400 wide with a dungeon zone and a hall zone', () => {
    expect(lvl.width).toBe(4400);
    expect(lvl.zones).toEqual([
      { x0: 0, x1: 3550, kind: 'dungeon' },
      { x0: 3550, x1: 4400, kind: 'dungeon-hall' },
    ]);
  });
  it('ground segments leave exactly the four lava fissures', () => {
    const segs = lvl.ground.filter(s => s.y === gy).map(s => [s.x, s.x + s.w]);
    const gaps = [];
    for (let i = 1; i < segs.length; i++) {
      const gap = [segs[i - 1][1], segs[i][0]];
      if (gap[1] > gap[0]) gaps.push(gap);
    }
    expect(gaps).toEqual([[600, 700], [1550, 1650], [2850, 2950], [3250, 3350]]);
    expect(lvl.lava.map(m => [m.x, m.x + m.w])).toEqual(gaps); // lava marks every gap
  });
  it('staircase steps down from the hall floor to the sealed exit', () => {
    const steps = lvl.ground.filter(s => s.y > gy);
    expect(steps.map(s => s.y)).toEqual([gy + 20, gy + 40, gy + 60, gy + 80]);
    expect(lvl.exit).toEqual({ x: 4300, y: gy - 10, w: 100, h: 95, locked: true });
  });
});

describe('key chain', () => {
  it('marker, key on the nook ledge, cell, and full-height door exist', () => {
    expect(lvl.marker).toMatchObject({ x: 1590, y: gy - 150, hits: 0 }); // weak brick in the wall over fissure 2, chest height from the west lip
    expect(lvl.key).toMatchObject({ x: 1620, y: gy - 256, taken: false });
    const nook = lvl.platforms.find(p => p.x === 1600 && p.w === 90);
    expect(nook).toBeTruthy();
    expect(nook.hidden).toBe(true); // ledge is inside the wall until the crumble
    expect(lvl.keyNook).toEqual({ revealed: false, crumbleT: 0 });
    expect(lvl.key.y + lvl.key.h).toBe(nook.y); // the key rests on the ledge
    expect(lvl.cell).toMatchObject({ x: 2100, y: gy - 100, w: 70, h: 100, open: false, witch: 'inside' });
    expect(lvl.door).toMatchObject({ x: 3550, y: 0, h: gy, state: 'locked' }); // floor to ceiling
  });
  it('the keyless hint beat repeats and is gated on the key', () => {
    const beat = lvl.dialogs.find(d => d.id === 'cell-hint').beats[0];
    expect(beat.repeat).toBe(true);
    expect(beat.when({ level: lvl })).toBe(true);
    lvl.key.taken = true;
    expect(beat.when({ level: lvl })).toBe(false);
  });
  it('a safety bow box sits on the ground path before the door', () => {
    const box = lvl.boxes.find(b => b.drop === 'bow');
    expect(box).toBeTruthy(); // a death-restart drops the carried bow (soft-lock fix)
    expect(box.x).toBeLessThan(lvl.door.x); // before the door: reachable on a bowless restart
    expect(box.y).toBe(gy - 36); // ground level: no item needed to reach it
    expect(box.x).toBeGreaterThan(1100); // calm stretch after the 2nd zombie patrol
    expect(box.x).toBeLessThan(1460); // right before the west lip / key nook
  });
  it('the hint rect matches the cell approach zone', () => {
    const d = lvl.dialogs.find(d => d.id === 'cell-hint');
    const a = cellApproach(lvl);
    expect([d.x, d.y, d.w, d.h]).toEqual([a.x, a.y, a.w, a.h]);
  });
});

describe('hidden nook', () => {
  it('the hidden ledge is not solid before the reveal', () => {
    const p = createPlayer(lvl);
    p.x = 1620; p.y = gy - 240 - p.h + 2; p.vy = 200; // just crossed the ledge top
    expect(resolveGroundCollision(p, lvl, 1 / 60)).toBeNull();
    expect(p.onGround).toBe(false);
  });
  it('the ledge is solid once the crumble reveals it', () => {
    const nookP = lvl.platforms.find(p => p.x === 1600 && p.w === 90);
    nookP.hidden = false;
    const p = createPlayer(lvl);
    p.x = 1620; p.y = gy - 240 - p.h + 2; p.vy = 200;
    expect(resolveGroundCollision(p, lvl, 1 / 60)).toBe(nookP);
    expect(p.onGround).toBe(true);
    nookP.hidden = true; // restore: lvl is shared module state
  });
});

describe('boss & exit', () => {
  it('the troll guards the hall; the pearl appears only when it dies', () => {
    const troll = lvl.roster.find(s => s.kind === 'troll');
    expect(troll).toMatchObject({ x: 3950, minX: 3660, maxX: 4180 });
    expect(lvl.pearl.visible).toBe(false);
    expect(lvl.pearl.showWhen([])).toBe(false);
    expect(lvl.pearl.showWhen([{ kind: 'troll', dead: false }])).toBe(false);
    expect(lvl.pearl.showWhen([{ kind: 'troll', dead: true }])).toBe(true);
  });
  it('every roster kind spawns', () => {
    for (const spec of lvl.roster) {
      const e = spawnEnemy(spec, lvl);
      expect(e.kind).toBe(spec.kind);
      expect(e.x).toBe(spec.x);
      expect(e.w).toBeGreaterThan(0);
    }
  });
  it('a player stands on the hall floor', () => {
    const p = createPlayer(lvl);
    p.x = 3800;
    p.y = gy - p.h;
    p.vy = 0;
    const s = resolveGroundCollision(p, lvl, 1 / 60);
    expect(s).not.toBeNull();
    expect(p.onGround).toBe(true);
  });
});
