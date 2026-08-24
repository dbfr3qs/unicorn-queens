// Arrows: firing, flight, enemy hits, box breaks. Module-owned arrow list.
import { burst } from './particles.js';
import { spawnLoot } from './loot.js';
import { shake } from './camera.js';
import { damageEnemy } from './enemies.js';
import { FX } from './effects.js';
import { MARKER_GLINT } from './key.js';

export const arrows = [];
export const ARROW_SPEED = 520, FIRE_CD = 0.22;

export function resetArrows() {
  arrows.length = 0;
}

export function fireArrow(p) {
  arrows.push({
    x: p.facing > 0 ? p.x + p.w : p.x - 14,
    y: p.y + p.h - 24, // chest height at either size, so ground enemies are still hit
    vx: p.facing * ARROW_SPEED,
    dead: false,
  });
}

// Star arrow: pierces up to 2 enemies (never re-hitting one), shatters
// boxes in its path and keeps flying, no gravity (like every arrow here).
export function fireStarArrow(p) {
  arrows.push({
    x: p.facing > 0 ? p.x + p.w : p.x - 14,
    y: p.y + p.h - 24,
    vx: p.facing * ARROW_SPEED,
    dead: false,
    star: true, pierces: 2, hit: new Set(),
  });
}

export function updateArrows(enemies, lvl, cam, dt, fx, viewW = 800) {
  for (const a of arrows) {
    if (a.dead) continue;
    a.x += a.vx * dt;
    // Arrows only affect what's on screen: they vanish at the viewport
    // edge (small grace so a shot fired from the screen edge still leaves
    // the bow). No more sniping enemies or boxes across the level.
    if (a.x > cam.x + viewW + 20 || a.x + 14 < cam.x - 20) { a.dead = true; continue; }
    for (const e of enemies) { // hit an enemy
      if (e.dead || (a.hit && a.hit.has(e))) continue; // no double-dips
      if (a.x < e.x + e.w && a.x + 14 > e.x && a.y < e.y + e.h && a.y + 4 > e.y) {
        damageEnemy(e, fx, cam); // hp, per-kind hit reaction, death at 0
        shake(cam, 3, 0.12);
        if (a.star) { // pierce: remember the hit, keep flying on budget
          a.hit.add(e);
          a.pierces -= 1;
          if (a.pierces <= 0) { a.dead = true; break; }
          continue;
        }
        a.dead = true;
        break;
      }
    }
    if (a.dead) continue;
    for (const b of lvl.boxes) { // break a box from range
      if (b.broken) continue;
      if (a.x < b.x + b.w && a.x + 14 > b.x && a.y < b.y + b.h && a.y + 4 > b.y) {
        b.broken = true;
        fx.play('box');
        if (spawnLoot(b) === null) fx.play('fizzle'); // mystery dud: nothing fell
        burst(b.x + b.w / 2, b.y + b.h / 2, FX.boxBreak);
        shake(cam, 4, 0.15);
        if (!a.star) a.dead = true; // stars shatter the box and keep flying
        break;
      }
    }
    if (a.dead) continue;
    if (lvl.marker && // marker brick: purely visual glint, the arrow passes through
        a.x < lvl.marker.x + lvl.marker.w && a.x + 14 > lvl.marker.x &&
        a.y < lvl.marker.y + lvl.marker.h && a.y + 4 > lvl.marker.y) {
      lvl.marker.glintT = MARKER_GLINT;
    }
  }
  for (let i = arrows.length - 1; i >= 0; i--) if (arrows[i].dead) arrows.splice(i, 1);
}
