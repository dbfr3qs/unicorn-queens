// The Frost Queen (level 9): the three phases of the last fight.
//
// Every one of her attacks is a telegraph followed by a hit, and the whole
// fight is the player reading those telegraphs — so what is pinned here is
// the timing of each one, and the arena bounds that keep the fight inside the
// room it belongs to.
import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel9 } from '../src/levels/level9.js';
import { spawnEnemy, damageEnemy } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import {
  updateQueenWake, spikeRect, QUEEN_HP, WAKE_STEP,
  ARENA_W, ARENA_E, SHOCK_BOUNDS, DRIFT_P1, BOLT_SPEED, STAGGER,
  SPIKE_GLINT, SPIKE_RISE, SPIKE_STAND, SPIKE_FALL, SPIKE_H, SPIKE_MIN, SPIKE_MAX,
  SLAM_WIND, SLAM_TTL, SLAM_SPEED,
  P2_AT, P3_AT, PHASE_PAUSE, phaseOf, DRIFT_P2, BREATH_REACH,
  BLIZZ_TIME, BLIZZ_CD, BLIZZ_WAVE_SPEED, blizzardWobble,
} from '../src/enemies/queenboss.js';
import { effectiveKind } from '../src/levels/level.js';
import {
  fireballs, resetFireballs, shockwaves, resetShockwaves, updateShockwaves,
  cones, resetCones, CONE_LEN,
} from '../src/projectiles.js';

const DT = 1 / 60;
const spy = () => { const played = []; return { play: (n, a) => played.push(a === undefined ? n : [n, a]), played }; };
const cam = () => ({ x: 5200, shake: 0, mag: 0 });
const player = (x = 5500) => ({ x, y: 560 - 36, w: 28, h: 36, vy: 0, onGround: true, dead: false, invuln: 0, hp: 3, boots: 0 });

let lvl, fx, e;
beforeEach(() => {
  lvl = createLevel9(600);
  fx = spy();
  resetFireballs();
  resetShockwaves();
  resetCones();
  e = spawnEnemy(lvl.roster.find(r => r.kind === 'queenboss'), lvl);
  // wake her: the entrance is M4's, and every test here is about the fight
  lvl.queenUnfreeze = { t: 0, boss: false };
  for (let i = 0; i < Math.round((WAKE_STEP + 0.1) / DT); i++) {
    updateQueenWake(lvl, [e], DT, fx, cam());
  }
  fx.played.length = 0;
});

const tick = (p, seconds, c = cam()) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    getKind('queenboss').update(e, { p, lvl, cam: c, dt: DT, fx });
  }
};

describe('the fight starts where the entrance ends', () => {
  it('is awake with all 24 the moment the step-down finishes', () => {
    expect(e.sleeping).toBe(false);
    expect(e.hp).toBe(QUEEN_HP);
  });

  it('never freezes again', () => {
    tick(player(), 10);
    expect(e.sleeping).toBe(false);
  });
});

describe('her movement', () => {
  it('keeps pace with the player rather than charging', () => {
    const p = player(5850);
    const x0 = e.x;
    tick(p, 1);
    expect(e.x).toBeGreaterThan(x0);
    expect(e.x - x0).toBeLessThanOrEqual(DRIFT_P1 * 1 + 1);
  });

  it('stays in the arena whatever the player does', () => {
    for (const px of [4000, 5999, 5200]) {
      const p = player(px);
      tick(p, 12);
      expect(e.x).toBeGreaterThanOrEqual(ARENA_W);
      expect(e.x + e.w).toBeLessThanOrEqual(ARENA_E);
    }
  });

  it('never crosses the King at his pad', () => {
    tick(player(4000), 20);
    expect(e.x).toBeGreaterThan(5300);
  });

  it('is not moved by the ice she is standing on', () => {
    // her drift is her own velocity: the floor is hers, and it does not carry
    // her the way it carries the player
    const p = player(5574); // exactly where her drift already wants her
    const x0 = e.x;
    tick(p, 2);
    expect(Math.abs(e.x - x0)).toBeLessThan(2);
  });
});

describe('the frost bolt', () => {
  it('is aimed, pale, and travels at its own speed', () => {
    const p = player(5450);
    e.seed = 0; // the LCG's first draw lands in the bolt band
    tick(p, 4);
    const bolt = fireballs.find(f => f.pale);
    expect(bolt).toBeTruthy();
    expect(Math.hypot(bolt.vx, bolt.vy)).toBeCloseTo(BOLT_SPEED, 0);
    expect(bolt.vx).toBeLessThan(0); // aimed west, at the player
  });
});

