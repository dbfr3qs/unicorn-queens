// Exercises the sprite path, which no other test can reach: the suite runs in Node where
// there is no Image, so drawPlayer always takes its vector branch. Here Image is stubbed
// before the modules load, so the sprite branch runs and we can assert the exact
// drawImage the renderer emits.
//
// There is no longer a switch to turn sprites on. What decides which body is drawn — and
// therefore where the boots, the horn glint and the lantern go — is whether the sheet has
// decoded, which is what the last two describes below pin.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRecordingCtx } from './helpers/recording-ctx.js';

const DECODED = { complete: true, naturalWidth: 1024, naturalHeight: 1024 };

function stubBrowser() {
  class FakeImage {
    constructor() { Object.assign(this, DECODED); }
    set src(v) { this._src = v; }
    get src() { return this._src; }
  }
  vi.stubGlobal('Image', FakeImage);
}

// a player in whatever state the test needs, with the fields drawPlayer reads
function makePlayer(over = {}) {
  return {
    x: 100, y: 200, w: 28, h: 36, facing: 1, sx: 1, sy: 1,
    big: false, dead: false, onGround: true, vx: 0, vy: 0,
    lantern: 0, invuln: 0, boots: 0, hopFx: 0, flying: false,
    webT: 0, shield: 0, hasBow: false, ...over,
  };
}

async function render(player, t = 0) {
  vi.resetModules(); // sprites.js builds its sheet map at import, so reload it each time
  const { drawPlayer } = await import('../src/render/player.js');
  const { ctx, lines } = createRecordingCtx();
  drawPlayer(ctx, player, t);
  return lines;
}

afterEach(() => vi.unstubAllGlobals());

describe('with the sheets decoded', () => {
  beforeEach(() => stubBrowser());

  it('draws one sprite instead of the unicorn and rider rects', async () => {
    const lines = await render(makePlayer());
    const draws = lines.filter(l => l.startsWith('drawImage('));
    expect(draws).toHaveLength(1);
    // 96px cell drawn 52px tall, centred on the feet: x -26, y -52
    expect(draws[0]).toBe('drawImage([object Object], 0, 0, 96, 96, -26, -52, 52, 52)');
    // the vector body and the rider's crown are both gone
    expect(lines).not.toContain('fillRect(-14, -24, 28, 18)');
    expect(lines).not.toContain('fillRect(-4.5, -47.5, 10, 3)');
  });

  it('uses the run strip only while moving on the ground', async () => {
    const idle = await render(makePlayer({ vx: 0 }));
    expect(idle.find(l => l.startsWith('drawImage('))).toContain(', 0, 0, 96, 96,');

    // 12 fps: t = 3/12 s is frame 3, so the source x is 3 * 96
    const run = await render(makePlayer({ vx: 60 }), 3 / 12);
    expect(run.find(l => l.startsWith('drawImage('))).toContain(', 288, 0, 96, 96,');
  });

  it('picks the jump pose by the sign of vy, never by time', async () => {
    // rising: frame 0 of the two-pose jump strip
    const rise = await render(makePlayer({ onGround: false, vx: 60, vy: -200 }), 5 / 12);
    expect(rise.find(l => l.startsWith('drawImage('))).toContain(', 0, 0, 96, 96,');
    // falling: frame 1, source x = 96
    const fall = await render(makePlayer({ onGround: false, vx: 60, vy: 200 }), 5 / 12);
    expect(fall.find(l => l.startsWith('drawImage('))).toContain(', 96, 0, 96, 96,');
    // and time does not advance it — a held pose, not a cycle
    const later = await render(makePlayer({ onGround: false, vx: 60, vy: 200 }), 40 / 12);
    expect(later.find(l => l.startsWith('drawImage('))).toContain(', 96, 0, 96, 96,');
  });

  it('composites the overlays over the sprite, on the sprite anchors', async () => {
    const lines = await render(makePlayer({ boots: 1, hasBow: true, shield: 2, lantern: 1 }));
    expect(lines.some(l => l.startsWith('drawImage('))).toBe(true);
    // hoof columns measured off the PNG: -15 and +9, hoof line -2
    expect(lines).toContain('fillRect(-15, -2, 7, 3)');
    expect(lines).toContain('fillRect(9, -2, 7, 3)');
    expect(lines).toContain('createRadialGradient(0, -26, 8, 0, -26, 90)'); // body centre
    expect(lines.some(l => l.startsWith('arc(22, -30'))).toBe(true);        // shield at the head
    expect(lines.some(l => l.startsWith('arc(8, -30'))).toBe(true);         // bow at the hand
    // and emphatically NOT the vector positions
    expect(lines).not.toContain('fillRect(-13, -3, 7, 3)');
  });

  it('keeps flipping and squashing through the same transform', async () => {
    const lines = await render(makePlayer({ facing: -1, sx: 1.3, sy: 0.7 }));
    expect(lines).toContain('scale(-1.3, 0.7)'); // drawImage inherits it like fillRect did
  });
});

describe('where there is no Image at all (Node, and this whole suite)', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('draws the vector player and no sprite at all', async () => {
    const lines = await render(makePlayer());
    expect(lines.some(l => l.startsWith('drawImage('))).toBe(false);
    expect(lines).toContain('fillRect(-14, -24, 28, 18)');   // unicorn body
    expect(lines).toContain('fillRect(-4.5, -47.5, 10, 3)'); // the rider's crown
  });

  it('keeps the original overlay positions on the vector art', async () => {
    const lines = await render(makePlayer({ boots: 1, hasBow: true, lantern: 1 }));
    expect(lines).toContain('fillRect(-13, -3, 7, 3)');                     // as before
    expect(lines).toContain('createRadialGradient(0, -24, 8, 0, -24, 90)'); // as before
  });
});

describe('when the PNG has not decoded', () => {
  beforeEach(() => {
    class Pending {
      constructor() { this.complete = false; this.naturalWidth = 0; }
      set src(v) { this._src = v; }
    }
    vi.stubGlobal('Image', Pending);
  });

  it('falls back to vector art for that frame instead of drawing nothing', async () => {
    const lines = await render(makePlayer());
    expect(lines.some(l => l.startsWith('drawImage('))).toBe(false);
    expect(lines).toContain('fillRect(-14, -24, 28, 18)');
  });

  it('puts the overlays on the body it actually drew', async () => {
    // the anchors follow the vector body, not the sprite it was going to be:
    // guessing from the environment put the boots on the wrong hooves for the
    // first frames of every level
    const lines = await render(makePlayer({ boots: 1, lantern: 1 }));
    expect(lines).toContain('fillRect(-13, -3, 7, 3)');
    expect(lines).toContain('createRadialGradient(0, -24, 8, 0, -24, 90)');
    expect(lines).not.toContain('fillRect(-15, -2, 7, 3)'); // the sprite hoof
  });
});
