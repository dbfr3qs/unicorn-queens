// The Weaver Queen: the registry entry (72×56, 16 hp, NOT stompable),
// a stomp bounces without damage (the shared hitPlayer rule), an arrow
// staggers + flashes for 1 hp, the lunge (0.5 s telegraph with slither,
// a dash capped at 260 px, recover), the spit (a stationary player is
// hit straight, a moving player is hit by the lead, a hit = 1 damage +
// the 2.5 s web-slow), the web pillar (glint at the player's x, rises
// in place, contact = damage + slow, gone after 1.55 s, never moves),
// the phase-2 egg volley (three web boulders, 1 damage each, no slow),
// phase 2's faster idle and double spit, the web-slow itself (0.45×
// ground speed, flight unaffected, decays to 0), the sunbeam exemption,
// and the death (shake + burst + growl, the pearl shows).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startGame, game, fireSunbeam } from '../src/game.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { fireArrow, updateArrows, resetArrows } from '../src/arrows.js';
import {
  updateFireballs, resetFireballs, fireballs,
  updateBoulders, resetBoulders, boulders,
} from '../src/projectiles.js';
import { updatePlayer, P_SPEED, FLY_UP, WEB_SLOW, WEB_SLOW_TIME } from '../src/player.js';
import { updatePearl } from '../src/pearl.js';
import { particles } from '../src/particles.js';
import { updatePillars, PILLAR_TOTAL } from '../src/enemies/spiderboss.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const cam = { x: 0, shake: 0, mag: 0 }; // shake() Math.max'es off these fields

beforeEach(() => {
  calls.length = 0;
  resetArrows();
  resetFireballs();
  resetBoulders();
  startGame(600, 5);
});
afterEach(() => startGame(600, 5));

const lvl = () => game.level;
const p = () => game.player;
const groundY = () => lvl().groundY;
const boss = () => game.enemies.find(e => e.kind === 'spiderboss');
const place = (x, y) => { p().x = x; p().y = y; p().vy = 0; };
const placeBoss = (x) => { boss().x = x; };
const frames = (n) => {
  for (let i = 0; i < n; i++) {
    updateEnemies([boss()], p(), lvl(), cam, DT, fx);
    updateFireballs(p(), lvl(), cam, DT, fx);
    updateBoulders(p(), lvl(), cam, DT, fx);
  }
};

describe('registry + stomp', () => {
  it('spiderboss: 72×56, 16 hp, not stompable, in the roster', () => {
    const s = getKind('spiderboss');
    expect([s.w, s.h, s.hp, s.stompable]).toEqual([72, 56, 16, false]);
    const r = lvl().roster.find(r => r.kind === 'spiderboss');
    expect([r.x, r.minX, r.maxX]).toEqual([6100, 5900, 6650]);
    expect(boss().y).toBe(groundY() - 56);
  });

  it('a stomp bounces the player and deals no damage', () => {
    placeBoss(6100);
    place(6100, 480); // falling, bottom 516: within 16 px of the boss's top (504)
    p().vy = 120;
    const hp0 = p().hp;
    updateEnemies([boss()], p(), lvl(), cam, DT, fx);
    expect(boss().dead).toBe(false);
    expect(p().hp).toBe(hp0);
    expect(p().vy).toBe(E_STOMP_V);
  });
});

describe('arrows', () => {
  it('an arrow staggers the boss: flash, hp −1, no death', () => {
    placeBoss(6100);
    place(6000, groundY() - 36);
    p().facing = 1;
    fireArrow(p());
    for (let i = 0; i < 40 && boss().state !== 'stagger'; i++) {
      updateArrows([boss()], lvl(), cam, DT, fx, 8000);
      updateEnemies([boss()], p(), lvl(), cam, DT, fx);
    }
    expect(boss().hp).toBe(15);
    expect(boss().state).toBe('stagger');
    expect(boss().flash).toBeGreaterThan(0);
    expect(boss().dead).toBe(false);
  });
});

