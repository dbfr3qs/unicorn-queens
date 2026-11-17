// Tiled textures are placed on whole pixels. A fractional x or width makes the canvas
// resample the tile, which blurs it and shows a seam between neighbours; so each tile edge
// is rounded (not x and width separately), which keeps neighbours abutting.
import { describe, it, expect, vi } from 'vitest';
import { drawTileStrip, drawTileGrid, drawWall, drawTiled } from '../src/render/sprite.js';
import { game } from '../src/game.js';

vi.mock('../src/sprites.js', async (orig) => {
  const real = await orig();
  const sheet = { img: {}, meta: { w: 100, h: 100 } };
  return { ...real, sprite: () => sheet, spriteMeta: () => sheet.meta };
});

function rec() {
  const calls = [];
  const c = new Proxy({}, { get: (_, p) => p === 'drawImage' ? (...a) => calls.push(a) : () => {} });
  return { c, calls };
}
const xw = calls => calls.map(a => [a[5], a[7]]); // dx, dw of the 9-argument form

function expectWholeAndAbutting(rects) {
  expect(rects.length).toBeGreaterThan(2);
  for (const [x, w] of rects) { expect(Number.isInteger(x)).toBe(true); expect(Number.isInteger(w)).toBe(true); expect(w).toBeGreaterThan(0); }
  for (let i = 1; i < rects.length; i++) expect(rects[i][0]).toBe(rects[i - 1][0] + rects[i - 1][1]);
}

describe('tile placement', () => {
  game.camera.x = 0;
  it('drawTileStrip', () => {
    const { c, calls } = rec();
    drawTileStrip(c, 'x', 10.3, 400.6, 0, 20, 12, 96.7);
    expectWholeAndAbutting(xw(calls));
  });
  it('drawTileStrip with a fractional camera', () => {
    const { c, calls } = rec();
    drawTileStrip(c, 'x', 10, 400, 3.37, 20, 12, 96.7);
    expectWholeAndAbutting(xw(calls));
  });
  it('drawTileGrid', () => {
    const { c, calls } = rec();
    drawTileGrid(c, 'x', 5.5, 400, 0.5, 0, 130, 120.4, 130);
    expectWholeAndAbutting(xw(calls));
  });
  it('drawWall', () => {
    const { c, calls } = rec();
    drawWall(c, "x", 0, 600, 0.25, 150.3);
    expectWholeAndAbutting(xw(calls));
  });
  it('drawTiled', () => {
    const { c, calls } = rec();
    drawTiled(c, 'x', 37.3, 0, 233.3, 800);
    expectWholeAndAbutting(xw(calls));
  });
});
