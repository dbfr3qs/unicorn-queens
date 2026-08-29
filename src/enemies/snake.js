// The Blackmire snakes (level 6): the watersnake and the elder adder,
// two kinds off one shared brain.
//
// AI: patrol (crawl between minX/maxX) -> telegraph (still, the body
// rises, a tongue flick, 'slither') when the player is within the
// strike range and the cooldown is down -> strike (a horizontal lunge
// in the player's direction, capped at the strike distance) -> recover
// -> patrol. The cooldown re-arms only when the recover ends, seeded
// per roster x so a row of snakes never lunges in unison.
//
// The elder adder can start `sleeping` (a roster flag carried onto the
// spawned enemy): coiled, no movement, no contact damage (the hitPlayer
// guard in enemies.js). It wakes when the egg sac appears on the altar
// (lvl.sac.present — the winch's w3 beat): a 0.6 s stretch, then patrol.
//
// Hitboxes (24/26 tall, drawn as a low arch that rises on the telegraph):
// chest-height arrows fly no lower than groundY-24, so a 12 px flat body
// could never be arrowable from the ground (the design's "arrow-killable").
import { resolveGroundCollision } from '../levels/level.js';
import { P_GRAVITY, P_TERM_VY } from '../player.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function makeSnakeBrain(t) {
  return function update(e, { p, lvl, dt, fx }) {
    if (e.sleeping) { // coiled: no movement, no contact damage
      if (lvl.sac?.present) {
        e.sleeping = false;
        e.waking = 0.6; // the stretch
        fx.play('slither');
      }
      return;
    }
    if (e.waking > 0) { // the stretch after waking
      e.waking -= dt;
      if (e.waking <= 0) e.state = 'patrol';
      return;
    }
    if (e.cd === undefined) e.cd = (e.x % 97) / 97 * t.cooldown; // per-roster seed
    e.cd = Math.max(0, e.cd - dt);
    e.stateT = (e.stateT ?? 0) - dt;
    const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
    const inRange = !p.dead && Math.abs(dx) < t.strikeRange && Math.abs((p.y + p.h) - (e.y + e.h)) < 40;
    if (e.state === 'telegraph') {
      e.vx = 0;
      if (e.stateT <= 0) { // the lunge
        e.state = 'strike';
        e.dir = dx >= 0 ? 1 : -1;
        e.vx = e.dir * t.strikeSpeed;
        e.struck = 0;
      }
    } else if (e.state === 'strike') {
      e.struck += Math.abs(e.vx) * dt;
      if (e.struck >= t.strikeDist) { // the lunge is spent
        e.state = 'recover';
        e.stateT = t.recover;
        e.vx = 0;
      }
    } else if (e.state === 'recover') {
      e.vx = 0;
      if (e.stateT <= 0) {
        e.state = 'patrol';
        e.cd = t.cooldown; // the cooldown re-arms when the recover ends
      }
    } else { // patrol
      if (inRange && e.cd <= 0) {
        e.state = 'telegraph';
        e.stateT = t.telegraph;
        fx.play('slither');
      } else {
        e.vx = e.dir * t.crawl;
        if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
        else if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
      }
    }
    e.vy = Math.min(e.vy + P_GRAVITY * dt, P_TERM_VY);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    // A snake never leaves its patrol band, even mid-lunge: the mire's
    // water pits start just past the ground edges, and a lunge over one
    // would drop the snake into the mud.
    if (e.state === 'strike' && (e.x < e.minX || e.x + e.w > e.maxX)) {
      e.x = e.x < e.minX ? e.minX : e.maxX - e.w;
      e.state = 'recover';
      e.stateT = t.recover;
      e.vx = 0;
    }
    resolveGroundCollision(e, lvl, dt);
  };
}

// A low, arching body: a flat band while patrolling, a rising hump (and
// head + forked tongue) on the telegraph and the lunge.
function makeSnakeDraw(big) {
  return function draw(c, e) {
    c.save();
    c.translate(e.x, e.y + e.h); // the belly line
    c.scale(e.dir, 1);
    const w = e.w;
    const dark = big ? '#46543a' : '#556b40';
    const mid = big ? '#5a6b48' : '#6b8252';
    const belly = big ? '#a8a074' : '#b8b08a';
    if (e.sleeping) { // the coil
      c.fillStyle = dark;
      c.beginPath(); c.ellipse(w / 2, -8, w / 2 - 4, 8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = mid;
      c.beginPath(); c.ellipse(w / 2, -8, w / 2 - 11, 4.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = palette.white;
      c.fillRect(w / 2 + 8, -12, 3, 2); // the closed eye
      c.restore();
      return;
    }
    const rising = e.state === 'telegraph' || e.state === 'strike';
    const flat = big ? 18 : 12;
    const up = big ? 26 : 24;
    const wig = Math.sin(e.x * 0.3) * 1.5; // the body wiggle
    c.fillStyle = dark;
    c.fillRect(0, -flat + wig, w - 14, flat - wig); // the tail band
    if (rising) c.fillRect(w - 22, -up + wig, 14, up - flat - wig); // the rising hump
    const headY = rising ? -up + wig : -flat - 4 + wig;
    c.fillStyle = mid;
    c.fillRect(w - 13, headY, 13, 10); // the head
    c.fillStyle = palette.white;
    c.fillRect(w - 7, headY + 2, 3, 3); // the eye glint
    if (e.state === 'telegraph') { // the tongue flick
      c.strokeStyle = '#e33';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(w, headY + 4); c.lineTo(w + 6, headY + 3); c.stroke();
      c.beginPath(); c.moveTo(w + 6, headY + 3); c.lineTo(w + 9, headY + 1);
      c.moveTo(w + 6, headY + 3); c.lineTo(w + 9, headY + 5); c.stroke();
    }
    c.fillStyle = belly;
    c.fillRect(3, -2, w - 16, 2); // the pale belly line
    c.restore();
  };
}

register({
  kind: 'snake',
  w: 26, h: 24,
  hp: 1,
  stompable: true,
  crawl: 40, strikeRange: 200, strikeDist: 120, strikeSpeed: 380,
  cooldown: 4, telegraph: 0.25, recover: 0.5,
  update: makeSnakeBrain({
    crawl: 40, strikeRange: 200, strikeDist: 120, strikeSpeed: 380,
    cooldown: 4, telegraph: 0.25, recover: 0.5,
  }),
  draw: makeSnakeDraw(false),
});

register({
  kind: 'adder',
  w: 44, h: 26,
  hp: 3,
  stompable: true,
  crawl: 25, strikeRange: 200, strikeDist: 180, strikeSpeed: 360,
  cooldown: 6, telegraph: 0.3, recover: 0.6,
  update: makeSnakeBrain({
    crawl: 25, strikeRange: 200, strikeDist: 180, strikeSpeed: 360,
    cooldown: 6, telegraph: 0.3, recover: 0.6,
  }),
  draw: makeSnakeDraw(true),
});
