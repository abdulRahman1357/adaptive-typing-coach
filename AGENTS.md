# Adaptive Typing Coach Development Rules

## Product intent

This is a personal, local-first adaptive typing coach for a beginner currently typing at roughly 10 WPM. Its purpose is to build accuracy, keyboard confidence, and eventually speed without looking at the keyboard. It is intended to grow into an intelligent alternative to Monkeytype, but training-engine quality and trustworthy practice analytics come first.

## Required typing method

Use the owner's intentional three-finger-per-hand method. Do not silently substitute conventional four-finger-plus-pinky touch typing and do not add pinky-based training.

| Finger | Assigned keys |
| --- | --- |
| Left ring | W S X |
| Left middle | E D C |
| Left index | R F V T G B |
| Right index | Y U H J N M |
| Right middle | I K , |
| Right ring | O L . |
| Thumbs | Space |

Pinkies are intentionally unused. Keys outside these assignments must not be represented as conventional finger-training assignments. They may be explicitly treated as untrained or utility keys where needed.

## Training progression

Preserve this progression when implementing the training engine:

1. Single-key hunting
2. Finger-zone training
3. Key-transition training
4. Word training
5. Sentence training
6. Speed testing
7. Adaptive training
8. AI typing coach

Do not add, reorder, or substantially redesign stages without an explicit request.

## Practice event and analytics rules

- Capture keyboard events only during an explicit, focused practice session.
- Do not implement global keyboard monitoring, a browser extension, desktop-wide keylogging, or any capture outside the practice experience.
- Process raw events locally and deterministically where feasible.
- Event data should support timestamps, expected key, actual key, errors, Backspaces, correction latency, inter-key latency, key transitions, hesitation, and finger/hand information.
- Preserve enough event context to distinguish attempted, erroneous, and corrected input. Do not reduce correction latency to an unrelated aggregate where the event history permits a more accurate calculation.
- Single-key hunt must record and report the first attempt separately. If the target is repeated after an incorrect first attempt, those repeats are practice only and must not inflate the initial key-hunting measurement.

## Privacy and future AI

- Keep practice telemetry local by default and do not send individual keystrokes to an LLM or external service.
- Browser local storage is acceptable for local practice history and settings, with a clear way to delete it.
- A future AI coach may receive deliberately aggregated, minimized statistics to infer likely causes of slow typing and recommend training. Keep any AI/API boundary outside the raw event capture path and do not embed API keys in client-side code.

## Change discipline

- Read `PROJECT_CONTEXT.md` before making product or training-engine decisions.
- Make focused, verifiable changes; do not redesign the entire app unless explicitly asked.
- Keep the static, local-first architecture unless a requested feature genuinely requires a change.
- Validate mapping configuration: assignments must remain intentional, clear, and non-duplicated when the UI allows customization.
- Prefer safe DOM APIs for user-controlled content rather than interpolating local-storage values into `innerHTML`.
- Maintain UTF-8 source encoding so user-facing labels render correctly.
