# EnglishVocab — task triển khai

Code và kiểm thử, không có Markdown evidence/reviewer riêng. BE đã đạt kiểm tra kỹ thuật; đang dừng chờ người dùng nghiệm thu. **FE vẫn Blocked.**

Theo lựa chọn trực tiếp của người dùng: nghiệm thu BE với 677 mục hiện có; hoàn thiện bộ 2.000 từ là task nội dung riêng (P-DATA).

## EV-00 — Chốt hợp đồng giữa core, dữ liệu, tiện ích và FE

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: Không có.
- Phạm vi: Đọc các thiết kế đã có; xác định kiểu dữ liệu, chữ ký service, lỗi trả về, version và thông điệp capture/ACK. Giữ repo Git hiện có; không tạo lại thiết kế hoặc repo.
- Tiêu chí:
  - [x] Ghi rõ BE chạy trong trình duyệt/extension, server chỉ phục vụ file; FE không tự tính level hoặc ghi DB trực tiếp.
  - [x] Chốt Entry/Capture/Progress/Session/LookupResult/Backup và DTO mặt câu hỏi không lộ đáp án; learnedAt luôn có sau học đúng, lastReviewedAt được null trước lần ôn đầu.
  - [x] Có quyền sở hữu file, quy tắc đổi contract và mẫu evidence; toàn bộ FE phụ thuộc Gate-BE.

## BE-01 — Dựng công cụ TypeScript và harness kiểm tra core

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: EV-00.
- Phạm vi: Thiết lập compiler, lint, unit runner và harness trình duyệt để kiểm tra IndexedDB/extension. Chưa dựng App, navigation, component hoặc CSS sản phẩm.
- Tiêu chí:
  - [x] Chạy được typecheck/lint và một kiểm tra harness tối thiểu từ checkout sạch.
  - [x] Test HTML chỉ là fixture, không phải giao diện người dùng. Công cụ kiểm tra gate từ chối mở FE khi Gate-BE chưa có review hợp lệ.
  - [x] Có lockfile; chỉ owner công cụ thay package/lock/config dùng chung.

## BE-02 — Định nghĩa model, validation và catalog 200 topic

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-01.
- Phạm vi: Tạo schema có version, định danh topic ổn định theo TOPICS.md, kiểm tra tham chiếu và trạng thái draft/ready. Tách 2 bộ hệ thống khỏi thư viện cá nhân.
- Tiêu chí:
  - [x] Có đúng 100 topic IELTS và 100 topic giao tiếp, ID không trùng; tối đa 10 entryId/topic.
  - [x] CEFR và level nhớ là hai kiểu riêng; IELTS B1–C2, giao tiếp A1–B2; mục cá nhân có thể chưa có CEFR.
  - [x] Ready cá nhân cần từ, loại từ, nghĩa Việt đã xác nhận, đáp án và câu khuyết hợp lệ; chưa có IPA/CEFR/audio vẫn lưu và học được.

## BE-03 — Viết luật chấm và tạo câu khuyết

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02.
- Phạm vi: Chuẩn hóa NFKC, khoảng trắng, hoa/thường, dấu nháy; xử lý biến thể được khai báo. Tạo mask theo đoạn targetSurface, không replace chuỗi toàn câu.
- Tiêu chí:
  - [x] Sai chính tả không được chấp nhận bằng fuzzy matching; biến thể khác độ dài không bị ép vào cùng mask.
  - [x] Từ ngắn, cụm từ, dấu nối, từ lặp trong câu và dạng biến đổi có đáp án đúng; mask ổn định khi khôi phục session.
  - [x] Rỗng hoặc thiếu ô trả validation error, không tính sai; chỉ đủ đáp án hoặc Không nhớ mới chấm.

## BE-04 — Viết scheduler và bộ đồng hồ có thể giả lập

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02.
- Phạm vi: Hàm thuần nhận thời điểm trả lời: mới học L1 +2h; đúng L1/L2/L3/L4/L5 lần lượt sang L2/L3/L4/L5/L5 với +8h/+24h/+48h/+120h/+120h.
- Tiêu chí:
  - [x] Chuỗi đúng đúng hạn có mốc +2/+10/+34/+82/+202/+322 giờ; không có điểm tự dừng tại L5.
  - [x] Sai ở cả 5 level về L1 +2h; ôn muộn chỉ tăng 1 level và tính hạn từ lúc trả lời.
  - [x] Tính due bằng timestamp; tắt server/máy rồi mở lại vẫn thấy từ quá hạn, không cần tác vụ nền.

