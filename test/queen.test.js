// Level 5 queen beats: the intro fires on frame 1 (one-shot); q0–q2
// re-fire on approach while their `when` (relic count) holds; q3 fires
// exactly once with the story and its onOpen (exit unlock, mist gate
// brightening, toldStory, 'seal').
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { dialogue, advanceDialogue } from '../src/dialogue.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };

const L = {
  intro0: "You slip out of the dragon's lair, into the sunlight.",
  q0: 'You seek the relics — the horseshoe, the sapphire, the acorn.',
  q1: 'One of the three. The wood still holds the other two.',
  q2: 'Two of the three. One more, and I will tell you what ails the kingdom.',
  q3: "At last — horseshoe, sapphire, acorn. The realm's relics are whole again.",
};

beforeEach(() => {
  calls.length = 0;
  startGame(600, 4);
});
afterEach(() => startGame(600, 4));

const close = n => { for (let i = 0; i < n; i++) advanceDialogue(); };
const setCount = n => game.level.relics.forEach((r, i) => { r.taken = i < n; r.visible = i < n; });

// Leave the queen's rect, settle one frame, then step in: the entry edge
// is what fires beats.
function approachQueen() {
  game.player.x = 3300; // west of the rect, on the glade ground
  game.player.y = game.level.groundY - game.player.h;
  update(DT, 800, fx);
  game.player.x = 3450; // inside the rect
  game.player.y = game.level.groundY - game.player.h;
  update(DT, 800, fx);
  return dialogue.open ? dialogue.lines[dialogue.idx] : null;
}

describe('intro beat', () => {
  it('fires on frame 1: the player spawns inside the band', () => {
    update(DT, 800, fx);
    expect(dialogue.open).toBe(true);
    expect(dialogue.lines[0].text).toBe(L.intro0);
    expect(dialogue.lines).toHaveLength(3);
  });

  it('never fires again (one-shot)', () => {
    update(DT, 800, fx);
    close(3);
    game.player.x = 3300; // leave the band
    game.player.y = game.level.groundY - game.player.h;
    update(DT, 800, fx);
    game.player.x = 100; // back in the band
    update(DT, 800, fx);
    expect(dialogue.open).toBe(false);
  });
});

describe('queen beats track the relic count', () => {
  it('q0 (two lines, repeat) while no relic is taken', () => {
    update(DT, 800, fx); close(3); // dismiss the intro
    const line1 = approachQueen();
    expect(line1.text).toBe(L.q0);
    close(2);
    const line2 = approachQueen(); // re-approach: repeat while count is 0
    expect(line2.text).toBe(L.q0);
    close(2);
  });

  it('q1 at count 1, re-fires on re-approach', () => {
    update(DT, 800, fx); close(3);
    setCount(1);
    expect(approachQueen().text).toBe(L.q1);
    close(1);
    expect(approachQueen().text).toBe(L.q1);
    close(1);
  });

  it('q2 at count 2, re-fires on re-approach', () => {
    update(DT, 800, fx); close(3);
    setCount(2);
    expect(approachQueen().text).toBe(L.q2);
    close(1);
    expect(approachQueen().text).toBe(L.q2);
    close(1);
  });

  it('the old beat goes silent once its when stops holding', () => {
    update(DT, 800, fx); close(3);
    expect(approachQueen().text).toBe(L.q0); // count 0
    close(2);
    setCount(1);
    expect(approachQueen().text).toBe(L.q1); // count 1 now
    close(1);
  });
});

describe('q3: the story beat', () => {
  it('fires at count 3 with the four story lines and the onOpen hook', () => {
    update(DT, 800, fx); close(3);
    setCount(3);
    const line = approachQueen();
    expect(line.text).toBe(L.q3);
    expect(dialogue.lines).toHaveLength(4);
    expect(dialogue.lines[2].text).toContain('flying pig');
    expect(dialogue.lines[3].text).toContain('mist gate');
    expect(game.level.exit.locked).toBe(false);
    expect(game.level.mistgate.openT).toBe(1.5);
    expect(game.level.queen.toldStory).toBe(true);
    expect(calls.filter(n => n === 'seal')).toHaveLength(1);
    close(4);
  });

  it('fires exactly once, even with re-approaches; no beat after', () => {
    update(DT, 800, fx); close(3);
    setCount(3);
    expect(approachQueen().text).toBe(L.q3);
    close(4);
    for (let i = 0; i < 3; i++) {
      expect(approachQueen()).toBeNull(); // nothing left to say
    }
    expect(calls.filter(n => n === 'seal')).toHaveLength(1); // onOpen ran once
  });

  it('does not fire early at count 2 (the whens gate it)', () => {
    update(DT, 800, fx); close(3);
    setCount(2);
    expect(approachQueen().text).toBe(L.q2);
    close(1);
    expect(game.level.exit.locked).toBe(true); // still locked
    expect(game.level.mistgate.openT).toBe(0);
    expect(game.level.queen.toldStory).toBe(false);
  });
});
