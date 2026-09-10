# Adaptive Typing Coach: Project Context

## Project purpose

Adaptive Typing Coach (currently branded in the UI as **Keystep V1**) is a personal, local-first typing-practice application. It is for an owner who is a beginner at approximately 10 WPM and wants to improve speed and accuracy without looking at the keyboard. The long-term goal is a highly intelligent alternative to Monkeytype, built around individualized practice rather than generic speed tests.

The coach uses an intentional three-finger-per-hand method; it must not be converted to conventional touch typing.

## Current implementation

The project is a dependency-free static web app consisting of `index.html`, `styles.css`, and `app.js`.

It currently provides a round-based UI with selectable stages for single-key hunting, finger zones, key transitions, words, sentences, and a gentle speed test. Keyboard input is captured only through the focused practice input. Round data and the configurable map are saved in browser local storage; history is limited to 30 rounds and can be cleared.

The app currently records structured key and Backspace events and calculates round-level accuracy, WPM, inter-key latency, hesitations, approximate correction latency, Backspace rate, and slow typed-character transitions. It also renders a keyboard map, shows live metrics, and provides simple local coaching text and an event-data preview.

## Exact three-finger keyboard mapping

| Hand | Finger | Keys |
| --- | --- | --- |
| Left | Ring | W, S, X |
| Left | Middle | E, D, C |
| Left | Index | R, F, V, T, G, B |
| Right | Index | Y, U, H, J, N, M |
| Right | Middle | I, K, , |
| Right | Ring | O, L, . |
| Both | Thumbs | Space |

Pinkies are intentionally unused. Conventional four-finger-per-hand or pinky-based assignments and drills are out of scope. Keys not listed above should be modelled as untrained or utility keys, not silently assigned to conventional fingers.

## Training progression

1. Single-key hunting
2. Finger-zone training
3. Key-transition training
4. Word training
5. Sentence training
6. Speed testing
7. Adaptive training
8. AI typing coach

The present priority is the training engine and accurate live practice analytics. New stages should not be implemented until the event model and early-stage metrics are reliable.

## Live keystroke and event analysis requirements

During explicit practice sessions, the system should retain sufficient local event information to analyze:

- timestamps;
- expected and actual keys;
- errors;
- Backspaces;
- correction latency;
- inter-key latency;
- key transitions;
- hesitation;
- finger-zone and hand information.

Raw keystroke processing should be local and deterministic where possible. Analytics must be able to distinguish errors from later corrections, rather than relying only on final typed text. Key-transition and finger/hand analysis should use the exact mapping above.

## Single-key hunting: first-attempt metric

For a repeated single-key target, only the **first attempt** counts toward the key-hunting measurement. Subsequent presses are practice and may allow the round to complete, but must not improve, dilute, or otherwise inflate the initial-hunt accuracy or latency metric. The UI and stored round analytics should expose this metric distinctly from general practice-event counts.

## Backspace and correction analysis

Backspaces are meaningful practice evidence, not merely input editing. The event model should support:

- counting Backspace events and their rate;
- identifying the error that a correction addresses where possible;
- measuring latency from erroneous input to correction and, when useful, from correction to correct replacement;
- distinguishing immediate corrections from delayed error recognition;
- preserving these signals for later adaptive recommendations.

## Local-first and privacy requirements

The application should remain local-first. It must capture only explicit practice input, not keyboard activity elsewhere in the browser, operating system, or other applications. No network call, account, browser extension, or desktop-wide listener is currently required. Local history and mapping preferences may use browser local storage and must be clearable.

## Future AI coach architecture

AI is deferred. A future optional coach may receive minimized, aggregated statistics—such as persistent slow transitions, per-key accuracy, hesitation patterns, and correction behavior—to infer likely causes of difficulty and recommend drills. It must not receive every raw keystroke. The aggregation/API boundary should remain separate from the local raw-event capture path, and client-side code must not contain API keys.

## Deferred monitoring

Global desktop keyboard monitoring, browser extensions, and desktop-wide keylogging are explicitly deferred and must not be implemented now. The only permitted capture scope is an intentional practice session in this app.

## Known problems from the initial audit

- The current default map does not match the exact three-finger mapping: for example, W/S/X are currently assigned to left middle, and many unrelated keys are assigned across the six fingers.
- Hunt targets can include alphabet keys outside the intended trained mapping.
- The current code saves a first hunt attempt but does not use or report it as a dedicated metric; ordinary round analytics can still include repeat attempts.
- Difficulty selection is present but has no behavioral effect.
- History is stored but is not yet used to drive adaptive drill selection or longitudinal reporting.
- Correction latency is currently only approximated as the interval from the preceding key event to Backspace, not linked to a specific error and successful replacement.
- Transition analysis uses typed characters without robust expected/error/correction context and does not yet provide reliable mapped finger/hand analysis.
- The mapping editor says assignments should be unique but does not validate duplicates.
- User-controlled mapping values are rendered through `innerHTML`, creating an avoidable local-storage XSS risk.
- Several UI strings show encoding corruption (mojibake), so source files should be maintained as UTF-8.
- `app.js` combines UI rendering, mapping, capture, analytics, persistence, and coaching in one file, which will hinder future adaptive development.

## Recommended next implementation step

Establish a reliable early-stage training foundation: make the exact mapping above the default, represent non-training keys explicitly, and separate deterministic event/analytics logic from UI code. Then implement and display a dedicated single-key first-attempt result (accuracy and latency), ensuring repeated attempts remain practice-only for that metric. Do not add new training stages or AI before this is correct.
