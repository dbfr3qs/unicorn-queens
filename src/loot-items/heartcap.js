// Heartcap: permanent maxHp 4 for the run (gem payout if already capped),
// crowned heart sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function onPickup(it, p, lvl, fx, hooks) {
  let gained = 0;
  if (p.maxHp < 4) {
    p.maxHp = 4; // permanent for the run
    fx.play('heartcap');
  } else {
    gained = 1; // already capped: pays out like a gem
    fx.play('gem');
  }
  burst(it.x + 8, it.y + 8, FX.heart);
  return gained;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = palette.gold;           // golden heart
  c.beginPath();
  c.arc(-3.5, -2, 4.5, 0, Math.PI * 2);
  c.arc(3.5, -2, 4.5, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(-7.5, 0); c.lineTo(0, 8); c.lineTo(7.5, 0);
  c.closePath(); c.fill();
  c.fillStyle = '#fff';                 // little crown
  c.fillRect(-5.5, -9.5, 11, 2.5);
  c.fillRect(-5.5, -13, 2.5, 5);
  c.fillRect(-1.25, -13.5, 2.5, 5.5);
  c.fillRect(3, -13, 2.5, 5);
}

register({ kind: 'heartcap', weight: 0, onPickup, draw });
