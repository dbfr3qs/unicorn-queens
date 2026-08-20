// Entry point: canvas, render loop wiring, restart key.
import { game, startGame, startLoop, update, restartTarget } from './game.js';
import { draw } from './render/index.js';
import { fx } from './audio.js';
import { onKeyDown, onKeyUp } from './input.js';

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
  }
});
startGame(canvas.height);
