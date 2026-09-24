// The Wizard: level 7 mid-boss (the Frost Queen's warder). 16 hp, two
// stages of 8, arrow-only, stomp bounces (the dragon rule). Stage 1 the
// entity is the flying war-pig (64x48) with the mounted wizard: only the
// rune on the pig's near flank takes hits (weakPoint hook); the swoop's
// 0.5 s recovery is the designed ground-arrow window. At hp 8 the rune
// shatters, the pig crashes, the wizard is stunned 2 s on the floor
// (full body), then rises as the sorcerer (56x56): drift, bolt, slam
// shockwaves, the seal circle (columns), the <=4 hp fan. Death is ash.
import { fireFireball, fireCone, fireShockwaves, FIREBALL_SPEED } from '../projectiles.js';
import { shake } from '../camera.js';
import { burst } from '../particles.js';
import { hurtPlayer } from '../player.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { phaseEdge, pipMax } from './phase.js';

const ENTER_T = 1.0, SHATTER_T = 0.4, CRASH_T = 0.4, STUN_T = 2.0;
const SWOOP_TELE_T = 0.5, SWOOP_SPEED = 420, SWOOP_DIST = 504, SWOOP_REC_T = 0.5;
const BAND_MIN = 5500, BAND_MAX = 6200; // the pig's band (e.x)
const S2_MIN = 5500, S2_MAX = 6160; // the sorcerer's drift clamp

// The rune: 24x24 on the flank facing the player (the side e.weakSide
// tracks each update). Stage 1 flight only — the crash, the stunned
// wizard and the sorcerer take full-body hits (null).
function weakPoint(e) {
  if (e.stage !== 1) return null;
  const s = e.state;
  if (s === 'shatter' || s === 'crash' || s === 'stunned' || s === 'entering') return null;
  const fx = e.weakSide === -1 ? 8 : e.w - 32;
  return { x: e.x + fx, y: e.y + 12, w: 24, h: 24 };
}

// The hover: a pure function of e.age (accumulated in update). Starts at
// (6200, groundY-160) so the 1.0 s enter from (6500, 200) is continuous.
function hoverX(e) { return 5850 + 350 * Math.cos(2 * Math.PI * e.age / 8); }
function hoverY(e, lvl) { return lvl.groundY - 160 + 50 * Math.sin(e.age / 2); }

function nextIdle(e) {
  if (e.stage === 2) return e.hp <= phaseEdge(e, 4, 16) ? 0.5 + Math.random() * 0.4 : 0.7 + Math.random() * 0.4;
  return 1.0 + Math.random() * 0.5;
}

// Lead-aimed bolt(s) from the staff tip (the dragon's tFlight pattern).
// fan: the <=4 hp spread — three bolts at -20/0/+20 degrees.
function fireBolt(e, p, lvl, fx, fan) {
  const ox = e.x + e.w / 2 + e.dir * 26, oy = e.y + e.h / 2 - 4; // the staff tip
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const tFlight = Math.hypot(cx - ox, cy - oy) / FIREBALL_SPEED || 1;
  const tx = Math.max(0, Math.min(lvl.width, cx + p.vx * tFlight)); // lead the player
  const ang = Math.atan2(cy - oy, tx - ox);
  const offs = fan ? [-20, 0, 20] : [0];
  for (const off of offs) {
    const a = ang + (off * Math.PI) / 180;
    fireFireball(ox - 7, oy - 7, Math.cos(a) * FIREBALL_SPEED, Math.sin(a) * FIREBALL_SPEED, fx);
  }
  e.state = 'idle';
  e.t = nextIdle(e);
}

// Stage 1 pick: dark bolt 50 / swoop 30 / snort cone 20. The cone is a
// ground-level breath: it only goes off from the bottom of the hover
// arc (or it waits a beat for the arc to dip).
function pickAttack(e, p, lvl, fx) {
  const r = Math.random();
  if (r < 0.5) { e.state = 'windup'; e.t = 0.4; return; }
  if (r < 0.8) {
    e.state = 'swoopTele'; e.t = SWOOP_TELE_T;
    fx.play('snort'); fx.play('puff'); // the tell
    return;
  }
  if (e.y >= lvl.groundY - 130) { // bottom of the arc: ground level
    const ox = e.x + e.w / 2 + e.dir * 22, oy = e.y + e.h - 8; // the snout
    fireCone(ox, oy, Math.atan2(p.y + p.h / 2 - oy, p.x + p.w / 2 - ox), fx, 0.9, true);
    e.state = 'idle';
    e.t = 0.6 + Math.random() * 0.4;
  } else {
    e.t = 0.6; // too high: the cone waits for the arc's bottom
  }
}

