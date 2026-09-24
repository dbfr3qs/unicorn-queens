// The difficulty card: the first thing a plain start shows, and where the
// end card's Space comes back to. ←/→ (or A/D) choose, Space/Enter starts
// the run from the opening. Choosing always starts a fresh run — the
// carried heart cap is sized to the preset it was earned under.
import { game } from './game.js';
import { DIFFICULTIES, difficultyName, setDifficulty, saveDifficulty } from './difficulty.js';
import { startIntro } from './intro.js';

export const PICKER_BLURB = {
  easy: 'five hearts · no pit damage · revive where you fall',
  medium: 'four hearts · gentler bosses · a fall costs a heart',
  hard: 'three hearts · the game as designed',
};

// Open over whatever is loaded (level 1 at boot, the healed throne room at
// the end), with the current choice picked.
export function openPicker() {
  game.picker = { i: DIFFICULTIES.indexOf(difficultyName()) };
}

// A key while the card is up. Returns true when it was the card's key.
export function pickerKey(code, viewH) {
  const pk = game.picker;
  if (!pk) return false;
  const n = DIFFICULTIES.length;
  if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp') pk.i = (pk.i + n - 1) % n;
  else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown') pk.i = (pk.i + 1) % n;
  else if (code === 'Space' || code === 'Enter') {
    setDifficulty(DIFFICULTIES[pk.i]);
    saveDifficulty();
    startIntro(viewH); // startGame clears the card
  }
  return true;
}
