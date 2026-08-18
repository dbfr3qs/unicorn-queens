import { test, expect } from 'vitest';
import { createRecordingCtx, pretty } from './helpers/recording-ctx.js';

test('records method calls with rounded args', () => {
  const { ctx, text } = createRecordingCtx();
  ctx.fillRect(1.0000001, 2, 3.456789, 4);
  expect(text()).toBe('fillRect(1, 2, 3.457, 4)');
});

test('records property sets', () => {
  const { ctx, text } = createRecordingCtx();
  ctx.fillStyle = '#ff0000';
  ctx.globalAlpha = 0.5;
  ctx.font = '18px monospace';
  expect(text()).toBe('fillStyle=#ff0000\nglobalAlpha=0.5\nfont=18px monospace');
});

test('records mixed calls and sets in order', () => {
  const { ctx, text } = createRecordingCtx();
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.translate(10, 20);
  ctx.restore();
  expect(text()).toBe('save()\nfillStyle=#fff\ntranslate(10, 20)\nrestore()');
});

test('rounds floats to 3 dp and keeps strings intact', () => {
  const { ctx, text } = createRecordingCtx();
  ctx.arc(0.1 + 0.2, -1.23456, 5, 0, Math.PI);
  ctx.fillText('\u2665', 12, 10);
  expect(text()).toBe('arc(0.3, -1.235, 5, 0, 3.142)\nfillText(\u2665, 12, 10)');
});

test('reading a set property back does not log', () => {
  const { ctx, lines } = createRecordingCtx();
  ctx.fillStyle = 'red';
  expect(ctx.fillStyle).toBe('red');
  expect(lines).toHaveLength(1);
});

test('multiple calls to the same method each log', () => {
  const { ctx, text } = createRecordingCtx();
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillRect(2, 2, 3, 3);
  expect(text()).toBe('fillRect(0, 0, 1, 1)\nfillRect(2, 2, 3, 3)');
});

test('pretty indents save/restore nesting', () => {
  const { ctx, lines } = createRecordingCtx();
  ctx.fillRect(0, 0, 1, 1);
  ctx.save();
  ctx.translate(1, 2);
  ctx.save();
  ctx.fillRect(0, 0, 1, 1);
  ctx.restore();
  ctx.restore();
  expect(pretty(lines)).toBe([
    'fillRect(0, 0, 1, 1)',
    'save()',
    '  translate(1, 2)',
    '  save()',
    '    fillRect(0, 0, 1, 1)',
    '  restore()',
    'restore()',
  ].join('\n'));
});

test('pretty clamps depth on unbalanced restore', () => {
  expect(pretty(['restore()', 'fillRect(0, 0, 1, 1)'])).toBe('restore()\nfillRect(0, 0, 1, 1)');
});
