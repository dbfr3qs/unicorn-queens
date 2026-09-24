// The Warden: level 8 boss. 60×64, 16 hp, arrow-only (the dragon rule),
// every attack keyed to the Great Clock's tick. P1 (16–9): gear slam 45 /
// chime bolt 55, attacks begin ON the chime, advances 40 px. P2 (≤8):
// slam 30 / bolt 30 / pendulum sweep 40, attacks begin on the OFF-beat
// (period/4, 3·period/4), advances 60 px. Reset window: the 0.6 s after
// each chime (core glows cyan, arrows 3 / stars 3 / bolts 1). Death is a
// rest: the clock stops, the toll at the dyingT 1.0 crossing, the statue
// bows (world pass), the pearl at dyingT 0.
//
// Camera note: the arena spans 5100–5800 and arrows are viewport-culled,
// so the wardens in arrow tests stand at 5560 under cam.x 5500 (the M4/M5
// viewport rule).
import { describe, it, expect, beforeEach } from 'vitest';
import { reseed } from './helpers/seeded-rng.js';
import { createLevel8 } from '../src/levels/level8.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { createCamera } from '../src/camera.js';
import { resetArrows, updateArrows, arrows } from '../src/arrows.js';
import { fireballs, resetFireballs, updateFireballs, resetShockwaves, shockwaves } from '../src/projectiles.js';
import { updateClock } from '../src/clock.js';
import { pipCount, wardenRand } from '../src/enemies/warden.js';

const DT = 1 / 60;
const lvl = () => createLevel8();
const fx = calls => ({ play: n => calls.push(n) });
const arenaCam = () => { const c = createCamera(); c.x = 5500; return c; };
const spawn = (extra = {}) =>
  spawnEnemy({ kind: 'warden', x: 5560, band: [5100, 5800], ...extra }, lvl());
const groundPlayer = (l, x) => {
  const p = createPlayer(l);
  p.x = x; p.y = l.groundY - 36;
  return p;
};
// a fresh warden, first update done at clock.t 0.3 (in the reset window)
const inWindow = () => {
  const e = spawn();
  const l = lvl();
  const p = groundPlayer(l, 5400);
  l.clock.t = 0.3;
  updateEnemies([e], p, l, arenaCam(), DT, fx([]));
  return { e, l, p };
};
// 5556: the arrow advances one frame (8.6 px) before the hit check, so this
// is close enough that the very first updateArrows frame overlaps the warden
const arrowAt = (x = 5556) => { arrows.push({ x, y: 520, vx: 520, dead: false }); };

beforeEach(() => { resetArrows(); resetFireballs(); resetShockwaves(); reseed(); });

describe('registry', () => {
  it('registers 60x64, 16 hp, arrow-only (unstompable)', () => {
    const k = getKind('warden');
    expect([k.w, k.h, k.hp, k.stompable]).toEqual([60, 64, 16, false]);
    const e = spawn();
    expect([e.w, e.h, e.hp]).toEqual([60, 64, 16]);
    expect(e.minX).toBe(5100);
    expect(e.maxX).toBe(5800);
  });

  it('the stomp bounces off the brass: no damage, no kill', () => {
    const e = spawn();
    const l = lvl();
    const p = createPlayer(l);
    p.x = 5580; p.y = 496 - 36 + 8; p.vy = 200; // falling onto the head
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    expect(e.dead).toBe(false);
    expect(e.hp).toBe(16);
    expect(p.hp).toBe(3);
    expect(p.vy).toBe(E_STOMP_V);
  });

  it('pips are his winding: 16 at spawn, a pure function of hp', () => {
    const e = spawn();
    expect(pipCount(e)).toBe(16);
    e.hp = 11;
    expect(pipCount(e)).toBe(11);
  });
});

describe('the reset window', () => {
  it('e.inWindow: true at clock.t 0.3, false at 1.0', () => {
    const { e, l, p } = inWindow();
    expect(e.inWindow).toBe(true);
    l.clock.t = 1.0;
    e.lastT = 1.0;
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    expect(e.inWindow).toBe(false);
  });

  it('an arrow in the window is worth 2; out of it, the brass turns it (BOSS-PLAN B5)', () => {
    const { e, l, p } = inWindow();
    const c = arenaCam();
    arrowAt();
    updateArrows([e], l, c, DT, fx([]));
    expect(e.hp).toBe(14); // 16 − 2
    expect(e.state).toBe('stagger'); // the house stagger rule

    const { e: e2, l: l2, p: p2 } = inWindow();
    l2.clock.t = 1.0;
    e2.lastT = 1.0;
    updateEnemies([e2], p2, l2, arenaCam(), DT, fx([])); // out of the window
    arrowAt();
    const calls = [];
    updateArrows([e2], l2, arenaCam(), DT, fx(calls));
    expect(e2.hp).toBe(16); // rang off the brass
    expect(calls).toContain('deflect');
  });

  it('a star in the window is worth 2, like an arrow', () => {
    const { e, l } = inWindow();
    arrows.push({ x: 5556, y: 520, vx: 520, dead: false, star: true, pierces: 2, hit: new Set() });
    updateArrows([e], l, arenaCam(), DT, fx([]));
    expect(e.hp).toBe(14);
  });

  it('a reflected bolt is always 1, even in the window', () => {
    const { e, l, p } = inWindow();
    fireballs.push({ x: 5580, y: 520, w: 14, h: 14, vx: 0, vy: 0, ttl: 2, dead: false, cool: 0, reflected: true });
    updateFireballs(p, l, arenaCam(), DT, fx([]), [e]);
    expect(e.hp).toBe(15); // 16 − 1
  });
});

