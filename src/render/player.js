// Player rendering: unicorn + queen rider, squash & stretch, bow.
import { P_H, BIG_H } from '../player.js';
import { palette } from './theme.js';

export function drawPlayer(c, player, t) {
  c.save();
  c.translate(player.x + player.w / 2, player.y + player.h); // anchor at feet so squash compresses down
  const bs = player.big ? BIG_H / P_H : 1; // grown unicorn draws bigger
  c.scale(player.facing * player.sx * bs, player.sy * bs);
  if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) c.globalAlpha = 0.35;
  c.fillStyle = palette.unicornWhite; // body
  c.fillRect(-14, -24, 28, 18);
  c.fillRect(6, -34, 12, 12);         // head
  c.fillStyle = palette.gold;         // horn
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
  c.fillStyle = palette.gold;         // crown
  c.fillRect(-4.5, -47.5, 10, 3);
  c.beginPath();
  c.moveTo(-4.5, -47.5); c.lineTo(-3, -51); c.lineTo(-1.5, -47.5);
  c.moveTo(-1, -47.5); c.lineTo(0.5, -52); c.lineTo(2, -47.5);
  c.moveTo(2.5, -47.5); c.lineTo(4, -51); c.lineTo(5.5, -47.5);
  c.closePath(); c.fill();
  c.fillStyle = '#ff5e78';            // crown gem
  c.fillRect(-0.5, -46.5, 1.5, 1.5);
  if (player.hasBow) { // bow held at the queen's hand
    c.strokeStyle = palette.wood;
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
