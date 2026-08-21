// Magnet: timed gem-attraction pickup, pink horseshoe sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { MAGNET_TIME } from '../player.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function onPickup(it, p, lvl, fx, hooks) {
  p.magnet = MAGNET_TIME;
  fx.play('magnet');
  burst(it.x + 8, it.y + 8, FX.magnet);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.strokeStyle = palette.pink;          // horseshoe magnet
  c.lineWidth = 4;
  c.beginPath();
  c.arc(0, 1, 6, Math.PI, Math.PI * 2);  // open at the bottom
  c.stroke();
  c.fillStyle = '#fff';                  // ferrule tips
  c.fillRect(-8, 0, 4, 3);
  c.fillRect(4, 0, 4, 3);
}

register({ kind: 'magnet', weight: 0.05, onPickup, draw });
