// Frost sprite (level 9): a splinter of living cold that drifts around an
// anchor and spits a dart when you come close. The moth's shape, one biome
// on: a Lissajous drift seeded from the spawn x, so it wanders without ever
// keeping time — the living don't tick.
//
// Stomping it bounces you off (the ghost rule): it is 16 px of ice and there
// is nothing to land on. One arrow ends it.
import { FX } from '../effects.js';
import { fireFireball } from '../projectiles.js';
import { register } from './index.js';
import { drawSpriteCentre, scaleToHeight } from '../render/sprite.js';

export const E_W = 16, E_H = 16;
const DART_RANGE = 140, DART_SPEED = 200, HOVER = 0.6,
  // 0.8 s at 200 px/s is 160 px — just past the 140 px range that triggers
  // it. A shorter dart could never reach the player who set it off.
  DART_TTL = 0.8,
  TWO_PI = Math.PI * 2;

function seed(e) {
  e.ax = e.x; e.ay = e.y; e.t = 0;
  e.A = 30 + (e.x % 21); // 30-50 px across
  e.B = 20 + (e.x % 13); // 20-32 px up and down
  e.T = 4 + (e.x % 21) / 10; // 4.0-6.0 s
  e.phi = (e.x % 63) / 10; // 0-6.2 rad
  e.dartCd = (e.x % 30) / 10; // 0-2.9 s, so four sprites never fire together
  e.state = 'drift';
}

function update(e, { p, dt, fx }) {
  if (e.A === undefined) seed(e);
  e.t += dt; // the shimmer clock runs whatever the state
  e.dartCd = Math.max(0, e.dartCd - dt);
  if (e.state === 'wind') { // held still, gathering the dart
    e.windT -= dt;
    if (e.windT > 0) return;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    const dx = (p.x + p.w / 2) - cx, dy = (p.y + p.h / 2) - cy;
    const d = Math.hypot(dx, dy) || 1;
    fireFireball(cx - 7, cy - 7, (dx / d) * DART_SPEED, (dy / d) * DART_SPEED,
      fx, false, true, DART_TTL);
    // re-anchor where it stopped, so it drifts on from here rather than
    // snapping back to where it was when the player arrived
    e.ax = e.x - e.A * Math.sin(TWO_PI * e.t / e.T + e.phi);
    e.ay = e.y - e.B * Math.sin(TWO_PI * e.t / (e.T * 0.63) + e.phi);
    e.state = 'drift';
    e.dartCd = 2.6 + (e.x % 8) / 10;
    return;
  }
  e.x = e.ax + e.A * Math.sin(TWO_PI * e.t / e.T + e.phi);
  e.y = e.ay + e.B * Math.sin(TWO_PI * e.t / (e.T * 0.63) + e.phi);
  if (p.dead || e.dartCd > 0) return;
  const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
  const dy = (p.y + p.h / 2) - (e.y + e.h / 2);
  if (Math.hypot(dx, dy) < DART_RANGE) { e.state = 'wind'; e.windT = HOVER; }
}

// The sheet name deliberately does not match the kind: render/enemies.js
// swaps a kind's whole draw when it does, and the gathering bead below is the
// only warning the dart gives.
function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  const t = e.t ?? 0;
  const wind = e.state === 'wind';
  c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 6); // the cold haze around it
  c.fillStyle = '#bfe4f0';
  c.fillRect(-9, -9, 18, 18);
  c.globalAlpha = 1;
  if (!(drawSpriteCentre(c, 'frostsprite', 0, scaleToHeight('frostsprite', 22)))) {
    c.fillStyle = wind ? '#e8f7fc' : '#8fd3f4'; // the shard body
    c.beginPath();
    c.moveTo(0, -8);
    c.lineTo(6, 0);
    c.lineTo(0, 8);
    c.lineTo(-6, 0);
    c.closePath();
    c.fill();
    c.fillStyle = '#1c3a52'; // the single dark eye
    c.fillRect(-2, -3, 4, 4);
  }
  if (wind) { // the bead it is about to throw
    c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 12);
    c.fillStyle = '#ffffff';
    c.fillRect(-3, 4, 6, 6);
    c.globalAlpha = 1;
  }
  c.restore();
}

register({
  kind: 'sprite',
  w: E_W, h: E_H,
  hp: 1,
  stompable: false, // 16 px of ice: there is nothing to land on
  hitSound: 'crack',
  deathSound: 'crack', deathFx: FX.iceShard,
  update,
  draw,
});
