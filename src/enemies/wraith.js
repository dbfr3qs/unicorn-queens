// Wraith: a mountain ghost bound to the frost. Hovers at its anchor
// with a ±6 px bob; within 260 px it drifts at the player 45 px/s, and
// within 120 px it descends to the ground-arrow band (chest height,
// y = groundY − 44) and holds — a ground arrow pops it. It disengages
// only when the player is > 320 px away, then eases back to its anchor.
// Unstompable: the codified ghost bounce (Deviation 4). The snowfield
// wraiths are drawn with a wind-phase alpha (thicker through the gust —
// the wind "carries" them, a frost rim on the body); the arena wraiths
// (bound) are always solid. M7's release sets e.freed: the wraith drifts
// up and fades out over 1 s (one `grant` sfx, played by the release).
import { register } from './index.js';
import { windPhase } from '../wind.js';
import { game } from '../game.js'; // used only in draw — after both modules are live

export function wraithAlpha(e, phase) {
  if (e.freed) return Math.max(0, 1 - (e.freeT ?? 0)); // the release fade
  if (e.bound) return 1; // the arena wraiths are always solid
  return phase === 'gust' ? 1 : phase === 'telegraph' ? 0.7 : 0.45;
}

function update(e, { p, lvl, dt }) {
  if (e.phase === undefined) { e.phase = e.x * 0.1; e.state = 'hover'; }
  e.phase += dt * Math.PI;
  if (e.freed) { // the release: drift up and out (M7 sets the flag)
    e.freeT += dt;
    e.y -= 20 * dt;
    if (e.freeT >= 1) e.dead = true;
    return;
  }
  const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
  const adx = Math.abs(dx);
  if (!p.dead && adx < this.aggro) e.state = 'drift';
  else if (e.state === 'drift' && (p.dead || adx > this.holdRange)) e.state = 'hover';
  const m = this.speed * dt;
  if (e.state === 'drift') {
    e.x += Math.sign(dx) * Math.min(m, adx);
    if (adx < this.chestRange) { // descend into the ground-arrow band
      const chest = lvl.groundY - 44;
      const dy = chest - e.y;
      e.y += Math.sign(dy) * Math.min(m, Math.abs(dy));
    }
  } else { // hover at the anchor with the bob
    const tx = e.anchorX + e.w / 2;
    const ty = e.anchorY + e.h / 2 + Math.sin(e.phase) * 6;
    const ox = tx - (e.x + e.w / 2), oy = ty - (e.y + e.h / 2);
    const d = Math.hypot(ox, oy);
    if (d > 0) { const s = Math.min(m, d); e.x += ox / d * s; e.y += oy / d * s; }
  }
}

function draw(c, e) {
  const phase = windPhase(game.gameTime); // bound wraiths ignore it (always solid)
  c.save();
  c.globalAlpha = wraithAlpha(e, phase);
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  const sway = Math.sin(e.phase) * 2;
  c.fillStyle = '#3a3a5c'; // the hooded body
  c.fillRect(-13, -15, 26, 22);
  c.fillRect(-11, 7, 7, 8 + sway); // tattered hem
  c.fillRect(-1, 7, 7, 8 - sway);
  c.fillRect(5, 7, 6, 8);
  if (phase === 'gust' && !e.bound) { // the frost rim, carried by the wind
    c.strokeStyle = '#8fd3f4';
    c.lineWidth = 1.5;
    c.strokeRect(-13.5, -15.5, 27, 32);
  }
  c.fillStyle = '#8fd3f4'; // the eyes
  c.fillRect(-8, -9, 4, 5);
  c.fillRect(4, -9, 4, 5);
  c.restore();
}

register({
  kind: 'wraith',
  w: 26, h: 30,
  speed: 45, aggro: 260, holdRange: 320, chestRange: 120,
  hp: 1,
  stompable: false, // the ghost bounce: the stomp rebounds, the wraith lives
  update,
  draw,
});
