// The troll-hall door: keyless barrier, key-gated auto-open that consumes
// the key, drop-shut behind the player, re-lock, full-height (flight can't
// skip the key requirement).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const DOOR_X = 1000, DOOR_W = 40; // on level 1's 940-1600 ground segment

function rig(over = {}) {
  const g = game;
  g.level.door = { x: DOOR_X, y: 0, w: DOOR_W, h: g.level.groundY, state: 'locked', openT: 0, closeT: 0, ...over };
  g.level.key = { x: 600, y: g.level.groundY - 44, w: 16, h: 16, taken: false, consumed: false };
  return g;
}
// Stand `dx` px west of the door face, on the ground.
const atDoor = dx => { const g = game; g.player.x = DOOR_X - dx; g.player.y = g.level.groundY - 44; };

describe('noKey (level 4 portcullis)', () => {
  it('opens on approach without a key', () => {
    rig({ noKey: true });
    atDoor(30);
    for (let i = 0; i < 80; i++) update(DT, 800, fx); // 1.33 s > DOOR_OPEN 1.0 s
    expect(game.level.door.state).toBe('open');
    expect(calls).toContain('rumble');
  });

  it('does not consume a key it never needed', () => {
    rig({ noKey: true });
    game.level.key.taken = true;
    atDoor(30);
    for (let i = 0; i < 80; i++) update(DT, 800, fx);
    expect(game.level.key.consumed).toBe(false);
  });

  it('drops shut behind the player once past', () => {
    rig({ noKey: true, state: 'open' });
    game.player.x = DOOR_X + DOOR_W + 20; // fully past
    game.player.y = game.level.groundY - 44;
    for (let i = 0; i < 10; i++) update(DT, 800, fx);
    expect(game.level.door.state).toBe('closing');
  });
});

beforeEach(() => { startGame(600, 0); calls.length = 0; });
afterEach(() => { input.left = false; input.right = false; startGame(600, 0); });

describe('locked', () => {
  it('blocks a keyless player at the door face', () => {
    rig();
    atDoor(30);
    input.right = true;
    for (let i = 0; i < 10; i++) update(DT, 800, fx);
    expect(game.player.x + game.player.w).toBeLessThanOrEqual(DOOR_X);
    expect(game.level.door.state).toBe('locked');
  });

  it('does not open without the key, however close', () => {
    rig();
    atDoor(5);
    for (let i = 0; i < 10; i++) update(DT, 800, fx);
    expect(game.level.door.state).toBe('locked');
    expect(calls).not.toContain('rumble');
  });
});

describe('with the key', () => {
  it('auto-opens on approach and consumes the key', () => {
    rig();
    game.level.key.taken = true;
    atDoor(30);
    update(DT, 800, fx);
    expect(game.level.door.state).toBe('opening');
    expect(game.level.key.consumed).toBe(true); // spent the moment it starts
    expect(calls).toContain('rumble');
    for (let i = 0; i < 62; i++) update(DT, 800, fx); // past the 1.0 s slide
    expect(game.level.door.state).toBe('open');
  });

  it('opening consumes the key for good: no second trigger later', () => {
    rig();
    game.level.key.taken = true;
    atDoor(30);
    update(DT, 800, fx);
    // the door is fully open; walk away and back
    for (let i = 0; i < 62; i++) update(DT, 800, fx);
    game.player.x = DOOR_X - 300;
    update(DT, 800, fx);
    atDoor(30);
    for (let i = 0; i < 10; i++) update(DT, 800, fx);
    expect(game.level.door.state).toBe('open'); // never re-enters 'opening'
    expect(calls.filter(c => c === 'rumble')).toHaveLength(1);
  });
});

describe('drop-shut', () => {
  it('closes once the player is fully past, and re-locks the hall', () => {
    rig({ state: 'open' });
    game.player.x = DOOR_X + DOOR_W + 20;
    game.player.y = game.level.groundY - 44;
    update(DT, 800, fx);
    expect(game.level.door.state).toBe('closing');
    expect(calls).toContain('rumble');
    for (let i = 0; i < 62; i++) update(DT, 800, fx); // past the 1.0 s drop
    expect(game.level.door.state).toBe('shut');
    // hall side is now walled off from the west side
    input.left = true;
    for (let i = 0; i < 10; i++) update(DT, 800, fx);
    expect(game.player.x).toBeGreaterThanOrEqual(DOOR_X + DOOR_W);
  });

  it('does not close if the player never crosses', () => {
    rig({ state: 'open' });
    atDoor(30); // still on the west side
    for (let i = 0; i < 60; i++) update(DT, 800, fx);
    expect(game.level.door.state).toBe('open');
  });
});

describe('flight cannot bypass', () => {
  it('a flying player is still walled out by the full-height door', () => {
    rig();
    const p = game.player;
    p.hasFlight = true; p.flying = true; p.flightT = 5; // in the flight lane
    p.x = DOOR_X - 60; p.y = 80;
    input.right = true;
    for (let i = 0; i < 10; i++) update(DT, 800, fx);
    expect(p.x + p.w).toBeLessThanOrEqual(DOOR_X);
    expect(game.level.door.state).toBe('locked');
  });
});
