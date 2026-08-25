// Registry integrity for the loot-items refactor: every definition is
// well-formed, the weighted table is exactly the original one (in order,
// bit-identical cumulates), and every kind the level data designates is
// registered.
import { describe, it, expect } from 'vitest';
import { REGISTRY } from '../src/loot-items/index.js';
import '../src/loot.js'; // side-effect import: registers all item files
import { createLevel } from '../src/levels/level.js';
import { createLevel2 } from '../src/levels/level2.js';

const ALL_KINDS = [
  'gem', 'bow', 'grow', 'heart', 'boots', 'magnet', 'sunbeam',
  'star', 'shield', 'hops', 'heartcap', 'lantern',
];

// The original hand-written table: [kind, cumulative weight]. The derived
// table (registry weights, 2dp-rounded cumulates) must match it exactly —
// a 1 ULP drift would shift seeded drop rolls.
const ORIGINAL_TABLE = [
  ['heart', 0.20],
  ['boots', 0.25],
  ['magnet', 0.30],
  ['sunbeam', 0.33],
  ['star', 0.37],
  ['hops', 0.41],
];

const derivedTable = () => {
  const table = [];
  let acc = 0;
  for (const def of REGISTRY.values()) {
    if (!def.weight) continue;
    acc = Number((acc + def.weight).toFixed(2));
    table.push([def.kind, acc]);
  }
  return table;
};

describe('registry shape', () => {
  it('every definition has a string kind, onPickup, and draw', () => {
    for (const [key, def] of REGISTRY) {
      expect(def.kind, key).toBe(key);
      expect(typeof def.onPickup, `${key}.onPickup`).toBe('function');
      expect(typeof def.draw, `${key}.draw`).toBe('function');
      expect(typeof def.weight, `${key}.weight`).toBe('number');
      expect(def.weight, `${key}.weight in range`).toBeGreaterThanOrEqual(0);
      expect(def.weight, `${key}.weight in range`).toBeLessThan(1);
    }
  });

  it('all 12 kinds are registered (catches a stub that never calls register)', () => {
    expect([...REGISTRY.keys()].sort()).toEqual([...ALL_KINDS].sort());
  });
});

describe('drop table derivation', () => {
  it('weighted kinds are exactly heart/boots/magnet/sunbeam/star/hops, in order', () => {
    const kinds = [...REGISTRY.values()].filter(d => d.weight).map(d => d.kind);
    expect(kinds).toEqual(['heart', 'boots', 'magnet', 'sunbeam', 'star', 'hops']);
  });

  it('derived cumulates are bit-identical to the original table', () => {
    expect(derivedTable()).toEqual(ORIGINAL_TABLE);
  });

  it('cumulates are non-decreasing and the last is <= 1', () => {
    const t = derivedTable();
    for (let i = 1; i < t.length; i++) expect(t[i][1]).toBeGreaterThanOrEqual(t[i - 1][1]);
    expect(t[t.length - 1][1]).toBeLessThanOrEqual(1);
  });
});

describe('level data drops', () => {
  it('every box.drop in both levels is a registered kind', () => {
    for (const lvl of [createLevel(), createLevel2()]) {
      for (const box of lvl.boxes) {
        if (!box.drop) continue; // plain random / mystery boxes roll the table
        expect(REGISTRY.has(box.drop), `drop '${box.drop}' is registered`).toBe(true);
      }
    }
  });
});
