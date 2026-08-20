// Heart: +1 hp pickup (capped at maxHp), pink heart sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function onPickup(it, p, lvl, fx, hooks) {
  p.hp = Math.min(p.hp + 1, p.maxHp);
  fx.play('heart');
  burst(it.x + 8, it.y + 8, FX.heart);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = palette.pink;
  c.beginPath();
  c.arc(-3.5, -3, 4.5, 0, Math.PI * 2);
  c.arc(3.5, -3, 4.5, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(-7.5, -1); c.lineTo(0, 8); c.lineTo(7.5, -1);
  c.closePath(); c.fill();
}

register({ kind: 'heart', weight: 0.20, onPickup, draw });
