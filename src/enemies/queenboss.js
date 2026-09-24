// The Frost Queen (level 9's boss, and the game's last fight).
//
// She has held the winter for a century and the ice has held her for just as
// long, which is why she starts as scenery: a frozen pose on the throne, in
// the same rect the world pass drew before she existed. Her gate beat sets
// `lvl.queenUnfreeze` and the shell comes off over a second and a half —
// after that she never freezes again.
//
// M4 is the wake only: she stands on the arena ice and does nothing. The
// phases land in M5-M6 and the release in M7.
import { FX } from '../effects.js';
import { burst } from '../particles.js';
import { shake } from '../camera.js';
import { hurtPlayer } from '../player.js';
import { fireFireball, fireShockwaves, fireCone } from '../projectiles.js';
import { frostPatch } from '../thaw.js';
import { register } from './index.js';
import { phaseEdge, pipMax } from './phase.js';
import { difficulty } from '../difficulty.js'; // bossCd stretches the idle between attacks
import { drawFrozenQueen } from '../render/frostpalace.js';

export const E_W = 56, E_H = 60, QUEEN_HP = 24;
// The entrance: a beat of shattering, then she steps west off the dais and
// drops the 40 px onto the arena floor.
export const WAKE_SHELL = 1.0, WAKE_STEP = 1.5;
export const THRONE_X = 5672, THRONE_Y = 400, ARENA_X = 5560, ARENA_Y = 500;

// The arena. She drifts inside ARENA_W..ARENA_E and never crosses the King at
// 5300; her shockwaves die at SHOCK_BOUNDS so a westbound wave cannot roll out
// of the room and into the hall.
export const ARENA_W = 5400, ARENA_E = 5900, SHOCK_BOUNDS = [5200, 5950];
export const SPIKE_W = 20, SPIKE_H = 140,
  SPIKE_GLINT = 0.6, SPIKE_RISE = 0.3, SPIKE_STAND = 0.8, SPIKE_FALL = 0.5,
  SPIKE_MIN = 5250, SPIKE_MAX = 5900;
// The two phase gates. Each costs her 1.2 s of standing still — the only
// time in the fight she is free — and steps the level's drone (bossThaws),
// because the sky and the hall film are already at their maximum by the time
// anyone reaches this room. The level's answer to a wound is a frozen person
// in the hall cracking and dripping: a pre-taste of the ending, not a release.
export const P2_AT = 16, P3_AT = 8, PHASE_PAUSE = 1.2;
// The release. Not a death: four stages of ice coming off, and then she is
// gone. The bound-creature motif closes here — the pig walked, the wraiths
// sparkled, the Warden bowed, and the Queen melts.
export const DYING_T = 6.3, DY_SHARDS = 1.0, DY_CASCADE = 3.0, DY_KNEES = 3.8;
// The ending starts when her light begins to rise, not when the arrow lands:
// the horn and the beam play over the last of her, which is the whole point
// of ending it this way.
export const ENDING_AT = 2.5;
export const DRIFT_P2 = 90, BREATH_WIND = 0.7, BREATH_TTL = 1.2, BREATH_REACH = 160,
  DOUBLE_SPIKE_DX = 150;
export const BURST_SPEED = 120, BURST_TIME = 0.6,
  BLIZZ_TELE = 0.8, BLIZZ_TIME = 3.0, BLIZZ_CD = 8.0,
  BLIZZ_WAVE_SPEED = 140, BLIZZ_WAVE_TTL = 3.0, BLIZZ_DRIFT = 40;
export const DRIFT_P1 = 60, BOLT_SPEED = 240,
  SLAM_WIND = 0.5, SLAM_TTL = 2.5, SLAM_SPEED = 180,
  STAGGER = 0.3,
  // The bow's cooldown is 0.22 s and the stagger is 0.3, so an accurate player
  // holding fire would keep her staggered forever and she would never attack
  // at all. One stagger per STAGGER_CD keeps it as the reward for a clean hit
  // without turning the last fight in the game into a firing range.
  STAGGER_CD = 0.9;

