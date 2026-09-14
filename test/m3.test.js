// Level 9 M3: the mercy beats, the King's walk, the frost sprites and the
// glacier golems.
//
// The beats have no collision and no score, so nothing else in the game would
// notice if they silently stopped happening — which is exactly why they are
// pinned here. The two enemies are pinned for the opposite reason: they are
// the only things in the level that can kill you before the arena.
import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel9 } from '../src/levels/level9.js';
import {
  updateThaw, igniteBrazier, HARE_RUN, HARE_HOME, WRAITH_FADE, DRIP_TIME,
  ROBIN_WAIT, ROBIN_THAW, ROBIN_FLY,
} from '../src/thaw.js';
import { updateKing, KING_SPEED, KING_LEAD, KING_STAND_X, KING_SEAL_GAP, KING_PAUSE, KING_RANGE, KING_FIRE_CD, KING_FIRE_SETTLE } from '../src/king.js';
import { arrows, resetArrows } from '../src/arrows.js';
import { spawnEnemy, damageEnemy } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { fireballs, resetFireballs, shockwaves, resetShockwaves, boulders, resetBoulders, updateBoulders } from '../src/projectiles.js';

const DT = 1 / 60;
const spy = () => { const played = []; return { play: (n, a) => played.push(a === undefined ? n : [n, a]), played }; };
const at = (x, y = 504) => ({ x, y, w: 28, h: 56, dead: false, invuln: 0, hp: 3 });

let lvl, fx;
beforeEach(() => { lvl = createLevel9(600); fx = spy(); resetFireballs(); resetShockwaves(); resetBoulders(); resetArrows(); });

const run = (p, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) updateThaw(lvl, p, DT, fx);
};

describe('the hare, at hearth A', () => {
  it('cracks out, runs east, and is gone past the seal', () => {
    igniteBrazier(lvl, 0, fx);
    const h = lvl.frozenHare;
    expect(h.state).toBe('releasing');
    run(at(0), 0.4);
    expect(fx.played).toContain('crack'); // the block gives way
    run(at(0), 0.7);
    expect(h.state).toBe('running');
    const x0 = h.x;
    run(at(0), 1);
    expect(h.x - x0).toBeCloseTo(HARE_RUN, 0); // it does not sprint; it goes home
    run(at(0), (HARE_HOME - h.x) / HARE_RUN + 0.5);
    expect(h.state).toBe('gone');
  });

  it('only ever leaves once', () => {
    igniteBrazier(lvl, 0, fx);
    run(at(0), 30);
    expect(lvl.frozenHare.state).toBe('gone');
    igniteBrazier(lvl, 0, fx); // the same fire, lit again by a test
    expect(lvl.frozenHare.state).toBe('gone');
  });
});

describe('the wraith, at hearth B', () => {
  it('sparkles free and fades out over a second', () => {
    igniteBrazier(lvl, 1, fx);
    run(at(0), DT);
    expect(fx.played).toContain('grant');
    expect(lvl.frozenWraith.state).toBe('fading');
    run(at(0), WRAITH_FADE - 0.1);
    expect(lvl.frozenWraith.state).toBe('fading');
    run(at(0), 0.2);
    expect(lvl.frozenWraith.state).toBe('gone');
  });

  it('does not run: it is not going anywhere', () => {
    const x0 = lvl.frozenWraith.x;
    igniteBrazier(lvl, 1, fx);
    run(at(0), 0.8);
    expect(lvl.frozenWraith.x).toBe(x0);
  });
});

describe('the scholar, at hearth C', () => {
  it('drips for a second and freezes again', () => {
    igniteBrazier(lvl, 2, fx);
    const scholar = lvl.hallFigures.find(f => f.kind === 'scholar');
    expect(scholar.state).toBe('drip');
    expect(fx.played).toContainEqual(['melt', 0.5]);
    run(at(0), DRIP_TIME - 0.1);
    expect(scholar.state).toBe('drip');
    run(at(0), 0.2);
    expect(scholar.state).toBe('frozen'); // a pre-taste, not a release
  });

  it('leaves the other four alone', () => {
    igniteBrazier(lvl, 2, fx);
    const others = lvl.hallFigures.filter(f => f.kind !== 'scholar');
    for (const f of others) expect(f.state).toBe('frozen');
  });
});

