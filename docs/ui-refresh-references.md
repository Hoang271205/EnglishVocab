# EnglishVocab UI refresh — source references

This refresh adapts existing Untitled UI visual patterns to EnglishVocab's green palette and React/CSS stack. It does not install Untitled UI, Tailwind, React Aria or Recharts. Existing application behavior, content order and mascot assets remain in place.

## Sources and application

- **Buttons**: https://www.untitledui.com/react/components/buttons
  - Source: https://github.com/untitleduico/react/blob/main/components/base/buttons/button.tsx
  - Applied: 8px corners, 14px semibold labels, 20px icons, subtle inset/drop shadows, solid primary, outlined secondary, transparent tertiary, distinct destructive/disabled/focus states. EnglishVocab keeps its native button semantics and loading behavior.
- **Header navigations — Simple**: https://www.untitledui.com/react/components/header-navigations#simple
  - Source: https://github.com/untitleduico/react/blob/main/components/application/app-navigation/header-navigation.tsx
  - Applied: white surface with thin bottom border, horizontal icon/label navigation, subtle active background, logo and account at the sides. EnglishVocab keeps all three learning tabs visible on mobile instead of introducing a collapsed menu.
- **Bar chart 01**: https://www.untitledui.com/react/components/line-bar-charts#bar-chart-01
  - Applied: light horizontal grid, compact axis labels, narrow columns with rounded tops, restrained color palette, bordered white chart card. EnglishVocab has one value per memory level, so this adaptation uses individual bars instead of the reference's stacked series.
  - Added for the existing data: integer tick labels, a shared zero baseline, proportional heights, explicit zero-data message and text values available to assistive technology. Green shades replace the reference's purple shades.

- **Logo symbol — Lucide Book Open Text**: https://lucide.dev/icons/book-open-text
  - SVG source: https://github.com/lucide-icons/lucide/blob/main/icons/book-open-text.svg
  - Applied: existing book icon with a white stroke in a green brand tile and a two-weight EnglishVocab wordmark. The icon is an existing library symbol, not an exclusive custom logo. Attribution and license: `docs/licenses/lucide-ISC.txt`.
- **Statistics cards**: all three share the same pale green surface, border, icon tile and text colors, following the user's annotated screenshot correction.

## Implementation

Shared controls are defined in `src/frontend/styles/ui-refresh.css`, imported last so the visual rules are authoritative over historical feature/theme styles. Chart markup is in `src/frontend/components/charts/LevelDistribution.tsx`.

Untitled UI's source repository is MIT licensed. Its copyright and permission notice are retained in `docs/licenses/untitled-ui-MIT.txt`.

## Verification scope

Screenshots use the real application with intercepted test API responses, not production account data. They verify presentation only. Build/typecheck, chart cases, and existing browser navigation tests are reported separately.

### Results

- `npm run build`: passed (frontend typecheck and bundle).
- ESLint for the three changed React components, Prettier for changed frontend files, and `git diff --check`: passed.
- `npm test`: 59 passed after stopping the preview server, which had occupied the launcher's fixed test port.
- Browser presentation checks: no horizontal overflow at 320, 390, 768, 1024 and 1920px; all three statistics cards have identical computed background colors; account dropdown and learning navigation work; no captured JavaScript page errors.
- Bar chart cases: empty data, `[42,28,17,9,4]`, `[1,0,0,0,0]`, and `[1290,2,0,9,4]`. Checked bar heights against the shared numeric scale and checked integer tick labels.
- Existing `tests/browser/navigation.test.ts`: timed out waiting for `.loading-skeleton--auth` at initial navigation. This suite is not counted as passing; the narrower presentation checks above use the actual built app and separate intercepted API responses.

Screenshots are local in `.browser-check/after-desktop.png`, `.browser-check/after-mobile.png`, and `.browser-check/after-chart-data.png` (illustrative test data).

## HCI fixes: requested groups 1–8

1. Darkened secondary text to #526357 (5.80:1 on #f0f5f1) and chart axis labels (6.40:1 on white).
2. Placeholder #637166 reaches 4.74:1 on #f5f6f2.
3. Guide and audio controls now occupy normal document flow, avoiding banner/filter overlap.
4. Notebook primary/secondary buttons use the shared 8px radius and solid colors.
5. Collection/scope/header selection uses a pale green surface and visible green border.
6. Removed the duplicate dashboard pending-session panel; compact mobile intros omit the large mascot message; replaced saturated yellow collection banner with a neutral green surface.
7. Chart labels are larger and adjacent to bar tops, all bar shades reach at least 3:1 against white, and zero-data state omits the empty plot.
8. Added skip navigation and route focus, guide initial focus/Escape/focus restoration, and explanations for locked learning actions. Full-word paste already existed and was verified rather than rewritten.

