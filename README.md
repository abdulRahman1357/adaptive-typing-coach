# Keystep V1

A local, static typing-practice prototype for a configurable three-finger-per-hand method. Open `index.html` in a modern browser; no install, account, server, network request, browser extension, or global keyboard listener is involved.

## What it records

Only while the practice input has focus, the app captures a structured event stream containing the timestamp, physical key code, expected and actual character, finger zone, errors, and Backspace events. It stores the most recent 30 practice rounds in the browser's local storage. **Clear local history** deletes that history.

The event stream feeds local rules for accuracy, WPM, inter-key latency, hesitation (>700 ms), correction latency, Backspace frequency, error rate, and slow key-pair transitions. `event-preview` is deliberately structured so an optional AI/API adapter can be added later without placing an API key or network call in the capture path.

## Mapping

The visible map exposes all normal writing, editing, navigation, and function keys. The six typing fingers each have an intentional zone; the thumb is shown as an allowed utility key for Space. Expand **Customize this mapping** to alter its physical key-code assignments; settings are saved locally and can be reset to the V1 default.
