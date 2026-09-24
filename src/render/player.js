// Player rendering: unicorn + queen rider, squash & stretch, bow.
//
// Two bodies live here. A generated sheet is the unicorn AND the rider — both are in the
// one sprite — while every state overlay (lantern, boots, wings, web, shield, bow) draws
// over the top of it. Before the PNG has decoded, or anywhere that cannot decode one at
// all, the original vector art draws instead and nothing else changes. The overlays are
// positioned from whichever body actually went down, not from a guess.
import { P_H, BIG_H, webSlowTime } from '../player.js';
import { palette } from './theme.js';
import { sprite, frameAt } from '../sprites.js';
import { drawSpriteFeet, scaleToHeight } from './sprite.js';

// The vector character stands 52px above its feet, hooves to crown tip. The sprite is
// drawn to the same height so it sits correctly beside art that has not been migrated.
const DRAW_H = 52;

// Where the state overlays attach.
//
// The vector art and the sprite put the hooves, horn and rider in different places, so
// each set gets its own anchors and the effects read from whichever is drawing. The sprite
// figures were measured off assets/sprites/player.png — hoof columns from the alpha in the
// bottom rows, horn tip as the highest point on the head side — not estimated by eye.
const ANCHOR = {
  vector: { hoofY: -3, hoofBack: -13, hoofFront: 6, horn: [13, -46],
            head: [17, -22], hand: [11, -27], back: [-10, -32], mid: [0, -24] },
  sprite: { hoofY: -2, hoofBack: -15, hoofFront: 9, horn: [20, -42],
            head: [22, -30], hand: [8, -30], back: [-8, -30], mid: [0, -26] },
};

// Frame from state the game already tracks; no new player fields.
//
// player_jump carries two HELD poses rather than a cycle — rising and falling — so it is
// indexed by the sign of vy, not by time. Its manifest fps is 0 to say so.
function playerFrame(player, t) {
  if (player.dead) return { sheet: 'player', frame: 0 };
  if (!player.onGround) return { sheet: 'player_jump', frame: player.vy < 0 ? 0 : 1 };
  if (player.vx !== 0) return { sheet: 'player_run', frame: frameAt('player_run', t) };
  return { sheet: 'player', frame: 0 };
}

export function drawPlayer(c, player, t) {
  if (player.reviving > 0) return; // easy's revive beat: gone for a moment
  c.save();
  c.translate(player.x + player.w / 2, player.y + player.h); // anchor at feet so squash compresses down
  const bs = player.big ? BIG_H / P_H : 1; // grown unicorn draws bigger
  c.scale(player.facing * player.sx * bs, player.sy * bs);
  // Which body is about to be drawn, asked of the sheet itself rather than of
  // the environment: the overlays below (boots, horn glint, the lantern's
  // centre) are positioned off it, and until the PNG decodes it is the vector
  // body on screen. Guessing from the environment put the boots on the wrong
  // hooves for the first few frames of every level.
  const { sheet, frame } = playerFrame(player, t);
  const useSprite = !!sprite(sheet);
  const A = useSprite ? ANCHOR.sprite : ANCHOR.vector;
  if (player.lantern > 0) { // lantern: warm radial glow around the rider
    const g = c.createRadialGradient(A.mid[0], A.mid[1], 8, A.mid[0], A.mid[1], 90);
    g.addColorStop(0, 'rgba(255, 205, 130, 0.35)');
    g.addColorStop(1, 'rgba(255, 205, 130, 0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(A.mid[0], A.mid[1], 90, 0, Math.PI * 2); c.fill();
  }
  if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) c.globalAlpha = 0.35;
  const drewSprite = drawSpriteFeet(c, sheet, frame, scaleToHeight(sheet, DRAW_H));
  if (!drewSprite) {
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
  }
  if (player.boots > 0) {             // bounce boots: golden shoes, one per hoof
    c.fillStyle = palette.gold;
    c.fillRect(A.hoofBack, A.hoofY, 7, 3);
    c.fillRect(A.hoofFront, A.hoofY, 7, 3);
    c.fillStyle = '#fff';             // glint
    c.fillRect(A.hoofBack + 2, A.hoofY, 2, 1);
    c.fillRect(A.hoofFront + 2, A.hoofY, 2, 1);
  }
  if (player.hopFx > 0) { // levitation hop: brief wing shimmer
    const a = Math.round(Math.min(1, player.hopFx / 0.35) * 8) / 8;
    c.fillStyle = 'rgba(255, 255, 255, ' + a + ')';
    c.beginPath(); c.ellipse(-3, -26, 6, 3, -0.4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(1, -24, 5, 2.5, -0.4, 0, Math.PI * 2); c.fill();
  }
  if (player.flying) { // flight spell: flapping wings
    const flap = Math.sin(t * 16) * 3;
    c.fillStyle = 'rgba(255, 255, 255, 0.85)';
    c.beginPath(); c.ellipse(A.back[0], A.back[1] + flap, 9, 4, -0.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(A.back[0] + 6, A.back[1] + 5 - flap, 7, 3.5, -0.4, 0, Math.PI * 2); c.fill();
  }
  if (player.webT > 0) { // web-slow: white threads wrapped across the sprite
    const a = Math.min(1, (webSlowTime() - player.webT) / 0.2) * 0.8; // ramps in over the first 0.2 s
    c.strokeStyle = 'rgba(240, 240, 248, ' + a.toFixed(2) + ')';
    c.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { // three wrapped threads
      c.beginPath();
      c.moveTo(-16, -8 - i * 7);
      c.quadraticCurveTo(0, -4 - i * 7, 16, -8 - i * 7);
      c.stroke();
    }
    c.beginPath(); // a thread trailing behind
    c.moveTo(-player.facing * 14, -14);
    c.quadraticCurveTo(-player.facing * 26, -12, -player.facing * 34, -18);
    c.stroke();
  }
  if (player.shield > 0) { // mirror shield: moon disc + charge pips
    c.fillStyle = '#cfe8ff';
    c.beginPath(); c.arc(A.head[0], A.head[1], 4.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8fd3f4';
    c.beginPath(); c.arc(A.head[0], A.head[1], 2, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 3; i++) { // pips over the head (mage precedent)
      c.fillStyle = i < player.shield ? '#8fd3f4' : 'rgba(143, 211, 244, 0.35)';
      c.fillRect(-6 + i * 5, -60, 4, 2.5);
    }
  }
  // ---- queen rider: blond hair, crown, light blue dress ----
  c.save();
  // the sprite already gallops, so the vector rider's bob would double it up
  if (!drewSprite && player.onGround && !player.dead && player.vx !== 0)
    c.translate(0, Math.sin(t * 16) * 0.8);
  if (!drewSprite) {
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
  }
  if (player.hasBow) { // bow held at the queen's hand
    c.strokeStyle = palette.wood;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(A.hand[0], A.hand[1], 6.5, -Math.PI / 2.5, Math.PI / 2.5);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(A.hand[0] + 6.5 * Math.cos(-Math.PI / 2.5), A.hand[1] + 6.5 * Math.sin(-Math.PI / 2.5));
    c.lineTo(A.hand[0] + 6.5 * Math.cos(Math.PI / 2.5), A.hand[1] + 6.5 * Math.sin(Math.PI / 2.5));
    c.stroke();
  }
  c.restore();
  c.restore();
}
