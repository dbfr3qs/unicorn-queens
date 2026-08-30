// The Peak's sigil chain: arrow-only shatter of the ice block (normal
// arrow spent, star keeps flying), the hidden-then-visible pickup
// (+50, relic, remote iron-gate unlock), and the gate's rise and
// never-re-seal (STAYS_OPEN).
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel7 } from '../src/levels/level7.js';
import { createPlayer, P_H } from '../src/player.js';
import { arrows, updateArrows, ARROW_SPEED, resetArrows } from '../src/arrows.js';
import { updateSigil } from '../src/sigil.js';
import { updateDoor, resolveDoor, DOOR_OPEN } from '../src/door.js';
import { score } from '../src/loot.js';
import { startGame } from '../src/game.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const cam = { x: 2900, shake: 0, mag: 0 }; // near the block: arrows aren't cull-screened

// A level with the player standing on the snowfield in front of the block.
const rig = () => {
  calls.length = 0;
  arrows.length = 0;
  const lvl = createLevel7(600);
  const p = createPlayer(lvl, { hasBow: true, hasFlight: true });
  p.x = 3000;
  p.y = lvl.groundY - P_H; // chest height y = groundY − 60 = 500
  return { lvl, p };
};
const shot = (lvl, p, star = false) => {
  arrows.push({
    x: 2950, y: lvl.groundY - P_H - 24, vx: ARROW_SPEED, dead: false,
    ...(star ? { star: true, pierces: 2, hit: new Set() } : {}),
  });
  for (let i = 0; i < 40; i++) updateArrows([], lvl, cam, DT, fx, 800);
};

afterEach(() => {
  resetArrows();
  startGame(600, 0);
});

describe('the shatter (arrow-only)', () => {
  it('a normal arrow crossing the intact block: gone, shatterT ≈ 0.4, sigil visible, arrow spent', () => {
    const { lvl, p } = rig();
    shot(lvl, p);
    expect(lvl.sigilBlock.state).toBe('gone');
    expect(lvl.sigilBlock.shatterT).toBeGreaterThan(0.3);
    expect(lvl.sigil.visible).toBe(true);
    expect(arrows.every(a => a.dead)).toBe(true);
    expect(calls).toContain('crack');
  });

  it('a star shatters the block and keeps flying', () => {
    const { lvl, p } = rig();
    shot(lvl, p, true);
    expect(lvl.sigilBlock.state).toBe('gone');
    expect(lvl.sigil.visible).toBe(true);
    expect(arrows.some(a => a.star && !a.dead)).toBe(true); // the star survives
  });

  it('the sigil is not pickable while hidden, and a second arrow is a no-op', () => {
    const { lvl, p } = rig();
    p.x = lvl.sigil.x - 6; p.y = lvl.sigil.y - 20; // over the (hidden) sigil
    updateSigil(lvl, p, DT, fx);
    expect(lvl.sigil.taken).toBe(false);
    shot(lvl, p);
    expect(calls.filter(n => n === 'crack').length).toBe(1);
    shot(lvl, p); // second arrow after the shatter
    expect(calls.filter(n => n === 'crack').length).toBe(1); // only the first break rang
    expect(lvl.sigilBlock.state).toBe('gone');
  });
});

describe('the pickup (the remote key)', () => {
  it('overlap on the visible sigil: taken, +50, relic, gate opening, seal + gate sfx', () => {
    const { lvl, p } = rig();
    shot(lvl, p);
    const s = score;
    p.x = lvl.sigil.x - 6; p.y = lvl.sigil.y - 20;
    updateSigil(lvl, p, DT, fx);
    expect(lvl.sigil.taken).toBe(true);
    expect(score).toBe(s + 50);
    expect(calls).toContain('relic');
    const gate = lvl.doors[0];
    expect(gate.state).toBe('opening');
    expect(gate.openT).toBe(DOOR_OPEN);
    expect(calls).toContain('seal');
    expect(calls).toContain('gate');
  });

  it('a dead player cannot take it', () => {
    const { lvl, p } = rig();
    shot(lvl, p);
    p.dead = true;
    p.x = lvl.sigil.x - 6; p.y = lvl.sigil.y - 20;
    updateSigil(lvl, p, DT, fx);
    expect(lvl.sigil.taken).toBe(false);
  });
});

describe('the iron gate after the sigil', () => {
  it('rises to open in DOOR_OPEN s; a walker passes; it never re-seals', () => {
    const { lvl, p } = rig();
    shot(lvl, p);
    p.x = lvl.sigil.x - 6; p.y = lvl.sigil.y - 20;
    updateSigil(lvl, p, DT, fx);
    for (let i = 0; i < DOOR_OPEN / DT; i++) updateDoor(lvl, p, DT, fx);
    expect(lvl.doors[0].state).toBe('open');
    // walk east through the gate (3600–3640, full height)
    p.x = 3560; p.y = lvl.groundY - P_H;
    for (let i = 0; i < 30; i++) { p.x += 6; resolveDoor(lvl, p); }
    expect(p.x).toBeGreaterThan(3640); // no clamp: fully through
    for (let i = 0; i < 5 * 60; i++) updateDoor(lvl, p, DT, fx); // 5 s more
    expect(lvl.doors[0].state).toBe('open'); // STAYS_OPEN: never re-seals
  });
});