// A per-Queen LCG seeded from the spawn x (the house deterministic pattern),
// so the whole fight replays identically from the same spawn.
export function queenRand(e) {
  if (e.seed === undefined) e.seed = (e.x % 997) * 1013 + 7;
  e.seed = (Math.imul(e.seed, 1103515245) + 12345) & 0x7fffffff;
  return e.seed / 0x7fffffff;
}

// Her health, as 24 pips in three rows of eight — the first three-row display
// in the game, because this is the last fight. Row-major from the top.
export function pipRows(e) {
  const per = pipsPerRow(e);
  const hp = Math.max(0, Math.min(per * 3, e.hp));
  return [0, 1, 2].map(row => Math.max(0, Math.min(per, hp - (2 - row) * per)));
}

// A row per winter: a third of what she spawned with (8 at hard).
export function pipsPerRow(e) {
  return Math.ceil(pipMax(e, QUEEN_HP) / 3);
}

// The entrance, driven by the level rather than by her: the roster entity is
// moved from the throne to the floor. Once begun it never runs backwards, so
// there is no state in which she is half-frozen and also fighting.
export function updateQueenWake(lvl, enemies, dt, fx, cam) {
  const w = lvl.queenUnfreeze;
  if (!w || w.done) return;
  const e = enemies.find(en => en.kind === 'queenboss' && !en.dead);
  if (!e) { w.done = true; return; }
  if (w.t === 0) { // the shell goes first
    fx.play('crack');
    burst(THRONE_X + E_W / 2, THRONE_Y + E_H / 2, FX.iceShard);
    if (cam) shake(cam, 8, 0.5);
  }
  w.t += dt;
  if (w.t >= WAKE_SHELL) { // the step down: west off the dais, onto the ice
    const k = Math.min(1, (w.t - WAKE_SHELL) / (WAKE_STEP - WAKE_SHELL));
    e.x = THRONE_X + (ARENA_X - THRONE_X) * k;
    e.y = THRONE_Y + (ARENA_Y - THRONE_Y) * k;
  }
  if (w.t >= WAKE_STEP && !w.done) {
    w.done = true;
    e.x = ARENA_X;
    e.y = ARENA_Y;
    e.sleeping = false; // the entrance ends in the fight; there is no third state
    fx.play('boss');
  }
}

// The idle between attacks, seeded so a spawn replays identically.
function nextIdle(e) {
  return (0.8 + (e.x % 5) * 0.1) * difficulty().bossCd;
}

// One spike: a glint on the floor where it is coming, then a column. The x is
// clamped to the arena — the glint has to be somewhere a spike can actually
// rise, or the telegraph is a lie.
function addSpike(e, x) {
  e.spikes.push({ x: Math.max(SPIKE_MIN, Math.min(SPIKE_MAX, x)) - SPIKE_W / 2, t: 0, cracked: false });
}

// A spike's rect right now, or null while it is still only a glint or already
// gone: it can only hurt what it has actually risen into.
export function spikeRect(sp, groundY) {
  const after = sp.t - SPIKE_GLINT;
  if (after <= 0) return null; // still only a glint
  const h = after < SPIKE_RISE ? SPIKE_H * (after / SPIKE_RISE)
    : after < SPIKE_RISE + SPIKE_STAND ? SPIKE_H
      : SPIKE_H * Math.max(0, 1 - (after - SPIKE_RISE - SPIKE_STAND) / SPIKE_FALL);
  if (h <= 0) return null;
  return { x: sp.x, y: groundY - h, w: SPIKE_W, h };
}

export const SPIKE_LIFE = SPIKE_GLINT + SPIKE_RISE + SPIKE_STAND + SPIKE_FALL;

// Which winter she is fighting. Read from hp, so it can never disagree with
// the pips the player is reading off the wall.
export function phaseOf(e) {
  return e.hp > phaseEdge(e, P2_AT, QUEEN_HP) ? 1 : e.hp > phaseEdge(e, P3_AT, QUEEN_HP) ? 2 : 3;
}

