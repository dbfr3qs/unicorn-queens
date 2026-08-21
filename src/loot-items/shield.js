// Shield: +3 fireball-reflection pickup (cap 3), mirror disc sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';

function onPickup(it, p, lvl, fx, hooks) {
  p.shield = Math.min(3, p.shield + 3);
  fx.play('reflect');
  burst(it.x + 8, it.y + 8, FX.reflect);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = '#cfe8ff';             // mirror disc
  c.beginPath(); c.arc(0, -1, 6, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#8fd3f4';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, -1, 6, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#8fd3f4';             // handle
  c.fillRect(-1.5, 5, 3, 5);
}

register({ kind: 'shield', weight: 0, onPickup, draw });
