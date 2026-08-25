// Headless smoke test: runs the game (src/main.js) in Node with DOM stubs,
// then drives a few hundred frames of the real update/draw loop.
// Catches runtime wiring bugs (bad call sites, missing state) that
// parse checks and per-module tests can't see. Usage: node smoke.mjs

// ---- DOM stubs ----
const ctxStub = new Proxy({}, {
  get: (t, prop) => (prop in t ? t[prop] : () => ({ width: 0 })),
  set: (t, prop, v) => { t[prop] = v; return true; },
});
const canvas = { width: 800, height: 600, getContext: () => ctxStub };

let rafCb = null;
globalThis.document = { getElementById: () => canvas };
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = cb => { rafCb = cb; return 1; };

// ---- run ----
await import(new URL('./src/main.js', import.meta.url));
const { game, startGame } = await import(new URL('./src/game.js', import.meta.url)); // same module instance main.js uses
if (!game.level || !game.player || !game.enemies) throw new Error('startGame did not initialize state');

const FRAMES = 300; // ~5s of game time
let ts = 0;
for (let i = 0; i < FRAMES; i++) {
  ts += 16.7;
  const cb = rafCb; rafCb = null;
  if (!cb) throw new Error('requestAnimationFrame chain broke at frame ' + i);
  cb(ts);
}
// second run: level 2 (bridge, castle interior, boss hall)
startGame(600, 1);
game.lastTs = 0;
for (let i = 0; i < FRAMES; i++) {
  ts += 16.7;
  const cb = rafCb; rafCb = null;
  if (!cb) throw new Error('requestAnimationFrame chain broke at level-2 frame ' + i);
  cb(ts);
}
// third run: level 3 (dungeon, lava, key chain, troll hall, stairs down)
startGame(600, 2);
game.lastTs = 0;
for (let i = 0; i < FRAMES; i++) {
  ts += 16.7;
  const cb = rafCb; rafCb = null;
  if (!cb) throw new Error('requestAnimationFrame chain broke at level-3 frame ' + i);
  cb(ts);
}
// fourth run: level 4 (deep warren, sludge gauntlet, vault, dragon hall)
startGame(600, 3);
game.lastTs = 0;
for (let i = 0; i < FRAMES; i++) {
  ts += 16.7;
  const cb = rafCb; rafCb = null;
  if (!cb) throw new Error('requestAnimationFrame chain broke at level-4 frame ' + i);
  cb(ts);
}
console.log(`smoke OK: ${FRAMES} frames ran without throwing (levels 1 + 2 + 3 + 4)`);
