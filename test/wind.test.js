// The Peak's wind: the pure phase function (10 s cycle: calm 6,
// telegraph 1, gust 3 — every 4th gust an updraft), the one howl per
// cycle from updateWind (zone-gated), the gust's headwind push
// (position, not vx), and the updraft's flight-timer pause + lift.
import { describe, it, expect, afterEach } from 'vitest';
import { windPhase, updateWind, WIND_CYCLE } from '../src/wind.js';
import { createLevel7 } from '../src/levels/level7.js';
import {
  createPlayer, updatePlayer, P_H, FLIGHT_TIME, FLY_UP, FLY_DOWN,
} from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const noopInp = over => ({ left: false, right: false, jump: false, fire: false, up: false, down: false, cast: false, ...over });

const unitRig = (x = 700, y = null) => {
  const lvl = createLevel7(600);
  const p = createPlayer(lvl, { hasBow: true, hasFlight: true });
  p.x = x;
  p.y = y ?? lvl.groundY - P_H;
  const cam = createCamera();
  updatePlayer(p, noopInp(), lvl, cam, DT, { play: () => {} }); // settle
  return { lvl, p, cam };
};

afterEach(() => {
  calls.length = 0;
  input.left = false; input.right = false; input.jump = false; input.fire = false;
  input.up = false; input.down = false;
  startGame(600, 0);
});

describe('windPhase (pure)', () => {
  it('calm 0–6, telegraph 6–7, gust 7–10 of a 10 s cycle', () => {
    expect(WIND_CYCLE).toBe(10);
    expect(windPhase(0)).toBe('calm');
    expect(windPhase(5.999)).toBe('calm');
    expect(windPhase(6)).toBe('telegraph');
    expect(windPhase(6.999)).toBe('telegraph');
    expect(windPhase(7)).toBe('gust');
    expect(windPhase(9.999)).toBe('gust');
    expect(windPhase(10)).toBe('calm');
  });

  it('every 4th gust (cycle 4, 8, …) is an updraft instead', () => {
    expect(windPhase(17)).toBe('gust'); // cycle 2
    expect(windPhase(27)).toBe('gust'); // cycle 3…
    expect(windPhase(37)).toBe('updraft'); // cycle 4 (t 37–39.99)
    expect(windPhase(39.999)).toBe('updraft');
    expect(windPhase(40)).toBe('calm');
    expect(windPhase(47)).toBe('gust'); // cycle 5 back to normal
    expect(windPhase(77)).toBe('updraft'); // cycle 8
  });
});

describe('updateWind (the one howl per cycle)', () => {
  it('stores the phase in level state and howls on the calm→telegraph edge, once per cycle', () => {
    const { lvl, p } = unitRig(700);
    let lastT = 0;
    for (let i = 0; i < 400; i++) { lastT = i * 0.1; updateWind(lvl, p, DT, fx, lastT); }
    expect(lvl.wind.phase).toBe(windPhase(lastT)); // tracks the clock
    expect(calls.filter(n => n === 'gust').length).toBe(4); // one per cycle, 4 cycles
  });

  it('the howl is zone-gated: no sfx with the player in the gate or the spire', () => {
    const { lvl, p } = unitRig(300); // the peakgate, outside [500, 3600)
    updateWind(lvl, p, DT, fx, 5.99);
    updateWind(lvl, p, DT, fx, 6.01); // the edge: no howl
    expect(calls).not.toContain('gust');
    p.x = 3700; // the spire interior
    updateWind(lvl, p, DT, fx, 15.99);
    updateWind(lvl, p, DT, fx, 16.01);
    expect(calls).not.toContain('gust');
    p.x = 700;
    updateWind(lvl, p, DT, fx, 25.99);
    updateWind(lvl, p, DT, fx, 26.01);
    expect(calls).toContain('gust');
  });

  it('a dead player does not howl', () => {
    const { lvl, p } = unitRig(700);
    p.dead = true;
    updateWind(lvl, p, DT, fx, 5.99);
    updateWind(lvl, p, DT, fx, 6.01);
    expect(calls).not.toContain('gust');
  });
});

