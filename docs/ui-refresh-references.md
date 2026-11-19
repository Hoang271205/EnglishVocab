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
