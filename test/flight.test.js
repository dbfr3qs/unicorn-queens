// Flight spell: 10 s of four-way flight (S casts, arrows steer), 15 s
// recharge, landing cancels, permanent once learned.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/level.js';
import {
  createPlayer, updatePlayer, P_H, P_SPEED,
  FLIGHT_TIME, FLIGHT_CD, FLY_UP, FLY_DOWN, FLY_SINK, FLY_CEIL,
} from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { arrows, resetArrows } from '../src/arrows.js';
import { startGame } from '../src/game.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });
const noopInp = over => ({ left: false, right: false, jump: false, fire: false, up: false, down: false, cast: false, ...over });

// A player with the spell settled on level-1 ground at x=500.
const flyer = () => {
  const l = createLevel(600);
  const p = createPlayer(l, { hasFlight: true, hasBow: true });
  p.x = 500; p.y = l.groundY - P_H;
  const cam = createCamera();
  updatePlayer(p, noopInp(), l, cam, DT, fx([])); // settle: onGround/coyote live
  return { l, p, cam };
};
const frame = (p, l, cam, calls, over = {}) => updatePlayer(p, noopInp(over), l, cam, DT, fx(calls));
// Teleport and run one free-fall frame so the stale onGround from the
// settle frame clears (otherwise a cast thinks it's grounded).
const lift = (p, l, cam, y) => { p.y = y; frame(p, l, cam, []); };

afterEach(() => {
  resetArrows();
  startGame(600, 0);
});

describe('cast', () => {
  it('requires the spell', () => {
    const l = createLevel(600);
    const p = createPlayer(l); // no hasFlight
    p.x = 500; p.y = l.groundY - P_H;
    const cam = createCamera();
    const calls = [];
    updatePlayer(p, noopInp({ cast: true }), l, cam, DT, fx(calls));
    expect(p.flying).toBe(false);
    expect(calls).not.toContain('cast');
  });

  it('starts a 10 s flight and plays the cast sfx', () => {
    const { l, p, cam } = flyer();
    const calls = [];
    frame(p, l, cam, calls, { cast: true });
    expect(p.flying).toBe(true);
    expect(p.flightT).toBeCloseTo(FLIGHT_TIME - DT, 5);
    expect(calls).toContain('cast');
  });

  it('a ground cast launches upward instead of sinking into the floor', () => {
    const { l, p, cam } = flyer();
    const y0 = p.y;
    frame(p, l, cam, [], { cast: true });
    expect(p.y).toBeLessThan(y0);
  });

  it('ignores a second cast while flying', () => {
    const { l, p, cam } = flyer();
    frame(p, l, cam, [], { cast: true });
    const t0 = p.flightT;
    frame(p, l, cam, [], { cast: true });
    expect(p.flightT).toBe(t0 - DT); // not reset to FLIGHT_TIME
  });
});