describe('the glacier slam', () => {
  it('winds up, lands, and rolls twin waves down the arena', () => {
    const p = player(5500);
    // force the slam band of the LCG by stepping the seed until it picks one
    for (let i = 0; i < 40 && !shockwaves.length; i++) tick(p, 1);
    expect(fx.played).toContain('creak'); // the crouch, before anything happens
    expect(fx.played).toContain('thud');
    expect(shockwaves.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(shockwaves[0].vx)).toBe(SLAM_SPEED);
    expect(shockwaves[0].ttl).toBeCloseTo(SLAM_TTL, 5);
    expect(shockwaves[0].bounds).toEqual(SHOCK_BOUNDS);
  });

  it('kills a wave at the arena wall instead of letting it into the hall', () => {
    const p = player(5500);
    for (let i = 0; i < 40 && !shockwaves.length; i++) tick(p, 1);
    const west = shockwaves.find(s => s.vx < 0);
    expect(west).toBeTruthy();
    // it would live 2.5 s on ttl alone, long enough to cross 5200
    for (let i = 0; i < 300 && !west.dead; i++) updateShockwaves(player(4000), cam(), DT, fx);
    expect(west.x).toBeGreaterThanOrEqual(SHOCK_BOUNDS[0] - SLAM_SPEED * DT - 1);
  });

  it('takes its full wind-up before it lands', () => {
    const p = player(5500);
    let armed = false;
    for (let i = 0; i < 2000 && !armed; i++) {
      getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx });
      armed = e.wind === 'slam';
    }
    expect(armed).toBe(true);
    expect(e.windT).toBeCloseTo(SLAM_WIND, 1);
    expect(shockwaves).toHaveLength(0); // nothing yet: the crouch is the warning
  });
});

describe('the ice spike', () => {
  const forceSpike = p => {
    for (let i = 0; i < 3000 && !e.spikes?.length; i++) {
      getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx });
    }
    return e.spikes[0];
  };

  it('shows a glint for a beat before anything can hurt you', () => {
    const p = player(5600);
    const sp = forceSpike(p);
    expect(sp).toBeTruthy();
    expect(spikeRect(sp, 560)).toBeNull(); // the glint alone
    sp.t = SPIKE_GLINT - 0.01;
    expect(spikeRect(sp, 560)).toBeNull();
  });

  it('rises, stands, and falls on its own clock', () => {
    const p = player(5600);
    const sp = forceSpike(p);
    sp.t = SPIKE_GLINT + SPIKE_RISE / 2;
    expect(spikeRect(sp, 560).h).toBeCloseTo(SPIKE_H / 2, 0);
    sp.t = SPIKE_GLINT + SPIKE_RISE + SPIKE_STAND / 2;
    expect(spikeRect(sp, 560).h).toBe(SPIKE_H);
    sp.t = SPIKE_GLINT + SPIKE_RISE + SPIKE_STAND + SPIKE_FALL / 2;
    expect(spikeRect(sp, 560).h).toBeCloseTo(SPIKE_H / 2, 0);
    sp.t = SPIKE_GLINT + SPIKE_RISE + SPIKE_STAND + SPIKE_FALL + 0.01;
    expect(spikeRect(sp, 560)).toBeNull();
  });

  it('lands where the glint showed, clamped into the arena', () => {
    const p = player(5000); // she cannot reach out there, and neither can it
    const sp = forceSpike(p);
    expect(sp.x + 10).toBeGreaterThanOrEqual(SPIKE_MIN);
    expect(sp.x + 10).toBeLessThanOrEqual(SPIKE_MAX);
  });

  it('cracks the floor as it comes up, once', () => {
    const p = player(5600);
    forceSpike(p);
    fx.played.length = 0;
    tick(p, SPIKE_GLINT + 0.1);
    expect(fx.played.filter(n => n === 'crack')).toHaveLength(1);
  });

  it('hurts what is standing in it', () => {
    const p = player(5600);
    const sp = forceSpike(p);
    sp.x = p.x; // stand the player in the column
    sp.t = SPIKE_GLINT + SPIKE_RISE;
    const hp = p.hp;
    tick(p, DT);
    expect(p.hp).toBeLessThan(hp);
  });

  it('clears itself up rather than piling up', () => {
    tick(player(5600), 30);
    expect(e.spikes.length).toBeLessThan(4);
  });
});

