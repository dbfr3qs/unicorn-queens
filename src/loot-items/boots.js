// Boots: timed super-jump pickup (also the short MYSTERY_BOOTS variant),
// golden boot sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { BOOTS_TIME } from '../player.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

export const MYSTERY_BOOTS = 5; // s of super-jump from a mystery box (short)

function onPickup(it, p, lvl, fx, hooks) {
  p.boots = it.short ? MYSTERY_BOOTS : BOOTS_TIME;
  fx.play('boots');
  burst(it.x + 8, it.y + 8, FX.boots);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = palette.gold;            // golden boot pair
  c.fillRect(-8, -6, 6, 12);
  c.fillRect(2, -6, 6, 12);
  c.fillRect(-9, 4, 7, 3);               // soles
  c.fillRect(1, 4, 7, 3);
  c.fillStyle = '#8a5f22';               // trim
  c.fillRect(-8, -6, 6, 2);
  c.fillRect(2, -6, 6, 2);
}

register({ kind: 'boots', weight: 0.05, onPickup, draw });
