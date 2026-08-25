import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createPlayer, updatePlayer, P_SPEED, P_GRAVITY, P_JUMP_V, P_BOUNCE_V, P_H } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { resetLoot, loot } from '../src/loot.js';
import { resetArrows, arrows, FIRE_CD } from '../src/arrows.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const noInput = { left: false, right: false, jump: false, fire: false };

describe('createPlayer', () => {
  it('starts on the ground line, facing right, 3 hp', () => {
    const l = lvl();
    const p = createPlayer(l);
    expect(p.x).toBe(60);
    expect(p.y).toBe(l.groundY - P_H);
    expect(p.hp).toBe(3);
    expect(p.onGround).toBe(false); // settles on the first update
    expect(p.facing).toBe(1);
  });
});

describe('movement', () => {
  it('walks at P_SPEED and faces the input direction', () => {
    const l = lvl();
    const p = createPlayer(l);
    updatePlayer(p, { ...noInput, right: true }, l, createCamera(), DT, fx([]));
    expect(p.facing).toBe(1);
    expect(p.x).toBeCloseTo(60 + P_SPEED * DT, 5);
    updatePlayer(p, { ...noInput, left: true }, l, createCamera(), DT, fx([]));
    expect(p.facing).toBe(-1);
  });

  it('a dead player is inert', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.dead = true;
    const x0 = p.x;
    updatePlayer(p, { ...noInput, right: true }, l, createCamera(), DT, fx([]));
    expect(p.x).toBe(x0);
  });
});

describe('jumping', () => {
  it('jumps from the ground with the exact end-of-frame velocity', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.onGround = true;
    const calls = [];
    updatePlayer(p, { ...noInput, jump: true }, l, createCamera(), DT, fx(calls));
    expect(calls).toContain('jump');
    // gravity applies in the same frame, after the jump: P_JUMP_V + P_GRAVITY*DT
    expect(p.vy).toBeCloseTo(P_JUMP_V + P_GRAVITY * DT, 5);
    expect(p.onGround).toBe(false);
  });

  it('buffers a press that lands a frame later (jump buffering)', () => {
    const l = lvl();
    const p = createPlayer(l);
    // 10px above the ground, falling fast enough to land this frame, jump held
    p.y = l.groundY - 10 - P_H;
    p.vy = 580; // final vy 600 -> moves 10px this frame
    const calls = [];
    const cam = createCamera();
    updatePlayer(p, { ...noInput, jump: true }, l, cam, DT, fx(calls));
    expect(p.onGround).toBe(true);       // landed
    expect(calls).not.toContain('jump'); // buffered, not yet fired
    updatePlayer(p, { ...noInput, jump: true }, l, cam, DT, fx(calls));
    expect(calls).toContain('jump');     // fires on the next frame
    expect(p.vy).toBeCloseTo(P_JUMP_V + P_GRAVITY * DT, 5);
  });

  it('coyote time allows a jump just after leaving a ledge', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.onGround = false;
    p.coyote = 0.08; // just walked off a ledge
    const calls = [];
    updatePlayer(p, { ...noInput, jump: true }, l, createCamera(), DT, fx(calls));
    expect(calls).toContain('jump');
  });

  it('without coyote, an airborne press does not jump', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.onGround = false;
    p.coyote = 0;
    const calls = [];
    updatePlayer(p, { ...noInput, jump: true }, l, createCamera(), DT, fx(calls));
    expect(calls).not.toContain('jump');
  });

  it('releasing early cuts the jump (variable height)', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.onGround = true;
    const cam = createCamera();
    updatePlayer(p, { ...noInput, jump: true }, l, cam, DT, fx([]));
    // end of frame 1: vy = P_JUMP_V + P_GRAVITY*DT (-540, above the -180 cut line)
    updatePlayer(p, { ...noInput }, l, cam, DT, fx([]));
    // cut clamps to JUMP_CUT, then gravity: -180 + P_GRAVITY*DT
    expect(p.vy).toBeCloseTo(-180 + P_GRAVITY * DT, 5);
  });
});

