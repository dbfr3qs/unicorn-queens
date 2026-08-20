// Gem: +1 score pickup with sfx/FX, magnet steering (update), teal diamond sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

const MAGNET_ACC = 900, MAGNET_SPEED = 320; // gem steering toward the player

// Custom physics: while the player's magnet is active, steer toward them.
// Returns true while steering (suppresses the default gravity pass).
function update(it, p, lvl, dt) {
  if (p.dead || p.magnet <= 0) return false;
  // magnet: gems fly to the player (accelerate, capped speed)
  it.onGround = false; // a flying gem is no longer resting
  const dx = (p.x + p.w / 2) - (it.x + it.w / 2);
  const dy = (p.y + p.h / 2) - (it.y + it.h / 2);
  const d = Math.hypot(dx, dy) || 1;
  it.vx += (dx / d) * MAGNET_ACC * dt;
  it.vy += (dy / d) * MAGNET_ACC * dt;
  const sp = Math.hypot(it.vx, it.vy);
  if (sp > MAGNET_SPEED) { it.vx *= MAGNET_SPEED / sp; it.vy *= MAGNET_SPEED / sp; }
  it.x += it.vx * dt;
  it.y += it.vy * dt;
  return true;
}

// Returns the score delta (1).
function onPickup(it, p, lvl, fx, hooks) {
  fx.play('gem');
  burst(it.x + 8, it.y + 8, FX.gem);
  return 1;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.fillStyle = palette.teal;
  c.beginPath();
  c.moveTo(0, -8); c.lineTo(7, 0); c.lineTo(0, 8); c.lineTo(-7, 0);
  c.closePath(); c.fill();
  c.fillStyle = '#c8fbfa'; // glint
  c.beginPath();
  c.moveTo(0, -8); c.lineTo(7, 0); c.lineTo(0, 0);
  c.closePath(); c.fill();
}

register({ kind: 'gem', weight: 0, onPickup, update, draw });