## BE-05 — Tạo IndexedDB, migration và repository

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02.
- Phạm vi: Lưu entries/topics/progress/events/session/captures/cache/settings bằng Dexie; index due, level, entry và collection. Tạo nền cho transaction và expectedVersion.
- Tiêu chí:
  - [x] Native IndexedDB trên trình duyệt chứng minh giữ dữ liệu sau reload/đóng mở context và migration không mất bản ghi.
  - [x] Rollback khi một phần ghi lỗi; duplicate key/đối chiếu version và hai tab cập nhật được xử lý.
  - [x] Lỗi quota/DB đóng được chuyển thành lỗi có cấu trúc; không báo lưu thành công trước commit.

## BE-06 — Service học từ mới và phiên đang dở

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-03, BE-04, BE-05.
- Phạm vi: Tạo lượt 5/10 mục chưa học; quản lý front/recall và tạm dừng/tiếp tục. Học đúng mới ghi progress và cập nhật session.
- Tiêu chí:
  - [x] Viết sai, xem lại, bỏ dở hoặc chỉ xem từ không tạo L1.
  - [x] Một transaction ghi L1 +2h và session; cùng attemptId gửi lại không tạo trùng; từ đã học không bị reset.
  - [x] Commit thành công rồi mới trả kết quả cho FE chuyển từ; lỗi ghi giữ câu trả lời để lưu lại.

## BE-07 — Service ôn tập, kết quả lần đầu và chống chấm trùng

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-03, BE-04, BE-05.
- Phạm vi: Tạo hàng đợi due 10/20 từ, hạn cũ trước, bao gồm từ cá nhân và L5. Chấm lần nộp đầu; đồng bộ progress/event/session trong transaction.
- Tiêu chí:
  - [x] Không đưa từ tương lai vào hàng đợi; từ vừa đến hạn trong lượt vào lượt tiếp theo.
  - [x] Không nhớ tính sai; sửa lại sau hiện đáp án không lên level lần hai; cùng attemptId và 2 tab không chấm kép.
  - [x] Version lỗi trả conflict; refresh sau commit không chấm lại; DTO câu hỏi không chứa từ đầy đủ, IPA, audio hoặc ví dụ làm lộ đáp án.

## BE-08 — Service truy vấn cho Ôn tập, topic và Sổ tay

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-05, BE-06, BE-07.
- Phạm vi: Tính thống kê và lọc/tìm kiếm cho đúng 3 tab; xác định topic đang dở và mốc ôn tiếp theo.
- Tiêu chí:
  - [x] Phân biệt chưa học gì/chưa đến hạn/có due; tổng học đếm entry duy nhất, tiến độ từng bộ đếm vị trí thực có.
  - [x] Đếm Chờ bổ sung/Chưa học/Đang ôn/Thành thạo đúng, L5 vẫn có nextReviewAt.
  - [x] Tìm theo từ/nghĩa; lọc bộ/topic/CEFR/level/due không sửa dữ liệu hoặc level.

## BE-09 — Service lưu từ cá nhân và ngữ cảnh

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02, BE-05.
- Phạm vi: Lưu draft hoặc ready, chọn nghĩa, sửa nghĩa Việt và liên kết nhiều capture với một entry. Giữ selectedText, câu gốc, đoạn cần khuyết, URL, nguồn và metadata.
- Tiêu chí:
  - [x] Tra đơn thuần không tạo entry; bấm lưu mới tạo capture; lưu/nhập capture không tạo progress.
  - [x] Cùng nghĩa giữ level và bổ sung ngữ cảnh; khác nghĩa tạo ID riêng; không gộp chỉ theo mặt chữ.
  - [x] Policies/policy giữ đúng dạng trong câu; thiếu nghĩa Việt/POS/câu hợp lệ ở Chờ bổ sung, thiếu CEFR/IPA không chặn ready.

