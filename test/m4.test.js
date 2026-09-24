// Level 9 M4: the ground rules the boots and the hearths change, the level's
// two voices, and the Frost Queen's entrance.
//
// effectiveKind is the level's whole physical argument in one function — the
// boots answer the peak's slide, a lit hearth answers the floor, and a frost
// patch answers both — so its precedence is pinned rule by rule.
import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel9 } from '../src/levels/level9.js';
import { createLevel7 } from '../src/levels/level7.js';
import { effectiveKind, standingKind } from '../src/levels/level.js';
import { igniteBrazier, frostPatch } from '../src/thaw.js';
import { spawnEnemy } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import {
  updateQueenWake, WAKE_SHELL, WAKE_STEP, THRONE_X, THRONE_Y, ARENA_X, ARENA_Y, QUEEN_HP, pipRows,
} from '../src/enemies/queenboss.js';

const DT = 1 / 60;
const spy = () => { const played = []; return { play: (n, a) => played.push(a === undefined ? n : [n, a]), played }; };

let lvl, fx;
beforeEach(() => { lvl = createLevel9(600); fx = spy(); });

// A grounded player standing at x on the floor line.
const stand = (x, boots = 0) => ({ x, y: 560 - 36, w: 28, h: 36, onGround: true, boots, dead: false });

describe('what the ground does', () => {
  it('slides on plain glacier ice', () => {
    expect(effectiveKind(stand(400), lvl)).toBe('ice');
  });

  it('grips in boots — the peak’s slide, finally answered', () => {
    expect(effectiveKind(stand(400, 10), lvl)).toBe('stone');
  });

  it('leaves the hall’s stone and the melted floor alone: boots only touch ice', () => {
    expect(effectiveKind(stand(4000), lvl)).toBe('stone');
    expect(effectiveKind(stand(4000, 10), lvl)).toBe('stone');
  });

  it('turns to wet stone under a hearth that has finished melting', () => {
    igniteBrazier(lvl, 0, fx);
    const under = stand(970);
    expect(effectiveKind(under, lvl)).toBe('ice'); // the melt is not done yet
    lvl.thaw.rings[0].t = 1;
    expect(effectiveKind(under, lvl)).toBe('thaw');
    expect(effectiveKind(stand(970, 10), lvl)).toBe('thaw'); // boots change nothing here
  });

  it('stops at the ring’s edge', () => {
    igniteBrazier(lvl, 0, fx);
    lvl.thaw.rings[0].t = 1;
    expect(effectiveKind(stand(1050), lvl)).toBe('thaw'); // 76 px from the hearth
    expect(effectiveKind(stand(1200), lvl)).toBe('ice'); // 226 px: outside it
  });

  it('slides on a frost patch whatever is underneath, boots or not', () => {
    frostPatch(lvl, 4000, 80); // laid on the hall's stone floor
    expect(effectiveKind(stand(4030), lvl)).toBe('ice');
    expect(effectiveKind(stand(4030, 10), lvl)).toBe('ice'); // new ice beats the grip
    igniteBrazier(lvl, 2, fx);
    lvl.thaw.rings[2].t = 1;
    frostPatch(lvl, 4400, 80); // and it beats a melted ring too
    expect(effectiveKind(stand(4430), lvl)).toBe('ice');
  });

  it('is the plain surface everywhere else in the game', () => {
    const l7 = createLevel7(600);
    const p = { x: 1300, y: 560 - 36, w: 28, h: 36, onGround: true, boots: 10, dead: false };
    expect(effectiveKind(p, l7)).toBe('ice'); // level 7's slide is level 7's problem
    expect(effectiveKind(p, l7)).toBe(standingKind(p, l7));
  });

  it('reports nothing in the air, like standingKind', () => {
    const p = stand(400);
    p.onGround = false;
    expect(effectiveKind(p, lvl)).toBe(null);
  });
});

