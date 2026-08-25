// Dragon: hovers in the y 140-260 band (out of ground-arrow range),
// drifts toward the player, picks attacks — aimed fireball (one in air,
// phase 1 / two, phase 2), breath perch with a fixed-angle fire cone,
// and a low dive. Staggers on hit, 14 hp, phase 2 below 7. Unstompable;
// sunbeam-exempt; takes reflected fireballs. Beatable from the ground.
import { describe, it, expect, beforeEach } from 'vitest';
import { reseed } from './helpers/seeded-rng.js'; // deterministic attack picks
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V, HURT_INVULN } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';
import { resetArrows, fireArrow, updateArrows } from '../src/arrows.js';
import { fireFireball, fireballs, resetFireballs, updateFireballs, resetCones, updateCones, cones } from '../src/projectiles.js';
import { game, startGame, fireSunbeam } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const d = (x = 800, y = 200) => spawnEnemy({ kind: 'dragon', x, y, minX: x - 300, maxX: x + 300 }, lvl());
const frames = (n, e, p, l, cam, calls) => { for (let i = 0; i < n; i++) updateEnemies([e], p, l, cam, DT, fx(calls)); };

beforeEach(() => { resetArrows(); resetFireballs(); resetCones(); reseed(); });

describe('spawn', () => {
  it('spawns a 60x44 dragon with 14 hp', () => {
    const e = d();
    expect([e.w, e.h, e.hp]).toEqual([60, 44, 14]);
  });
});

