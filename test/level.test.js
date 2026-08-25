import { describe, it, expect } from 'vitest';
import { createLevel, resolveGroundCollision, WORLD_W, GROUND_H } from '../src/levels/level.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);

// entity helper: position so that `bottom` is `past` px below the surface top
function entity(x, y, w = 28, h = 36, vy = 0, extra = {}) {
  return { x, y, w, h, vy, onGround: false, ...extra };
}

describe('createLevel', () => {
  it('derives groundY from the view height', () => {
    expect(lvl().groundY).toBe(600 - GROUND_H);
    expect(lvl().height).toBe(600);
    const tall = createLevel(720);
    expect(tall.groundY).toBe(720 - GROUND_H);
  });

  it('has pits between ground segments', () => {
    const l = lvl();
    // ground: [0,820] [940,1600] [1800,2400] -> 880 and 1700 fall in pits
    const covered = x => l.ground.some(s => x >= s.x && x < s.x + s.w);
    expect(covered(100)).toBe(true);
    expect(covered(880)).toBe(false);
    expect(covered(1700)).toBe(false);
    expect(l.width).toBe(WORLD_W);
  });

  it('places a grow-drop box and the goal', () => {
    const l = lvl();
    expect(l.boxes.some(b => b.drop === 'grow')).toBe(true);
    expect(l.goal.x).toBe(2340);
  });
});

describe('resolveGroundCollision', () => {
  it('lands an entity that crosses the ground line this frame', () => {
    const l = lvl();
    // bottom 5px below groundY; vy 500 -> prevBottom ~8px above groundY
    const e = entity(100, l.groundY + 5 - 36, 28, 36, 500);
    const hit = resolveGroundCollision(e, l, DT);
    expect(hit.kind).toBe('ground');
    expect(e.y).toBe(l.groundY - 36);
    expect(e.vy).toBe(0);
    expect(e.onGround).toBe(true);
  });

  it('falls through a pit', () => {
    const l = lvl();
    const e = entity(856, l.groundY + 5 - 36, 28, 36, 500); // 856..884, inside pit (820..940)
    expect(resolveGroundCollision(e, l, DT)).toBeNull();
    expect(e.onGround).toBe(false);
    expect(e.y).toBe(l.groundY + 5 - 36); // untouched
  });

  it('lands on a platform, not the ground beneath it', () => {
    const l = lvl();
    const plat = l.platforms[0]; // x 320..460, top at groundY-110
    const e = entity(350, plat.y + 5 - 36, 28, 36, 400);
    const hit = resolveGroundCollision(e, l, DT);
    expect(hit).toBe(plat);
    expect(e.y).toBe(plat.y - 36);
  });

  it('lands on an intact box top', () => {
    const l = lvl();
    const box = l.boxes[0]; // x 450..486, top at groundY-36
    const e = entity(460, box.y + 4 - 36, 28, 36, 600); // crosses box top, above ground
    const hit = resolveGroundCollision(e, l, DT);
    expect(hit).toBe(box);
    expect(e.y).toBe(box.y - 36);
  });

  it('treats broken boxes as absent', () => {
    const l = lvl();
    l.boxes[0].broken = true;
    const e = entity(460, l.boxes[0].y + 4 - 36, 28, 36, 600);
    expect(resolveGroundCollision(e, l, DT)).toBeNull(); // still above ground, falls past
  });

  it('blocks solid entities from the side of a box', () => {
    const l = lvl();
    const box = l.boxes[0];
    // standing on the ground, overlapping the box from the left
    const e = entity(box.x + 2, box.y, 28, 36, 0, { solidToBoxes: true });
    resolveGroundCollision(e, l, DT);
    expect(e.x).toBe(box.x - 28); // pushed clear to the left
  });

  it('does not block non-solid entities', () => {
    const l = lvl();
    const box = l.boxes[0];
    const e = entity(box.x + 2, box.y, 28, 36, 0); // no solidToBoxes flag
    resolveGroundCollision(e, l, DT);
    expect(e.x).toBe(box.x + 2);
  });

  it('ignores broken boxes for side blocking', () => {
    const l = lvl();
    l.boxes[0].broken = true;
    const e = entity(l.boxes[0].x + 2, l.boxes[0].y, 28, 36, 0, { solidToBoxes: true });
    resolveGroundCollision(e, l, DT);
    expect(e.x).toBe(l.boxes[0].x + 2);
  });
});
