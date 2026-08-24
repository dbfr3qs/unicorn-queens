// Registry integrity for the enemies refactor: every definition is
// well-formed, the kind set is exactly the registered one, the per-kind
// sizes/stomp rules (and boss hp) match the KINDS table, and every
// roster spec in both levels dispatches to a registered kind.
import { describe, it, expect } from 'vitest';
import { REGISTRY } from '../src/enemies/index.js';
import { spawnEnemy } from '../src/enemies.js'; // side effect: registers all kind files
import { createLevel } from '../src/level.js';
import { createLevel2 } from '../src/level2.js';

const ALL_KINDS = ['slime', 'zombie', 'ghost', 'mage', 'troll'];

// The KINDS table, per kind: size, stomp rule, and (boss only) hp.
// The registry must match it exactly.
const EXPECTED = {
  slime: { w: 30, h: 28, stompable: true },
  zombie: { w: 34, h: 40, stompable: true },
  ghost: { w: 28, h: 26, stompable: false },
  mage: { w: 42, h: 54, stompable: false, hp: 5 },
  troll: { w: 52, h: 64, stompable: false, hp: 8 },
};

describe('registry shape', () => {
  it('every definition has a matching kind, size, stomp rule, update, and draw', () => {
    for (const [key, def] of REGISTRY) {
      expect(def.kind, key).toBe(key);
      expect(typeof def.w, `${key}.w`).toBe('number');
      expect(def.w, `${key}.w > 0`).toBeGreaterThan(0);
      expect(typeof def.h, `${key}.h`).toBe('number');
      expect(def.h, `${key}.h > 0`).toBeGreaterThan(0);
      expect(typeof def.stompable, `${key}.stompable`).toBe('boolean');
      expect(typeof def.update, `${key}.update`).toBe('function');
      expect(typeof def.draw, `${key}.draw`).toBe('function');
    }
  });

  it('all 5 kinds are registered (catches a stub that never calls register)', () => {
    expect([...REGISTRY.keys()].sort()).toEqual([...ALL_KINDS].sort());
  });
});

describe('per-kind values match the original table', () => {
  for (const kind of ALL_KINDS) {
    it(`${kind}: w/h/stompable${EXPECTED[kind].hp !== undefined ? '/hp' : ''} unchanged`, () => {
      const def = REGISTRY.get(kind);
      expect(def.w).toBe(EXPECTED[kind].w);
      expect(def.h).toBe(EXPECTED[kind].h);
      expect(def.stompable).toBe(EXPECTED[kind].stompable);
      if (EXPECTED[kind].hp !== undefined) expect(def.hp).toBe(EXPECTED[kind].hp);
    });
  }
});

describe('level rosters', () => {
  it('every roster spec in both levels is a registered kind', () => {
    for (const lvl of [createLevel(), createLevel2()]) {
      for (const spec of lvl.roster) {
        expect(REGISTRY.has(spec.kind), `roster kind '${spec.kind}' is registered`).toBe(true);
      }
    }
  });

  it('spawnEnemy takes size (and hp) from the registry', () => {
    const slime = spawnEnemy({ kind: 'slime', x: 100 }, createLevel());
    expect([slime.w, slime.h, slime.hp]).toEqual([30, 28, 1]);
    const mage = spawnEnemy({ kind: 'mage', x: 3250 }, createLevel2());
    expect([mage.w, mage.h, mage.hp]).toEqual([42, 54, 5]);
  });
});
