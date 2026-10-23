# EnglishVocab — tiến độ triển khai

**Đọc file này trước khi làm task tiếp theo. BE đã bàn giao; người dùng đã yêu cầu triển khai FE. Điểm tiếp tục hiện tại: kiểm thử tương tác FE-06 trong Reading; FE-07…FE-09 chưa triển khai.**

Chỉ giữ checklist gọn và kiểm thử trong mã; không có Markdown evidence hoặc reviewer riêng. `[x]` đánh dấu task đã triển khai. Kết quả kiểm tra ghi riêng: Build Pass xác nhận TypeScript và bundle biên dịch thành công, không thay thế kiểm tra toàn bộ luồng trên trình duyệt hoặc nghiệm thu của người dùng.

## [x] P0 — Hợp đồng và cách bàn giao

1/1 task hoàn tất.

- [x] **EV-00** Chốt hợp đồng giữa core, dữ liệu, tiện ích và FE — Done / Pass.

## [x] P1 — Nền tảng, model và luật học–ôn

4/4 task hoàn tất.

- [x] **BE-01** Dựng công cụ TypeScript và harness kiểm tra core — Done / Pass.
- [x] **BE-02** Định nghĩa model, validation và catalog 200 topic — Done / Pass.
- [x] **BE-03** Viết luật chấm và tạo câu khuyết — Done / Pass.
- [x] **BE-04** Viết scheduler và bộ đồng hồ có thể giả lập — Done / Pass.

## [x] P2 — Lưu trữ và dịch vụ học–ôn

7/7 task hoàn tất.

- [x] **BE-05** Tạo IndexedDB, migration và repository — Done / Pass.
- [x] **BE-06** Service học từ mới và phiên đang dở — Done / Pass.
- [x] **BE-07** Service ôn tập, kết quả lần đầu và chống chấm trùng — Done / Pass.
- [x] **BE-08** Service truy vấn cho Ôn tập, topic và Sổ tay — Done / Pass.
- [x] **BE-09** Service lưu từ cá nhân và ngữ cảnh — Done / Pass.
- [x] **BE-12** Nhập gói từ, cập nhật nội dung và kiểm tra dữ liệu — Done / Pass.
- [x] **BE-13** Xuất, kiểm tra và khôi phục sao lưu — Done / Pass.

## [x] P3 — Tra từ, worker và cầu nối

4/4 task hoàn tất.

- [x] **BE-10** Adapter Wiktionary/FreeDictionaryAPI.com và các trường thiếu — Done / Pass.
- [x] **BE-11** Tra local trước, cache và snapshot cho tiện ích — Done / Pass.
- [x] **BE-14** Nền tiện ích: manifest, worker và hàng đợi bền vững — Done / Pass.
- [x] **BE-15** Cầu nối chuyển capture và ACK sau commit — Done / Pass.

## [x] P4 — Nội dung nền, pipeline, giọng đọc và vận hành

5/5 task hoàn tất.

- [x] **DATA-01** Tuyển bộ thử 200 vị trí nội dung — Done / Pass.
  Giới hạn đã ghi nhận: CEFR đều ước lượng. 37 IPA tham khảo có nhãn Mỹ và giấy phép; chưa nghe kiểm tra. 163 mục thiếu hoặc nhiều cách đọc chưa chọn; không gán IPA UK thành US.
- [x] **DATA-06** Bảng IPA Anh-Mỹ dạng chữ và từ ví dụ — Done / Pass.
- [x] **BE-16** Giọng Anh-Mỹ cho từ/câu, kể cả từ tự thêm — Done / Pass.
- [x] **BE-17** Launcher và server file tĩnh cố định — Done / Pass.
- [x] **DATA-CRAWL** Pipeline crawl, lọc nguồn, tuyển chọn và giữ kho local — Done / Pass.
  Giới hạn đã ghi nhận: Pipeline hoàn tất không đồng nghĩa đủ 2.000 mục. Ghép câu theo từ/nghĩa Việt chỉ tạo ứng viên; vẫn rà soát nghĩa và ngữ cảnh trước publish.

## [x] P5 — Kiểm tra kỹ thuật BE và bàn giao sang FE

1/1 task hoàn tất.