// Her four stages, run by the level rather than by her (she is dead as far as
// enemies.js is concerned, and dead enemies are skipped). The house scripted-
// death pattern, one stage longer than any before it.
export function updateQueenDying(e, lvl, enemies, dt, fx) {
  if (!e.dying) return;
  const before = e.dyingT;
  e.dyingT -= dt;
  const elapsed = DYING_T - e.dyingT;
  if (before > DYING_T - 0.3 && e.dyingT <= DYING_T - 0.3) {
    fx.play('crack'); // the ice staff goes
    burst(e.x + e.w / 2, e.y + 10, FX.iceShard);
  }
  if (before > DYING_T - DY_CASCADE && e.dyingT <= DYING_T - DY_CASCADE) {
    fx.play('melt', 0.5); // the armour peeling
  }
  if (before > DYING_T - DY_KNEES && e.dyingT <= DYING_T - DY_KNEES) {
    fx.play('melt'); // full volume: the level's name, made audible
  }
  if (elapsed >= DY_KNEES) e.y -= 18 * dt; // the light rises off her
  if (before > ENDING_AT && e.dyingT <= ENDING_AT && lvl.ending9) {
    lvl.ending9.started = true; // the horn begins while her light is still going
  }
  if (e.dyingT <= 0) {
    const i = enemies.indexOf(e);
    if (i >= 0) enemies.splice(i, 1); // and she is gone
  }
}

function update(e, { p, lvl, cam, dt, fx }) {
  e.t = (e.t ?? 0) + dt; // the shimmer clock runs even while she is ice
  if (e.spikes === undefined) {
    e.spikes = []; e.idle = nextIdle(e); e.staggerT = 0; e.staggerCd = 0;
    e.phase = 1; e.phaseT = 0; e.blizzCd = 0; e.burstT = 0; e.burstDir = 0;
  }
  e.staggerCd = Math.max(0, e.staggerCd - dt);
  e.blizzCd = Math.max(0, e.blizzCd - dt);
  updateSpikes(e, p, lvl, cam, dt, fx);
  if (lvl.blizzard) { // her own weather, decayed on her clock
    lvl.blizzard.t -= dt;
    runBlizzardWaves(e, lvl, dt, fx);
    if (lvl.blizzard.t <= 0) lvl.blizzard = null;
  }
  if (e.sleeping) return; // the level moves her through the entrance
  const want = phaseOf(e);
  if (want !== e.phase) enterPhase(e, want, lvl, fx); // the hp edge, once
  if (e.phaseT > 0) { e.phaseT -= dt; return; } // the transition: she is open
  if (e.staggerT > 0) { e.staggerT -= dt; return; } // a clean hit stops everything
  if (e.wind) { // an attack in its wind-up
    e.windT -= dt;
    if (e.windT > 0) return;
    const kind = e.wind;
    e.wind = null;
    fireAttack(e, kind, p, lvl, cam, fx);
    e.idle = nextIdle(e);
    return;
  }
  drift(e, p, dt);
  e.idle -= dt;
  if (e.idle > 0 || p.dead) return;
  chooseAttack(e, p, fx);
}

// A wound is not a stagger: she stops for over a second, her staff flares, the
// drone steps, and somewhere behind you in the hall a frozen person drips.
function enterPhase(e, phase, lvl, fx) {
  e.phase = phase;
  e.phaseT = PHASE_PAUSE;
  e.wind = null;
  fx.play('gust');
  if (!lvl.thaw) return;
  lvl.thaw.bossThaws += 1; // the hum steps: the sky and the film are already done
  const who = phase === 2 ? 'guard' : 'child'; // opposite ends of the hall
  const f = (lvl.hallFigures ?? []).find(x => x.kind === who);
  if (f && f.state === 'frozen') { f.state = 'drip'; f.t = 0; fx.play('melt', 0.5); }
}

// Spacing, not chasing: she keeps pace with the player's side of the arena at
// a walk, so the fight is about where you stand rather than about outrunning
// her. Neither the ice nor her own patches move her — she is the winter.
function drift(e, p, dt) {
  if (e.phase === 3) { erratic(e, p, dt); return; }
  const speed = e.phase === 2 ? DRIFT_P2 : DRIFT_P1;
  const target = p.x + p.w / 2 - e.w / 2;
  const step = Math.sign(target - e.x) * speed * dt;
  if (Math.abs(target - e.x) > Math.abs(step)) e.x += step; else e.x = target;
  clampArena(e);
}

