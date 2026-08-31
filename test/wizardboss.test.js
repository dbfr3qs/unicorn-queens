// The Wizard: level 7 mid-boss. Dormant until the throne gate opens, then
// a 1.0 s enter into the 5500-6200 hover band. Stage 1: the flying
// war-pig — only the rune on the player-facing flank takes hits (body
// hits deflect, the dragon rule); dark bolt 50 / swoop 30 / snort cone
// 20; the swoop's 0.5 s sit is the ground-arrow window. At hp 8 the rune
// shatters (crack), the pig crashes (thud), the wizard is stunned 2 s
// (full body), then rises as the sorcerer: drift, bolt, slam shockwaves,
// the seal circle (columns, x clamped 5500-6160), the <=4 hp fan and the
// shorter tempo. Sunbeam-exempt; takes reflected bolts; death is ash.
import { describe, it, expect, beforeEach } from 'vitest';
import { reseed } from './helpers/seeded-rng.js';
import { createLevel7 } from '../src/levels/level7.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V, HURT_INVULN } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { createCamera } from '../src/camera.js';
import { resetArrows, fireArrow, fireStarArrow, updateArrows, arrows } from '../src/arrows.js';
import { fireFireball, fireballs, resetFireballs, updateFireballs, resetCones, updateCones, cones, resetShockwaves, shockwaves } from '../src/projectiles.js';
import { updateColumns } from '../src/enemies/wizardboss.js';
import { game, startGame, fireSunbeam } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel7();
const fx = calls => ({ play: n => calls.push(n) });
const cam = () => createCamera();
const spawn = (extra = {}) =>
  spawnEnemy({ kind: 'wizardboss', x: 6200, y: 400, minX: 5500, maxX: 6200, ...extra }, lvl());
// a stage-1 pig frozen at (x, y): stagger holds position, long timer;
// the stage fields are set as the first update would (player to the west)
const frozen = (x = 6000, y = 512) => {
  const e = spawn();
  e.stage = 1; e.weakSide = -1; e.flash = 0; e.phase = 0;
  e.state = 'stagger'; e.t = 10; e.x = x; e.y = y;
  return e;
};
// a stage-2 sorcerer on the floor
const s2 = (x = 5850) => {
  const e = spawn();
  e.stage = 2; e.w = 56; e.h = 56; e.x = x; e.y = 560 - 56;
  e.state = 'idle'; e.t = 0.7;
  return e;
};
const frames = (n, e, p, l, c, calls = []) => { for (let i = 0; i < n; i++) updateEnemies([e], p, l, c, DT, fx(calls)); };
const groundPlayer = (l, x) => {
  const p = createPlayer(l);
  p.x = x; p.y = l.groundY - 36;
  return p;
};

beforeEach(() => { resetArrows(); resetFireballs(); resetCones(); resetShockwaves(); reseed(); });

describe('registry', () => {
  it('registers 64x48, 16 hp, unstompable', () => {
    const k = getKind('wizardboss');
    expect([k.w, k.h, k.hp, k.stompable]).toEqual([64, 48, 16, false]);
    const e = spawn();
    expect([e.w, e.h, e.hp, e.sleeping]).toEqual([64, 48, 16, false]);
  });

  it('is unstompable: the stomp bounces without damage or kill', () => {
    const e = frozen(5800, 420);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 5810; p.y = 420 - 36 + 8; p.vy = 200;
    const calls = [];
    updateEnemies([e], p, l, cam(), DT, fx(calls));
    expect(e.dead).toBe(false);
    expect(p.hp).toBe(3);
    expect(p.vy).toBe(E_STOMP_V);
  });
});

describe('dormancy and the enter', () => {
  it('while sleeping: no update, no contact', () => {
    const e = spawn({ x: 6500, y: 512, sleeping: true });
    const l = lvl();
    const p = groundPlayer(l, 6490); // overlapping the sleeping boss
    const calls = [];
    frames(60, e, p, l, cam(), calls);
    expect([e.x, e.y, e.hp]).toEqual([6500, 512, 16]); // untouched
    expect(p.hp).toBe(3); // the sleeping boss is harmless
  });

  it('the throne gate wakes it: 1.0 s enter ending at (6200, hover arc)', () => {
    const e = spawn({ x: 6500, y: 512, sleeping: true });
    const l = lvl();
    const p = groundPlayer(l, 5600);
    l.throneGateOpen = true;
    updateEnemies([e], p, l, cam(), DT, fx([]));
    expect(e.sleeping).toBe(false);
    expect(e.state).toBe('entering');
    let i = 0;
    while (e.state === 'entering' && i++ < 120) updateEnemies([e], p, l, cam(), DT, fx([]));
    expect(e.state).toBe('idle');
    expect(e.x).toBeCloseTo(6200, 0); // the enter lands on the band's east edge
    expect(e.y).toBeGreaterThanOrEqual(350);
    expect(e.y).toBeLessThanOrEqual(450); // on the hover arc
  });
});

