import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, multiplierFor, pointsFor } from './scoring.js';

test('le multiplicateur monte de 0,25 par bonne réponse et plafonne à ×2', () => {
  assert.equal(multiplierFor(0), 1);
  assert.equal(multiplierFor(2), 1.5);
  assert.equal(multiplierFor(4), 2);
  assert.equal(multiplierFor(10), 2);
  assert.equal(multiplierFor(-3), 1);
});

test('répondre instantanément donne 150 points sans série', () => {
  assert.equal(pointsFor(15, 0), 150);
});

test('répondre à la dernière seconde donne 100 points sans série', () => {
  assert.equal(pointsFor(0, 0), 100);
});

test('la série multiplie les points', () => {
  assert.equal(pointsFor(15, 4), 300);
  assert.equal(pointsFor(0, 2), 150);
});

test('un temps hors bornes reste dans la fourchette', () => {
  assert.equal(pointsFor(99, 0), 150);
  assert.equal(pointsFor(-5, 0), 100);
});

test('le mode Éclair valorise les points ×1,5 sur un chrono de 8 s', () => {
  assert.equal(pointsFor(8, 0, MODES.blitz), 225);
  assert.equal(pointsFor(0, 0, MODES.blitz), 150);
});

test('le mode Zen donne ×0,8 sur un chrono de 25 s', () => {
  assert.equal(pointsFor(25, 0, MODES.zen), 120);
  assert.equal(pointsFor(0, 0, MODES.zen), 80);
});
