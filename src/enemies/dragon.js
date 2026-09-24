// Dragon: level 4 boss. 14 hp, unstompable, arrow-only. Hovers in the
// y 140-260 band (unreachable by ground arrows — that is the boss's
// whole identity), slow drift toward the player, aimed fireballs (mage
// aim + lead; one in air phase 1, two phase 2), the breath perch (the
// main ground window: descend, inhale, fixed-angle fire cone, recover),
// the low dive (the secondary ground window), stagger on hit, 14 hp
// pips in two rows. Phase 2 below 7 hp: faster tempo, double fireballs,
// faster dives, longer cone.
import { fireFireball, fireballs, fireCone, FIREBALL_SPEED } from '../projectiles.js';
import { shake } from '../camera.js';
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { phaseEdge, pipMax } from './phase.js';
import { difficulty } from '../difficulty.js'; // bossCd stretches the idle between attacks

function onHit(e) {
  e.flash = this.flashT;
  e.state = 'stagger';
  e.t = this.staggerT;
}

function onDeath(e, fx, cam) {
  shake(cam, 9, 0.6);
  burst(e.x + e.w / 2, e.y + e.h / 2, FX.dragonDeath);
}

function nextIdle(e) {
  // phase 2 runs on a faster tempo
  return (e.hp <= phaseEdge(e, this.phase2At, this.hp) ? 0.8 + Math.random() * 0.4 : 1.0 + Math.random() * 0.5) * difficulty().bossCd;
}

// Move e.y toward target at speed px/s; true when it arrives.
function easeY(e, target, speed, dt) {
  const d = target - e.y;
  if (Math.abs(d) <= speed * dt) { e.y = target; return true; }
  e.y += Math.sign(d) * speed * dt;
  return false;
}

// Attack pick: phase 1 perch 40 / fireball 35 / dive 25;
// phase 2 perch 30 / fireball (double) 30 / dive 40.
function pickAttack(e, p, lvl, fx) {
  const p2 = e.hp <= phaseEdge(e, this.phase2At, this.hp);
  const inAir = fireballs.filter(f => !f.reflected).length;
  const maxAir = p2 ? 2 : 1;
  const r = Math.random();
  const perch = p2 ? 0.3 : 0.4;
  const ball = p2 ? 0.3 : 0.35;
  if (r < perch) {
    e.state = 'perch'; e.perch = 'descend'; e.t = this.perchDescendT;
    return;
  }
  if (r < perch + ball) {
    if (inAir < maxAir) { e.state = 'windup'; e.t = this.windupT; }
    else { e.t = 0.4; e.floatY = this.hoverMin + Math.random() * (this.hoverMax - this.hoverMin); }
    return;
  }
  // dive: a low sweep at the player's position
  e.state = 'dive'; e.dive = 'descend'; e.t = this.diveDescendT;
  e.diveDir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1;
  fx.play('whoosh');
}

// Breath perch: the main ground window. Descend, inhale (the tell), a
// fixed-angle fire cone at the player's position, recover on the ground,
// then fly back up. ~2 s of ground-arrow exposure per cycle.
function updatePerch(e, p, lvl, dt, fx) {
  const perchY = lvl.groundY - this.h - 6;
  if (e.perch === 'descend') {
    if (easeY(e, perchY, this.perchSpeed, dt)) {
      e.perch = 'inhale';
      e.t = e.hp <= phaseEdge(e, this.phase2At, this.hp) ? this.inhaleT2 : this.inhaleT;
      fx.play('roar');
    }
    return;
  }
  if (e.perch === 'ascend') {
    if (easeY(e, e.floatY, this.perchSpeed, dt)) {
      e.state = 'idle';
      e.t = nextIdle.call(this, e);
    }
    return;
  }
  e.t -= dt;
  if (e.t > 0) return; // inhale | breath | recover
  if (e.perch === 'inhale') {
    // fixed angle at the player's position NOW: you sidestep it, you
    // don't outlast it
    const ox = e.x + this.w / 2 + e.dir * 30, oy = e.y + this.h / 2 - 4; // mouth
    const angle = Math.atan2(p.y + p.h / 2 - oy, p.x + p.w / 2 - ox);
    const ttl = e.hp <= phaseEdge(e, this.phase2At, this.hp) ? this.breathT2 : this.breathT;
    fireCone(ox, oy, angle, fx, ttl);
    e.perch = 'breath';
    e.t = ttl;
  } else if (e.perch === 'breath') {
    e.perch = 'recover';
    e.t = this.recoverT;
  } else { // recover
    e.floatY = this.hoverMin + Math.random() * (this.hoverMax - this.hoverMin);
    e.perch = 'ascend';
  }
}

