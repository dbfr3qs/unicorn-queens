// Level 4 of the Blackmire chain: the bridge and the web wall. The
// bridge is raised (hidden platform) until the winch lowers it; once
// down it is a solid floor. The web wall melts on the w5 beat and never
// re-seals (the portcullis would close behind the player). The pearl
// appears only when the spider boss is dead and unlocks the exit.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { advanceDialogue } from '../src/dialogue.js';
import { LOWER_T } from '../src/bridge.js';
import { DOOR_PASS } from '../src/door.js';

const DT = 1 / 60;
const fx = { play: () => {} };

const run = (n = 1) => { for (let i = 0; i < n; i++) update(DT, 800, fx); };

// The intro beat fires on frame 1 and freezes the world while open.
const dismissIntro = () => { run(1); advanceDialogue(); advanceDialogue(); advanceDialogue(); };

describe('the old bridge', () => {
  beforeEach(() => startGame(600, 5));
  afterEach(() => startGame(600, 5));

  const bridgePlat = () => game.level.platforms.find(pl => pl.kind === 'bridge');

  it('is raised and non-solid until the winch turns it', () => {
    expect(game.level.bridge.state).toBe('raised');
    expect(bridgePlat().hidden).toBe(true);
    expect(bridgePlat().y).toBe(554);
  });

  it('sinks to ground level over LOWER_T and becomes solid', () => {
    dismissIntro();
    const b = game.level.bridge;
    b.state = 'lowering';
    b.lowerT = LOWER_T; // what the w5 beat sets
    run(18); // a quarter of the way
    expect(b.state).toBe('lowering');
    const mid = bridgePlat().y;
    expect(mid).toBeGreaterThan(554);
    expect(mid).toBeLessThan(560);
    expect(bridgePlat().hidden).toBe(true); // not a floor while it moves
    run(72); // the rest of LOWER_T
    expect(b.state).toBe('down');
    expect(bridgePlat().y).toBe(560);
    expect(bridgePlat().hidden).toBe(false); // the span is a floor now
  });

  it('does nothing when raised (no drift over time)', () => {
    dismissIntro();
    run(120);
    expect(game.level.bridge.state).toBe('raised');
    expect(bridgePlat().y).toBe(554);
    expect(bridgePlat().hidden).toBe(true);
  });
});

describe('the web wall', () => {
  beforeEach(() => startGame(600, 5));
  afterEach(() => startGame(600, 5));

  it('melts: opening decays to open', () => {
    dismissIntro();
    const d = game.level.door;
    expect(d.kind).toBe('webwall');
    d.state = 'opening';
    d.openT = 1.5; // what the w5 beat sets
    expect(d.state).not.toBe('open');
    run(95); // 1.5 s + float margin
    expect(d.state).toBe('open');
  });

  it('never re-seals, even long after the player is past it', () => {
    dismissIntro();
    const d = game.level.door;
    d.state = 'open';
    game.player.x = d.x + d.w + DOOR_PASS + 40; // fully past
    game.player.y = game.level.groundY - game.player.h;
    run(300); // 5 s: more than enough for closeT to run out
    expect(d.state).toBe('open');
    expect(d.state).not.toBe('shut');
  });

  it('control: a plain portcullis still closes behind the player', () => {
    startGame(600, 2); // level 3: the troll-hall portcullis
    dismissIntro(); // harmless no-op if L3 has no intro beat
    const d = game.level.door;
    expect(d.kind).not.toBe('webwall');
    d.state = 'open';
    game.player.x = d.x + d.w + DOOR_PASS + 40;
    game.player.y = game.level.groundY - game.player.h;
    run(120); // 2 s
    expect(d.state).toBe('shut');
  });
});

describe('the pearl and the exit', () => {
  beforeEach(() => startGame(600, 5));
  afterEach(() => startGame(600, 5));

  it('appears only when the spider boss is dead', () => {
    const pearl = game.level.pearl;
    expect(pearl.showWhen([])).toBe(false);
    expect(pearl.showWhen([{ kind: 'spiderboss', dead: false }])).toBe(false);
    expect(pearl.showWhen([{ kind: 'spiderboss', dead: true }])).toBe(true);
    expect(pearl.showWhen([{ kind: 'snake', dead: true }, { kind: 'spiderboss', dead: true }])).toBe(true);
  });

  it('taking it unlocks the exit arch', () => {
    const pearl = game.level.pearl;
    expect(game.level.exit.locked).toBe(true);
    pearl.visible = true; // the boss is dead
    game.player.x = pearl.x - 6;
    game.player.y = pearl.y - 10;
    run(1);
    expect(pearl.taken).toBe(true);
    expect(game.level.exit.locked).toBe(false);
  });
});