- [x] **GATE-BE** Kiểm tra kỹ thuật BE và bàn giao người dùng nghiệm thu — Done / Pass.
  BE đã bàn giao; người dùng đã yêu cầu tiếp tục FE. Bộ đủ 2.000 từ được tách sang task dữ liệu riêng: hiện 677/2.000, còn 1.323 vị trí. Nghiệm thu toàn bộ ứng dụng vẫn thuộc P8.

## [x] P6 — Giao diện chính và học–ôn

5/5 task đã triển khai. FE-05 đã kiểm tra luồng chính trên Chrome với IndexedDB thật. Kiểm tra tích hợp đầy đủ và nghiệm thu toàn bộ giao diện vẫn thuộc GATE-FE/P8.

- [x] **FE-01** Khung ứng dụng và đúng 3 tab chính — Done / Build Pass.
  Đã mở được trang chính trên trình duyệt; chưa kiểm tra đầy đủ bố cục mobile và điều hướng bằng bàn phím.
- [x] **FE-02** Danh sách bộ từ và topic — Done / Build Pass.
  Đã nối catalog, tìm kiếm, tiến độ thật, tạo phiên tối đa 10 từ, tạm dừng và tiếp tục phiên. Chờ kiểm tra đầy đủ thao tác trên trình duyệt.
- [x] **FE-03** Màn học mới xem → ẩn → viết lại — Done / Build Pass.
  Đã có thẻ từ, giọng Mỹ cho từ/câu, viết lại, bản nháp, gọi BE chấm và chuyển từ sau commit. Chờ kiểm tra đầy đủ luồng đúng/sai, refresh và lỗi lưu trên trình duyệt.
- [x] **FE-04** Trang Ôn tập và phiên điền chữ thiếu — Done / Build Pass.
  Đã có trang đến hạn/lọc bộ từ/lượt 10–20, ô chữ, Không nhớ, phản hồi và chuyển câu. Chờ kiểm tra đầy đủ luồng trên trình duyệt, gồm refresh và chống chấm trùng.
- [x] **FE-05** Sổ tay, từ cá nhân và chỉnh mục nháp — Done / Pass.
  Đã có tìm/lọc, chi tiết, nguồn/ngữ cảnh, thêm từ, sửa nháp, ghi chú và học từ cá nhân. Đổi nghĩa tạo mục mới; giữ tiến độ/nguồn cũ, chặn ghi đè bản cũ và sửa nội dung đang nằm trong phiên dở. Build và lint các file vừa sửa đạt; 48 test đạt. Chrome đạt 5 ca: tạo nháp không IPA, bổ sung để học, viết sai rồi đúng vào L1, reload giữ ghi chú/tiến độ, đổi nghĩa không mất level cũ. Chưa nghe kiểm tra audio hay kiểm tra toàn bộ responsive/accessibility.

## [ ] P7 — Reading, popup và tiện ích

1/4 task đã triển khai; FE-06 chưa kiểm thử đầy đủ trên trình duyệt.

- [x] **FE-06** Reading và popup tra từ trong web — Done / Build Pass; UI luồng local Pass, API/lỗi mạng chưa kiểm thử đầy đủ.
  Đã có ReadingPanel trong Sổ tay: dán bài đọc, lưu URL nguồn, lấy từ và câu gốc khi bôi đen. Bôi đen chỉ hiện icon 🔍; bấm icon mới mở LookupPopup. Có tra local/cache/API, chọn nghĩa, nhập nghĩa tiếng Việt, lưu từ/ngữ cảnh và giữ tiến độ từ đã tồn tại; thiếu dữ liệu thì lưu nháp.
  Phạm vi hiện tại: chỉ vùng bài đọc trong ReadingPanel, chưa áp dụng toàn ứng dụng hoặc website khác. Đã kiểm thử icon → popup → tra local → lưu ngữ cảnh và popup vừa màn hình mobile 390px. Còn kiểm thử API/lỗi mạng và đổi vùng chọn. Ảnh người dùng bôi đen tên topic ở trang Học từ mới không xác nhận luồng Reading đã chạy.
- [ ] **FE-07** Popup và vùng chọn trên website qua tiện ích — Blocked / Not tested.
- [ ] **FE-08** Bảng IPA và cài đặt giọng Anh-Mỹ — Blocked / Not tested.
- [ ] **FE-09** Nhập/xuất, khôi phục và cài đặt còn lại — Blocked / Not tested.

## [ ] P8 — Gate-FE, bản local và nghiệm thu

0/3 task hoàn tất.