## BE-10 — Adapter Wiktionary/FreeDictionaryAPI.com và các trường thiếu

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02.
- Phạm vi: Gọi endpoint en được chọn, ánh xạ nhiều entry/nghĩa/POS/IPA/audio/example; timeout, abort, not-found, 429 và lỗi mạng. Kiểm tra CORS thực tế từ localhost:5173.
- Tiêu chí:
  - [x] Giữ nguồn và giấy phép riêng cho text/audio; không gán CEFR hoặc nghĩa Việt giả, không tự chọn nghĩa đầu.
  - [x] Hủy/bỏ kết quả cũ theo queryId; tôn trọng Retry-After, không retry vô hạn; chỉ gửi từ/cụm từ.
  - [x] Có fixture cho các lỗi và bản ghi kiểm tra live/CORS. Nếu CORS không chạy, chưa Pass: xử lý qua cầu nối extension đã có quyền hoặc báo blocker rõ, không tự dựng backend mới.

## BE-11 — Tra local trước, cache và snapshot cho tiện ích

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-05, BE-10.
- Phạm vi: Ưu tiên entry local phù hợp → cache → API; hỗ trợ tra thêm online. Giới hạn 500 truy vấn gần đây mỗi vùng, chia sẻ request đang chạy và xuất snapshot có version.
- Tiêu chí:
  - [x] Local hit không gọi mạng; offline vẫn dùng dữ liệu có sẵn; snapshot không chứa progress/ghi chú riêng tư không cần thiết.
  - [x] Xóa/cache lỗi không xóa mục đã lưu hoặc ngăn xem kết quả; lưu capture vẫn cần commit riêng.
  - [x] Kết quả cache không tạo thư viện/level, không ghi đè nghĩa Việt người dùng đã sửa.

## BE-12 — Nhập gói từ, cập nhật nội dung và kiểm tra dữ liệu

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02, BE-05.
- Phạm vi: Inspect trước khi nhập; schema/content version, tham chiếu, max10/topic, trạng thái, CEFR và provenance. Cập nhật theo ID mà giữ tiến độ.
- Tiêu chí:
  - [x] Gói lỗi bị từ chối trước khi ghi hoặc rollback cả gói; không có nhập dở dang.
  - [x] Content revision không reset progress hoặc thay nghĩa đã học thành nghĩa khác; ID đổi phải migration rõ.
  - [x] Validator báo được số topic, vị trí và mục duy nhất, thiếu trường, nguồn và các mục chưa được kiểm tra.

## BE-13 — Xuất, kiểm tra và khôi phục sao lưu

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-05, BE-09, BE-12.
- Phạm vi: Backup toàn bộ nội dung/capture đã nhận/progress/events/session/settings/nguồn; bỏ cache. Inspect bản sao lưu và restore thay thế toàn bộ bằng transaction.
- Tiêu chí:
  - [x] Export → restore vào DB sạch giữ đúng ID, level, due, session, đoạn khuyết và nguồn.
  - [x] Schema mới hơn, file hỏng, tham chiếu lỗi hoặc lỗi ghi không thay dữ liệu hiện tại.
  - [x] Queue chưa chuyển không tự được coi đã backup; nhập queue theo captureId không tạo trùng/progress; audio remote lưu URL + nguồn, không hứa offline.

## BE-14 — Nền tiện ích: manifest, worker và hàng đợi bền vững

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-09, BE-10, BE-11.
- Phạm vi: Manifest V3, host API và quyền cần thiết; nhận capture từ contract, gọi API từ worker và lưu queue/snapshot/cache riêng. Chưa dựng popup hoặc CSS.
- Tiêu chí:
  - [x] Server local tắt vẫn tra API khi có mạng và lưu được; mất mạng vẫn lưu draft.
  - [x] Worker bị dừng rồi khởi động lại, đóng/mở browser trong profile kiểm tra vẫn giữ queue đã commit.
  - [x] Quota/ghi lỗi không báo đã lưu; queue có xuất JSON; worker chỉ nhận query hợp lệ, không fetch URL tùy ý.

## BE-15 — Cầu nối chuyển capture và ACK sau commit

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-09, BE-11, BE-13, BE-14.
- Phạm vi: Giao thức có version giữa tiện ích và web trên đúng localhost:5173; chuyển capture, trả receipt và cập nhật snapshot. Kiểm tra bằng harness chưa có UI sản phẩm.
- Tiêu chí:
  - [x] Web chỉ ACK sau commit, extension chỉ bỏ queue sau ACK; mất ACK/gửi lại nhiều lần không tạo trùng.
  - [x] Nguồn/sender/type/size được kiểm tra; website đọc bên ngoài không nhận cả queue và không ghi trực tiếp DB web.
  - [x] Queue export/import và chuyển lại sau restart đều giữ nghĩa/câu gốc, không tạo L1; snapshot có version và không mất dữ liệu cá nhân.

