// Hops: +3 air-jump pickup (cap 3), small wings sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function onPickup(it, p, lvl, fx, hooks) {
  p.hops = Math.min(3, p.hops + 3);
  fx.play('hop');
  burst(it.x + 8, it.y + 8, FX.hopPuff);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = '#e8e8f0';             // pair of small wings
  c.beginPath(); c.ellipse(-4, 0, 5, 3.5, -0.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(4, 0, 5, 3.5, 0.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = palette.lavender;      // feather lines
  c.fillRect(-6, 1, 3, 1);
  c.fillRect(3, 1, 3, 1);
}

register({ kind: 'hops', weight: 0.04, onPickup, draw });
