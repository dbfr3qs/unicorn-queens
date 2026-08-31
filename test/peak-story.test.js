// M5 — the spire story: the Queen's intro beat (fires at spawn, 3 lines,
// no repeat), the King's porthole beat (x 4400, 2 lines, fires once —
// the porthole glint condition), and the throne gate's trigger flare
// (boss sfx, 0.8 s flare, the 1.0 s dissolve, stays open forever, the
// iron gate untouched).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { isDialogueOpen, currentLine, advanceDialogue, resetDialogue } from '../src/dialogue.js';
import { input } from '../src/input.js';
import { DOOR_OPEN } from '../src/door.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });

beforeEach(() => { startGame(600, 6); });

afterEach(() => {
  resetDialogue();
  input.left = input.right = input.jump = input.fire = false;
  input.up = input.down = false;
  input.cast = false;
});

describe('the intro', () => {
  it('fires on frame 1 (spawn inside the 40–240 band), speaks 3 lines, never repeats', () => {
    expect(game.dialogsFired.has('l7-intro')).toBe(false);
    update(DT, 800, fx([])); // the player spawns at x 60, inside the band
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Unicorn Queen');
    expect(currentLine().text).toBe('The Peak. I did not want to come here.');
    advanceDialogue();
    expect(currentLine().text).toBe('The wind knows me. The ice remembers. That is all.');
    advanceDialogue();
    expect(currentLine().text).toBe('Find what fell from the sky. The spire will open for it.');
    advanceDialogue(); // close
    expect(isDialogueOpen()).toBe(false);
    expect(game.dialogsFired.has('l7-intro')).toBe(true);
    game.player.x = 300; update(DT, 800, fx([])); // out of the band
    game.player.x = 100; update(DT, 800, fx([])); // back in: the spent beat stays spent
    expect(isDialogueOpen()).toBe(false);
  });
});

describe('the King at the porthole', () => {
  it('fires once at x 4400 (2 lines); re-entering does not refire; the flag flips', () => {
    expect(game.dialogsFired.has('l7-king')).toBe(false); // the porthole glint shows
    game.player.x = 4400;
    game.player.y = game.level.groundY - 36;
    update(DT, 800, fx([]));
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Unicorn King');
    expect(currentLine().text).toBe('(through the porthole) I am sorry. I could not carry you out of that storm.');
    advanceDialogue();
    expect(currentLine().text).toBe('Free me and I will wait no longer. The rainbow is ready — it only needs its storm broken.');
    advanceDialogue(); // close
    expect(isDialogueOpen()).toBe(false);
    expect(game.dialogsFired.has('l7-king')).toBe(true); // the glint is gone
    game.player.x = 4700; update(DT, 800, fx([])); // out of the band
    game.player.x = 4400; update(DT, 800, fx([])); // back in: no refire
    expect(isDialogueOpen()).toBe(false);
  });
});

describe('the throne gate trigger', () => {
  it('locked outside the band; a player in 5280–5400 starts the flare (boss, 0.8 s)', () => {
    const g = game;
    const gate = g.level.doors[1];
    expect(gate.state).toBe('locked');
    g.player.x = 5200; g.player.y = g.level.groundY - 36; // outside the band
    update(DT, 800, fx([]));
    expect(gate.flare).toBeFalsy();
    expect(gate.state).toBe('locked');
    const calls = [];
    g.player.x = 5300; // inside 5280–5400
    update(DT, 800, fx(calls));
    expect(calls).toContain('boss');
    expect(gate.flare).toBe(true);
    expect(gate.flareT).toBeCloseTo(0.8, 5);
    expect(gate.state).toBe('locked'); // the wall still stands through the flare
  });

  it('after the flare: opening, the level flag flips; after DOOR_OPEN: open, passable, never re-seals', () => {
    const g = game;
    const gate = g.level.doors[1];
    g.player.x = 5300; g.player.y = g.level.groundY - 36;
    update(DT, 800, fx([])); // the flare starts
    for (let i = 0; i < 53; i++) update(DT, 800, fx([])); // 0.9 s total: the flare has run
    expect(gate.state).toBe('opening');
    expect(g.level.throneGateOpen).toBe(true); // the wizard's wake flag (M6)
    for (let i = 0; i < 70; i++) update(DT, 800, fx([])); // through the 1.0 s dissolve
    expect(gate.state).toBe('open');
    g.player.x = 5420; // the gap: no push-back from an open gate
    update(DT, 800, fx([]));
    expect(g.player.x).toBe(5420);
    for (let i = 0; i < 300; i++) update(DT, 800, fx([])); // 5 s later
    expect(gate.state).toBe('open'); // stays open: the off-ramp is real
  });

  it('the trigger does not touch the iron gate (multi-door independence)', () => {
    const g = game;
    const iron = g.level.doors[0];
    g.player.x = 5300; g.player.y = g.level.groundY - 36;
    for (let i = 0; i < 100; i++) update(DT, 800, fx([])); // through the flare + dissolve
    expect(iron.flare).toBeFalsy();
    expect(iron.state).toBe('locked'); // no sigil was shot: it stays sealed
    expect(g.level.doors[1].state).not.toBe('locked'); // the throne gate, meanwhile, is gone
  });
});
