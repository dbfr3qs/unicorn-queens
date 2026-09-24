// The lab's player: a simple, fair-minded bot for the boss fights.
//
// Every frame it looks 0.8 s ahead. It predicts where each threat it has
// had time to notice will be (a ¼ s reaction: anything newer is invisible
// to it), and tries the six things a thumb can do — stay, left, right,
// each with or without a jump — against those predictions. It takes the
// safest; among equally safe ones it prefers a comfortable distance from
// the boss, standing still, and not jumping (so it can shoot). It turns to
// face the boss when standing, fires whenever the boss is in the arrow's
// line, and jumps to shoot a boss hovering just above its reach.
import { game } from '../src/game.js';
import { input } from '../src/input.js';
import { fireballs, boulders, shockwaves, cones, coneSegment, CONE_SEGS, BOULDER_G } from '../src/projectiles.js';
import { spikeRect } from '../src/enemies/queenboss.js';
import { P_SPEED, P_GRAVITY, P_JUMP_V } from '../src/player.js';

export const REACT = 0.25; // s before a new threat can be seen
const LOOK = [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8]; // s ahead
const JUMP_REACH = (P_JUMP_V * P_JUMP_V) / (2 * P_GRAVITY); // ~130 px of rise

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function createBot(boss, arena, keep = 260) {
  return { boss, arena, keep, now: 0, seen: new WeakMap(), stateAt: 0, lastState: null, lastBx: boss.x, lastBy: boss.y, bvx: 0, bvy: 0, jumpHeld: false };
}

// Has the bot had time to notice this object?
function noticed(bot, o) {
  if (!bot.seen.has(o)) bot.seen.set(o, bot.now);
  return bot.now - bot.seen.get(o) >= REACT;
}

// Threats as rect(t) → rect | rect[] | null, t seconds from now.
function threats(bot) {
  const out = [];
  const e = bot.boss, lvl = game.level, gy = lvl.groundY;
  for (const f of fireballs) {
    if (f.dead || f.reflected || !noticed(bot, f)) continue;
    out.push(t => ({ x: f.x + f.vx * t, y: f.y + f.vy * t, w: f.w, h: f.h }));
  }
  for (const b of boulders) {
    if (b.dead || !noticed(bot, b)) continue;
    out.push(t => ({ x: b.x + b.vx * t, y: b.y + b.vy * t + 0.5 * BOULDER_G * t * t, w: b.w, h: b.h }));
  }
  for (const s of shockwaves) {
    if (s.dead || !noticed(bot, s)) continue;
    out.push(t => ({ x: s.x + (s.vx ?? 0) * t, y: s.y, w: s.w, h: s.h }));
  }
  for (const c of cones) {
    if (c.dead || !noticed(bot, c)) continue;
    const segs = [];
    for (let i = 0; i < CONE_SEGS; i++) { const s = coneSegment({ ...c, age: Math.max(c.age, 0.15) }, i); segs.push({ x: s.x - s.r, y: s.y - s.r, w: 2 * s.r, h: 2 * s.r }); }
    out.push(t => (c.age + t < c.ttl ? segs : null));
  }
  // The boss's body, moving as it has been.
  if (!e.dead && !e.sleeping) out.push(t => ({ x: e.x + bot.bvx * t, y: e.y + bot.bvy * t, w: e.w, h: e.h }));
  // Floor telegraphs: seen REACT after the tell begins.
  const told = bot.now - bot.stateAt >= REACT;
  for (const q of e.pillars ?? []) out.push(t => (q.t + t < 1.05 ? { x: q.x, y: q.gy - q.h, w: q.w, h: q.h } : null));
  if (e.state === 'pillarTele' && told && e.pillarX !== undefined) out.push(t => (t >= e.t ? { x: e.pillarX, y: gy - 140, w: 40, h: 140 } : null));
  for (const col of e.columns ?? []) if (!col.dead && !col.hit) out.push(t => (col.t + t < 1.1 ? { x: col.x, y: col.baseY - col.h, w: col.w, h: col.h } : null));
  if (e.state === 'sealTele' && told && typeof e.sealX === 'number') out.push(t => (t >= e.t ? { x: e.sealX - 20, y: gy - 140, w: 40, h: 140 } : null));
  for (const sp of e.spikes ?? []) if (noticed(bot, sp)) out.push(t => spikeRect({ ...sp, t: sp.t + t }, gy));
  if ((e.state === 'sweepTele' && told) || e.state === 'sweep') {
    const dir = e.sweepDir ?? 1;
    const x0 = dir === 1 ? e.x + e.w : e.x - 120 - 240;
    out.push(() => ({ x: x0, y: gy - 64, w: 360, h: 64 }));
  }
  return out;
}

// Where the player would be t s from now under an action.
function predict(p, dir, jump, t, floorY, arena) {
  const x = Math.max(arena[0], Math.min(arena[1] - p.w, p.x + dir * P_SPEED * t));
  let vy = p.vy;
  if (jump && p.onGround) vy = P_JUMP_V;
  const y = Math.min(floorY, p.y + vy * t + 0.5 * P_GRAVITY * t * t);
  return { x, y, w: p.w, h: p.h };
}

export function botStep(bot, dt) {
  const p = game.player, e = bot.boss;
  bot.now += dt;
  if (e.state !== bot.lastState) { bot.lastState = e.state; bot.stateAt = bot.now; }
  bot.bvx = (e.x - bot.lastBx) / dt; bot.bvy = (e.y - bot.lastBy) / dt;
  bot.lastBx = e.x; bot.lastBy = e.y;
  const floorY = game.level.groundY - p.h;
  const ts = threats(bot);
  const bcx = e.x + e.w / 2, pcx = p.x + p.w / 2;
  const toward = Math.sign(bcx - pcx) || 1;
  const arrowY = y => y + p.h - 24;
  // A hovering boss just above the arrow line: worth a jump-shot.
  const above = e.y + e.h < arrowY(p.y) && e.y + e.h > arrowY(p.y) - JUMP_REACH;
  let best = null;
  for (const dir of [0, -1, 1]) {
    for (const jump of [false, true]) {
      if (jump && !p.onGround) continue;
      let danger = 0;
      for (const t of LOOK) {
        const r = predict(p, dir, jump, t, floorY, bot.arena);
        for (const th of ts) {
          const got = th(t);
          if (got && [].concat(got).some(g => overlap(r, g))) { danger += 1 / t; break; }
        }
      }
      const end = predict(p, dir, jump, 0.4, floorY, bot.arena);
      const gap = Math.abs(e.x + e.w / 2 - (end.x + end.w / 2));
      let cost = danger * 100 + Math.abs(gap - bot.keep) / 50 + (dir !== 0 ? 0.3 : 0) + (jump ? 0.5 : 0);
      if (jump && above) cost -= 1; // jump to shoot it
      if (!best || cost < best.cost) best = { dir, jump, cost };
    }
  }
  input.left = best.dir === -1;
  input.right = best.dir === 1;
  const press = best.jump && !bot.jumpHeld;
  input.jump = press;
  bot.jumpHeld = press;
  if (best.dir === 0) p.facing = toward; // turning on the spot
  const ay = arrowY(p.y);
  input.fire = p.facing === toward && ay > e.y && ay < e.y + e.h;
}

export function releaseAll() {
  input.left = input.right = input.jump = input.fire = input.up = input.down = input.cast = false;
}
