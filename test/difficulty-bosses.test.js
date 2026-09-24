// Difficulty D5: boss hp, the idle between attacks, wind-ups, shot speed.
import { describe, it, expect, afterEach } from 'vitest';
import { spawnEnemy, updateEnemies } from '../src/enemies.js';
import { getKind, register } from '../src/enemies/index.js';
import { fireFireball, fireWebGlob, fireballs, resetFireballs, FIREBALL_TTL } from '../src/projectiles.js';
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { setDifficulty, DEFAULT_DIFFICULTY, scaleBossHp } from '../src/difficulty.js';

const fx = { play() {} };
afterEach(() => { setDifficulty(DEFAULT_DIFFICULTY); resetFireballs(); });

const spawnHp = kind => spawnEnemy({ kind, x: 100 }, createLevel(600)).hp;

describe('boss hp', () => {
  // [kind, easy, medium, hard]
  it.each([
    ['mage', 3, 4, 5],
    ['troll', 10, 13, 16],
    ['dragon', 8, 11, 14],
    ['spiderboss', 10, 13, 16],
    ['wizardboss', 6, 8, 10], // even: two stages
    ['warden', 10, 13, 16],
    ['queenboss', 12, 18, 21], // a multiple of 3: a row per winter
  ])('%s: %i / %i / %i', (kind, e, m, h) => {
    const got = ['easy', 'medium', 'hard'].map(d => { setDifficulty(d); return spawnHp(kind); });
    expect(got).toEqual([e, m, h]);
  });

  it('only bosses scale', () => {
    setDifficulty('easy');
    expect(spawnHp('golem')).toBe(3);
    expect(spawnHp('sentinel')).toBe(2);
  });

  it('never drops below one step', () => {
    setDifficulty('easy');
    expect(scaleBossHp(1)).toBe(1);
    expect(scaleBossHp(2, 3)).toBe(3);
  });
});

describe('the idle between attacks', () => {
  it.each(['mage', 'troll'])('%s: stretched by bossCd', kind => {
    const k = getKind(kind);
    setDifficulty('easy');
    for (let i = 0; i < 20; i++) {
      const t = k.nextIdle();
      expect(t).toBeGreaterThanOrEqual(k.idleMin * 1.4 - 1e-9);
      expect(t).toBeLessThanOrEqual(k.idleMax * 1.4 + 1e-9);
    }
  });
});

describe('wind-ups', () => {
  // A probe kind: records the dt its brain is handed.
  const seen = [];
  register({ kind: 'tellprobe', w: 10, h: 10, hp: 1, isTell: e => e.state === 'windup', update(e, { dt }) { seen.push(dt); } });
  const tick = (d, state) => {
    setDifficulty(d);
    seen.length = 0;
    const l = createLevel(600);
    const e = { ...spawnEnemy({ kind: 'tellprobe', x: 2000 }, l), state };
    updateEnemies([e], createPlayer(l), l, createCamera(), 0.1, fx);
    return seen[0];
  };

  it('run slow by bossTell', () => {
    expect(tick('easy', 'windup')).toBeCloseTo(0.1 / 1.5);
    expect(tick('medium', 'windup')).toBeCloseTo(0.1 / 1.2);
    expect(tick('hard', 'windup')).toBe(0.1);
  });

  it('the wizard names all four of his', () => {
    for (const state of ['windup', 'swoopTele', 'slamTele', 'sealTele']) expect(getKind('wizardboss').isTell({ state })).toBe(true);
  });

  it('everything else runs at full speed', () => {
    expect(tick('easy', 'idle')).toBe(0.1);
  });

  it.each([
    ['mage', { state: 'windup' }], ['troll', { state: 'lobWindup' }],
    ['dragon', { state: 'perch', perch: 'inhale' }], ['spiderboss', { state: 'pillarTele' }],
    ['wizardboss', { state: 'windup' }], ['warden', { state: 'sweepTele' }], ['queenboss', { wind: 'bolt' }],
  ])('%s names its wind-up', (kind, e) => {
    expect(getKind(kind).isTell(e)).toBe(true);
    expect(getKind(kind).isTell({ state: 'idle' })).toBe(false);
  });
});

describe('enemy shots', () => {
  it('fly slower on easy, over the same range', () => {
    setDifficulty('easy');
    fireFireball(0, 0, 240, 0, fx);
    fireWebGlob(0, 0, 0, 100, fx);
    expect(fireballs[0].vx).toBeCloseTo(192);
    expect(fireballs[0].ttl).toBeCloseTo(FIREBALL_TTL / 0.8);
    expect(fireballs[1].vy).toBeCloseTo(80);
  });

  it('are untouched on hard', () => {
    fireFireball(0, 0, 240, 0, fx);
    expect(fireballs[0].vx).toBe(240);
    expect(fireballs[0].ttl).toBe(FIREBALL_TTL);
  });
});
