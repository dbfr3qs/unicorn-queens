// The Warden — the citadel's keeper (level 8 boss, 5300, band 5100–5800).
// 60×64, 16 hp, arrow-only (stomp bounces off the brass — the dragon rule).
//
// A machine: every attack is keyed to the Great Clock's tick, so the clock
// IS the telegraph.
//   P1 (16–9 hp) — attacks begin ON the chime:
//     gear slam 45 / chime bolt 55 (seeded), idle 1.0–1.5 s, advances 40 px.
//   P2 (≤8 hp) — attacks begin on the OFF-beat (t = period/4 and 3·period/4),
//     idle 0.6–1.0 s, advances 60 px:
//     gear slam 30 / chime bolt 30 / pendulum sweep 40 (seeded).
//   Reset window — the 0.6 s after each chime (clock.t < 0.6): the chest core
//     glows cyan; arrows are worth 3 (stars still 3, bolts still 1).
//   Death is a REST, not a kill: onZero stops the clock (no sound, no burst).
//     updateClock ticks dyingT 3.3 → 0, the toll sounds at the 1.0 crossing,
//     the statue bows as the dimming crosses 1.8 (world pass), and the pearl
//     shows when dyingT === 0.
//
// Attacks (plan M6):
//   gear slam    — slamWind 0.5 s ('clank') → slam 0.25 s: thud + shake +
//                  180 px/s shockwaves, ttl 2.5 (deviation 6: the arena-edge
//                  culling is free from the ttl — no extra logic).
//   chime bolt   — the pick sets pendingBolt; at the t = period − 0.8 crossing
//                  → charge 0.8 s (the arm extends, the core glow builds) →
//                  fires ON the next chime: a 3-bolt cyan fan ±15° @ 240 px/s
//                  aimed at the player (deviation 8).
//   sweep (P2)   — sweepTele 0.8 s (a 120 px blade extends; the 240 px floor
//                  band in the player's direction pulses, deviation 9) →
//                  sweep 0.6 s (the 120×64 blade rect travels 240 px @
//                  400 px/s, 1 dmg, one hit) → retract 0.5 s.
//
// House rules: stagger on hit (0.3 s + flash) — it cancels a charge in
// progress (the bolt is lost). No L7 onHit quirk: P2 is a glow cue, not a
// state replacement. The 16 pips above the head are his winding — they empty
// as he unwinds (two rows of 8, spiderboss pattern).

import { register } from './index.js';
import { fireFireball, fireShockwaves } from '../projectiles.js';
import { hurtPlayer } from '../player.js';
import { shake } from '../camera.js';

export const P2_AT = 8;
const RESET_WINDOW = 0.6;
const BOLT_FAN = [-15, 0, 15]; // degrees
const BOLT_SPEED = 240;
const SWEEP_TRAVEL = 240;
const SWEEP_SPEED = 400;
const SLAM_WIND = 0.5;
const SLAM_POSE = 0.25;
const CHARGE_TIME = 0.8;
const CHARGE_LEAD = 0.8; // charge begins 0.8 s before the chime
const SWEEP_TELE = 0.8;
const SWEEP_TIME = 0.6;
const RETRACT = 0.5;
const ADVANCE_P1 = 40;
const ADVANCE_P2 = 60;
const SLAM_TTL = 2.5; // deviation 6

// A small per-Warden LCG seeded from the spawn x (deviation 19, the house
// deterministic-seed pattern): the attack picks and idle lengths are
// reproducible per spawn, so the fight is testable.
export function wardenRand(e) {
  if (e.seed === undefined) e.seed = (e.x % 997) * 1013 + 7;
  e.seed = (Math.imul(e.seed, 1103515245) + 12345) & 0x7fffffff;
  return e.seed / 0x7fffffff;
}

// The pips are his winding: a pure function of hp (16 at spawn).
export function pipCount(e) {
  return Math.max(0, Math.min(16, e.hp));
}

function nextIdle(e) {
  return e.hp <= P2_AT ? 0.6 + wardenRand(e) * 0.4 : 1.0 + wardenRand(e) * 0.5;
}

