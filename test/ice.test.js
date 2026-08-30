// Level 7 ice physics: the momentum model on ice spans/bridges (steer at
// ICE_ACCEL toward the held direction's ICE_MAX, ~no friction at rest,
// jump carry, flight exempt) and standingKind's surface probe.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel7 } from '../src/levels/level7.js';
import { standingKind } from '../src/levels/level.js';
import {
  createPlayer, updatePlayer, P_H, P_SPEED, ICE_MAX,
} from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { startGame } from '../src/game.js';

const DT = 1 / 60;
const fx = () => ({ play: () => {} });
const noopInp = over => ({ left: false, right: false, jump: false, fire: false, up: false, down: false, cast: false, ...over });

// A player settled on the first ice span (1250–1400) at x 1300.
const rig = (x = 1300, y = null) => {
  const lvl = createLevel7(600);
  const p = createPlayer(lvl, { hasBow: true, hasFlight: true });
  p.x = x;
  p.y = y ?? lvl.groundY - P_H;
  const cam = createCamera();
  updatePlayer(p, noopInp(), lvl, cam, DT, fx()); // settle: onGround/coyote live
  return { lvl, p, cam };
};
// Pin the player back on their surface between frames (the 150 px spans
// can't hold a 338 px/s slide for 300 frames; the model is what's under
// test, not the walk-off).
const pin = (p, lvl, x = 1300, y = null) => {
  p.x = x;
  p.y = y ?? lvl.groundY - P_H;
  p.vy = 0;
};
const frame = (p, lvl, cam, over = {}) => updatePlayer(p, noopInp(over), lvl, cam, DT, fx());

afterEach(() => startGame(600, 0));

describe('standingKind', () => {
  it('reads the surface under grounded feet, null airborne', () => {
    const { lvl, p } = rig();
    p.onGround = true;
    p.x = 1300; p.y = lvl.groundY - P_H;
    expect(standingKind(p, lvl)).toBe('ice'); // the crevasse-1 run-up span
    p.x = 750;
    expect(standingKind(p, lvl)).toBe('snow'); // the snowfield
    p.x = 6025; p.y = 520 - P_H; // on the cage dais (40 px up)
    expect(standingKind(p, lvl)).toBe('dais');
    p.x = 2450; p.y = 554 - P_H; // on the ice bridge (water level)
    expect(standingKind(p, lvl)).toBe('ice');
    p.onGround = false;
    expect(standingKind(p, lvl)).toBe(null);
  });
});

describe('the ice model', () => {
  it('holding a direction on ice accelerates to ICE_MAX (338) and holds it', () => {
    const { lvl, p, cam } = rig();
    for (let i = 0; i < 300; i++) { frame(p, lvl, cam, { right: true }); pin(p, lvl); }
    expect(Math.abs(p.vx - ICE_MAX)).toBeLessThan(2);
    expect(ICE_MAX).toBeCloseTo(338, 0);
  });

  it('the same input on snow snaps to exactly P_SPEED (260)', () => {
    const { lvl, p, cam } = rig(750);
    for (let i = 0; i < 5; i++) { frame(p, lvl, cam, { right: true }); pin(p, lvl, 750); }
    expect(p.vx).toBe(P_SPEED);
  });

  it('with no input on ice, vx decays ~2%/s and settles to 0', () => {
    const { lvl, p, cam } = rig();
    p.vx = 338;
    for (let i = 0; i < 60; i++) { frame(p, lvl, cam); pin(p, lvl); }
    expect(p.vx).toBeGreaterThan(331 - 3);
    expect(p.vx).toBeLessThan(331 + 3);
    for (let i = 0; i < 600; i++) { frame(p, lvl, cam); pin(p, lvl); }
    expect(p.vx).toBeLessThan(300);
  });

  it('reversing on ice steers at 900 px/s² (no instant flip)', () => {
    const { lvl, p, cam } = rig();
    p.vx = 338;
    for (let i = 0; i < 12; i++) { frame(p, lvl, cam, { left: true }); pin(p, lvl); } // 0.2 s
    expect(Math.abs(p.vx - 158)).toBeLessThan(10); // 338 − 900×0.2
    for (let i = 12; i < 42; i++) { frame(p, lvl, cam, { left: true }); pin(p, lvl); } // 0.7 s
    expect(p.vx).toBeLessThanOrEqual(-250); // reached −260 at ~0.66 s
  });

  it('a jump off ice carries the slide through the air; landing snaps to the input model', () => {
    const { lvl, p, cam } = rig();
    p.vx = 338;
    frame(p, lvl, cam, { jump: true }); // the jump frame (already airborne at its end)
    let air = 0, firstAirVx = null, vxAt45 = null, iceAirFirst = null, iceAirAt45 = null;
    for (let i = 0; i < 90; i++) {
      frame(p, lvl, cam, { jump: true }); // held: no jump-cut mid-air
      if (!p.onGround) {
        air++;
        if (air === 1) { firstAirVx = p.vx; iceAirFirst = p.iceAir; }
        if (air === 45) { vxAt45 = p.vx; iceAirAt45 = p.iceAir; }
      } else if (air > 0) break; // landed
    }
    expect(air).toBeGreaterThan(45); // the full arc (~56 air frames)
    expect(firstAirVx).toBeGreaterThan(300);
    expect(iceAirFirst).toBe(true);
    expect(iceAirAt45).toBe(true);
    expect(vxAt45).toBeGreaterThan(328); // ~331, the 2%/s air decay
    expect(vxAt45).toBeLessThan(335);
    for (let i = 0; i < 3; i++) frame(p, lvl, cam); // landed on the snow: no input
    expect(p.vx).toBe(0);
    expect(p.iceAir).toBe(false);
  });

  it('flight over ice snaps vx to the input model — the ice model never applies while flying', () => {
    const { lvl, p, cam } = rig();
    frame(p, lvl, cam, { cast: true }); // S: the spell
    expect(p.flying).toBe(true);
    for (let i = 0; i < 20; i++) frame(p, lvl, cam, { right: true });
    expect(p.vx).toBe(P_SPEED); // 260, not 338
  });

  it('boots do not grip ice in L7 (the grip is L9’s teach)', () => {
    const { lvl, p, cam } = rig();
    p.boots = 10;
    p.vx = 0;
    for (let i = 0; i < 300; i++) { frame(p, lvl, cam, { right: true }); pin(p, lvl); }
    expect(Math.abs(p.vx - ICE_MAX)).toBeLessThan(2);
  });
});
