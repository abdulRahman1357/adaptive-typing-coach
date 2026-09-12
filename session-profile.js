/* UI-independent, local-only aggregation for future training recommendations. */
window.SessionProfile = (() => {
  const SCHEMA_VERSION = 1;
  const DEFAULT_MAPPING_VERSION = 'three-finger-v1';
  const HESITATION_THRESHOLD_MS = 700;

  function characterForCode(code) {
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    return ({ Comma: ',', Period: '.', Space: ' ' })[code] || null;
  }

  function allowedCharacters(fingerMap) {
    return new Set(Object.values(fingerMap || {}).flatMap(codes => codes.map(characterForCode)).filter(Boolean));
  }

  function createStats() { return []; }
  function summarize(values) {
    if (!values.length) return { count: 0, averageMs: 0, medianMs: 0, p90Ms: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = fraction => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
    return {
      count: sorted.length,
      averageMs: values.reduce((total, value) => total + value, 0) / values.length,
      medianMs: percentile(0.5),
      p90Ms: percentile(0.9)
    };
  }

  function emptyKey() {
    return { attempts: 0, errors: 0, firstAttempts: 0, firstAttemptCorrect: 0, retries: 0, successfulLatencyValues: createStats() };
  }

  function emptyTransition() {
    return { attempts: 0, errors: 0, latencyValues: createStats(), hesitationCount: 0 };
  }

  function publicKeyStats(stats) {
    return {
      attempts: stats.attempts,
      errors: stats.errors,
      firstAttempts: stats.firstAttempts,
      firstAttemptCorrect: stats.firstAttemptCorrect,
      firstAttemptAccuracy: stats.firstAttempts ? stats.firstAttemptCorrect / stats.firstAttempts : 0,
      retries: stats.retries,
      successfulLatency: summarize(stats.successfulLatencyValues)
    };
  }

  function publicTransitionStats(stats) {
    return {
      attempts: stats.attempts,
      errors: stats.errors,
      latency: summarize(stats.latencyValues),
      hesitationCount: stats.hesitationCount
    };
  }

  function addHuntResult(result, allowed, perKey, huntLatencies) {
    const target = String(result.target || '').toLowerCase();
    if (!allowed.has(target)) return;
    const key = perKey[target] || (perKey[target] = emptyKey());
    if (result.firstAttempt) {
      key.firstAttempts += 1;
      if (result.firstAttempt.correct) key.firstAttemptCorrect += 1;
    }
    key.retries += Array.isArray(result.retries) ? result.retries.length : 0;
    if (typeof result.successLatencyMs === 'number' && result.successAt !== null) {
      key.successfulLatencyValues.push(result.successLatencyMs);
      huntLatencies.push(result.successLatencyMs);
    }
  }

  function fromRounds({ rounds = [], fingerMap, mappingVersion = DEFAULT_MAPPING_VERSION, currentStage = null } = {}) {
    const allowed = allowedCharacters(fingerMap);
    const perKey = {};
    const transitions = {};
    const correctionLatencies = createStats();
    const hesitationLatencies = createStats();
    const huntLatencies = createStats();
    let backspaceCount = 0;
    let huntFirstAttempts = 0;
    let huntFirstAttemptCorrect = 0;
    let huntRetries = 0;
    let huntSuccessfulTargets = 0;
    const stageCounts = {};

    for (const round of rounds) {
      if (!round || typeof round !== 'object') continue;
      if (round.stage) stageCounts[round.stage] = (stageCounts[round.stage] || 0) + 1;
      const keyEvents = [];
      let previousKey = null;

      for (const event of Array.isArray(round.events) ? round.events : []) {
        if (event.type === 'backspace') {
          backspaceCount += 1;
          if (previousKey && typeof event.timestamp === 'number' && typeof previousKey.timestamp === 'number') correctionLatencies.push(event.timestamp - previousKey.timestamp);
          continue;
        }
        if (event.type !== 'key') continue;
        const actual = String(event.actual || '').toLowerCase();
        if (!allowed.has(actual)) continue;
        const key = perKey[actual] || (perKey[actual] = emptyKey());
        key.attempts += 1;
        if (!event.correct) key.errors += 1;

        if (previousKey) {
          const previousActual = String(previousKey.actual || '').toLowerCase();
          if (allowed.has(previousActual) && typeof event.timestamp === 'number' && typeof previousKey.timestamp === 'number') {
            const latency = event.timestamp - previousKey.timestamp;
            const pair = `${previousActual}→${actual}`;
            const transition = transitions[pair] || (transitions[pair] = emptyTransition());
            transition.attempts += 1;
            if (!event.correct) transition.errors += 1;
            transition.latencyValues.push(latency);
            if (latency > HESITATION_THRESHOLD_MS) {
              transition.hesitationCount += 1;
              hesitationLatencies.push(latency);
            }
          }
        }
        previousKey = event;
        keyEvents.push(event);
      }

      for (const result of Array.isArray(round.huntResults) ? round.huntResults : []) {
        addHuntResult(result, allowed, perKey, huntLatencies);
        if (result?.firstAttempt) {
          huntFirstAttempts += 1;
          if (result.firstAttempt.correct) huntFirstAttemptCorrect += 1;
        }
        huntRetries += Array.isArray(result?.retries) ? result.retries.length : 0;
        if (result?.successAt !== null && typeof result?.successLatencyMs === 'number') huntSuccessfulTargets += 1;
      }
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      mappingVersion,
      currentTrainingStage: currentStage || (rounds.length ? rounds[rounds.length - 1]?.stage || null : null),
      roundCount: rounds.filter(round => round && typeof round === 'object').length,
      stageCounts,
      allowedKeys: [...allowed].sort(),
      perKey: Object.fromEntries(Object.entries(perKey).sort(([a], [b]) => a.localeCompare(b)).map(([key, stats]) => [key, publicKeyStats(stats)])),
      transitions: Object.fromEntries(Object.entries(transitions).sort(([a], [b]) => a.localeCompare(b)).map(([pair, stats]) => [pair, publicTransitionStats(stats)])),
      corrections: { backspaceCount, latency: summarize(correctionLatencies) },
      hesitations: { thresholdMs: HESITATION_THRESHOLD_MS, count: hesitationLatencies.length, latency: summarize(hesitationLatencies) },
      hunt: {
        firstAttempts: huntFirstAttempts,
        firstAttemptCorrect: huntFirstAttemptCorrect,
        firstAttemptAccuracy: huntFirstAttempts ? huntFirstAttemptCorrect / huntFirstAttempts : 0,
        retryCount: huntRetries,
        successfulTargets: huntSuccessfulTargets,
        successfulLatency: summarize(huntLatencies)
      }
    };
  }

  return { fromRounds };
})();
