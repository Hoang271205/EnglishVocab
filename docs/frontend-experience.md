# Welcome and learning experience

## Entry routes

- `/` and `#/` show the public introduction for signed-out visitors. Existing authenticated visitors go straight to their workspace.
- `#/register`, `#/login`, `#/forgot-password` and reset-password links keep their existing flows.
- The introduction includes a three-step guide and a small `grow` recall demonstration. It uses only temporary component state and does not save progress or create study receipts.
- “Bắt đầu hành trình” scrolls to the new/existing account choice. The header also has direct auth links. Auth screens include a route back to the introduction.

## Audio and motion

`src/frontend/audio/experience.ts` synthesises short UI sounds and a quiet repeating musical accompaniment with Web Audio. It has no music asset downloads, third-party player or additional server requests.

Effects default to enabled; music defaults to off. The audio context is created/resumed from a real user gesture. Saved music preferences still need a gesture on the next page visit. The control panel remembers effects/music, volume and reduced-motion preferences in localStorage on this browser; these are not account settings.

Audio is suspended and scheduled music voices are stopped when the tab is hidden. Pronunciation temporarily ducks background music. Pronunciation voice/settings remain separate from the sound-effects switch.

Correct/retry sounds fire only after a submitted answer response. Event IDs deduplicate committed results; simply reloading a session does not play a new reward. Session completion uses a separate short melody. The demo is explicitly local and has its own feedback IDs. Confetti respects both the OS reduced-motion preference and the in-app option; muting audio does not hide textual result feedback.

UI effects do not change grading, levels, review schedules or persistence. The welcome page is loaded as a separate JavaScript chunk. Normal study and notebook layouts are retained.

## Validation boundary

A production build checks compilation. Interactive rendering, audio playback quality, autoplay policies and mobile interactions need a separate browser review; a successful build does not establish those outcomes.
