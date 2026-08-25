// Headless scripted playthrough of the level 3 hidden-key chain — the
// "first pass" order, no witch hint: stand on the west lip, shoot the
// faintly glowing brick in the wall three times with plain standing
// shots, wait out the crumble, hop across to the revealed ledge and take
// the key. Runs the full game update (real physics, camera, cooldowns),
// so this pins the chain's reachability — the no soft-lock guarantee.
import { describe, it, expect, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';
import { resetArrows } from '../src/arrows.js';
import { resetParticles } from '../src/particles.js';
import { spawnLoot, updateLoot, resetLoot } from '../src/loot.js';
import { P_H } from '../src/player.js';

const DT = 1 / 60;
const silent = { play: () => {} };

const setInput = o => {
  for (const k of ['left', 'right', 'jump', 'fire', 'up', 'down', 'cast'])
    input[k] = !!o[k];
};

const frames = n => {
  for (let i = 0; i < n; i++) update(DT, 800, silent);
};

afterEach(() => {
  setInput({});
  resetArrows();
  resetParticles();
  resetLoot();
  startGame(600, 0);
});

describe('level 3 key chain, first pass (no witch hint)', () => {
  it('lip -> 3 standing shots -> crumble -> ledge -> key', () => {
    startGame(600, 2);
    const g = game, p = g.player, lvl = g.level;
    p.hasBow = true; // the bow is carried from level 2
    const gy = lvl.groundY;
    // park on the west lip (top gy-120), near its right edge
    p.x = 1500; p.y = (gy - 120) - P_H; p.vy = 0;
    // keep the nearby ghost out of the playthrough (determinism)
    for (const e of g.enemies) if (e.kind === 'ghost' && e.x < 1700) e.x = 300;

    frames(45); // let the camera settle on the lip (arrows die at the view edge)
    expect(p.onGround).toBe(true);
    expect(p.x).toBeGreaterThan(1460); // still on the lip, no drift

    setInput({ right: true });
    frames(3); // face the wall
    expect(p.facing).toBe(1);
    setInput({});

    // three plain standing shots, one per fire cooldown (0.22 s -> 15 frames)
    for (let shot = 0; shot < 3; shot++) {
      setInput({ fire: true });
      update(DT, 800, silent);
      setInput({});
      frames(14); // arrow flies the ~50 px to the brick; the cooldown lapses
      expect(lvl.marker.hits).toBe(shot + 1); // every standing shot hits
    }
    expect(lvl.keyNook.crumbleT).toBeGreaterThan(0);
    expect(lvl.keyNook.revealed).toBe(false);

    frames(35); // 35/60 s > 0.5 s crumble
    expect(lvl.keyNook.revealed).toBe(true);
    expect(lvl.platforms.find(s => s.x === 1600 && s.w === 90).hidden).toBe(false);

    // hop 2: jump from the lip's right edge, drift right until over the
    // key, then stop (vx is instant) and drop onto the ledge
    p.x = 1532; p.y = (gy - 120) - P_H; p.vy = 0;
    frames(2);
    setInput({ right: true, jump: true });
    frames(1);
    for (let i = 0; i < 120 && !lvl.key.taken; i++) {
      // hold jump through the ascent (variable height: releasing cuts the
      // jump); stop drifting over the key, then drop onto the ledge
      const over = p.x >= 1624;
      setInput(over ? {} : { right: true, jump: true });
      update(DT, 800, silent);
    }
    expect(lvl.key.taken).toBe(true); // taken mid-air or on the ledge
    expect(p.dead).toBe(false);
  });
});

describe('death-restart bow safety net', () => {
  it('a level 3 restart drops the carried bow; the bow box restores it', () => {
    startGame(600, 2);
    game.player.hasBow = true; // the bow earned in level 2, carried on entry
    // death restart: main.js calls startGame(h, levelIndex, player) — the
    // index is unchanged, so only maxHp/flight carry over, the bow does not
    startGame(600, 2, game.player);
    const g = game, p = g.player, lvl = g.level;
    expect(p.hasBow).toBe(false); // the soft-lock the safety box fixes
    const box = lvl.boxes.find(b => b.drop === 'bow');
    box.broken = true;
    spawnLoot(box);
    p.x = box.x; p.y = lvl.groundY - P_H; p.vy = 0; // stand where the drop lands
    for (let i = 0; i < 60 && !p.hasBow; i++) updateLoot(p, lvl, DT, silent);
    expect(p.hasBow).toBe(true);
  });
});
