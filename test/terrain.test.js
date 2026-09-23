import { describe, it, expect } from 'vitest';
import { createLevel, resolveGroundCollision } from '../src/levels/level.js';
import { createPlayer, updatePlayer, respawnX, P_H, P_W, RESPAWN_MARGIN } from '../src/player.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });
const noInput = { left: false, right: false, jump: false, fire: false };

describe('ground segments', () => {
  it('level 1 segments all sit at the main floor height', () => {
    const l = createLevel(600);
    for (const s of l.ground) expect(s.y).toBe(l.groundY);
  });

  it('an entity lands on its own segment height', () => {
    const l = {
      width: 600, height: 600, groundY: 560,
      ground: [
        { x: 0, w: 200, kind: 'ground', y: 500 },
        { x: 300, w: 200, kind: 'ground', y: 400 },
      ],
      platforms: [], boxes: [], goal: { x: 500 },
    };
    const e = { x: 320, y: 368, w: 28, h: 36, vx: 0, vy: 500, onGround: false };
    // bottom 4px below the 400 line (already moved); prevBottom ~3.3px above it
    const hit = resolveGroundCollision(e, l, DT);
    expect(hit.kind).toBe('ground');
    expect(e.y).toBe(400 - 36);
  });
});

describe('fall + respawn', () => {
  it('respawn uses the last spot the player stood on', () => {
    const l = createLevel(600);
    const p = createPlayer(l);
    const cam = createCamera();
    p.x = 600; // clear of the box at 700..736
    updatePlayer(p, noInput, l, cam, DT, fx([])); // settles on the ground: safe = 600
    expect(p.safeX).toBe(600);
    p.x = 860; // teleport into the pit (820..940)
    p.y = l.height;
    p.vy = 0;
    updatePlayer(p, noInput, l, cam, DT, fx([])); // falls past the view this frame
    expect(p.hp).toBe(2);
    expect(p.x).toBe(600);
    expect(p.y).toBe(l.groundY - P_H);
  });

  it('a run off the lip respawns RESPAWN_MARGIN back from the edge', () => {
    const l = createLevel(600);
    const p = createPlayer(l);
    const cam = createCamera();
    p.x = 820 - P_W; // flush with the pit's west lip (820)
    updatePlayer(p, noInput, l, cam, DT, fx([]));
    expect(p.safeX).toBe(820 - P_W);
    p.x = 860; p.y = l.height; p.vy = 0;
    updatePlayer(p, noInput, l, cam, DT, fx([]));
    expect(p.x).toBe(820 - RESPAWN_MARGIN - P_W);
  });

  it('the far lip pulls back the other way', () => {
    const l = createLevel(600);
    const p = { w: P_W, safeX: 940, safeSurf: l.ground[1] }; // 940..1600, east of the pit
    expect(respawnX(p, l)).toBe(940 + RESPAWN_MARGIN);
  });

  it('a surface too narrow for the margin centres the player', () => {
    const l = createLevel(600);
    const s = { x: 1000, y: 300, w: 100, kind: 'platform' };
    expect(respawnX({ w: P_W, safeX: 1000, safeSurf: s }, l)).toBe(1000 + (100 - P_W) / 2);
  });

  it('an edge flush with a same-height ground segment is not a drop', () => {
    const l = {
      groundY: 500,
      ground: [{ x: 0, w: 300, kind: 'snow', y: 500 }, { x: 300, w: 300, kind: 'ice', y: 500 }],
    };
    expect(respawnX({ w: P_W, safeX: 300 - P_W, safeSurf: l.ground[0] }, l)).toBe(300 - P_W);
  });

  it('boxes and the gear plate never become the respawn point', () => {
    const l = createLevel(600);
    const p = createPlayer(l);
    const cam = createCamera();
    p.x = 600;
    updatePlayer(p, noInput, l, cam, DT, fx([]));
    const gear = { x: 1000, y: 300, w: 60, kind: 'gear' };
    l.platforms.push(gear);
    p.x = 1010; p.y = 300 - P_H; p.vy = 0;
    updatePlayer(p, noInput, l, cam, DT, fx([]));
    expect(p.onGround).toBe(true);
    expect(p.safeX).toBe(600);
    p.x = 700; p.y = l.groundY - 36 - P_H; p.vy = 0; // onto the grow box at 700
    updatePlayer(p, noInput, l, cam, DT, fx([]));
    expect(p.safeX).toBe(600);
  });
});
