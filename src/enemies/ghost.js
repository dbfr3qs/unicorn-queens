// Ghost: hovers with a slow bob, drifts at close range, flees a lit
// lantern (with flicker); unstompable; pale wobbly-skirt sprite.
import { register } from './index.js';

function update(e, { p, dt }) {
  // Hovers at its home point with a slow bob; drifts toward the player
  // while they are close, eases back home when they aren't. A lit
  // lantern makes close ghosts flee the light instead.
  if (e.homeX === undefined) { e.homeX = e.x; e.homeY = e.y; e.phase = e.x * 0.1; }
  e.phase += dt * Math.PI * 2 / this.bobPeriod;
  e.flicker = Math.max(0, (e.flicker ?? 0) - dt);
  const dx = p.x + p.w / 2 - (e.x + e.w / 2);
  const dy = p.y + p.h / 2 - (e.y + e.h / 2);
  const dist = Math.hypot(dx, dy);
  if (!p.dead && p.lantern > 0 && dist < 160) { // lantern: move straight away
    const m = this.speed * dt;
    if (dist > 0.001) { e.x -= dx / dist * m; e.y -= dy / dist * m; }
    else { e.x -= m; }
    e.flicker = 0.2; // visual: dimmer while fleeing
    return;
  }
  const near = !p.dead && Math.abs(dx) < this.aggroRange && Math.abs(dy) < this.aggroDy;
  const tx = near ? p.x + p.w / 2 : e.homeX + e.w / 2;
  const ty = near ? p.y + p.h / 2 : e.homeY + e.h / 2 + Math.sin(e.phase) * this.bobAmp;
  const ox = tx - (e.x + e.w / 2);
  const oy = ty - (e.y + e.h / 2);
  const d = Math.hypot(ox, oy);
  if (d > 0) {
    const m = Math.min(this.speed * dt, d); // ease toward target
    e.x += ox / d * m;
    e.y += oy / d * m;
  }
}

// The sprite path: a sheet cannot dim, so fleeing a lit lantern (the vector draw's alpha
// 0.4) is shown as a ring of the lantern's own warm light around the ghost.
function drawOverlay(c, e) {
  if (!(e.flicker > 0)) return;
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.strokeStyle = 'rgba(255, 205, 130, 0.6)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(0, 0, e.w * 0.75, 0, Math.PI * 2); c.stroke();
  c.restore();
}

function draw(c, e) {
  c.save();
  c.globalAlpha = e.flicker > 0 ? 0.4 : 0.75; // dimmer while fleeing the lantern
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  const wob = Math.sin(e.phase) * 2; // skirt wobble follows the bob phase
  c.fillStyle = '#cfe8ff'; // pale body
  c.fillRect(-14, -13, 28, 18);
  c.fillRect(-10, 5, 6, 8 + wob); // wavy skirt
  c.fillRect(-2, 5, 6, 8 - wob);
  c.fillRect(6, 5, 6, 8);
  c.fillStyle = '#2a3d66'; // dark eyes
  c.fillRect(-8, -8, 4, 6);
  c.fillRect(4, -8, 4, 6);
  c.restore();
}

register({
  kind: 'ghost',
  w: 28, h: 26,
  speed: 60, aggroRange: 260, aggroDy: 120, bobAmp: 14, bobPeriod: 2,
  stompable: false,
  update,
  draw,
  drawOverlay,
});
