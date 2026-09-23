import { describe, it, expect, beforeEach } from 'vitest';
import {
  PRESETS, DIFFICULTIES, DEFAULT_DIFFICULTY, difficulty, difficultyName, setDifficulty,
  difficultyFromSearch, loadDifficulty, saveDifficulty, initDifficulty,
} from '../src/difficulty.js';
import { HURT_INVULN } from '../src/player.js';

// A stand-in for localStorage; `broken` throws the way a blocked store does.
const store = (init = {}) => {
  const m = { ...init };
  return { m, getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); } };
};
const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };

beforeEach(() => setDifficulty(DEFAULT_DIFFICULTY));

describe('presets', () => {
  it('hard is the default, and is the game as designed', () => {
    expect(DEFAULT_DIFFICULTY).toBe('hard');
    expect(difficultyName()).toBe('hard');
    expect(PRESETS.hard.hearts).toBe(3);
    expect(PRESETS.hard.invuln).toBe(HURT_INVULN);
    for (const k of ['bossHp', 'bossCd', 'bossTell', 'projSpeed', 'hazard']) expect(PRESETS.hard[k]).toBe(1);
  });

  it('every preset has the same fields', () => {
    const keys = Object.keys(PRESETS.hard).sort();
    for (const d of DIFFICULTIES) expect(Object.keys(PRESETS[d]).sort()).toEqual(keys);
  });

  it('easy only ever loosens from medium, and medium from hard', () => {
    const [e, m, h] = DIFFICULTIES.map(d => PRESETS[d]);
    for (const k of ['hearts', 'invuln', 'bossCd', 'bossTell']) { expect(e[k]).toBeGreaterThanOrEqual(m[k]); expect(m[k]).toBeGreaterThanOrEqual(h[k]); }
    for (const k of ['pitDamage', 'bossHp', 'projSpeed', 'hazard']) { expect(e[k]).toBeLessThanOrEqual(m[k]); expect(m[k]).toBeLessThanOrEqual(h[k]); }
    expect([e.revive, m.revive, h.revive]).toEqual([true, false, false]);
  });
});

describe('setDifficulty', () => {
  it('switches the preset that difficulty() returns', () => {
    expect(setDifficulty('easy')).toBe(true);
    expect(difficulty()).toBe(PRESETS.easy);
    expect(setDifficulty('easy')).toBe(false); // no change
  });

  it('ignores unknown names', () => {
    expect(setDifficulty('nightmare')).toBe(false);
    expect(difficultyName()).toBe('hard');
  });
});

describe('?difficulty=', () => {
  it('reads a known name, any case', () => {
    expect(difficultyFromSearch('?difficulty=easy')).toBe('easy');
    expect(difficultyFromSearch('?level=4&difficulty=Medium')).toBe('medium');
  });

  it('is null when missing or unknown', () => {
    expect(difficultyFromSearch('')).toBe(null);
    expect(difficultyFromSearch('?level=2')).toBe(null);
    expect(difficultyFromSearch('?difficulty=silly')).toBe(null);
  });
});

describe('the remembered choice', () => {
  it('round-trips through storage', () => {
    const s = store();
    setDifficulty('medium');
    saveDifficulty(s);
    setDifficulty('hard');
    expect(loadDifficulty(s)).toBe('medium');
  });

  it('ignores a junk stored value', () => {
    expect(loadDifficulty(store({ 'unicorn-queens.difficulty': 'silly' }))).toBe('hard');
  });

  it('survives storage that throws, or none at all', () => {
    expect(() => saveDifficulty(broken)).not.toThrow();
    expect(loadDifficulty(broken)).toBe('hard');
    expect(loadDifficulty(undefined)).toBe('hard');
  });
});

describe('initDifficulty', () => {
  it('the URL wins over storage, and is not saved', () => {
    const s = store({ 'unicorn-queens.difficulty': 'medium' });
    expect(initDifficulty('?difficulty=easy', s)).toBe('easy');
    expect(s.m['unicorn-queens.difficulty']).toBe('medium');
  });

  it('falls back to the stored choice, then the default', () => {
    expect(initDifficulty('', store({ 'unicorn-queens.difficulty': 'medium' }))).toBe('medium');
    setDifficulty('hard');
    expect(initDifficulty('', store())).toBe('hard');
  });
});