// Stage 2 pick: bolt / slam / seal circle; the fan replaces a third of
// the rolls at <=4 hp.
function pickAttack2(e, p, lvl, fx) {
  const r = Math.random();
  if (e.hp <= phaseEdge(e, 4, 16) && r < 0.3) { e.fan = true; e.state = 'windup'; e.t = 0.4; return; }
  if (r < 0.5) { e.fan = false; e.state = 'windup'; e.t = 0.4; return; }
  if (r < 0.75) {
    e.state = 'slamTele'; e.t = 0.5;
    fx.play('creak');
    return;
  }
  e.state = 'sealTele'; e.t = 0.6;
  e.sealX = Math.max(S2_MIN, Math.min(S2_MAX, p.x + p.w / 2)); // the glint, clamped
  fx.play('cast');
}

function onHit(e) {
  e.flash = 0.15;
  e.state = 'stagger';
  e.t = 0.3;
}

function onDeath(e, fx, cam) {
  shake(cam, 9, 0.6);
  burst(e.x + e.w / 2, e.y + e.h / 2, FX.ashBurst);
}

function update(e, { p, lvl, cam, dt, fx }) {
  if (e.sleeping) { // dormant: no update, no contact (the hitPlayer guard)
    if (lvl.throneGateOpen) {
      e.sleeping = false;
      e.state = 'entering'; e.t = ENTER_T;
      e.x = 6500; e.y = 200; e.age = 0; e.stage = 1;
    }
    return;
  }
  if (e.stage === undefined) { e.stage = 1; e.age = 0; e.weakSide = 1; e.flash = 0; e.phase = 0; }
  if (e.state === undefined) { e.state = 'idle'; e.t = 1.5; }
  e.flash = Math.max(0, (e.flash ?? 0) - dt);
  e.phase = (e.phase ?? 0) + dt * 4;
  // the hover clock starts when the enter lands (age 0 = (6200, groundY-160))
  if (e.stage === 1 && e.state !== 'entering') e.age += dt;
  e.dir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1; // face the player
  e.weakSide = p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1; // the rune's flank

  // --- the rune shatter (the hp 8 edge, once): crack -> crash -> stun ---
  if (e.stage === 1 && e.hp <= phaseEdge(e, 8, 16) && !e.shattered) {
    e.shattered = true;
    e.state = 'shatter'; e.t = SHATTER_T;
    fx.play('crack');
    burst(e.x + e.w / 2, e.y + e.h / 2, FX.runeShatter);
    shake(cam, 6, 0.4);
    return;
  }
  if (e.state === 'shatter') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'crash'; e.t = CRASH_T; e.crashY0 = e.y; }
    return;
  }
  if (e.state === 'crash') {
    e.t -= dt;
    const target = lvl.groundY - e.h;
    const f = 1 - Math.max(0, e.t) / CRASH_T;
    e.y = e.crashY0 + (target - e.crashY0) * f * f; // the eased fall
    if (e.t <= 0) {
      e.y = target;
      fx.play('thud');
      burst(e.x + e.w / 2, lvl.groundY, FX.snowPuff);
      e.state = 'stunned'; e.t = STUN_T; // the wizard, dazed on the floor
    }
    return;
  }
  if (e.state === 'stunned') {
    e.t -= dt;
    if (e.t <= 0) { // stage 2: the sorcerer rises
      e.stage = 2;
      e.w = 56; e.h = 56;
      e.y = lvl.groundY - 56;
      e.state = 'idle'; e.t = 1.0;
    }
    return;
  }
  if (e.state === 'stagger') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'idle'; e.t = nextIdle(e); }
    return; // frozen
  }

  if (e.stage === 1) {
    // --- stage 1: the flight ---
    if (e.state === 'entering') {
      e.t -= dt;
      const f = 1 - Math.max(0, e.t) / ENTER_T;
      const k = f * f * (3 - 2 * f); // the eased descent
      e.x = 6500 - 300 * k;
      e.y = 200 + 200 * k;
      if (e.t <= 0) { e.state = 'idle'; e.t = 1.0; }
      return;
    }
    if (e.state === 'idle' || e.state === 'windup' || e.state === 'swoopTele') {
      e.x = hoverX(e);
      e.y = hoverY(e, lvl);
    }
    if (e.state === 'idle') {
      e.t -= dt;
      if (e.t <= 0) pickAttack(e, p, lvl, fx);
      return;
    }
    if (e.state === 'windup') {
      if (e.t > 0) { e.t -= dt; return; }
      fireBolt(e, p, lvl, fx, false); // the dark bolt
      return;
    }
    if (e.state === 'swoopTele') {
      if (e.t > 0) { e.t -= dt; return; }
      e.state = 'swoop';
      e.swoopT = 0;
      e.swoopX0 = e.x;
      e.swoopY0 = e.y;
      e.swoopDir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1;
      return;
    }
    if (e.state === 'swoop') {
      e.swoopT += dt;
      const s = Math.min(1, (e.swoopT * SWOOP_SPEED) / SWOOP_DIST);
      const nx = Math.max(BAND_MIN, Math.min(BAND_MAX, e.swoopX0 + e.swoopDir * SWOOP_SPEED * e.swoopT));
      e.x = nx;
      // the shallow arc: sinks to groundY-70 at the midpoint of the pass
      e.y = e.swoopY0 + (lvl.groundY - 70 - e.swoopY0) * 4 * s * (1 - s);
      if (s >= 1 || nx <= BAND_MIN + 1 || nx >= BAND_MAX - 1) {
        e.state = 'swoopRec';
        e.t = SWOOP_REC_T;
        e.y = lvl.groundY - e.h; // sits at ground-arrow height: the rune's window
      }
      return;
    }
    if (e.state === 'swoopRec') {
      e.t -= dt;
      if (e.t <= 0) { e.state = 'idle'; e.t = nextIdle(e); }
      return;
    }
    return;
  }

  // --- stage 2: the sorcerer, on foot ---
  e.y = lvl.groundY - e.h;
  if (e.state === 'idle') {
    e.t -= dt;
    const dx = p.x + p.w / 2 - (e.x + e.w / 2);
    if (Math.abs(dx) > 8) e.x += Math.sign(dx) * Math.min(60 * dt, Math.abs(dx)); // the drift
    e.x = Math.max(S2_MIN, Math.min(S2_MAX, e.x));
    if (e.t <= 0) pickAttack2(e, p, lvl, fx);
    return;
  }
  if (e.state === 'windup') {
    if (e.t > 0) { e.t -= dt; return; }
    fireBolt(e, p, lvl, fx, !!e.fan);
    e.fan = false;
    return;
  }
  if (e.state === 'slamTele') {
    if (e.t > 0) { e.t -= dt; return; }
    fx.play('thud');
    shake(cam, 4, 0.2);
    fireShockwaves(e.x + e.w / 2, lvl.groundY, fx); // the twin ground waves
    e.state = 'idle'; e.t = nextIdle(e);
    return;
  }
  if (e.state === 'sealTele') {
    if (e.t > 0) { e.t -= dt; return; }
    e.columns = [{ x: e.sealX - 20, w: 40, h: 140, t: 0, baseY: lvl.groundY, hit: false, dead: false }];
    burst(e.sealX, lvl.groundY - 8, FX.sealColumn); // the column rises
    e.state = 'idle'; e.t = nextIdle(e);
    return;
  }
}