describe('stage 1 hover and the weak point', () => {
  it('hovers in y 350-450 inside the x band for 10 s', () => {
    const e = spawn();
    const l = lvl();
    const p = groundPlayer(l, 5000); // west of the band: no contact
    const hover = s => ['idle', 'windup', 'swoopTele'].includes(s);
    let prev = e.state;
    for (let i = 0; i < 600; i++) {
      updateEnemies([e], p, l, cam(), DT, fx([]));
      expect(e.x).toBeGreaterThanOrEqual(5500);
      expect(e.x).toBeLessThanOrEqual(6200);
      // the transition frame out of swoopRec is still at ground height;
      // the next frame snaps back to the arc
      if (hover(e.state) && hover(prev)) {
        expect(e.y).toBeGreaterThanOrEqual(350);
        expect(e.y).toBeLessThanOrEqual(450);
      }
      prev = e.state;
    }
  });

  it('weakPoint: a 24x24 rune on the flank facing the player', () => {
    const e = frozen(6000, 400);
    const l = lvl();
    const p = groundPlayer(l, 5900); // west: the rune is on the left flank
    updateEnemies([e], p, l, cam(), DT, fx([]));
    let w = getKind('wizardboss').weakPoint(e);
    expect([w.x, w.y, w.w, w.h]).toEqual([e.x + 8, e.y + 12, 24, 24]);
    p.x = 6100; // east: the rune moves to the right flank
    updateEnemies([e], p, l, cam(), DT, fx([]));
    w = getKind('wizardboss').weakPoint(e);
    expect(w.x).toBe(e.x + e.w - 32);
  });

  it('weakPoint is null for the stunned wizard and the sorcerer (full body)', () => {
    const l = lvl();
    const p = groundPlayer(l, 5900);
    const e = frozen(6000, 512);
    e.state = 'stunned'; e.t = 1;
    updateEnemies([e], p, l, cam(), DT, fx([]));
    expect(getKind('wizardboss').weakPoint(e)).toBeNull();
    const s = s2();
    updateEnemies([s], p, l, cam(), DT, fx([]));
    expect(getKind('wizardboss').weakPoint(s)).toBeNull();
  });
});

describe('arrows vs the pig', () => {
  it('a body hit (arrow band, rune out of it) deflects: no hp, arrow spent', () => {
    const e = frozen(6000, 500); // rune spans 512-536: the 536-540 band misses it
    const l = lvl();
    const p = groundPlayer(l, 5900);
    p.hasBow = true; p.facing = 1;
    fireArrow(p);
    const calls = [];
    const c = cam();
    c.x = 5500; // the arrows only live in the viewport
    for (let i = 0; i < 40; i++) updateArrows([e], l, c, DT, fx(calls), 800);
    expect(e.hp).toBe(16); // deflected, no damage
    expect(calls).toContain('deflect');
    expect(arrows.length).toBe(0); // a normal arrow is spent (dead arrows are culled)
  });

  it('a star arrow deflects once and keeps flying (the box rule)', () => {
    const e = frozen(6000, 500);
    const l = lvl();
    const p = groundPlayer(l, 5900);
    p.facing = 1;
    fireStarArrow(p);
    const calls = [];
    const c = cam();
    c.x = 5500;
    for (let i = 0; i < 30; i++) updateArrows([e], l, c, DT, fx(calls), 800);
    expect(e.hp).toBe(16);
    expect(calls.filter(n => n === 'deflect').length).toBe(1); // one spark, not one per frame
    expect(arrows[0].dead).toBe(false); // the star keeps flying
  });

  it('an arrow through the rune deals 1 hp (the swoopRec window)', () => {
    const e = frozen(6000, 512); // sitting at ground-arrow height
    const l = lvl();
    // the player is placed so the arrow's tip first touches the pig
    // inside the rune (a body graze 8 px short would only deflect)
    const p = groundPlayer(l, 5966.5);
    p.hasBow = true; p.facing = 1;
    fireArrow(p);
    const calls = [];
    const c = cam();
    c.x = 5500;
    for (let i = 0; i < 40; i++) updateArrows([e], l, c, DT, fx(calls), 800);
    expect(e.hp).toBe(15);
    expect(calls).toContain('bossHit');
    expect(e.dead).toBe(false);
  });
});

