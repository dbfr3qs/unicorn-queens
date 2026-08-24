// The jail cell and its witch. All state lives in lvl.cell (created by
// the level 3 data, P8): { x, y, w, h, open, opening, unlockT, witch,
// wx, wy, wvy, wanderT, fadeT, puffT }.
//
// Flow: with the key, approaching the cell clanks the lock and the bars
// swing open over CELL_UNLOCK seconds; when they're open the witch's two
// lines play and the flight spell is granted (permanent, P1 carry). The
// frame the box closes she hops out, wanders a step or two west, and
// fades in a puff of sparkles. Without the key the cell is silent here —
// the hint beat lives in lvl.dialogs (a repeat beat, P8).
import { openDialogue } from './dialogue.js';
import { burst } from './particles.js';
import { FX } from './effects.js';

export const CELL_UNLOCK = 0.8, WANDER_T = 0.9, FADE_T = 0.7;
const WITCH_W = 20, WITCH_H = 32, WITCH_G = 900, PUFF_EVERY = 0.18;

const UNLOCK_LINES = [
  { speaker: 'Witch', text: 'Free at last - you have a kind heart.' },
  { speaker: 'Witch', text: 'Take this: press S and you will soar.' },
];

// Approach zone: the cell mouth expanded 60 px west (the side the player
// comes from) and 40 px up (a low skimmer still counts as approaching).
export function cellApproach(lvl) {
  const c = lvl.cell;
  return { x: c.x - 60, y: c.y - 40, w: c.w + 60, h: c.h + 40 };
}

export function updateCell(lvl, p, dt, fx) {
  const cell = lvl.cell;
  if (!cell) return;
  const a = cellApproach(lvl);
  const near = !p.dead &&
    p.x < a.x + a.w && p.x + p.w > a.x && p.y < a.y + a.h && p.y + p.h > a.y;
  if (!cell.open && !cell.opening && near && lvl.key && lvl.key.taken) {
    cell.opening = true; // clank; the bars start swinging
    cell.unlockT = CELL_UNLOCK;
    fx.play('clank');
  }
  if (cell.opening) {
    cell.unlockT -= dt;
    if (cell.unlockT <= 0) {
      cell.opening = false;
      cell.open = true;
      p.hasFlight = true; // the witch's gift: permanent for the run
      p.flightCd = 0; // grant means ready now, not mid-recharge
      openDialogue(UNLOCK_LINES);
      fx.play('grant');
    }
    return;
  }
  if (!cell.open) return;
  // The witch leaves the frame after the unlock box closes: this is the
  // first non-frozen updateCell call with her still inside.
  if (cell.witch === 'inside') {
    cell.witch = 'exiting';
    cell.wanderT = WANDER_T;
    cell.wvy = -240; // hop
    return;
  }
  if (cell.witch === 'exiting') {
    cell.wanderT -= dt;
    const target = cell.x - 10;
    if (cell.wx > target) cell.wx = Math.max(target, cell.wx - 35 * dt); // wander west
    cell.wvy = Math.min(cell.wvy + WITCH_G * dt, 500);
    cell.wy += cell.wvy * dt;
    const ground = cell.y + cell.h - WITCH_H;
    if (cell.wy >= ground) { cell.wy = ground; cell.wvy = 0; }
    if (cell.wanderT <= 0) {
      cell.witch = 'fading';
      cell.fadeT = FADE_T;
      cell.puffT = 0;
    }
    return;
  }
  if (cell.witch === 'fading') {
    cell.fadeT -= dt;
    cell.puffT += dt;
    while (cell.puffT >= PUFF_EVERY) { // sparkle puffs while she fades
      cell.puffT -= PUFF_EVERY;
      burst(cell.wx + WITCH_W / 2, cell.wy + WITCH_H / 2, FX.mageSpark);
    }
    if (cell.fadeT <= 0) {
      cell.witch = 'gone';
      burst(cell.wx + WITCH_W / 2, cell.wy + WITCH_H / 2, FX.cast); // final puff
    }
  }
}
