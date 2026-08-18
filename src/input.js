// Input: keyboard state and event handlers (DOM registration lives in main.js).
// First keypress unlocks audio; M toggles mute.
import { initAudio, toggleMuted } from './audio.js';

export const input = { left: false, right: false, jump: false, fire: false };

export function setKey(code, down) {
  if (code === 'ArrowLeft' || code === 'KeyA') input.left = down;
  if (code === 'ArrowRight' || code === 'KeyD') input.right = down;
  if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') input.jump = down;
  if (code === 'KeyX' || code === 'KeyJ') input.fire = down;
}

export function onKeyDown(e) {
  initAudio(); // unlock audio on first input
  if (e.code === 'KeyM') toggleMuted();
  setKey(e.code, true);
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
}
export function onKeyUp(e) { setKey(e.code, false); }
