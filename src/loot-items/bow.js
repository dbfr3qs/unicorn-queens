// Bow: one-time pickup that grants p.hasBow, wooden bow sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function onPickup(it, p, lvl, fx, hooks) {
  p.hasBow = true;
  fx.play('bow');
  burst(it.x + 8, it.y + 8, FX.bow);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.strokeStyle = palette.wood;
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(-2, 0, 7, -Math.PI / 2, Math.PI / 2); // limb
  c.stroke();
  c.strokeStyle = palette.white;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-2, -7); c.lineTo(-2, 7); // string
  c.stroke();
}

register({ kind: 'bow', weight: 0, onPickup, draw });
