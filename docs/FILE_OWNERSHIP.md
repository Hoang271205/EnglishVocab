# File ownership

- COORD: docs/CONTRACTS.md, phases.json, PHASES.md, HANDOFF.md, task tracking and gate reports.
- CORE tooling (BE-01): package.json, package-lock.json, tsconfig.json, eslint.config.mjs, browser/unit harness and scripts. Other tasks request dependencies through this owner.
- CORE models (BE-02): src/domain/types.ts, src/content/schema.ts, content/catalog.json. Schema/contract changes require dependent tests updated and handoff notes.
- CORE storage (BE-05): src/storage/** and database version history. Never rewrite shared historical migrations after distribution.
- CORE services: src/domain/**, src/services/**, src/dictionary/**, src/audio/**, relevant tests.
- DATA: production content and public/audio/ipa with provenance; does not edit types or lockfile.
- EXT: extension manifest/worker/queue/bridge; future popup code remains FE-blocked.
- FE: src/app, features, components and styles only after Gate-BE.
- Kiểm tra: tự động trong mã và kiểm tra runtime phù hợp; không có reviewer riêng hoặc Markdown evidence. USER nghiệm thu cuối.

Current implementation is sequential; no parallel agents are running. Preserve design HTML and user-provided assets. No generated production vocabulary count or audio availability may be claimed from test fixtures.