// Dive: swoop from hover to just above the ground (body bottom 11 px off
// the floor, inside the ground-arrow band), sweep horizontally at the
// player's side, rise back to the band. The low pass is the secondary
// ground window; the arc is a contact threat on the way down.
function updateDive(e, p, lvl, dt) {
  const diveY = lvl.groundY - 55;
  const speed = this.diveSpeed * (e.hp <= phaseEdge(e, this.phase2At, this.hp) ? 1.25 : 1);
  if (e.dive === 'descend') {
    if (easeY(e, diveY, speed, dt)) { e.dive = 'low'; e.t = this.diveLowT; }
    return;
  }
  if (e.dive === 'ascend') {
    if (easeY(e, e.floatY, speed, dt)) {
      e.state = 'idle';
      e.t = nextIdle.call(this, e);
    }
    return;
  }
  e.t -= dt;
  e.x = Math.max(e.minX, Math.min(e.maxX, e.x + e.diveDir * speed * dt));
  if (e.t <= 0 || e.x <= e.minX || e.x >= e.maxX) {
    e.floatY = this.hoverMin + Math.random() * (this.hoverMax - this.hoverMin);
    e.dive = 'ascend';
  }
}

function update(e, { p, lvl, dt, fx }) {
  if (e.state === undefined) {
    e.state = 'idle';
    e.t = 1.5; // first breath before attacking
    e.flash = 0;
    e.phase = e.x * 0.17; // seeded wing-flap phase
    e.floatY = e.y;
  }
  e.flash = Math.max(0, e.flash - dt);
  e.phase += dt * 4; // majestic wing-beat
  e.dir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1; // face the player
  if (e.state === 'stagger') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'idle'; e.t = nextIdle.call(this, e); }
    return; // frozen, wings crumpled
  }
  if (e.state === 'perch') { updatePerch.call(this, e, p, lvl, dt, fx); return; }
  if (e.state === 'dive') { updateDive.call(this, e, p, lvl, dt); return; }
  // Hover: eased vertical motion toward floatY, clamped to the band; the
  // band tops out at 260 + h = 304, far above the ground arrow band
  // (406-536) — ground players can only hit the K5 descent windows.
  const top = this.hoverMin, bottom = this.hoverMax;
  const ty = Math.max(top, Math.min(bottom, e.floatY ?? e.y));
  const dyv = ty - e.y;
  if (dyv !== 0) e.y += Math.sign(dyv) * Math.min(this.floatSpeed * dt, Math.abs(dyv));
  e.y = Math.max(top, Math.min(bottom, e.y));
  e.x = Math.max(e.minX, Math.min(e.maxX, e.x));
  e.t -= dt;
  if (e.state === 'idle') {
    if (e.t > 0) {
      // slow drift toward the player while idling (keeps the hover lively)
      const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
      if (Math.abs(dx) > 10) e.x += Math.sign(dx) * Math.min(this.driftSpeed * dt, Math.abs(dx));
      return;
    }
    pickAttack.call(this, e, p, lvl, fx);
    return;
  }
  // windup: a beat with the wings spread (the tell), then the shot
  if (e.t > 0) return;
  const ox = e.x + e.w / 2 + e.dir * 30, oy = e.y + e.h / 2 - 4; // mouth
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const tFlight = Math.hypot(cx - ox, cy - oy) / FIREBALL_SPEED || 1;
  const tx = Math.max(0, Math.min(lvl.width, cx + p.vx * tFlight)); // lead the player
  const dx = tx - ox, dy = cy - oy;
  const d = Math.hypot(dx, dy) || 1;
  fireFireball(ox - 7, oy - 7, dx / d * FIREBALL_SPEED, dy / d * FIREBALL_SPEED, fx);
  e.state = 'idle';
  e.t = nextIdle.call(this, e);
  e.floatY = top + Math.random() * (bottom - top); // re-position after the shot
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const flap = Math.sin(e.phase);
  const staggered = e.state === 'stagger';
  const perched = e.state === 'perch';
  const diving = e.state === 'dive';
  c.fillStyle = '#2a5a38'; // wings: up and flapping; folded when perched,
  // spread flat on a dive, crumpled while staggered
  if (staggered) {
    c.fillRect(-18, -14, 14, 6);
    c.fillRect(4, -14, 14, 6);
  } else if (perched) {
    c.fillRect(-20, 10, 18, 6);
    c.fillRect(2, 10, 18, 6);
  } else if (diving) {
    c.fillRect(-34, -8, 20, 5);
    c.fillRect(14, -8, 20, 5);
  } else {
    c.fillRect(-20, -22 - flap * 8, 18, 6);
    c.fillRect(2, -22 - flap * 8, 18, 6);
    c.fillRect(-16, -14 - flap * 4, 12, 5); // membrane
    c.fillRect(4, -14 - flap * 4, 12, 5);
  }
  c.fillStyle = '#2a5a38'; // tail
  c.fillRect(-30, -2, 14, 6);
  c.fillRect(-36, -4, 8, 10); // tail fin
  c.fillStyle = '#3a7a4a'; // body
  c.beginPath(); c.ellipse(0, 0, 26, 16, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a9a6a'; // belly
  c.beginPath(); c.ellipse(2, 7, 18, 8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a7a4a'; // head + snout
  c.fillRect(14, -12, 18, 16);
  c.fillRect(28, -8, 10, 8);
  c.fillStyle = '#2a5a38'; // frill
  c.fillRect(10, -14, 8, 4);
  c.fillStyle = e.state === 'windup' ? '#ffd166' : '#fff'; // eye: glows in the windup
  c.fillRect(20, -8, 4, 4);
  c.fillStyle = '#12240f'; // nostril
  c.fillRect(34, -6, 2, 3);
  if (perched && (e.perch === 'inhale' || e.perch === 'breath')) {
    // the tell: a pulsing chest glow while it winds up the breath
    c.globalAlpha = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(e.phase * 3));
    c.fillStyle = '#ff8c42';
    c.beginPath(); c.ellipse(2, 4, 14, 10, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    if (e.perch === 'breath') { // open jaw while the cone runs
      c.fillStyle = '#ffd166';
      c.fillRect(28, -2, 12, 8);
    }
  }
  if (e.flash > 0) { // hit flash
    c.globalAlpha = 0.7;
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(0, 0, 28, 18, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
  if (!e.dead) { // hp pips: two rows of seven, world space above the dragon
    const n = pipMax(e, 14), per = Math.ceil(n / 2); // two rows
    for (let i = 0; i < n; i++) {
      const row = i < per ? 0 : 1, col = i % per;
      c.fillStyle = i < e.hp ? '#e33' : '#522';
      c.fillRect(e.x + e.w / 2 - per * 6 + col * 12, e.y - 24 + row * 7, 10, 4);
    }
  }
}

register({
  kind: 'dragon',
  w: 60, h: 44,
  hp: 14, stompable: false,
  boss: true, isTell: e => e.state === 'windup' || (e.state === 'perch' && e.perch === 'inhale'), // difficulty: scaled hp, slowed wind-ups
  windupT: 0.6, phase2At: 7,
  staggerT: 0.3, flashT: 0.15,
  aggroRange: 700,
  perchDescendT: 0.4, perchSpeed: 260,
  inhaleT: 0.5, inhaleT2: 0.4,
  breathT: 0.9, breathT2: 1.0,
  recoverT: 0.5,
  diveDescendT: 0.35, diveLowT: 0.7, diveSpeed: 400,
  hoverMin: 140, hoverMax: 260,
  floatSpeed: 120, driftSpeed: 40,
  hitSound: 'bossHit', deathSound: 'boss',
  onHit, onDeath,
  update, nextIdle, draw,
});
