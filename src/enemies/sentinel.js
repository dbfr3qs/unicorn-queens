// Sentinel: a clockwork guardian of the citadel. Patrols its band at
// 25 px/s and turns to face the player when they close in (the shield
// turns with it). After every chime the shield rises for 1.0 s (a pure
// read of clock.t) — a front-facing arrow clangs off it. 0.3 s after the
// chime, if the player is within 140 px and the 4 s cooldown is up, it
// looses a cyan bolt from its chest. Stompable: a burst of brass shards.
import { fireFireball } from '../projectiles.js';
import { FX } from '../effects.js';
import { register } from './index.js';

export const E_W = 40, E_H = 44;
const SPEED = 25, FOCUS = 200, BOLT_RANGE = 140, BOLT_SPEED = 240,
      BOLT_CD = 4, BOLT_DELAY = 0.3;

function update(e, { p, lvl, dt, fx }) {
  if (e.boltCd === undefined) e.boltCd = (e.x % 40) / 10; // seeded: desyncs the sentinels
  if (e.sleeping) { e.shieldUp = false; return; } // asleep: inert until the arena beat wakes it
  e.boltCd = Math.max(0, e.boltCd - dt);
  const clock = lvl.clock;
  e.shieldUp = !!(clock && !clock.stopped && clock.t < 1.0); // up 1.0 s after each chime
  if (clock && !clock.stopped) { // the chest bolt: the clock.t 0 -> 0.3 crossing
    const prevT = e.lastT ?? clock.t;
    if (prevT < BOLT_DELAY && clock.t >= BOLT_DELAY && e.boltCd <= 0) {
      const cx = e.x + e.w / 2, cy = e.y + e.h - 28; // the chest
      const tx = p.x + p.w / 2, ty = p.y + p.h / 2;
      if (!p.dead && Math.hypot(tx - cx, ty - cy) < BOLT_RANGE) {
        const ang = Math.atan2(ty - cy, tx - cx);
        fireFireball(cx, cy, Math.cos(ang) * BOLT_SPEED, Math.sin(ang) * BOLT_SPEED, fx, true);
        e.boltCd = BOLT_CD;
      }
    }
    e.lastT = clock.t;
  }
  if (!p.dead && Math.abs((p.x + p.w / 2) - (e.x + e.w / 2)) < FOCUS) {
    e.dir = p.x > e.x ? 1 : -1; // the shield turns to face the player
  }
  e.x += e.dir * SPEED * dt;
  if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
  else if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  c.fillStyle = '#8a6a2f'; // the brass body
  c.fillRect(-14, -22, 28, 44);
  c.fillStyle = '#a8843e'; // the front plate
  c.fillRect(-10, -16, 20, 30);
  c.fillStyle = '#6e5424'; // the head
  c.fillRect(-8, -22, 16, 8);
  c.fillStyle = '#ff5533'; // the eye
  c.fillRect(2, -20, 4, 3);
  c.fillStyle = '#3a2a12'; // the chest window frame
  c.fillRect(-5, -4, 10, 10);
  c.fillStyle = '#ffd75e'; // the warm core
  c.fillRect(-3, -2, 6, 6);
  if (e.shieldUp) { // the raised shield: a brass plate in front, alpha 0.85
    c.globalAlpha = 0.85;
    c.fillStyle = '#c9a24a';
    c.fillRect(12, -15, 8, 30);
    c.fillStyle = '#e8c876';
    c.fillRect(18, -15, 2, 30);
    c.globalAlpha = 1;
  }
  c.restore();
}

register({
  kind: 'sentinel',
  w: E_W, h: E_H,
  hp: 2,
  stompable: true,
  deathSound: 'clank', deathFx: FX.gearBurst, // brass shards on death
  hitSound: 'clank',
  stompSound: 'gear', stompFx: FX.gearBurst, // a burst of brass shards
  arrowBlocked: (e, a) => e.shieldUp &&
    ((a.vx > 0 && e.dir > 0) || (a.vx < 0 && e.dir < 0)), // a front arrow into the shield
  update,
  draw,
});