describe('landing and hazards', () => {
  it('a hard landing squashes and plays "land"', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.y = l.groundY - 10 - P_H; // crosses the ground line this frame
    p.vy = 580;                 // > 350 hard-landing threshold
    const calls = [];
    updatePlayer(p, { ...noInput }, l, createCamera(), DT, fx(calls));
    expect(p.onGround).toBe(true);
    // the squash eases back in the same frame it is applied
    const k = Math.min(1, DT * 14);
    expect(p.sy).toBeCloseTo(0.7 + (1 - 0.7) * k, 5);
    expect(p.sx).toBeCloseTo(1.3 + (1 - 1.3) * k, 5);
    expect(calls).toContain('land');
  });

  it('breaking a box bounces the player and spawns loot', () => {
    const l = lvl();
    resetLoot();
    const p = createPlayer(l);
    const box = l.boxes[0]; // x 450..486, top at groundY-36
    p.x = 460;
    p.y = box.y - P_H;      // crosses the box top this frame, above the ground
    p.vy = 560;
    const calls = [];
    const cam = createCamera();
    updatePlayer(p, { ...noInput }, l, cam, DT, fx(calls));
    expect(box.broken).toBe(true);
    expect(p.vy).toBe(P_BOUNCE_V);
    expect(p.y).toBe(box.y - P_H);
    expect(loot.length).toBe(1);
    expect(calls).toContain('box');
    expect(cam.mag).toBe(4);
    expect(cam.shake).toBe(0.15);
  });

  it('falling in a pit costs 1 hp and respawns at the last safe spot', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 856;      // inside the pit (820..940)
    p.y = l.height; // at the bottom
    p.vy = 0;
    const calls = [];
    updatePlayer(p, { ...noInput }, l, createCamera(), DT, fx(calls));
    // gravity pushes y past lvl.height this frame
    expect(p.hp).toBe(2);
    expect(p.dead).toBe(false);
    expect(p.invuln).toBeGreaterThan(0);
    expect(p.x).toBe(60); // no safe spot recorded yet -> spawn point
    expect(p.y).toBe(l.groundY - P_H);
    expect(calls).toContain('hurt');
  });

  it('falling in a pit kills a player at 1 hp', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.hp = 1;
    p.x = 856;      // inside the pit (820..940)
    p.y = l.height; // at the bottom
    p.vy = 0;
    const calls = [];
    const cam = createCamera();
    updatePlayer(p, { ...noInput }, l, cam, DT, fx(calls));
    expect(p.dead).toBe(true);
    expect(calls).toContain('die');
    expect(cam.mag).toBe(10);
  });
});

describe('jump edge (restart-hold)', () => {
  it('a held jump is not re-buffered; release + press jumps', () => {
    const l = lvl();
    const p = createPlayer(l);
    p.onGround = true;
    const cam = createCamera();
    // The restart press: space is held and jumpHeld is set, so it must not
    // buffer a fresh jump on spawn.
    p.jumpHeld = true;
    updatePlayer(p, { ...noInput, jump: true }, l, cam, DT, fx([]));
    expect(p.jbuf).toBe(0); // still held -> not a fresh press
    expect(p.vy).toBe(0); // no jump on spawn
    // Release, then press again -> a real fresh press.
    updatePlayer(p, noInput, l, cam, DT, fx([]));
    updatePlayer(p, { ...noInput, jump: true }, l, cam, DT, fx([]));
    expect(p.vy).toBeLessThan(0); // jumped
  });
});

describe('bow', () => {
  it('fires with cooldown when carrying the bow', () => {
    const l = lvl();
    resetArrows();
    const p = createPlayer(l);
    p.onGround = true;
    p.hasBow = true;
    p.x = 200;
    const calls = [];
    const cam = createCamera();
    updatePlayer(p, { ...noInput, fire: true }, l, cam, DT, fx(calls));
    expect(calls).toContain('fire');
    expect(arrows.length).toBe(1);
    expect(arrows[0].x).toBe(200 + p.w); // shot from the front edge
    expect(p.fireCd).toBe(FIRE_CD);
    updatePlayer(p, { ...noInput, fire: true }, l, cam, DT, fx(calls));
    expect(arrows.length).toBe(1); // still cooling down
  });
});
