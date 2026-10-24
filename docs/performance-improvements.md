# Frontend and API load improvements

## Request caching

- Concurrent identical GETs share a request. Page resources remain fresh for 30 seconds, retain stale data for up to five minutes, and are bounded to 24 entries.
- Mutations invalidate relevant scopes before dispatch and after settlement, so an overlapping response cannot refill the affected cache with older data.
- Review answers invalidate dashboard, progress and notebook data. Learning also invalidates topic progress. Session drafts/pause/resume preserve unrelated data.
- Settings invalidate settings only. Personal-entry/transfer writes invalidate notebook, dashboard, progress and topic progress. Authentication and unrecognised writes retain conservative full invalidation.
- Shared catalogue entries are independent of personal progress. Logout and unauthorised responses still clear all account cache.

## Review sessions

Action responses include `reviewDisabled`; the frontend consumes the POST response without another session GET. Review creation reads an indexed `(nextReviewAt, entryId)` cursor in bounded batches and resolves only those candidates. Only selected personal entries receive transaction locks. If many candidates are disabled or belong to another collection, additional batches are still required. Grading, receipt idempotency and progress writes remain on the server.

## Notebook

The UI uses `/api/notebook/list`: 50 compact rows per page, without examples, pronunciation or provenance. It caches each page/filter combination; search is debounced by 300 ms. Filtering runs on the server across the complete notebook, not just the visible page. Pagination bounds the response and rendered DOM, while exact totals/filtering still require examining matching account metadata.

`/api/notebook/entries/:entryId` loads a full entry only on expansion and checks account ownership. Counts refer to all filtered rows, even when a group has no rows on the current page. Exports keep the full original format.

The optional Reading panel loads a compact headword index on opening. Unknown words continue directly to the external dictionary; matching saved words load only their own detail. The full notebook is not loaded just to read text.

## Dashboard statistics

MongoDB aggregates levels and due counts instead of returning every progress document to Node. Disabled preferences join only their relevant progress. The next enabled future review is selected through the date index. These reads still cost database work and are not a substitute for measured production query plans. The existing graph presentation is unchanged.

## Static delivery

React lazy imports split workspace pages and optional notebook tools into content-hashed chunks. Vercel serves hashed chunks with immutable caching. The build still produces `/app.js` and `/app.css` for the existing HTML entrypoint. Production builds minify as before.

The website uses 640px/320px WebP mascot variants. The extension uses the small variant. The original PNG remains available for email-client compatibility.

## Deployment

Deploy frontend and API together because the frontend consumes the new notebook endpoints and review response contract.

Apply additive indexes through the existing database preparation command against the intended environment:

```sh
npm run db:prepare
```

This command modifies database indexes and is separate from build. New indexes support review cursor ordering, disabled preferences, active capture IDs and case-insensitive saved-word lookup. Existing indexes are retained.

Build commands (do not launch the application):

```sh
NODE_ENV=production npm run build
npm run build:server
npm run build:extension
```

Source changes do not establish a percentage load reduction or concurrent-user capacity. Assess request counts, payload sizes, API latency and MongoDB documents/keys examined in the deployed environment before making those claims.
