// Mage: level 2 boss. 5 hp, unstompable. idle -> windup -> fire state
// machine (one fireball in the air at a time, staggers on hit);
// levitates (eased floatY, clamped to the hall band), dodges incoming
// arrows, hovers proactively after shots, and leads its aim at moving
// players; owns the robe/hat/staff sprite and the hp pips (drawn in world
// space after restore, like before).
import { fireFireball, fireballs, FIREBALL_SPEED } from '../projectiles.js';
import { arrows } from '../arrows.js';
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { phaseEdge, pipMax } from './phase.js';
import { difficulty } from '../difficulty.js'; // bossCd stretches the idle between attacks
import { palette } from '../render/theme.js';

function onHit(e) {
  e.flash = this.flashT;
  e.state = 'stagger';
  e.t = this.staggerT;
}

const A_W = 14, A_H = 4; // arrow body size (kept in sync with the arrows.js hit test)

// Approaching: an arrow moving toward the mage's near side, its leading
// edge within look px of it, and not fully past the far side.
function approaching(e, a, look) {
  if (a.vx > 0) return a.x < e.x + e.w && e.x - (a.x + A_W) < look;
  if (a.vx < 0) return a.x + A_W > e.x && a.x - (e.x + e.w) < look;
  return false;
}

// Threat: an approaching arrow whose band (± threatMargin) crosses the
// mage's current body band.
function findThreat(e, k) {
  for (const a of arrows) {
    if (a.dead) continue;
    if (approaching(e, a, k.dodgeLook) &&
        a.y - k.threatMargin < e.y + e.h && a.y + A_H + k.threatMargin > e.y) return a;
  }
  return null;
}