describe('the stagger', () => {
  it('a hit mid-cast lands but does not break the cast (BOSS-PLAN B6)', () => {
    const p = player(5500);
    let armed = false;
    for (let i = 0; i < 2000 && !armed; i++) {
      getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx });
      armed = !!e.wind;
    }
    const wind = e.wind, hp = e.hp;
    damageEnemy(e, fx, cam(), 1, lvl);
    expect(e.hp).toBe(hp - 1);
    expect(e.wind).toBe(wind);
    expect(e.staggerT ?? 0).toBe(0);
  });

  it('stops her for a beat on a clean hit outside a cast', () => {
    const p = player(5500);
    getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx }); // her first frame sets her state up
    e.wind = null; e.staggerCd = 0; e.openT = 1; // the opening after an attack
    damageEnemy(e, fx, cam(), 1, lvl);
    expect(e.staggerT).toBeCloseTo(STAGGER, 5);
    const x0 = e.x;
    tick(p, STAGGER - 0.05);
    expect(e.x).toBe(x0); // no drift while staggered
  });

  it('costs her a point and nothing more', () => {
    damageEnemy(e, fx, cam(), 1, lvl);
    expect(e.hp).toBe(QUEEN_HP - 1);
    tick(player(), 2);
    expect(e.hp).toBe(QUEEN_HP - 1); // the stagger neither heals nor refunds
  });
});

describe('determinism', () => {
  it('two fights from the same spawn play out identically', () => {
    const mk = () => {
      const l = createLevel9(600);
      const q = spawnEnemy(l.roster.find(r => r.kind === 'queenboss'), l);
      l.queenUnfreeze = { t: 0, boss: false };
      const f = spy();
      for (let i = 0; i < Math.round((WAKE_STEP + 0.1) / DT); i++) updateQueenWake(l, [q], DT, f, cam());
      return { l, q, f };
    };
    const seq = ({ l, q, f }) => {
      const p = player(5700);
      const out = [];
      for (let i = 0; i < 1800; i++) {
        getKind('queenboss').update(q, { p, lvl: l, cam: cam(), dt: DT, fx: f });
        out.push(`${q.wind ?? '-'}${q.spikes.length}${q.x.toFixed(1)}`);
      }
      return out.join('|');
    };
    expect(seq(mk())).toBe(seq(mk()));
  });
});

describe('the house boss rules still hold', () => {
  it('bounces a stomp and takes arrows one at a time', () => {
    expect(getKind('queenboss').stompable).toBe(false);
    expect(getKind('queenboss').hitValue(e, false)).toBe(1);
    expect(getKind('queenboss').hitValue(e, true)).toBe(1);
  });

  it('is exempt from the sunbeam, like every boss before her', async () => {
    const { game, startGame, fireSunbeam } = await import('../src/game.js');
    startGame(600, 8);
    const q = game.enemies.find(en => en.kind === 'queenboss');
    q.sleeping = false;
    q.x = 5560;
    game.camera.x = 5200;
    fireSunbeam(game.player, game.level, fx, 800);
    expect(q.dead).toBe(false);
    startGame(600, 0);
  });
});

// ---------------------------------------------------------------------------
// Phases 2 and 3.
describe('the phase gates', () => {
  const toHp = hp => { e.hp = hp + 1; damageEnemy(e, fx, cam(), 1, lvl); };

  it('stops her for over a second at 16, and steps the level’s drone', () => {
    const p = player(5500);
    toHp(P2_AT);
    tick(p, DT);
    expect(e.phase).toBe(2);
    expect(e.phaseT).toBeGreaterThan(0);
    expect(lvl.thaw.bossThaws).toBe(1);
    expect(fx.played).toContain('gust');
    const x0 = e.x;
    tick(p, PHASE_PAUSE - 0.1);
    expect(e.x).toBe(x0); // no drift, no attacks: the one window in the fight
  });

  it('cracks the guard at 16 and the child at 8 — and neither one thaws', () => {
    const p = player(5500);
    toHp(P2_AT);
    tick(p, DT);
    const guard = lvl.hallFigures.find(f => f.kind === 'guard');
    expect(guard.state).toBe('drip');
    expect(fx.played).toContainEqual(['melt', 0.5]);
    tick(p, 3);
    toHp(P3_AT);
    tick(p, DT);
    expect(e.phase).toBe(3);
    expect(lvl.thaw.bossThaws).toBe(2);
    expect(lvl.hallFigures.find(f => f.kind === 'child').state).toBe('drip');
    // updateThaw is what returns them to frozen; the fight never releases one
    for (const f of lvl.hallFigures) expect(f.state).not.toBe('gone');
  });

  it('fires once per gate, on the hp edge', () => {
    const p = player(5500);
    toHp(P2_AT);
    tick(p, 4);
    e.hp = P2_AT - 1;
    tick(p, 4);
    expect(lvl.thaw.bossThaws).toBe(1); // still inside phase 2: no second step
  });

  it('reads the phase off hp, so it always matches the pips', () => {
    expect(phaseOf({ hp: 21 })).toBe(1);
    expect(phaseOf({ hp: 15 })).toBe(1);
    expect(phaseOf({ hp: 14 })).toBe(2);
    expect(phaseOf({ hp: 8 })).toBe(2);
    expect(phaseOf({ hp: 7 })).toBe(3);
    expect(phaseOf({ hp: 1 })).toBe(3);
  });
});

