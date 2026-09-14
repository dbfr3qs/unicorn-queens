// Drawing sprites onto the 2D context.
//
// Every function returns false when the sheet is not decoded yet, so a caller can fall
// back to its vector path in the same frame:
//
//     if (!drawSpriteFeet(c, 'player', frame, scale)) { ...existing fillRects... }
//
// That is the whole integration contract. There is no loading screen and no ready flag to
// wait on — see src/sprites.js for why.
import { sprite, spriteMeta } from '../sprites.js';

// Raw blit of one cell from a horizontal strip. dx/dy/dw/dh are in the caller's current
// transform, so an enclosing scale() or translate() applies as usual.
export function drawSprite(c, name, frame, dx, dy, dw, dh) {
  const s = sprite(name);
  if (!s) return false;
  const { w, h, frames } = s.meta;
  const i = frames > 1 ? ((frame % frames) + frames) % frames : 0; // wrap, tolerate negatives
  c.drawImage(s.img, i * w, 0, w, h, dx, dy, dw, dh);
  return true;
}

// Draw a cell anchored the way the game anchors entities: horizontally centred on the
// origin, sitting on it vertically.
//
// drawPlayer and the enemy renderers translate to (x + w/2, y + h) — the middle of the
// feet — and generated sprites are bottom-centred in their cell to match. So after that
// translate the correct call is simply drawSpriteFeet(c, name, frame, scale), with no
// offset arithmetic at the call site.
export function drawSpriteFeet(c, name, frame, scale = 1) {
  const meta = spriteMeta(name);
  if (!meta) return false;
  const dw = meta.w * scale, dh = meta.h * scale;
  return drawSprite(c, name, frame, -dw / 2, -dh, dw, dh);
}

// Draw a cell centred on the origin, both axes.
//
// Enemies and loot translate to the middle of their box — `(x + w/2, y + h/2)` — not to
// the feet like the player. Their sprites are generated centred in the cell to match, so
// this is a straight centre-on-origin blit.
export function drawSpriteCentre(c, name, frame, scale = 1) {
  const meta = spriteMeta(name);
  if (!meta) return false;
  const dw = meta.w * scale, dh = meta.h * scale;
  return drawSprite(c, name, frame, -dw / 2, -dh / 2, dw, dh);
}

// Repeat a seamless layer horizontally across the viewport at a parallax offset.
//
// A parallax layer is not placed, it is tiled: the level is wider than any image, so the
// layer repeats. Start at the first tile boundary left of the scrolled offset and step by
// the image width until past the right edge. The layers are generated with their left and
// right edges blended from each other, so the repeats do not show.
export function drawTiled(c, name, offset, y, h, viewW) {
  const s = sprite(name);
  if (!s) return false;
  const meta = s.meta;
  const scale = h / meta.h;
  const w = meta.w * scale;
  if (w <= 0) return false;
  let x = -(((offset % w) + w) % w);   // modulo that stays positive for negative offsets
  for (; x < viewW; x += w) c.drawImage(s.img, 0, 0, meta.w, meta.h, x, y, w, h);
  return true;
}

// Tile a texture into a world-space strip: ground segments, platform bars, anything whose
// width comes from level data rather than from the image.
//
// tileW is separate from the height on purpose. Scaling a strip proportionally ties the
// two together, so a 12px-tall platform would repeat its texture every 40px; letting the
// caller set the tile width keeps the repeat sensible whatever the strip's height.
export function drawTileStrip(c, name, wx0, wx1, camX, y, h, tileW) {
  const s = sprite(name);
  if (!s) return false;
  const meta = s.meta;
  const w = tileW || meta.w * (h / meta.h);
  if (!(w > 0) || wx1 <= wx0) return false;
  c.save();
  c.beginPath();
  c.rect(wx0 - camX, y, wx1 - wx0, h);
  c.clip();
  for (let x = Math.floor(wx0 / w) * w; x < wx1; x += w) {
    c.drawImage(s.img, 0, 0, meta.w, meta.h, x - camX, y, w, h);
  }
  c.restore();
  return true;
}

// Tile a texture across a world-space rectangle in both axes, on a fixed grid.
//
// drawTileStrip stretches the image to the strip's height, which is right for a ground
// cap but wrong for anything whose height varies between neighbouring pieces: the
// citadel's bookcase bays run full height, its header runs 240px and its sliding panel
// 320px, and stretching each to fit put the shelf boards at three different pitches.
// Anchoring to a fixed cell size on world coordinates instead means every piece cut from
// the same wall lines up, so a closed panel sits flush with the shelves either side of it.
// originY shifts the vertical grid. A piece that moves needs its texture to move with it
// — the citadel's sliding panel is cut from the same wall as its surroundings, so on the
// shared grid it is invisible however far it has risen, and the player cannot time the
// run through it. Give it an originY that tracks the slab and its books ride up with it,
// while an originY that matches at rest keeps it flush when closed.
export function drawTileGrid(c, name, wx0, wx1, camX, y0, y1, tileW, tileH, originY = 0) {
  const s = sprite(name);
  if (!s) return false;
  const meta = s.meta;
  if (!(tileW > 0) || !(tileH > 0) || wx1 <= wx0 || y1 <= y0) return false;
  c.save();
  c.beginPath();
  c.rect(wx0 - camX, y0, wx1 - wx0, y1 - y0);
  c.clip();
  const gy0 = originY + Math.floor((y0 - originY) / tileH) * tileH;
  for (let x = Math.floor(wx0 / tileW) * tileW; x < wx1; x += tileW) {
    for (let y = gy0; y < y1; y += tileH) {
      c.drawImage(s.img, 0, 0, meta.w, meta.h, x - camX, y, tileW, tileH);
    }
  }
  c.restore();
  return true;
}

// Fill a zone with a tiling wall texture, from the top down to the ground line.
//
// Tiles are placed on WORLD positions, not screen ones: anchoring to the screen would slide
// the masonry along as the camera moved, which reads as the wall itself drifting past. The
// texture is stretched to the zone height and repeated horizontally.
export function drawWall(c, name, zx0, zx1, camX, gy) {
  const s = sprite(name);
  if (!s) return false;
  const meta = s.meta;
  const w = meta.w * (gy / meta.h);
  if (!(w > 0)) return false;
  c.save();
  c.beginPath();
  c.rect(zx0 - camX, 0, zx1 - zx0, gy);
  c.clip();
  for (let wx = Math.floor(zx0 / w) * w; wx < zx1; wx += w) {
    c.drawImage(s.img, 0, 0, meta.w, meta.h, wx - camX, 0, w, gy);
  }
  c.restore();
  return true;
}

// The scale that draws a sprite cell `px` WIDE on screen. Doorways, arches and
// holes are sized by the opening they have to cover, not by their height.
export function scaleToWidth(name, px) {
  const meta = spriteMeta(name);
  if (!meta || !meta.w) return 1;
  return px / meta.w;
}

// The scale that draws a sprite cell `px` tall on screen.
//
// Cell size is not draw size. Cells are deliberately large — 96x96 for the player over a
// 28x36 collision box — because downscaling a 1024px render below about 40px destroys it.
// The size to draw at is the size the existing vector art occupies, so the entity keeps
// looking the same next to everything not yet migrated.
export function scaleToHeight(name, px) {
  const meta = spriteMeta(name);
  if (!meta || !meta.h) return 1;
  return px / meta.h;
}
