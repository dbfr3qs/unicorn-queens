// Clockwork moth: a brass-and-silk flier that drifts in a Lissajous
// figure around its lamp anchor (the spawn x/y). When the player comes
// within 120 px and the 2.5 s cooldown is up, it darts at their position
// (0.4 s at 200 px/s), hovers where the dart ends (0.8 s), then resumes
// drifting from there (the Lissajous re-anchors at the dart's end point).
// Stompable: a spark. All amplitudes/phase/period are seeded from the
// spawn position, so a seeded run is reproducible.
import { FX } from '../effects.js';
import { register } from './index.js';

export const E_W = 20, E_H = 16;
const DART_RANGE = 120, DART_SPEED = 200, DART_TIME = 0.4,
      HOVER_TIME = 0.8, DART_CD = 2.5, TWO_PI = Math.PI * 2;

function update(e, { p, lvl, dt, fx }) {
  if (e.A === undefined) { // seed the Lissajous from the spawn (deterministic)
    e.ax = e.x; e.ay = e.y; e.t = 0;
    e.A = 40 + (e.x % 31);        // 40-70 px
    e.B = 18 + (e.x % 13);        // 18-30 px
    e.T = 4 + (e.x % 21) / 10;    // 4.0-6.0 s
    e.phi = (e.x % 63) / 10;      // 0-6.2 rad
    e.dartCd = (e.x % 25) / 10;   // 0-2.4 s seeded offset
    e.state = 'drift';
  }
  e.t += dt; // the drift/wing clock (always advances, so the wings keep beating)
  e.dartCd = Math.max(0, e.dartCd - dt);
  if (e.state === 'drift') {
    e.x = e.ax + e.A * Math.sin(TWO_PI * e.t / e.T + e.phi);
    e.y = e.ay + e.B * Math.sin(2 * TWO_PI * e.t / e.T + 2 * e.phi);
    const dx = (p.x + p.w / 2) - (e.x + e.w / 2); // the dart: the player is close
    const dy = (p.y + p.h / 2) - (e.y + e.h / 2);
    if (!p.dead && Math.hypot(dx, dy) < DART_RANGE && e.dartCd <= 0) {
      const d = Math.hypot(dx, dy) || 1;
      e.vx = (dx / d) * DART_SPEED;
      e.vy = (dy / d) * DART_SPEED;
      e.state = 'dart'; e.dartT = DART_TIME; e.dartCd = DART_CD;
    }
  } else if (e.state === 'dart') {
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.dartT -= dt;
    if (e.dartT <= 0) { e.state = 'hover'; e.hoverT = HOVER_TIME; }
  } else { // hover: hold where the dart ended
    e.hoverT -= dt;
    if (e.hoverT <= 0) { // re-anchor the Lissajous here and resume drifting
      e.ax = e.x - e.A * Math.sin(TWO_PI * e.t / e.T + e.phi);
      e.ay = e.y - e.B * Math.sin(2 * TWO_PI * e.t / e.T + 2 * e.phi);
      e.state = 'drift';
    }
  }
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  const flap = Math.sin((e.t ?? 0) * 20); // the wing beat (a pure function of the drift clock)
  c.globalAlpha = 0.6; // the silk wings, a cyan glow
  c.fillStyle = '#7ec8ff';
  const wingY = -5 + flap * 3;
  c.fillRect(-11, wingY, 8, 8);
  c.fillRect(3, wingY, 8, 8);
  c.globalAlpha = 1;
  c.fillStyle = '#a8843e'; // the brass body
  c.fillRect(-4, -6, 8, 12);
  c.fillStyle = '#6e5424'; // the head
  c.fillRect(-3, -8, 6, 3);
  c.fillStyle = '#6fe3e1'; // the single eye glint
  c.fillRect(-1, -7, 2, 2);
  c.restore();
}

register({
  kind: 'moth',
  w: E_W, h: E_H,
  hp: 1,
  stompable: true,
  deathSound: 'puff', deathFx: FX.mageSpark,
  stompFx: FX.mageSpark,
  update,
  draw,
});