describe('the robin, after the arrow', () => {
  it('waits, thaws, and flies off', () => {
    lvl.frozenBird.state = 'shattered';
    lvl.frozenBird.t = 0;
    run(at(0), ROBIN_WAIT + 0.02);
    expect(lvl.frozenBird.state).toBe('thawing');
    run(at(0), ROBIN_THAW + 0.02);
    expect(lvl.frozenBird.state).toBe('flying');
    run(at(0), ROBIN_FLY + 0.02);
    expect(lvl.frozenBird.state).toBe('gone');
  });

  it('needs no hearth: the arrow was its mercy', () => {
    lvl.frozenBird.state = 'shattered';
    run(at(0), 3);
    expect(lvl.thaw.thaws).toBe(0);
    expect(lvl.frozenBird.state).toBe('gone');
  });
});

describe('the King', () => {
  const stepKing = (p, seconds) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) updateKing(lvl, p, DT, fx);
  };

  it('walks ahead of the player, not behind', () => {
    const p = at(600);
    stepKing(p, 5);
    expect(lvl.king.x).toBeCloseTo(600 + KING_LEAD, 0);
  });

  it('never goes back when the player does', () => {
    const p = at(900);
    stepKing(p, 5);
    const ahead = lvl.king.x;
    p.x = 200; // the player doubles back for a box
    stepKing(p, 5);
    expect(lvl.king.x).toBe(ahead); // he waits; he does not follow
  });

  it('stops short of a seal that has not opened', () => {
    const p = at(1500);
    stepKing(p, 20);
    expect(lvl.king.x).toBeCloseTo(lvl.doors[0].x - KING_SEAL_GAP, 0);
    expect(lvl.king.state).toBe('wait');
  });

  it('takes a beat, then walks on once it opens', () => {
    const p = at(1500);
    stepKing(p, 20);
    lvl.doors[0].state = 'open';
    stepKing(p, KING_PAUSE - 0.1);
    expect(lvl.king.state).toBe('wait'); // the pause is real
    stepKing(p, 0.2);
    expect(lvl.king.state).toBe('walk');
  });

  it('ends standing just inside the throne door', () => {
    for (const d of lvl.doors) d.state = 'open';
    const p = at(5900);
    stepKing(p, 40);
    expect(lvl.king.x).toBe(KING_STAND_X);
    expect(lvl.king.state).toBe('stand');
    stepKing(p, 5);
    expect(lvl.king.x).toBe(KING_STAND_X); // and he stays there
  });

  it('is monotonic east over a long run with a wandering player', () => {
    for (const d of lvl.doors) d.state = 'open';
    const p = at(0);
    let last = lvl.king.x;
    for (let i = 0; i < 1800; i++) {
      p.x = 400 + Math.sin(i / 40) * 900 + i * 2; // forward, with backtracking
      updateKing(lvl, p, DT, fx);
      expect(lvl.king.x).toBeGreaterThanOrEqual(last);
      last = lvl.king.x;
    }
  });

  it('never outruns his own speed', () => {
    const p = at(4000);
    let last = lvl.king.x;
    for (let i = 0; i < 600; i++) {
      updateKing(lvl, p, DT, fx);
      expect(lvl.king.x - last).toBeLessThanOrEqual(KING_SPEED * DT + 1e-6);
      last = lvl.king.x;
    }
  });
});

