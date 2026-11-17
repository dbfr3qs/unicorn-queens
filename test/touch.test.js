import { describe, it, expect } from 'vitest';
import { padCodeAt, createPad, wire, releaseAllTouch } from '../src/touch.js';

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
  it('a move from a pointer that is not engaged does nothing', () => {
    const [l, d] = log(); const pad = createPad(d);
    pad.move(1, 'ArrowLeft'); // hovering, never pressed
    pad.point(2, 'ArrowRight'); pad.lift(2);
    pad.move(2, 'ArrowLeft'); // hovering again after the click
    expect(l).toEqual(['keydown:ArrowRight', 'keyup:ArrowRight']);
  });
  it('an engaged pointer that went down on the hub can roll onto a key by moving', () => {
    const [l, d] = log(); const pad = createPad(d);
    pad.point(1, null); pad.move(1, 'ArrowUp'); pad.move(1, null);
    expect(l).toEqual(['keydown:ArrowUp', 'keyup:ArrowUp']);
  });
});

const fakeBtn = (setPointerCapture) => ({
  listeners: {},
  addEventListener(t, f) { this.listeners[t] = f; },
  classList: { add() {}, remove() {} },
  setPointerCapture,
});

describe('an action button cannot latch', () => {
  it('a second pointer takes over a button whose release was missed', () => {
    const [l, d] = log(); const b = fakeBtn(); wire(b, 'Space', d);
    b.listeners.pointerdown({ pointerId: 1 }); // never released
    b.listeners.pointerdown({ pointerId: 2 }); b.listeners.pointerup({ pointerId: 2 });
    expect(l).toEqual(['keydown:Space', 'keyup:Space']);
  });
  it('setPointerCapture throwing does not latch the button', () => {
    const [l, d] = log(); const b = fakeBtn(() => { throw new Error('no'); }); wire(b, 'KeyX', d);
    b.listeners.pointerdown({ pointerId: 1 }); b.listeners.pointerup({ pointerId: 1 });
    b.listeners.pointerdown({ pointerId: 3 });
    expect(l).toEqual(['keydown:KeyX', 'keyup:KeyX', 'keydown:KeyX']);
  });
  it('release() lets go of a held button once', () => {
    const [l, d] = log(); const b = fakeBtn(); const w = wire(b, 'KeyS', d);
    b.listeners.pointerdown({ pointerId: 1 }); w.release(); w.release();
    expect(l).toEqual(['keydown:KeyS', 'keyup:KeyS']);
  });
  it('releaseAllTouch is safe before initTouch and repeatedly', () => {
    expect(() => { releaseAllTouch(); releaseAllTouch(); }).not.toThrow();
  });
  it('releaseAllTouch releases every wired button', () => {
    const [l, d] = log(); const b = fakeBtn(); wire(b, 'KeyX', d);
    b.listeners.pointerdown({ pointerId: 1 }); releaseAllTouch();
    expect(l).toEqual(['keydown:KeyX', 'keyup:KeyX']);
  });
});
