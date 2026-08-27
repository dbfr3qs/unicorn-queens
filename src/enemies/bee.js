// Bee: a small golden flyer (level 5's regular enemy). Hovers at its home
// flower with a fast wing-beat and a small circular bob; when the player
// gets close AND the sting cooldown is done, it fires a straight
// horizontal dash at the player's height (clamped to home y ± 80), then
// eases back home. Stompable (bounce + death puff) and arrow-killable, so
// nothing depends on the bow. 1 hp. Sunbeam kills it (not a boss).
import { register } from './index.js';

function update(e, { p, dt, fx }) {
  if (e.homeX === undefined) {
    e.homeX = e.x; e.homeY = e.y;
    e.phase = e.x * 0.17; // seeded wing-beat phase
    e.state = 'hover';
    e.stingT = 0; e.stingDist = 0; e.ty = e.y;
    e.stingCd = this.stingCdMin + ((e.homeX * 0.31) % 1) * (this.stingCdMax - this.stingCdMin);
  }
  e.phase += dt * 10; // fast wing-beat
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  if (e.state === 'hover') {
    // ease onto a small circular bob around the home flower
    const ang = e.phase * 0.6;
    const hx = e.homeX + e.w / 2 + Math.cos(ang) * this.bobR;
    const hy = e.homeY + e.h / 2 + Math.sin(ang) * this.bobR;
    const dx = hx - cx, dy = hy - cy;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) { const m = Math.min(this.trackSpeed * dt, d); e.x += dx / d * m; e.y += dy / d * m; }
    e.dir = pcx >= cx ? 1 : -1;
    e.stingCd -= dt;
    // aggro: close horizontally AND vertically, cooldown done, player alive
    const aggro = !p.dead &&
      Math.abs(pcx - cx) < this.stingRangeX && Math.abs(pcy - cy) < this.stingRangeY &&
      e.stingCd <= 0;
    if (aggro) {
      e.state = 'sting'; e.stingT = 0; e.stingDist = 0;
      e.dir = pcx >= cx ? 1 : -1;
      e.ty = Math.max(e.homeY - this.stingClamp, Math.min(e.homeY + this.stingClamp, p.y)); // player height, clamped
      fx.play('buzz');
    }
  } else if (e.state === 'sting') {
    e.stingT += dt;
    const step = Math.min(this.stingSpeed * dt, this.stingMax - e.stingDist); // never past the cap
    e.x += e.dir * step; // straight horizontal dash
    e.stingDist += step;
    const dy = e.ty - e.y; // ease onto the captured height
    e.y += Math.sign(dy) * Math.min(Math.abs(dy), this.stingSpeed * 0.6 * dt);
    if (e.stingDist >= this.stingMax || e.stingT >= this.stingDur) e.state = 'return';
  } else { // ease back home
    const hx = e.homeX + e.w / 2, hy = e.homeY + e.h / 2;
    const dx = hx - cx, dy = hy - cy;
    const d = Math.hypot(dx, dy);
    e.dir = dx >= 0 ? 1 : -1;
    if (d > 1) { const m = Math.min(this.returnSpeed * dt, d); e.x += dx / d * m; e.y += dy / d * m; }
    if (d <= 2) {
      e.state = 'hover';
      e.stingCd = this.stingCdMin + ((e.homeX * 0.31) % 1) * (this.stingCdMax - this.stingCdMin);
    }
  }
  e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x)); // stay in its band
  e.y = Math.max(20, e.y); // never above the ceiling line
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const flap = Math.sin(e.phase * 6); // wing-beat
  c.globalAlpha = 0.85; // wings: two pale flapping membranes
  c.fillStyle = '#cfe8ff';
  c.beginPath(); c.ellipse(-1, -6 - flap * 3, 6, 3.5, -0.4, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(3, -6 - flap * 3, 5, 3, -0.3, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  c.fillStyle = '#e8b23d'; // golden-brown body
  c.beginPath(); c.ellipse(0, 0, 8, 5.5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6b4a1e'; // two dark stripes
  c.fillRect(-4, -5, 3, 10);
  c.fillRect(1, -5, 3, 10);
  c.fillStyle = '#fff'; // eye glint
  c.fillRect(5, -3, 2, 2);
  c.fillStyle = '#6b4a1e'; // stinger at the rear
  c.beginPath();
  c.moveTo(-8, 0); c.lineTo(-12, -2); c.lineTo(-12, 2);
  c.closePath(); c.fill();
  c.restore();
}

register({
  kind: 'bee',
  w: 18, h: 14,
  hp: 1,
  stompable: true,
  bobR: 6, trackSpeed: 200,
  stingRangeX: 260, stingRangeY: 200,
  stingSpeed: 450, stingMax: 220, stingDur: 0.5, stingClamp: 80,
  stingCdMin: 3, stingCdMax: 4,
  returnSpeed: 320,
  update, draw,
});
