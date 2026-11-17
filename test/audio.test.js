import { describe, it, expect, vi, afterEach } from 'vitest';
import { silentWav, isIOS } from '../src/audio.js';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('audio unlock (iOS)', () => {
  it('the unlock loop is 44.1 kHz 16-bit', () => {
    const b = Buffer.from(silentWav().split(',')[1], 'base64');
    expect(b.readUInt32LE(24)).toBe(44100); expect(b.readUInt16LE(34)).toBe(16);
  });
  it('the unlock loop is a valid, all-zero mono PCM WAV', () => {
    const b = Buffer.from(silentWav(8000, 0.5).split(',')[1], 'base64');
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.toString('ascii', 8, 12)).toBe('WAVE');
    expect(b.readUInt16LE(22)).toBe(1);
    expect(b.readUInt32LE(4)).toBe(b.length - 8);
    expect(b.readUInt32LE(40)).toBe(8000 * 0.5 * 2);
    expect(b.length).toBe(44 + 8000);
    expect(b.subarray(44).every((x) => x === 0)).toBe(true);
  });
  it('isIOS: iPhone and touch-Mac iPads only', () => {
    expect(isIOS({ userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
    expect(isIOS({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    expect(isIOS({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    expect(isIOS({ userAgent: 'X11; Linux', platform: 'Linux x86_64', maxTouchPoints: 0 })).toBe(false);
  });
  it('isIOS does not throw without a navigator', () => {
    expect(isIOS(undefined)).toBe(false);
  });
  it("an 'interrupted' context counts as suspended and is resumed", async () => {
    vi.resetModules();
    let resumed = 0; class Ctx { state = 'interrupted'; resume() { resumed++; } }
    vi.stubGlobal('AudioContext', Ctx);
    const { initAudio, audioSuspended } = await import('../src/audio.js');
    initAudio();
    expect(audioSuspended()).toBe(true); expect(resumed).toBe(1);
  });
});
