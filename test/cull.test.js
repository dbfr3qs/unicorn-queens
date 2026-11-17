// Viewport culling: inView is pure; the renderer uses it so nothing wholly
// outside the camera's view reaches the canvas.
import { test, expect, afterEach } from 'vitest';
import { freshGame, freshGame2, freshGame3, freshGame4, freshGame5, freshGame6, freshGame7, freshGame8, freshGame9, VIEW_W, VIEW_H } from './helpers/render-harness.js';
import { draw } from '../src/render/index.js';
import { createRecordingCtx } from './helpers/recording-ctx.js';
import { inView, setCulling } from '../src/render/cull.js';

afterEach(() => setCulling(true));

const cam = { x: 1000 };
const W = 800;

test('inView: inside the view', () => {
  expect(inView(1100, 50, cam, W)).toBe(true);
});

test('inView: straddling the left and right edges', () => {
  expect(inView(950, 100, cam, W)).toBe(true);
  expect(inView(1750, 100, cam, W)).toBe(true);
});

test('inView: inside the margin counts, past it does not (left)', () => {
  expect(inView(1000 - 64 - 10, 10, cam, W)).toBe(true); // right edge at cam.x - 64: touches
  expect(inView(1000 - 64 - 11, 10, cam, W)).toBe(false); // 1 px past
});

test('inView: inside the margin counts, past it does not (right)', () => {
  expect(inView(1000 + W + 64, 10, cam, W)).toBe(true);
  expect(inView(1000 + W + 65, 10, cam, W)).toBe(false);
});

test('inView: a custom margin', () => {
  expect(inView(1000 - 200, 10, cam, W, 0)).toBe(false);
  expect(inView(1000 - 200, 10, cam, W, 300)).toBe(true);
});

test('inView: an item wider than the view that spans it is in', () => {
  expect(inView(0, 5000, cam, W)).toBe(true);
});

// ---- the renderer ----

// One frame of the current game state with culling on or off; the raw record list.
function frame(on) {
  setCulling(on);
  const { ctx, lines } = createRecordingCtx();
  draw(ctx, VIEW_W, VIEW_H);
  setCulling(true);
  return lines;
}

const DRAW_CALL = /^(fillRect|strokeRect|fill|stroke|fillText|drawImage)\(/;

test('level 5 at its start draws fewer than 60% of the calls it did before culling', () => {
  freshGame5();
  const before = frame(false).filter(l => DRAW_CALL.test(l)).length; // culling off is the renderer as it was
  const after = frame(true).filter(l => DRAW_CALL.test(l)).length;
  expect(before).toBeGreaterThan(500); // a real frame, not an empty one
  expect(after).toBeLessThan(before * 0.6);
});

// Annotate each record with the screen-space x-extent it covers, following the
// save/restore/translate/scale nesting the recorder logs. Records with no simple x-extent
// (paths, text, rotated things) get null and are not checked for position.
function annotate(lines) {
  const stack = [];
  let tx = 0, sx = 1;
  const num = s => s.split(',').map(Number);
  return lines.map(l => {
    if (l === 'save()') stack.push([tx, sx]);
    else if (l === 'restore()') [tx, sx] = stack.pop() ?? [0, 1];
    let m;
    if ((m = /^translate\((.*)\)$/.exec(l))) tx += num(m[1])[0] * sx;
    else if ((m = /^scale\((.*)\)$/.exec(l))) sx *= num(m[1])[0];
    let ext = null;
    if ((m = /^(?:fillRect|strokeRect)\((.*)\)$/.exec(l))) {
      const [x, , w] = num(m[1]); ext = [tx + x * sx, tx + (x + w) * sx];
    } else if ((m = /^arc\((.*)\)$/.exec(l))) {
      const [x, , r] = num(m[1]); ext = [tx + (x - r) * sx, tx + (x + r) * sx];
    } else if ((m = /^ellipse\((.*)\)$/.exec(l))) {
      const [x, , rx] = num(m[1]); ext = [tx + (x - rx) * sx, tx + (x + rx) * sx];
    }
    if (ext && ext[0] > ext[1]) ext = [ext[1], ext[0]];
    return { key: `${l}@${tx},${sx}`, ext };
  });
}

const LEVELS = [freshGame, freshGame2, freshGame3, freshGame4, freshGame5, freshGame6, freshGame7, freshGame8, freshGame9];

for (const [i, fresh] of LEVELS.entries()) {
  test(`level ${i + 1}: culling only removes records wholly outside the view`, () => {
    const g = fresh();
    const maxX = Math.max(0, g.level.width - VIEW_W);
    let removedTotal = 0;
    for (const camX of [0, 1, 2, 3, 4, 5, 6].map(n => Math.round(maxX * n / 6))) { // start, middle, far end and between
      g.camera.x = camX;
      g.camera.shake = 0;
      const off = annotate(frame(false));
      const on = annotate(frame(true));
      // culling only ever drops records: what it kept is the old frame, in order
      let k = 0;
      const removed = [];
      for (const rec of off) {
        if (k < on.length && on[k].key === rec.key) k++;
        else removed.push(rec);
      }
      expect(k, `level ${i + 1} cam ${camX}: culled frame is a subsequence of the old one`).toBe(on.length);
      for (const rec of removed) {
        if (!rec.ext) continue;
        const outside = rec.ext[1] < 0 || rec.ext[0] > VIEW_W;
        expect(outside, `level ${i + 1} cam ${camX}: culled ${rec.key} sits at ${rec.ext}`).toBe(true);
      }
      removedTotal += removed.length;
    }
    expect(removedTotal).toBeGreaterThan(0); // the switch does something on every level
  });
}