## BE-16 — Giọng Anh-Mỹ cho từ/câu, kể cả từ tự thêm

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02, BE-05.
- Phạm vi: Chọn en-US, cập nhật voiceschanged, lưu lựa chọn, đọc headword/câu ví dụ thường hoặc chậm, kể cả bản nháp chưa có IPA. Bảng IPA không có audio.
- Tiêu chí:
  - [x] Không chọn en-GB thay en-US; thiếu giọng Mỹ trả unavailable rõ, không chặn chức năng học khác.
  - [x] Từ tự thêm hoặc bản nháp chưa có IPA/kết quả từ điển vẫn gọi phát âm headword; không tạo hoặc sửa tiến độ.
  - [x] Giọng lưu và danh sách đến muộn được xử lý; kiểm tra native Chrome có cửa sổ đã phát xong một utterance en-US từ bản nháp không IPA (tắt âm lượng trong test).

## BE-17 — Launcher và server file tĩnh cố định

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-01.
- Phạm vi: Một lệnh khởi động, bind loopback tại localhost:5173, lỗi cổng bận không đổi cổng. Trước FE dùng fixture kiểm tra; sau FE phục vụ dist.
- Tiêu chí:
  - [x] Khởi động/dừng không sửa IndexedDB hoặc đổi origin; kiểm tra đường dẫn tĩnh, MIME, path traversal và cổng bận.
  - [x] Thông báo thiếu build rõ ràng, launcher mở đúng địa chỉ; không lắng nghe công khai ngoài máy.
  - [x] Có hướng dẫn Node/runtime tối thiểu được xác định khi triển khai, không thêm Docker hoặc DB server.

## DATA-01 — Tuyển bộ thử 200 vị trí nội dung

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02, BE-12.
- Phạm vi: 10 topic đầu IELTS + 10 topic đầu giao tiếp, mỗi topic 10 từ/cụm từ. Chọn nghĩa hữu ích, nghĩa Việt, IPA US khi có, câu ví dụ và nguồn; không coi 200 tên topic là 200 từ.
- Tiêu chí:
  - [x] Có 200 vị trí hợp lệ, report ID dùng chung và số mục duy nhất; đúng phạm vi CEFR từng bộ.
  - [x] CEFR có nhãn verified/estimated và nguồn/ghi chú trung thực; nghĩa/câu do người biên soạn được review, không ghi Cambridge khi chưa đối chiếu.
  - [x] Mỗi mục có câu khuyết dùng được, nghĩa Việt và provenance; thiếu IPA US được báo, không đổi IPA UK thành US bằng nhãn.
- Giới hạn: CEFR đều ước lượng. 37 IPA tham khảo có nhãn Mỹ và giấy phép; chưa nghe kiểm tra. 163 mục thiếu hoặc nhiều cách đọc chưa chọn; không gán IPA UK thành US.

## DATA-02 — IELTS topic 11–55: 450 vị trí

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: DATA-01.
- Phạm vi: Tuyển 45 topic từ TOPICS.md, 10 vị trí/topic; cùng chuẩn dữ liệu và review như bộ thử. Không sửa gói thuộc task dữ liệu khác.
- Tiêu chí:
  - [x] Đủ 450 vị trí, không có topic quá 10; IDs và tham chiếu hợp lệ, không trùng mục trong cùng topic.
  - [x] Mỗi nghĩa có nghĩa Việt và câu phù hợp, CEFR trong phạm vi bộ và nhãn độ tin cậy thật; nguồn/giấy phép rõ theo từng trường.
  - [x] Tự rà soát nghĩa/cách dùng theo từng lô, giữ bản biên soạn và nhãn nguồn rõ; kiểm tra schema, câu khuyết và nhập lại không mất tiến độ.
- Giới hạn: CEFR ước lượng. Có 37 IPA tham khảo nhãn Mỹ, 413 mục thiếu hoặc nhiều cách đọc chưa chọn; phát âm từ/câu độc lập bằng en-US.

