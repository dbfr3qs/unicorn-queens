// Input: keyboard state and event handlers (DOM registration lives in main.js).
// First keypress unlocks audio; M toggles mute. While a dialogue box is
// open the world is frozen and Space/Enter/arrows advance the lines.
import { initAudio, toggleMuted, fx } from './audio.js';
import { isDialogueOpen, advanceDialogue } from './dialogue.js';

export const input = { left: false, right: false, jump: false, fire: false, up: false, down: false, cast: false };

export function setKey(code, down) {
  if (code === 'ArrowLeft' || code === 'KeyA') input.left = down;
  if (code === 'ArrowRight' || code === 'KeyD') input.right = down;
  if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') input.jump = down;
  if (code === 'KeyX' || code === 'KeyJ') input.fire = down;
  if (code === 'ArrowUp') input.up = down; // flight ascend (ArrowUp still counts as jump too)
  if (code === 'ArrowDown') input.down = down; // flight descend
}

export function onKeyDown(e) {
  initAudio(); // unlock audio on first input
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyM') toggleMuted();
  if (isDialogueOpen()) {
    // dialogue open: advance keys only, never game input
    if (!e.repeat && (e.code === 'Space' || e.code === 'Enter' ||
        e.code === 'NumpadEnter' || e.code.startsWith('Arrow'))) {
      advanceDialogue();
      fx.play('dialog');
    }
    return;
  }
  if (e.code === 'KeyS' && !e.repeat) input.cast = true; // one-frame flag; the player consumes it
  setKey(e.code, true);
}
export function onKeyUp(e) { setKey(e.code, false); }