describe('the dark bolt', () => {
  it('aims at a standing player: the shot lands', () => {
    const e = spawn();
    e.age = 0; e.state = 'windup'; e.t = 0; // the pig at (6200, 400): fires this frame
    const l = lvl();
    const p = groundPlayer(l, 6150); // just below the hover line
    const c = cam();
    updateEnemies([e], p, l, c, DT, fx([]));
    expect(fireballs.length).toBe(1);
    let i = 0;
    while (p.hp === 3 && i++ < 180) updateFireballs(p, l, c, DT, fx([]), [e]);
    expect(p.hp).toBe(2); // the bolt's path crossed the player's box
  });

  it('leads a moving player: the aim swings ahead of the current position', () => {
    const mk = vx => {
      const e = spawn();
      e.age = 0; e.state = 'windup'; e.t = 0;
      const l = lvl();
      const p = groundPlayer(l, 5900);
      p.vx = vx; // 0: standing; 260: running east
      resetFireballs(); // the control's bolt must not linger
      updateEnemies([e], p, l, cam(), DT, fx([]));
      return fireballs[0];
    };
    const stand = mk(0);
    reseed(); // the same random stream for the moving case
    const moving = mk(260);
    expect(stand.vx).toBeLessThan(0); // standing: the shot goes straight at the player
    expect(moving.vx).toBeGreaterThan(0); // moving: the lead swings it past the player
  });
});

describe('the swoop', () => {
  it('snort + puff tell, a 420 px/s pass sinking to groundY-70 at the midpoint', () => {
    const e = spawn();
    e.age = 0; e.state = 'swoopTele'; e.t = 0; // start the pass from (6200, 400) this frame
    const l = lvl();
    const p = groundPlayer(l, 5600); // in the westbound pass path
    const calls = [];
    updateEnemies([e], p, l, cam(), DT, fx(calls));
    expect(e.state).toBe('swoop');
    expect(e.swoopDir).toBe(-1);
    const x0 = e.x;
    frames(6, e, p, l, cam(), calls); // 0.1 s
    expect(Math.abs(e.x - x0)).toBeCloseTo(42, 0); // ~420 px/s
    frames(30, e, p, l, cam(), calls); // 0.5 s more: the midpoint of the 1.2 s pass
    expect(e.y).toBeCloseTo(490, 0); // groundY - 70
  });

  it('contact during the pass damages a grounded player', () => {
    const e = spawn();
    e.age = 0; e.state = 'swoopTele'; e.t = 0;
    const l = lvl();
    const p = groundPlayer(l, 5900); // standing in the path
    const c = cam();
    let i = 0;
    while (p.hp === 3 && i++ < 180) updateEnemies([e], p, l, c, DT, fx([]));
    expect(p.hp).toBe(2);
  });

  it('sits 0.5 s at ground-arrow height (the rune window), then resumes', () => {
    const e = spawn();
    e.age = 0; e.state = 'swoopTele'; e.t = 0;
    const l = lvl();
    const p = groundPlayer(l, 5000); // clear of the pass
    const c = cam();
    c.x = 5500; // the arrow lives in the viewport
    let i = 0;
    while (e.state !== 'swoopRec' && i++ < 180) updateEnemies([e], p, l, c, DT, fx([]));
    expect(e.y).toBe(512); // groundY - 48: the arrow band (536-540) crosses the rune
    const hp0 = e.hp;
    // shoot the sitting pig: the player is placed so the arrow's tip
    // first touches the pig inside the rune (not a body graze)
    p.x = e.x - 33.5; p.hasBow = true; p.facing = 1;
    fireArrow(p);
    i = 0;
    while (e.hp === hp0 && i++ < 60) {
      updateEnemies([e], p, l, c, DT, fx([]));
      updateArrows([e], l, c, DT, fx([]), 800);
    }
    expect(e.hp).toBe(hp0 - 1); // the sit is hittable (the hit staggers it briefly)
    i = 0;
    while (e.state !== 'idle' && i++ < 90) updateEnemies([e], p, l, c, DT, fx([]));
    expect(e.state).toBe('idle'); // resumed (swoopRec -> stagger -> idle)
  });
});

