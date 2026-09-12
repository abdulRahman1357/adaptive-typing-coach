const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadHuntMetrics() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'hunt-metrics.js'), 'utf8'), context);
  return context.window.HuntMetrics;
}

test('G -> H -> Backspace -> G preserves the incorrect first attempt and measures the successful G', () => {
  const HuntMetrics = loadHuntMetrics();
  let result = HuntMetrics.presentTarget({ target: 'G', targetIndex: 0, presentedAt: 100 });
  const rawEvents = [{ type: 'key', actual: 'H', timestamp: 160 }, { type: 'backspace', timestamp: 200 }, { type: 'key', actual: 'G', timestamp: 260 }];
  for (const event of rawEvents) if (event.type === 'key') result = HuntMetrics.recordKeyAttempt(result, { key: event.actual, timestamp: event.timestamp });
  const summary = HuntMetrics.summarize([result]);
  assert.equal(JSON.stringify(result.firstAttempt), JSON.stringify({ key: 'H', correct: false, at: 160 }));
  assert.equal(summary.firstAttemptAccuracy, 0);
  assert.equal(rawEvents[1].type, 'backspace');
  assert.equal(result.target, 'G');
  assert.equal(result.successAt, 260);
  assert.equal(result.successLatencyMs, 160);
  assert.equal(summary.retryCount, 1);
});

test('a correct first attempt completes without retries', () => {
  const HuntMetrics = loadHuntMetrics();
  const result = HuntMetrics.recordKeyAttempt(HuntMetrics.presentTarget({ target: 'G', targetIndex: 0, presentedAt: 10 }), { key: 'G', timestamp: 45 });
  const summary = HuntMetrics.summarize([result]);
  assert.equal(result.firstAttempt.correct, true);
  assert.equal(result.successLatencyMs, 35);
  assert.equal(summary.firstAttemptAccuracy, 1);
  assert.equal(summary.retryCount, 0);
});

test('multiple wrong attempts are retries and do not replace the first result', () => {
  const HuntMetrics = loadHuntMetrics();
  let result = HuntMetrics.presentTarget({ target: 'G', targetIndex: 0, presentedAt: 0 });
  for (const [key, timestamp] of [['H', 20], ['J', 40], ['G', 80]]) result = HuntMetrics.recordKeyAttempt(result, { key, timestamp });
  assert.equal(JSON.stringify(result.firstAttempt), JSON.stringify({ key: 'H', correct: false, at: 20 }));
  assert.equal(JSON.stringify(result.retries.map(retry => retry.key)), JSON.stringify(['J', 'G']));
  assert.equal(result.successLatencyMs, 80);
});

test('Backspace is raw event data and cannot change a first attempt', () => {
  const HuntMetrics = loadHuntMetrics();
  const result = HuntMetrics.recordKeyAttempt(HuntMetrics.presentTarget({ target: 'G', targetIndex: 0, presentedAt: 0 }), { key: 'H', timestamp: 10 });
  const rawEvent = { type: 'backspace', timestamp: 15 };
  assert.equal(rawEvent.type, 'backspace');
  assert.equal(JSON.stringify(result.firstAttempt), JSON.stringify({ key: 'H', correct: false, at: 10 }));
  assert.equal(result.retries.length, 0);
});

test('multiple targets retain independent first attempts and round totals', () => {
  const HuntMetrics = loadHuntMetrics();
  let g = HuntMetrics.presentTarget({ target: 'G', targetIndex: 0, presentedAt: 0 });
  g = HuntMetrics.recordKeyAttempt(g, { key: 'H', timestamp: 10 });
  g = HuntMetrics.recordKeyAttempt(g, { key: 'G', timestamp: 30 });
  let h = HuntMetrics.presentTarget({ target: 'H', targetIndex: 1, presentedAt: 40 });
  h = HuntMetrics.recordKeyAttempt(h, { key: 'H', timestamp: 60 });
  const summary = HuntMetrics.summarize([g, h]);
  assert.equal(summary.targetsPresented, 2);
  assert.equal(summary.firstAttemptCorrect, 1);
  assert.equal(summary.firstAttemptAccuracy, 0.5);
  assert.equal(summary.successfulTargets, 2);
  assert.equal(summary.retryCount, 1);
  assert.deepEqual(summary.successfulLatencies, [30, 20]);
});