describe("the King's bow", () => {
  // A golem standing still `d` px east of him, and him held still by a
  // player who is behind him (target <= k.x: he waits where he is).
  const golemAt = x => spawnEnemy({ kind: 'golem', x, minX: x, maxX: x + 48 }, lvl);
  const held = () => { const p = at(0); p.x = -200; return p; };
  const step = (p, enemies, seconds) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) updateKing(lvl, p, DT, fx, enemies);
  };

  it('shoots the thing ahead of him, gold-fletched, at its height', () => {
    const k = lvl.king, g = golemAt(k.x + 200);
    step(held(), [g], KING_FIRE_SETTLE + DT);
    expect(arrows).toHaveLength(1);
    expect(arrows[0]).toMatchObject({ king: true, x: k.x + k.w });
    expect(arrows[0].vx).toBeGreaterThan(0); // east, the way he faces
    expect(arrows[0].y).toBeCloseTo(g.y + g.h / 2 - 2, 5); // aimed: the launch height is the aim
    expect(fx.played).toContain('fire');
  });

  it('does not open the level firing, and then keeps his interval', () => {
    const k = lvl.king, g = golemAt(k.x + 200);
    step(held(), [g], KING_FIRE_SETTLE - 2 * DT);
    expect(arrows).toHaveLength(0); // the settle: nothing yet
    step(held(), [g], KING_FIRE_CD * 3);
    expect(arrows.length).toBeGreaterThanOrEqual(3);
    expect(arrows.length).toBeLessThanOrEqual(4);
  });

  it('ignores what is behind him, out of range, asleep, dead — and the Queen', () => {
    const k = lvl.king;
    const behind = golemAt(k.x - 120);
    const far = golemAt(k.x + KING_RANGE + 60);
    const dead = golemAt(k.x + 150); dead.dead = true;
    const asleep = golemAt(k.x + 160); asleep.sleeping = true;
    const queen = spawnEnemy(lvl.roster.find(r => r.kind === 'queenboss'), lvl);
    queen.x = k.x + 100; queen.sleeping = false;
    step(held(), [behind, far, dead, asleep, queen], 6);
    expect(arrows).toHaveLength(0);
  });

  it('picks the nearest of several', () => {
    const k = lvl.king;
    const near = golemAt(k.x + 240), nearer = golemAt(k.x + 90);
    nearer.y = 300; // parked in the air, so the aim tells them apart
    step(held(), [near, nearer], KING_FIRE_SETTLE + DT);
    expect(arrows).toHaveLength(1);
    expect(arrows[0].y).toBeCloseTo(nearer.y + nearer.h / 2 - 2, 5);
  });

  it('puts the bow away once he stands inside the throne door', () => {
    for (const d of lvl.doors) d.state = 'open';
    const p = at(5900);
    step(p, [], 40);
    expect(lvl.king.state).toBe('stand');
    resetArrows();
    const g = golemAt(lvl.king.x + 120);
    step(p, [g], 10);
    expect(arrows).toHaveLength(0);
  });
});

describe('the frost sprite', () => {
  const spawn = (x = 2150, y = 400) => spawnEnemy({ kind: 'sprite', x, y }, lvl);
  const tick = (e, p, seconds) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      getKind('sprite').update(e, { p, lvl, cam: { x: 0 }, dt: DT, fx });
    }
  };

  it('dies to one arrow and bounces a stomp', () => {
    const e = spawn();
    expect(e.hp).toBe(1);
    expect(getKind('sprite').stompable).toBe(false); // 16 px of ice: nothing to land on
    damageEnemy(e, fx, { x: 0 }, 1, lvl);
    expect(e.dead).toBe(true);
  });

  it('stays inside its own drift envelope', () => {
    const e = spawn();
    const p = at(0); // far away: it never darts
    for (let i = 0; i < 900; i++) {
      getKind('sprite').update(e, { p, lvl, cam: { x: 0 }, dt: DT, fx });
      expect(Math.abs(e.x - 2150)).toBeLessThanOrEqual(e.A + 1);
      expect(Math.abs(e.y - 400)).toBeLessThanOrEqual(e.B + 1);
    }
  });

  it('gathers for a beat, then throws one pale dart', () => {
    const e = spawn();
    const p = at(2160, 420);
    tick(e, p, 4); // past its seeded cooldown
    expect(fireballs.length).toBeGreaterThanOrEqual(1);
    const d = fireballs[0];
    expect(d.pale).toBe(true);
    expect(Math.hypot(d.vx, d.vy)).toBeCloseTo(200, 0);
    // the dart outlives its own trigger range: 0.8 s at 200 px/s is 160 px,
    // against the 140 px that set it off
    expect(d.ttl * Math.hypot(d.vx, d.vy)).toBeGreaterThan(140);
  });

  it('holds still while it gathers', () => {
    const e = spawn();
    const p = at(2160, 420);
    tick(e, p, 3); // let the cooldown run out and the wind-up start
    if (e.state === 'wind') {
      const x0 = e.x, y0 = e.y;
      tick(e, p, 0.2);
      expect(e.x).toBe(x0);
      expect(e.y).toBe(y0);
    }
  });

  it('is deterministic: two sprites at the same x drift identically', () => {
    const a = spawn(), b = spawn();
    const p = at(0);
    for (let i = 0; i < 300; i++) {
      getKind('sprite').update(a, { p, lvl, cam: { x: 0 }, dt: DT, fx });
      getKind('sprite').update(b, { p, lvl, cam: { x: 0 }, dt: DT, fx });
    }
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });
});

