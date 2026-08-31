// Hare: the peak's snow patrol. Walks 30 px/s between its bounds; when
// the player is within 160 px it crouches (ears back, 0.3 s, no
// movement), then darts a 100 px ballistic hop AWAY from the player —
// its own light gravity (900) makes the hop float: apex ≈ 50 px,
// air time ≈ 0.67 s, landing ≈ 100 px out. 0.4 s recover, then patrol;
// 3 s cooldown so it doesn't machine-gun. Stompable even mid-hop; the
// game's softest death (a fluff puff + a puff).
import { resolveGroundCollision } from '../levels/level.js';
import { P_TERM_VY } from '../player.js';
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';

export const E_W = 24, E_H = 20;
const HOP_GRAV = 900, HOP_VY = -300, HOP_VX = 150, DART_CD = 3;

function update(e, { p, lvl, dt, fx }) {
  if (e.state === undefined) { e.state = 'patrol'; e.dartCd = e.x % DART_CD; }
  if (e.dartCd > 0) e.dartCd = Math.max(0, e.dartCd - dt);
  const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
  const seen = !p.dead && e.onGround && Math.abs(dx) < 160 &&
    Math.abs((p.y + p.h / 2) - (e.y + e.h / 2)) < 60;
  if (e.state === 'patrol') {
    e.vx = e.dir * this.speed;
    if (seen && e.dartCd <= 0) { e.state = 'crouch'; e.crouchT = 0.3; e.vx = 0; }
  } else if (e.state === 'crouch') {
    e.vx = 0; // the tell: ears back, no movement
    e.crouchT -= dt;
    if (e.crouchT <= 0) { // the dart: hop away from the player
      e.dir = dx < 0 ? 1 : -1;
      e.vx = e.dir * HOP_VX;
      e.vy = HOP_VY;
      e.state = 'hop';
      e.dartCd = DART_CD;
      fx.play('puff');
      burst(e.x + e.w / 2, e.y + e.h / 2, FX.hopPuff);
    }
  } else if (e.state === 'hop') {
    e.vy = Math.min(e.vy + HOP_GRAV * dt, P_TERM_VY); // the light float
  } else { // recover
    e.vx = 0;
    e.recoverT -= dt;
    if (e.recoverT <= 0) e.state = 'patrol';
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (e.state === 'patrol') { // turn at the bounds
    if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
    else if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
  }
  resolveGroundCollision(e, lvl, dt);
  if (e.state === 'hop' && e.onGround) { e.state = 'recover'; e.recoverT = 0.4; e.vx = 0; }
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const crouch = e.state === 'crouch';
  c.fillStyle = '#e8e8f0'; // body
  c.fillRect(-12, crouch ? -4 : -10, 24, crouch ? 14 : 20);
  c.fillStyle = '#ffffff'; // belly
  c.fillRect(-8, crouch ? 0 : -2, 14, 8);
  c.fillStyle = '#e8e8f0';
  if (crouch) c.fillRect(-14, -8, 12, 4); // ears back, laid flat
  else { c.fillRect(6, -18, 3, 10); c.fillRect(10, -15, 3, 7); } // ears up
  c.fillStyle = '#2a3d66'; // eye
  c.fillRect(6, crouch ? -4 : -8, 3, 3);
  c.fillStyle = '#cfcfe0'; // the tail puff
  c.fillRect(-15, crouch ? -2 : -6, 4, 4);
  c.restore();
}

register({
  kind: 'hare',
  w: E_W, h: E_H,
  speed: 30,
  hp: 1,
  stompable: true,
  deathSound: 'puff', deathFx: FX.fluffPuff, // the soft death (arrows too)
  stompSound: 'puff', stompFx: FX.fluffPuff, // stomps: a puff over the stomp
  update,
  draw,
});
