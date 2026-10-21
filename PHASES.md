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

- [x] **FE-06** Reading và popup tra từ trong web — Done / Typecheck Pass; UI Not tested.
  Đã có ReadingPanel trong Sổ tay: dán bài đọc, lưu URL nguồn, lấy từ và câu gốc khi bôi đen. Bôi đen chỉ hiện icon 🔍; bấm icon mới mở LookupPopup. Có tra local/cache/API, chọn nghĩa, nhập nghĩa tiếng Việt, lưu từ/ngữ cảnh và giữ tiến độ từ đã tồn tại; thiếu dữ liệu thì lưu nháp.
  Phạm vi hiện tại: chỉ vùng bài đọc trong ReadingPanel, chưa áp dụng toàn ứng dụng hoặc website khác. Cần kiểm thử icon → popup → lưu, lỗi mạng, đổi vùng chọn và bố cục mobile. Ảnh người dùng bôi đen tên topic ở trang Học từ mới không xác nhận luồng Reading đã chạy.
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

- Sau FE-06: `npm run typecheck` Pass ngày 21/10/2026 trên code hiện tại. Chưa chạy lại build hoặc kiểm thử UI Reading trong lượt cập nhật checklist này.

## Điểm tiếp tục

1. Xem task đang In progress và phần Còn lại ở trên; không làm lại các task đã tích.
2. P6 đã triển khai 5/5 task; FE-06 đã thêm code theo hướng dẫn trong chat. Tiếp tục kiểm thử FE-06 ở Sổ tay → Reading → Mở bài đọc → bôi đen → icon → popup → lưu. Không tự mở rộng sang bôi đen toàn ứng dụng hoặc FE-07. Kiểm tra đầy đủ FE-01…FE-04 vẫn cần bổ sung ở GATE-FE.
3. Bộ đủ 2.000 từ đã tách sang P-DATA theo lựa chọn người dùng. Giữ raw/snapshot, rà soát proposals trước publish; hiện 677 mục, không tự nhập ứng viên chưa rà soát.
4. P7 và P8 chưa triển khai xong. P6 hoàn tất phần triển khai; không coi đó là nghiệm thu toàn bộ giao diện hoặc ứng dụng.

Lệnh: `npm run check`, `npm run test:browser`, `npm run test:extension`, `npm run validate:content -- public/content/pilot/pilot-200.json`, `npm run check:gate`. Checklist FE trong file này đã cập nhật trực tiếp theo code ngày 21/10/2026; trạng thái FE trong tasks.json/TASKS.md chưa đồng bộ. Cần đồng bộ các trạng thái đó trước khi chạy `npm run progress:update` để tránh ghi đè tiến độ hiện tại.
