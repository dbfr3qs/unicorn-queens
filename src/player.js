// Player: state, physics (jump buffering, coyote time, squash & stretch), and drawing.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { shake } from './camera.js';
import { spawnLoot } from './loot.js';
import { fireArrow, FIRE_CD } from './arrows.js';

export const P_SPEED = 260, P_GRAVITY = 1200, P_JUMP_V = -560, P_BOUNCE_V = -320, P_TERM_VY = 800;
export const P_W = 28, P_H = 36, BIG_W = 40, BIG_H = 50, BIG_JUMP_V = P_JUMP_V * 1.35;
export const COYOTE = 0.08, JBUF = 0.12, JUMP_CUT = -180;

export function createPlayer(lvl) {
  return {
    x: 60, y: lvl.groundY - P_H, w: P_W, h: P_H,
    vx: 0, vy: 0,
    onGround: false,
    facing: 1,
    solidToBoxes: true,
    hp: 3,
    invuln: 0,
    dead: false,
    sx: 1, sy: 1, // squash & stretch
    coyote: 0, jbuf: 0, jumpHeld: false, cuttable: false,
    hasBow: false, fireCd: 0,
    big: false,
    won: false,
  };
}

export function updatePlayer(player, inp, lvl, cam, dt, fx) {
  if (player.dead || player.won) return;
  player.invuln = Math.max(0, player.invuln - dt);
  player.coyote = player.onGround ? COYOTE : Math.max(0, player.coyote - dt);
  if (inp.jump && !player.jumpHeld) player.jbuf = JBUF; // buffer the press
  player.jumpHeld = inp.jump;
  player.jbuf = Math.max(0, player.jbuf - dt);
  player.vx = (inp.right ? P_SPEED : 0) - (inp.left ? P_SPEED : 0);
  if (player.vx !== 0) player.facing = Math.sign(player.vx);
  player.fireCd = Math.max(0, player.fireCd - dt);
  if (inp.fire && player.hasBow && player.fireCd <= 0) { // unlimited arrows
    fireArrow(player);
    player.fireCd = FIRE_CD;
    fx.play('fire');
  }
  if (player.jbuf > 0 && player.coyote > 0) {
    player.vy = player.big ? BIG_JUMP_V : P_JUMP_V;
    player.jbuf = 0; player.coyote = 0; player.cuttable = true;
    player.sy = 1.25; player.sx = 0.8; // stretch upward
    fx.play('jump');
  }
  if (!inp.jump && player.cuttable && player.vy < JUMP_CUT) player.vy = JUMP_CUT; // variable height
  const prevVy = player.vy;
  player.vy = Math.min(player.vy + P_GRAVITY * dt, P_TERM_VY);
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(0, Math.min(player.x, lvl.width - player.w));
  const surface = resolveGroundCollision(player, lvl, dt);
  if (player.onGround && prevVy > 350) { // hard landing: squash + dust
    player.sy = 0.7; player.sx = 1.3;
    burst(player.x + player.w / 2, player.y + player.h, { count: 6, colors: ['#8d76b8', '#5d4a80'], speed: 60, size: 4, grav: -200, life: 0.35 });
    fx.play('land');
  }
  if (surface && surface.kind === 'box') {
    surface.broken = true;
    player.vy = P_BOUNCE_V; // hop off the broken box
    player.cuttable = false;
    spawnLoot(surface);
    fx.play('box');
    burst(surface.x + surface.w / 2, surface.y + surface.h / 2, { count: 14, colors: ['#c98f3d', '#8a5f22', '#e8b86d'], speed: 170, up: 120, size: 6, grav: 700, life: 0.6 });
    shake(cam, 4, 0.15);
  }
  player.sx += (1 - player.sx) * Math.min(1, dt * 14); // ease back to rest
  player.sy += (1 - player.sy) * Math.min(1, dt * 14);
  if (player.y > lvl.height) { player.dead = true; shake(cam, 10, 0.4); fx.play('die'); } // fell in a pit
}

export function drawPlayer(c, player, t) {
  c.save();
  c.translate(player.x + player.w / 2, player.y + player.h); // anchor at feet so squash compresses down
  const bs = player.big ? BIG_H / P_H : 1; // grown unicorn draws bigger
  c.scale(player.facing * player.sx * bs, player.sy * bs);
  if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) c.globalAlpha = 0.35;
  c.fillStyle = '#fff5fa';            // body
  c.fillRect(-14, -24, 28, 18);
  c.fillRect(6, -34, 12, 12);         // head
  c.fillStyle = '#ffd75e';            // horn
  c.beginPath();
  c.moveTo(13, -34); c.lineTo(17, -46); c.lineTo(19, -34);
  c.closePath(); c.fill();
  c.fillStyle = '#e78fd0';            // mane
  c.fillRect(2, -34, 5, 14);
  c.fillStyle = '#f3d9e6';            // legs
  c.fillRect(-12, -6, 5, 6);
  c.fillRect(7, -6, 5, 6);
  // ---- queen rider: blond hair, crown, light blue dress ----
  c.save();
  if (player.onGround && !player.dead && player.vx !== 0) // bob with the gallop
    c.translate(0, Math.sin(t * 16) * 0.8);
  c.fillStyle = '#f5d76e';            // blond hair flowing back
  c.fillRect(-7, -44, 4, 13);
  c.fillStyle = '#8fd3f4';            // light blue dress (hem drapes over the back)
  c.beginPath();
  c.moveTo(-3.5, -31); c.lineTo(3.5, -31); c.lineTo(6.5, -21); c.lineTo(-6.5, -21);
  c.closePath(); c.fill();
  c.fillRect(-3, -36, 7, 5);          // bodice
  c.fillStyle = '#ffe0c8';            // arm + face
  c.fillRect(2, -29, 9, 3);
  c.fillRect(-4, -44, 9, 8);
  c.fillStyle = '#3a2b4d';            // eye
  c.fillRect(1.5, -39.5, 2, 2.5);
  c.fillStyle = '#f5d76e';            // fringe over the forehead
  c.fillRect(-5, -45, 11, 4);
  c.fillStyle = '#ffd75e';            // crown
  c.fillRect(-4.5, -47.5, 10, 3);
  c.beginPath();
  c.moveTo(-4.5, -47.5); c.lineTo(-3, -51); c.lineTo(-1.5, -47.5);
  c.moveTo(-1, -47.5); c.lineTo(0.5, -52); c.lineTo(2, -47.5);
  c.moveTo(2.5, -47.5); c.lineTo(4, -51); c.lineTo(5.5, -47.5);
  c.closePath(); c.fill();
  c.fillStyle = '#ff5e78';            // crown gem
  c.fillRect(-0.5, -46.5, 1.5, 1.5);
  if (player.hasBow) { // bow held at the queen's hand
    c.strokeStyle = '#d9b380';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(11, -27, 6.5, -Math.PI / 2.5, Math.PI / 2.5);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(11 + 6.5 * Math.cos(-Math.PI / 2.5), -27 + 6.5 * Math.sin(-Math.PI / 2.5));
    c.lineTo(11 + 6.5 * Math.cos(Math.PI / 2.5), -27 + 6.5 * Math.sin(Math.PI / 2.5));
    c.stroke();
  }
  c.restore();
  c.restore();
}