Validation: build/typecheck and changed-component ESLint passed. Browser checks passed for guide focus/Escape/restore, navigation focus, and pasting a full word into real ClozeInputs. Presentation checks passed at 320/390/768/1024/1920px; chart proportionality/integer ticks passed for sparse and uneven data. Auth headers were checked on login/register/forgot-password at 320/390/760/1440px. Runtime screenshots use intercepted API fixtures. These checks do not constitute full screen-reader or production API validation. Not deployed.

## Task-first HCI, visual states and motion — 2026-11-22

References read for this revision:

- [Duolingo home-screen design](https://blog.duolingo.com/new-duolingo-home-screen-design/): make the next learning action clear. Applied by putting the review/learn action before cumulative dashboard statistics; the existing topic list and branding are retained.
- [Quizlet Learn](https://help.quizlet.com/hc/en-us/articles/360030986971-Studying-with-Learn): session goals and configurable practice. Applied as a visible selection summary with optional review settings, keeping the existing backend contract.
- [Figma UI principles](https://www.figma.com/resource-library/ui-design-principles/): hierarchy, progressive disclosure, consistency and contrast. Applied to action-first layout and disclosure of review options.
- [Nielsen usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/): visible status, user control and error recovery. Applied to topic progress filters, live result counts, reset filters, busy controls and accurate skipped-word labels.
- [ALIVE button principles](https://alive-web.vn/vi/blog/7-nguyen-tac-co-ban-cho-thiet-ke-button/) and [Great UX Writing button types](https://greatuxwriting.substack.com/p/phan-biet-cac-loai-nut-lenh-tren): distinguish button purpose and interactive states. Primary is reserved for the main action in each group; secondary supports return/retry; ghost supports lightweight save-draft/refresh/close actions; deleting a personal word uses the danger variant. Canceling a dialog that preserves data is secondary.
- [Material motion](https://m3.material.io/styles/motion/overview/how-it-works): transitions communicate a change of state. Adaptation uses local CSS timings: 140ms control changes, 220ms content entry and a 280ms correct-answer icon. These values are implementation choices, not claimed Material-prescribed values. Existing audio and mascot feedback are reused.
- [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): controls should be easy to activate. Changed navigation/filter controls target at least 44px in height. This is a design target, not a claim of full WCAG compliance; WCAG 2.2 AA's minimum criterion is 24×24px with exceptions.
- [W3C animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions): suppress decorative movement when requested. Both the existing in-app motion preference and OS reduced-motion preference disable learning-workspace motion; visible labels/icons remain.

The new scoped rules are in `src/frontend/styles/hci-learning.css`. No animation dependency or backend schema change was added. Daily targets and streaks need server-derived daily statistics and are proposals rather than implemented counters.

On mobile, guide and audio controls now occupy normal page flow so their closed triggers cannot cover topic cards. The guide label remains visible. The skip link is visually clipped while unfocused and becomes visible on keyboard focus.

Verification uses the actual production frontend bundle with intercepted API responses, including sample topic progress, skipped words and correct/incorrect feedback. It does not establish live-account behavior or production performance. Local screenshots and the browser-check summary are in `.browser-check/hci-2026-11-22/` (ignored by Git). Existing historical validation sections above describe earlier revisions.

Final checks for this revision: frontend and server TypeScript passed; production frontend build passed; all 80 unit/service tests passed; ESLint for changed TypeScript/React files and `git diff --check` passed. The browser HCI check passed at 320/390/768/1440px, including navigation/filter target height, button roles, disclosure keyboard input, preserved POST selections, error recovery, skipped-word labels, empty states and both motion preferences. Existing Part 2 and resilience browser suites passed. Full-project lint still reports three pre-existing unused imports in `src/domain/grading.ts`; those were not changed. No production deployment or load test was performed.


## Dashboard statistics alternative B — 2026-11-24

Implemented the approved action-first alternative: due words are prominent in the review panel, cumulative learned/Level-5 counts use a compact definition list, and five horizontal bars replace the column chart. All rows share one zero baseline, scale and track width, including uneven and large counts. Empty data shows guidance instead of an empty chart. Level 5 retains the maintenance-review explanation.

Reference rationale: [NN/g visual hierarchy](https://www.nngroup.com/articles/principles-visual-design/) for contrast and priority; [Datawrapper labels](https://www.datawrapper.de/blog/text-in-data-visualizations) for values adjacent to bars; [Datawrapper chart choice](https://www.datawrapper.de/blog/chart-types-guide) for horizontal comparison. This is a presentation change; no API/schema or review-policy changes.

Validation: TypeScript, production frontend build, changed-file ESLint and diff checks passed. Browser QA used the actual built frontend with intercepted API fixtures at 320/390/768/1440px, tested review selections/error recovery, empty data, sparse levels and highly uneven levels. No horizontal overflow; consistent track widths. Screenshots and result JSON are in `.browser-check/dashboard-data-2026-11-24/` (ignored). No production/account-data validation or deployment.

[Align animation reference](https://www.align.vn/vi/blog/kham-pha-10-website-animation-an-tuong) was read separately. The new animation shortlist is a proposal only, awaiting user selection; it is not an implementation change.


## Approved motion priorities 1–3 — 2026-11-24

Implemented confirmed-save checkmarks in notebook/settings, short opacity-only study-card entry, and shared 180ms detail reveal for topic/word panels. Typing does not restart the entry animation or replace inputs. Filter/list refresh retains the existing cached-data behavior rather than animating every result row. Removed whole-card answer shake/glow; per-answer feedback stays on the status icon. Confetti is reserved for completing a session.

At the user's request, removed the generic “Đang xử lý thao tác của bạn…” StatusMessage in both LearningSessionPage and ReviewSessionPage. Buttons retain their existing busy state and slow-connection feedback remains.

No animation library, request delay, scroll listener, persistent layer hint or JavaScript animation loop was introduced in the application. Both existing reduced-motion controls suppress these workspace animations. [web.dev performance guidance](https://web.dev/articles/animations-guide) informed the use of opacity/transform; [W3C interaction animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) informed the off switch.

Validation: TypeScript, production frontend build, changed-file ESLint and diff checks passed; all 80 unit/service tests passed; existing browser resilience suite passed. Added tests/browser/motion.test.ts for delayed server acknowledgement, success feedback, detail reveal, input identity, typing without animation restarts, repeated answer/next interactions, per-answer confetti suppression and OS/app reduced motion.

Browser performance measurements are diagnostic, not a universal smoothness guarantee: synthetic 4x CPU slowdown, 390px viewport, intercepted API responses. The warmed isolated run recorded p95 frame intervals 16.7ms with motion and 16.8ms reduced, no long tasks in either sample. It also recorded a 933.4ms maximum frame gap with motion (no corresponding Long Task), so this run cannot establish that every frame is smooth or explain that outlier. Earlier overlapping test runs recorded long tasks, further limiting comparisons. Real-device and production-network validation remain outstanding. Full measured values are in .browser-check/motion/performance.json; screenshots show the real built app with test data. No deployment performed.

Follow-up isolated repetition: motion p95/max 16.7ms over 76 sampled frames; reduced motion p95/max 16.8ms over 87 sampled frames; no long tasks in either. The earlier large gap did not recur in this repetition. The performance JSON now holds this latest result; earlier logs remain in /tmp/englishvocab-motion-check.log and /tmp/englishvocab-motion-isolated-repeat.log. These short synthetic samples do not replace physical-device validation.


## Completion of approved motion groups 4–6 — 2026-11-24

Main-tab transitions now apply a 140ms opacity animation to the existing main element; header/main DOM identity, router history and form state are preserved. No key is added to remount the workspace.

Mascots are now static by default. Landing-page greeting and non-empty learning/review completion use a single 650ms image gesture after the image loads. A bounded, per-tab session history prevents replay after revisiting/reloading the same completion; unavailable storage falls back to bounded in-memory history. Empty completions do not celebrate. Existing sound controls are retained.

Account-menu entry uses a 140ms transform/opacity animation with existing arrow-key/Home/End/Escape behavior. New Level/CEFR disclosures are available in dashboard/word details (CEFR also in review feedback), activated by native buttons with expanded state, touch and keyboard. Escape/close restores trigger focus, outside clicks dismiss, and popup positioning is measured once on open to fit horizontally and use space above when needed. No hover-only information or modal focus trap is added. Reduced-motion settings disable all new animations.

Validation: frontend TypeScript, production build, changed-file ESLint and diff checks passed; 80/80 unit/service tests and the browser resilience suite passed. Extended tests/browser/motion.test.ts verifies same header/main nodes across tabs, Back/Forward, disclosures at 320/390/1440px, touch/keyboard dismissal and focus return, menu keyboard navigation, no repeated mascot gesture across reload, and the earlier save/input tests. Screenshots use the actual built application with intercepted test data.

The isolated final test with synthetic 4x CPU throttle recorded p95/max frame intervals 16.7ms/16.7ms with motion (75 frames), 16.8ms/16.8ms reduced (83 frames), no Long Tasks. This short synthetic sample does not establish performance on all physical devices or production networks. No new dependency, scroll animation loop or API request delay was added. No commit, push or deployment performed.

References: [WAI disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) for native button interaction and expanded state; [web.dev animation performance](https://web.dev/articles/animations-guide) for transform/opacity motion. The earlier shortlist-only note describes the previous stage; the six explicitly approved groups are now implemented.

Latest evidence-capture repetition: no-preference: p95 16.8ms, max 16.8ms, 78 frames, 0 Long Tasks; reduce: p95 16.7ms, max 16.8ms, 81 frames, 0 Long Tasks. Popover screenshot waits for animation completion; viewport bounds and open-state preservation are asserted.
