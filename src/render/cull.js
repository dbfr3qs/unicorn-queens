// Viewport culling: the renderer skips items that lie wholly outside the view.
//
// inView is the pure test. The world pass draws under translate(-camera.x), so an item's
// world x is compared with [camera.x - margin, camera.x + viewW + margin]. The default
// margin (64) is wider than the biggest camera shake (12 px, src/enemies/troll.js) plus
// the rounding of the translate, so a shaking frame never shows a hole at the edge. An
// item that draws further than that outside its own x..x+w (glows, sprite overhang, hung
// ropes) must either pass its true extent or a bigger margin.
//
// Vertical culling is not done: nothing in the game is taller than the view.
import { game } from '../game.js';

export const VIEW_W = 800; // the canvas is 800x600 (index.html)

let enabled = true;
// Test-only switch: with culling off every item is "in view", which is today's renderer.
export function setCulling(on) { enabled = !!on; }

// An item spanning [x, x + w) in world space, against a camera at cam.x. Culled only when
// it is definitely outside, so NaN input (an item with no x) is drawn, never lost.
export function inView(x, w, cam, viewW, margin = 64) {
  if (!enabled) return true;
  return !(x + w < cam.x - margin || x > cam.x + viewW + margin);
}

// The two helpers below read the game's camera, which is what draw() translates by. The
// opening scene (render/intro.js) draws the same level and zone code under its own camera
// and a zoom, so while game.intro is set nothing is culled: the strip it shows is small and
// the view is not game.camera's.

// World-space item in the world pass (or a zone's world-anchored dressing).
export function onScreen(x, w, margin = 64) {
  return game.intro ? true : inView(x, w, game.camera, VIEW_W, margin);
}

// Screen-space item (parallax layers and the like: x is already on-screen x).
const SCREEN = { x: 0 };
export function onScreenX(sx, w, margin = 64) {
  return game.intro ? true : inView(sx, w, SCREEN, VIEW_W, margin);
}