describe('the clock is the metronome', () => {
  it('chime advance: 40 px toward the player (P1)', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5400); // west
    const c = arenaCam();
    l.clock.t = 5.98;
    updateEnemies([e], p, l, c, DT, fx([])); // first update: lastT = 5.98
    const x0 = e.x;
    l.clock.t = 0.02; // the wrap
    updateEnemies([e], p, l, c, DT, fx([]));
    expect(e.x).toBe(x0 - 40);
  });

  it('chime advance: 60 px in P2', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5400);
    l.clock.t = 5.98;
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    e.hp = 8; // phase 2
    const x0 = e.x;
    l.clock.t = 0.02;
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    expect(e.x).toBe(x0 - 60);
  });

  it('P2 does NOT attack on the chime — only the advance', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5400);
    l.clock.t = 5.98;
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    e.hp = 8; e.state = 'idle'; e.t = 0;
    l.clock.t = 0.02;
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    expect(e.state).toBe('idle');
    expect(e.pendingBolt).toBeFalsy();
  });

  it('P2 off-beat: the pick fires at t = period/4, not the chime', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5400);
    l.clock.t = 0.0;
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    e.hp = 8;
    e.seed = 4242;
    const saveSeed = e.seed;
    const r = wardenRand(e); // pre-draw the pick value
    e.seed = saveSeed;
    e.state = 'idle'; e.t = 0;
    e.lastT = 1.4;
    l.clock.t = 1.55; // crossed period/4 (1.5)
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    if (r < 0.3) expect(e.state).toBe('slamWind');
    else if (r < 0.6) expect(e.pendingBolt).toBe(true);
    else expect(e.state).toBe('sweepTele');
  });

  it('the picks are seeded: the same spawn plays the same fight', () => {
    const run = () => {
      const e = spawn();
      const l = lvl();
      const p = groundPlayer(l, 5000); // far enough: no contact
      const c = arenaCam();
      l.clock.t = 5.98;
      updateEnemies([e], p, l, c, DT, fx([]));
      const seq = [];
      for (let chime = 0; chime < 3; chime++) {
        l.clock.t = 0.02; // the wrap: the P1 pick
        updateEnemies([e], p, l, c, DT, fx([]));
        seq.push(e.state === 'idle' ? 'bolt' : e.state);
        let guard = 0;
        while (e.state !== 'idle' && guard++ < 700) {
          l.clock.t = (l.clock.t + DT) % 6.0;
          updateEnemies([e], p, l, c, DT, fx([]));
        }
      }
      return seq;
    };
    expect(run()).toEqual(run());
  });
});

describe('the chime bolt', () => {
  it('charges at t = period − 0.8; fires a 3-bolt cyan fan on the chime', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5400);
    const c = arenaCam();
    const calls = [];
    l.clock.t = 1.0;
    updateEnemies([e], p, l, c, DT, fx(calls)); // first update
    e.pendingBolt = true;
    e.lastT = 5.0;
    l.clock.t = 5.0;
    updateEnemies([e], p, l, c, DT, fx(calls)); // no crossing yet
    expect(e.state).toBe('idle');
    l.clock.t = 5.3; // crossed period − 0.8 (5.2)
    updateEnemies([e], p, l, c, DT, fx(calls));
    expect(e.state).toBe('charge');
    e.lastT = 5.9;
    l.clock.t = 0.05; // the chime
    updateEnemies([e], p, l, c, DT, fx(calls));
    expect(e.state).toBe('idle');
    expect(fireballs.filter(f => f.cyan).length).toBe(3);
  });

  it('a stagger during the charge cancels it: no bolt on the wrap', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5400);
    const c = arenaCam();
    l.clock.t = 1.0;
    updateEnemies([e], p, l, c, DT, fx([]));
    e.state = 'charge'; e.t = 0.5; e.pendingBolt = true;
    getKind('warden').onHit(e);
    expect(e.state).toBe('stagger');
    expect(e.pendingBolt).toBe(false);
    e.lastT = 5.9;
    l.clock.t = 0.05; // the chime, mid-stagger
    updateEnemies([e], p, l, c, DT, fx([]));
    expect(fireballs.filter(f => f.cyan).length).toBe(0);
  });
});

