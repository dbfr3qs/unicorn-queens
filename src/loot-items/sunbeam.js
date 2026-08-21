// Sunbeam: instant screen-clear pickup via hooks.onSunbeam, radiant disc sprite.
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';

function onPickup(it, p, lvl, fx, hooks) {
  fx.play('sunbeam');
  burst(it.x + 8, it.y + 8, FX.sunbeam);
  if (hooks.onSunbeam) hooks.onSunbeam(p, lvl, fx); // screen clear
  return 0;
}

// Translated to item center by drawLoot.
function draw(c, it) {
  c.strokeStyle = '#ffe9b0';             // rotating rays
  c.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + it.t;
    c.beginPath();
    c.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
    c.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
    c.stroke();
  }
  c.fillStyle = '#ffd75e';               // radiant disc
  c.beginPath();
  c.arc(0, 0, 6, 0, Math.PI * 2);
  c.fill();
}

register({ kind: 'sunbeam', weight: 0.03, onPickup, draw });
