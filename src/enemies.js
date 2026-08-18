// Enemies: patrolling slimes, stomp vs side-contact resolution against the player.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { shake } from './camera.js';
import { P_GRAVITY, P_TERM_VY } from './player.js';
import { FX } from './effects.js';

export const E_SPEED = 90, E_W = 30, E_H = 28, E_STOMP_V = -400, HURT_INVULN = 1.5;

export function spawnEnemy(x, minX, maxX, lvl) {
  return {
    x, y: lvl.groundY - E_H, w: E_W, h: E_H,
    vx: 0, vy: 0, onGround: false,
    minX, maxX, dir: -1,
    dead: false,
  };
}

export function createEnemies(lvl) {
  return [
    spawnEnemy(560, 496, 664, lvl),
    spawnEnemy(1050, 980, 1260, lvl),
    spawnEnemy(1450, 1380, 1560, lvl),
    spawnEnemy(2000, 2010, 2125, lvl),
    spawnEnemy(2250, 2165, 2360, lvl),
  ];
}

export function updateEnemies(enemies, p, lvl, cam, dt, fx) {
  for (const e of enemies) {
    if (e.dead) continue;
    e.vx = e.dir * E_SPEED;
    e.vy = Math.min(e.vy + P_GRAVITY * dt, P_TERM_VY);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
    else if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
    resolveGroundCollision(e, lvl, dt);
    // stomp vs side contact
    if (!p.dead && p.invuln <= 0 &&
        p.x < e.x + e.w && p.x + p.w > e.x &&
        p.y < e.y + e.h && p.y + p.h > e.y) {
      if (p.vy > 0 && p.y + p.h - e.y < 16) {
        e.dead = true;   // stomped
        p.vy = E_STOMP_V; // bounce
        p.cuttable = false;
        fx.play('stomp');
        burst(e.x + e.w / 2, e.y + e.h / 2, FX.slimeDeath);
        shake(cam, 5, 0.18);
      } else {
        p.hp -= 1;
        p.invuln = HURT_INVULN;
        p.vy = -250;
        p.cuttable = false;
        fx.play('hurt');
        burst(p.x + p.w / 2, p.y + p.h / 2, FX.hurt);
        shake(cam, 8, 0.3);
        if (p.hp <= 0) { p.dead = true; fx.play('die'); }
      }
    }
  }
}
