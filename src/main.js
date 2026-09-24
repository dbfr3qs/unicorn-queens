// Entry point: canvas, render loop wiring, restart key.
import { game, startGame, startLoop, update, restartTarget } from './game.js';
import { draw } from './render/index.js';
import { fx, initAudio } from './audio.js';
import { onKeyDown, onKeyUp } from './input.js';
import { pollGamepads } from './gamepad.js'; // a controller, read once a frame as keys
import { initTouch, wantsTouch } from './touch.js'; // a phone or tablet: on-screen buttons, also as keys
import { initMusic } from './music.js';
import { levelIndexFromSearch } from './levels/index.js';
import { initDifficulty } from './difficulty.js'; // ?difficulty=, else the remembered choice
import { openPicker, pickerKey } from './picker.js'; // the difficulty card
import { cardReady } from './ending9.js'; // level 9: the end card
import { endIntro } from './intro.js'; // the opening scene (the card's Space starts it)
import { spritesLoaded, loadProgress } from './sprites.js';
import { palette, fonts } from './render/theme.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

addEventListener('keydown', onKeyDown);
addEventListener('keyup', onKeyUp);
// Fullscreen: F, or the footer link. The canvas itself goes fullscreen and
// index.html's canvas:fullscreen rule scales it to fit. This needs a real
// gesture — the browser refuses it otherwise — which is why there is no pad
// button for it: a pad's presses are synthetic and would be refused.
// Already fullscreen by another road: launched from the home screen, where
// the manifest asked for it. Nothing to toggle, and no button to show.
const standalone = () => (typeof navigator !== 'undefined' && navigator.standalone === true) ||
  (typeof matchMedia === 'function' && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);

function toggleFullscreen() {
  const req = canvas.requestFullscreen || canvas.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const on = document.fullscreenElement || document.webkitFullscreenElement;
  if (on) return exit?.call(document);
  if (req) return req.call(canvas);
  // No fullscreen API at all: that is an iPhone (Safari there has it only
  // for video). The way to a fullscreen game on an iPhone is the home
  // screen, so say so, once, where the button was pressed.
  toast('No fullscreen in Safari on iPhone — Share → Add to Home Screen, then open it from there.');
}

let toastEl = null;
function toast(text) {
  if (typeof document.createElement !== 'function' || !document.body) return;
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);max-width:min(92vw,520px);padding:10px 14px;border-radius:8px;background:rgba(26,16,37,0.92);color:#e8dcff;border:1px solid #b57edc;font:13px monospace;text-align:center;z-index:3;pointer-events:none;';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toastEl.hidden = true; }, 6000);
}
addEventListener('keydown', e => { if (e.code === 'KeyF' && !e.repeat && e.isTrusted) toggleFullscreen(); });
const fsLink = document.getElementById('fullscreen'); // absent under smoke.mjs's stub document
if (typeof fsLink?.addEventListener === 'function') fsLink.addEventListener('click', e => { e.preventDefault(); toggleFullscreen(); });
// A coarse pointer means a thumb: put the buttons up. Going fullscreen from
// the touch button also asks for landscape, where the phone allows it.
if (wantsTouch()) {
  const root = initTouch(() => {
    toggleFullscreen();
    screen.orientation?.lock?.('landscape').catch(() => {});
  });
  if (fsLink) fsLink.hidden = true; // the ⛶ button does this job on touch
  if (standalone()) root?.querySelector('.fs')?.remove(); // launched fullscreen already
}
// A tap or click unlocks audio too. Keys already do (input.js); this is
// for the player on a controller or a touchscreen, whose presses arrive as
// synthetic key events that the browser does not count as a gesture — the
// HUD asks them to tap. touchend as well as pointerdown: older iOS counts
// only the former. Both may fire for one tap; the calls are idempotent.
for (const ev of ['pointerdown', 'touchend']) addEventListener(ev, () => { initAudio(); initMusic(); }, { passive: true });
// And the music bundle is fetched now, not on the first gesture, so that
// first gesture can resume a context that already exists.
if (typeof document !== 'undefined' && typeof document.createElement === 'function') initMusic();
addEventListener('keydown', e => {
  if (e.repeat) return; // holding jump through the end screen must not auto-advance
  if (pickerKey(e.code, canvas.height)) return; // the difficulty card takes every key while it is up
  if (game.intro) { endIntro(); return; } // any key: straight to level 1 (a pad's or a thumb's key too)
  if (e.code === 'Space' && cardReady(game.level)) {
    // The end card: a true new game, by way of the difficulty card and the
    // opening. No prev player, so no carry at all — back to level 1 small,
    // bowless and unable to fly.
    openPicker();
    return;
  }
  if (e.code === 'Space' && (game.player.dead || game.player.won)) {
    // startGame carries big/bow on advance only; the heart cap (maxHp)
    // always survives, being permanent for the run
    startGame(canvas.height, restartTarget(), game.player);
    // The restart press IS a held jump: mark it so the new player doesn't
    // read it as a fresh press and hop on spawn. Release + press jumps
    // normally; a plain startGame (first load, tests) is untouched.
    game.player.jumpHeld = true;
  }
});
// ?level=N (1-based) boots straight into that level for testing, with the
// gear a run would have carried in (LEVELS[].carry), and no card: the
// URL's ?difficulty= (or the remembered one) stands. A plain start opens
// on the difficulty card, then the story. typeof guard: smoke.mjs boots
// main.js under Node, where location is absent — it gets the card.
{
  const search = typeof location !== 'undefined' ? location.search : '';
  initDifficulty(search);
  if (/[?&]level=/.test(search)) startGame(canvas.height, levelIndexFromSearch(search));
  else { startGame(canvas.height, 0); openPicker(); } // level 1 waits under the card; its Space runs the intro
}

// A bar and a word while the sheets come down. Drawn on its own rAF rather
// than through the game loop, because the game loop has not started yet —
// which is the whole point.
function drawLoading() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = palette.clear;
  ctx.fillRect(0, 0, w, h);
  ctx.font = fonts.hud;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.lavender;
  ctx.fillText('loading…', w / 2, h / 2 - 20);
  const bw = 240, bh = 6, bx = (w - bw) / 2, by = h / 2 + 8;
  ctx.fillStyle = '#2d1f42';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = palette.gold;
  ctx.fillRect(bx, by, bw * loadProgress(), bh);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Hold the first frame until the art is here. Opening on vector art and
// popping over to the sprites a second later reads as a glitch; a short
// honest load does not. spritesLoaded() resolves at once where there is no
// Image (smoke.mjs boots this file under Node), and has its own timeout, so
// this can delay the start but never prevent it.
// loadProgress() is already 1 where there are no sheets to wait for (Node) and
// where every one of them was served from cache — so a warm load shows no
// loading screen at all, it just starts.
let loadingRaf = 0;
const tick = () => { drawLoading(); loadingRaf = requestAnimationFrame(tick); };
if (loadProgress() < 1 && typeof requestAnimationFrame === 'function') tick();
await spritesLoaded();
if (loadingRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(loadingRaf);

startLoop(dt => {
  pollGamepads(); // before update, so a press this frame is this frame's input
  update(dt, canvas.width, fx);
  draw(ctx, canvas.width, canvas.height);
});
