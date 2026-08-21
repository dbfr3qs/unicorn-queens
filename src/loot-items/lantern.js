// Lantern: timed ghost-repel pickup, warm glass lantern sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { LANTERN_TIME } from '../player.js';
import { register } from './index.js';

function onPickup(it, p, lvl, fx, hooks) {
  p.lantern = LANTERN_TIME;
  fx.play('lantern');
  burst(it.x + 8, it.y + 8, FX.lantern);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = '#ffb36b';             // warm glass
  c.fillRect(-4, -6, 8, 10);
  c.fillStyle = '#8a5f22';             // frame
  c.fillRect(-6, -8, 12, 2);
  c.fillRect(-6, 4, 12, 2);
  c.strokeStyle = '#8a5f22';           // handle
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, -8, 4, Math.PI, 0); c.stroke();
}

register({ kind: 'lantern', weight: 0, onPickup, draw });