- [ ] **GATE-FE** Kiểm tra tích hợp toàn bộ luồng và giao diện — Blocked / Not tested.
- [ ] **REL-01** Đóng gói bản local, hướng dẫn và khôi phục — Blocked / Not tested.
- [ ] **ACCEPT-01** Người dùng dùng thử và nghiệm thu bản cá nhân — Blocked / Not tested.
  Còn lại: Final project acceptance is separate from the requested backend acceptance before frontend.

## [ ] P-DATA — Nội dung riêng: hoàn thiện bộ 2.000 vị trí

1/4 task hoàn tất.

- [x] **DATA-02** IELTS topic 11–55: 450 vị trí — Done / Pass.
  Giới hạn đã ghi nhận: CEFR ước lượng. Có 37 IPA tham khảo nhãn Mỹ, 413 mục thiếu hoặc nhiều cách đọc chưa chọn; phát âm từ/câu độc lập bằng en-US.
- [ ] **DATA-03** IELTS topic 56–100: 450 vị trí — In progress / Not tested.
  Còn lại: Đã nhập 3/450 mục từ nguồn crawl trong 1 topic chưa đủ 10 từ; còn 447 vị trí. Tái sử dụng kho raw, không tự biên soạn toàn bộ.
- [ ] **DATA-04** Giao tiếp topic 11–55: 450 vị trí — In progress / Not tested.
  Còn lại: Đã nhập 0/450 mục từ nguồn crawl trong 0 topic chưa đủ 10 từ; còn 450 vị trí. Tái sử dụng kho raw, không tự biên soạn toàn bộ.
- [ ] **DATA-05** Giao tiếp topic 56–100: 450 vị trí — Ready / Not tested.

## Kết quả kiểm tra đã ghi nhận

- BE trước khi triển khai FE: Unit/integration 43 test, Pass; chưa chạy lại trong lượt cập nhật tiến độ này.
- Chrome/IndexedDB thật: 7 kiểm tra đạt.
- Worker/queue/bridge thật: 5 kiểm tra đạt.
- API live: Pass: Chrome browser CORS at localhost:5173 and MV3 worker live lookup; rechecked for backend handoff..
- Nội dung: 677/2.000 mục; thiếu IPA: 595; bảng IPA: 40 hàng dạng chữ (không audio từng âm).

- FE hiện tại: `npm run build` Pass ngày 21/10/2026; TypeScript và esbuild đều thành công. Chưa kiểm tra toàn bộ tương tác của FE-02…FE-04 trên trình duyệt.

- Sau FE-05: `npm test` 48/48 Pass; lint các file FE-05 vừa sửa Pass; 5 ca UI Chrome/IndexedDB thật Pass trên origin và bộ nhớ riêng, không dùng tiến độ học của người dùng.

- Sau refactor FE (21/10/2026): tổ chức code theo feature, tách hook điều khiển học/ôn, helper Reading và CSS theo chức năng; giữ logic và thiết kế. `npm run check` Pass (53 test), `npm run build` Pass, formatter Pass. 7 nhóm kiểm tra UI Chrome/IndexedDB riêng Pass: thêm/sửa từ, học, giữ tiến độ, Reading icon/popup/lưu và ôn tạm dừng/đúng/sai/tải lại feedback. Có lệnh `npm run test:frontend` để chạy lại; không dùng dữ liệu học của người dùng. Không coi đây là nghiệm thu toàn bộ FE hoặc hoàn tất FE-07…FE-09.

## Điểm tiếp tục

1. Xem task đang In progress và phần Còn lại ở trên; không làm lại các task đã tích.
2. P6 đã triển khai 5/5 task; FE-06 đã thêm code theo hướng dẫn trong chat. FE-06 đã kiểm tra luồng Reading local; tiếp tục kiểm thử API/lỗi mạng, đổi vùng chọn và các trường hợp còn lại. Không tự mở rộng sang bôi đen toàn ứng dụng hoặc FE-07. Kiểm tra đầy đủ FE-01…FE-04 vẫn cần bổ sung ở GATE-FE.
3. Bộ đủ 2.000 từ đã tách sang P-DATA theo lựa chọn người dùng. Giữ raw/snapshot, rà soát proposals trước publish; hiện 677 mục, không tự nhập ứng viên chưa rà soát.
4. P7 và P8 chưa triển khai xong. P6 hoàn tất phần triển khai; không coi đó là nghiệm thu toàn bộ giao diện hoặc ứng dụng.