## DATA-CRAWL — Pipeline crawl, lọc nguồn, tuyển chọn và giữ kho local

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02, BE-12.
- Phạm vi: Tải nguồn một lần, giữ raw và snapshot lâu dài, lọc offline theo seed, dùng cache API và xuất gói theo nghĩa đã chọn. Không tự tạo nội dung hoặc progress.
- Tiêu chí:
  - [x] Giữ nguồn raw và snapshot có checksum; mở rộng topic có thể lọc lại từ kho local.
  - [x] Chỉ xuất nghĩa Việt có trong nguồn và câu được chọn; giữ nguồn/giấy phép theo từng trường, CEFR chỉ là ước lượng.
  - [x] Có kiểm tra phân tách nghĩa, IPA đúng nhãn Mỹ, câu khuyết và nhập lại không mất tiến độ.
- Giới hạn: Pipeline hoàn tất không đồng nghĩa đủ 2.000 mục. Ghép câu theo từ/nghĩa Việt chỉ tạo ứng viên; vẫn rà soát nghĩa và ngữ cảnh trước publish.

## DATA-03 — IELTS topic 56–100: 450 vị trí

- Trạng thái: **In progress**; kiểm tra: **Not tested**.
- Phụ thuộc: DATA-01.
- Phạm vi: Tuyển 45 topic từ TOPICS.md, 10 vị trí/topic; cùng chuẩn dữ liệu và review như bộ thử. Không sửa gói thuộc task dữ liệu khác.
- Tiêu chí:
  - [ ] Đủ 450 vị trí, không có topic quá 10; IDs và tham chiếu hợp lệ, không trùng mục trong cùng topic.
  - [ ] Mỗi nghĩa có nghĩa Việt và câu phù hợp, CEFR trong phạm vi bộ và nhãn độ tin cậy thật; nguồn/giấy phép rõ theo từng trường.
  - [ ] Dữ liệu được kiểm tra ngôn ngữ theo từng lô, có người review và báo cáo; validator/schema pass đơn thuần không chứng minh chất lượng nghĩa/cách dùng.
- Còn lại: Đã nhập 3/450 mục từ nguồn crawl trong 1 topic chưa đủ 10 từ; còn 447 vị trí. Tái sử dụng kho raw, không tự biên soạn toàn bộ.

## DATA-04 — Giao tiếp topic 11–55: 450 vị trí

- Trạng thái: **In progress**; kiểm tra: **Not tested**.
- Phụ thuộc: DATA-01.
- Phạm vi: Tuyển 45 topic từ TOPICS.md, 10 vị trí/topic; cùng chuẩn dữ liệu và review như bộ thử. Không sửa gói thuộc task dữ liệu khác.
- Tiêu chí:
  - [ ] Đủ 450 vị trí, không có topic quá 10; IDs và tham chiếu hợp lệ, không trùng mục trong cùng topic.
  - [ ] Mỗi nghĩa có nghĩa Việt và câu phù hợp, CEFR trong phạm vi bộ và nhãn độ tin cậy thật; nguồn/giấy phép rõ theo từng trường.
  - [ ] Dữ liệu được kiểm tra ngôn ngữ theo từng lô, có người review và báo cáo; validator/schema pass đơn thuần không chứng minh chất lượng nghĩa/cách dùng.
- Còn lại: Đã nhập 0/450 mục từ nguồn crawl trong 0 topic chưa đủ 10 từ; còn 450 vị trí. Tái sử dụng kho raw, không tự biên soạn toàn bộ.

## DATA-05 — Giao tiếp topic 56–100: 450 vị trí

- Trạng thái: **Ready**; kiểm tra: **Not tested**.
- Phụ thuộc: DATA-01.
- Phạm vi: Tuyển 45 topic từ TOPICS.md, 10 vị trí/topic; cùng chuẩn dữ liệu và review như bộ thử. Không sửa gói thuộc task dữ liệu khác.
- Tiêu chí:
  - [ ] Đủ 450 vị trí, không có topic quá 10; IDs và tham chiếu hợp lệ, không trùng mục trong cùng topic.
  - [ ] Mỗi nghĩa có nghĩa Việt và câu phù hợp, CEFR trong phạm vi bộ và nhãn độ tin cậy thật; nguồn/giấy phép rõ theo từng trường.
  - [ ] Dữ liệu được kiểm tra ngôn ngữ theo từng lô, có người review và báo cáo; validator/schema pass đơn thuần không chứng minh chất lượng nghĩa/cách dùng.

