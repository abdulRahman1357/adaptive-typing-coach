/* Deterministic, local-only metrics for reusable single-key hunt training. */
window.HuntMetrics = (() => {
  function isTargetKey(key, target) {
    return String(key).toLowerCase() === String(target).toLowerCase();
  }

  function presentTarget({ target, targetIndex, presentedAt }) {
    return { target, targetIndex, presentedAt, firstAttempt: null, retries: [], successAt: null, successLatencyMs: null };
  }

  function recordKeyAttempt(result, { key, timestamp }) {
    const attempt = { key, correct: isTargetKey(key, result.target), at: timestamp };
    const isFirstAttempt = result.firstAttempt === null;
    const succeeded = attempt.correct && result.successAt === null;
    return {
      ...result,
      firstAttempt: isFirstAttempt ? attempt : result.firstAttempt,
      retries: isFirstAttempt ? result.retries : [...result.retries, attempt],
      successAt: succeeded ? timestamp : result.successAt,
      successLatencyMs: succeeded ? timestamp - result.presentedAt : result.successLatencyMs
    };
  }

  function summarize(results) {
    const attempted = results.filter(result => result.firstAttempt);
    const firstAttemptCorrect = attempted.filter(result => result.firstAttempt.correct).length;
    const completed = results.filter(result => result.successAt !== null);
    const successfulLatencies = completed.map(result => result.successLatencyMs);
    return {
      targetsPresented: results.length,
      firstAttempts: attempted.length,
      firstAttemptCorrect,
      firstAttemptAccuracy: attempted.length ? firstAttemptCorrect / attempted.length : 0,
      successfulTargets: completed.length,
      retryCount: results.reduce((total, result) => total + result.retries.length, 0),
      averageSuccessLatencyMs: successfulLatencies.length ? successfulLatencies.reduce((total, latency) => total + latency, 0) / successfulLatencies.length : 0,
      successfulLatencies
    };
  }

  return { presentTarget, recordKeyAttempt, summarize };
})();
