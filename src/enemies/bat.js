// Bat: a small dark flyer. Bobs at its roost, swoops at the player in a
// sine curve when they get close, then returns to roost. Stompable (bounce
// + death puff) and arrow-killable, so nothing before the dragon depends
// on the bow. 1 hp.
import { register } from './index.js';

function update(e, { p, dt, fx }) {
  if (e.homeX === undefined) {
    e.homeX = e.x; e.homeY = e.y;
    e.phase = e.x * 0.13; // seeded wing-flap phase
    e.state = 'hover'; e.swoopT = 0; e.tx = 0; e.ty = 0;
    e.swoopCd = ((e.homeX * 0.37) % 1) * (this.swoopCdMax - this.swoopCdMin);
  }
  e.phase += dt * 3;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  if (e.state === 'hover') {
    const bob = Math.sin(e.phase) * this.bobAmp;
    e.dir = pcx >= cx ? 1 : -1;
    // ease back onto the (bobbing) home point
    const dx = (e.homeX + e.w / 2) - cx, dy = (e.homeY + e.h / 2 + bob) - cy;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) { const m = Math.min(this.returnSpeed * dt, d); e.x += dx / d * m; e.y += dy / d * m; }
    e.swoopCd -= dt;
    // aggro: close horizontally AND vertically (280 covers a ground player
    // below a roost at y~250-280 — bats must threaten ground-only runs)
    const aggro = !p.dead && Math.abs(pcx - cx) < this.aggroRange && Math.abs(pcy - cy) < this.aggroDy;
    if (aggro && e.swoopCd <= 0) {
      e.state = 'swoop'; e.swoopT = 0;
      e.tx = pcx; e.ty = pcy; // target captured at swoop start
      e.swoopCd = this.swoopCdMin + ((e.homeX * 0.37) % 1) * (this.swoopCdMax - this.swoopCdMin);
      fx.play('flap');
    }
  } else if (e.state === 'swoop') {
    e.swoopT += dt;
    const dx = e.tx - cx, dy = e.ty - cy;
    const d = Math.hypot(dx, dy);
    e.dir = dx >= 0 ? 1 : -1;
    if (d > 1) { const m = Math.min(this.swoopSpeed * dt, d); e.x += dx / d * m; e.y += dy / d * m; }
    e.y += Math.sin(e.swoopT * this.swoopFreq) * this.swoopWobble * dt; // the sine of the swoop
    if (e.swoopT >= this.swoopDur || d < 12) e.state = 'return';
  } else { // return to roost
    const dx = (e.homeX + e.w / 2) - cx, dy = (e.homeY + e.h / 2) - cy;
    const d = Math.hypot(dx, dy);
    e.dir = dx >= 0 ? 1 : -1;
    if (d > 1) { const m = Math.min(this.returnSpeed * dt, d); e.x += dx / d * m; e.y += dy / d * m; }
    if (d <= 2) e.state = 'hover';
  }
  e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x)); // stay in its band
  e.y = Math.max(20, e.y); // never above the hall ceiling line
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const flap = Math.sin(e.phase * 6); // wing-beat
  c.fillStyle = '#3a3550'; // wings: two pairs, flapping
  c.fillRect(-13, -9 - flap * 5, 11, 5);
  c.fillRect(2, -9 - flap * 5, 11, 5);
  c.fillRect(-12, -1 + flap * 4, 10, 4);
  c.fillRect(2, -1 + flap * 4, 10, 4);
  c.fillStyle = '#4a4468'; // body
  c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#191428'; // ears
  c.fillRect(-5, -11, 3, 4);
  c.fillRect(2, -11, 3, 4);
  c.fillStyle = '#ff6a4a'; // eye glint
  c.fillRect(3, -3, 2, 2);
  c.restore();
}

register({
  kind: 'bat',
  w: 24, h: 18,
  hp: 1,
  stompable: true,
  bobAmp: 6, returnSpeed: 120,
  swoopSpeed: 180, swoopDur: 1.4, swoopFreq: 6, swoopWobble: 80,
  aggroRange: 350, aggroDy: 280,
  swoopCdMin: 2.5, swoopCdMax: 4,
  update, draw,
});