describe('the frozen breath', () => {
  const forceBreath = p => {
    for (let i = 0; i < 4000 && !cones.length; i++) {
      getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx });
    }
    return cones[0];
  };

  it('is a short cone that leaves ice where it lands', () => {
    e.hp = 12; // phase 2
    const p = player(5450);
    const cone = forceBreath(p);
    expect(cone).toBeTruthy();
    expect(cone.reach).toBe(BREATH_REACH);
    expect(cone.frost).toBe(true);
    expect(lvl.frostPatches).toHaveLength(1);
    expect(lvl.frostPatches[0].w).toBe(80);
  });

  it('makes the floor it lands on slide, whatever it is made of', () => {
    e.hp = 12;
    const p = player(5450);
    forceBreath(p);
    const patch = lvl.frostPatches[0];
    const standing = { x: patch.x + 20, y: 560 - 36, w: 28, h: 36, onGround: true, boots: 10, dead: false };
    expect(effectiveKind(standing, lvl)).toBe('ice'); // even in boots
  });

  it('stops well short of a dragon’s reach', () => {
    e.hp = 12;
    const cone = forceBreath(player(5450));
    expect(cone.reach).toBeLessThan(CONE_LEN);
  });
});

describe('the double spike', () => {
  it('puts a second glint out beside the first once she is wounded', () => {
    e.hp = 12; // phase 2
    const p = player(5600);
    for (let i = 0; i < 4000 && (e.spikes?.length ?? 0) < 2; i++) {
      getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx });
    }
    expect(e.spikes.length).toBeGreaterThanOrEqual(2);
    const xs = e.spikes.slice(0, 2).map(sp => sp.x).sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBeGreaterThan(0);
  });
});

describe('the blizzard', () => {
  const forceBlizzard = p => {
    for (let i = 0; i < 8000 && !lvl.blizzard; i++) {
      getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx });
    }
    return lvl.blizzard;
  };

  it('opens a three-second window of her own weather', () => {
    e.hp = 4; // phase 3
    const b = forceBlizzard(player(5500));
    expect(b).toBeTruthy();
    expect(b.t).toBeCloseTo(BLIZZ_TIME, 1);
    expect(fx.played).toContain('gust');
  });

  it('rolls three slow waves through it, staggered', () => {
    e.hp = 4;
    forceBlizzard(player(5500));
    resetShockwaves();
    const p = player(5500);
    tick(p, BLIZZ_TIME);
    expect(shockwaves.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(shockwaves[0].vx)).toBe(BLIZZ_WAVE_SPEED); // slower than a slam
    expect(shockwaves[0].bounds).toEqual(SHOCK_BOUNDS);
  });

  it('closes on its own and does not linger', () => {
    e.hp = 4;
    forceBlizzard(player(5500));
    tick(player(5500), BLIZZ_TIME + 0.2);
    expect(lvl.blizzard).toBeNull();
  });

  it('will not blow twice in a row', () => {
    e.hp = 4;
    forceBlizzard(player(5500));
    expect(e.blizzCd).toBeCloseTo(BLIZZ_CD, 1);
    tick(player(5500), BLIZZ_TIME + 0.2);
    tick(player(5500), 3); // still inside the cooldown
    expect(lvl.blizzard).toBeNull();
  });

  it('pushes rather than shoves', () => {
    // a seeded wobble, pure in time, bounded — it nudges your footing, it
    // does not take the level away from you
    for (let t = 0; t < 10; t += 0.13) {
      expect(Math.abs(blizzardWobble(t))).toBeLessThanOrEqual(1);
    }
    expect(blizzardWobble(1)).toBe(blizzardWobble(1));
  });
});

describe('the last winter’s footwork', () => {
  it('lunges and stops instead of keeping pace', () => {
    e.hp = 4;
    const p = player(5500);
    const speeds = [];
    let last = e.x;
    for (let i = 0; i < 900; i++) {
      getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx });
      speeds.push(Math.abs(e.x - last) / DT);
      last = e.x;
    }
    expect(Math.max(...speeds)).toBeGreaterThan(DRIFT_P2); // faster than phase 2
    expect(speeds.filter(v => v < 1).length).toBeGreaterThan(60); // and it stops
  });

  it('stays in the arena even while lunging', () => {
    e.hp = 4;
    for (const px of [5250, 5980]) {
      const p = player(px);
      for (let i = 0; i < 1200; i++) {
        getKind('queenboss').update(e, { p, lvl, cam: cam(), dt: DT, fx });
        expect(e.x).toBeGreaterThanOrEqual(ARENA_W);
        expect(e.x + e.w).toBeLessThanOrEqual(ARENA_E);
      }
    }
  });
});
