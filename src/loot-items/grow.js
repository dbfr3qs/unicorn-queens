// Grow: grow-from-the-feet size-up pickup, gold four-point sparkle sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { BIG_W, BIG_H } from '../player.js'; // read at pickup time, not init
import { register } from './index.js';
import { palette } from '../render/theme.js';

function onPickup(it, p, lvl, fx, hooks) {
  if (!p.big) {
    p.big = true;
    p.x -= (BIG_W - p.w) / 2; // grow from the feet
    p.y -= (BIG_H - p.h);
    p.w = BIG_W; p.h = BIG_H;
  }
  fx.play('grow');
  burst(it.x + 8, it.y + 8, FX.grow);
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = palette.gold;
  c.beginPath(); // four-point sparkle
  c.moveTo(0, -8); c.lineTo(3, -3); c.lineTo(8, 0); c.lineTo(3, 3);
  c.lineTo(0, 8); c.lineTo(-3, 3); c.lineTo(-8, 0); c.lineTo(-3, -3);
  c.closePath();
  c.fill();
}

register({ kind: 'grow', weight: 0, onPickup, draw });