## DATA-06 — Bảng IPA Anh-Mỹ dạng chữ và từ ví dụ

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: BE-02.
- Phạm vi: Bảng IPA dạng chữ theo thay đổi yêu cầu: phụ âm, nguyên âm đơn/đôi, từ ví dụ và ghi chú biến thể; bỏ phát âm từng ký hiệu.
- Tiêu chí:
  - [x] Danh sách và phân nhóm nhất quán, có ví dụ và giải thích biến thể; không áp một số lượng âm duy nhất cho mọi giọng Mỹ.
  - [x] Schema và service chỉ tra bảng/ký hiệu, không có trường audio hoặc phương thức play.
  - [x] Không đóng gói file audio IPA. Nghe từ/câu en-US là chức năng riêng.

## GATE-BE — Kiểm tra kỹ thuật BE và bàn giao người dùng nghiệm thu

- Trạng thái: **Done**; kiểm tra: **Pass**.
- Phụ thuộc: EV-00, BE-01, BE-02, BE-03, BE-04, BE-05, BE-06, BE-07, BE-08, BE-09, BE-10, BE-11, BE-12, BE-13, BE-14, BE-15, BE-16, BE-17, DATA-01, DATA-06, DATA-CRAWL.
- Phạm vi: Kiểm tra core/storage/dictionary/worker/bridge/audio/launcher, pipeline nhập từ và thư viện hiện có 677 mục. Bộ đủ 2.000 vị trí là task dữ liệu riêng theo lựa chọn của người dùng. Chưa làm FE.
- Tiêu chí:
  - [x] Toàn bộ BE-01..BE-17, pilot, bảng IPA dạng chữ và pipeline dữ liệu đã triển khai; typecheck/lint/unit/integration đạt.
  - [x] Native IndexedDB qua hai tab/restart/migration, backup/restore, toàn bộ gói production và facade học–ôn đúng lịch L5 5 ngày đã kiểm tra trên Chrome thật.
  - [x] Live API qua browser CORS và worker thật, hàng đợi khi server tắt/restart/lost ACK, giọng en-US cho draft không IPA khi Internet bị chặn đều đạt.
  - [x] Technical Pass không tự ghi người dùng đã nghiệm thu. FE chỉ được bắt đầu sau khi userAcceptance.backend là true theo xác nhận trực tiếp của người dùng.
- Còn lại: Chờ người dùng nghiệm thu BE. Không tự mở FE. Nội dung 677/2.000, còn 1.323 vị trí ở task dữ liệu riêng.

## FE-01 — Khung ứng dụng và đúng 3 tab chính

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: GATE-BE.
- Phạm vi: Dựng React/Vite và giao diện sáng theo FRONTEND.md và ba ảnh tham khảo trong assets/: Ôn tập/Học từ mới/Sổ tay, nền xám, nội dung trắng, vàng cho topic và xanh cho hành động.
- Tiêu chí:
  - [ ] Không có tab dashboard/reading riêng; utility mở trong Sổ tay/menu.
  - [ ] Bố cục desktop/mobile từ 320px, keyboard/focus và vùng bấm phù hợp; không sao chép tài sản thương hiệu của app tham khảo.
  - [ ] Chỉ gọi service contract BE, không tự tính level/ghi DB trong component.

## FE-02 — Danh sách bộ từ và topic

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-01.
- Phạm vi: Chọn IELTS/giao tiếp, tìm topic, hàng có tên Anh/Việt, minh họa tùy chọn và tiến độ thực; bấm học hoặc tiếp tục lượt dở.
- Tiêu chí:
  - [ ] 100 topic/bộ dùng catalog thật; không giả số từ/tiến độ.
  - [ ] Topic hết từ chưa học dẫn xem Sổ tay, không reset progress; topic thiếu nội dung có trạng thái nhập dữ liệu rõ.
  - [ ] Từ topic mới vào service học theo đúng batch tối đa 10.

