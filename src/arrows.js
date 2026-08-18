// Arrows: firing, flight, enemy hits, box breaks. Module-owned arrow list.
import { burst } from './particles.js';
import { spawnLoot } from './loot.js';
import { shake } from './camera.js';

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

export function updateArrows(enemies, lvl, cam, dt, fx) {
  for (const a of arrows) {
    if (a.dead) continue;
    a.x += a.vx * dt;
    if (a.x < -20 || a.x > lvl.width + 20) { a.dead = true; continue; }
    for (const e of enemies) { // hit an enemy
      if (e.dead) continue;
      if (a.x < e.x + e.w && a.x + 14 > e.x && a.y < e.y + e.h && a.y + 4 > e.y) {
        e.dead = true;
        a.dead = true;
        fx.play('thwack');
        burst(e.x + e.w / 2, e.y + e.h / 2, { count: 12, colors: ['#b57edc', '#fff5fa'], speed: 160, up: 100, size: 5, grav: 400, life: 0.5 });
        shake(cam, 3, 0.12);
        break;
      }
    }
    if (a.dead) continue;
    for (const b of lvl.boxes) { // break a box from range
      if (b.broken) continue;
      if (a.x < b.x + b.w && a.x + 14 > b.x && a.y < b.y + b.h && a.y + 4 > b.y) {
        b.broken = true;
        a.dead = true;
        fx.play('box');
        spawnLoot(b);
        burst(b.x + b.w / 2, b.y + b.h / 2, { count: 14, colors: ['#c98f3d', '#8a5f22', '#e8b86d'], speed: 170, up: 120, size: 6, grav: 700, life: 0.6 });
        shake(cam, 4, 0.15);
        break;
      }
    }
  }
  for (let i = arrows.length - 1; i >= 0; i--) if (arrows[i].dead) arrows.splice(i, 1);
}

export function drawArrows(c) {
  for (const a of arrows) {
    c.save();
    c.translate(a.x, a.y);
    c.scale(Math.sign(a.vx), 1);
    c.fillStyle = '#d9b380'; // shaft
    c.fillRect(0, 1, 10, 2);
    c.fillStyle = '#e8e8f0'; // head
    c.beginPath();
    c.moveTo(10, 0); c.lineTo(15, 2); c.lineTo(10, 4);
    c.closePath();
    c.fill();
    c.restore();
  }
}
