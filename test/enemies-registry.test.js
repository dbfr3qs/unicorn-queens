// Registry integrity for the enemies refactor: every definition is
// well-formed, the kind set is exactly the registered one, the per-kind
// sizes/stomp rules (and boss hp) match the KINDS table, and every
// roster spec in both levels dispatches to a registered kind.
import { describe, it, expect } from 'vitest';
import { REGISTRY } from '../src/enemies/index.js';
import { spawnEnemy } from '../src/enemies.js'; // side effect: registers all kind files
import { createLevel } from '../src/levels/level.js';
import { createLevel2 } from '../src/levels/level2.js';
import { createLevel4 } from '../src/levels/level4.js';
import { createLevel5 } from '../src/levels/level5.js';
import { createLevel6 } from '../src/levels/level6.js';
import { createLevel7 } from '../src/levels/level7.js';

const ALL_KINDS = ['slime', 'zombie', 'ghost', 'mage', 'troll', 'bat', 'dragon', 'bee', 'snake', 'adder', 'spider', 'spiderboss', 'hare', 'wraith', 'wizardboss'];

// The KINDS table, per kind: size, stomp rule, and (boss only) hp.
// The registry must match it exactly.
const EXPECTED = {
  slime: { w: 30, h: 28, stompable: true },
  zombie: { w: 34, h: 40, stompable: true },
  ghost: { w: 28, h: 26, stompable: false },
  mage: { w: 42, h: 54, stompable: false, hp: 5 },
  troll: { w: 52, h: 64, stompable: false, hp: 8 },
  bat: { w: 24, h: 18, stompable: true, hp: 1 },
  bee: { w: 18, h: 14, stompable: true, hp: 1 },
  dragon: { w: 60, h: 44, stompable: false, hp: 14 },
  snake: { w: 26, h: 24, stompable: true, hp: 1 },
  adder: { w: 44, h: 26, stompable: true, hp: 3 },
  spider: { w: 20, h: 22, stompable: true, hp: 1 },
  spiderboss: { w: 72, h: 56, stompable: false, hp: 16 },
  hare: { w: 24, h: 20, stompable: true, hp: 1 },
  wraith: { w: 26, h: 30, stompable: false, hp: 1 },
  wizardboss: { w: 64, h: 48, stompable: false, hp: 16 },
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

  it('all 15 kinds are registered (catches a stub that never calls register)', () => {
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
  it('every roster spec in the built levels is a registered kind', () => {
    for (const lvl of [createLevel(), createLevel2(), createLevel4(), createLevel5(), createLevel6(), createLevel7()]) {
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