// The last winter does not keep spacing: it lunges and stops. Bursts of
// BURST_TIME toward or away from the player, then a seeded pause — pressure
// you cannot read a rhythm off.
function erratic(e, p, dt) {
  if (e.burstT > 0) {
    e.burstT -= dt;
    e.x += e.burstDir * BURST_SPEED * dt;
    clampArena(e);
    return;
  }
  e.pauseT = (e.pauseT ?? 0) - dt;
  if (e.pauseT > 0) return;
  const toward = queenRand(e) < 0.6 ? 1 : -1;
  e.burstDir = Math.sign((p.x + p.w / 2) - (e.x + e.w / 2)) * toward || 1;
  e.burstT = BURST_TIME;
  e.pauseT = 0.4 + queenRand(e) * 0.5;
}

function clampArena(e) {
  e.x = Math.max(ARENA_W, Math.min(ARENA_E - e.w, e.x));
}

// The weights, one row per phase, off her own LCG so the fight is
// reproducible. A spike has no wind-up of its own — its glint IS the wind-up,
// and it starts the moment it is chosen.
const WEIGHTS = {
  1: [['bolt', 0.40], ['slam', 0.35], ['spike', 0.25]],
  2: [['bolt', 0.35], ['breath', 0.25], ['slam', 0.25], ['spike', 0.15]],
  3: [['bolt', 0.30], ['breath', 0.25], ['spike', 0.20], ['blizzard', 0.15], ['slam', 0.10]],
};

function chooseAttack(e, p, fx) {
  let r = queenRand(e);
  let pick = 'bolt';
  for (const [name, w] of WEIGHTS[e.phase] ?? WEIGHTS[1]) {
    if (r < w) { pick = name; break; }
    r -= w;
  }
  if (pick === 'blizzard' && e.blizzCd > 0) pick = 'bolt'; // not twice in a row
  if (pick === 'spike') {
    addSpike(e, p.x + p.w / 2);
    if (e.phase >= 2) { // the double: a second glint, a seeded side
      addSpike(e, p.x + p.w / 2 + (queenRand(e) < 0.5 ? -1 : 1) * DOUBLE_SPIKE_DX);
    }
    e.idle = nextIdle(e);
    return;
  }
  e.wind = pick;
  e.windT = pick === 'bolt' ? 0.25
    : pick === 'slam' ? SLAM_WIND
      : pick === 'breath' ? BREATH_WIND : BLIZZ_TELE;
  if (pick === 'slam') fx.play('creak');
  if (pick === 'breath' || pick === 'blizzard') fx.play('gust');
}

function fireAttack(e, kind, p, lvl, cam, fx) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (kind === 'bolt') {
    const dx = p.x + p.w / 2 - cx, dy = p.y + p.h / 2 - cy;
    const d = Math.hypot(dx, dy) || 1;
    fireFireball(cx - 7, cy - 7, (dx / d) * BOLT_SPEED, (dy / d) * BOLT_SPEED, fx, false, true);
  } else if (kind === 'slam') {
    fx.play('thud');
    shake(cam, 4, 0.2);
    fireShockwaves(cx, lvl.groundY, fx, SLAM_TTL, SLAM_SPEED, SHOCK_BOUNDS);
  } else if (kind === 'breath') {
    // The level's own traversal problem, turned into her attack: where the
    // cone meets the floor it leaves a patch, and the player has to fight on
    // ground she keeps re-freezing.
    const dx = p.x + p.w / 2 - cx, dy = p.y + p.h / 2 - cy;
    const angle = Math.atan2(dy, dx);
    fireCone(cx, cy, angle, fx, BREATH_TTL, false, BREATH_REACH, true);
    const reach = Math.min(BREATH_REACH, Math.hypot(dx, dy) || BREATH_REACH);
    frostPatch(lvl, cx + Math.cos(angle) * reach - 40, 80);
  } else if (kind === 'blizzard') {
    lvl.blizzard = { t: BLIZZ_TIME, next: 0.8 };
    e.blizzCd = BLIZZ_CD;
    fx.play('gust');
  }
}