describe('the lunge', () => {
  it('telegraph (0.5 s, slither) -> a dash capped at 260 px -> recover', () => {
    placeBoss(6100);
    place(6550, groundY() - 36); // to the right, clear of the lunge
    const e = boss();
    e.state = 'idle';
    e.t = 0;
    // force the lunge out of pickAttack (r < 40 in phase 1)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    randSpy.mockRestore();
    expect(e.state).toBe('lungeTele');
    expect(e.lungeDir).toBe(1);
    expect(calls).toContain('slither');
    frames(32); // the 0.5 s crouch (one margin frame: 30×DT leaves float residue)
    expect(e.state).toBe('lunge');
    const startX = e.x;
    for (let i = 0; i < 300 && e.state !== 'lungeRec'; i++) {
      updateEnemies([e], p(), lvl(), cam, DT, fx);
    }
    expect(e.x - startX).toBeGreaterThan(240);
    expect(e.x - startX).toBeLessThanOrEqual(264); // the 260 px cap
    frames(40); // through the recover (0.6 s)
    expect(e.state).toBe('idle');
  });
});

describe('the spit', () => {
  it('a stationary player is hit: 1 damage + the 2.5 s web-slow', () => {
    placeBoss(6100);
    place(6500, groundY() - 36);
    const e = boss();
    e.state = 'spitWind';
    e.t = 0;
    e.spitCount = 1;
    const hp0 = p().hp;
    let hit = false;
    for (let i = 0; i < 160 && !hit; i++) {
      updateEnemies([e], p(), lvl(), cam, DT, fx);
      updateFireballs(p(), lvl(), cam, DT, fx);
      if (p().hp < hp0) hit = true;
    }
    expect(hit).toBe(true);
    expect(p().hp).toBe(hp0 - 1);
    expect(p().webT).toBe(WEB_SLOW_TIME);
  });

  it('a moving player is hit by the lead (a straight aim would pass behind)', () => {
    placeBoss(6100);
    place(6300, groundY() - 36);
    const e = boss();
    e.state = 'spitWind';
    e.t = 0;
    e.spitCount = 1;
    const hp0 = p().hp;
    let hit = false;
    for (let i = 0; i < 200 && !hit; i++) {
      updatePlayer(p(), { right: true }, lvl(), cam, DT, fx); // running right
      updateEnemies([e], p(), lvl(), cam, DT, fx);
      updateFireballs(p(), lvl(), cam, DT, fx);
      if (p().hp < hp0) hit = true;
    }
    expect(hit).toBe(true);
    expect(p().webT).toBeGreaterThan(0);
  });
});

describe('the web pillar', () => {
  it('the glint locks the pillar at the player x; it rises in place, hurts + slows, and is gone after 1.55 s', () => {
    placeBoss(6100);
    place(6200, groundY() - 36); // center 6214
    const e = boss();
    e.state = 'pillarTele';
    e.t = 0.6;
    e.pillarX = p().x + p().w / 2 - 20; // 6194
    frames(37); // through the telegraph
    expect(e.pillars).toHaveLength(1);
    expect(e.pillars[0].x).toBe(6194); // at the glint
    const hp0 = p().hp;
    // let it rise (0.25 s) until it is solid, then touch it
    for (let i = 0; i < 20; i++) updatePillars(e, p(), lvl(), cam, DT, fx);
    expect(p().hp).toBe(hp0 - 1);
    expect(p().webT).toBe(WEB_SLOW_TIME);
    // it never moves, and it is gone after the full 1.55 s life
    for (let i = 0; i < 100; i++) {
      updatePillars(e, p(), lvl(), cam, DT, fx);
      for (const q of e.pillars) expect(q.x).toBe(6194);
    }
    // 120 more frames (2 s) from a fresh pillar can never outlive it
    expect(e.pillars.every(q => q.t < PILLAR_TOTAL)).toBe(true);
    for (let i = 0; i < 120; i++) updatePillars(e, p(), lvl(), cam, DT, fx);
    expect(e.pillars).toHaveLength(0);
  });
});