describe('the gear slam', () => {
  it('slamWind 0.5 s → thud + shake + shockwaves with ttl 2.5 (the arena ends are free from the ttl, deviation 6)', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5400);
    const c = arenaCam();
    const calls = [];
    l.clock.t = 3.0;
    updateEnemies([e], p, l, c, DT, fx(calls)); // first update, mid-period
    e.state = 'slamWind'; e.t = 0.5;
    for (let i = 0; i < 32; i++) updateEnemies([e], p, l, c, DT, fx(calls));
    expect(e.state).toBe('slam'); // the 0.25 s pose
    expect(shockwaves.length).toBe(2);
    expect(shockwaves[0].ttl).toBeCloseTo(2.5, 5);
    expect(shockwaves[1].ttl).toBeCloseTo(2.5, 5);
    expect(calls).toContain('thud');
    expect(calls).toContain('rumble');
    expect(c.mag).toBe(4);
  });
});

describe('the pendulum sweep (P2)', () => {
  it('sweepTele 0.8 s (the 240 px band) → sweep 0.6 s (the blade travels 240 px, 1 dmg, one hit) → retract 0.5 s', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5700); // in the sweep's path, east
    const c = arenaCam();
    const calls = [];
    l.clock.t = 3.0;
    updateEnemies([e], p, l, c, DT, fx(calls));
    // the telegraph, as startSweep sets it (sweep toward the player)
    e.state = 'sweepTele'; e.t = 0.8;
    e.sweepDir = 1;
    e.sweepBand = { x: e.x + e.w, w: 240 };
    e.sweepHit = false;
    const hp0 = p.hp; // the telegraph does not hit; the player is intact
    for (let i = 0; i < 49; i++) updateEnemies([e], p, l, c, DT, fx(calls));
    expect(e.state).toBe('sweep'); // 0.8 s telegraph → the swing
    expect(e.sweepBand.w).toBe(240);
    for (let i = 0; i < 40; i++) updateEnemies([e], p, l, c, DT, fx(calls)); // past the 0.6 s swing
    expect(p.hp).toBe(hp0 - 1); // one hit
    const travel = e.sweepX - (e.x + e.w);
    expect(travel).toBeCloseTo(240, 0);
    for (let i = 0; i < 30; i++) updateEnemies([e], p, l, c, DT, fx(calls)); // past the 0.5 s retract
    expect(e.state).toBe('idle');
    expect(p.hp).toBe(hp0 - 1); // the swing hits once
  });
});

describe('death is a rest, not a kill', () => {
  it('the killing arrow: dead, dyingT 3.3, the clock stops — no sound, no burst', () => {
    const { e, l, p } = inWindow();
    const c = arenaCam();
    const calls = [];
    e.hp = 1;
    arrowAt();
    updateArrows([e], l, c, DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(e.dyingT).toBe(3.3);
    expect(l.clock.stopped).toBe(true);
    expect(calls.length).toBe(0); // the rest is silent
  });

  it('the toll at the dyingT 1.0 crossing; the pearl at 0', () => {
    const { e, l, p } = inWindow();
    const c = arenaCam();
    const calls = [];
    e.hp = 1;
    arrowAt();
    updateArrows([e], l, c, DT, fx(calls));
    for (let i = 0; i < 139; i++) updateClock(l, p, [e], DT, fx(calls)); // ~2.32 s
    expect(e.dyingT).toBeLessThan(1.0);
    expect(calls.filter(n => n === 'toll').length).toBe(1);
    for (let i = 0; i < 70; i++) updateClock(l, p, [e], DT, fx(calls)); // ~1.17 s
    expect(e.dyingT).toBe(0);
    expect(l.pearl.showWhen([e])).toBe(true);
    expect(calls.filter(n => n === 'toll').length).toBe(1); // latched
  });

  it('onZero is idempotent and silent', () => {
    const e = spawn();
    const l = lvl();
    const c = arenaCam();
    const calls = [];
    const k = getKind('warden');
    k.onZero(e, fx(calls), c, l);
    k.onZero(e, fx(calls), c, l);
    expect(e.dead).toBe(true);
    expect(e.dyingT).toBe(3.3);
    expect(l.clock.stopped).toBe(true);
    expect(calls.length).toBe(0);
  });

  it('the sleeping warden stands at attention: no update, no contact', () => {
    const e = spawn({ sleeping: true });
    const l = lvl();
    const p = groundPlayer(l, 5550); // overlapping the sleeping warden
    const c = arenaCam();
    const x0 = e.x;
    for (let i = 0; i < 120; i++) updateEnemies([e], p, l, c, DT, fx([]));
    expect(e.x).toBe(x0);
    expect(e.hp).toBe(16);
    expect(p.hp).toBe(3);
  });
});

// BOSS-PLAN B5: P1 attacks on the half-beat too (it was the chime only —
// one attack per 8.4 s at three cuts).
describe('B5: the half-beat', () => {
  it('P1 picks an attack as the clock crosses half its period', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5400);
    e.sleeping = false; e.state = 'idle'; e.t = 0;
    const half = l.clock.period / 2;
    e.lastT = half - 0.01; l.clock.t = half + 0.01; // the frame the clock crosses the half
    updateEnemies([e], p, l, arenaCam(), DT, fx([]));
    expect(e.state === 'slamWind' || e.pendingBolt).toBe(true);
  });
});
