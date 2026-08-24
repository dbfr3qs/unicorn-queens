// The dialogue box: bottom-center panel, one line at a time. The world
// is frozen while open (game.update early-returns); Space/Enter/arrows
// advance (routed from input.js), the last line closes.
//
// Lines are { speaker, text }. Beats live in level data (lvl.dialogs,
// checked by game.checkDialogs): each has an id and optional `when`
// condition on the game, and fires once per run.
import { input } from './input.js';

export const dialogue = { open: false, lines: [], idx: 0 };

export function isDialogueOpen() { return dialogue.open; }
export function currentLine() { return dialogue.lines[dialogue.idx]; }

export function resetDialogue() {
  dialogue.open = false;
  dialogue.lines = [];
  dialogue.idx = 0;
}

export function openDialogue(lines) {
  dialogue.open = true;
  dialogue.lines = lines;
  dialogue.idx = 0;
  // The player is frozen mid-gesture: clear held keys so closing the box
  // never fires a stale jump/shoot.
  input.left = input.right = input.jump = input.fire = false;
  input.up = input.down = false;
  input.cast = false;
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
