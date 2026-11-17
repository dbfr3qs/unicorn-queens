// The dialogue box: bottom-center panel, one line at a time. The world
// is frozen while open (game.update early-returns); Space/Enter/arrows
// advance (routed from input.js), the last line closes.
//
// Lines are { speaker, text }. Beats live in level data (lvl.dialogs,
// checked by game.checkDialogs): each has an id and optional `when`
// condition on the game, and fires once per run.
import { freezeInput, syncInput } from './input.js';

export const dialogue = { open: false, lines: [], idx: 0 };

export function isDialogueOpen() { return dialogue.open; }
export function currentLine() { return dialogue.lines[dialogue.idx]; }

export function resetDialogue() {
  const wasOpen = dialogue.open;
  dialogue.open = false;
  dialogue.lines = [];
  dialogue.idx = 0;
  if (wasOpen) syncInput(); // held movement keys resume
}

export function openDialogue(lines) {
  dialogue.open = true;
  dialogue.lines = lines;
  dialogue.idx = 0;
  // The player is frozen mid-gesture: held keys go stale so closing the box
  // never fires a stale jump/shoot.
  freezeInput();
}

// Advance to the next line; returns true when the last line closes the box.
export function advanceDialogue() {
  if (!dialogue.open) return false;
  dialogue.idx += 1;
  if (dialogue.idx >= dialogue.lines.length) {
    resetDialogue();
    return true;
  }
  return false;
}