// Three slow waves out of the storm, one every 0.8 s of the window. Slower
// than a slam and telegraphed by the weather itself: pressure, not a trap.
function runBlizzardWaves(e, lvl, dt, fx) {
  const b = lvl.blizzard;
  if (!b || b.next === undefined) return;
  const elapsed = BLIZZ_TIME - b.t;
  if (elapsed < b.next || b.next > 2.5) return;
  b.next += 0.8;
  fireShockwaves(e.x + e.w / 2, lvl.groundY, fx, BLIZZ_WAVE_TTL, BLIZZ_WAVE_SPEED, SHOCK_BOUNDS);
  void dt;
}

// The blizzard's push on the player: a seeded wobble, pure in time, so it
// nudges rather than shoves and never becomes a wall.
export function blizzardWobble(t) {
  return Math.sin(5.3 * t + 1.7) * Math.sin(2.1 * t);
}

function updateSpikes(e, p, lvl, cam, dt, fx) {
  for (const sp of e.spikes) {
    const before = sp.t;
    sp.t += dt;
    if (!sp.cracked && before < SPIKE_GLINT && sp.t >= SPIKE_GLINT) {
      sp.cracked = true;
      fx.play('crack'); // the floor opening
    }
    const r = spikeRect(sp, lvl.groundY);
    if (!r || p.dead || p.invuln > 0) continue;
    if (r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y) {
      hurtPlayer(p, cam, fx);
    }
  }
  e.spikes = e.spikes.filter(sp => sp.t < SPIKE_LIFE);
}

function draw(c, e) {
  const t = e.t ?? 0;
  if (e.dying) { drawDying(c, e, t); return; }
  for (const sp of e.spikes ?? []) drawSpike(c, sp, 560); // behind her, on the floor
  drawFrozenQueen(c, e.x, e.y + e.h, t, !e.sleeping);
  if (e.sleeping) return; // the shell is her whole appearance until it is off
  if (e.phaseT > 0) { // the wound: her staff flares and she is open
    c.globalAlpha = Math.min(0.8, e.phaseT);
    c.fillStyle = '#e8f7fc';
    c.fillRect(e.x + e.w - 6, e.y - 30, 12, 40);
    c.globalAlpha = 1;
  }
  if (e.wind === 'slam') { // the crouch, staff planted
    c.globalAlpha = 0.5;
    c.fillStyle = '#e8f7fc';
    c.fillRect(e.x + e.w / 2 - 3, e.y + e.h - 10, 6, 10);
    c.globalAlpha = 1;
  }
  if (e.staggerT > 0) { // the white flash of a clean hit
    c.globalAlpha = Math.min(0.6, e.staggerT * 2);
    c.fillStyle = '#ffffff';
    c.fillRect(e.x, e.y, e.w, e.h);
    c.globalAlpha = 1;
  }
  drawPips(c, e);
}

// The unmaking: the arms drop, the armour peels, she kneels, and then she is
// light going up. No burst, no rage — the ice comes off and there is nobody
// underneath it any more.
function drawDying(c, e, t) {
  const elapsed = DYING_T - e.dyingT;
  const kneel = elapsed >= DY_KNEES ? 0 : elapsed >= DY_CASCADE
    ? Math.min(1, (elapsed - DY_CASCADE) / (DY_KNEES - DY_CASCADE)) : 0;
  const rise = elapsed >= DY_KNEES ? Math.min(1, (elapsed - DY_KNEES) / (DYING_T - DY_KNEES)) : 0;
  c.globalAlpha = 1 - rise;
  drawFrozenQueen(c, e.x, e.y + e.h - kneel * 10, t, true);
  c.globalAlpha = 1;
  if (elapsed > 0.3 && elapsed < DY_KNEES) { // the armour coming off in panels
    const k = Math.min(1, (elapsed - 0.3) / (DY_KNEES - 0.3));
    c.fillStyle = '#e8f7fc';
    for (let i = 0; i < 5; i++) {
      const off = Math.max(0, k * 60 - i * 8);
      c.globalAlpha = Math.max(0, 0.7 - k * 0.7);
      c.fillRect(e.x + 6 + i * 10, e.y + 8 + i * 8 + off, 8, 8);
    }
    c.globalAlpha = 1;
  }
  if (rise > 0) { // the light going up
    c.globalAlpha = (1 - rise) * 0.8;
    c.fillStyle = '#ffe9b0';
    for (let i = 0; i < 8; i++) {
      c.fillRect(e.x + 8 + ((i * 13) % 40), e.y + e.h - rise * (60 + i * 9), 4, 4);
    }
    c.globalAlpha = 1;
  }
}