// The seal columns (boss-owned, like the Queen's pillars): 0.3 s rise,
// 0.8 s stand, 0.5 s decay; 1 damage, one hit each.
export function updateColumns(e, p, dt, fx, cam) {
  if (!e.columns || !e.columns.length) return;
  const RISE = 0.3, STAND = 0.8, DECAY = 0.5;
  let any = false;
  for (const col of e.columns) {
    if (col.dead) continue;
    any = true;
    col.t += dt;
    if (col.t >= RISE + STAND + DECAY) { col.dead = true; continue; }
    let h = col.h;
    if (col.t < RISE) h = col.h * (col.t / RISE);
    else if (col.t > RISE + STAND) h = col.h * ((RISE + STAND + DECAY - col.t) / DECAY);
    if (!col.hit && !p.dead && p.invuln <= 0 &&
        p.x < col.x + col.w && p.x + p.w > col.x &&
        p.y < col.baseY && p.y + p.h > col.baseY - h) {
      col.hit = true;
      hurtPlayer(p, cam, fx);
    }
  }
  e.columns = e.columns.filter(c => !c.dead);
}

function draw(c, e) {
  const pipFull = e.stage === 1 ? '#b06aff' : '#e33'; // violet rune pips, then the sorcerer's
  const pipEmpty = e.stage === 1 ? '#3a2a5c' : '#522';
  const stunned = e.state === 'stunned';
  const crashed = e.state === 'shatter' || e.state === 'crash';
  if (e.stage === 1 && !crashed && !stunned) {
    drawPig(c, e); // the war-pig + the mounted wizard + the rune
  } else if (e.stage === 1) {
    drawDowned(c, e); // the crashed pig + the dazed wizard (or the shatter shake)
  } else {
    drawSorcerer(c, e);
  }
  // the seal columns (world-space, like the Queen's pillars): rise, stand,
  // then sink back fading — the player must see the box before it bites
  for (const col of e.columns ?? []) {
    if (col.dead) continue;
    const RISE = 0.3, STAND = 0.8, DECAY = 0.5; // must match updateColumns
    let h = col.h, a = 1;
    if (col.t < RISE) h = col.h * (col.t / RISE);
    else if (col.t > RISE + STAND) {
      h = col.h * ((RISE + STAND + DECAY - col.t) / DECAY);
      a = (RISE + STAND + DECAY - col.t) / DECAY;
    }
    c.globalAlpha = a * 0.9;
    c.fillStyle = '#3a2a5c'; // the dark violet column
    c.fillRect(col.x, col.baseY - h, col.w, h);
    c.fillStyle = '#6a3a9a'; // the seal band at the top
    c.fillRect(col.x, col.baseY - h, col.w, 6);
    c.globalAlpha = 1;
  }
  if (!e.dead) { // hp pips: two rows of eight, world space above the boss
    const n = pipMax(e, 16), per = Math.ceil(n / 2); // two rows
    for (let i = 0; i < n; i++) {
      const row = i < per ? 0 : 1, col = i % per;
      c.fillStyle = i < e.hp ? pipFull : pipEmpty;
      c.fillRect(e.x + e.w / 2 - per * 6 + col * 12, e.y - 24 + row * 7, 10, 4);
    }
  }
}

