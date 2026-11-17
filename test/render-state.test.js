// Canvas state hygiene: a draw routine leaves the context as it found it and
// sets what it depends on.
import { describe, it, expect } from 'vitest';
import { drawIntro } from '../src/render/intro.js';
import { drawHud } from '../src/render/hud.js';
import { startGame } from '../src/game.js';
import { startIntro, endIntro } from '../src/intro.js';

// Like smoke.mjs's ctxStub (unknown methods are no-ops returning { width: 0 }),
// but save/restore really push and pop textAlign.
function stateCtx() {
  const t = {}, stack = [];
  t.save = () => { stack.push(t.textAlign); };
  t.restore = () => { t.textAlign = stack.pop(); };
  return new Proxy(t, {
    get: (o, prop) => (prop in o ? o[prop] : () => ({ width: 0 })),
    set: (o, prop, v) => { o[prop] = v; return true; },
  });
}

describe('canvas state', () => {
  it('drawIntro leaves textAlign as it found it', () => {
    startIntro(600);
    const c = stateCtx(); c.textAlign = 'left'; drawIntro(c, 800, 600);
    endIntro();
    expect(c.textAlign).toBe('left');
  });
  it('the HUD sets its own alignment', () => {
    const c = stateCtx(); c.textAlign = 'right'; const seen = [];
    c.fillText = () => seen.push(c.textAlign);
    startGame(600, 0); drawHud(c, 800, 600);
    expect(seen[0]).toBe('left'); // the first heart
  });
});
