import { describe, it, expect, beforeEach } from 'vitest';
import { input, onKeyDown, onKeyUp, resetInput, releaseAllKeys, _resetMute } from '../src/input.js';
import * as audio from '../src/audio.js';
import { music } from '../src/music.js';
import { openDialogue, isDialogueOpen, resetDialogue } from '../src/dialogue.js';

const ev = code => {
  const e = { code };
  e.preventDefault = () => { e.prevented = true; };
  return e;
};

beforeEach(() => {
  resetInput(); resetDialogue(); _resetMute();
  if (audio.muted) audio.toggleMuted(); // start unmuted
  music.muted = false;
});

const LINE = [{ speaker: 'x', text: 'y' }];
it('a movement key held through a dialogue moves again when the box closes', () => {
  onKeyDown(ev('ArrowRight'));
  openDialogue(LINE);
  expect(input.right).toBe(false);
  onKeyDown(ev('Space')); // dismisses the box
  expect(isDialogueOpen()).toBe(false);
  expect(input.right).toBe(true);  // still physically held
  expect(input.jump).toBe(false);  // the dismissing Space is not a jump
  onKeyUp(ev('Space')); onKeyDown(ev('Space'));
  expect(input.jump).toBe(true);   // a fresh press is
});
it('a key pressed during the dialogue is held when it closes; one released is not', () => {
  onKeyDown(ev('ArrowRight')); openDialogue(LINE);
  onKeyUp(ev('ArrowRight')); onKeyDown(ev('ArrowLeft')); onKeyDown(ev('Enter'));
  expect(input.right).toBe(false); expect(input.left).toBe(true);
});
it('fire held through a dialogue needs a fresh press', () => {
  onKeyDown(ev('KeyX')); openDialogue(LINE); onKeyDown(ev('Enter'));
  expect(input.fire).toBe(false);
});
it('releasing ArrowUp while Space is held does not cancel the jump', () => {
  onKeyDown(ev('Space')); onKeyDown(ev('ArrowUp')); onKeyUp(ev('ArrowUp'));
  expect(input.jump).toBe(true); expect(input.up).toBe(false);
});
it('releasing A while D is held keeps running right; releasing J keeps X firing', () => {
  onKeyDown(ev('KeyD')); onKeyDown(ev('ArrowRight')); onKeyUp(ev('ArrowRight'));
  onKeyDown(ev('KeyX')); onKeyDown(ev('KeyJ')); onKeyUp(ev('KeyJ'));
  expect(input.right).toBe(true); expect(input.fire).toBe(true);
});
it('a restart that closes the box hands held movement back (Review Focus 2)', () => {
  onKeyDown(ev('ArrowLeft')); openDialogue(LINE); resetDialogue();
  expect(input.left).toBe(true);
});
it('releaseAllKeys drops everything held', () => {
  onKeyDown(ev('ArrowRight')); onKeyDown(ev('Space')); releaseAllKeys();
  expect(input.right).toBe(false); expect(input.jump).toBe(false);
});
it('holding M toggles once', () => {
  onKeyDown(ev('KeyM')); onKeyDown({ ...ev('KeyM'), repeat: true });
  expect(audio.muted).toBe(true);
});
it("M does not overwrite N's music-only mute", () => {
  onKeyDown(ev('KeyN'));                        // music off, sfx on
  onKeyDown(ev('KeyM')); onKeyDown(ev('KeyM')); // master off, then on again
  expect(audio.muted).toBe(false); expect(music.muted).toBe(true);
});