describe('the snort cone', () => {
  it('from the arc bottom: a violet cone (the L4 contact rules)', () => {
    const e = spawn();
    e.stage = 1; // set before the age: the spawn init would reset it
    e.age = Math.PI; // bottom of the hover arc: y = 450
    e.state = 'idle'; e.t = 0;
    const l = lvl();
    const p = groundPlayer(l, 5750); // in the cone's path
    const orig = Math.random;
    Math.random = () => 0.9; // force the cone pick
    const calls = [];
    try { updateEnemies([e], p, l, cam(), DT, fx(calls)); } finally { Math.random = orig; }
    expect(cones.length).toBe(1);
    expect(cones[0].violet).toBe(true);
    expect(calls).toContain('snort');
    // L4 contact rules: 1 damage, one hit each
    let i = 0;
    while (p.hp === 3 && i++ < 60) updateCones(p, l, cam(), DT, fx([]));
    expect(p.hp).toBe(2);
  });

  it('too high: the cone waits for the arc to dip', () => {
    const e = spawn();
    e.age = 0; // top of the arc: y = 400
    e.state = 'idle'; e.t = 0;
    const l = lvl();
    const p = groundPlayer(l, 5750);
    const orig = Math.random;
    Math.random = () => 0.9;
    try { updateEnemies([e], p, l, cam(), DT, fx([])); } finally { Math.random = orig; }
    expect(cones.length).toBe(0);
    expect(e.state).toBe('idle'); // a short wait, then the arc decides again
    expect(e.t).toBeCloseTo(0.6, 1);
  });
});

describe('the rune shatter (hp 8)', () => {
  it('crack -> the crash (thud, on the snow) -> 2 s stunned -> the sorcerer', () => {
    const e = spawn();
    e.state = 'idle'; e.t = 5; e.hp = 9;
    const l = lvl();
    const p = groundPlayer(l, 5000);
    const c = cam();
    const calls = [];
    damageEnemy(e, fx(calls), c);
    expect(e.hp).toBe(8);
    updateEnemies([e], p, l, c, DT, fx(calls)); // the shatter edge
    expect(e.state).toBe('shatter');
    expect(calls).toContain('crack');
    let i = 0;
    while (e.state === 'shatter' && i++ < 60) updateEnemies([e], p, l, c, DT, fx(calls));
    expect(e.state).toBe('crash');
    i = 0;
    while (e.state === 'crash' && i++ < 60) updateEnemies([e], p, l, c, DT, fx(calls));
    expect(e.y).toBe(512); // on the snow
    expect(calls).toContain('thud');
    expect(e.state).toBe('stunned');
    // the stun: full body, no attacks, for 2 s
    i = 0;
    while (e.state === 'stunned' && i++ < 150) updateEnemies([e], p, l, c, DT, fx([]));
    expect(i).toBeGreaterThanOrEqual(119); // the full 2 s (float residue allows 121)
    expect(fireballs.length).toBe(0);
    expect(cones.length).toBe(0);
    expect(e.stage).toBe(2); // the sorcerer rises
    expect([e.w, e.h, e.y]).toEqual([56, 56, 504]);
    expect(e.state).toBe('idle');
  });
});

