// Boss poise (BOSS-PLAN B1): after a stagger a boss can't be staggered
// again for POISE s — hits still land and flash — so held fire can't lock
// it out of attacking.
import { describe, it, expect } from 'vitest';
import { spawnEnemy, damageEnemy, updateEnemies, POISE } from '../src/enemies.js';
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { createCamera } from '../src/camera.js';

const fx = { play() {} };
const boss = kind => {
  const l = createLevel(600);
  const e = spawnEnemy({ kind, x: 2000 }, l);
  e.state = 'idle'; e.t = 5;
  return { e, l };
};
// Let time pass for the enemy loop (the player far away, out of reach).
const wait = (e, l, s) => {
  const p = createPlayer(l); p.x = 60;
  for (let t = 0; t < s; t += 1 / 60) updateEnemies([e], p, l, createCamera(), 1 / 60, fx);
};

describe('poise', () => {
  it.each(['troll', 'spiderboss', 'warden', 'dragon', 'wizardboss'])('%s: a second hit inside the window hurts but does not stagger', kind => {
    const { e } = boss(kind);
    const hp = e.hp;
    damageEnemy(e, fx);
    expect(e.state).toBe('stagger');
    expect(e.poiseT).toBe(POISE);
    e.state = 'windup'; // it has recovered and started an attack
    damageEnemy(e, fx);
    expect(e.hp).toBe(hp - 2);
    expect(e.state).toBe('windup'); // the attack goes on
    expect(e.flash).toBeGreaterThan(0); // the hit still shows
  });

  it('wears off: the next hit after POISE staggers again', () => {
    const { e, l } = boss('troll');
    damageEnemy(e, fx);
    wait(e, l, POISE + 0.1);
    e.state = 'idle';
    damageEnemy(e, fx);
    expect(e.state).toBe('stagger');
  });

  it('the mage has none: every hit staggers him', () => {
    const { e } = boss('mage');
    damageEnemy(e, fx);
    e.state = 'windup';
    damageEnemy(e, fx);
    expect(e.state).toBe('stagger');
  });

  it('ordinary enemies are untouched', () => {
    const { e } = boss('golem');
    damageEnemy(e, fx);
    expect(e.poiseT).toBeUndefined();
  });
});
