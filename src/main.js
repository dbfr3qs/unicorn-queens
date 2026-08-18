// Entry point: canvas, render loop wiring, restart key.
import { game, startGame, startLoop, update } from './game.js';
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
addEventListener('keydown', e => { if (e.code === 'KeyR' && (game.player.dead || game.player.won)) startGame(canvas.height); });
startGame(canvas.height);