describe('stage 2: the sorcerer', () => {
  it('drifts toward the player (60 px/s) clamped to 5500-6160', () => {
    const e = s2(5850);
    e.t = 1.0; // a full second of pure drift (no attack in between)
    const l = lvl();
    const p = groundPlayer(l, 5550);
    const x0 = e.x;
    frames(60, e, p, l, cam(), []); // 1 s of drift
    expect(x0 - e.x).toBeCloseTo(60, 0);
    e.x = 5500; e.t = 1.0; // at the west clamp
    p.x = 5000;
    frames(60, e, p, l, cam(), []);
    expect(e.x).toBe(5500);
  });

  it('fires the bolt from the staff tip', () => {
    const e = s2(5850);
    e.state = 'windup'; e.t = 0; e.fan = false;
    const l = lvl();
    const p = groundPlayer(l, 6000);
    updateEnemies([e], p, l, cam(), DT, fx([]));
    expect(fireballs.length).toBe(1);
    expect(fireballs[0].vx).toBeGreaterThan(0); // aimed east, at the player
    expect(e.state).toBe('idle');
  });

  it('the slam: creak, thud, two ground shockwaves', () => {
    const e = s2(5850);
    e.state = 'slamTele'; e.t = 0;
    const l = lvl();
    const p = groundPlayer(l, 6000);
    const calls = [];
    updateEnemies([e], p, l, cam(), DT, fx(calls));
    expect(calls).toContain('thud');
    expect(shockwaves.length).toBe(2);
    expect(e.state).toBe('idle');
  });

  it('the seal circle: the glint clamps to 5500-6160, the column rises and hits once', () => {
    const run = px => {
      const e = s2(5850);
      e.state = 'idle'; e.t = 0;
      const l = lvl();
      const p = groundPlayer(l, px);
      const orig = Math.random;
      Math.random = () => 0.9; // force the seal pick
      try { updateEnemies([e], p, l, cam(), DT, fx([])); } finally { Math.random = orig; }
      return { e, p, l };
    };
    let { e, p, l } = run(5450);
    expect(e.state).toBe('sealTele');
    expect(e.sealX).toBeGreaterThanOrEqual(5500);
    let { e: e2, p: p2, l: l2 } = run(6250);
    expect(e2.sealX).toBeLessThanOrEqual(6160);
    // the column: stand under the glint
    p.x = e.sealX - 14;
    const c = cam();
    let i = 0;
    while (!e.columns && i++ < 60) updateEnemies([e], p, l, c, DT, fx([]));
    expect(e.columns.length).toBe(1);
    const hp0 = p.hp;
    updateColumns(e, p, DT, fx([]), c);
    expect(p.hp).toBe(hp0 - 1);
    expect(e.columns[0].hit).toBe(true); // one hit per column
    i = 0;
    while (e.columns.length > 0 && i++ < 200) updateColumns(e, p, DT, fx([]), c);
    expect(e.columns.length).toBe(0); // the column decays away
  });

  it('the fan: three bolts at <=4 hp', () => {
    const e = s2(5850);
    e.hp = 4; e.state = 'windup'; e.t = 0; e.fan = true;
    const l = lvl();
    const p = groundPlayer(l, 6000);
    updateEnemies([e], p, l, cam(), DT, fx([]));
    expect(fireballs.length).toBe(3);
  });

  it('the tempo: idle windows 0.7-1.1 s, shorter (0.5-0.9 s) at <=4 hp', () => {
    const gaps = (hp, n = 5) => {
      const e = s2(5850);
      e.hp = hp;
      const l = lvl();
      const p = groundPlayer(l, 5000);
      const out = [];
      let count = 0;
      for (let i = 0; i < 4000 && out.length < n; i++) {
        updateEnemies([e], p, l, cam(), DT, fx([]));
        if (e.state === 'idle') count++;
        else { if (count >= 5) out.push(count); count = 0; }
      }
      return out;
    };
    // frame counts: 0.7-1.1 s -> 41-65 idle frames (the transition frame
    // is not counted), 0.5-0.9 s -> 29-53
    const normal = gaps(8);
    expect(normal).toHaveLength(5);
    for (const g of normal) { expect(g).toBeGreaterThanOrEqual(41); expect(g).toBeLessThanOrEqual(66); }
    const low = gaps(4);
    expect(low).toHaveLength(5);
    for (const g of low) { expect(g).toBeGreaterThanOrEqual(29); expect(g).toBeLessThanOrEqual(54); }
  });
});

describe('projectile interactions', () => {
  it('a shield-reflected bolt comes back and hits the pig', () => {
    const e = frozen(6200, 400); // the pig, frozen in the air
    const l = lvl();
    const p = createPlayer(l);
    p.x = 6100; p.y = 420; p.shield = 1; // in the shot's path, airborne
    fireFireball(6160, 425, -240, 0, fx([])); // westbound, at the pig's height
    const calls = [];
    let i = 0;
    while (e.hp === 16 && i++ < 180) updateFireballs(p, l, cam(), DT, fx(calls), [e]);
    expect(e.hp).toBe(15);
    expect(calls).toContain('reflect');
    expect(calls).toContain('bossHit');
  });

  it('is exempt from the sunbeam (a wraith on screen is not)', () => {
    startGame(600, 6);
    const g = game;
    g.player.x = 5700;
    g.player.y = g.level.groundY - g.player.h;
    g.camera.x = 5500; // on screen: 5500-6300
    const wiz = g.enemies.find(e => e.kind === 'wizardboss');
    wiz.x = 5800; wiz.sleeping = false; // pulled on screen, awake
    const wraith = g.enemies.find(e => e.kind === 'wraith');
    wraith.x = 5750;
    const calls = [];
    fireSunbeam(g.player, g.level, fx(calls), 800);
    expect(wraith.dead).toBe(true);
    expect(wiz.dead).toBe(false);
    expect(wiz.hp).toBe(16);
  });
});

describe('death', () => {
  it('ash, growl, shake: e.dead', () => {
    const e = spawn();
    e.hp = 1;
    const l = lvl();
    const p = groundPlayer(l, 5000);
    const c = cam();
    const calls = [];
    damageEnemy(e, fx(calls), c);
    expect(e.dead).toBe(true);
    expect(calls).toContain('growl');
  });
});