describe('the gust push (full game loop)', () => {
  // startGame on level 7, settle the player, jump the clock into a gust
  // window (gameTime 7.5: cycle 0, c 7.5), run 60 frames, measure.
  const gustRun = (x, flying = false, frames = 60) => {
    startGame(600, 6);
    const p = game.player;
    p.x = x;
    p.y = flying ? game.level.groundY - 200 : game.level.groundY - P_H;
    p.vx = 0; p.vy = 0;
    if (flying) { p.flying = true; p.flightT = FLIGHT_TIME; p.flightLaunch = 0; }
    for (let i = 0; i < 5; i++) update(DT, 800, fx); // settle (calm)
    game.gameTime = 7.5; // into the gust window
    const x0 = p.x;
    for (let i = 0; i < frames; i++) update(DT, 800, fx);
    return p.x - x0;
  };

  it('a grounded player in the snowfield loses ~100 px in a second of gust', () => {
    const dx = gustRun(700);
    expect(dx).toBeLessThan(-95);
    expect(dx).toBeGreaterThan(-105);
  });

  it('no push while flying (the clean escape)', () => {
    expect(Math.abs(gustRun(700, true))).toBeLessThan(2);
  });

  it('no push outside the snowfield (gate or spire)', () => {
    expect(Math.abs(gustRun(400))).toBeLessThan(2);
    expect(Math.abs(gustRun(3700))).toBeLessThan(2);
  });

  it('a 338 ice slide keeps its vx through the gust (position moves, vx untouched)', () => {
    const { lvl, p, cam } = unitRig(1300);
    lvl.wind.phase = 'gust';
    p.vx = 338;
    for (let i = 0; i < 24; i++) {
      updatePlayer(p, noopInp(), lvl, cam, DT, { play: () => {} });
      p.x = 1300; p.y = lvl.groundY - P_H; p.vy = 0; // pin (the span is 150 px)
    }
    expect(p.vx).toBeGreaterThan(325); // the ice model’s 2%/s only
  });
});

describe('the updraft (full game loop)', () => {
  const updraftRun = (x, frames = 60) => {
    startGame(600, 6);
    const p = game.player;
    p.x = x;
    p.y = game.level.groundY - 200;
    p.vx = 0; p.vy = 0;
    p.flying = true; p.flightT = FLIGHT_TIME; p.flightLaunch = 0;
    for (let i = 0; i < 5; i++) update(DT, 800, fx); // settle
    game.gameTime = 37.5; // cycle 4: the updraft window
    const t0 = p.flightT;
    for (let i = 0; i < frames; i++) update(DT, 800, fx);
    return { p, dt: t0 - p.flightT, vy: p.vy };
  };

  it('in the zone, a neutral flyer’s timer is frozen and vy is the gentle −40 lift', () => {
    const { dt, vy } = updraftRun(700);
    expect(dt).toBeLessThan(0.01); // control: without the lift it drops a full second
    expect(vy).toBe(-40);
  });

  it('up/down still override the lift', () => {
    startGame(600, 6);
    const p = game.player;
    p.x = 700; p.y = game.level.groundY - 300;
    p.flying = true; p.flightT = FLIGHT_TIME; p.flightLaunch = 0;
    game.gameTime = 37.5;
    update(DT, 800, fx);
    input.up = true;
    update(DT, 800, fx);
    expect(p.vy).toBe(-FLY_UP);
    input.up = false; input.down = true;
    update(DT, 800, fx);
    expect(p.vy).toBe(FLY_DOWN);
    input.down = false;
  });

  it('outside the zone the timer runs as normal', () => {
    const { dt } = updraftRun(400);
    expect(dt).toBeCloseTo(1.0, 1);
  });
});
