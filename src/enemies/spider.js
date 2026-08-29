// Blackmire spiders (level 6): small weavers hanging from the overhead
// webs. Roster shape { kind, x, y }: (x, y) is the web's ANCHOR (y 410,
// on the overhead web strand), not the spider's body.
//
// AI: hang — on its thread, swaying x = anchor + sin(t*1.3+seed)*4,
// y = anchor + 46 + a small bob → pounce when the player is within
// 220 px horizontally, below the thread, and the cooldown (3.5 s,
// seeded) is done: a ballistic leap (vx = clamp(dx/0.7, ±240),
// vy = -260, gravity 900) → land (feet on the ground; over the water
// it splats — a pounce can be baited into the mud) → recover 0.5 s →
// climb back to the anchor at 140 px/s → hang.
//
// Hitbox 20×22 (drawn as a ~16 px body + legs): a 14 px spider resting
// on the ground (top 546) is unreachable for a chest-height arrow
// (bottom 540); 22 px is the smallest height that makes a landed
// spider arrow-killable. A hanging spider is reached by a jump-stomp
// (its top ≈ 458, inside the 130 px jump apex).
import { register } from './index.js';
import { P_TERM_VY } from '../player.js';
import { resolveGroundCollision } from '../levels/level.js';

const S_GRAVITY = 900;
const S_COOLDOWN = 3.5;
const S_RANGE = 220;
const S_POUNCE_TIME = 0.7; // the arc's intended flight time (vx = dx / 0.7)
const S_VX_MAX = 240;
const S_LEAP_VY = -260;
const S_RECOVER = 0.5;
const S_CLIMB_SPEED = 140;

// Is there any solid surface under this x (ground, a revealed platform,
// a box)? A spider only pounces at a player who would land somewhere
// it can land — otherwise it just hangs and watches.
function solidBelow(lvl, x) {
  for (const seg of lvl.ground) if (x > seg.x && x < seg.x + seg.w) return true;
  for (const s of lvl.platforms) if (!s.hidden && x > s.x && x < s.x + s.w) return true;
  for (const b of lvl.boxes) if (!b.broken && x > b.x && x < b.x + b.w) return true;
  return false;
}

export function makeSpiderBrain() {
  return function update(e, { p, lvl, dt }) {
    if (!e.state) e.state = 'hang'; // a fresh spider starts on its thread
    e.t = (e.t ?? 0) + dt;
    if (e.seed === undefined) e.seed = (e.x % 97) / 97;
    if (e.cd === undefined) e.cd = e.seed * S_COOLDOWN;
    e.cd = Math.max(0, e.cd - dt);
    e.stateT = (e.stateT ?? 0) - dt;
    const ax = e.anchorX, ay = e.anchorY;

    if (e.state === 'hang') {
      const phase = e.seed * Math.PI * 2;
      e.x = ax + Math.sin(e.t * 1.3 + phase) * 4;
      e.y = ay + 46 + Math.sin(e.t * 2 + phase) * 2;
      e.vx = 0;
      e.vy = 0;
      const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
      const under = !p.dead && p.y + p.h > e.y;
      if (under && Math.abs(dx) < S_RANGE && e.cd <= 0 && solidBelow(lvl, p.x + p.w / 2)) {
        e.state = 'pounce';
        e.cd = S_COOLDOWN;
        e.vx = Math.max(-S_VX_MAX, Math.min(S_VX_MAX, dx / S_POUNCE_TIME));
        e.vy = S_LEAP_VY;
      }
    } else if (e.state === 'pounce') {
      e.vy = Math.min(e.vy + S_GRAVITY * dt, P_TERM_VY);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      resolveGroundCollision(e, lvl, dt);
      if (e.onGround) { // landed (or splat-over-water ends it via the fall check)
        e.state = 'recover';
        e.stateT = S_RECOVER;
        e.vx = 0;
        e.vy = 0;
      }
    } else if (e.state === 'recover') {
      if (e.stateT <= 0) e.state = 'climb';
    } else { // climb: straight back to the anchor at 140 px/s
      const tx = ax, ty = ay + 46;
      const dx = tx - e.x, dy = ty - e.y;
      const d = Math.hypot(dx, dy);
      if (d <= 2) {
        e.state = 'hang';
        e.x = tx;
        e.y = ty;
      } else {
        e.x += (dx / d) * S_CLIMB_SPEED * dt;
        e.y += (dy / d) * S_CLIMB_SPEED * dt;
      }
    }
  };
}

export function makeSpiderDraw() {
  return function draw(c, e) {
    c.save();
    c.translate(e.x + e.w / 2, e.y + e.h / 2);
    // the thread: anchor -> spider, while it is still attached
    if (e.state === 'hang' || e.state === 'climb') {
      c.strokeStyle = 'rgba(232, 232, 220, 0.7)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(e.anchorX - (e.x + e.w / 2), e.anchorY - (e.y + e.h / 2));
      c.lineTo(0, -e.h / 2 + 2);
      c.stroke();
    }
    const dir = e.vx !== 0 ? (e.vx > 0 ? 1 : -1) : 1;
    c.scale(dir, 1);
    const moving = e.state === 'pounce' || e.state === 'climb';
    const legAnim = moving ? Math.sin(e.t * 16) * 3 : Math.sin(e.t * 2.5) * 1;
    c.strokeStyle = '#2c2c38';
    c.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { // 8 jointed legs: 4 per side
      const lx = -6 + i * 4;
      const lift = legAnim * (i % 2 ? 1 : -1);
      c.beginPath();
      c.moveTo(lx, -1);
      c.lineTo(lx - 4, -7 + lift);
      c.lineTo(lx - 7, 3 + lift);
      c.stroke();
      c.beginPath();
      c.moveTo(lx, 2);
      c.lineTo(lx - 4, -5 - lift);
      c.lineTo(lx - 7, 5 - lift);
      c.stroke();
    }
    c.fillStyle = '#3a3a48'; // the round abdomen
    c.beginPath();
    c.ellipse(-3, 0, 7, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(232, 232, 220, 0.45)'; // a pale web-pattern glint
    c.beginPath();
    c.arc(-3, -1.5, 2.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#4a4a58'; // the cephalothorax
    c.beginPath();
    c.ellipse(5, -1, 4, 3.5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ff4444'; // the two glowing red eye dots
    c.fillRect(7, -3, 2, 2);
    c.fillRect(4.5, -4, 2, 2);
    c.restore();
  };
}

register({
  kind: 'spider',
  w: 20,
  h: 22,
  hp: 1,
  stompable: true,
  update: makeSpiderBrain(),
  draw: makeSpiderDraw(),
});
