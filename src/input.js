// Input: keyboard state and event handlers (DOM registration lives in main.js).
// First keypress unlocks audio and starts the music; M mutes everything,
// N mutes just the music. While a dialogue box is open the world is
// frozen and Space/Enter/arrows advance the lines.
import { initAudio, toggleMuted, muted, fx } from './audio.js';
import { initMusic, setMusicMuted, toggleMusicMuted } from './music.js';
import { isDialogueOpen, advanceDialogue } from './dialogue.js';

export const input = { left: false, right: false, jump: false, fire: false, up: false, down: false, cast: false };

// Physically held key codes, kept apart from the game-facing `input` flags.
// `stale` marks codes pressed (or held) across a dialogue: their jump/fire
// needs a fresh press, but movement resumes at once.
const held = new Set();
const stale = new Set();
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp'], // flight ascend (ArrowUp still counts as jump too)
  down: ['ArrowDown'], // flight descend
  jump: ['ArrowUp', 'KeyW', 'Space'],
  fire: ['KeyX', 'KeyJ'],
};
const EDGE = new Set(['jump', 'fire']);

export function syncInput() {
  for (const [flag, codes] of Object.entries(KEYMAP))
    input[flag] = codes.some(c => held.has(c) && !(EDGE.has(flag) && stale.has(c)));
}

export function setKey(code, down) {
  if (down) held.add(code); else { held.delete(code); stale.delete(code); }
  syncInput();
}

// A dialogue is opening: everything held is stale, all flags false.
export function freezeInput() {
  for (const c of held) stale.add(c);
  for (const flag of Object.keys(KEYMAP)) input[flag] = false;
  input.cast = false;
}

export function resetInput() {
  held.clear();
  stale.clear();
  syncInput();
  input.cast = false;
}

export function onKeyDown(e) {
  initAudio(); // unlock audio on first input
  initMusic(); // and fetch the music bundle (lazy, once, failure-tolerant)
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  // M is the master mute: sfx and music together. N leaves the sfx alone,
  // which is what you want while tuning one against the other.
  if (e.code === 'KeyM') { toggleMuted(); setMusicMuted(muted); }
  if (e.code === 'KeyN') toggleMusicMuted();
  if (isDialogueOpen()) {
    // dialogue open: advance keys only, never game input
    if (!e.repeat && (e.code === 'Space' || e.code === 'Enter' ||
        e.code === 'NumpadEnter' || e.code.startsWith('Arrow'))) {
      held.add(e.code); stale.add(e.code);
      if (advanceDialogue()) syncInput();
      fx.play('dialog');
      return;
    }
    held.add(e.code); stale.add(e.code);
    return;
  }
  if (e.code === 'KeyS' && !e.repeat) input.cast = true; // one-frame flag; the player consumes it
  setKey(e.code, true);
}
export function onKeyUp(e) {
  held.delete(e.code); stale.delete(e.code);
  if (!isDialogueOpen()) syncInput();
}