describe('hover', () => {
  it('hovers inside the y 140-260 band; descends only for perch and dive', () => {
    const e = d();
    const l = lvl();
    const p = createPlayer(l);
    p.x = 700; p.y = l.groundY - 36; // in aggro range: forces the full cycle
    const cam = createCamera();
    for (let i = 0; i < 900; i++) { // 15 s: several full attack cycles
      updateEnemies([e], p, l, cam, DT, fx([]));
      expect(e.y).toBeGreaterThanOrEqual(139);
      expect(e.y).toBeLessThanOrEqual(511); // never below the perch floor
      if (e.state === 'idle' || e.state === 'windup') {
        expect(e.y).toBeLessThanOrEqual(261); // the band, while hovering
      }
    }
  });

  it('drifts toward the player while idling', () => {
    const e = d(800, 200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 700; p.y = l.groundY - 36;
    const cam = createCamera();
    const x0 = e.x;
    frames(60, e, p, l, cam, []); // first idle is 1.5 s: 60 frames of drift
    expect(e.x).toBeLessThan(x0 - 20); // drifting left toward the player
  });
});

describe('fireballs', () => {
  it('fires one aimed fireball at the player when it picks the shot', () => {
    const e = d(800, 200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 400; p.y = l.groundY - 36; // far enough that the drift keeps the shot diagonal
    const cam = createCamera();
    const calls = [];
    for (let i = 0; i < 1500 && !fireballs.some(f => !f.reflected); i++) {
      updateEnemies([e], p, l, cam, DT, fx(calls));
    }
    expect(fireballs.some(f => !f.reflected)).toBe(true);
    expect(calls).toContain('fireball');
    const f = fireballs.find(f => !f.reflected);
    // aimed from the mouth (dir -1: player is left) down at the player
    expect(f.vx).toBeLessThan(-100);
    expect(f.vy).toBeGreaterThan(50);
  });

  it('keeps at most one fireball in the air (phase 1)', () => {
    const e = d(800, 200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 400; p.y = l.groundY - 36;
    const cam = createCamera();
    let maxInAir = 0;
    for (let i = 0; i < 1800; i++) { // 30 s: many attack picks
      updateEnemies([e], p, l, cam, DT, fx([]));
      maxInAir = Math.max(maxInAir, fireballs.filter(f => !f.reflected).length);
    }
    expect(maxInAir).toBe(1); // fired, but never two at once
  });

  it('keeps two fireballs in the air (phase 2)', () => {
    const e = d(800, 200);
    e.hp = 6;
    const l = lvl();
    const p = createPlayer(l);
    p.x = 400; p.y = l.groundY - 36;
    const cam = createCamera();
    let maxInAir = 0;
    for (let i = 0; i < 3000; i++) {
      updateEnemies([e], p, l, cam, DT, fx([]));
      maxInAir = Math.max(maxInAir, fireballs.filter(f => !f.reflected).length);
      if (maxInAir === 2) break;
    }
    expect(maxInAir).toBe(2);
  });
});

describe('hits', () => {
  it('staggers on a hit: frozen, wings crumpled, back to idle after 0.3 s', () => {
    const e = d();
    const l = lvl();
    const p = createPlayer(l);
    const cam = createCamera();
    const calls = [];
    damageEnemy(e, fx(calls), cam);
    expect(e.hp).toBe(13);
    expect(e.state).toBe('stagger');
    expect(e.flash).toBe(0.15);
    expect(calls).toContain('bossHit');
    const x0 = e.x, y0 = e.y;
    frames(10, e, p, l, cam, []);
    expect(e.x).toBe(x0); // frozen
    expect(e.y).toBe(y0);
    frames(10, e, p, l, cam, []); // 0.33 s total
    expect(e.state).toBe('idle');
  });

  it('an arrow at its height deals 1 hp (14 -> 13, alive)', () => {
    const e = d(400, 522); // low enough for the arrow band (536-540)
    const l = lvl();
    const p = createPlayer(l);
    p.x = 300; p.y = l.groundY - 36; p.hasBow = true; p.facing = 1;
    fireArrow(p);
    const calls = [];
    for (let i = 0; i < 40; i++) updateArrows([e], l, createCamera(), DT, fx(calls), 800);
    expect(e.hp).toBe(13);
    expect(e.dead).toBe(false);
  });
});

describe('contact', () => {
  // Contact is tested at band height with an airborne player: the hover
  // clamp keeps the dragon at y 140-260, out of a ground player's reach.
  it('side contact damages the player (in the air)', () => {
    const e = d(560, 240);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 570; p.y = 240; p.vy = 0; // level with the dragon's head
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(p.hp).toBe(2);
    expect(p.invuln).toBe(HURT_INVULN);
    expect(e.dead).toBe(false);
  });

  it('is unstompable: the stomp bounces without damage or kill', () => {
    const e = d(560, 240);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 570;
    p.y = 240 - 36 + 8; // falling, bottom 8px below the dragon's top
    p.vy = 200;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(e.dead).toBe(false);
    expect(p.hp).toBe(3);
    expect(p.vy).toBe(E_STOMP_V);
  });
});

describe('projectile interactions', () => {
  it('takes damage from a reflected fireball (mirror shield)', () => {
    const e = d(400, 200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 100; // far from the shot
    fireFireball(420, 210, -100, 0, fx([])); // overlaps the dragon
    fireballs[fireballs.length - 1].reflected = true;
    const calls = [];
    updateFireballs(p, l, createCamera(), DT, fx(calls), [e]);
    expect(e.hp).toBe(13);
  });
});

describe('breath perch (the main ground window)', () => {
  it('descends, inhales with a roar, breathes a fixed-angle cone, recovers, flies back', () => {
    const e = d(800, 200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 700; p.y = l.groundY - 36;
    const cam = createCamera();
    const calls = [];
    e.state = 'perch'; e.perch = 'descend'; e.t = 0.4; // force the attack
    let i = 0;
    while (e.perch === 'descend' && i++ < 120) updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.y).toBe(510); // groundY - h - 6: on the ground, inside the arrow band
    expect(e.perch).toBe('inhale');
    expect(calls).toContain('roar');
    i = 0;
    while (cones.length === 0 && i++ < 60) updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.perch).toBe('breath');
    expect(calls).toContain('breath');
    const c = cones[0];
    // aimed from the mouth down at the player (player is to the dragon's left)
    expect(Math.cos(c.angle)).toBeLessThan(0);
    expect(Math.sin(c.angle)).toBeGreaterThan(0);
    i = 0;
    while (e.perch !== 'ascend' && i++ < 200) updateEnemies([e], p, l, cam, DT, fx(calls));
    i = 0;
    while (e.state !== 'idle' && i++ < 200) updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.y).toBeLessThanOrEqual(261); // back up in the band
  });

describe('dive (the secondary ground window)', () => {
  it('swoops to just above the ground, sweeps low, rises back to the band', () => {
    const e = d(800, 200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 900; p.y = l.groundY - 36;
    const cam = createCamera();
    const calls = [];
    e.state = 'dive'; e.dive = 'descend'; e.t = 0.35; e.diveDir = 1; // force the attack
    let i = 0;
    while (e.dive === 'descend' && i++ < 120) updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.y).toBe(505); // groundY - 55: body bottom 11 px off the floor, in the arrow band
    expect(e.dive).toBe('low');
    const x0 = e.x;
    i = 0;
    while (e.dive === 'low' && i++ < 120) updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.x - x0).toBeGreaterThan(200); // sweeps ~280 px at 400 px/s
    i = 0;
    while (e.state !== 'idle' && i++ < 200) updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.y).toBeLessThanOrEqual(261);
  });

  it('does contact damage to a grounded player under the low pass', () => {
    const e = d(700, 200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 800; p.y = l.groundY - 36; // standing in the dive path
    const cam = createCamera();
    e.state = 'dive'; e.dive = 'descend'; e.t = 0.35; e.diveDir = 1;
    let i = 0;
    while (i++ < 300 && p.invuln === 0) {
      updateEnemies([e], p, l, cam, DT, fx([]));
    }
    expect(p.hp).toBeLessThan(3);
  });
});

describe('the range rule', () => {
  it('is beatable from the ground: arrows in the perch/dive windows kill it', () => {
    reseed();
    const l = lvl();
    const e = d(800, 200);
    const p = createPlayer(l);
    p.x = 560; p.y = l.groundY - 36;
    p.hasBow = true;
    const cam = createCamera();
    for (let i = 0; i < 7200 && !e.dead; i++) { // up to 2 minutes
      // hop left/right every 1.5 s (a grounded player keeping out of the cone)
      p.x = 560 + (Math.floor(i / 90) % 2) * 140;
      // shoot whenever the dragon has descended into the arrow band
      if (e.y > 492 && p.fireCd <= 0) fireArrow(p);
      updateEnemies([e], p, l, cam, DT, fx([]));
      updateArrows([e], l, cam, DT, fx([]), 800);
      updateFireballs(p, l, cam, DT, fx([]), [e]);
      updateCones(p, l, cam, DT, fx([]));
    }
    expect(e.dead).toBe(true); // ground windows alone are enough — no flight required
  });
});

  it('is exempt from the sunbeam (a bat on screen is not)', () => {
    startGame(600, 3);
    const g = game;
    g.player.x = 4200;
    g.player.y = g.level.groundY - g.player.h;
    g.camera.x = 3800; // on screen: 3800-4600
    const dr = g.enemies.find(e => e.kind === 'dragon');
    const zombie = g.enemies.find(e => e.kind === 'zombie');
    zombie.x = 4300; // pulled on screen
    const calls = [];
    fireSunbeam(g.player, g.level, fx(calls), 800);
    expect(zombie.dead).toBe(true);
    expect(dr.dead).toBe(false);
    expect(dr.hp).toBe(14);
  });
});
