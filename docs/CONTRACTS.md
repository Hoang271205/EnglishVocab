# Core contract v1 — EV-00

Scope: TypeScript domain and services execute inside the browser. Dexie is the only progress store. The local Node process only serves static files. No REST API, account or server database. React components will call the guarded facade `createBackend()` in src/backend.ts; they must not grade, schedule or write Dexie directly.

## Data and identity

Executable types: `src/domain/types.ts`; runtime content validation: `src/content/schema.ts`. An entry ID identifies one headword + POS + sense. Never merge senses by spelling or API response index. Stable IDs survive content revisions and backup. Catalog IDs `ielts-001..100`, `daily-001..100` follow TOPICS.md. There are currently 200 topic shells and zero production vocabulary entries.

Progress is absent before the first successful rewrite. `learnedAt` is always set then; `lastReviewedAt` starts null. Timestamp is UTC milliseconds, read from injected trusted Clock inside services. Policy `fixed-5day-v2`: new +2h, correct L1 +8h/L2 +24h/L3 +48h/L4,L5 +120h; wrong at every level L1 +2h. CEFR is independent and may be unknown for a personal entry.

## StudyService

`create(mode, limit, entryIds?)`: learn accepts 5/10; review accepts 10/20. Select only ready/unlearned or due entries, freeze queue. A non-complete session must be resumed, not overwritten. `front(id)` exposes full entry only in learning front state. `question(id)` exposes meaning, POS, cloze prefix/suffix/cells and opaque attemptId; no whole answer, IPA, CEFR, audio, sources or semantic entry ID. The public SessionView contains only opaque attempt IDs; raw Session repository objects remain core-internal and must not be bound to rendering; FE uses question/front/feedback projections.

`transition(id, expectedVersion, action, draft?)`: front↔recall, pause/resume, feedback→next. `submit({sessionId,attemptId,expectedSessionVersion,answer,forgotten?})`: retry for wrong new-word rewrite; empty/incomplete is validation, not wrong. First graded review locks. Correct learning auto-advances after commit. Duplicate attempt returns its event without another update. Other tabs with stale content/progress/session versions receive conflict. A transaction writes progress/event/session atomically, and resolves only after commit. No network/audio waits inside the transaction.

Structured errors: validation/not-found/conflict/storage/unavailable. Validation/conflict are not storage success. Native Dexie quota/closed errors must be mapped at the adapter boundary before FE; failure leaves the last committed state intact.

## Upcoming service contracts

- QueryService: counts ready/draft/learned/due/mastered separately; topic counts use actual entries.
- PersonalService.saveCapture: validated captureId and selected sense, preserve original sentence/source; ready or draft, never progress.
- DictionaryService.lookup(query, signal, forceOnline): local → bounded cache → FreeDictionaryAPI.com (Wiktionary, CC BY-SA 4.0; preserve provider credit and original source URL); never invent Vietnamese or CEFR. Separate text/audio attribution.
- ContentService.inspect/import: validate all before atomic write; preserve progress and require a new identity for a different sense.
- BackupService.export/inspect/restore: schema/content/policy versions, all content/captures/progress/events/session/settings and provenance; no cache. Explicit replacement confirmation outside core. No partial restore.
- AudioService: en-US only, voiceschanged, unavailable when no US voice; individual IPA requires a reviewed local audio file.

These signatures will be concretized alongside their implementation before FE. No absent service is represented as implemented.

## Capture/ACK protocol v1

Envelope `{protocol:1,type:'capture-transfer',transferId,captures}`; each capture has a stable ID, entryId, selected text, original sentence, source URL and timestamp. Worker commits to chrome.storage.local before reporting Saved. Receiver validates sender, localhost:5173 origin, envelope version and payload size; web commits all accepted captures/entries in an IndexedDB transaction. Only then send `{protocol:1,type:'capture-ack',transferId,captureIds}`. Worker removes only acknowledged IDs. Lost ACK is retried with the same IDs; receiver handles duplicates idempotently. A receipt never creates L1. Snapshot contains only dictionary content, no progress. Worker queue must be separately exportable when the local app is off. This is a contract, not yet a running bridge.

## Chế độ làm một mình (cập nhật theo yêu cầu người dùng)

Không tạo Markdown evidence, không chờ reviewer riêng cho từng task. Task Done khi triển khai và kiểm tra phù hợp đạt; ghi kết quả ngắn ngay trong PHASES.md/tasks.json. Không đồng nhất Done của một task với nghiệm thu toàn bộ ứng dụng. Gate-BE kỹ thuật cần mọi task BE, pilot, bảng IPA và pipeline đạt. Theo lựa chọn người dùng, hoàn thiện đủ 2.000 từ là track nội dung riêng. FE chỉ mở sau khi người dùng nghiệm thu BE trực tiếp. Người dùng tự nghiệm thu cuối. Hợp đồng đã kiểm tra được dùng cho task BE kế tiếp mà không cần phê duyệt thủ công.

## IPA và giọng đọc sau thay đổi phạm vi

- `backend.ipa.list()/find(symbol)`: bảng IPA dạng chữ; không có phương thức play hay trường đường dẫn audio.
- `backend.audio.voices()/selectVoice(id)/speakEntry(entryId, {slow?, exampleId?})/stop()`: đọc headword hoặc câu ví dụ bằng en-US. Từ cá nhân bản nháp không có IPA vẫn đọc được; không cần gọi từ điển, không thay level.
- Kết quả speakEntry có status queued; không đồng nghĩa đã nghe xong. Thiếu giọng Mỹ trả unavailable; giọng UK không được chọn thay.