## FE-03 — Màn học mới xem → ẩn → viết lại

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-02.
- Phạm vi: Thẻ từ/loại/nghĩa/IPA/CEFR/ví dụ, nghe US thường/chậm; Next ẩn đáp án và chuyển sang ô viết toàn bộ từ.
- Tiêu chí:
  - [ ] Mặt viết lại không còn từ/IPA/câu/nút nghe/ảnh lộ đáp án; sai thử lại, Xem lại chưa tạo progress.
  - [ ] Đúng đợi BE commit L1 +2h rồi tự chuyển tiếp và hiện thông báo gọn; không thêm màn ba bước khác workflow đã chốt.
  - [ ] Đóng/refresh khôi phục lượt dở; ghi lỗi giữ bài; thiếu ảnh/giọng không chặn học.

## FE-04 — Trang Ôn tập và phiên điền chữ thiếu

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-01, FE-03.
- Phạm vi: Ba trạng thái chưa học/chưa đến hạn/có due; lượt 10/20, lọc nguồn. Phiên ôn có ô chữ trong câu, keyboard, Không nhớ và phản hồi.
- Tiêu chí:
  - [ ] Chỉ lấy từ due thật; mặt câu hỏi không lộ đáp án; thiếu ô chưa chấm.
  - [ ] Kết quả đầu khóa bài, hiện từ/IPA/CEFR/nghe/level/hạn mới, bấm Từ tiếp theo; không tự lên level bằng logic FE.
  - [ ] L5 vẫn có ngày ôn 5 ngày, sai về L1; refresh/double-click không chấm lại; đủ trạng thái rỗng/lỗi/đang lưu.

## FE-05 — Sổ tay, từ cá nhân và chỉnh mục nháp

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-01, FE-03.
- Phạm vi: Tìm/lọc và chi tiết đã học; Từ của tôi chia Chờ bổ sung/Chưa học/Đang ôn/Thành thạo. Sửa nghĩa/câu và bắt đầu học từ cá nhân.
- Tiêu chí:
  - [ ] Chưa học không có level giả; chỉ đủ trường mới vào bài học.
  - [ ] CEFR và level trình bày riêng, hiện ngày ôn L5; sửa nghĩa khác tạo mục mới theo BE.
  - [ ] Nguồn/ghi chú/ngữ cảnh mở xem được; danh sách cập nhật sau học/lưu mà không ghi đè dữ liệu.

## FE-06 — Reading và popup tra từ trong web

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-01, FE-05.
- Phạm vi: Bảng đọc trong Sổ tay, giữ selection/câu gốc và popup như mẫu: chọn nghĩa, IPA US, ví dụ, ô nghĩa Việt, nguồn và Lưu từ.
- Tiêu chí:
  - [ ] Local trước/API khi cần; đổi selection không hiện kết quả cũ; neo popup trong màn hình, mobile dùng bảng nổi phù hợp.
  - [ ] Thiếu nghĩa Việt vẫn lưu draft, thiếu CEFR không bịa nhãn; giữ câu gốc tách với ví dụ từ API.
  - [ ] Lưu thành công chỉ vào Chưa học/Chờ bổ sung; lỗi mạng/không tìm thấy vẫn lưu nháp; thông báo phụ thuộc commit.

## FE-07 — Popup và vùng chọn trên website qua tiện ích

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-06.
- Phạm vi: Gắn popup đã thiết kế vào trang được cấp quyền, menu vùng chọn, đóng/mở, bắt câu ngữ cảnh; nối worker/queue/bridge BE đã hoàn thành.
- Tiêu chí:
  - [ ] Bôi đen trên trang HTML thực được cấp quyền mở popup, chọn nghĩa và lưu đúng câu; không đọc input nhạy cảm.
  - [ ] Server tắt vẫn tra online khi có mạng và lưu; worker/queue restart rồi bật web chuyển đúng một capture.
  - [ ] Không phá CSS trang đọc; popup trong viewport, bàn phím và link/iframe/trang không hỗ trợ có thông báo/đường nhập thủ công.

