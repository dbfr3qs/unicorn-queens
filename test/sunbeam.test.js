// Sunbeam: instant screen clear (LOOT-PLAN P3).
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createLevel2 } from '../src/level2.js';
import { createPlayer } from '../src/player.js';
import { loot, resetLoot, spawnLoot, updateLoot } from '../src/loot.js';
import { fireFireball, fireballs } from '../src/projectiles.js';
import { game, startGame, update, fireSunbeam } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const box = (over = {}) => ({ x: 100, y: 200, w: 32, h: 32, broken: false, ...over });
const itemAt = (kind, x, y, onGround = true) => ({ x, y, w: 16, h: 16, vx: 0, vy: 0, onGround, kind, taken: false, t: 0 });
const standingPlayer = () => {
  const l = lvl();
  const p = createPlayer(l);
  p.x = 500; p.y = l.groundY - 36;
  return { l, p };
};

afterEach(() => {
  resetLoot();
  startGame(600, 0);
});

describe('drop table', () => {
  const kindAt = r => {
    resetLoot();
    spawnLoot(box(), () => 0); // consume the one-time bow
    spawnLoot(box(), () => r); // the roll under test
    return loot[1].kind;
  };

  it('heart 20%, boots 5%, magnet 5%, sunbeam 3%, gem the rest', () => {
    expect(kindAt(0.19)).toBe('heart');
    expect(kindAt(0.22)).toBe('boots');
    expect(kindAt(0.26)).toBe('magnet');
    expect(kindAt(0.305)).toBe('sunbeam');
    expect(kindAt(0.329)).toBe('sunbeam');
    expect(kindAt(0.34)).toBe('gem');
  });
});

describe('pickup', () => {
  it('plays the sfx and invokes the onSunbeam hook', () => {
    const { l, p } = standingPlayer();
    let hook = 0;
    const calls = [];
    loot.push(itemAt('sunbeam', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx(calls), { onSunbeam: () => hook++ });
    expect(hook).toBe(1);
    expect(calls).toContain('sunbeam');
  });

  it('is safe with no hook wired (unit context)', () => {
    const { l, p } = standingPlayer();
    const it0 = itemAt('sunbeam', 505, l.groundY - 16);
    loot.push(it0);
    updateLoot(p, l, DT, fx([])); // must not throw
    expect(it0.taken).toBe(true);
  });
});

describe('screen clear', () => {
  it('kills all small enemies, clears fireballs, spares the mage', () => {
    startGame(600, 1);
    const g = game;
    const mage = g.enemies.find(e => e.kind === 'mage');
    const small = g.enemies.filter(e => e.kind !== 'mage' && !e.dead);
    expect(small.length).toBeGreaterThan(0);
    fireFireball(1000, 400, 240, 0, fx([]));
    expect(fireballs.length).toBe(1);
    fireSunbeam(g.player, g.level, fx([]));
    for (const e of small) expect(e.dead).toBe(true);
    expect(mage.dead).toBe(false);
    expect(mage.hp).toBe(5); // untouched
    expect(fireballs.length).toBe(0);
    expect(g.level.sunbeamT).toBe(0.4);
  });

  it('the beam timer decays in update', () => {
    startGame(600, 1);
    game.level.sunbeamT = 0.4;
    update(0.1, 800, fx([]));
    expect(game.level.sunbeamT).toBeCloseTo(0.3, 5);
  });
});

describe('placement', () => {
  it('both levels designate a sunbeam box', () => {
    expect(createLevel(600).boxes.some(b => b.drop === 'sunbeam')).toBe(true);
    expect(createLevel2(600).boxes.some(b => b.drop === 'sunbeam')).toBe(true);
  });
});