// The glint, then the column. The glint is the contract: it shows where the
// spike will be for a full 0.6 s before anything can hurt you.
function drawSpike(c, sp, groundY) {
  if (sp.t < SPIKE_GLINT) {
    const k = sp.t / SPIKE_GLINT;
    c.globalAlpha = 0.35 + 0.45 * k;
    c.fillStyle = '#bfe4f0';
    c.fillRect(sp.x - 4, groundY - 4, SPIKE_W + 8, 4);
    c.fillStyle = '#e8f7fc';
    c.fillRect(sp.x + SPIKE_W / 2 - 1, groundY - 6 - k * 10, 2, 6 + k * 10);
    c.globalAlpha = 1;
    return;
  }
  const r = spikeRect(sp, groundY);
  if (!r) return;
  c.fillStyle = '#9fd8ec';
  c.beginPath();
  c.moveTo(r.x, groundY);
  c.lineTo(r.x + r.w / 2, r.y);
  c.lineTo(r.x + r.w, groundY);
  c.closePath();
  c.fill();
  c.fillStyle = '#e8f7fc'; // the lit edge
  c.fillRect(r.x + r.w / 2 - 2, r.y + 4, 3, r.h - 4);
}

// Her winding, as 24 pips in three rows of eight above the arena: the first
// three-row display in the game, because it is the last fight.
function drawPips(c, e) {
  const rows = pipRows(e);
  const cx = 5650;
  for (let row = 0; row < 3; row++) {
    const n = rows[row];
    const per = pipsPerRow(e);
    for (let i = 0; i < per; i++) {
      c.fillStyle = i < n ? '#bfe4f0' : '#2a3a52';
      c.fillRect(cx - per * 10 + 1 + i * 20, 240 + row * 18, 14, 6);
    }
  }
}

register({
  kind: 'queenboss',
  w: E_W, h: E_H,
  hp: QUEEN_HP,
  boss: true, hpStep: 3, isTell: e => !!e.wind, // difficulty: scaled hp (a pip row per winter), slowed wind-ups
  stompable: false, // the dragon rule: she is ice all the way down
  hitValue: () => 1,
  hitSound: 'bossHit',
  // asleep she is still the frozen statue she has been for a century: an
  // arrow rings off her and nothing else happens
  arrowBlocked: e => !!e.sleeping,
  // A clean hit stops her: 0.3 s with no drift and no attack, and a puff of
  // her own weather. The micro-window inside the duel.
  onHit: e => {
    burst(e.x + e.w / 2, e.y + e.h / 2, FX.iceMist);
    if (e.staggerCd > 0) return; // she shrugs this one off
    e.staggerT = STAGGER;
    e.staggerCd = STAGGER_CD;
    e.wind = null;
  },
  // The last arrow releases her; it does not kill her. onZero replaces the
  // usual burst-and-sound with the six-second unmaking, and updateQueenDying
  // (driven from game.js) runs it.
  onZero: (e, fx, cam) => {
    e.dying = true;
    e.dyingT = DYING_T;
    e.wind = null;
    e.spikes = [];
    fx.play('crack');
    burst(e.x + e.w / 2, e.y + e.h / 2, FX.iceShard);
    if (cam) shake(cam, 5, 0.3);
  },
  update,
  draw,
});
