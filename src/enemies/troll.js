// Troll: level 3 boss. 52x64 grounded brute, hp 8, unstompable.
// State machine: idle (1.0-1.6 s) -> pick (shield / slam / lob) -> execute.
// Arrow hits: white flash 0.15 s + stagger 0.3 s (crouch-frozen).
// Shield: stone slab held at the front; front arrows bounce with a spark,
// the top 8 px of the body stay open. Reactive: an arrow fired within 300
// px may raise the shield after a 150 ms delay (45 %, 65 % phase 2).
// Slam: 0.8 s windup, hop <= 220 px toward the player, floor pound ->
// camera shake + P6 shockwaves. Lob: 0.6 s windup -> 2 boulders
// (3 in phase 2). Phase 2 (hp <= 4): windups -30 %, 3 boulders, shields
// more often.
import { fireBoulder, fireShockwaves } from '../projectiles.js';
import { arrows } from '../arrows.js';
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { shake } from '../camera.js';
import { register } from './index.js';
import { phaseEdge, pipMax } from './phase.js';
import { difficulty } from '../difficulty.js'; // bossCd stretches the idle between attacks
import { palette } from '../render/theme.js';

const A_W = 14, A_H = 4; // arrow body size (kept in sync with the arrows.js hit test)

function onHit(e) {
  e.flash = this.flashT;
  if (COMMITTED.has(e.state)) return; // mid-swing he doesn't flinch (BOSS-PLAN B3)
  e.state = 'stagger';
  e.t = this.staggerT;
}
const COMMITTED = new Set(['slamWindup', 'slamHop', 'lobWindup']);

// Death: the hall shakes when the troll drops (pearl trigger wired in P8).
function onDeath(e, fx, cam) {
  shake(cam, 12, 0.4);
}

// An attack: close in, most likely the slam; at range, the boulders. It
// pays off a shield — he can't raise another until he has swung.
function startAttack(e, p, ws) {
  e.owesAttack = false;
  const near = Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < this.slamRange;
  if (Math.random() < (near ? this.slamNear : this.slamFar)) {
    e.state = 'slamWindup';
    e.t = this.windupSlam * ws;
  } else {
    e.state = 'lobWindup';
    e.t = this.windupLob * ws;
  }
}

