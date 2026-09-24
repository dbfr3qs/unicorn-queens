// The Weaver Queen: the level 6 boss. A giant ground-crawling spider,
// 72×56, 16 hp, NOT stompable (a stomp just bounces the player off —
// the shared hitPlayer rule), arrow-only like the other bosses.
//
// AI: idle crawls toward the player at 60 px/s, clamped to its band
// (5900–6650); attacks picked by weight —
//  lunge:  0.5 s crouch (slither) -> dash at 380 px/s, up to 260 px,
//          0.6 s recover;
//  spit:   0.4 s windup -> a web glob (fireball flagged web: true)
//          aimed with the mage's lead; a hit = 1 damage + 2.5 s web-slow;
//  pillar: 0.6 s glint at the player's x (fixed at telegraph start) ->
//          a 40×140 web pillar rises 0.25 s, stands 0.8 s, decays 0.5 s;
//          it never moves — the dodge is walking off it;
//  volley: phase 2 only — three web boulders at player x −80/0/+80 on
//          the solved arc; 1 damage each, no slow.
// Phases: 1 (16→9) lunge 40 / spit 35 / pillar 25, idle 1.0–1.5 s;
//         2 (≤8)    lunge 30 / spit (double) 30 / pillar 25 / volley 15,
//          idle 0.7–1.1 s.
import { fireWebGlob, fireBoulder, FIREBALL_SPEED, BOULDER_SIZE } from '../projectiles.js';
import { hurtPlayer, WEB_SLOW_TIME } from '../player.js';
import { shake } from '../camera.js';
import { burst } from '../particles.js';
import { FX } from '../effects.js';
import { register } from './index.js';
import { phaseEdge, pipMax } from './phase.js';

export const PILLAR_TOTAL = 1.55; // rise 0.25 + stand 0.8 + decay 0.5
const PILLAR_SOLID = 1.05; // solid through rise + stand

function onHit(e) {
  e.flash = this.flashT;
  e.state = 'stagger';
  e.t = this.staggerT;
}

function onDeath(e, fx, cam) {
  shake(cam, 9, 0.6);
  burst(e.x + e.w / 2, e.y + e.h / 2, FX.spiderbossDeath);
}

function nextIdle(e) {
  return e.hp <= phaseEdge(e, this.phase2At, this.hp) ? 0.7 + Math.random() * 0.4 : 1.0 + Math.random() * 0.5;
}

// Attack pick: phase 1 lunge 40 / spit 35 / pillar 25;
// phase 2 lunge 30 / spit (double) 30 / pillar 25 / volley 15.
function pickAttack(e, p, lvl, fx) {
  const p2 = e.hp <= phaseEdge(e, this.phase2At, this.hp);
  const r = Math.random() * 100;
  if (p2 ? r < 30 : r < 40) {
    e.state = 'lungeTele';
    e.t = this.lungeTele;
    e.lungeDir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1;
    fx.play('slither');
  } else if (p2 ? r < 60 : r < 75) {
    e.state = 'spitWind';
    e.t = this.spitWind;
    e.spitCount = p2 ? 2 : 1;
  } else if (p2 ? r < 85 : r < 100) {
    e.state = 'pillarTele';
    e.t = this.pillarTele;
    // the glint locks the pillar's x at the START of the telegraph:
    // you dodge by walking off it, not by outlasting it. Clamped to the
    // Queen's band — a pillar may never rise in the mire, where the
    // glint would be off-screen and the hit unreadable.
    e.pillarX = Math.max(e.minX, Math.min(e.maxX - 40, p.x + p.w / 2 - 20));
  } else {
    e.state = 'volley'; // phase 2 only (phase 1's weights fill 0–100)
    e.t = 0.2; // a beat with the eggs raised, then they leave
    e.volleyX = Math.round(p.x + p.w / 2);
  }
}

// The web pillar's life (rise -> stand -> decay) and its contact rule.
// Lives on the boss (e.pillars); called from game.update with the cam
// (the boss brain has no camera). Contact while solid = 1 damage + slow.
export function updatePillars(e, p, lvl, cam, dt, fx) {
  if (!e.pillars || e.pillars.length === 0) return;
  for (const q of e.pillars) q.t += dt;
  e.pillars = e.pillars.filter(q => q.t < PILLAR_TOTAL);
  for (const q of e.pillars) {
    if (q.t >= PILLAR_SOLID || p.dead || p.invuln > 0) continue;
    const top = q.gy - q.h;
    if (p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.gy && p.y + p.h > top) {
      if (hurtPlayer(p, cam, fx)) p.webT = WEB_SLOW_TIME;
    }
  }
}

