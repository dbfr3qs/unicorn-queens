// Mage: level 2 boss. 5 hp, unstompable. idle -> windup -> fire state
// machine (one fireball in the air at a time, staggers on hit);
// levitates (eased floatY, clamped to the hall band); owns the
// robe/hat/staff sprite and the hp pips (drawn in world space after
// restore, like before).
import { fireFireball, fireballs, FIREBALL_SPEED } from '../projectiles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function onHit(e) {
  e.flash = this.flashT;
  e.state = 'stagger';
  e.t = this.staggerT;
}

function update(e, { p, lvl, dt, fx }) {
  // Boss duel: idle -> windup (staff glows) -> fire at the player's
  // center from the staff orb, at any angle. Arrow hits stagger the
  // cycle. One fireball in the air at a time; the boss sleeps until the
  // player is in range.
  if (e.state === undefined) { e.state = 'idle'; e.t = 2; e.flash = 0; }
  e.flash = Math.max(0, e.flash - dt);
  e.dir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1; // face the player
  e.t -= dt;
  if (e.state === 'stagger') {
    if (e.t <= 0) { e.state = 'idle'; e.t = this.nextIdle(); }
    return; // frozen while staggering
  }
  // Levitation: eased vertical motion toward floatY (ghost pattern - the
  // mage floats, it never falls), clamped to the hall band; x stays in
  // the arena (minX..maxX from the roster spec).
  if (e.homeY === undefined) e.homeY = e.y; // grounded height
  const top = Math.max(150, lvl.groundY - 400), bottom = lvl.groundY - e.h;
  const ty = Math.max(top, Math.min(bottom, e.floatY ?? e.homeY));
  const dyv = ty - e.y;
  if (dyv !== 0) e.y += Math.sign(dyv) * Math.min(this.floatSpeed * dt, Math.abs(dyv));
  e.y = Math.max(top, Math.min(bottom, e.y));
  e.x = Math.max(e.minX, Math.min(e.maxX, e.x));
  e.levitating = e.y < e.homeY - 1;
  if (e.state === 'idle') {
    if (e.t > 0) return;
    const inRange = !p.dead && Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < this.aggroRange;
    if (inRange && fireballs.length === 0) { e.state = 'windup'; e.t = this.windupT; }
    else e.t = 0.4; // wait: player out of range, or a fireball in flight
    return;
  }
  // windup done: fire from the staff orb at the player's center, any angle
  if (e.t > 0) return;
  const ox = e.x + e.w / 2 + e.dir * 15.5, oy = e.y + e.h / 2 - 19.5; // orb center
  const dx = (p.x + p.w / 2) - ox, dy = (p.y + p.h / 2) - oy;
  const d = Math.hypot(dx, dy) || 1; // player inside the orb: arbitrary direction
  fireFireball(ox - 7, oy - 7, dx / d * FIREBALL_SPEED, dy / d * FIREBALL_SPEED, fx);
  e.state = 'idle';
  e.t = this.nextIdle();
}

function nextIdle() { return this.idleMin + Math.random() * (this.idleMax - this.idleMin); }

function draw(c, e) {
  if (e.levitating) { // soft floor shadow while floating
    const lift = e.homeY - e.y;
    const s = Math.max(0.35, 1 - lift / 500); // shrink and fade with height
    c.save();
    c.globalAlpha = 0.35 * s;
    c.fillStyle = '#000';
    c.beginPath();
    c.ellipse(e.x + e.w / 2, e.homeY + e.h - 5, 15 * s, 4 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const windup = e.state === 'windup';
  c.fillStyle = '#3d2b6b'; // robe
  c.fillRect(-16, -10, 32, 37);
  c.fillStyle = '#58418f'; // robe front
  c.fillRect(-16, -10, 12, 37);
  c.fillStyle = '#2a1d4d'; // hat
  c.fillRect(-12, -27, 24, 9);
  c.fillRect(-6, -19, 16, 4);
  c.fillStyle = palette.white; // face
  c.fillRect(-2, -16, 10, 8);
  c.fillStyle = '#e33'; // eye
  c.fillRect(4, -14, 3, 3);
  c.fillStyle = '#8a5f22'; // staff
  c.fillRect(14, -16, 3, 40);
  c.fillStyle = windup ? '#ff8c42' : '#6fe3e1'; // staff orb glows in the windup
  c.fillRect(11, -24, 9, 9);
  if (e.flash > 0) {
    c.globalAlpha = 0.7; // hit flash
    c.fillStyle = palette.white;
    c.fillRect(-17, -28, 34, 56);
  }
  c.restore();
  if (!e.dead) { // hp pips, world space above the boss
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i < e.hp ? '#e33' : '#522';
      c.fillRect(e.x + e.w / 2 - 29 + i * 12, e.y - 14, 10, 4);
    }
  }
}

register({
  kind: 'mage',
  w: 42, h: 54,
  hp: 5, stompable: false,
  idleMin: 1.6, idleMax: 2.4, windupT: 0.7, staggerT: 0.25, flashT: 0.15, aggroRange: 500,
  floatSpeed: 150,
  hitSound: 'bossHit', deathSound: 'boss', deathFx: FX.mageDeath,
  onHit,
  update,
  nextIdle,
  draw,
});