function nextIdle() { return (this.idleMin + Math.random() * (this.idleMax - this.idleMin)) * difficulty().bossCd; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// An arrow moving toward the troll's front (the side it faces).
function towardFront(e, a) { return e.dir === 1 ? a.vx < 0 : a.vx > 0; }
// Gap from the arrow's leading edge to the shield face (positive = in front).
function frontGap(e, a) {
  const faceX = e.dir === 1 ? e.x + e.w : e.x;
  return e.dir === 1 ? a.x - faceX : faceX - (a.x + A_W);
}

// The shield face: front arrows (moving toward the face, within 24 px of
// it, below the top 8 px of the body) bounce back with a spark.
function deflectFrontArrows(e, fx) {
  const faceX = e.dir === 1 ? e.x + e.w : e.x;
  for (const a of arrows) {
    if (a.dead || !towardFront(e, a)) continue;
    const gap = frontGap(e, a);
    const inX = gap > -A_W && gap < 24; // at or just inside the face
    const inY = a.y + A_H > e.y + 8 && a.y < e.y + e.h; // top 8 px open
    if (inX && inY) {
      a.vx = -a.vx; // bounce back toward the shooter
      a.x += e.dir === 1 ? 6 : -6; // clear the face
      fx.play('deflect');
      burst(faceX, a.y + 2, FX.shieldSpark);
    }
  }
}

function update(e, { p, lvl, cam, dt, fx }) {
  if (e.state === undefined) { e.state = 'idle'; e.t = 1.5; e.flash = 0; }
  e.flash = Math.max(0, e.flash - dt);
  e.dir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1; // face the player
  e.phase2 = e.hp <= phaseEdge(e, this.phase2Hp, this.hp);
  const ws = e.phase2 ? this.windupScale2 : 1; // windups -30 % phase 2
  e.shield = e.state === 'shield';
  e.shieldCd = Math.max(0, (e.shieldCd ?? 0) - dt);
  e.reactiveCd = Math.max(0, (e.reactiveCd ?? 0) - dt);

  if (e.state === 'stagger') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'idle'; e.t = this.nextIdle(); }
    return; // crouch-frozen: no attacks, no dodges
  }

  // Reactive shield: an arrow approaching within 300 px starts a 150 ms
  // telegraph; the roll at expiry decides. Idle only - an attack already
  // winding up cannot be interrupted into a shield.
  if (e.state === 'idle' && e.reactiveT === undefined && e.reactiveCd <= 0 && !e.owesAttack) {
    const threat = arrows.find(a => !a.dead && towardFront(e, a) &&
        frontGap(e, a) > 0 && frontGap(e, a) < this.reactiveLook);
    if (threat) e.reactiveT = this.reactiveDelay;
  }
  if (e.reactiveT !== undefined && e.reactiveT > 0) {
    e.reactiveT -= dt;
    if (e.reactiveT <= 0) {
      e.reactiveT = undefined;
      if (e.state === 'idle' &&
          Math.random() < (e.phase2 ? this.reactiveChance2 : this.reactiveChance)) {
        e.state = 'shield';
        e.owesAttack = true;
        e.t = this.shieldDurMin + Math.random() * (this.shieldDurMax - this.shieldDurMin);
      }
      e.reactiveCd = this.reactiveCooldown;
    }
  }

  if (e.state === 'idle') {
    // He walks you down between attacks (BOSS-PLAN B3: he used to stand).
    const gap = p.x + p.w / 2 - (e.x + e.w / 2);
    e.walking = !p.dead && Math.abs(gap) > this.walkStop && Math.abs(gap) < this.aggroRange;
    if (e.walking) e.x = clamp(e.x + Math.sign(gap) * this.walkSpeed * dt, e.minX, e.maxX);
    e.t -= dt;
    if (e.t > 0) return;
    e.walking = false;
    const inRange = !p.dead && Math.abs(gap) < this.aggroRange;
    if (!inRange) { e.t = 0.4; return; }
    const shieldP = e.phase2 ? this.shieldChance2 : this.shieldChance;
    if (Math.random() < shieldP && e.shieldCd <= 0 && !e.owesAttack) {
      e.state = 'shield';
      e.owesAttack = true;
      e.t = this.shieldDurMin + Math.random() * (this.shieldDurMax - this.shieldDurMin);
    } else startAttack.call(this, e, p, ws);
    return;
  }
  if (e.state === 'shield') {
    deflectFrontArrows(e, fx);
    e.t -= dt;
    if (e.t <= 0) { // the slab drops and he answers: block, then punish
      e.shieldCd = this.shieldCdMin + Math.random() * (this.shieldCdMax - this.shieldCdMin);
      startAttack.call(this, e, p, ws);
    }
    return;
  }
  if (e.state === 'slamWindup') {
    e.t -= dt;
    if (e.t > 0) return;
    const dx = clamp(p.x + p.w / 2 - (e.x + e.w / 2), -this.slamHopDist, this.slamHopDist);
    e.state = 'slamHop';
    e.t = this.slamHopTime;
    e.vx = dx / this.slamHopTime;
    fx.play('hop');
    return;
  }
  if (e.state === 'slamHop') {
    e.t -= dt;
    e.x = Math.max(e.minX, Math.min(e.maxX, e.x + e.vx * dt));
    if (e.t <= 0) { // floor pound
      e.vx = 0;
      fx.play('thud');
      shake(cam, 10, 0.3);
      fireShockwaves(e.x + e.w / 2, lvl.groundY, fx, undefined, this.shockSpeed);
      if (e.phase2 && !e.chained && Math.random() < this.chainChance2) { // phase 2: again, quicker
        e.chained = true;
        e.state = 'slamWindup';
        e.t = this.windupSlam * ws * this.chainScale;
      } else {
        e.chained = false;
        e.state = 'idle';
        e.t = this.nextIdle();
      }
      burst(e.x + e.w / 2, lvl.groundY - 4, FX.slamDust);
    }
    return;
  }
  if (e.state === 'lobWindup') {
    e.t -= dt;
    if (e.t > 0) return;
    const n = e.phase2 ? this.boulders2 : this.boulders1;
    const ox = e.x + e.w / 2, oy = e.y + 8;
    for (let i = 0; i < n; i++) {
      const tx = p.x + p.w / 2 + (i - (n - 1) / 2) * 70; // spread the arcs
      fireBoulder(ox - 9, oy, tx, p.y + p.h / 2, fx);
    }
    e.state = 'idle';
    e.t = this.nextIdle();
  }
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const windupSlam = e.state === 'slamWindup';
  const windupLob = e.state === 'lobWindup';
  c.translate(0, e.state === 'stagger' ? 6 : windupSlam ? 5 : 0); // crouch poses
  c.fillStyle = '#4a5240'; // legs
  c.fillRect(-18, 26, 12, 8);
  c.fillRect(6, 26, 12, 8);
  c.fillStyle = '#707d63'; // body
  c.fillRect(-22, -14, 44, 42);
  c.fillStyle = '#8a9678'; // belly
  c.fillRect(-14, -2, 26, 28);
  c.fillStyle = '#707d63'; // head
  c.fillRect(-16, -32, 32, 20);
  c.fillStyle = e.phase2 ? '#ff8c42' : palette.white; // ember eyes in phase 2
  c.fillRect(6, -26, 5, 5);
  c.fillStyle = palette.white; // fang
  c.fillRect(8, -16, 3, 4);
  c.fillStyle = '#8a5f22'; // club shaft (raised per windup pose)
  const cx = windupSlam ? 4 : windupLob ? 22 : 18;
  const cy = windupSlam || windupLob ? -44 : -10;
  c.fillRect(cx, cy, 7, 28);
  c.fillStyle = '#6b4a32'; // club head
  c.fillRect(cx - 3, cy - 8, 13, 10);
  if (e.shield) { // stone slab at the front
    c.fillStyle = '#9aa0a8';
    c.fillRect(20, -20, 9, 44);
    c.fillStyle = '#6e747c';
    c.fillRect(23, -20, 3, 44);
  }
  if (e.flash > 0) { // hit flash
    c.globalAlpha = 0.7;
    c.fillStyle = palette.white;
    c.fillRect(-24, -36, 48, 72);
    c.globalAlpha = 1;
  }
  c.restore();
  if (!e.dead) { // hp pips, world space above the boss: two rows of 8 at 16 hp
    const n = pipMax(e, 16), per = n > 8 ? Math.ceil(n / 2) : n;
    for (let i = 0; i < n; i++) {
      const row = i < per ? 0 : 1, col = i % per;
      c.fillStyle = i < e.hp ? '#a3d977' : '#3a4034';
      c.fillRect(e.x + e.w / 2 - per * 4 + col * 8, e.y - 21 + row * 7, 7, 4);
    }
  }
}