// Would an approaching arrow hit the mage if it were on the ground?
function homeThreat(e, k) {
  for (const a of arrows) {
    if (a.dead) continue;
    if (approaching(e, a, k.dodgeLook) &&
        a.y - k.threatMargin < e.homeY + e.h && a.y + A_H + k.threatMargin > e.homeY) return true;
  }
  return false;
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
  // Foot sparks while floating (throttled; the pinned snapshot pose is
  // grounded, so this never fires there).
  e.sparkT = Math.max(0, (e.sparkT ?? 0) - dt);
  if (e.levitating && e.sparkT <= 0) {
    burst(e.x + e.w / 2, e.y + e.h - 2, FX.mageSpark);
    e.sparkT = 0.12;
  }
  // Proactive hover: hold the hover height for its duration; only when
  // the timer expires this frame do we settle back to the ground (a
  // dodge cancels the hover and owns the target). Transition-based, so
  // a floatY set for other reasons is never clobbered.
  const wasHovering = (e.hover ?? 0) > 0;
  e.hover = Math.max(0, (e.hover ?? 0) - dt);
  if (wasHovering && e.hover <= 0 && !e.dodging) e.floatY = e.homeY;
  // Arrow dodge: release the held dodge once its arrow has fully cleared
  // the mage (trailing edge past the far side - releasing earlier would
  // let the descending mage re-enter the arrow's band mid x-overlap). On
  // release, hold altitude while another approaching arrow still crosses
  // the grounded band (a 0.22s-cooldown stream must not catch the
  // descending mage); descend once the home band is clear. Then scan for
  // a new threat, gated by the dodge cooldown. Stagger returns above, so
  // a staggered mage never dodges.
  e.dodgeCool = Math.max(0, (e.dodgeCool ?? 0) - dt);
  if (e.dodging) { // off the ground because of a dodge
    const a = e.dodgeArrow;
    const gone = !a || a.dead || (a.vx > 0 ? a.x >= e.x + e.w : a.x + A_W <= e.x);
    if (gone && !homeThreat(e, this)) {
      e.dodging = false;
      e.dodgeArrow = null;
      e.floatY = e.homeY; // home band clear: settle to the ground
    } else if (gone) {
      e.dodgeArrow = null; // hold: a stream arrow is still crossing the home band
    }
  }
  if (e.dodgeCool <= 0) {
    const threat = findThreat(e, this);
    if (threat) {
      const dh = this.dodgeHeight;
      const upRoom = e.y - top, downRoom = bottom - e.y;
      let side;
      if (upRoom >= dh && downRoom >= dh) side = e.lastDodge === 'up' ? 'down' : 'up'; // alternate
      else if (upRoom >= dh) side = 'up';
      else if (downRoom >= dh) side = 'down';
      else side = upRoom >= downRoom ? 'up' : 'down'; // both cramped: take the room
      e.lastDodge = side;
      e.floatY = side === 'up' ? e.y - dh : e.y + dh; // clamped by the float
      e.dodging = true;
      e.dodgeArrow = threat;
      e.hover = 0; // the dodge owns floatY from here
      e.dodgeCool = this.dodgeCooldown;
      fx.play('hop'); // levitation whoosh
    }
  }
  if (e.state === 'idle') {
    if (e.t > 0) return;
    const inRange = !p.dead && Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < this.aggroRange;
    if (inRange && fireballs.length === 0) { e.state = 'windup'; e.t = this.windupT; }
    else e.t = 0.4; // wait: player out of range, or a fireball in flight
    return;
  }
  // windup done: fire from the staff orb at the player's predicted
  // position (lead by the flight time), at any angle
  if (e.t > 0) return;
  const ox = e.x + e.w / 2 + e.dir * 15.5, oy = e.y + e.h / 2 - 19.5; // orb center
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const tFlight = Math.hypot(cx - ox, cy - oy) / FIREBALL_SPEED || 1; // to the player now
  const tx = Math.max(0, Math.min(lvl.width, cx + p.vx * tFlight)); // lead the player
  const dx = tx - ox, dy = cy - oy;
  const d = Math.hypot(dx, dy) || 1; // player inside the orb: arbitrary direction
  fireFireball(ox - 7, oy - 7, dx / d * FIREBALL_SPEED, dy / d * FIREBALL_SPEED, fx);
  e.state = 'idle';
  e.t = this.nextIdle();
  // Proactive hover: leave the ground after a shot so the player can't
  // camp (more often at low hp); a dodging mage keeps the dodge target.
  if (!e.dodging && Math.random() < (e.hp <= phaseEdge(e, 2, this.hp) ? this.hoverLowHpChance : this.hoverChance)) {
    e.floatY = top + Math.random() * (bottom - top);
    e.hover = this.hoverMin + Math.random() * (this.hoverMax - this.hoverMin);
    fx.play('hop'); // levitation whoosh, same as dodges
  }
}

function nextIdle() { return (this.idleMin + Math.random() * (this.idleMax - this.idleMin)) * difficulty().bossCd; }

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
    const n = pipMax(e, 5);
    for (let i = 0; i < n; i++) {
      c.fillStyle = i < e.hp ? '#e33' : '#522';
      c.fillRect(e.x + e.w / 2 - n * 6 + 1 + i * 12, e.y - 14, 10, 4);
    }
  }
}

register({
  kind: 'mage',
  w: 42, h: 54,
  hp: 5, stompable: false,
  boss: true, isTell: e => e.state === 'windup', // difficulty: scaled hp, slowed wind-up
  idleMin: 1.2, idleMax: 1.9, windupT: 0.7, staggerT: 0.25, flashT: 0.15, aggroRange: 500,
  floatSpeed: 150,
  dodgeLook: 280, dodgeCooldown: 0.6, dodgeHeight: 64, threatMargin: 8,
  hoverChance: 0.35, hoverLowHpChance: 0.7, hoverMin: 0.8, hoverMax: 1.4,
  hitSound: 'bossHit', deathSound: 'boss', deathFx: FX.mageDeath,
  onHit,
  update,
  nextIdle,
  draw,
});
