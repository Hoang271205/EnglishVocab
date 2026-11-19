# UX resilience and personal settings

## Delivered behavior

- Learning and review answers are written to local storage as they are edited. Recovery requires an exact account, session, attempt, phase and server-version match. Drafts older than seven days are ignored. A successful transition clears the local draft; server drafts and grading remain authoritative. Browser storage can be disabled or full, so recovery is best effort, on that browser only.
- GET requests retain the 20-second deadline. Writes have a 30-second deadline and are never automatically retried. An interrupted write may still commit on the server. Study pages require a server reload before continuing after a connection, timeout, conflict or server error; uncommitted answers recover only if server state still matches. An eight-second wait shows a slow-connection notice.
- A root Error Boundary offers page reload when rendering or a lazy page import fails.
- Workspace tabs are represented by `?tab=review|learn|notebook|settings`, including refresh and browser history navigation. Opening an unfinished session still requires the existing Continue action.
- The account dropdown beneath the avatar/name opens personal settings or signs out. Personal settings edit the display name and password. Avatars are generated initials, with no image upload/storage. Personal settings have separate Profile and Password navigation items (`section=profile|password`); only the selected panel is visible, and refresh/browser history restore it. Existing learning/voice preferences stay in Notebook.

## Personal account API

- `PATCH /api/auth/profile`: `{ expectedRevision, name }` returns `{ user }`. A stale profile revision returns 409. Existing users default to revision zero; no migration is required. The response and `/api/auth/me` include `profileRevision`.
- Profile input rejects avatar/image fields. A successful profile update also removes any legacy `avatarUrl` field. Email is displayed read-only.
- `POST /api/auth/change-password`: `{ currentPassword, newPassword }` returns `{ user }`. New passwords require 12–128 characters. The existing password is verified first. The transaction changes the hash, increments `authVersion`, and revokes extension grants and reset tokens. The current session is regenerated; other sessions fail their next auth check. Existing JSON/origin guards apply and changes are rate limited.
- Deploy the frontend and API together. These checks use mocked collections and APIs, not a live account or MongoDB transaction.

## API observation and remaining production work

Each API response includes `X-Request-ID`. Structured `api_request` logs contain route templates, method, status, duration in milliseconds and finished/aborted outcome. Unexpected exceptions produce a correlated `api_error` event. Logs omit query strings, actual route parameters, bodies, cookies and exception messages. A client disconnect does not imply a database rollback.

Production performance has not been measured. After deployment, collect request counts, errors, p50/p95 duration and response sizes for notebook, topic loading, session creation and answers. Compare cold and warm invocations. Evaluate notebook aggregation with representative account sizes using MongoDB `explain('executionStats')`, including documents/keys examined and sort/facet cost. Only then choose query, index or capacity changes. No database/index changes or production load runs were made for this patch.

## Verification

- Frontend/server typechecks and build.
- Unit tests cover local recovery isolation/expiry/storage failures, uncertain-write timeout with no retries, metrics privacy, profile validation/revision conflicts and password revocation.
- `node --import tsx --test tests/browser/resilience.test.ts` runs against the built frontend with mock APIs: refresh recovery in learning/review, connection failure, stale versions, account isolation, URL history, account dropdown keyboard/outside-click behavior, profile name persistence, password confirmation and lazy-import failure. Desktop and 390px screenshots are saved under `.browser-check/`.
- The existing review-queue test double was updated to support the service's bounded cursor and per-word preference lookup; its queue/scheduling assertions are unchanged.