register({
  kind: 'troll',
  w: 52, h: 64,
  hp: 16, stompable: false, // 8 before BOSS-PLAN B3
  boss: true, isTell: e => e.state === 'slamWindup' || e.state === 'lobWindup', // difficulty: scaled hp, slowed wind-ups
  idleMin: 1.0, idleMax: 1.6,
  staggerT: 0.3, flashT: 0.15,
  aggroRange: 600,
  windupSlam: 0.8, windupLob: 0.6, windupScale2: 0.7,
  slamHopDist: 300, slamHopTime: 0.4, // 220 before BOSS-PLAN B3
  shockSpeed: 240, // his waves (the shared default is 180)
  chainChance2: 0.5, chainScale: 0.6, // phase 2: a second slam, its windup 60 %
  shieldDurMin: 1.6, shieldDurMax: 2.2,
  shieldCdMin: 1.2, shieldCdMax: 2.0,
  shieldChance: 0.35, shieldChance2: 0.5, // 0.45 / 0.6 before BOSS-PLAN B3
  walkSpeed: 60, walkStop: 110, // the idle walk
  slamRange: 260, slamNear: 0.7, slamFar: 0.4, // slam share of the non-shield picks
  reactiveLook: 300, reactiveDelay: 0.15,
  reactiveChance: 0.75, reactiveChance2: 0.9, reactiveCooldown: 0.6, // 0.45 / 0.65 / 1.0 before BOSS-PLAN B3: the shield is his lesson
  boulders1: 2, boulders2: 3, phase2Hp: 8, // half, as before
  hitSound: 'bossHit', deathSound: 'boss', deathFx: FX.trollDeath,
  onHit, onDeath, update, nextIdle, draw,
});