function drawPig(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const bob = Math.sin(e.phase);
  const tele = e.state === 'swoopTele';
  const swooping = e.state === 'swoop';
  c.fillStyle = '#4a5270'; // the tucked legs (the flying tuck)
  if (swooping) {
    c.fillRect(-26, 14, 14, 8); c.fillRect(12, 14, 14, 8);
  } else {
    c.fillRect(-24, 16 + bob * 2, 12, 8); c.fillRect(10, 16 - bob * 2, 12, 8);
  }
  c.fillStyle = '#5a6488'; // the hog's body
  c.beginPath(); c.ellipse(0, tele ? 4 : bob * 3, 30, 18, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6a7498'; // the flank
  c.beginPath(); c.ellipse(2, 6 + (tele ? 4 : bob * 3), 22, 11, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a6488'; // the head + snout
  c.fillRect(20, -14 + (tele ? 6 : 0), 16, 14);
  c.fillRect(32, -10 + (tele ? 8 : 0), 8, 8);
  c.fillStyle = '#3a4258'; // the ears
  c.fillRect(20, -18 + (tele ? 6 : 0), 6, 6);
  c.fillStyle = tele ? '#ffd166' : '#fff'; // the eye: glows through the telegraph
  c.fillRect(26, -10 + (tele ? 6 : 0), 3, 3);
  // the mounted wizard: a small hooded figure on the hog's back
  c.fillStyle = '#3a3a5c'; // the robe
  c.fillRect(-12, -24 + (tele ? 4 : bob * 2), 12, 16);
  c.beginPath(); c.arc(-6, -26 + (tele ? 4 : bob * 2), 5, 0, Math.PI * 2); c.fill(); // the hood
  c.fillStyle = '#8a93b8'; // the staff
  c.fillRect(-2, -34 + (tele ? 4 : bob * 2), 2, 22);
  c.fillStyle = e.state === 'windup' ? '#ffd166' : '#9a6ac8'; // the staff tip
  c.beginPath(); c.arc(-1, -34 + (tele ? 4 : bob * 2), 3, 0, Math.PI * 2); c.fill();
  c.restore();
  // the rune on the near flank (the only thing that takes hits)
  const rx = e.weakSide === -1 ? e.x + 8 : e.x + e.w - 32;
  const ry = e.y + 12;
  c.save();
  c.translate(rx + 12, ry + 12);
  c.rotate(Math.PI / 4);
  c.globalAlpha = 0.7 + 0.3 * Math.sin(e.phase * 1.5); // the pulse
  c.fillStyle = '#6a3a9a';
  c.fillRect(-10, -10, 20, 20);
  c.fillStyle = '#9a6ac8';
  c.fillRect(-5, -5, 10, 10);
  c.restore();
  if (e.flash > 0) {
    c.globalAlpha = 0.7;
    c.fillStyle = '#fff';
    c.fillRect(e.x, e.y, e.w, e.h);
    c.globalAlpha = 1;
  }
}

// The shatter shake (the pig trembling in place) and the downed pair:
// the hog collapsed on the snow, the wizard standing dazed above it.
function drawDowned(c, e) {
  const gy = e.y + e.h;
  const tremble = e.state === 'shatter' ? Math.sin(e.phase * 20) * 2 : 0;
  c.save();
  c.translate(e.x + e.w / 2 + tremble, gy);
  c.fillStyle = '#5a6488'; // the collapsed hog
  c.beginPath(); c.ellipse(0, -10, 30, 10, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a4258'; // the folded legs
  c.fillRect(-22, -16, 10, 6); c.fillRect(12, -16, 10, 6);
  c.fillStyle = '#3a3a5c'; // the dazed wizard, standing
  c.fillRect(-6, -44, 12, 22); // the robe
  c.beginPath(); c.arc(0, -47, 5, 0, Math.PI * 2); c.fill(); // the hood
  c.fillStyle = '#8a93b8'; // the dropped staff
  c.fillRect(10, -40, 2, 28);
  c.fillStyle = '#ffd166'; // the daze stars (pure in e.phase)
  for (let i = 0; i < 3; i++) {
    const a = e.phase + (i * 2 * Math.PI) / 3;
    c.fillRect(Math.cos(a) * 12 - 1, -54 + Math.sin(a) * 3, 3, 3);
  }
  c.restore();
  if (e.flash > 0) {
    c.globalAlpha = 0.7;
    c.fillStyle = '#fff';
    c.fillRect(e.x, e.y, e.w, e.h);
    c.globalAlpha = 1;
  }
}

// The sorcerer: a tall hooded robe, the staff planted or raised by state;
// the staff-tip glow intensifies at <=4 hp (the phase cue).
function drawSorcerer(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const tele = e.state === 'slamTele';
  const casting = e.state === 'sealTele' || e.state === 'windup';
  const low = e.hp <= phaseEdge(e, 4, 16);
  c.fillStyle = '#2c2c48'; // the robe
  c.beginPath();
  c.moveTo(-20, 28);
  c.lineTo(-10, -18 + (tele ? 6 : 0));
  c.lineTo(10, -18 + (tele ? 6 : 0));
  c.lineTo(20, 28);
  c.closePath();
  c.fill();
  c.fillStyle = '#3a3a5c'; // the hood
  c.beginPath(); c.arc(0, -22 + (tele ? 6 : 0), 9, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1a1026'; // the shadowed face
  c.beginPath(); c.arc(2, -21 + (tele ? 6 : 0), 5, 0, Math.PI * 2); c.fill();
  c.fillStyle = low ? '#ffd166' : '#b06aff'; // the eyes: embered at <=4
  c.fillRect(1, -23 + (tele ? 6 : 0), 2, 2);
  c.fillRect(5, -23 + (tele ? 6 : 0), 2, 2);
  // the staff: planted and braced on the slam telegraph, raised to cast
  const tipX = casting ? 16 : 20, tipY = casting ? -30 + (tele ? 8 : 0) : -6 + (tele ? 4 : 0);
  c.strokeStyle = '#8a93b8';
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(8, 20); c.lineTo(tipX, tipY); c.stroke();
  const ph = e.phase ?? 0; // the dormant boss never runs its update: no NaN glow
  const glow = low ? 0.7 + 0.3 * Math.sin(ph * 3) : 0.5 + 0.25 * Math.sin(ph * 2);
  c.globalAlpha = glow;
  c.fillStyle = low ? '#ffd166' : '#9a6ac8'; // the staff-tip glow
  c.beginPath(); c.arc(tipX, tipY, low ? 7 : 5, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  c.restore();
  if (e.state === 'sealTele' && typeof e.sealX === 'number') { // the floor glint
    c.globalAlpha = 0.5 + 0.5 * Math.sin(e.phase * 6);
    c.fillStyle = '#9a6ac8';
    c.beginPath();
    c.moveTo(e.sealX, e.y + e.h - 10);
    c.lineTo(e.sealX + 6, e.y + e.h - 4);
    c.lineTo(e.sealX, e.y + e.h + 2);
    c.lineTo(e.sealX - 6, e.y + e.h - 4);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
  }
  if (e.flash > 0) {
    c.globalAlpha = 0.7;
    c.fillStyle = '#fff';
    c.fillRect(e.x, e.y, e.w, e.h);
    c.globalAlpha = 1;
  }
}

register({
  kind: 'wizardboss',
  w: 64, h: 48,
  hp: 16, stompable: false,
  hitSound: 'bossHit', deathSound: 'growl',
  weakPoint,
  onHit, onDeath,
  update, draw,
});