function startSlam(e, fx) {
  e.state = 'slamWind';
  e.t = SLAM_WIND;
  fx.play('clank');
}

function startSweep(e, p, fx) {
  e.state = 'sweepTele';
  e.t = SWEEP_TELE;
  e.sweepDir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1;
  // The 240 px floor band in the player's direction (deviation 9): the
  // telegraph draws the sweep's reach, not the whole arena.
  e.sweepBand = e.sweepDir === 1
    ? { x: e.x + e.w, w: SWEEP_TRAVEL }
    : { x: e.x - SWEEP_TRAVEL, w: SWEEP_TRAVEL };
  e.sweepHit = false;
}

function pickAttack(e, p, fx) {
  const r = wardenRand(e);
  if (e.hp <= P2_AT) { // P2: slam 30 / bolt 30 / sweep 40 (plan M6)
    if (r < 0.3) return startSlam(e, fx);
    if (r < 0.6) { e.pendingBolt = true; return; }
    return startSweep(e, p, fx);
  }
  // P1: slam 45 / bolt 55
  if (r < 0.45) return startSlam(e, fx);
  e.pendingBolt = true; // the chime bolt: it charges at period − 0.8
}

function fireChimeFan(e, p, fx) {
  const ox = e.x + e.w / 2;
  const oy = e.y + 20; // the chest core
  const ang = Math.atan2(p.y + p.h / 2 - oy, p.x + p.w / 2 - ox);
  for (const off of BOLT_FAN) { // deviation 8: cyan, like the sentinel bolts
    const a = ang + (off * Math.PI) / 180;
    fireFireball(ox - 7, oy - 7, Math.cos(a) * BOLT_SPEED, Math.sin(a) * BOLT_SPEED, fx, true);
  }
}

function update(e, { p, lvl, cam, dt, fx }) {
  if (e.state === undefined) {
    e.state = 'idle';
    e.t = 1.5; // first breath after the arena beat wakes him
    e.lastT = lvl.clock ? lvl.clock.t : 0;
    e.phase = 0;
    e.flash = 0;
    e.pendingBolt = false;
    e.inWindow = false;
  }
  e.phase = (e.phase ?? 0) + dt; // drives the core pulses (sleeping too)
  if (e.sleeping) return; // standing at attention; the arena beat wakes him
  e.flash = Math.max(0, (e.flash ?? 0) - dt);
  e.y = lvl.groundY - e.h; // grounded boss
  e.dir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1;

  const c = lvl.clock;
  const prevT = e.lastT ?? c.t;
  e.lastT = c.t;
  const wrapped = !c.stopped && prevT > c.t; // the chime
  e.inWindow = !c.stopped && c.t < RESET_WINDOW;

  // Stagger (house rule): 0.3 s pause + flash; cancels a pending/running
  // charge — the bolt is lost.
  if (e.state === 'stagger') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'idle'; e.t = nextIdle(e); }
    return;
  }

  if (e.state === 'slamWind') {
    e.t -= dt;
    if (e.t <= 0) {
      e.state = 'slam';
      e.t = SLAM_POSE;
      fx.play('thud');
      shake(cam, 4, 0.2);
      fireShockwaves(e.x + e.w / 2, lvl.groundY, fx, SLAM_TTL); // plays 'rumble'
    }
    return;
  }
  if (e.state === 'slam') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'idle'; e.t = nextIdle(e); }
    return;
  }

  // Charge: the arm is extended, the core glow builds. The fan fires ON the
  // next chime — the tick is the cue.
  if (e.state === 'charge') {
    e.t -= dt;
    if (wrapped) {
      fireChimeFan(e, p, fx);
      e.state = 'idle';
      e.t = nextIdle(e);
      e.pendingBolt = false;
    }
    return;
  }

  if (e.state === 'sweepTele') {
    e.t -= dt;
    if (e.t <= 0) {
      e.state = 'sweep';
      e.t = SWEEP_TIME;
      e.sweepX0 = e.sweepDir === 1 ? e.x + e.w : e.x - 120; // blade left edge
    }
    return;
  }
  if (e.state === 'sweep') {
    e.t -= dt;
    const elapsed = SWEEP_TIME - Math.max(0, e.t);
    e.sweepX = e.sweepX0 + e.sweepDir * Math.min(SWEEP_TRAVEL, elapsed * SWEEP_SPEED);
    // The 120×64 blade rect: 1 dmg, one hit per swing (deviation 9).
    const bx = e.sweepX, by = lvl.groundY - 64;
    if (!e.sweepHit && !p.dead &&
        p.x < bx + 120 && p.x + p.w > bx && p.y < by + 64 && p.y + p.h > by) {
      if (p.invuln <= 0) {
        e.sweepHit = true;
        hurtPlayer(p, cam, fx);
      }
    }
    if (e.t <= 0) { e.state = 'retract'; e.t = RETRACT; }
    return;
  }
  if (e.state === 'retract') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'idle'; e.t = nextIdle(e); }
    return;
  }

  // ---- idle: the clock is the metronome ----
  // The chime: the fan fires (if charging); otherwise the advance + the P1
  // attack pick. P2 does NOT attack on the chime — only the advance.
  if (wrapped && e.state === 'idle') {
    if (e.pendingBolt) {
      fireChimeFan(e, p, fx);
      e.state = 'idle';
      e.t = nextIdle(e);
      e.pendingBolt = false;
    } else {
      const step = e.hp <= P2_AT ? ADVANCE_P2 : ADVANCE_P1;
      const dx = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1;
      e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x + dx * step));
      e.dir = dx;
      if (e.hp > P2_AT) pickAttack(e, p, fx); // P1: attack on the beat
    }
  }
  // The off-beat (P2 only): t = period/4 and t = 3·period/4 crossings.
  if (e.hp <= P2_AT && e.state === 'idle' && !c.stopped &&
      ((prevT < c.period / 4 && c.t >= c.period / 4) ||
       (prevT < 3 * c.period / 4 && c.t >= 3 * c.period / 4))) {
    if (e.t <= 0) pickAttack(e, p, fx);
  }
  // The chime-bolt charge begins 0.8 s before the next tick (both phases).
  if (e.state === 'idle' && e.pendingBolt && !c.stopped &&
      prevT < c.period - CHARGE_LEAD && c.t >= c.period - CHARGE_LEAD) {
    e.state = 'charge';
    e.t = CHARGE_TIME;
  }

  if (e.state === 'idle') e.t -= dt;
}

