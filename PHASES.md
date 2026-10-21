# EnglishVocab — tiến độ triển khai

**Đọc file này trước khi làm task tiếp theo. Dừng sau BE để người dùng nghiệm thu; không tự bắt đầu FE.**

Chỉ giữ checklist gọn và kiểm thử trong mã; không có Markdown evidence hoặc reviewer riêng. `[x]` nghĩa là task đã triển khai và kiểm tra đạt, chưa có nghĩa người dùng nghiệm thu toàn bộ BE.

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

## [x] P5 — Kiểm tra kỹ thuật BE — chờ người dùng nghiệm thu

1/1 task hoàn tất.

- [x] **GATE-BE** Kiểm tra kỹ thuật BE và bàn giao người dùng nghiệm thu — Done / Pass.
  Còn lại: Chờ người dùng nghiệm thu BE. Không tự mở FE. Nội dung 677/2.000, còn 1.323 vị trí ở task dữ liệu riêng.

## [ ] P6 — Giao diện chính và học–ôn

0/5 task hoàn tất.

- [x] **FE-01** Khung ứng dụng và đúng 3 tab chính — Blocked / Not tested.
- [x] **FE-02** Danh sách bộ từ và topic — Blocked / Not tested.
- [ ] **FE-03** Màn học mới xem → ẩn → viết lại — Blocked / Not tested.
- [ ] **FE-04** Trang Ôn tập và phiên điền chữ thiếu — Blocked / Not tested.
- [ ] **FE-05** Sổ tay, từ cá nhân và chỉnh mục nháp — Blocked / Not tested.

## [ ] P7 — Reading, popup và tiện ích

0/4 task hoàn tất.

- [ ] **FE-06** Reading và popup tra từ trong web — Blocked / Not tested.
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

## Kết quả kiểm tra hiện tại

- Unit/integration: 43 test, Pass.
- Chrome/IndexedDB thật: 7 kiểm tra đạt.
- Worker/queue/bridge thật: 5 kiểm tra đạt.
- API live: Pass: Chrome browser CORS at localhost:5173 and MV3 worker live lookup; rechecked for backend handoff..
- Nội dung: 677/2.000 mục; thiếu IPA: 595; bảng IPA: 40 hàng dạng chữ (không audio từng âm).

## Điểm tiếp tục

1. Xem task đang In progress và phần Còn lại ở trên; không làm lại các task đã tích.
2. BE đã đạt kiểm tra kỹ thuật; dừng chờ người dùng nghiệm thu. Technical Pass không phải xác nhận của người dùng.
3. Bộ đủ 2.000 từ đã tách sang P-DATA theo lựa chọn người dùng. Giữ raw/snapshot, rà soát proposals trước publish; hiện 677 mục, không tự nhập ứng viên chưa rà soát.
4. Chỉ sau xác nhận trực tiếp của người dùng mới đánh dấu backend accepted và mở task FE. Không tự bắt đầu FE trong lượt bàn giao.

Lệnh: `npm run check`, `npm run test:browser`, `npm run test:extension`, `npm run validate:content -- public/content/pilot/pilot-200.json`, `npm run check:gate`. Chạy `npm run progress:update` sau khi đổi tasks.json để cập nhật checklist này.
