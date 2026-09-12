/* Deterministic local gate for exercises proposed by any provider. */
window.ExerciseValidator = (() => {
  const STAGE_KIND = { hunt: 'hunt', zone: 'zone', transition: 'transition', word: 'word', sentence: 'sentence', speed: 'sentence' };
  const FINGER_NAMES = new Set(['left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring']);
  const MAX_ITEMS = { hunt: 10, zone: 10, transition: 12, word: 10, sentence: 3 };
  const MAX_LENGTH = { hunt: 1, zone: 1, transition: 2, word: 20, sentence: 160 };

  function characterForCode(code) {
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    return ({ Comma: ',', Period: '.', Space: ' ' })[code] || null;
  }

  function mappingContext(fingerMap) {
    if (!fingerMap || typeof fingerMap !== 'object') return null;
    const characterToFinger = {};
    for (const [finger, codes] of Object.entries(fingerMap)) {
      if (!Array.isArray(codes)) return null;
      for (const code of codes) {
        const character = characterForCode(code);
        if (!character || characterToFinger[character]) return null;
        characterToFinger[character] = finger;
      }
    }
    return characterToFinger;
  }

  function isPlainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function onlyKeys(value, allowed) { return Object.keys(value).every(key => allowed.includes(key)); }
  function isAllowedCharacter(value, context) { return typeof value === 'string' && value.length === 1 && Boolean(context[value.toLowerCase()]); }
  function validItemString(item) { return typeof item === 'string' && item.length > 0; }

  function validateRecommendation(recommendation, stage, errors) {
    if (recommendation === undefined) return;
    if (!isPlainObject(recommendation) || !onlyKeys(recommendation, ['stage', 'reason']) || recommendation.stage !== stage || typeof recommendation.reason !== 'string' || !recommendation.reason.trim() || recommendation.reason.length > 280) errors.push('Recommendation must match the requested stage and contain a short reason.');
  }

  function validateFocus(exercise, context, errors) {
    if (exercise.focusKeys !== undefined) {
      if (!Array.isArray(exercise.focusKeys) || !exercise.focusKeys.length || exercise.focusKeys.length > 12 || exercise.focusKeys.some(key => !isAllowedCharacter(key, context))) errors.push('focusKeys must contain only mapped keys.');
    }
    if (exercise.focusTransitions !== undefined) {
      const valid = Array.isArray(exercise.focusTransitions) && exercise.focusTransitions.length && exercise.focusTransitions.length <= 12 && exercise.focusTransitions.every(value => {
        if (typeof value !== 'string') return false;
        const parts = value.split('->');
        return parts.length === 2 && isAllowedCharacter(parts[0], context) && isAllowedCharacter(parts[1], context);
      });
      if (!valid) errors.push('focusTransitions must contain mapped key pairs in a->b form.');
    }
  }

  function validateItems(kind, exercise, context, errors) {
    const { items } = exercise;
    if (!Array.isArray(items) || !items.length || items.length > MAX_ITEMS[kind] || items.some(item => !validItemString(item))) {
      errors.push('Exercise items must be a non-empty bounded list of strings.');
      return;
    }
    for (const item of items) {
      if (item.length > MAX_LENGTH[kind]) { errors.push('Exercise item exceeds its stage length limit.'); continue; }
      if (kind === 'hunt' || kind === 'zone') {
        if (!isAllowedCharacter(item, context)) errors.push('Hunt and zone items must be one mapped key.');
        if (kind === 'zone' && context[item.toLowerCase()] !== exercise.finger) errors.push('Zone items must stay in the declared finger zone.');
      } else if (kind === 'transition') {
        if (item.length !== 2 || [...item].some(character => !isAllowedCharacter(character, context))) errors.push('Transition items must be mapped two-key pairs.');
      } else if (kind === 'word') {
        if (![...item].every(character => /[a-z]/.test(character) && isAllowedCharacter(character, context))) errors.push('Words may contain only mapped letter keys.');
      } else if (kind === 'sentence') {
        if (![...item].every(character => isAllowedCharacter(character, context))) errors.push('Sentences may contain only mapped keys, Space, comma, and period.');
      }
    }
  }

  function validate(plan, { stage, fingerMap } = {}) {
    const errors = [];
    const context = mappingContext(fingerMap);
    if (!context) return { valid: false, errors: ['A complete, non-duplicated authoritative mapping is required.'] };
    if (!Object.hasOwn(STAGE_KIND, stage)) return { valid: false, errors: ['A known current training stage is required.'] };
    if (!isPlainObject(plan) || !onlyKeys(plan, ['recommendation', 'exercise']) || !isPlainObject(plan.exercise)) return { valid: false, errors: ['Exercise plan has an unknown or malformed structure.'] };

    validateRecommendation(plan.recommendation, stage, errors);
    const exercise = plan.exercise;
    if (!onlyKeys(exercise, ['kind', 'items', 'finger', 'focusKeys', 'focusTransitions']) || typeof exercise.kind !== 'string') errors.push('Exercise has an unknown or malformed structure.');
    const kind = exercise.kind;
    if (kind !== STAGE_KIND[stage]) errors.push('Exercise kind does not match the current training stage.');
    if (!Object.hasOwn(MAX_ITEMS, kind)) errors.push('Exercise kind is not supported.');
    if (Object.hasOwn(MAX_ITEMS, kind)) {
      if (kind === 'zone') {
        if (!FINGER_NAMES.has(exercise.finger)) errors.push('Zone exercises require a trained finger zone.');
      } else if (exercise.finger !== undefined) errors.push('Only zone exercises may declare a finger.');
      validateItems(kind, exercise, context, errors);
      validateFocus(exercise, context, errors);
    }
    return errors.length ? { valid: false, errors } : { valid: true, errors: [], exercise };
  }

  return { validate };
})();
