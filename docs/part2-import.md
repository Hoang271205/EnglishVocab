# Part 2 content and import

The 2026-11-20 release was imported: 2,000 new entries and 200 new topics. The
database contains 400 topics after import. See the local release report at
`content/crawl/part2-release-2026-11-20/REPORT.md` for the actual transaction,
verification results and editorial limitations. Content under `content/crawl/`
is ignored by Git; retain the release directory separately when transferring the
project.

## Read-only plan

From the project root, using the configured MongoDB environment:

```sh
npm run library:import-part2 -- \
  --package content/crawl/part2-release-2026-11-20/content.json \
  --dry-run
```

No database writes or index creation happen in this mode. The default is also
read-only when `--dry-run` is omitted. The imported release now plans zero new
entries/topics on a rerun.

## Explicit write

Only use a reviewed package with a matching `approval.json`. Supply its exact
SHA-256 and fresh backup/report paths. The following shows the command shape;
replace the uppercase placeholders before execution:

```sh
npm run library:import-part2 -- \
  --package PATH_TO_APPROVED_CONTENT_JSON \
  --write \
  --expect-sha256 APPROVED_SHA256 \
  --backup NEW_SHARED_CONTENT_BACKUP_JSON \
  --report NEW_IMPORT_REPORT_JSON
```

The importer validates the entire incoming graph and current shared content,
then revalidates inside a transaction before inserting. It only inserts absent
entries and Part 2 topics; it does not update Part 1 or personal collections.
Same-ID content conflicts, occupied storage orders, incorrect collection links,
unapproved normalized headword collisions, missing parents and topics above ten
entries stop the operation. Existing identical content is a no-op. Backup/report
files are created exclusively and never overwritten.

## Topic identity and UI order

- Original topic IDs and storage order 1–100 stay intact.
- Part 2 topic IDs are `<parentId>-part-2`, with `part: 2`, `parentTopicId`, and
  storage order `parent.order + 100`. This preserves the existing unique
  collection/order index without migrating it.
- `compareTopics` presents each parent followed by its Part 2. The card number
  comes from the presentation position, not storage order.
- The UI supports all parts, Part 1 only and Part 2 only. Progress is keyed by
  each topic's own ID/entry IDs.
- Prepared UI changes have not been deployed or pushed. Older deployed code may
  display Part 2 after the original topics until the new UI is deployed.

## Reproduce local validation

```sh
node --import tsx scripts/audit-part2-release.mjs
node --import tsx --test tests/part2-import.test.ts tests/domain.test.ts tests/reviewed-import.test.ts
npm run build:frontend
node --import tsx --test tests/browser/part2.test.ts
```

The browser check runs a local server with mock APIs and a separate headless
browser; it does not access MongoDB. Its images are saved in `.browser-check/`.
The rollback test uses a transactional in-memory fixture; no intentional failure
was injected into the live database.

The release converter `scripts/build-part2-package.mjs` consumes authored drafts,
the per-entry editorial ledger and reviewed sentence surfaces. It refuses to
overwrite a frozen `content.json`. A later content revision needs a new release
path/version and an updated approval checksum. Bulk-source IPA that remains
unverified is retained in provenance/audit files and omitted from pronunciation.
Authored readiness is distinct from dictionary verification.
