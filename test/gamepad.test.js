// The controller is keys: a pad's buttons and sticks reduce to the key codes
// the game already listens for, and the per-frame diff turns them into
// keydown/keyup. Pinned here because nothing else in the game would notice
// if the pad silently mapped to nothing.
import { describe, it, expect, beforeEach } from 'vitest';
import { padCodes, allPadCodes, pollGamepads, resetGamepads, DEADZONE } from '../src/gamepad.js';

const btn = (...pressed) => Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }));
const pad = (pressed = [], axes = [0, 0]) => ({ buttons: btn(...pressed), axes, mapping: 'standard' });

describe('what the buttons mean', () => {
  it('Cross is Space: jump, dialogue advance and restart in one button', () => {
    expect([...padCodes(pad([0]))]).toEqual(['Space']);
  });
  it('Square, Circle and the right shoulders fire; Triangle and the left shoulders fly', () => {
    for (const i of [1, 2, 5, 7]) expect([...padCodes(pad([i]))]).toEqual(['KeyX']);
    for (const i of [3, 4, 6]) expect([...padCodes(pad([i]))]).toEqual(['KeyS']);
  });
  it('the d-pad is the arrow keys', () => {
    expect([...padCodes(pad([12, 13, 14, 15]))].sort()).toEqual(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp']);
  });
  it('Options advances dialogue', () => {
    expect([...padCodes(pad([9]))]).toEqual(['Enter']);
  });
  it('a half-pulled trigger counts by value even if the browser has not flagged it pressed', () => {
    const p = pad(); p.buttons[7] = { pressed: false, value: 0.8 };
    expect([...padCodes(p)]).toEqual(['KeyX']);
  });
});

describe('the left stick', () => {
  it('steers past the deadzone and not inside it', () => {
    expect([...padCodes(pad([], [-0.9, 0]))]).toEqual(['ArrowLeft']);
    expect([...padCodes(pad([], [0.9, 0]))]).toEqual(['ArrowRight']);
    expect([...padCodes(pad([], [DEADZONE - 0.05, 0]))]).toEqual([]);
    expect([...padCodes(pad([], [0.1, -0.1]))]).toEqual([]); // resting off-centre
  });
  it('up is negative y, and up is a jump like the arrow key', () => {
    expect([...padCodes(pad([], [0, -0.9]))]).toEqual(['ArrowUp']);
    expect([...padCodes(pad([], [0, 0.9]))]).toEqual(['ArrowDown']);
  });
  it('a diagonal is both', () => {
    expect([...padCodes(pad([], [0.8, -0.8]))].sort()).toEqual(['ArrowRight', 'ArrowUp']);
  });
});

describe('the poll', () => {
  let events;
  const dispatch = (type, code) => events.push(`${type}:${code}`);
  beforeEach(() => { events = []; resetGamepads(); });

  it('emits keydown on the way in, nothing while held, keyup on the way out', () => {
    pollGamepads(() => [pad([0])], dispatch);
    expect(events).toEqual(['keydown:Space']);
    pollGamepads(() => [pad([0])], dispatch);
    expect(events).toEqual(['keydown:Space']); // held: no repeat
    pollGamepads(() => [pad()], dispatch);
    expect(events).toEqual(['keydown:Space', 'keyup:Space']);
  });

  it('does not release a key while another source still holds it', () => {
    pollGamepads(() => [pad([14], [-0.9, 0])], dispatch); // d-pad left AND stick left
    pollGamepads(() => [pad([], [-0.9, 0])], dispatch); // d-pad let go, stick still over
    expect(events).toEqual(['keydown:ArrowLeft']);
    pollGamepads(() => [pad()], dispatch);
    expect(events).toEqual(['keydown:ArrowLeft', 'keyup:ArrowLeft']);
  });

  it('merges every connected pad, and copes with none', () => {
    expect([...allPadCodes([pad([0]), pad([2]), null])].sort()).toEqual(['KeyX', 'Space']);
    pollGamepads(() => [], dispatch);
    expect(events).toEqual([]);
  });

  it('releases everything if the pad disappears mid-press', () => {
    pollGamepads(() => [pad([0, 15])], dispatch);
    pollGamepads(() => [], dispatch);
    expect(events.slice(2).sort()).toEqual(['keyup:ArrowRight', 'keyup:Space']);
  });
});
