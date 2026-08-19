import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { reachedExit } from '../src/game.js';
import { updatePearl } from '../src/pearl.js';

const fx = calls => ({ play: n => calls.push(n) });

// Minimal level with a sealed exit and a boss-gated pearl.
function stubLevel() {
  return {
    width: 1000, height: 600, groundY: 560,
    ground: [], platforms: [], boxes: [],
    pearl: {
      x: 400, y: 500, w: 20, h: 20,
      visible: false, taken: false,
      showWhen: enemies => enemies.some(e => e.kind === 'mage' && e.dead),
    },
    exit: { x: 700, y: 400, w: 60, h: 160, locked: true },
  };
}

describe('reachedExit', () => {
  it('level 1 wins via the goal line (no exit rect)', () => {
    const l = createLevel(600);
    expect(l.exit).toBeUndefined();
    expect(l.pearl).toBeUndefined();
    const p = { x: l.goal.x - 20, y: 0, w: 28, h: 36 };
    expect(reachedExit(p, l)).toBe(true);
    p.x = l.goal.x - 60;
    expect(reachedExit(p, l)).toBe(false);
  });

  it('a locked exit does not win even on overlap', () => {
    const l = stubLevel();
    const p = { x: 710, y: 450, w: 28, h: 36 }; // inside the exit rect
    expect(reachedExit(p, l)).toBe(false); // locked
    l.exit.locked = false;
    expect(reachedExit(p, l)).toBe(true);
  });
});

describe('pearl', () => {
  it('appears only when its condition is met (mage dead)', () => {
    const l = stubLevel();
    const p = createPlayer({ groundY: 560 });
    const mage = [{ kind: 'mage', dead: false }];
    updatePearl(l, p, mage, fx([]));
    expect(l.pearl.visible).toBe(false);
    mage[0].dead = true;
    updatePearl(l, p, mage, fx([]));
    expect(l.pearl.visible).toBe(true);
  });

  it('picking it up breaks the seal on the exit', () => {
    const l = stubLevel();
    const p = { x: 405, y: 505, w: 28, h: 36 }; // overlapping the pearl
    l.pearl.visible = true;
    const calls = [];
    updatePearl(l, p, [], fx(calls));
    expect(l.pearl.taken).toBe(true);
    expect(l.exit.locked).toBe(false);
    expect(calls).toContain('pearl');
    expect(calls).toContain('seal');
  });

  it('cannot be picked up while hidden, and only once', () => {
    const l = stubLevel();
    const p = { x: 405, y: 505, w: 28, h: 36 };
    updatePearl(l, p, [], fx([])); // hidden: no pickup
    expect(l.pearl.taken).toBe(false);
    l.pearl.visible = true;
    const calls = [];
    updatePearl(l, p, [], fx(calls));
    updatePearl(l, p, [], fx(calls));
    expect(calls.filter(n => n === 'pearl').length).toBe(1); // one pickup
    expect(l.pearl.taken).toBe(true);
  });
});
