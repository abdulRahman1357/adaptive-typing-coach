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

function loadSessionProfile() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'session-profile.js'), 'utf8'), context);
  return context.window.SessionProfile;
}

function profile(rounds, options = {}) {
  return loadSessionProfile().fromRounds({ rounds, fingerMap, ...options });
}

test('aggregates a correct first hunt attempt', () => {
  const result = profile([{ stage: 'hunt', events: [{ type: 'key', actual: 'g', correct: true, timestamp: 130 }], huntResults: [{ target: 'g', firstAttempt: { correct: true }, retries: [], successAt: 130, successLatencyMs: 30 }] }]);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.mappingVersion, 'three-finger-v1');
  assert.equal(result.currentTrainingStage, 'hunt');
  assert.equal(result.perKey.g.firstAttemptAccuracy, 1);
  assert.equal(result.hunt.successfulLatency.averageMs, 30);
});

test('retains an incorrect hunt first attempt and its successful retry', () => {
  const result = profile([{ stage: 'hunt', events: [{ type: 'key', actual: 'h', correct: false, timestamp: 110 }, { type: 'backspace', timestamp: 125 }, { type: 'key', actual: 'g', correct: true, timestamp: 160 }], huntResults: [{ target: 'g', firstAttempt: { correct: false }, retries: [{ key: 'g' }], successAt: 160, successLatencyMs: 60 }] }]);
  assert.equal(result.perKey.g.firstAttemptAccuracy, 0);
  assert.equal(result.perKey.g.retries, 1);
  assert.equal(result.hunt.retryCount, 1);
  assert.equal(result.hunt.successfulLatency.averageMs, 60);
});

test('aggregates multiple keys, transitions, errors, correction data, and hesitation', () => {
  const result = profile([{ stage: 'transition', events: [{ type: 'key', actual: 'g', correct: true, timestamp: 0 }, { type: 'key', actual: 'h', correct: false, timestamp: 800 }, { type: 'backspace', timestamp: 900 }, { type: 'key', actual: 'h', correct: true, timestamp: 1100 }] }]);
  assert.equal(result.perKey.g.attempts, 1);
  assert.equal(result.perKey.h.attempts, 2);
  assert.equal(result.perKey.h.errors, 1);
  assert.equal(result.transitions['g→h'].attempts, 1);
  assert.equal(result.transitions['g→h'].errors, 1);
  assert.equal(result.transitions['g→h'].latency.averageMs, 800);
  assert.equal(result.transitions['g→h'].hesitationCount, 1);
  assert.equal(result.corrections.backspaceCount, 1);
  assert.equal(result.corrections.latency.averageMs, 100);
  assert.equal(result.hesitations.count, 1);
  assert.equal(result.hesitations.latency.p90Ms, 800);
});

test('does not create profile keys for untrained input', () => {
  const result = profile([{ stage: 'hunt', events: [{ type: 'key', actual: 'q', correct: false, timestamp: 10 }] }]);
  assert.equal(result.perKey.q, undefined);
  assert.equal(result.transitions['q→q'], undefined);
});

test('returns a stable empty profile for an empty session', () => {
  const result = profile([]);
  assert.equal(result.currentTrainingStage, null);
  assert.equal(result.roundCount, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result.perKey)), {});
  assert.equal(result.corrections.backspaceCount, 0);
  assert.equal(result.hunt.firstAttemptAccuracy, 0);
  assert.equal(result.hesitations.count, 0);
});
