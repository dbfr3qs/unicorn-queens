// Troll boss: hp 8, stagger blocks attacks, every attack executes under
// the seeded RNG, shield deflects front arrows (top 8 px open), reactive
// shield fires, phase 2 thresholds, death event, stomp bounces.
import { describe, it, expect, beforeEach } from 'vitest';
import { reseed } from './helpers/seeded-rng.js'; // side effect: deterministic Math.random
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { spawnEnemy, damageEnemy, updateEnemies, E_STOMP_V } from '../src/enemies.js';
import { arrows, updateArrows, resetArrows } from '../src/arrows.js';
import { boulders, updateBoulders, updateShockwaves, resetBoulders, resetShockwaves } from '../src/projectiles.js';
import { resetParticles } from '../src/particles.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };

let lvl, p, cam, e;

// Level 1 rig: troll on the 940-1600 ground segment, player on 0-820,
// just inside the 600 px aggro range.
function rig() {
  lvl = createLevel(600);
  p = createPlayer(lvl);
  p.x = 400; p.y = lvl.groundY - 44;
  cam = createCamera();
  cam.x = 700; // keep the troll (and arrows around it) inside the viewport
  e = spawnEnemy({ kind: 'troll', x: 900, minX: 650, maxX: 1400 }, lvl);
}

const tick = n => {
  for (let i = 0; i < n; i++) {
    updateEnemies([e], p, lvl, cam, DT, fx);
    updateArrows([], lvl, cam, DT, fx);
    updateBoulders(p, lvl, cam, DT, fx);
    updateShockwaves(p, cam, DT, fx);
  }
};

beforeEach(() => {
  rig();
  reseed();
  calls.length = 0;
  resetArrows(); resetBoulders(); resetShockwaves(); resetParticles();
});

describe('damage', () => {
  it('takes 8 hits to die; stagger crouch-freezes the attack cycle', () => {
    expect(e.hp).toBe(8);
    damageEnemy(e, fx, cam);
    expect(e.hp).toBe(7);
    expect(e.state).toBe('stagger');
    tick(10); // 0.16 s < 0.3 s stagger
    expect(e.state).toBe('stagger'); // frozen: no attack picked mid-stagger
    tick(20); // past the 0.3 s
    expect(e.state).toBe('idle');
    for (let i = 0; i < 7 && !e.dead; i++) damageEnemy(e, fx, cam);
    expect(e.dead).toBe(true); // 8th hit kills
    expect(calls).toContain('boss'); // death sound
    expect(cam.shake).toBeGreaterThan(0); // onDeath shake
  });

  it('stomp bounces off an unstompable troll without killing it', () => {
    p.x = e.x + 10;
    p.y = e.y - 44 + 10; // falling, feet 10 px above the troll's head
    p.vy = 300;
    const hp0 = p.hp;
    updateEnemies([e], p, lvl, cam, DT, fx);
    expect(e.dead).toBe(false);
    expect(p.vy).toBe(E_STOMP_V); // bounced
    expect(p.hp).toBe(hp0); // no hurt from the bounce
  });
});

describe('attacks (seeded)', () => {
  it('shield, slam and lob all execute in a 60 s run', () => {
    p.invuln = 1e9; // survive the whole brawl
    const seen = new Set();
    for (let i = 0; i < 3600; i++) {
      tick(1);
      seen.add(e.state);
    }
    expect(seen.has('shield')).toBe(true);
    expect(seen.has('slamWindup')).toBe(true);
    expect(seen.has('slamHop')).toBe(true);
    expect(seen.has('lobWindup')).toBe(true);
    expect(calls).toContain('rumble'); // the slam's shockwaves
    expect(calls).toContain('clatter'); // the lob's boulders
  });
});

describe('shield', () => {
  it('deflects a front arrow (spark + bounce, no damage)', () => {
    e.state = 'shield'; e.t = 3;
    const a = { x: 780, y: e.y + 30, vx: 520, dead: false }; // chest height, moving in
    arrows.push(a);
    for (let i = 0; i < 20 && a.vx > 0; i++) tick(1);
    expect(a.vx).toBe(-520); // bounced back toward the shooter
    expect(calls).toContain('deflect');
    expect(e.hp).toBe(8); // no damage while shielded
  });

  it('leaves the top 8 px open: a head-height arrow lands a hit', () => {
    e.state = 'shield'; e.t = 3;
    const a = { x: 780, y: e.y, vx: 520, dead: false }; // band 496-500, above the shield line
    arrows.push(a);
    for (let i = 0; i < 40 && !a.dead; i++) {
      updateEnemies([e], p, lvl, cam, DT, fx);
      updateArrows([e], lvl, cam, DT, fx); // troll is a live target here
    }
    expect(a.dead).toBe(true); // the arrow got through
    expect(e.hp).toBe(7);
  });
});

describe('reactive shield', () => {
  it('a nearby incoming arrow arms the 150 ms telegraph, then the roll fires', () => {
    e.state = 'idle'; e.t = 5;
    arrows.push({ x: 700, y: e.y + 30, vx: 520, dead: false }); // ~186 px out, inside 300
    for (let i = 0; i < 12; i++) updateEnemies([e], p, lvl, cam, DT, fx); // past the 150 ms
    // the roll either raised the shield or armed the cooldown - the system fired
    expect(e.state === 'shield' || e.reactiveCd > 0).toBe(true);
  });

  it('no arrow: no reactive trigger', () => {
    e.state = 'idle'; e.t = 5;
    for (let i = 0; i < 30; i++) updateEnemies([e], p, lvl, cam, DT, fx);
    expect(e.state).toBe('idle'); // 5 s idle still has 4.5 s left
    expect(e.reactiveCd).toBe(0);
    expect(e.shield).toBe(false);
  });
});

describe('phase 2', () => {
  it('flips at hp<=4: windups -30 % and three boulders', () => {
    e.hp = 5; e.state = 'lobWindup'; e.t = 0;
    updateEnemies([e], p, lvl, cam, DT, fx);
    expect(boulders.length).toBe(2);
    resetBoulders();
    e.hp = 4; e.state = 'lobWindup'; e.t = 0;
    updateEnemies([e], p, lvl, cam, DT, fx);
    expect(boulders.length).toBe(3);
    // windup speed: the scaling applies at pick time, so drive the seeded
    // picks until a slam is chosen and read the timer it was given
    const firstSlamWindup = () => {
      for (let i = 0; i < 40; i++) {
        e.state = 'idle'; e.t = 0;
        updateEnemies([e], p, lvl, cam, DT, fx);
        if (e.state === 'slamWindup') return e.t;
      }
      throw new Error('no slam picked in 40 rolls');
    };
    e.hp = 5;
    expect(firstSlamWindup()).toBeCloseTo(0.8, 5);
    e.hp = 4;
    expect(firstSlamWindup()).toBeCloseTo(0.8 * 0.7, 5); // -30 %
  });
});
