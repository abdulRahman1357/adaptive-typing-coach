const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function providerModule() {
  const context = { window: {}, Math };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'exercise-provider.js'), 'utf8'), context);
  return context.window.ExerciseProvider;
}

const fingerMap = {
  'left-ring': ['KeyW', 'KeyS', 'KeyX'],
  'left-middle': ['KeyE', 'KeyD', 'KeyC'],
  'left-index': ['KeyR', 'KeyF', 'KeyV', 'KeyT', 'KeyG', 'KeyB'],
  'right-index': ['KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM'],
  'right-middle': ['KeyI', 'KeyK', 'Comma'],
  'right-ring': ['KeyO', 'KeyL', 'Period'],
  thumb: ['Space']
};

function validatorModule() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'exercise-validator.js'), 'utf8'), context);
  return context.window.ExerciseValidator;
}

test('static provider returns a structured candidate using retained static content', () => {
  const ExerciseProvider = providerModule();
  const provider = ExerciseProvider.createStaticExerciseProvider({ random: () => 0 });
  const plan = provider.getExercise({ stage: 'hunt' });

  assert.equal(plan.recommendation.stage, 'hunt');
  assert.equal(plan.exercise.kind, 'hunt');
  assert.equal(plan.exercise.items.length, 5);
  assert.ok(ExerciseProvider.STATIC_EXERCISE_DATA.huntKeys.includes(plan.exercise.items[0]));
});

test('a valid static exercise reaches the integration gateway through provider and validator', () => {
  const ExerciseProvider = providerModule();
  const provider = ExerciseProvider.createStaticExerciseProvider({ random: () => 0 });
  const result = ExerciseProvider.getValidatedExercise(provider, { stage: 'hunt', fingerMap }, validatorModule());

  assert.equal(result.valid, true);
  assert.equal(result.exercise.kind, 'hunt');
  assert.ok(result.exercise.items.every(key => key !== 'a'));
});

test('an invalid static exercise is rejected and cannot bypass validation', () => {
  const ExerciseProvider = providerModule();
  const provider = ExerciseProvider.createStaticExerciseProvider({ random: () => 0 });
  const result = ExerciseProvider.getValidatedExercise(provider, { stage: 'word', fingerMap }, validatorModule());

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('Words')));
});

test('a provider failure uses a separately validated safe fallback', () => {
  const ExerciseProvider = providerModule();
  const provider = { getExercise: () => { throw new Error('unavailable'); } };
  const result = ExerciseProvider.getValidatedExercise(provider, { stage: 'word', fingerMap }, validatorModule(), () => ({ exercise: { kind: 'word', items: ['milk'] } }));

  assert.equal(result.valid, true);
  assert.equal(result.source, 'fallback');
  assert.equal(result.exercise.items[0], 'milk');
});

test('the exact authoritative map remains the source of allowed provider output', () => {
  const ExerciseProvider = providerModule();
  const provider = { getExercise: () => ({ exercise: { kind: 'hunt', items: ['a'] } }) };
  const result = ExerciseProvider.getValidatedExercise(provider, { stage: 'hunt', fingerMap }, validatorModule());

  assert.equal(result.valid, false);
});
