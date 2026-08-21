// Star: +5 star-arrow pickup (cap 10), spinning four-point star sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function onPickup(it, p, lvl, fx, hooks) {
  p.stars = Math.min(10, p.stars + 5);
  fx.play('star');
  burst(it.x + 8, it.y + 8, FX.star);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = palette.gold;           // four-point star, slow spin
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 9 : 3.5;
    const a = (i * Math.PI) / 4 - Math.PI / 2 + it.t;
    c[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
}

register({ kind: 'star', weight: 0.04, onPickup, draw });
