// Drawing the opening: level 5's wood through the game's own passes, the
// three of them on it from the game's own sheets, a caption box in the
// dialogue's style, letterbox bars, the fades, and the title. The HUD is
// not drawn — this is a scene, not a level.
import { game } from '../game.js';
import { pose } from '../intro.js';
import { drawZones } from './zones.js';
import { drawLevel } from './level.js';
import { drawForest } from './forest.js';
import { drawParticles } from './particles.js';
import { drawSpriteFeet, scaleToHeight } from './sprite.js';
import { spriteReady } from '../sprites.js';
import { palette, fonts } from './theme.js';

const CHAR_W = 9.6; // the dialogue box's wrap constant, for the same look
const BAR = 44; // the letterbox
// The scene is drawn closer than the game is played: at 1:1 a 52 px queen
// under a 450 px tree is a platformer, not a scene. ZOOM scales the world
// about the ground line, which is held at GROUND_Y on screen; the camera's
// x is then the left edge of the narrower strip of wood that fits.
export const ZOOM = 1.5, GROUND_Y = 600 - BAR - 48;

// An actor from a sheet, feet at (x, y), facing `face`; a plain block where
// the sheet has not decoded (or under Node), so the scene always has bodies.
function actor(c, name, a, h, fallback) {
  c.save();
  c.translate(a.x, a.y + (a.bob ?? 0));
  c.scale(a.face ?? 1, 1);
  const drew = spriteReady(name) && drawSpriteFeet(c, name, 0, scaleToHeight(name, h));
  if (!drew) { c.fillStyle = fallback; c.fillRect(-14, -h * 0.75, 28, h * 0.75); }
  c.restore();
}

function caption(c, line, viewW, viewH) {
  const bw = Math.min(viewW - 40, 560), bh = 76;
  const bx = Math.round((viewW - bw) / 2), by = viewH - BAR - bh - 12;
  c.fillStyle = palette.night;
  c.fillRect(bx, by, bw, bh);
  c.strokeStyle = palette.lavender;
  c.lineWidth = 1;
  c.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  c.textBaseline = 'top';
  c.textAlign = 'left';
  c.font = fonts.hint;
  c.fillStyle = palette.gold;
  c.fillText(line.speaker, bx + 16, by + 12);
  c.font = fonts.sub;
  c.fillStyle = palette.unicornWhite;
  const maxChars = Math.floor((bw - 32) / CHAR_W);
  const rows = [];
  let row = '';
  for (const w of line.text.split(' ')) {
    const next = row ? row + ' ' + w : w;
    if (row && next.length > maxChars) { rows.push(row); row = w; } else row = next;
  }
  rows.push(row);
  rows.forEach((r, i) => c.fillText(r, bx + 16, by + 34 + i * 20));
}

export function drawIntro(c, viewW, viewH) {
  const it = game.intro;
  if (!it) return;
  const { level, camera, t } = it;
  const p = pose(t);
  c.fillStyle = palette.clear;
  c.fillRect(0, 0, viewW, viewH);
  const shx = camera.shake > 0 ? (Math.random() * 2 - 1) * camera.mag : 0;
  const shy = camera.shake > 0 ? (Math.random() * 2 - 1) * camera.mag : 0;
  c.save();
  c.translate(shx, shy);
  c.translate(0, GROUND_Y - level.groundY * ZOOM); // the ground line lands at GROUND_Y
  c.scale(ZOOM, ZOOM);
  drawZones(c, level, camera, t, viewW / ZOOM); // the strip of wood in frame, in world units
  c.save();
  c.translate(-camera.x, 0);
  drawLevel(c, level, t);
  drawForest(c, level, t);
  if (p.wizard.visible) { // his light, on the ground under him, and him
    c.globalAlpha = 0.18 + 0.12 * p.wizard.glow;
    c.fillStyle = '#b57edc';
    c.beginPath(); c.ellipse(p.wizard.x, p.wizard.y + 8, 40, 8, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  if (p.king.visible) actor(c, 'king', p.king, 56, '#8a6a34');
  actor(c, 'player', p.queen, 52, palette.unicornWhite);
  if (p.wizard.visible) actor(c, 'wizardboss', p.wizard, 60, '#5a2b6e');
  drawParticles(c);
  c.restore();
  c.restore();
  if (p.dark > 0) { // the wood dims when he comes
    c.fillStyle = `rgba(20, 8, 40, ${p.dark})`;
    c.fillRect(0, 0, viewW, viewH);
  }
  c.fillStyle = '#000'; // the letterbox
  c.fillRect(0, 0, viewW, BAR);
  c.fillRect(0, viewH - BAR, viewW, BAR);
  if (p.caption) caption(c, p.caption, viewW, viewH);
  const black = Math.max(p.fadeIn, p.fadeOut);
  if (black > 0) {
    c.fillStyle = `rgba(0, 0, 0, ${black})`;
    c.fillRect(0, 0, viewW, viewH);
  }
  if (p.card > 0) { // the title, on the black
    c.globalAlpha = p.card;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = fonts.title;
    c.fillStyle = palette.gold;
    c.fillText('UNICORN QUEENS', viewW / 2, viewH / 2 - 10);
    c.font = fonts.hint;
    c.fillStyle = palette.lavender;
    c.fillText('the realm has a queen to keep it', viewW / 2, viewH / 2 + 22);
    c.globalAlpha = 1;
  }
  c.textAlign = 'right'; // the way out, faint, in the bottom bar
  c.textBaseline = 'alphabetic';
  c.font = fonts.hint;
  c.fillStyle = palette.hint;
  c.fillText('any key skips', viewW - 12, viewH - 14);
}