function draw(c, e) {
  const ph = e.phase ?? 0;
  const sleeping = !!e.sleeping;
  const p2 = e.hp <= P2_AT;
  const bob = sleeping ? Math.sin(ph * Math.PI) * 1.5 : 0; // the 2 s breath

  // The sweep band (telegraph) + blade: world space, floor level.
  const gy = e.y + e.h;
  if (e.state === 'sweepTele' && e.sweepBand) {
    const pulse = 0.35 + 0.25 * Math.sin(ph * 12);
    c.globalAlpha = pulse;
    c.fillStyle = '#c9a24a';
    c.fillRect(e.sweepBand.x, gy - 8, e.sweepBand.w, 8);
    c.globalAlpha = 1;
    // the blade, extended at the near edge of the band
    const bx = e.sweepDir === 1 ? e.sweepBand.x : e.sweepBand.x + e.sweepBand.w - 120;
    c.fillStyle = '#d8b86a';
    c.fillRect(bx, gy - 14, 120, 14);
  }
  if (e.state === 'sweep' && e.sweepX !== undefined) {
    // the swept arc (the full 120×64 hitbox, faint) + the bright blade
    c.globalAlpha = 0.25;
    c.fillStyle = '#c9a24a';
    c.fillRect(e.sweepX, gy - 64, 120, 64);
    c.globalAlpha = 1;
    c.fillStyle = '#d8b86a';
    c.fillRect(e.sweepX, gy - 14, 120, 14);
  }

  c.save();
  c.translate(e.x + e.w / 2, gy);
  c.scale(e.dir ?? 1, 1);
  // legs
  c.fillStyle = '#5e4a1e';
  c.fillRect(-22, -14, 16, 14);
  c.fillRect(6, -14, 16, 14);
  // torso: a tall brass frame
  c.fillStyle = '#8a6a2e';
  c.fillRect(-22, -50 + bob, 44, 38);
  c.fillStyle = '#a8843e';
  c.fillRect(-16, -46 + bob, 32, 30);
  // shoulders + head
  c.fillStyle = '#6e5424';
  c.fillRect(-22, -56 + bob, 12, 8);
  c.fillRect(10, -56 + bob, 12, 8);
  c.fillRect(-9, -64 + bob, 18, 10);
  c.fillStyle = '#ffd75e';
  c.fillRect(2, -61 + bob, 4, 3);
  // the chest core: a 14×14 window. Cyan + 0.3 s pulse in the reset window;
  // dim amber otherwise (brighter in P2); a slow 2 s pulse while sleeping.
  c.fillStyle = '#3a3060';
  c.fillRect(-7, -42 + bob, 14, 14);
  if (e.inWindow && !e.dead) {
    c.globalAlpha = 0.75 + 0.25 * Math.sin(ph * (2 * Math.PI) / 0.3);
    c.fillStyle = '#7ec8ff';
    c.fillRect(-7, -42 + bob, 14, 14);
    c.globalAlpha = 1;
  } else {
    c.globalAlpha = sleeping
      ? 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(ph * Math.PI))
      : (p2 ? 0.8 : 0.45);
    c.fillStyle = p2 ? '#e8b86d' : '#c98f3d';
    c.fillRect(-7, -42 + bob, 14, 14);
    c.globalAlpha = 1;
  }
  // arms
  c.fillStyle = '#6e5424';
  if (e.state === 'slamWind') {
    c.fillRect(8, -70, 10, 22); // the arm raised
  } else if (e.state === 'sweepTele' || e.state === 'sweep' || e.state === 'retract') {
    c.fillRect(8, -46 + bob, 12, 8); // the arm extended (the blade is drawn above)
  } else {
    c.fillRect(16, -44 + bob, 8, 24);
    c.fillRect(-24, -44 + bob, 8, 24);
  }
  if (e.state === 'charge') { // the extended arm, the glow building
    c.fillRect(8, -46 + bob, 16, 8);
  }
  if ((e.flash ?? 0) > 0) {
    c.globalAlpha = 0.7;
    c.fillStyle = '#fff';
    c.fillRect(-30, -64, 60, 64);
    c.globalAlpha = 1;
  }
  c.restore();

  // The 16 pips: two rows of 8, his winding (spiderboss pattern).
  if (!e.dead) {
    const n = pipCount(e);
    for (let i = 0; i < 16; i++) {
      const row = i < 8 ? 0 : 1, col = i % 8;
      c.fillStyle = i < n ? '#ffd75e' : '#5e4a1e';
      c.fillRect(e.x + e.w / 2 - 48 + col * 12, e.y - 20 + row * 7, 10, 4);
    }
  }
}

register({
  kind: 'warden',
  w: 60, h: 64,
  hp: 16,
  stompable: false, // arrow-only (the dragon rule)
  hitSound: 'bossHit', // standard boss-hit path (spiderboss's name)
  // The reset window: arrows are worth 3 while the core is cyan (stars stay
  // 3 — never 6; bolts are handled in projectiles with a fixed mult of 1).
  hitValue: (e, star) => (star ? 3 : (e.inWindow ? 3 : 1)),
  onHit: e => { // the house stagger rule; cancels a charge (the bolt is lost)
    e.flash = 0.15;
    e.state = 'stagger';
    e.t = 0.3;
    e.pendingBolt = false;
  },
  onZero: (e, fx, cam, lvl) => {
    // A rest, not a kill: no sound, no burst, no shake. The clock stops NOW
    // (mid-tick). dyingT 3.3 → 0 is ticked by updateClock (the toll at the
    // 1.0 crossing); the world pass reads the statue; the pearl's showWhen
    // waits for dyingT === 0. Idempotent.
    e.dead = true;
    e.dyingT = 3.3;
    e.rested = false;
    e.tolled = false;
    if (lvl.clock) lvl.clock.stopped = true;
  },
  update,
  draw,
});
