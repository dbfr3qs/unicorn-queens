// Dialogue: proximity triggers, one-shot beats, world freeze, advance.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import {
  isDialogueOpen, currentLine, openDialogue, advanceDialogue, resetDialogue,
} from '../src/dialogue.js';
import { input, onKeyDown } from '../src/input.js';
import { spawnEnemy } from '../src/enemies.js';
import { burst, particles } from '../src/particles.js';
import { FX } from '../src/effects.js';

const DT = 1 / 60;
const fx = { play: () => {} };
const ev = code => ({ code, repeat: false, preventDefault: () => {} });
const L = text => ({ speaker: 'Witch', text });
// A 120x460 trigger rect centred on cx, reaching the ground.
const rect = (cx, beats) => ({ id: 'd', x: cx - 60, y: 100, w: 120, h: 460, beats });
const stand = x => { game.player.x = x; game.player.y = game.level.groundY - 44; };

beforeEach(() => { startGame(600, 0); });

afterEach(() => {
  resetDialogue();
  input.left = input.right = input.jump = input.fire = false;
  input.up = input.down = false;
  input.cast = false;
});

describe('trigger', () => {
  it('opens on overlap, fires once, and a finished beat never re-fires', () => {
    game.level.dialogs = [rect(500, [{ id: 'b1', lines: [L('a'), L('b')] }])];
    stand(500);
    update(DT, 800, fx);
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().text).toBe('a');
    expect(game.dialogsFired.has('b1')).toBe(true);
    update(DT, 800, fx); // still overlapping: frozen, no re-trigger
    expect(currentLine().text).toBe('a');
    advanceDialogue(); // a -> b
    advanceDialogue(); // b -> close
    expect(isDialogueOpen()).toBe(false);
    stand(200); update(DT, 800, fx); // walk out of the rect
    stand(500); update(DT, 800, fx); // re-approach: the spent beat stays spent
    expect(isDialogueOpen()).toBe(false);
  });

  it('a dead player does not trigger', () => {
    game.level.dialogs = [rect(500, [{ id: 'b1', lines: [L('a')] }])];
    stand(500);
    game.player.dead = true;
    update(DT, 800, fx);
    expect(isDialogueOpen()).toBe(false);
    expect(game.dialogsFired.has('b1')).toBe(false);
  });
});

describe('world freeze', () => {
  it('freezes the player, enemies, particles, camera and the clock', () => {
    game.level.dialogs = [rect(500, [{ id: 'b1', lines: [L('a')] }])];
    const e = spawnEnemy({ kind: 'slime', x: 640, minX: 560, maxX: 720 }, game.level);
    game.enemies.push(e);
    stand(500);
    update(DT, 800, fx); // opens the box
    expect(isDialogueOpen()).toBe(true);
    input.right = true; // held during the freeze: must not move the player
    burst(300, 300, FX.cast);
    const px = game.player.x, ex = e.x, cam = game.camera.x, t = game.gameTime;
    const partsBefore = particles.map(q => q.t.toFixed(3)).join(',');
    for (let i = 0; i < 10; i++) update(DT, 800, fx);
    expect(game.player.x).toBe(px);
    expect(e.x).toBe(ex);
    expect(game.camera.x).toBe(cam);
    expect(game.gameTime).toBe(t);
    expect(particles.map(q => q.t.toFixed(3)).join(',')).toBe(partsBefore); // particles never tick
    input.right = false;
  });
});

describe('advance', () => {
  it('advances one line per call and closes on the last', () => {
    openDialogue([L('a'), L('b')]);
    expect(advanceDialogue()).toBe(false);
    expect(currentLine().text).toBe('b');
    expect(advanceDialogue()).toBe(true);
    expect(isDialogueOpen()).toBe(false);
    expect(advanceDialogue()).toBe(false); // closed: no-op
  });

  it('Space, Enter and arrows advance; advancing never sets game flags', () => {
    openDialogue([L('a'), L('b'), L('c')]);
    onKeyDown(ev('Space')); // a -> b
    onKeyDown(ev('Enter')); // b -> c
    expect(currentLine().text).toBe('c');
    onKeyDown(ev('ArrowLeft')); // c -> close
    expect(isDialogueOpen()).toBe(false);
    expect(input.left).toBe(false); // ArrowLeft advanced, did not move
    expect(input.jump).toBe(false); // Space advanced, did not jump
  });
});

describe('beats', () => {
  it('fires the first eligible unfired beat; a later beat waits on its condition', () => {
    game.level.dialogs = [{
      id: 'cell', x: 440, y: 100, w: 120, h: 460,
      beats: [
        { id: 'hint', when: g => !g.player.hasKey, lines: [L('hint')] },
        { id: 'unlock', when: g => !!g.player.hasKey, lines: [L('unlock')] },
      ],
    }];
    stand(500);
    update(DT, 800, fx);
    expect(currentLine().text).toBe('hint'); // keyless: the hint beat
    advanceDialogue(); // close
    stand(200); update(DT, 800, fx);
    stand(500); update(DT, 800, fx); // still keyless: hint spent, unlock locked
    expect(isDialogueOpen()).toBe(false);
    game.player.hasKey = true;
    stand(200); update(DT, 800, fx);
    stand(500); update(DT, 800, fx); // the unlock beat now fires
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().text).toBe('unlock');
    expect(game.dialogsFired.has('hint')).toBe(true);
    expect(game.dialogsFired.has('unlock')).toBe(true);
  });
});