Lệnh: `npm run check`, `npm run test:browser`, `npm run test:extension`, `npm run validate:content -- public/content/pilot/pilot-200.json`, `npm run check:gate`. Checklist FE trong file này đã cập nhật trực tiếp theo code ngày 21/10/2026; trạng thái FE trong tasks.json/TASKS.md chưa đồng bộ. Cần đồng bộ các trạng thái đó trước khi chạy `npm run progress:update` để tránh ghi đè tiến độ hiện tại.


## FE online — triển khai nối MongoDB (22/10/2026)

Các mục dưới đây ghi nhận code đã bổ sung, không thay thế nghiệm thu bản local ở trên.
Người dùng yêu cầu không chạy test, build, typecheck hoặc lint trong lượt này.

- [x] **ONLINE-FE-05** Sổ tay tài khoản: danh sách từ đã học/từ cá nhân, tìm kiếm và lọc CEFR/level/trạng thái/đến hạn; chi tiết mở ngay dưới dòng từ — Implemented / Not tested.
- [x] **ONLINE-FE-06** Thêm/sửa nháp, đổi nghĩa tạo mục mới, học từ cá nhân qua API; checkbox bật/tắt ôn và hai nhóm; bỏ qua từ đã tắt trong phiên ôn dở; xoá dữ liệu server, dọn cache extension và thử lại khi mất kết nối — Implemented / Not tested.
- [x] **ONLINE-FE-07** Reading trong web: bôi đen → icon → popup; chọn nghĩa, gợi ý dịch Việt theo nghĩa, lưu từ/URL nguồn; không lưu đoạn văn — Implemented / Not tested.
- [x] **ONLINE-FE-08** Cài đặt giọng Mỹ, số từ/lượt học/lượt ôn/mục tiêu ngày/tra cứu mạng; bảng IPA dạng chữ — Implemented / Not tested.
- [x] **ONLINE-FE-09** Nhận hàng đợi extension, ACK sau server commit, nhập file hàng đợi, gửi snapshot; extension nhận origin 127.0.0.1:3001/localhost:3001 và tách hàng đợi theo tài khoản, chặn lưu từ popup cũ sau khi đổi tài khoản và chống snapshot cũ khôi phục từ đã xoá — Implemented / Not tested.
- [x] **ONLINE-FE-10** Xuất dữ liệu của tài khoản (từ, tiến độ, tuỳ chọn ôn, cài đặt, URL nguồn), không xuất thông tin đăng nhập — Implemented / Not tested.
- [ ] **ONLINE-GATE-FE** Người dùng chạy build và kiểm kê các luồng trên, gồm đổi tài khoản/đồng bộ/xoá/phiên đang dở — Pending user verification.
- [ ] **ONLINE-RESTORE** Khôi phục file xuất tài khoản và chuyển dữ liệu IndexedDB cũ lên MongoDB — chưa triển khai; UI không hiển thị nút khôi phục.
- [ ] **DEPLOY-EXTENSION** Sau khi có domain deploy, cấu hình origin bridge/manifest đúng domain. Hiện bridge chỉ cho phép các origin phát triển đã khai báo, không tự mở mọi website.

Phạm vi: code học/ôn online đã có trước lượt này được giữ lại. Không đánh dấu Pass cho các thay đổi mới và không tạo tài liệu evidence.


## Extension lưu trực tiếp — 22/10/2026

- [x] Popup Lưu từ gọi API → MongoDB; chỉ báo thành công sau server commit, giữ capture ID trong popup cho lượt thử lại — Implemented / Not tested.
- [x] Mất mạng/chưa kết nối: báo lỗi, không ghi hàng đợi offline. Hàng đợi cũ giữ nguyên để người dùng nhập một lần — Implemented / Not tested.
- [x] Kết nối theo tài khoản đăng nhập bằng token giới hạn quyền lưu từ, lưu hash trên server, hết hạn theo session và thu hồi khi đăng xuất — Implemented / Not tested.
- [x] Domain extension lấy từ EXTENSION_APP_ORIGIN hoặc APP_ORIGIN lúc build; manifest và bridge cùng origin; domain deploy bắt buộc HTTPS — Implemented / Not tested.
- [x] Sổ tay tải lại khi quay về tab web; từ trong snapshot đã có trên server không bị tạo bản cá nhân trùng chỉ vì ID canonical; từ thư viện chung đã lưu được hiển thị trong Từ của tôi — Implemented / Not tested.
- [ ] Người dùng build FE/extension, restart API và kiểm kê lưu trực tiếp, retry, đổi tài khoản, logout, bản deploy — Pending user verification.

