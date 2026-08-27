// The Unicorn Queen (level 5): the final boss in narrative weight, with
// no hp and no attacks — walk-through, drawn in front of the player (he
// walks "to" her). A 48×72 white unicorn: body, four legs, neck + head,
// gold horn with a periodic sparkle, lavender mane + tail, gold collar.
// The head, mane and tail bob gently (sin, 0.5 Hz); she faces the player.
import { game } from '../game.js';
import { palette } from './theme.js';

export function drawQueen(c, lvl, t) {
  const q = lvl.queen;
  if (!q) return;
  const p = game.player;
  const facing = (p.x + p.w / 2) >= (q.x + q.w / 2) ? 1 : -1;
  const bob = Math.sin(t * Math.PI) * 2; // 0.5 Hz
  const { x, y } = q; // w 48, h 72; y + 72 sits on the ground
  c.fillStyle = palette.unicornWhite;
  c.fillRect(x + 5, y + 56, 6, 16); // four legs
  c.fillRect(x + 15, y + 58, 6, 14);
  c.fillRect(x + 27, y + 58, 6, 14);
  c.fillRect(x + 37, y + 56, 6, 16);
  c.beginPath(); c.ellipse(x + 24, y + 44, 20, 15, 0, 0, Math.PI * 2); c.fill(); // body
  c.fillStyle = palette.lavender; // tail tuft on the far side
  c.beginPath(); c.ellipse(x + 24 - facing * 20, y + 38 + bob / 2, 5, 9, 0, 0, Math.PI * 2); c.fill();
  const hx = x + 24 + facing * 13, hy = y + 18 + bob; // head centre
  c.fillStyle = palette.unicornWhite;
  c.beginPath(); // neck wedge from the body to the head
  c.moveTo(x + 24 + facing * 6, y + 40);
  c.lineTo(hx - 7, hy + 6);
  c.lineTo(hx + 7, hy + 6);
  c.closePath(); c.fill();
  c.beginPath(); c.arc(hx, hy, 9, 0, Math.PI * 2); c.fill(); // head
  for (let i = 0; i < 3; i++) { // mane: three lavender tufts down the neck
    c.fillStyle = palette.lavender;
    c.beginPath();
    c.arc(x + 24 - facing * (4 + i * 5), y + 40 - i * 7 + bob * (1 - i / 3), 4.5 - i * 0.5, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = palette.gold;
  c.fillRect(x + 24 + facing * 2 - 5, y + 33 + bob * 0.4, 10, 3); // gold collar
  c.beginPath(); // the gold horn, up and toward the player
  c.moveTo(hx + facing * 2 - 3, hy - 6);
  c.lineTo(hx + facing * 6, hy - 22);
  c.lineTo(hx + facing * 2 + 3, hy - 6);
  c.closePath(); c.fill();
  if (Math.sin(t * 2 + 1.3) > 0.55) { // periodic horn sparkle
    c.fillStyle = palette.white;
    c.fillRect(hx + facing * 6 - 1, hy - 25, 2, 2);
  }
  c.fillStyle = '#33234f'; // eye
  c.fillRect(hx + facing * 4 - 1, hy - 2, 2, 2);
}
