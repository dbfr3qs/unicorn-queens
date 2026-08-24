// Jail cell & the witch: keyless hint (repeat beat), key unlock with the
// bar swing, flight grant, witch exit + fade, persistence.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { isDialogueOpen, currentLine, advanceDialogue, resetDialogue } from '../src/dialogue.js';
import { cellApproach } from '../src/cell.js';
import { particles, resetParticles } from '../src/particles.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const HINT = { speaker: 'Witch', text: 'A secret key hides to the west - above the fire.' };

// Level-1 ground with a cell at x=500, a key (far away), and the cell's
// hint dialog (a repeat beat, gated on not having the key).
function rig() {
  const g = game;
  const x = 500;
  g.level.cell = {
    x, y: g.level.groundY - 100, w: 70, h: 100,
    open: false, opening: false, unlockT: 0,
    witch: 'inside', wx: x + 25, wy: g.level.groundY - 32, wvy: 0,
    wanderT: 0, fadeT: 0, puffT: 0,
  };
  g.level.key = { x: 100, y: g.level.groundY - 44, w: 16, h: 16, taken: false };
  g.level.dialogs = [{
    id: 'cell-hint', x: x - 60, y: g.level.groundY - 140, w: 200, h: 140,
    beats: [{ id: 'hint', repeat: true, when: g2 => !g2.level.key.taken, lines: [HINT] }],
  }];
  return g;
}
const atCell = x => { const g = game; g.player.x = x; g.player.y = g.level.groundY - 44; };
const frames = (n, over = {}) => { for (let i = 0; i < n; i++) update(DT, 800, fx); };

beforeEach(() => { startGame(600, 0); calls.length = 0; });
afterEach(() => { resetDialogue(); resetParticles(); startGame(600, 0); });

describe('keyless: the hint beat', () => {
  it('opens on approach and the cell itself stays locked', () => {
    rig();
    atCell(480);
    update(DT, 800, fx);
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().text).toBe(HINT.text);
    expect(game.level.cell.opening).toBe(false);
    expect(game.level.cell.open).toBe(false);
  });

  it('re-fires on each approach, but not while standing in place', () => {
    rig();
    atCell(480);
    update(DT, 800, fx);
    advanceDialogue(); // close, still standing in the zone
    update(DT, 800, fx);
    expect(isDialogueOpen()).toBe(false); // no immediate re-fire
    atCell(200); update(DT, 800, fx); // walk away
    atCell(480); update(DT, 800, fx); // re-approach
    expect(isDialogueOpen()).toBe(true); // the repeat beat fires again
    expect(game.dialogsFired.has('hint')).toBe(false); // repeats never get marked fired
  });
});

describe('with the key: unlock and grant', () => {
  it('clanks, swings the bars, then speaks and grants flight', () => {
    rig();
    game.level.key.taken = true;
    atCell(480);
    update(DT, 800, fx);
    expect(calls).toContain('clank');
    expect(game.level.cell.opening).toBe(true);
    expect(isDialogueOpen()).toBe(false); // bars still swinging
    expect(game.player.hasFlight).toBe(false);
    frames(50); // past the 0.8 s of swinging
    expect(game.level.cell.open).toBe(true);
    expect(game.level.cell.opening).toBe(false);
    expect(isDialogueOpen()).toBe(true); // the witch speaks
    expect(game.player.hasFlight).toBe(true);
    expect(game.player.flightCd).toBe(0); // grant means ready now
    expect(calls).toContain('grant');
    expect(isDialogueOpen() && currentLine().text).toMatch(/kind heart/);
  });

  it('the hint never fires once the key is held', () => {
    rig();
    game.level.key.taken = true;
    atCell(480);
    frames(62);
    expect(isDialogueOpen()).toBe(true); // it is the unlock box, not the hint
    expect(currentLine().text).not.toBe(HINT.text);
  });
});

describe('the witch', () => {
  // Run the full unlock and read the box.
  const unlock = () => {
    rig();
    game.level.key.taken = true;
    atCell(480);
    frames(62); // past the 0.8 s bar swing, with margin
    while (isDialogueOpen()) advanceDialogue();
  };

  it('hops out after the box closes, wanders west, fades, and is gone', () => {
    unlock();
    const wx0 = game.level.cell.wx;
    for (let i = 0; i < 400 && game.level.cell.witch !== 'gone'; i++) update(DT, 800, fx);
    const cell = game.level.cell;
    expect(cell.witch).toBe('gone');
    expect(cell.wx).toBeLessThan(wx0); // wandered west
    expect(cell.wy).toBe(game.level.groundY - 32); // back on the ground
    expect(particles.length).toBeGreaterThan(0); // final puff still alive
  });

  it('the cell stays open and nothing re-fires on re-approach', () => {
    unlock();
    for (let i = 0; i < 400 && game.level.cell.witch !== 'gone'; i++) update(DT, 800, fx);
    expect(game.level.cell.open).toBe(true);
    atCell(200); update(DT, 800, fx);
    calls.length = 0;
    atCell(480); update(DT, 800, fx);
    expect(isDialogueOpen()).toBe(false);
    expect(calls).not.toContain('clank');
    expect(calls).not.toContain('grant');
  });
});

describe('state hygiene', () => {
  it('dialogue and dialog-trigger state never leak across levels', () => {
    rig();
    atCell(480);
    update(DT, 800, fx);
    expect(isDialogueOpen()).toBe(true);
    startGame(600, 0);
    expect(isDialogueOpen()).toBe(false);
    expect(game.dialogsIn.size).toBe(0);
    expect(game.dialogsFired.size).toBe(0);
    expect(game.player.hasFlight).toBe(false);
  });

  it('the approach zone is the cell mouth expanded west', () => {
    rig();
    const a = cellApproach(game.level);
    expect(a.x).toBe(game.level.cell.x - 60);
    expect(a.w).toBe(game.level.cell.w + 60);
  });
});
