import { describe, it, expect } from 'vitest';
import { padCodeAt, createPad } from '../src/touch.js';

const R = { left: 100, top: 200, width: 174, height: 174 }; // three 58 px cells
const log = () => { const l = []; return [l, (t, c) => l.push(`${t}:${c}`)]; };

describe('the d-pad is one surface', () => {
  it('maps the cross; hub, corners and outside are nothing', () => {
    expect(padCodeAt(187, 210, R)).toBe('ArrowUp');
    expect(padCodeAt(110, 287, R)).toBe('ArrowLeft');
    expect(padCodeAt(264, 287, R)).toBe('ArrowRight');
    expect(padCodeAt(187, 364, R)).toBe('ArrowDown');
    for (const [x, y] of [[187, 287], [110, 210], [264, 364], [50, 50]]) expect(padCodeAt(x, y, R)).toBe(null);
  });
  it('sliding left to right without lifting swaps the key', () => {
    const [l, d] = log(); const pad = createPad(d);
    pad.point(1, 'ArrowLeft'); pad.point(1, 'ArrowLeft'); pad.point(1, 'ArrowRight');
    expect(l).toEqual(['keydown:ArrowLeft', 'keyup:ArrowLeft', 'keydown:ArrowRight']);
  });
  it('landing on the hub and rolling onto a key presses it', () => {
    const [l, d] = log(); const pad = createPad(d);
    pad.point(1, null); pad.point(1, 'ArrowRight');
    expect(l).toEqual(['keydown:ArrowRight']);
  });
  it('two thumbs on one key release it only when both are gone; sliding off the pad releases (Review Focus 1)', () => {
    const [l, d] = log(); const pad = createPad(d);
    pad.point(1, 'ArrowUp'); pad.point(2, 'ArrowUp'); pad.lift(1);
    expect(l).toEqual(['keydown:ArrowUp']);
    pad.point(2, null);
    expect(l).toEqual(['keydown:ArrowUp', 'keyup:ArrowUp']);
  });
  it('liftAll releases each held key once', () => {
    const [l, d] = log(); const pad = createPad(d);
    pad.point(1, 'ArrowLeft'); pad.point(2, 'ArrowUp'); pad.liftAll(); pad.liftAll();
    expect(l.filter(s => s.startsWith('keyup'))).toHaveLength(2);
  });
});