describe('the Queen, before she wakes', () => {
  const spawnQueen = () => spawnEnemy(lvl.roster.find(r => r.kind === 'queenboss'), lvl);

  it('sits on the throne with the full 24', () => {
    const e = spawnQueen();
    expect(e.hp).toBe(QUEEN_HP);
    expect([e.x, e.y, e.w, e.h]).toEqual([THRONE_X, THRONE_Y, 56, 60]);
    expect(e.sleeping).toBe(true);
    expect(getKind('queenboss').stompable).toBe(false);
  });

  it('rings arrows off: she is still a statue', () => {
    const e = spawnQueen();
    expect(getKind('queenboss').arrowBlocked(e, {})).toBe(true);
    e.sleeping = false;
    e.wind = 'bolt'; // awake and casting: open (the frost mail, BOSS-PLAN B6)
    expect(getKind('queenboss').arrowBlocked(e, {})).toBe(false);
  });

  it('does nothing at all until the level moves her', () => {
    const e = spawnQueen();
    const p = stand(5500);
    for (let i = 0; i < 300; i++) getKind('queenboss').update(e, { p, lvl, cam: { x: 0 }, dt: DT, fx });
    expect(e.x).toBe(THRONE_X);
    expect(e.y).toBe(THRONE_Y);
  });
});

describe('the entrance', () => {
  let e, enemies;
  beforeEach(() => {
    e = spawnEnemy(lvl.roster.find(r => r.kind === 'queenboss'), lvl);
    enemies = [e];
    lvl.queenUnfreeze = { t: 0, boss: false };
  });
  const wake = seconds => {
    for (let i = 0; i < Math.round(seconds / DT); i++) updateQueenWake(lvl, enemies, DT, fx, { x: 0, shake: 0, mag: 0 });
  };

  it('breaks the shell first, and she does not move while it comes off', () => {
    wake(DT);
    expect(fx.played).toContain('crack');
    wake(WAKE_SHELL - 0.1);
    expect(e.x).toBe(THRONE_X);
    expect(e.y).toBe(THRONE_Y);
  });

  it('steps her west off the dais and down onto the ice', () => {
    wake(WAKE_SHELL + (WAKE_STEP - WAKE_SHELL) / 2);
    expect(e.x).toBeLessThan(THRONE_X); // moving west
    expect(e.x).toBeGreaterThan(ARENA_X);
    expect(e.y).toBeGreaterThan(THRONE_Y); // and down
    wake(WAKE_STEP);
    expect(e.x).toBe(ARENA_X);
    expect(e.y).toBe(ARENA_Y);
  });

  it('ends in the fight — there is no third state', () => {
    wake(WAKE_STEP + 0.1);
    expect(e.sleeping).toBe(false);
    expect(fx.played).toContain('boss');
    expect(lvl.queenUnfreeze.done).toBe(true);
  });

  it('never runs twice, and never runs backwards', () => {
    wake(WAKE_STEP + 1);
    const at = [e.x, e.y];
    wake(3);
    expect([e.x, e.y]).toEqual(at);
    expect(fx.played.filter(n => n === 'boss')).toHaveLength(1);
  });

  it('is frozen by an open dialogue box, because the whole world is', () => {
    // the beat's onOpen starts it, and update() returns early while a box is
    // open — so the shell shatters behind the second line, not before it
    const before = lvl.queenUnfreeze.t;
    expect(before).toBe(0);
  });
});

describe('her pips', () => {
  it('read as three rows of seven, draining from the top', () => {
    expect(pipRows({ hp: 21 })).toEqual([7, 7, 7]); // 24 in rows of 8 before BOSS-PLAN B6
    expect(pipRows({ hp: 18 })).toEqual([4, 7, 7]);
    expect(pipRows({ hp: 14 })).toEqual([0, 7, 7]); // the phase-2 gate
    expect(pipRows({ hp: 7 })).toEqual([0, 0, 7]); // the phase-3 gate
    expect(pipRows({ hp: 1 })).toEqual([0, 0, 1]);
    expect(pipRows({ hp: 0 })).toEqual([0, 0, 0]);
  });
});