Không chạy test/build/typecheck/lint trong lượt này theo yêu cầu người dùng.


## Đăng nhập trực tiếp trong extension — bước 2 đến 6 (22/10/2026)

- [x] Sửa vị trí AccountPage/LoginForm, giữ import hook useAccount theo thư mục account; entry React trỏ vào extension/account — Implemented / Not tested.
- [x] Hoàn thiện account.css, action popup, entry build account.tsx và sao chép HTML/CSS; TypeScript bao gồm extension/**/*.tsx — Implemented / Not tested.
- [x] Nối auth-status/auth-login/auth-logout/auth-open; giữ kiểm tra trang đăng nhập riêng, token trong worker và luồng lưu trực tiếp qua API — Implemented / Not tested.
- [x] Gỡ tự kết nối/đăng xuất extension theo tài khoản web; đồng bộ chỉ cho phép tài khoản extension trùng tài khoản web — Implemented / Not tested.
- [ ] Bước 7: người dùng tự build FE/extension, reload Chrome và kiểm tra trang đăng nhập.
- [ ] Bước tiếp theo: hiển thị tên/nút Đăng nhập dưới logo của popup bôi đen. Chưa mở rộng phần giao diện này trong lượt sửa hiện tại.

Không chạy build, typecheck, lint, test hoặc mở trình duyệt theo yêu cầu người dùng. Các file gốc extension/AccountPage.tsx và extension/LoginForm.tsx được giữ dưới dạng re-export để không xoá file người dùng đã tạo.

## Dọn cấu trúc sau chuyển MongoDB — 22/10/2026

- [x] Tách ClozeInputs và LevelDistribution sang components dùng chung, cập nhật import — Implemented / Not tested.
- [x] Tách captureTransferSchema và snapshotSchema sang src/shared/schemas, gỡ phụ thuộc backend IndexedDB khỏi extension đang chạy — Implemented / Not tested.
- [x] Gom FE/backend local, test local, file extension dư và browser harness cũ vào legacy/local; giữ nội dung để tra lại — Implemented / Not tested.
- [x] Gom CSS tái sử dụng vào styles/shared, giữ nguyên declaration và thứ tự cascade; chuyển HTML mẫu vào docs/mockups — Implemented / Not tested.
- [x] Cập nhật scripts/config/README, tách test:legacy khỏi test mặc định; giữ kho crawl và đầu ra build trên ổ — Implemented / Not tested.
- [ ] Người dùng tự build FE/API/extension và kiểm kê giao diện, học/ôn, đăng nhập, lưu từ và đồng bộ.

Các đường dẫn/lệnh local trong ghi chép phase phía trên là lịch sử trước khi dọn. Không chạy build, typecheck, lint hoặc test trong lượt này.

## Tối ưu truy vấn Sổ tay và session — 23/10/2026

- [x] Truy vấn thư viện trong Sổ tay dùng `_id` thay cho `id`, tận dụng index mặc định và giữ nguyên định dạng phản hồi — Implemented / Not tested.
- [x] Chỉ gắn session middleware vào `/api`; file tĩnh không đọc hoặc touch session. Health check vẫn nằm trước middleware — Implemented / Not tested.
- [x] Cấu hình `connect-mongo.touchAfter` 300 giây để giảm ghi gia hạn khi session không đổi; giữ `resave: false`, `saveUninitialized: false` và thời hạn 7 ngày — Implemented / Not tested.
- [ ] Người dùng restart API và kiểm kê đăng nhập/đăng xuất, Sổ tay và file tĩnh sau thay đổi.

Không chạy test, build, typecheck hoặc lint; không thực hiện migration hay ghi/xoá dữ liệu MongoDB trong lượt này.


## Skip từ đã biết và kết thúc ôn sớm — 23/10/2026

