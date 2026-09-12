const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const fingerMap = {
  'left-ring': ['KeyW', 'KeyS', 'KeyX'],
  'left-middle': ['KeyE', 'KeyD', 'KeyC'],
  'left-index': ['KeyR', 'KeyF', 'KeyV', 'KeyT', 'KeyG', 'KeyB'],
  'right-index': ['KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM'],
  'right-middle': ['KeyI', 'KeyK', 'Comma'],
  'right-ring': ['KeyO', 'KeyL', 'Period'],
  thumb: ['Space']
};

function validator() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'exercise-validator.js'), 'utf8'), context);
  return context.window.ExerciseValidator;
}
function validate(plan, stage) { return validator().validate(plan, { stage, fingerMap }); }

test('accepts a valid Hunt exercise', () => {
  assert.equal(validate({ exercise: { kind: 'hunt', items: ['g', 'h'] } }, 'hunt').valid, true);
});
test('rejects an untrained hunt key', () => {
  assert.equal(validate({ exercise: { kind: 'hunt', items: ['a'] } }, 'hunt').valid, false);
});
test('accepts a valid single-finger zone exercise', () => {
  assert.equal(validate({ exercise: { kind: 'zone', finger: 'left-index', items: ['r', 'g'] } }, 'zone').valid, true);
});
test('rejects a mixed-zone exercise', () => {
  assert.equal(validate({ exercise: { kind: 'zone', finger: 'left-index', items: ['r', 'h'] } }, 'zone').valid, false);
});
test('accepts a valid mapped transition', () => {
  assert.equal(validate({ exercise: { kind: 'transition', items: ['gh'], focusTransitions: ['g->h'] } }, 'transition').valid, true);
});
test('rejects an invalid transition', () => {
  assert.equal(validate({ exercise: { kind: 'transition', items: ['ga'] } }, 'transition').valid, false);
});
test('rejects a word containing an untrained key', () => {
  assert.equal(validate({ exercise: { kind: 'word', items: ['sad'] } }, 'word').valid, false);
});
test('rejects a sentence containing an untrained key', () => {
  assert.equal(validate({ exercise: { kind: 'sentence', items: ['small steps'] } }, 'sentence').valid, false);
});
test('rejects malformed and unknown exercise structures', () => {
  assert.equal(validate({ exercise: { kind: 'hunt', items: ['g'], unknown: true } }, 'hunt').valid, false);
});
test('rejects an empty exercise', () => {
  assert.equal(validate({ exercise: { kind: 'hunt', items: [] } }, 'hunt').valid, false);
});
test('rejects an exercise whose kind does not match the current stage', () => {
  assert.equal(validate({ exercise: { kind: 'word', items: ['milk'] } }, 'hunt').valid, false);
});
