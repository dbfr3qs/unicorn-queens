import { describe, it, expect } from 'vitest';
import { fullscreenApi } from '../src/shell.js';

describe('fullscreenApi', () => {
  it('targets the page, so the touch controls stay on screen', async () => {
    let target = null;
    const doc = { documentElement: { requestFullscreen() { target = this; return Promise.resolve(); } }, exitFullscreen: () => Promise.resolve(), fullscreenElement: null };
    await fullscreenApi(doc).request();
    expect(target).toBe(doc.documentElement);
  });
  it('falls back to the webkit names', () => {
    const doc = { documentElement: { webkitRequestFullscreen() {} }, webkitExitFullscreen() {}, webkitFullscreenElement: {} };
    expect(fullscreenApi(doc).active()).toBe(true);
  });
  it('no API (iPhone Safari): null, so the caller shows the toast (Review Focus 5)', () => {
    expect(fullscreenApi({ documentElement: {} })).toBe(null);
  });
  it('no documentElement at all (the smoke stub): null', () => {
    expect(fullscreenApi({})).toBe(null);
  });
  it('a refused request does not reject', async () => {
    const doc = { documentElement: { requestFullscreen: () => Promise.reject(new Error('denied')) }, exitFullscreen() {} };
    await expect(fullscreenApi(doc).request()).resolves.toBeUndefined();
  });
  it('a webkit function that returns undefined still gives a promise', async () => {
    const doc = { documentElement: { webkitRequestFullscreen() {} }, webkitExitFullscreen() {} };
    const api = fullscreenApi(doc);
    await expect(api.request()).resolves.toBeUndefined();
    await expect(api.exit()).resolves.toBeUndefined();
  });
  it('a refused or throwing exit does not reject', async () => {
    const doc = { documentElement: { requestFullscreen() {} }, exitFullscreen: () => Promise.reject(new Error('no')) };
    await expect(fullscreenApi(doc).exit()).resolves.toBeUndefined();
  });
});
