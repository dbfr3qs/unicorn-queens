// Level 6 cogs + the Old Winch beats: cog pickup rules (only visible,
// +50, one-shot), cogsSet, and the winch beat chain — the intro fires on
// frame 1 and never again; w0 repeats at 0 sockets; w1 installs cog0
// (socket, cog, vent, 'gear') exactly once; w2 repeats at 1 socket; w3
// installs cog1 (socket, sac) exactly once; w4 repeats; w5 wakes the
// wheel, lowers the bridge, and melts the web wall exactly once.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { dialogue, advanceDialogue } from '../src/dialogue.js';
import { cogsSet } from '../src/cogs.js';
import { score } from '../src/loot.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };

const L = {
  intro0: 'The mist gate spat you out below the peak, into the Blackmire.',
  w0: 'Three empty sockets, champion. The runes show the order.',
  w1: "The heron's cog turns. Somewhere east, the mud begins to burble.",
  w2: 'One more. The burbling pool east of the lily bank: wait for the bubble to surface, then shoot it.',
  w3: "The adder's cog turns. The altar in the fern grove is no longer empty — and its guardian stirs.",
  w4: "The last cog: the weaver's, in the egg sac on the altar. Drop on it — or shoot it.",
  w5: 'The wheel wakes. The bridge falls, the web melts — go, and face the Weaver Queen.',
};

beforeEach(() => {
  calls.length = 0;
  startGame(600, 5);
});
afterEach(() => startGame(600, 5));

const close = n => { for (let i = 0; i < n; i++) advanceDialogue(); };

// Leave the winch rect, settle one frame, then step in: the entry edge
// is what fires beats.
function approachWinch() {
  game.player.x = 4700; // west of the rect, on the marsh-east ground
  game.player.y = game.level.groundY - game.player.h;
  update(DT, 800, fx);
  game.player.x = 4900; // inside the rect, at the wheel
  game.player.y = game.level.groundY - game.player.h;
  update(DT, 800, fx);
  return dialogue.open ? dialogue.lines[dialogue.idx] : null;
}

// Overlap a cog and run a frame (the reveal gates are M3; here the cog
// is set visible directly).
function standOn(cog) {
  game.player.x = cog.x - 6;
  game.player.y = cog.y - 10;
  update(DT, 800, fx);
}

describe('cog pickup', () => {
  it('is pickable only when visible, and takes it with +50 and the chime', () => {
    const cog = game.level.cogs[0];
    cog.visible = true; // the stage reveal is M3
    const s = score;
    standOn(cog);
    expect(cog.taken).toBe(true);
    expect(score).toBe(s + 50);
    expect(calls).toContain('relic');
  });

  it('does not pick up an invisible cog, and never twice', () => {
    const cog = game.level.cogs[0];
    standOn(cog); // visible false: nothing happens
    expect(cog.taken).toBe(false);
    expect(calls).not.toContain('relic');
    cog.visible = true;
    const s = score;
    standOn(cog);
    standOn(cog); // still overlapping: one-shot
    expect(score).toBe(s + 50);
    expect(calls.filter(n => n === 'relic')).toHaveLength(1);
  });
});

describe('cogsSet', () => {
  it('counts the filled sockets', () => {
    expect(cogsSet(game.level)).toBe(0);
    game.level.winch.sockets[1] = true;
    game.level.winch.sockets[2] = true;
    expect(cogsSet(game.level)).toBe(2);
  });
});

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
    game.player.x = 300; // leave the band
    game.player.y = game.level.groundY - game.player.h;
    update(DT, 800, fx);
    game.player.x = 100; // back in the band
    game.player.y = game.level.groundY - game.player.h;
    update(DT, 800, fx);
    expect(dialogue.open).toBe(false);
  });
});