describe('physics while flying', () => {
  const airborne = () => {
    const { l, p, cam } = flyer();
    lift(p, l, cam, l.groundY - P_H - 150);
    frame(p, l, cam, [], { cast: true });
    return { l, p, cam };
  };

  it('up ascends at FLY_UP', () => {
    const { l, p, cam } = airborne();
    frame(p, l, cam, [], { up: true });
    expect(p.vy).toBe(-FLY_UP);
  });

  it('down descends at FLY_DOWN', () => {
    const { l, p, cam } = airborne();
    frame(p, l, cam, [], { down: true });
    expect(p.vy).toBe(FLY_DOWN);
  });

  it('no vertical input drifts down gently', () => {
    const { l, p, cam } = airborne();
    const y0 = p.y;
    frame(p, l, cam, []);
    expect(p.vy).toBe(FLY_SINK);
    expect(p.y).toBeCloseTo(y0 + FLY_SINK * DT, 5);
  });

  it('left and right steer at run speed', () => {
    let a = airborne();
    frame(a.p, a.l, a.cam, [], { left: true });
    expect(a.p.vx).toBe(-P_SPEED);
    a = airborne();
    frame(a.p, a.l, a.cam, [], { right: true });
    expect(a.p.vx).toBe(P_SPEED);
  });

  it('clamps at the dungeon ceiling', () => {
    const { l, p, cam } = flyer();
    lift(p, l, cam, 100);
    frame(p, l, cam, [], { cast: true });
    for (let i = 0; i < 30; i++) frame(p, l, cam, [], { up: true });
    expect(p.y).toBe(FLY_CEIL);
    expect(p.vy).toBe(0); // pushing up into the ceiling does not accumulate
  });

  it('can fire arrows while flying', () => {
    const { l, p, cam } = airborne();
    const calls = [];
    frame(p, l, cam, calls, { fire: true });
    expect(arrows.length).toBe(1);
    expect(calls).toContain('fire');
  });

  it('jumps and hops are suspended while flying', () => {
    const { l, p, cam } = flyer();
    p.hops = 2;
    frame(p, l, cam, [], { cast: true }); // ground cast: launch frame
    frame(p, l, cam, [], { jump: true });
    expect(p.hops).toBe(2);
    expect(p.vy).toBe(-FLY_UP); // launch, not a jump
  });
});

describe('ending flight', () => {
  it('landing cancels flight and starts the cooldown', () => {
    const { l, p, cam } = flyer();
    lift(p, l, cam, l.groundY - P_H - 60); // 60 px above the floor
    frame(p, l, cam, [], { cast: true });
    const calls = [];
    for (let i = 0; i < 60 && p.flying; i++) frame(p, l, cam, calls, { down: true });
    expect(p.flying).toBe(false);
    expect(p.onGround).toBe(true);
    expect(p.flightCd).toBeGreaterThan(FLIGHT_CD - 2 * DT);
    expect(calls).toContain('flightEnd');
  });

  it('expiry starts the cooldown, and a recast works after it', () => {
    const { l, p, cam } = flyer();
    const calls = [];
    frame(p, l, cam, calls, { cast: true });
    // hold up: pinned to the ceiling, so only expiry can end the flight
    for (let i = 0; i < 800 && p.flying; i++) frame(p, l, cam, calls, { up: true });
    expect(p.flying).toBe(false);
    expect(p.flightCd).toBeGreaterThan(FLIGHT_CD - 2 * DT);
    expect(calls).toContain('flightEnd');
    // immediately after: still cooling down
    frame(p, l, cam, [], { cast: true });
    expect(p.flying).toBe(false);
    // after the 15 s recharge: castable again
    for (let i = 0; i < 950 && p.flightCd > 0; i++) frame(p, l, cam, []);
    expect(p.flightCd).toBe(0);
    frame(p, l, cam, [], { cast: true });
    expect(p.flying).toBe(true);
  });

  it('cannot cast during the cooldown', () => {
    const { l, p, cam } = flyer();
    frame(p, l, cam, [], { cast: true });
    for (let i = 0; i < 800 && p.flying; i++) frame(p, l, cam, [], { up: true });
    frame(p, l, cam, [], { cast: true });
    expect(p.flying).toBe(false);
    expect(p.flightCd).toBeGreaterThan(0);
  });

  it('falling in a pit while flying ends the flight and respawns', () => {
    const { l, p, cam } = flyer();
    // x=1605 is in level-1's second gap (1600-1800) clear of the 1640 platform
    p.x = 1605; p.y = 200; // safe spot is still 500 from the settle frame
    frame(p, l, cam, [], { cast: true });
    for (let i = 0; i < 200; i++) frame(p, l, cam, [], { down: true }); // falls out the bottom ~frame 135
    expect(p.flying).toBe(false);
    expect(p.hp).toBe(2); // one pit hit
    expect(p.x).toBe(500); // respawned at the last safe spot
  });
});