describe('the egg volley (phase 2)', () => {
  it('fires three web boulders at player x −80 / x / x+80; a hit is 1 damage with no slow', () => {
    placeBoss(6100);
    place(6300, groundY() - 36); // center 6314
    const e = boss();
    e.hp = 8; // phase 2
    e.state = 'volley';
    e.t = 0;
    e.volleyX = 6314;
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(boulders).toHaveLength(3);
    for (const b of boulders) expect(b.web).toBe(true);
    const targets = boulders.map(b => b.x + b.vx * 1.1).sort((a, b) => a - b);
    expect(targets[0]).toBeGreaterThan(6234 - 12);
    expect(targets[0]).toBeLessThan(6234 + 12);
    expect(targets[1]).toBeGreaterThan(6314 - 12);
    expect(targets[1]).toBeLessThan(6314 + 12);
    expect(targets[2]).toBeGreaterThan(6394 - 12);
    expect(targets[2]).toBeLessThan(6394 + 12);
    // resolve the volley: a boulder landing on the player = 1 damage, no slow
    const hp0 = p().hp;
    for (let i = 0; i < 90; i++) {
      updateBoulders(p(), lvl(), cam, DT, fx);
      updateFireballs(p(), lvl(), cam, DT, fx);
    }
    expect(p().hp).toBeLessThanOrEqual(hp0 - 1);
    expect(p().webT).toBe(0); // boulders do not slow
  });

  it('a single web boulder hit: 1 damage, no web-slow', () => {
    placeBoss(6100);
    place(6300, groundY() - 36);
    boulders.push({ x: 6300, y: 524, w: 18, h: 18, vx: 0, vy: 0, ttl: 1, dead: false, web: true });
    const hp0 = p().hp;
    updateBoulders(p(), lvl(), cam, DT, fx);
    expect(p().hp).toBe(hp0 - 1);
    expect(p().webT).toBe(0);
  });
});

describe('phases', () => {
  it('phase 2 (hp 8) idles 0.7–1.1 s; phase 1 idles 1.0–1.5 s', () => {
    const k = getKind('spiderboss');
    for (const [hp, lo, hi] of [[8, 0.7, 1.1], [16, 1.0, 1.5]]) {
      for (let i = 0; i < 60; i++) {
        const t = k.nextIdle({ hp });
        expect(t).toBeGreaterThanOrEqual(lo);
        expect(t).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('phase 2 spits twice: two web globs in the air', () => {
    placeBoss(6100);
    place(6500, groundY() - 36);
    const e = boss();
    e.hp = 8;
    e.state = 'spitWind';
    e.t = 0;
    e.spitCount = 2;
    updateEnemies([e], p(), lvl(), cam, DT, fx); // first glob
    expect(fireballs).toHaveLength(1);
    frames(16); // the 0.25 s beat, then the second glob
    expect(fireballs).toHaveLength(2);
    for (const f of fireballs) expect(f.web).toBe(true);
  });
});

describe('the web-slow', () => {
  it('ground speed is 0.45× while slowed; flight is unaffected; it decays to 0', () => {
    place(6100, groundY() - 36);
    p().webT = WEB_SLOW_TIME;
    p().flying = false;
    const x0 = p().x;
    for (let i = 0; i < 6; i++) updatePlayer(p(), { right: true }, lvl(), cam, DT, fx); // 0.1 s
    expect(p().vx).toBe(P_SPEED * WEB_SLOW);
    expect(p().x - x0).toBeCloseTo(P_SPEED * WEB_SLOW * 0.1, 3);
    // flight ignores the web
    p().flying = true;
    p().flightT = 5;
    updatePlayer(p(), { up: true, right: true }, lvl(), cam, DT, fx);
    expect(p().vy).toBe(-FLY_UP);
    expect(p().vx).toBe(P_SPEED); // wings are not bound
    // the slow decays to 0
    p().flying = false;
    for (let i = 0; i < 160; i++) updatePlayer(p(), {}, lvl(), cam, DT, fx); // 2.67 s
    expect(p().webT).toBe(0);
    expect(p().vx).toBe(0);
    for (let i = 0; i < 6; i++) updatePlayer(p(), { right: true }, lvl(), cam, DT, fx);
    expect(p().vx).toBe(P_SPEED);
  });
});

describe('sunbeam + death', () => {
  it('the sunbeam spares the boss', () => {
    fireSunbeam(p(), lvl(), fx, 8000);
    expect(boss().hp).toBe(16);
    expect(boss().dead).toBe(false);
  });

  it('death: shake + burst + growl; the pearl shows', () => {
    const e = boss();
    e.hp = 1;
    damageEnemy(e, fx, cam);
    expect(e.dead).toBe(true);
    expect(calls).toContain('growl');
    expect(cam.shake > 0).toBe(true);
    expect(particles.length).toBeGreaterThan(0);
    expect(lvl().pearl.visible).toBe(false);
    updatePearl(lvl(), p(), game.enemies, fx);
    expect(lvl().pearl.visible).toBe(true);
  });
});