function update(e, { p, lvl, dt, fx }) {
  if (e.state === undefined) {
    e.state = 'idle';
    e.t = 1.2; // first breath before attacking
    e.flash = 0;
    e.pillars = [];
    e.legPhase = 0;
  }
  e.flash = Math.max(0, e.flash - dt);
  e.pillars = e.pillars ?? []; // tests may start mid-telegraph
  e.legPhase += dt * (e.state === 'lunge' ? 26 : 6);
  e.dir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1; // face the player

  if (e.state === 'stagger') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'idle'; e.t = nextIdle.call(this, e); }
    return; // frozen, legs splayed
  }
  if (e.state === 'lungeTele') {
    e.t -= dt; // the crouch (the tell)
    if (e.t <= 0) { e.state = 'lunge'; e.lunged = 0; }
    return;
  }
  if (e.state === 'lunge') {
    // the dash stops at its distance or at the band edge
    e.x += e.lungeDir * this.lungeSpeed * dt;
    e.lunged += this.lungeSpeed * dt;
    if (e.lunged >= this.lungeDist || e.x <= e.minX || e.x + e.w >= e.maxX) {
      e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x));
      e.state = 'lungeRec';
      e.t = this.lungeRec;
    }
    return;
  }
  if (e.state === 'lungeRec') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'idle'; e.t = nextIdle.call(this, e); }
    return;
  }
  if (e.state === 'spitWind') {
    e.t -= dt;
    if (e.t <= 0) {
      const ox = e.x + e.w / 2 + e.dir * 30, oy = e.y + e.h / 2; // the fangs
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const tFlight = Math.hypot(cx - ox, cy - oy) / FIREBALL_SPEED || 1;
      const tx = Math.max(0, Math.min(lvl.width, cx + p.vx * tFlight)); // lead the player
      const dx = tx - ox, dy = cy - oy;
      const d = Math.hypot(dx, dy) || 1;
      fireWebGlob(ox - 7, oy - 7, dx / d * FIREBALL_SPEED, dy / d * FIREBALL_SPEED, fx);
      if (e.spitCount > 1) { e.spitCount = 1; e.t = 0.25; return; } // a second glob after a beat
      e.state = 'idle';
      e.t = nextIdle.call(this, e);
    }
    return;
  }
  if (e.state === 'pillarTele') {
    e.t -= dt;
    if (e.t <= 0) {
      e.pillars.push({ x: e.pillarX, w: 40, h: 140, gy: lvl.groundY, t: 0 });
      e.state = 'idle';
      e.t = nextIdle.call(this, e);
    }
    return;
  }
  if (e.state === 'volley') {
    e.t -= dt;
    if (e.t <= 0) {
      for (const off of [-80, 0, 80]) {
        fireBoulder(e.x + e.w / 2 - BOULDER_SIZE / 2, e.y + 8,
          e.volleyX + off, lvl.groundY - BOULDER_SIZE, fx, true); // the web eggs
      }
      e.state = 'idle';
      e.t = nextIdle.call(this, e);
    }
    return;
  }
  // idle: crawl toward the player at 60 px/s, clamped to the band
  e.t -= dt;
  const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
  if (Math.abs(dx) > 4) e.x += Math.sign(dx) * Math.min(this.idleSpeed * dt, Math.abs(dx));
  e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x));
  if (e.t <= 0) pickAttack.call(this, e, p, lvl, fx);
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h); // anchor at the feet
  c.scale(e.dir, 1);
  const crouched = e.state === 'lungeTele'; // the squash crouch
  const staggered = e.state === 'stagger';
  const bodyY = crouched ? 14 : 18;
  const legAnim = Math.sin(e.legPhase) * (crouched ? 2 : 5);
  c.strokeStyle = '#23232e'; // 8 long jointed legs: 4 per side
  c.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const lx = -26 + i * 15;
    const lift = staggered ? 0 : legAnim * (i % 2 ? 1 : -1);
    c.beginPath();
    c.moveTo(lx, -bodyY + 6);
    c.lineTo(lx - 14, -bodyY - 14 + lift);
    c.lineTo(lx - 22, -2 + lift);
    c.stroke();
    c.beginPath();
    c.moveTo(lx, -bodyY + 8);
    c.lineTo(lx - 12, -bodyY - 4 - lift);
    c.lineTo(lx - 20, 2 - lift);
    c.stroke();
  }
  c.fillStyle = '#3a3a48'; // the great abdomen
  c.beginPath(); c.ellipse(-12, -bodyY - 6, 24, 18, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(232, 224, 208, 0.5)'; // the pale web pattern
  c.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    c.beginPath(); c.ellipse(-12, -bodyY - 6, 18 - i * 5, 13 - i * 3.5, 0, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = '#4a4a58'; // the cephalothorax
  c.beginPath(); c.ellipse(14, -bodyY, 12, 10, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a5a6a'; // the fanged head
  c.fillRect(20, -bodyY - 8, 14, 12);
  c.fillStyle = '#e8e0d0'; // the fangs
  c.fillRect(30, -bodyY + 2, 3, 7);
  c.fillRect(26, -bodyY + 2, 3, 6);
  c.fillStyle = e.state === 'spitWind' ? '#ffd166' : '#ff4444'; // four glowing eyes
  c.fillRect(27, -bodyY - 6, 3, 3);
  c.fillRect(23, -bodyY - 6, 3, 3);
  c.fillRect(27, -bodyY - 2, 3, 3);
  c.fillRect(23, -bodyY - 2, 3, 3);
  if (e.state === 'spitWind') { // the windup: the fangs open wide
    c.fillStyle = 'rgba(240, 240, 248, 0.5)';
    c.beginPath(); c.ellipse(30, -bodyY + 6, 6, 4, 0, 0, Math.PI * 2); c.fill();
  }
  if (e.flash > 0) { // hit flash
    c.globalAlpha = 0.7;
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(-4, -bodyY - 4, 30, 20, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
  // world-space extras (no camera in draw): the pillars, the glint, pips
  for (const q of e.pillars ?? []) {
    const grow = Math.min(1, q.t / 0.25);
    const a = q.t < PILLAR_SOLID ? 1 : 1 - (q.t - PILLAR_SOLID) / 0.5;
    const h = q.h * grow;
    const top = q.gy - h;
    c.globalAlpha = a * 0.85;
    c.fillStyle = 'rgba(240, 240, 248, 0.5)'; // the column
    c.fillRect(q.x, top, q.w, h);
    c.strokeStyle = 'rgba(232, 232, 240, 0.9)'; // the threads
    c.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.moveTo(q.x + (q.w / 4) * i, top);
      c.lineTo(q.x + (q.w / 4) * i, q.gy);
      c.stroke();
    }
    for (let j = 1; j < 6; j++) { // cross threads
      const y = q.gy - (h / 6) * j;
      c.beginPath();
      c.moveTo(q.x, y);
      c.quadraticCurveTo(q.x + q.w / 2, y + 4, q.x + q.w, y);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  if (e.state === 'pillarTele' && e.pillarX !== undefined) { // the glint
    const gx = e.pillarX + 20;
    const pulse = 0.5 + 0.5 * Math.sin(e.t * 20);
    c.fillStyle = 'rgba(255, 209, 102, ' + (0.4 + 0.5 * pulse).toFixed(2) + ')';
    c.beginPath();
    c.moveTo(gx, e.y + e.h - 10);
    c.lineTo(gx + 8, e.y + e.h - 2);
    c.lineTo(gx, e.y + e.h + 4);
    c.lineTo(gx - 8, e.y + e.h - 2);
    c.closePath();
    c.fill();
  }
  if (!e.dead) { // hp pips: two rows of eight, world space above the Queen
    const n = pipMax(e, 16), per = Math.ceil(n / 2); // two rows
    for (let i = 0; i < n; i++) {
      const row = i < per ? 0 : 1, col = i % per;
      c.fillStyle = i < e.hp ? '#e33' : '#522';
      c.fillRect(e.x + e.w / 2 - per * 6 + col * 12, e.y - 22 + row * 7, 10, 4);
    }
  }
}

register({
  kind: 'spiderboss',
  w: 72, h: 56,
  hp: 16, stompable: false,
  phase2At: 8,
  idleSpeed: 60,
  lungeTele: 0.5, lungeSpeed: 380, lungeDist: 260, lungeRec: 0.6,
  spitWind: 0.4,
  pillarTele: 0.6,
  staggerT: 0.3, flashT: 0.15,
  hitSound: 'bossHit', deathSound: 'growl',
  onHit, onDeath,
  update, nextIdle, draw,
});
