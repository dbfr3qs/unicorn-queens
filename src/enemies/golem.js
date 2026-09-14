// Glacier golem (level 9): a slab of the glacier that got up. It patrols its
// band, and inside range it either slams the floor — twin waves along the ice
// — or spits a bead of frost that lands as a fresh patch of slick ground.
//
// The spit is the point: it teaches the patch, the level's one new physical
// idea, before the Frost Queen makes an attack out of it. Three hp, and a
// stomp bounces you off (the dragon rule): this is a chunky target, not a
// stomp toy.
import { FX } from '../effects.js';
import { shake } from '../camera.js';
import { fireShockwaves, fireBoulder } from '../projectiles.js';
import { register } from './index.js';
import { drawSpriteFeet, scaleToHeight } from '../render/sprite.js';

export const E_W = 48, E_H = 56;
const WALK = 30, SLAM_RANGE = 200, SPIT_RANGE = 320,
  SLAM_WIND = 0.5, SPIT_WIND = 0.6,
  SLAM_TTL = 2.0, SLAM_SPEED = 160, SPIT_DX = 240;

// A per-golem LCG seeded from the spawn x (the house deterministic pattern):
// the attack choice is reproducible per spawn, so the fight is testable.
export function golemRand(e) {
  if (e.seed === undefined) e.seed = (e.x % 997) * 1013 + 7;
  e.seed = (Math.imul(e.seed, 1103515245) + 12345) & 0x7fffffff;
  return e.seed / 0x7fffffff;
}

function nextCooldown(e) {
  return 1.6 + (e.x % 6) / 10;
}

function update(e, { p, lvl, cam, dt, fx }) {
  if (e.state === undefined) {
    e.state = 'walk';
    e.cd = nextCooldown(e);
    e.t = 0;
  }
  e.t += dt;
  e.cd = Math.max(0, e.cd - dt);

  if (e.state === 'slamWind') {
    e.windT -= dt;
    if (e.windT > 0) return;
    e.state = 'walk';
    fx.play('thud');
    shake(cam, 3, 0.15);
    fireShockwaves(e.x + e.w / 2, lvl.groundY, fx, SLAM_TTL, SLAM_SPEED);
    return;
  }
  if (e.state === 'spitWind') {
    e.windT -= dt;
    if (e.windT > 0) return;
    e.state = 'walk';
    // fireBoulder solves its own arc from where the throw should ARRIVE, so
    // the design's fixed 240 px lob is expressed as a landing point on the
    // floor rather than as a launch velocity.
    const side = p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1;
    const bx = e.x + e.w / 2 - 9, by = e.y + 8;
    fireBoulder(bx, by, bx + side * SPIT_DX, lvl.groundY - 18, fx, false, true);
    return;
  }

  const cx = e.x + e.w / 2, px = p.x + p.w / 2;
  const range = Math.abs(px - cx);
  if (!p.dead && e.cd <= 0 && range < SPIT_RANGE) {
    e.dir = px < cx ? -1 : 1; // it turns to face what it is about to hit
    e.cd = nextCooldown(e);
    const r = golemRand(e);
    if (range < SLAM_RANGE && r < 0.55) {
      e.state = 'slamWind';
      e.windT = SLAM_WIND;
      fx.play('creak');
    } else {
      e.state = 'spitWind';
      e.windT = SPIT_WIND;
      fx.play('spit');
    }
    return;
  }
  e.x += e.dir * WALK * dt; // the patrol, the slime's shape
  if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
  if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
}

function draw(c, e) {
  const crouch = e.state === 'slamWind' ? Math.min(8, (SLAM_WIND - e.windT) * 24) : 0;
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h);
  c.scale(e.dir || 1, 1);
  const headY = e.state === 'spitWind' ? -58 : -54;
  // The sheet is its body only. Its two wind-ups — the crouch, the bead in
  // the mouth, the arms going up — are the player's warning, so they are
  // drawn over whichever body is in use.
  const sheet =     drawSpriteFeet(c, 'icegolem', 0, scaleToHeight('icegolem', (E_H - crouch) * 1.25));
  if (!sheet) {
    c.fillStyle = '#5f8ba8'; // the body: a block of glacier
    c.fillRect(-22, -46 + crouch, 44, 46 - crouch);
    c.fillStyle = '#7fb0cc'; // the lit faces
    c.fillRect(-22, -46 + crouch, 44, 8);
    c.fillRect(-22, -38 + crouch, 10, 38 - crouch);
    c.fillStyle = '#3f6580'; // the seams
    c.fillRect(-6, -34 + crouch, 4, 30 - crouch);
    c.fillRect(8, -26 + crouch, 4, 22 - crouch);
    c.fillStyle = '#c8f0ff'; // the head, tipped back for a spit
    c.fillRect(-12, headY + crouch, 24, 14);
    c.fillStyle = '#0e2a3e'; // the eyes
    c.fillRect(-7, headY + 5 + crouch, 5, 4);
    c.fillRect(3, headY + 5 + crouch, 5, 4);
  }
  if (e.state === 'spitWind') { // the bead building in its mouth
    c.fillStyle = '#e8f7fc';
    const g = Math.min(1, (SPIT_WIND - e.windT) / SPIT_WIND);
    c.fillRect(10, headY + 8, 4 + g * 6, 4 + g * 6);
  }
  if (e.state === 'slamWind') { // the arms going up
    c.fillStyle = '#7fb0cc';
    c.fillRect(-30, -56, 12, 18);
    c.fillRect(18, -56, 12, 18);
  }
  c.restore();
}

register({
  kind: 'golem',
  w: E_W, h: E_H,
  hp: 3,
  stompable: false, // the dragon rule: it is ice, and it is taller than you
  hitSound: 'crack',
  deathSound: 'crumble', deathFx: FX.iceShard,
  update,
  draw,
});