## FE-08 — Bảng IPA và cài đặt giọng Anh-Mỹ

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-01, FE-05.
- Phạm vi: Bảng phụ IPA dạng chữ: ký hiệu, nhóm và ví dụ; cài đặt giọng đọc từ/câu en-US thường/chậm và nhớ lựa chọn. Không có nút phát từng âm.
- Tiêu chí:
  - [ ] Bảng IPA chỉ đọc metadata từ service, chia phụ âm/nguyên âm đơn/nguyên âm đôi; không có nút hoặc file audio IPA.
  - [ ] Giọng từ/câu chỉ en-US, không có US báo rõ; giọng local hoạt động khi không có Internet và thiết bị hỗ trợ.
  - [ ] Từ cá nhân chưa có IPA vẫn có thể nghe headword; không đưa ký hiệu IPA cho TTS.

## FE-09 — Nhập/xuất, khôi phục và cài đặt còn lại

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-01, FE-05.
- Phạm vi: Trong Sổ tay/menu: file picker gói từ/backup/queue, preview kết quả, xác nhận restore, tải backup và nhắc xuất sau 7 ngày; bật/tắt online và xóa cache.
- Tiêu chí:
  - [ ] Xem trước số mới/cập nhật/lỗi; file lỗi không đổi DB, restore thay thế chỉ thực hiện sau xác nhận theo thiết kế.
  - [ ] Xuất file thật đọc/nhập lại được; phân biệt backup web và queue chưa chuyển; không gọi lưu local là đã sao lưu.
  - [ ] Xóa cache không xóa từ/tiến độ; nhận queue hiện kết quả rõ, không tự tạo L1.

## GATE-FE — Kiểm tra tích hợp toàn bộ luồng và giao diện

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: FE-01, FE-02, FE-03, FE-04, FE-05, FE-06, FE-07, FE-08, FE-09.
- Phạm vi: Kiểm tra bản build dùng dịch vụ thật, DB thật, extension thật và bộ nội dung hoàn chỉnh; đối chiếu FRONTEND.md và thiết kế đã duyệt.
- Tiêu chí:
  - [ ] Typecheck/lint/build và kiểm tra core cần thiết đều đạt; không có lỗi chặn/mất dữ liệu/chấm sai.
  - [ ] Chạy học → đóng → mở sau 2h giả lập → ôn → L5 → đúng/sai; capture → chọn nghĩa → lưu draft/ready → học; hai tab và backup round-trip.
  - [ ] Có ảnh/video 3 tab, mặt xem/viết, bài ôn trước/sau chấm, popup website thật; desktop/mobile 320px, keyboard, giọng US và offline được kiểm tra.
  - [ ] COORD review report, ghi Pass/Fail/Blocked/Not tested trung thực; mẫu minh họa trước đó không thay bằng chứng bản build.

## REL-01 — Đóng gói bản local, hướng dẫn và khôi phục

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: GATE-FE, DATA-03, DATA-04, DATA-05.
- Phạm vi: Gói build và extension, launcher, hướng dẫn cài trên máy cá nhân/khởi động/dừng/backup/restore, ghi version và giới hạn đã xác minh.
- Tiêu chí:
  - [ ] Checkout hoặc thư mục release sạch chạy được theo hướng dẫn, origin localhost:5173 được giữ cố định.
  - [ ] Có manifest 200 topic/2.000 vị trí, unique count, nguồn/giấy phép và file IPA; không kèm profile/test data cá nhân hoặc khóa bí mật.
  - [ ] Hướng dẫn cài tiện ích và quyền cần thiết, server tắt vẫn lưu/tra, khác browser không tự dùng chung tiến độ; có backup mẫu không chứa dữ liệu cá nhân.

## ACCEPT-01 — Người dùng dùng thử và nghiệm thu bản cá nhân

- Trạng thái: **Blocked**; kiểm tra: **Not tested**.
- Phụ thuộc: REL-01.
- Phạm vi: Người dùng kiểm tra trên máy/trình duyệt sử dụng hằng ngày: học, ôn, lưu từ lúc đọc, giọng Anh-Mỹ và khôi phục sao lưu.
- Tiêu chí:
  - [ ] Có bản build và hướng dẫn cụ thể để dùng thử, không chỉ ảnh hoặc prototype.
  - [ ] Người dùng xác nhận hoặc ghi điểm cần sửa; agent không tự ghi User accepted.
  - [ ] Chỉ đóng toàn dự án khi yêu cầu còn lại đã được xử lý hoặc người dùng chấp nhận giới hạn cụ thể.
- Còn lại: Final project acceptance is separate from the requested backend acceptance before frontend.