describe('the glacier golem', () => {
  const spawn = (x = 2000) => spawnEnemy({ kind: 'golem', x, band: [1900, 2150] }, lvl);
  const tick = (e, p, seconds) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      getKind('golem').update(e, { p, lvl, cam: { x: 0, shake: 0, mag: 0 }, dt: DT, fx });
    }
  };

  it('takes three hits and bounces a stomp', () => {
    const e = spawn();
    expect(e.hp).toBe(3);
    expect(getKind('golem').stompable).toBe(false);
  });

  it('patrols inside its band and never leaves it', () => {
    const e = spawn();
    const p = at(0); // out of every range
    for (let i = 0; i < 3600; i++) {
      getKind('golem').update(e, { p, lvl, cam: { x: 0 }, dt: DT, fx });
      expect(e.x).toBeGreaterThanOrEqual(1900);
      expect(e.x + e.w).toBeLessThanOrEqual(2150);
    }
  });

  it('does nothing at all beyond spit range', () => {
    const e = spawn();
    // far enough that even at the east end of its patrol it is out of reach:
    // the golem closes distance itself, so "out of range" has to allow for it
    tick(e, at(2600), 10);
    expect(shockwaves).toHaveLength(0);
    expect(boulders).toHaveLength(0);
  });

  it('slams: a wind-up, then twin waves along the floor', () => {
    const e = spawn();
    e.seed = 1; // force the slam branch of the LCG
    const p = at(2050);
    tick(e, p, 3);
    expect(fx.played).toContain('creak'); // the crouch
    expect(fx.played).toContain('thud');
    expect(shockwaves.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(shockwaves[0].vx)).toBe(160); // slower than the Warden's
    expect(shockwaves[0].ttl).toBe(2.0);
  });

  it('spits a frost boulder that lands as a patch', () => {
    const e = spawn();
    const p = at(2200); // inside spit range, outside slam range, walk included
    tick(e, p, 4);
    expect(fx.played).toContain('spit');
    expect(boulders.length).toBeGreaterThanOrEqual(1);
    expect(boulders[0].frost).toBe(true);
    for (let i = 0; i < 300 && boulders.length; i++) {
      updateBoulders(at(0), lvl, { x: 0 }, DT, fx);
    }
    expect(lvl.frostPatches).toHaveLength(1);
    expect(lvl.frostPatches[0].w).toBe(80);
  });

  it('is deterministic: two golems at the same x choose the same attacks', () => {
    const a = spawn(), b = spawn();
    const p = at(2100);
    const seq = g => {
      const out = [];
      for (let i = 0; i < 900; i++) {
        getKind('golem').update(g, { p, lvl, cam: { x: 0 }, dt: DT, fx });
        out.push(g.state);
      }
      return out.join('');
    };
    expect(seq(a)).toBe(seq(b));
  });
});
