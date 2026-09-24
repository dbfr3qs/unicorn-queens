// Difficulty D4: boss phase edges and pip bars follow the hp a boss
// spawned with (e.maxHp), and are exactly the designed numbers at hard.
import { describe, it, expect } from 'vitest';
import { phaseEdge, pipMax } from '../src/enemies/phase.js';
import { spawnEnemy } from '../src/enemies.js';
import { phaseOf, pipRows, pipsPerRow, P2_AT, P3_AT, QUEEN_HP } from '../src/enemies/queenboss.js';
import { pipCount } from '../src/enemies/warden.js';
import { createLevel } from '../src/levels/level.js';

describe('phaseEdge', () => {
  it('is the written edge when maxHp is the designed hp (hard)', () => {
    expect(phaseEdge({ maxHp: 14 }, 7, 14)).toBe(7);
    expect(phaseEdge({}, 7, 14)).toBe(7); // a hand-built boss with no maxHp
  });

  it('scales in proportion, rounded', () => {
    expect(phaseEdge({ maxHp: 8 }, 7, 14)).toBe(4);
    expect(phaseEdge({ maxHp: 3 }, 2, 5)).toBe(1);
  });

  it('pipMax is the spawn hp, else the design', () => {
    expect(pipMax({ maxHp: 10 }, 16)).toBe(10);
    expect(pipMax({}, 16)).toBe(16);
  });
});

describe('spawn', () => {
  it.each(['mage', 'troll', 'dragon', 'spiderboss', 'wizardboss', 'warden', 'queenboss'])('%s records maxHp = hp', kind => {
    const e = spawnEnemy({ kind, x: 100 }, createLevel(600));
    expect(e.maxHp).toBe(e.hp);
    expect(e.hp).toBeGreaterThan(1);
  });
});

describe('the Frost Queen at a scaled hp', () => {
  it('hard: three winters at P2_AT and P3_AT, rows of a third', () => {
    const e = { hp: QUEEN_HP, maxHp: QUEEN_HP };
    expect(pipsPerRow(e)).toBe(QUEEN_HP / 3);
    expect([P2_AT + 1, P2_AT, P3_AT].map(hp => phaseOf({ ...e, hp }))).toEqual([1, 2, 3]);
  });

  it('15 hp: rows of five, winters at 10 and 5', () => {
    const e = { hp: 15, maxHp: 15 };
    expect(pipsPerRow(e)).toBe(5);
    expect(pipRows(e)).toEqual([5, 5, 5]);
    expect([11, 10, 6, 5].map(hp => phaseOf({ ...e, hp }))).toEqual([1, 2, 2, 3]);
    expect(pipRows({ ...e, hp: 7 })).toEqual([0, 2, 5]);
  });
});

describe('the Warden at a scaled hp', () => {
  it('shows only the pips he spawned with', () => {
    expect(pipCount({ hp: 16, maxHp: 10 })).toBe(10);
    expect(pipCount({ hp: 16 })).toBe(16);
  });
});
