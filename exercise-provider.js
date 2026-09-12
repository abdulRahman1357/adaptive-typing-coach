/* Provider boundary for local static content and future adaptive content sources. */
window.ExerciseProvider = (() => {
  const STATIC_EXERCISE_DATA = {
    huntKeys: ['w','s','x','e','d','c','r','f','v','t','g','b','y','u','h','j','n','m','i','k',',','o','l','.'],
    words: ['sad','ask','dad','fall','jazz','milk','kind','flash','garden','jungle','market','planet','quick','brave','smooth','typing','practice','keyboard','comfort'],
    sentences: ['small steps build steady skill', 'keep your eyes relaxed and your hands calm', 'accuracy comes before speed', 'practice makes the keyboard feel familiar'],
    transitions: ['as','sd','df','fj','jk','kl','er','re','ty','yu','ui','io','gh','hj','nm','mn','de','ki']
  };

  function choose(items, random) { return items[Math.floor(random() * items.length)]; }
  function shuffled(items, random) { return [...items].sort(() => random() - 0.5); }
  function characterForCode(code) {
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    return ({ Comma: ',', Period: '.' })[code] || null;
  }

  function createStaticExerciseProvider({ content = STATIC_EXERCISE_DATA, random = Math.random } = {}) {
    return {
      getExercise({ stage, fingerMap }) {
        if (stage === 'hunt') return { recommendation: { stage, reason: 'Static practice sequence' }, exercise: { kind: 'hunt', items: shuffled(content.huntKeys, random).slice(0, 5) } };
        if (stage === 'zone') {
          const zones = Object.entries(fingerMap || {}).filter(([finger, codes]) => finger !== 'thumb' && Array.isArray(codes) && codes.some(code => /^[A-Z]$/.test((characterForCode(code) || '').toUpperCase())));
          const [finger, codes] = choose(zones, random) || [];
          const keys = (codes || []).map(characterForCode).filter(key => key && /^[a-z]$/.test(key));
          return keys.length ? { recommendation: { stage, reason: 'Static finger-zone practice' }, exercise: { kind: 'zone', finger, items: [choose(keys, random)] } } : null;
        }
        if (stage === 'transition') return { recommendation: { stage, reason: 'Static transition practice' }, exercise: { kind: 'transition', items: [choose(content.transitions, random)] } };
        if (stage === 'word') return { recommendation: { stage, reason: 'Static word practice' }, exercise: { kind: 'word', items: [choose(content.words, random)] } };
        if (stage === 'sentence' || stage === 'speed') return { recommendation: { stage, reason: 'Static sentence practice' }, exercise: { kind: 'sentence', items: [choose(content.sentences, random)] } };
        return null;
      }
    };
  }

  function getValidatedExercise(provider, request, validator, fallbackPlan) {
    if (!provider || typeof provider.getExercise !== 'function' || !validator || typeof validator.validate !== 'function') return { valid: false, errors: ['Provider and validator are required.'] };
    let providerResult;
    try {
      providerResult = validator.validate(provider.getExercise(request), request);
    } catch {
      providerResult = { valid: false, errors: ['Provider failed to return an exercise candidate.'] };
    }
    if (providerResult.valid || typeof fallbackPlan !== 'function') return providerResult;
    const fallbackResult = validator.validate(fallbackPlan(request), request);
    return fallbackResult.valid ? { ...fallbackResult, source: 'fallback', providerErrors: providerResult.errors } : { valid: false, errors: [...providerResult.errors, ...fallbackResult.errors] };
  }

  return { STATIC_EXERCISE_DATA, createStaticExerciseProvider, getValidatedExercise };
})();
