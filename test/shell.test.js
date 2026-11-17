import { describe, it, expect } from 'vitest';
import { fullscreenApi, toggleFullscreenOn } from '../src/shell.js';

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

describe('toggleFullscreenOn', () => {
  const rig = (startActive, refuse) => {
    const calls = [];
    const doc = {
      fullscreenElement: startActive ? {} : null,
      documentElement: { requestFullscreen() { calls.push('request'); if (!refuse) doc.fullscreenElement = this; return Promise.resolve(); } },
      exitFullscreen() { calls.push('exit'); doc.fullscreenElement = null; return Promise.resolve(); },
    };
    return { calls, fs: fullscreenApi(doc) };
  };
  it('enters when inactive and the request succeeds: true', async () => {
    const { calls, fs } = rig(false, false);
    expect(await toggleFullscreenOn(fs)).toBe(true);
    expect(calls).toEqual(['request']);
  });
  it('a refused request leaves it inactive: false', async () => {
    const { fs } = rig(false, true);
    expect(await toggleFullscreenOn(fs)).toBe(false);
  });
  it('already active: exits, does not request, false', async () => {
    const { calls, fs } = rig(true, false);
    expect(await toggleFullscreenOn(fs)).toBe(false);
    expect(calls).toEqual(['exit']);
  });
});
