import { describe, it, expect, afterEach } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { game, startGame, update, reachedExit } from '../src/game.js';

const DT = 1 / 60;
const fx = { play: () => {} };

describe('level 2 data', () => {
  it('is registered as the second level', () => {
    expect(LEVELS.length).toBe(5);
    expect(LEVELS[1].name).toBe('bridge-castle');
  });

  it('has zones, moats, gate, pearl, and a locked exit (no goal flag)', () => {
    const l = LEVELS[1].make(600);
    expect(l.width).toBe(3600);
    expect(l.zones.map(z => z.kind)).toEqual(['outdoor', 'interior', 'hall']);
    expect(l.moats.length).toBe(2);
    expect(l.gate.x).toBe(880);
    expect(l.pearl).toBeTruthy();
    expect(l.pearl.visible).toBe(false);
    expect(l.exit.locked).toBe(true);
    expect(l.goal).toBeUndefined();
    expect(l.startItems).toEqual(['bow']);
  });

  it('ground gaps are the two moats and the chasm; the stairs descend 20px a step', () => {
    const l = LEVELS[1].make(600);
    const topAt = x => {
      const seg = l.ground.find(s => x >= s.x && x < s.x + s.w);
      return seg ? seg.y : null;
    };
    expect(topAt(300)).toBe(560); // bridge deck
    expect(topAt(420)).toBe(null); // moat gap 1
    expect(topAt(550)).toBe(560);
    expect(topAt(680)).toBe(null); // moat gap 2
    expect(topAt(1500)).toBe(560); // room 1
    expect(topAt(1940)).toBe(null); // chasm
    expect(topAt(2000)).toBe(560); // room 2
    expect(topAt(3200)).toBe(560); // boss hall floor
    expect(topAt(3460)).toBe(580);
    expect(topAt(3490)).toBe(600);
    expect(topAt(3520)).toBe(620);
    expect(topAt(3550)).toBe(640); // bottom step
  });

  it('only the bridge deck is planks; everything else is plain ground', () => {
    const l = LEVELS[1].make(600);
    expect(l.ground.slice(0, 3).map(s => s.kind)).toEqual(['plank', 'plank', 'plank']);
    expect(l.ground.slice(3).some(s => s.kind === 'plank')).toBe(false);
  });
});

describe('level 2 flow', () => {
  afterEach(() => startGame(600, 0));

  it('the player starts with the bow and 3 hp', () => {
    startGame(600, 1);
    expect(game.player.hasBow).toBe(true);
    expect(game.player.hp).toBe(3);
  });

  it('pearl appears when the mage dies; pickup unlocks the exit', () => {
    startGame(600, 1);
    update(DT, 800, fx);
    expect(game.level.pearl.visible).toBe(false); // mage still alive
    const mage = game.enemies.find(e => e.kind === 'mage');
    mage.dead = true;
    update(DT, 800, fx);
    expect(game.level.pearl.visible).toBe(true);
    game.player.x = game.level.pearl.x + 4; // stand on the pearl
    game.player.y = game.level.pearl.y + 4;
    game.player.vy = 0;
    update(DT, 800, fx);
    expect(game.level.pearl.taken).toBe(true);
    expect(game.level.exit.locked).toBe(false);
    game.player.x = 3520; // down on the stairs
    game.player.y = 600;
    expect(reachedExit(game.player, game.level)).toBe(true);
  });
});
