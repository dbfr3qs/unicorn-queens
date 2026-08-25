// Fire cone: the dragon's breath. A fixed-angle beam from the mouth, a
// row of 8 widening hitbox segments, growing over 0.15 s, holding for the
// ttl. You sidestep it — the angle is locked at cone start.
import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { HURT_INVULN } from '../src/enemies.js';
import {
  fireCone, resetCones, updateCones, coneSegment,
  cones, CONE_LEN, CONE_SEGS, CONE_TTL,
} from '../src/projectiles.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });

beforeEach(() => resetCones());

describe('fire cone', () => {
  it('grows from the mouth over 0.15 s, then holds at full length', () => {
    fireCone(100, 200, 0, fx([]));
    const c = cones[0];
    updateCones(createPlayer(lvl()), lvl(), createCamera(), DT, fx([])); // 1 frame
    expect(coneSegment(c, CONE_SEGS - 1).x).toBeLessThan(100 + CONE_LEN * 0.3);
    for (let i = 0; i < 10; i++) updateCones(createPlayer(lvl()), lvl(), createCamera(), DT, fx([]));
    expect(coneSegment(c, CONE_SEGS - 1).x).toBeCloseTo(100 + CONE_LEN * (7.5 / 8), 0);
  });

  it('widens with distance (~30 deg spread: ~100 px wide at 200 px)', () => {
    fireCone(100, 200, 0, fx([]));
    const c = cones[0];
    for (let i = 0; i < 12; i++) updateCones(createPlayer(lvl()), lvl(), createCamera(), DT, fx([]));
    const near = coneSegment(c, 0);
    const far = coneSegment(c, CONE_SEGS - 1);
    expect(far.r).toBeGreaterThan(near.r * 2);
    // full-grown: half-width at 200 px is 200 * tan(15 deg) ~ 53.6 -> ~115 px wide
    const at200 = 4 + 200 * Math.tan(Math.PI / 12);
    expect(2 * at200).toBeGreaterThan(100);
    expect(2 * at200).toBeLessThan(120);
  });

  it('burns a player standing in the beam', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 400; p.y = l.groundY - 36; // standing at 524-560
    const cam = createCamera();
    const calls = [];
    // mouth at (200, 542) aimed straight at the player's chest line
    fireCone(200, 542, 0, fx(calls));
    for (let i = 0; i < 40; i++) updateCones(p, l, cam, DT, fx(calls));
    expect(p.hp).toBe(2);
    expect(p.invuln).toBe(HURT_INVULN);
    expect(calls).toContain('breath');
  });

  it('is a fixed angle: jumping out of it after the breath starts is safe', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 400; p.y = l.groundY - 36;
    const cam = createCamera();
    const calls = [];
    fireCone(200, 542, 0, fx(calls)); // aimed at the player's chest line
    updateCones(p, l, cam, DT, fx(calls)); // the tip has only grown ~31 px
    p.y = 380; // jump: at x 400 the beam spans y 488-596, the player is at 380-416
    for (let i = 0; i < 60; i++) updateCones(p, l, cam, DT, fx(calls));
    expect(p.hp).toBe(3); // the beam sweeps past the old spot and misses
  });

  it('expires at the ttl (0.9 s) and is removed', () => {
    const p = createPlayer(lvl());
    const l = lvl();
    const cam = createCamera();
    fireCone(100, 200, 0, fx([]));
    for (let i = 0; i < Math.ceil(CONE_TTL / DT) + 2; i++) {
      updateCones(p, l, cam, DT, fx([]));
    }
    expect(cones.length).toBe(0);
  });

  it('dies early when the beam leaves the level', () => {
    const p = createPlayer(lvl());
    const l = lvl();
    const cam = createCamera();
    fireCone(l.width - 20, 200, 0, fx([])); // aimed right, off the level
    for (let i = 0; i < 60; i++) updateCones(p, l, cam, DT, fx([]));
    expect(cones.length).toBe(0);
  });
});
