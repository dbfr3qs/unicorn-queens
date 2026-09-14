// Sprite sheet loading. Metadata comes from sprite-manifest.js synchronously; the PNGs
// load in the background and callers check readiness per draw.
//
// Two constraints shape this module:
//
// 1. smoke.mjs boots the real game in Node with DOM stubs, and it does NOT stub Image.
//    So everything here guards on `typeof Image`, and under Node `sprite()` simply always
//    returns null — the renderer falls back to its vector path and the smoke run is
//    unaffected. Same for vitest.
//
// 2. main.js calls startLoop() at module load; there is no async asset step to hang a
//    preload off. Images are therefore requested at import time and consumed
//    opportunistically: the first frames draw vector art, and the sprite takes over on
//    whichever frame it finishes decoding. Nothing waits.
//
// There is no sprite "mode" and no switch. Sprites are simply the art; the vector draws
// that remain in the renderers are the fallback for the two cases above — a frame before
// the PNG has decoded, and any environment that cannot decode one at all.
import { SPRITES } from './sprite-manifest.js';

const BASE = 'assets/sprites/';
const HAVE_IMAGE = typeof Image !== 'undefined';

const sheets = new Map();

if (HAVE_IMAGE) {
  for (const [name, meta] of Object.entries(SPRITES)) {
    const img = new Image();
    img.src = BASE + meta.file;
    sheets.set(name, { img, meta });
  }
}

// naturalWidth stays 0 on a failed load, so a missing or broken PNG reads as "not ready"
// forever and the caller keeps drawing vector art rather than throwing every frame.
function decoded(entry) {
  return !!entry && entry.img.complete && entry.img.naturalWidth > 0;
}

// A loaded sheet, or null. Null means "draw the vector fallback this frame" — it is the
// normal answer under Node, before decode finishes, and after a load error.
export function sprite(name) {
  const entry = sheets.get(name);
  return decoded(entry) ? entry : null;
}

// Resolves once every sheet has settled — decoded, or failed and never coming.
//
// main.js holds the first frame on this. Without it the game opens on vector art and
// pops over to the sprites a second later as the PNGs land, which reads as a glitch
// rather than as loading. The fallback still exists for the frames after this resolves
// but before a late sheet decodes; this just means nobody watches it happen.
//
// The timeout is a safety net for a BROKEN asset, not a slow one, and it can afford to be
// generous: a 404 fires `error` immediately, so a missing file never waits at all. The
// only thing the timeout catches is a link so slow that waiting longer is worse than
// starting on vector art — and the progress bar makes that wait legible while it happens.
export const LOAD_TIMEOUT = 20000;

export function spritesLoaded(timeoutMs = LOAD_TIMEOUT) {
  if (!HAVE_IMAGE || sheets.size === 0) return Promise.resolve({ ready: 0, total: 0 });
  return new Promise(resolve => {
    let pending = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const st = spriteStatus();
      resolve({ ready: st.ready, total: st.total });
    };
    const settle = () => { if (--pending <= 0) finish(); };
    for (const { img } of sheets.values()) {
      if (img.complete) continue; // already decoded, or already failed
      pending++;
      img.addEventListener('load', settle, { once: true });
      img.addEventListener('error', settle, { once: true });
    }
    if (pending === 0) finish();
    else setTimeout(finish, timeoutMs);
  });
}

// How far along the load is, for a progress read while the above is pending.
export function loadProgress() {
  if (!HAVE_IMAGE || sheets.size === 0) return 1;
  let settled = 0;
  for (const { img } of sheets.values()) if (img.complete) settled++;
  return settled / sheets.size;
}

// Is this sheet ready to draw? Callers that must set up a transform before
// drawing ask this first: a save/translate/restore around a draw that never
// happens is invisible on a canvas but is still three calls, and the render
// snapshots record calls, not pixels.
export function spriteReady(name) {
  return decoded(sheets.get(name));
}

// Metadata without needing the image: cell size, frame count, fps, hitbox. Available
// synchronously everywhere, including Node.
export function spriteMeta(name) {
  return SPRITES[name] || null;
}

// Which frame of an animation strip to draw at time t (seconds). Wraps.
export function frameAt(name, t) {
  const meta = SPRITES[name];
  if (!meta || meta.frames <= 1 || !meta.fps) return 0;
  return Math.floor(t * meta.fps) % meta.frames;
}

// Diagnostics for the console and for tests; never used by the render path.
export function spriteStatus() {
  const names = Object.keys(SPRITES);
  return {
    supported: HAVE_IMAGE,
    total: names.length,
    ready: names.filter(n => decoded(sheets.get(n))).length,
  };
}
