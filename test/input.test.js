import { describe, it, expect, beforeEach } from 'vitest';
import { input, setKey, onKeyDown, onKeyUp } from '../src/input.js';
import * as audio from '../src/audio.js';

// synthetic KeyboardEvent: records whether preventDefault was called
const ev = code => {
  const e = { code };
  e.preventDefault = () => { e.prevented = true; };
  return e;
};

beforeEach(() => {
  for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyX', 'KeyJ'])
    setKey(code, false);
  input.cast = false; // one-frame flag, reset between tests
  if (audio.muted) audio.toggleMuted(); // restore to unmuted
});

describe('key mapping', () => {
  it('arrows and WASD set the right flags', () => {
    onKeyDown(ev('ArrowLeft'));
    expect(input.left).toBe(true);
    onKeyDown(ev('KeyD'));
    expect(input.right).toBe(true);
    onKeyDown(ev('Space'));
    expect(input.jump).toBe(true);
    onKeyDown(ev('KeyX'));
    expect(input.fire).toBe(true);
  });

  it('keyup clears flags', () => {
    onKeyDown(ev('ArrowLeft'));
    expect(input.left).toBe(true);
    onKeyUp(ev('ArrowLeft'));
    expect(input.left).toBe(false);
  });

  it('only arrows and Space call preventDefault', () => {
    const prevented = codes => codes.map(code => {
      const e = ev(code);
      onKeyDown(e);
      return e.prevented === true;
    });
    expect(prevented(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']))
      .toEqual([true, true, true, true, true]);
    expect(prevented(['KeyA', 'KeyD', 'KeyW', 'KeyX', 'KeyM']))
      .toEqual([false, false, false, false, false]);
  });
});

describe('flight keys', () => {
  it('ArrowUp sets up (and still sets jump); ArrowDown sets down', () => {
    onKeyDown(ev('ArrowUp'));
    expect(input.up).toBe(true);
    expect(input.jump).toBe(true);
    onKeyUp(ev('ArrowUp'));
    expect(input.up).toBe(false);
    expect(input.jump).toBe(false);
    onKeyDown(ev('ArrowDown'));
    expect(input.down).toBe(true);
    onKeyUp(ev('ArrowDown'));
    expect(input.down).toBe(false);
  });

  it('S sets a one-frame cast flag; key repeat does not re-set it', () => {
    onKeyDown(ev('KeyS'));
    expect(input.cast).toBe(true);
    input.cast = false; // simulate the player consuming it
    const e = ev('KeyS');
    e.repeat = true;
    onKeyDown(e);
    expect(input.cast).toBe(false);
  });
});

describe('mute toggle', () => {
  it('M flips the muted state both ways', () => {
    const before = audio.muted;
    onKeyDown(ev('KeyM'));
    expect(audio.muted).toBe(!before);
    onKeyDown(ev('KeyM'));
    expect(audio.muted).toBe(before);
  });
});
