import { describe, it, expect } from 'vitest';
import { createLevel, resolveGroundCollision } from '../src/levels/level.js';
import { createPlayer, updatePlayer, P_H } from '../src/player.js';
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
});