- [x] Nút Skip nhỏ dưới màn học: ghi trạng thái đã biết theo tài khoản vào known_words, chuyển từ; không tạo level/lịch ôn, loại khỏi các lượt học mới — Implemented / Not tested.
- [x] Hiển thị số từ đã biết trong topic và trạng thái trong Từ của tôi; xoá từ cá nhân dọn cả dấu đã biết — Implemented / Not tested.
- [x] Đồng bộ giới hạn ôn 10/20/50/100 từ giữa API, UI và cài đặt, dùng danh sách chung — Implemented / Not tested.
- [x] Kết thúc lượt ôn sớm bằng transaction: giữ kết quả đã commit, bỏ nháp chưa gửi, đóng phiên và giữ nguyên lịch của các từ chưa làm; retry không chấm thêm — Implemented / Not tested.
- [ ] Người dùng build FE, restart API để tạo index known_words, kiểm kê Skip sau reload và kết thúc sớm ở màn câu hỏi/phản hồi/tạm dừng.

Ví dụ: đã gửi đáp án 6/20 từ thì giữ 6 kết quả, 14 từ chưa làm vẫn đến hạn cho lượt ôn sau. Chỉ đang đứng ở câu thứ 6 mà chưa gửi thì mới có 5 kết quả được giữ. Không chạy test/build/typecheck/lint, không trực tiếp ghi dữ liệu MongoDB trong lượt này.

## Đăng ký, khôi phục Gmail và đồng bộ giao diện — 23/10/2026

- [x] Đăng ký tài khoản learner, kiểm tra email trùng, hash mật khẩu, tạo phiên đăng nhập — Implemented / Not tested.
- [x] Quên/đặt lại mật khẩu qua Gmail SMTP cấu hình bằng biến môi trường; có giới hạn yêu cầu, cooldown gửi lại, token hash 15 phút/một lần, TTL dọn tự động — Implemented / Not tested.
- [x] Vô hiệu hoá phiên web và token extension cũ sau đổi mật khẩu bằng phiên bản xác thực; token extension bị thu hồi trong transaction đổi mật khẩu — Implemented / Not tested.
- [x] Tách màn đăng ký/khôi phục, router auth và trường mật khẩu tái sử dụng; liên kết email mở đúng màn đặt lại, kể cả khi đang đăng nhập — Implemented / Not tested.
- [x] Bộ SVG Icon/Brand dùng chung; nút loading, audio, xoá, đóng, điều hướng; đồng bộ CSS form, dashboard, topic, sổ tay, học/ôn và responsive — Implemented / Not tested.
- [x] Thêm `.env.example` và hướng dẫn SMTP vào README hiện có; không tạo file evidence — Implemented / Not tested.
- [ ] Người dùng điền Gmail App Password vào `.env`, build FE, restart API và kiểm kê chức năng/giao diện. Chưa gửi email thật, chưa chạy build/typecheck/lint/test.

Các yêu cầu hiển thị tên dưới logo popup extension và chuyển dữ liệu backup cũ vẫn không nằm trong lượt triển khai này.

## Giảm tải dữ liệu trang chủ đề — 23/10/2026

- [x] Gộp danh sách topic và số từ đã học/đã biết vào một API; chỉ đọc entryId từ các collection cá nhân, không tải toàn bộ tiến độ và review preferences — Implemented / Not tested.
- [x] Cache catalogue chung tối đa 2 bộ từ, TTL 30 giây, dùng chung request đang chạy; không cache tiến độ riêng trên server — Implemented / Not tested.
- [x] Cache phản hồi topic trên RAM trình duyệt tối đa 15 giây/8 mục; xóa cache khi ghi dữ liệu hoặc gặp 401; generation ngăn request cũ chèn lại cache sau thay đổi — Implemented / Not tested.
- [x] API đọc có thời gian chờ 20 giây và thông báo thử lại; không tự timeout các thao tác ghi — Implemented / Not tested.
- [ ] Người dùng build FE, restart API và kiểm kê thời gian tải topic/chuyển bộ từ sau học hoặc Skip. Chưa đo latency, chưa chạy build/typecheck/lint/test, chưa truy cập dữ liệu thật.

## Gợi ý chữ mờ trong bài ôn — 23/10/2026

- [x] Chữ gợi ý là lớp chữ mờ trong ô nhập, không tự điền vào đáp án; có thể gõ đè, xoá để hiện lại gợi ý — Implemented / Not tested.
- [x] Nhập/paste, lưu nháp và khôi phục áp dụng cho tất cả chữ cái; khoảng trắng/dấu câu giữ nguyên. API chấm cả chữ đã gõ đè, không từ chối chỉ vì khác gợi ý — Implemented / Not tested.
- [ ] Người dùng build FE, restart API và kiểm kê với từ attendance. Không chạy build/typecheck/lint/test.