describe('the winch beat chain', () => {
  it('w0 (two lines, repeat) while no cog is taken', () => {
    update(DT, 800, fx); close(3); // dismiss the intro
    const line1 = approachWinch();
    expect(line1.text).toBe(L.w0);
    expect(dialogue.lines).toHaveLength(2);
    close(2);
    expect(approachWinch().text).toBe(L.w0); // repeat while cog0 is untaken
    close(2);
  });

  it('w1 fires once with cog0 in hand and installs it exactly once', () => {
    update(DT, 800, fx); close(3);
    game.level.cogs[0].taken = true; // picked up (M3 reveals it first)
    expect(approachWinch().text).toBe(L.w1);
    const lvl = game.level;
    expect(lvl.winch.sockets).toEqual([true, false, false]);
    expect(lvl.cogs[0].installed).toBe(true);
    expect(lvl.vent.active).toBe(true);
    expect(calls.filter(n => n === 'gear')).toHaveLength(1);
    close(1);
    // re-approaches: w1 is spent — the chain has moved on to w2
    expect(approachWinch().text).toBe(L.w2);
    close(1);
    expect(calls.filter(n => n === 'gear')).toHaveLength(1); // onOpen ran once
  });

  it('w2 repeats at one socket while cog1 is untaken', () => {
    update(DT, 800, fx); close(3);
    game.level.winch.sockets[0] = true;
    expect(approachWinch().text).toBe(L.w2);
    close(1);
    expect(approachWinch().text).toBe(L.w2);
    close(1);
  });

  it('w3 fires once with cog1 in hand: socket 1, the sac appears', () => {
    update(DT, 800, fx); close(3);
    game.level.winch.sockets[0] = true;
    game.level.cogs[1].taken = true;
    expect(approachWinch().text).toBe(L.w3);
    const lvl = game.level;
    expect(lvl.winch.sockets[1]).toBe(true);
    expect(lvl.cogs[1].installed).toBe(true);
    expect(lvl.sac.present).toBe(true);
    expect(calls).toContain('gear');
    expect(calls).toContain('spin');
    close(1);
    expect(approachWinch().text).toBe(L.w4); // the chain has moved on
    close(1);
    expect(calls.filter(n => n === 'spin')).toHaveLength(1); // onOpen ran once
  });

  it('w4 repeats at two sockets while cog2 is untaken', () => {
    update(DT, 800, fx); close(3);
    game.level.winch.sockets[0] = true;
    game.level.winch.sockets[1] = true;
    expect(approachWinch().text).toBe(L.w4);
    close(1);
    expect(approachWinch().text).toBe(L.w4);
    close(1);
  });

  it('w5 fires once with cog2 in hand: wheel, bridge, and web wall', () => {
    update(DT, 800, fx); close(3);
    game.level.winch.sockets[0] = true;
    game.level.winch.sockets[1] = true;
    game.level.cogs[2].taken = true;
    expect(approachWinch().text).toBe(L.w5);
    const lvl = game.level;
    expect(lvl.winch.sockets).toEqual([true, true, true]);
    expect(lvl.cogs[2].installed).toBe(true);
    expect(lvl.winch.turning).toBe(true);
    expect(lvl.bridge.state).toBe('lowering');
    expect(lvl.bridge.lowerT).toBeCloseTo(1.2 - DT, 5); // one frame of lowering
    expect(lvl.door.state).toBe('opening');
    // openT decays one DT within the same frame the beat fires
    expect(lvl.door.openT).toBeCloseTo(1.5 - DT, 5);
    for (const n of ['rumble', 'creak', 'spin', 'seal']) expect(calls).toContain(n);
    close(1);
    // the wheel is awake and spent: nothing left to say
    expect(approachWinch()).toBeNull();
    expect(calls.filter(n => n === 'seal')).toHaveLength(1); // onOpen ran once
  });

  it('no beat fires early: w1 needs cog0, w3 needs cog1, w5 needs cog2', () => {
    update(DT, 800, fx); close(3);
    expect(approachWinch().text).toBe(L.w0); // 0 sockets, no cogs
    close(2);
    game.level.winch.sockets[0] = true; // w1's when would pass if cog0 held
    expect(approachWinch().text).toBe(L.w2); // but cog0 is untaken: w2
    close(1);
    game.level.winch.sockets[1] = true;
    expect(approachWinch().text).toBe(L.w4); // w3 needs cog1
    close(1);
    expect(game.level.door.state).toBe('locked'); // the wall stays sealed
    expect(game.level.bridge.state).toBe('raised');
  });
});
