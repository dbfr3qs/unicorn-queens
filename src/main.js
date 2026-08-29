// Entry point: canvas, render loop wiring, restart key.
import { game, startGame, startLoop, update, restartTarget } from './game.js';
import { draw } from './render/index.js';
import { fx } from './audio.js';
import { onKeyDown, onKeyUp } from './input.js';
import { levelIndexFromSearch } from './levels/index.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

startLoop(dt => {
  update(dt, canvas.width, fx);
  draw(ctx, canvas.width, canvas.height);
});
addEventListener('keydown', onKeyDown);
addEventListener('keyup', onKeyUp);
addEventListener('keydown', e => {
  if (e.repeat) return; // holding jump through the end screen must not auto-advance
  if (e.code === 'Space' && (game.player.dead || game.player.won)) {
    // startGame carries big/bow on advance only; the heart cap (maxHp)
    // always survives, being permanent for the run
    startGame(canvas.height, restartTarget(), game.player);
    // The restart press IS a held jump: mark it so the new player doesn't
    // read it as a fresh press and hop on spawn. Release + press jumps
    // normally; a plain startGame (first load, tests) is untouched.
    game.player.jumpHeld = true;
  }
});
// ?level=N (1-based) boots straight into that level for testing, with the
// gear a run would have carried in (LEVELS[].carry).
// typeof guard: smoke.mjs boots main.js under Node, where location is absent
startGame(canvas.height, levelIndexFromSearch(typeof location !== 'undefined' ? location.search : ''));
